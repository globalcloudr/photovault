"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MediaWorkspaceShell } from "@/components/layout/media-workspace-shell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button, buttonClass } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BodyText, Eyebrow, FieldLabel, MetaText, SectionTitle } from "@/components/ui/typography";
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
            <Eyebrow>Profile</Eyebrow>
            <BodyText muted className="mt-1.5">Your name appears in the account menu.</BodyText>
            <BodyText muted>Email is managed by authentication.</BodyText>
          </div>
          <div>
            <Eyebrow>Active Org</Eyebrow>
            <BodyText muted className="mt-1.5">{activeOrg?.name ?? "No active organization"}</BodyText>
            <MetaText>{activeOrg?.slug ?? ""}</MetaText>
          </div>
        </div>
      }
    >
      <Card className="space-y-4 p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>Account</Badge>
          <Badge>{activeOrg?.slug ?? "no-org"}</Badge>
        </div>

        <div className="space-y-1">
          <SectionTitle as="h2">Account Details</SectionTitle>
          <BodyText muted>Use one display name everywhere in the workspace. Login email stays read-only.</BodyText>
        </div>

        {loading ? (
          <BodyText muted>Loading profile…</BodyText>
        ) : (
          <form className="space-y-4" onSubmit={saveProfile}>
            <div>
              <FieldLabel>Display name</FieldLabel>
              <Input
                className="mt-1.5"
                type="text"
                placeholder="Your name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>

            <div>
              <FieldLabel>Email</FieldLabel>
              <Input className="mt-1.5" type="email" value={email} disabled />
            </div>

            <div className="flex items-center gap-2">
              <Button type="submit" variant="primary" disabled={saving}>
                {saving ? "Saving…" : "Save profile"}
              </Button>
              {status ? <BodyText muted>{status}</BodyText> : null}
            </div>
          </form>
        )}
      </Card>
    </MediaWorkspaceShell>
  );
}
