"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MediaWorkspaceShell } from "@/components/layout/media-workspace-shell";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useOrg } from "@/components/org/org-provider";
import { supabase } from "@/lib/supabaseClient";
import { formatDateMDY } from "@/lib/date-format";

type StaffRow = {
  id: string;
  org_id: string;
  user_id: string;
  role: "owner" | "uploader" | "viewer";
  created_at: string;
  email: string | null;
  accepted: boolean;
};

export default function StaffSettingsPage() {
  const router = useRouter();
  const { activeOrgId, orgs, isSuperAdmin, loading: orgLoading } = useOrg();
  const activeOrg = useMemo(() => orgs.find((org) => org.id === activeOrgId) ?? null, [orgs, activeOrgId]);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"uploader" | "viewer">("uploader");

  async function apiFetch(path: string, options?: RequestInit) {
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) {
      router.replace("/login");
      return null;
    }

    const response = await fetch(path, {
      ...options,
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${accessToken}`,
        ...(options?.headers ?? {}),
      },
    });
    const body = (await response.json()) as { error?: string; staff?: StaffRow[]; message?: string };
    return { response, body };
  }

  async function loadStaff() {
    if (!activeOrgId) return;
    setLoading(true);
    setStatus(null);
    try {
      const result = await apiFetch(`/api/org-admin/staff?orgId=${activeOrgId}`);
      if (!result) return;
      if (!result.response.ok) {
        setStatus(result.body.error ?? "Failed to load staff.");
        setStaff([]);
        return;
      }
      setStaff(result.body.staff ?? []);
    } catch (error) {
      setStatus(`Failed to load staff: ${error instanceof Error ? error.message : String(error)}`);
      setStaff([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (orgLoading || !activeOrgId) return;
    void loadStaff();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOrgId, orgLoading]);

  async function onInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!activeOrgId) return;
    if (!inviteEmail.trim()) {
      setStatus("Email is required.");
      return;
    }

    setBusy(true);
    setStatus(null);
    try {
      const result = await apiFetch("/api/org-admin/staff", {
        method: "POST",
        body: JSON.stringify({
          orgId: activeOrgId,
          email: inviteEmail.trim(),
          role: inviteRole,
        }),
      });
      if (!result) return;
      if (!result.response.ok) {
        setStatus(result.body.error ?? "Failed to invite staff.");
        return;
      }
      setInviteEmail("");
      setStatus(result.body.message ?? "Invite sent.");
      await loadStaff();
    } catch (error) {
      setStatus(`Invite failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setBusy(false);
    }
  }

  async function deactivateMembership(row: StaffRow) {
    if (!activeOrgId) return;
    const confirmed = window.confirm(`Deactivate ${row.email ?? row.user_id}?`);
    if (!confirmed) return;

    setBusy(true);
    setStatus(null);
    try {
      const result = await apiFetch("/api/org-admin/staff", {
        method: "DELETE",
        body: JSON.stringify({
          orgId: activeOrgId,
          userId: row.user_id,
        }),
      });
      if (!result) return;
      if (!result.response.ok) {
        setStatus(result.body.error ?? "Failed to deactivate membership.");
        return;
      }
      setStatus("Membership deactivated.");
      await loadStaff();
    } catch (error) {
      setStatus(`Deactivate failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <MediaWorkspaceShell
      title="Staff Management"
      subtitle={`Invite and manage staff access for ${activeOrg?.name ?? "the active organization"}.`}
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
        {
          key: "appearance",
          node: (
            <Link href="/settings/branding" className={buttonClass("secondary")}>
              Appearance
            </Link>
          ),
        },
        ...(isSuperAdmin
          ? [
              {
                key: "super",
                node: (
                  <Link href="/super-admin" className={buttonClass("secondary")}>
                    Super admin
                  </Link>
                ),
              },
            ]
          : []),
      ]}
    >
      <Card className="space-y-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>{staff.length} members</Badge>
          <Badge>{activeOrg?.slug ?? "no-org"}</Badge>
        </div>

        <form className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_auto] lg:items-end" onSubmit={onInvite}>
          <div className="space-y-1">
            <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Staff Email</label>
            <Input
              type="email"
              placeholder="staff@school.edu"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              required
              disabled={busy || !activeOrgId}
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Role</label>
            <select
              className="h-11 w-full rounded-full border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-slate-900"
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as "uploader" | "viewer")}
              disabled={busy || !activeOrgId}
            >
              <option value="uploader">uploader</option>
              <option value="viewer">viewer</option>
            </select>
          </div>

          <Button type="submit" variant="primary" className="h-11 px-5" disabled={busy || !activeOrgId}>
            {busy ? "Working…" : "Invite staff"}
          </Button>
        </form>

        {status ? <p className="text-sm text-slate-700">{status}</p> : null}
      </Card>

      <Card className="overflow-hidden p-0">
        {loading ? (
          <p className="p-4 text-sm text-slate-500">Loading staff…</p>
        ) : staff.length === 0 ? (
          <p className="p-4 text-sm text-slate-500">No staff memberships found for this organization.</p>
        ) : (
          <div className="divide-y divide-slate-200">
            {staff.map((row) => (
              <div key={row.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className="text-sm font-medium text-slate-900">{row.email ?? row.user_id}</p>
                  <p className="text-xs text-slate-500">
                    role: {row.role} • {row.accepted ? "accepted" : "invite pending"} • added{" "}
                    {formatDateMDY(row.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {row.role === "owner" ? <Badge>Owner</Badge> : null}
                  {row.role !== "owner" ? (
                    <Button size="sm" variant="danger" disabled={busy} onClick={() => deactivateMembership(row)}>
                      Deactivate
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </MediaWorkspaceShell>
  );
}
