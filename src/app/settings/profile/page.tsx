"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MediaWorkspaceShell } from "@/components/layout/media-workspace-shell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button, buttonClass } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useOrg } from "@/components/org/org-provider";
import { supabase } from "@/lib/supabaseClient";

export default function ProfileSettingsPage() {
  const { activeOrgId, orgs } = useOrg();
  const activeOrg = useMemo(() => orgs.find((org) => org.id === activeOrgId) ?? null, [orgs, activeOrgId]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) {
        setStatus("Failed to load profile.");
        setLoading(false);
        return;
      }

      setEmail(data.user.email ?? "");
      const currentName =
        (typeof data.user.user_metadata?.full_name === "string" && data.user.user_metadata.full_name) ||
        (typeof data.user.user_metadata?.name === "string" && data.user.user_metadata.name) ||
        "";
      setFullName(currentName);
      setLoading(false);
    })();
  }, []);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    setSaving(true);

    try {
      const trimmedName = fullName.trim();
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: trimmedName,
          name: trimmedName,
        },
      });
      if (error) {
        setStatus(`Failed to save profile: ${error.message}`);
        return;
      }
      setStatus("Profile saved.");
    } catch (error) {
      setStatus(`Failed to save profile: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <MediaWorkspaceShell
      title="Profile Settings"
      subtitle="Manage your account profile details."
      sidebarLogoOnly
      actions={[
        {
          key: "albums",
          node: (
            <Link href="/albums" className={buttonClass("secondary")}>
              Back to albums
            </Link>
          ),
        },
      ]}
      sidebarContent={
        <div className="space-y-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Profile</p>
            <p className="mt-1.5 text-sm text-slate-700">Your name appears in the account menu.</p>
            <p className="text-sm text-slate-700">Email is managed by authentication.</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Active Org</p>
            <p className="mt-1.5 text-sm text-slate-700">{activeOrg?.name ?? "No active organization"}</p>
            <p className="text-xs text-slate-500">{activeOrg?.slug ?? ""}</p>
          </div>
        </div>
      }
    >
      <Card className="space-y-4 p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>Account</Badge>
          <Badge>{activeOrg?.slug ?? "no-org"}</Badge>
        </div>

        {loading ? (
          <p className="text-sm text-slate-600">Loading profile…</p>
        ) : (
          <form className="space-y-4" onSubmit={saveProfile}>
            <div>
              <label className="block text-sm font-medium text-slate-800">Display name</label>
              <Input
                className="mt-1.5"
                type="text"
                placeholder="Your name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-800">Email</label>
              <Input className="mt-1.5" type="email" value={email} disabled />
            </div>

            <div className="flex items-center gap-2">
              <Button type="submit" variant="primary" disabled={saving}>
                {saving ? "Saving…" : "Save profile"}
              </Button>
              {status ? <p className="text-sm text-slate-700">{status}</p> : null}
            </div>
          </form>
        )}
      </Card>
    </MediaWorkspaceShell>
  );
}
