import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { MembershipRole } from "@/lib/roles";
import { logAuditEvent } from "@/lib/audit-server";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const STAFF_ROLES = new Set<MembershipRole>(["uploader", "viewer"]);

type StaffBody = {
  orgId?: string;
  email?: string;
  role?: string;
  userId?: string;
};

type MembershipRow = {
  id: string;
  org_id: string;
  user_id: string;
  role: MembershipRole;
  created_at: string;
};

type ProfileRow = {
  is_super_admin: boolean | null;
};

type AuthUser = {
  id: string;
  email?: string | null;
  last_sign_in_at?: string | null;
  email_confirmed_at?: string | null;
};

function getEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !anonKey || !serviceRoleKey) return null;
  return { supabaseUrl, anonKey, serviceRoleKey };
}

async function canManageOrg(authedSupabase: ReturnType<typeof createClient>, userId: string, orgId: string) {
  const [{ data: profileData }, { data: membershipData }] = await Promise.all([
    authedSupabase.from("profiles").select("is_super_admin").eq("user_id", userId).single(),
    authedSupabase.from("memberships").select("role").eq("org_id", orgId).eq("user_id", userId).single(),
  ]);

  const profile = profileData as ProfileRow | null;
  const membership = membershipData as Pick<MembershipRow, "role"> | null;
  const isSuperAdmin = Boolean(profile?.is_super_admin);
  const isOwner = membership?.role === "owner";
  return isSuperAdmin || isOwner;
}

async function fetchAuthUsersMap(
  adminSupabase: ReturnType<typeof createClient>,
  wantedUserIds: Set<string>
) {
  const usersMap = new Map<string, AuthUser>();
  if (wantedUserIds.size === 0) return usersMap;

  let page = 1;
  const perPage = 1000;
  while (true) {
    const { data, error } = await adminSupabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const users = (data?.users ?? []) as AuthUser[];
    for (const user of users) {
      if (wantedUserIds.has(user.id)) {
        usersMap.set(user.id, user);
      }
    }

    if (users.length < perPage) break;
    page += 1;
  }

  return usersMap;
}

export async function GET(req: Request) {
  const env = getEnv();
  if (!env) return NextResponse.json({ error: "Missing Supabase environment variables." }, { status: 500 });

  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const orgId = new URL(req.url).searchParams.get("orgId")?.trim() ?? "";
  if (!UUID_RE.test(orgId)) {
    return NextResponse.json({ error: "Valid orgId is required." }, { status: 400 });
  }

  const authedSupabase = createClient(env.supabaseUrl, env.anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await authedSupabase.auth.getUser();
  if (userError || !userData.user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const allowed = await canManageOrg(authedSupabase, userData.user.id, orgId);
  if (!allowed) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const adminSupabase = createClient(env.supabaseUrl, env.serviceRoleKey);
  const { data: rows, error } = await adminSupabase
    .from("memberships")
    .select("id,org_id,user_id,role,created_at")
    .eq("org_id", orgId)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const memberships = (rows ?? []) as MembershipRow[];
  const userIds = new Set(memberships.map((x) => x.user_id));
  const usersMap = await fetchAuthUsersMap(adminSupabase, userIds);

  const staff = memberships.map((row) => {
    const user = usersMap.get(row.user_id);
    return {
      ...row,
      email: user?.email ?? null,
      accepted: Boolean(user?.last_sign_in_at || user?.email_confirmed_at),
    };
  });

  return NextResponse.json({ ok: true, staff });
}

export async function POST(req: Request) {
  const env = getEnv();
  if (!env) return NextResponse.json({ error: "Missing Supabase environment variables." }, { status: 500 });

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

  const body = (await req.json()) as StaffBody;
  const orgId = body.orgId?.trim() ?? "";
  const email = body.email?.trim().toLowerCase() ?? "";
  const role = (body.role?.trim().toLowerCase() ?? "") as MembershipRole;

  if (!UUID_RE.test(orgId)) return NextResponse.json({ error: "Valid orgId is required." }, { status: 400 });
  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: "Valid email is required." }, { status: 400 });
  if (!STAFF_ROLES.has(role)) return NextResponse.json({ error: "Role must be uploader or viewer." }, { status: 400 });

  const allowed = await canManageOrg(authedSupabase, userData.user.id, orgId);
  if (!allowed) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const adminSupabase = createClient(env.supabaseUrl, env.serviceRoleKey);
  const { data: inviteData, error: inviteError } = await adminSupabase.auth.admin.inviteUserByEmail(email);
  if (inviteError) {
    return NextResponse.json({ error: inviteError.message }, { status: 400 });
  }

  const invitedUserId = inviteData.user?.id;
  if (invitedUserId) {
    const { error: membershipError } = await adminSupabase
      .from("memberships")
      .upsert({ org_id: orgId, user_id: invitedUserId, role }, { onConflict: "org_id,user_id" });
    if (membershipError) {
      return NextResponse.json({ error: membershipError.message }, { status: 500 });
    }
  }

  await logAuditEvent({
    orgId,
    eventType: "staff_invited",
    actorUserId: userData.user.id,
    actorEmail: userData.user.email ?? null,
    entityType: "membership",
    entityId: invitedUserId ?? email,
    metadata: { role, invitedEmail: email, invitedUserId: invitedUserId ?? null },
  });

  return NextResponse.json({ ok: true, message: `Invite sent to ${email} as ${role}.` });
}

export async function DELETE(req: Request) {
  const env = getEnv();
  if (!env) return NextResponse.json({ error: "Missing Supabase environment variables." }, { status: 500 });

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

  const body = (await req.json()) as StaffBody;
  const orgId = body.orgId?.trim() ?? "";
  const userId = body.userId?.trim() ?? "";
  if (!UUID_RE.test(orgId) || !UUID_RE.test(userId)) {
    return NextResponse.json({ error: "Valid orgId and userId are required." }, { status: 400 });
  }

  const allowed = await canManageOrg(authedSupabase, userData.user.id, orgId);
  if (!allowed) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const adminSupabase = createClient(env.supabaseUrl, env.serviceRoleKey);
  const { data: membershipData, error: membershipReadError } = await adminSupabase
    .from("memberships")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .single();

  if (membershipReadError) {
    return NextResponse.json({ error: membershipReadError.message }, { status: 404 });
  }
  if (membershipData.role === "owner") {
    return NextResponse.json({ error: "Owner memberships must be managed in Super Admin." }, { status: 400 });
  }

  const { error } = await adminSupabase.from("memberships").delete().eq("org_id", orgId).eq("user_id", userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAuditEvent({
    orgId,
    eventType: "staff_membership_deactivated",
    actorUserId: userData.user.id,
    actorEmail: userData.user.email ?? null,
    entityType: "membership",
    entityId: userId,
    metadata: { role: membershipData.role },
  });

  return NextResponse.json({ ok: true });
}
