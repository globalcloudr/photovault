"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MediaWorkspaceShell } from "@/components/layout/media-workspace-shell";
import { Card } from "@/components/ui/card";
import { Button, buttonClass } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useOrg } from "@/components/org/org-provider";
import { supabase } from "@/lib/supabaseClient";
import { defaultMarketingHomepageContent, MarketingHomepageContent, normalizeMarketingHomepageContent } from "@/lib/marketing-homepage-content";
import { formatDateTimeMDY } from "@/lib/date-format";

type VersionRow = {
  id: number;
  updated_at: string;
  updated_by: string | null;
};

function textAreaClass() {
  return "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-900";
}

export default function SuperAdminHomepageCmsPage() {
  const router = useRouter();
  const { loading, isSuperAdmin } = useOrg();
  const [content, setContent] = useState<MarketingHomepageContent>(defaultMarketingHomepageContent);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [uploadingSlot, setUploadingSlot] = useState<string | null>(null);
  const [historyBusy, setHistoryBusy] = useState(false);
  const [historyRows, setHistoryRows] = useState<VersionRow[]>([]);

  useEffect(() => {
    if (!loading && !isSuperAdmin) {
      router.replace("/albums");
    }
  }, [isSuperAdmin, loading, router]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const response = await fetch("/api/marketing-homepage", { cache: "no-store" });
        const body = (await response.json()) as { content?: unknown };
        if (!mounted) return;
        setContent(normalizeMarketingHomepageContent(body.content));
      } catch {
        if (!mounted) return;
        setContent(defaultMarketingHomepageContent);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  async function loadHistory() {
    setHistoryBusy(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) return;
      const response = await fetch("/api/super-admin/marketing-homepage/history", {
        headers: { authorization: `Bearer ${accessToken}` },
      });
      const body = (await response.json()) as { versions?: VersionRow[] };
      if (!response.ok) return;
      setHistoryRows(body.versions ?? []);
    } finally {
      setHistoryBusy(false);
    }
  }

  useEffect(() => {
    void loadHistory();
  }, []);

  function setPath(path: string, value: string) {
    setContent((prev) => {
      const next = structuredClone(prev);
      const keys = path.split(".");
      let cursor: Record<string, unknown> = next as unknown as Record<string, unknown>;
      for (let i = 0; i < keys.length - 1; i += 1) {
        const key = keys[i];
        cursor[key] = cursor[key] as unknown as Record<string, unknown>;
        cursor = cursor[key] as Record<string, unknown>;
      }
      cursor[keys[keys.length - 1]] = value;
      return normalizeMarketingHomepageContent(next);
    });
  }

  function setBullet(featureIndex: number, bulletIndex: number, value: string) {
    setContent((prev) => {
      const next = structuredClone(prev);
      const feature = next.features.items[featureIndex];
      if (!feature) return prev;
      feature.bullets[bulletIndex] = value;
      return normalizeMarketingHomepageContent(next);
    });
  }

  async function save() {
    setStatus(null);
    setBusy(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        setStatus("Not authenticated. Please sign in again.");
        return;
      }

      const response = await fetch("/api/super-admin/marketing-homepage", {
        method: "PUT",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ content }),
      });

      const body = (await response.json()) as { error?: string };
      if (!response.ok) {
        setStatus(body.error ?? "Failed to save homepage content.");
        return;
      }
      setStatus("Homepage content saved.");
      void loadHistory();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatus("Save failed: " + message);
    } finally {
      setBusy(false);
    }
  }

  async function uploadFeatureImage(featureIndex: number, file: File) {
    const slot = `feature-${featureIndex + 1}`;
    setUploadingSlot(slot);
    setStatus(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        setStatus("Not authenticated. Please sign in again.");
        return;
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("slot", slot);

      const response = await fetch("/api/super-admin/marketing-homepage/upload-image", {
        method: "POST",
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      });

      const body = (await response.json()) as { error?: string; storageRef?: string };
      if (!response.ok || !body.storageRef) {
        setStatus(body.error ?? "Image upload failed.");
        return;
      }

      setPath(`features.items.${featureIndex}.imageUrl`, body.storageRef);
      setStatus("Image uploaded. Save changes to publish.");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatus("Image upload failed: " + message);
    } finally {
      setUploadingSlot(null);
    }
  }

  async function restoreVersion(versionId: number) {
    setBusy(true);
    setStatus(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        setStatus("Not authenticated. Please sign in again.");
        return;
      }

      const response = await fetch("/api/super-admin/marketing-homepage/restore", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ versionId }),
      });
      const body = (await response.json()) as { error?: string; content?: unknown };
      if (!response.ok) {
        setStatus(body.error ?? "Restore failed.");
        return;
      }

      setContent(normalizeMarketingHomepageContent(body.content));
      setStatus("Version restored.");
      void loadHistory();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatus("Restore failed: " + message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen">
        <div className="mx-auto max-w-5xl p-6 sm:p-8">
          <p className="text-slate-600">Loading homepage editor…</p>
        </div>
      </main>
    );
  }

  if (!isSuperAdmin) return null;

  return (
    <MediaWorkspaceShell
      title="Homepage CMS"
      subtitle="Edit marketing homepage copy and image URLs without touching code."
      actions={[
        {
          key: "preview",
          node: (
            <Link href="/" className={buttonClass("secondary")}>
              Open homepage
            </Link>
          ),
        },
        {
          key: "save",
          node: (
            <Button type="button" variant="primary" onClick={save} disabled={busy}>
              {busy ? "Saving…" : "Save changes"}
            </Button>
          ),
        },
      ]}
    >
      <Card className="p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-slate-900">Hero</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-800">Badge</label>
            <Input className="mt-1.5" value={content.hero.badge} onChange={(e) => setPath("hero.badge", e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-800">Trust line</label>
            <Input className="mt-1.5" value={content.hero.trust} onChange={(e) => setPath("hero.trust", e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-800">Title</label>
            <Input className="mt-1.5" value={content.hero.title} onChange={(e) => setPath("hero.title", e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-800">Title emphasis</label>
            <Input className="mt-1.5" value={content.hero.emphasis} onChange={(e) => setPath("hero.emphasis", e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-800">Subtitle</label>
            <textarea className={`${textAreaClass()} mt-1.5`} rows={3} value={content.hero.subtitle} onChange={(e) => setPath("hero.subtitle", e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-800">Primary CTA</label>
            <Input className="mt-1.5" value={content.hero.primaryCta} onChange={(e) => setPath("hero.primaryCta", e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-800">Secondary CTA</label>
            <Input className="mt-1.5" value={content.hero.secondaryCta} onChange={(e) => setPath("hero.secondaryCta", e.target.value)} />
          </div>
        </div>
      </Card>

      <Card className="p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-slate-900">Why + Testimonials</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-800">Why label</label>
            <Input className="mt-1.5" value={content.why.label} onChange={(e) => setPath("why.label", e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-800">Testimonials label</label>
            <Input className="mt-1.5" value={content.testimonials.label} onChange={(e) => setPath("testimonials.label", e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-800">Why title</label>
            <Input className="mt-1.5" value={content.why.title} onChange={(e) => setPath("why.title", e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-800">Testimonials title</label>
            <Input className="mt-1.5" value={content.testimonials.title} onChange={(e) => setPath("testimonials.title", e.target.value)} />
          </div>
        </div>
      </Card>

      <Card className="p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-slate-900">Security Highlights</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-800">Section label</label>
            <Input className="mt-1.5" value={content.security.label} onChange={(e) => setPath("security.label", e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-800">Section title</label>
            <Input className="mt-1.5" value={content.security.title} onChange={(e) => setPath("security.title", e.target.value)} />
          </div>
        </div>
        <div className="mt-4 grid gap-4">
          {content.security.items.slice(0, 6).map((item, index) => (
            <div key={`${index}-${item.title}`} className="rounded-lg border border-slate-200 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Item {index + 1}</p>
              <div className="mt-2 grid gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-800">Title</label>
                  <Input
                    className="mt-1.5"
                    value={item.title}
                    onChange={(e) => setPath(`security.items.${index}.title`, e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-800">Body</label>
                  <textarea
                    className={`${textAreaClass()} mt-1.5`}
                    rows={2}
                    value={item.body}
                    onChange={(e) => setPath(`security.items.${index}.body`, e.target.value)}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-slate-900">Feature Sections</h2>
        <p className="mt-1 text-sm text-slate-600">Paste an image URL or upload directly from your computer.</p>
        <div className="mt-4 grid gap-6">
          {content.features.items.slice(0, 2).map((feature, featureIndex) => (
            <div key={featureIndex} className="rounded-lg border border-slate-200 p-4">
              <p className="text-sm font-semibold text-slate-900">Feature {featureIndex + 1}</p>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-800">Label</label>
                  <Input className="mt-1.5" value={feature.label} onChange={(e) => setPath(`features.items.${featureIndex}.label`, e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-800">Image URL</label>
                  <Input className="mt-1.5" value={feature.imageUrl} onChange={(e) => setPath(`features.items.${featureIndex}.imageUrl`, e.target.value)} placeholder="/images/home/feature-1.jpg" />
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void uploadFeatureImage(featureIndex, file);
                        e.currentTarget.value = "";
                      }}
                      className="text-xs text-slate-600"
                    />
                    {uploadingSlot === `feature-${featureIndex + 1}` ? <span className="text-xs text-slate-500">Uploading…</span> : null}
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-800">Title</label>
                  <Input className="mt-1.5" value={feature.title} onChange={(e) => setPath(`features.items.${featureIndex}.title`, e.target.value)} />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-800">Body</label>
                  <textarea className={`${textAreaClass()} mt-1.5`} rows={3} value={feature.body} onChange={(e) => setPath(`features.items.${featureIndex}.body`, e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-800">Bullet 1</label>
                  <Input className="mt-1.5" value={feature.bullets[0] ?? ""} onChange={(e) => setBullet(featureIndex, 0, e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-800">Bullet 2</label>
                  <Input className="mt-1.5" value={feature.bullets[1] ?? ""} onChange={(e) => setBullet(featureIndex, 1, e.target.value)} />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-800">Bullet 3</label>
                  <Input className="mt-1.5" value={feature.bullets[2] ?? ""} onChange={(e) => setBullet(featureIndex, 2, e.target.value)} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-slate-900">Version History</h2>
        <p className="mt-1 text-sm text-slate-600">Each save stores the previous homepage version. Restore at any time.</p>
        {historyBusy ? (
          <p className="mt-3 text-sm text-slate-600">Loading history…</p>
        ) : historyRows.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">No previous versions yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {historyRows.map((row) => (
              <li key={row.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-slate-900">Version #{row.id}</p>
                  <p className="text-xs text-slate-500">{formatDateTimeMDY(row.updated_at)}</p>
                </div>
                <Button type="button" size="sm" variant="secondary" onClick={() => restoreVersion(row.id)}>
                  Restore
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-slate-900">CTA + Footer</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-800">CTA label</label>
            <Input className="mt-1.5" value={content.cta.label} onChange={(e) => setPath("cta.label", e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-800">Contact email</label>
            <Input className="mt-1.5" value={content.footer.contactEmail} onChange={(e) => setPath("footer.contactEmail", e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-800">CTA title</label>
            <Input className="mt-1.5" value={content.cta.title} onChange={(e) => setPath("cta.title", e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-800">CTA body</label>
            <textarea className={`${textAreaClass()} mt-1.5`} rows={3} value={content.cta.body} onChange={(e) => setPath("cta.body", e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-800">CTA primary button</label>
            <Input className="mt-1.5" value={content.cta.primaryCta} onChange={(e) => setPath("cta.primaryCta", e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-800">CTA secondary button</label>
            <Input className="mt-1.5" value={content.cta.secondaryCta} onChange={(e) => setPath("cta.secondaryCta", e.target.value)} />
          </div>
        </div>
      </Card>

      {status ? <p className="text-sm text-slate-700">{status}</p> : null}
    </MediaWorkspaceShell>
  );
}
