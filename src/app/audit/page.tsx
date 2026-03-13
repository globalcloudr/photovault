"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MediaWorkspaceShell } from "@/components/layout/media-workspace-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BodyText, CardTitle, MetaText, SectionTitle } from "@/components/ui/typography";
import { useOrg } from "@/components/org/org-provider";
import { supabase } from "@/lib/supabaseClient";
import { formatDateTimeMDY } from "@/lib/date-format";

type AuditEventRow = {
  id: string;
  org_id: string;
  actor_user_id: string | null;
  actor_email: string | null;
  event_type: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export default function AuditLogPage() {
  const router = useRouter();
  const { activeOrgId, orgs, isSuperAdmin, loading: orgLoading } = useOrg();
  const activeOrg = useMemo(() => orgs.find((org) => org.id === activeOrgId) ?? null, [orgs, activeOrgId]);
  const noActiveOrg = !orgLoading && !activeOrgId;

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [events, setEvents] = useState<AuditEventRow[]>([]);

  useEffect(() => {
    if (orgLoading) return;
    if (!activeOrgId) {
      return;
    }

    async function load() {
      setLoading(true);
      setStatus(null);

      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id;
      if (!userId) {
        router.replace("/login");
        return;
      }

      let allowed = isSuperAdmin;
      if (!allowed) {
        const { data: membershipData } = await supabase
          .from("memberships")
          .select("role")
          .eq("org_id", activeOrgId)
          .eq("user_id", userId)
          .single();

        allowed = membershipData?.role === "owner";
      }

      if (!allowed) {
        setLoading(false);
        setStatus("Only org owners or super admins can review audit logs.");
        setEvents([]);
        return;
      }

      const { data, error } = await supabase
        .from("audit_events")
        .select("id,org_id,actor_user_id,actor_email,event_type,entity_type,entity_id,metadata,created_at")
        .eq("org_id", activeOrgId)
        .order("created_at", { ascending: false })
        .limit(250);

      if (error) {
        setStatus(`Failed to load audit logs: ${error.message}`);
        setEvents([]);
      } else {
        setEvents((data ?? []) as AuditEventRow[]);
      }
      setLoading(false);
    }

    void load();
  }, [activeOrgId, isSuperAdmin, orgLoading, router]);

  return (
    <MediaWorkspaceShell title="Audit Log" subtitle={`Review activity for ${activeOrg?.name ?? "the active organization"}.`} sidebarLogoOnly>
      <Card className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>{events.length} recent events</Badge>
          <Badge>{activeOrg?.slug ?? "no-org"}</Badge>
        </div>

        <div className="space-y-1">
          <SectionTitle as="h2">Recent Activity</SectionTitle>
          <BodyText muted>Track changes, access, and admin actions for the active organization.</BodyText>
        </div>

        {loading ? <BodyText muted>Loading audit events…</BodyText> : null}
        {noActiveOrg ? <BodyText>No active organization selected.</BodyText> : null}
        {!noActiveOrg && status ? <BodyText>{status}</BodyText> : null}

        {!loading && !noActiveOrg && !status ? (
          events.length > 0 ? (
            <div className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
              {events.map((event) => (
                <div key={event.id} className="grid gap-2 p-3 sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-4">
                  <MetaText>{formatDateTimeMDY(event.created_at)}</MetaText>
                  <div className="space-y-1">
                    <CardTitle as="h3" className="text-base">{event.event_type}</CardTitle>
                    <MetaText>
                      Actor: {event.actor_email ?? event.actor_user_id ?? "system"} • Entity: {event.entity_type ?? "n/a"} /{" "}
                      {event.entity_id ?? "n/a"}
                    </MetaText>
                    {event.metadata && Object.keys(event.metadata).length > 0 ? (
                      <pre className="overflow-x-auto rounded-lg bg-slate-50 p-2 text-[11px] text-slate-700">
                        {JSON.stringify(event.metadata, null, 2)}
                      </pre>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <BodyText muted>No audit events yet.</BodyText>
          )
        ) : null}
      </Card>
    </MediaWorkspaceShell>
  );
}
