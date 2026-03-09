"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button, buttonClass } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IconDownload, IconView } from "@/components/ui/icons";
import { formatDateMDY } from "@/lib/date-format";

type SharedAsset = {
  id: string;
  original_filename: string;
  canonical_filename: string;
  sequence_number: number;
  size_bytes: number;
  url: string | null;
};

type SharedAlbum = {
  id: string;
  event_name: string;
  event_date: string;
  rights_status: string;
};

export default function PublicSharePage() {
  const params = useParams();
  const token = typeof params?.token === "string" ? params.token : "";
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [album, setAlbum] = useState<SharedAlbum | null>(null);
  const [assets, setAssets] = useState<SharedAsset[]>([]);
  const [allowDownload, setAllowDownload] = useState(true);

  async function loadSharedContent(withPassword = password) {
    if (!token) return;
    setLoading(true);
    setStatus(null);

    try {
      const response = await fetch(`/api/share-links/${token}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password: withPassword || undefined }),
      });

      const body = (await response.json()) as {
        error?: string;
        requiresPassword?: boolean;
        album?: SharedAlbum;
        assets?: SharedAsset[];
        allowDownload?: boolean;
      };

      if (!response.ok) {
        setRequiresPassword(Boolean(body.requiresPassword));
        setStatus(body.error ?? "Unable to load shared content.");
        return;
      }

      setRequiresPassword(false);
      setAlbum(body.album ?? null);
      setAssets(body.assets ?? []);
      setAllowDownload(Boolean(body.allowDownload));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatus(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto max-w-6xl space-y-4">
        <Card className="p-5 sm:p-6">
          <h1 className="text-2xl font-semibold text-slate-900">Shared Album</h1>
          <p className="mt-1 text-sm text-slate-600">Use the link owner’s password if prompted.</p>

          {!album ? (
            <div className="mt-4 space-y-3">
              {requiresPassword ? (
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter share password"
                />
              ) : null}
              <div className="flex items-center gap-2">
                <Button variant="primary" onClick={() => loadSharedContent()} disabled={loading}>
                  {loading ? "Loading…" : requiresPassword ? "Unlock album" : "Open album"}
                </Button>
                <Link href="/login" className={buttonClass("secondary")}>
                  Sign in
                </Link>
              </div>
              {status ? <p className="text-sm text-slate-700">{status}</p> : null}
            </div>
          ) : (
            <div className="mt-4">
              <p className="text-sm font-medium text-slate-800">{album.event_name}</p>
              <p className="text-xs text-slate-500">Event date: {formatDateMDY(album.event_date)} • {assets.length} photos</p>
              {!allowDownload ? (
                <p className="mt-2 text-xs text-slate-500">Download is disabled for this share link.</p>
              ) : null}
            </div>
          )}
        </Card>

        {album ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {assets.map((asset) => (
              <Card key={asset.id} className="overflow-hidden border-slate-200 bg-white">
                <div className="aspect-square w-full bg-slate-100">
                  {asset.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={asset.url} alt={asset.original_filename} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-slate-500">No preview</div>
                  )}
                </div>
                <div className="space-y-2 border-t border-slate-200 p-3">
                  <p className="truncate text-sm font-medium text-slate-800" title={asset.original_filename}>
                    {asset.original_filename}
                  </p>
                  <p className="text-xs text-slate-500">
                    #{asset.sequence_number} • {(asset.size_bytes / 1024).toFixed(0)} KB
                  </p>
                  <div className="flex items-center gap-2">
                    {asset.url ? (
                      <a href={asset.url} target="_blank" rel="noreferrer" className={buttonClass("secondary", "sm")}>
                        <IconView className="mr-1 h-3.5 w-3.5" />
                        Open
                      </a>
                    ) : null}
                    {allowDownload && asset.url ? (
                      <a href={asset.url} download className={buttonClass("ghost", "sm")}>
                        <IconDownload className="mr-1 h-3.5 w-3.5" />
                        Download
                      </a>
                    ) : null}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : null}
      </div>
    </main>
  );
}
