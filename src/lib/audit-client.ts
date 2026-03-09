import { supabase } from "@/lib/supabaseClient";

export type ClientAuditEventInput = {
  orgId: string;
  eventType: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
};

export async function logAuditEventClient(input: ClientAuditEventInput) {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) return;

  await fetch("/api/audit-events", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(input),
  });
}
