"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MediaWorkspaceShell } from "@/components/layout/media-workspace-shell";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { BodyText, FieldLabel, SectionTitle } from "@/components/ui/typography";
import { useOrg } from "@/components/org/org-provider";
import { supabase } from "@/lib/supabaseClient";

type ProgramRow = {
  id: string;
  org_id: string;
  code: string;
  name: string;
  sort_order: number | null;
  is_active: boolean | null;
};

type ProgramDraft = ProgramRow & {
  dirty?: boolean;
};

export default function ProgramsSettingsPage() {
  const { activeOrgId, orgs, loading: orgLoading } = useOrg();
  const activeOrg = useMemo(() => orgs.find((org) => org.id === activeOrgId) ?? null, [orgs, activeOrgId]);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [programs, setPrograms] = useState<ProgramDraft[]>([]);
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");

  async function apiFetch(path: string, options?: RequestInit) {
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) {
      window.location.assign("/login");
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

    const body = (await response.json()) as {
      error?: string;
      programs?: ProgramRow[];
      program?: ProgramRow;
    };
    return { response, body };
  }

  async function loadPrograms() {
    if (!activeOrgId) return;
    setLoading(true);
    setStatus(null);

    try {
      const result = await apiFetch(`/api/org-admin/programs?orgId=${activeOrgId}`);
      if (!result) return;
      if (!result.response.ok) {
        setStatus(result.body.error ?? "Failed to load programs.");
        setPrograms([]);
        return;
      }

      setPrograms((result.body.programs ?? []).map((program) => ({ ...program, dirty: false })));
    } catch (error) {
      setStatus(`Failed to load programs: ${error instanceof Error ? error.message : String(error)}`);
      setPrograms([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (orgLoading || !activeOrgId) return;
    void loadPrograms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOrgId, orgLoading]);

  async function createProgram(e: React.FormEvent) {
    e.preventDefault();
    if (!activeOrgId) return;

    setBusy(true);
    setStatus(null);
    try {
      const result = await apiFetch("/api/org-admin/programs", {
        method: "POST",
        body: JSON.stringify({
          orgId: activeOrgId,
          code: newCode,
          name: newName,
        }),
      });

      if (!result) return;
      if (!result.response.ok) {
        setStatus(result.body.error ?? "Failed to add program.");
        return;
      }

      setNewCode("");
      setNewName("");
      setStatus("Program / Department added.");
      await loadPrograms();
    } catch (error) {
      setStatus(`Create failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setBusy(false);
    }
  }

  async function saveProgram(program: ProgramDraft) {
    if (!activeOrgId) return;

    setBusy(true);
    setStatus(null);
    try {
      const result = await apiFetch("/api/org-admin/programs", {
        method: "PATCH",
        body: JSON.stringify({
          orgId: activeOrgId,
          programId: program.id,
          code: program.code,
          name: program.name,
          isActive: Boolean(program.is_active),
        }),
      });

      if (!result) return;
      if (!result.response.ok) {
        setStatus(result.body.error ?? "Failed to save program.");
        return;
      }

      setStatus("Program / Department updated.");
      await loadPrograms();
    } catch (error) {
      setStatus(`Save failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setBusy(false);
    }
  }

  function updateDraft(id: string, patch: Partial<ProgramDraft>) {
    setPrograms((rows) =>
      rows.map((row) => (row.id === id ? { ...row, ...patch, dirty: true } : row))
    );
  }

  const activePrograms = programs.filter((program) => program.is_active !== false);
  const archivedPrograms = programs.filter((program) => program.is_active === false);

  return (
    <MediaWorkspaceShell
      title="Programs"
      subtitle={`Manage the program and department options used for albums in ${activeOrg?.name ?? "the active organization"}.`}
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
    >
      <Card className="space-y-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>{activePrograms.length} active</Badge>
          <Badge>{archivedPrograms.length} archived</Badge>
          <Badge>{activeOrg?.slug ?? "no-org"}</Badge>
        </div>

        <div className="space-y-1">
          <SectionTitle as="h2">Program Directory</SectionTitle>
          <BodyText muted>Albums use this org-level list for their Program / Department field.</BodyText>
          <BodyText muted>Rename with care. Existing albums will immediately display the updated label for the selected program.</BodyText>
        </div>

        <form className="grid gap-3 lg:grid-cols-[140px_minmax(0,1fr)_auto] lg:items-end" onSubmit={createProgram}>
          <div className="space-y-1">
            <FieldLabel>Code</FieldLabel>
            <Input
              placeholder="e.g., ESL"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
              disabled={busy || !activeOrgId}
              required
            />
          </div>
          <div className="space-y-1">
            <FieldLabel>Program / Department</FieldLabel>
            <Input
              placeholder="e.g., English as a Second Language"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              disabled={busy || !activeOrgId}
              required
            />
          </div>
          <Button type="submit" variant="primary" className="h-11 px-5" disabled={busy || !activeOrgId}>
            {busy ? "Working…" : "Add program"}
          </Button>
        </form>

        {status ? <BodyText>{status}</BodyText> : null}
      </Card>

      <Card className="overflow-hidden p-0">
        {loading ? (
          <BodyText muted className="p-4">Loading programs…</BodyText>
        ) : programs.length === 0 ? (
          <BodyText muted className="p-4">No programs found for this school yet.</BodyText>
        ) : (
          <div className="divide-y divide-slate-200">
            {programs.map((program) => (
              <div key={program.id} className="grid gap-3 p-4 lg:grid-cols-[140px_minmax(0,1fr)_160px_auto] lg:items-center">
                <div className="space-y-1">
                  <FieldLabel>Code</FieldLabel>
                  <Input
                    value={program.code}
                    onChange={(e) => updateDraft(program.id, { code: e.target.value })}
                    disabled={busy}
                  />
                </div>

                <div className="space-y-1">
                  <FieldLabel>Program / Department</FieldLabel>
                  <Input
                    value={program.name}
                    onChange={(e) => updateDraft(program.id, { name: e.target.value })}
                    disabled={busy}
                  />
                </div>

                <div className="space-y-1">
                  <FieldLabel>Status</FieldLabel>
                  <select
                    className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
                    value={program.is_active === false ? "archived" : "active"}
                    onChange={(e) => updateDraft(program.id, { is_active: e.target.value === "active" })}
                    disabled={busy}
                  >
                    <option value="active">active</option>
                    <option value="archived">archived</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 lg:justify-end">
                  <Badge>{program.is_active === false ? "Archived" : "Active"}</Badge>
                  <Button
                    variant="secondary"
                    disabled={busy || !program.dirty}
                    onClick={() => void saveProgram(program)}
                  >
                    Save
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </MediaWorkspaceShell>
  );
}
