import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { logAuditEvent } from "@/lib/audit-server";

type AuditBody = {
  orgId?: string;
  eventType?: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
};

function getEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) return null;
  return { supabaseUrl, anonKey };
}

export async function POST(req: Request) {
  const env = getEnv();
  if (!env) {
    return NextResponse.json({ error: "Missing Supabase environment variables." }, { status: 500 });
  }

  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const authedSupabase = createClient(env.supabaseUrl, env.anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userData, error: userError } = await authedSupabase.auth.getUser();
  if (userError || !userData.user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await req.json()) as AuditBody;
  const orgId = body.orgId?.trim() ?? "";
  const eventType = body.eventType?.trim() ?? "";
  if (!orgId || !eventType) {
    return NextResponse.json({ error: "orgId and eventType are required." }, { status: 400 });
  }

  const [{ data: profileData }, { data: membershipData }] = await Promise.all([
    authedSupabase.from("profiles").select("is_super_admin,email").eq("user_id", userData.user.id).single(),
    authedSupabase
      .from("memberships")
      .select("role")
      .eq("org_id", orgId)
      .eq("user_id", userData.user.id)
      .single(),
  ]);

  const isSuperAdmin = Boolean(profileData?.is_super_admin);
  if (!isSuperAdmin && !membershipData?.role) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  await logAuditEvent({
    orgId,
    eventType,
    actorUserId: userData.user.id,
    actorEmail: profileData?.email ?? userData.user.email ?? null,
    entityType: body.entityType ?? null,
    entityId: body.entityId ?? null,
    metadata: body.metadata ?? {},
  });

  return NextResponse.json({ ok: true });
}
