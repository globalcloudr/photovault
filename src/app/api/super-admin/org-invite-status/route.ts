import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

function getEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !anonKey || !serviceRoleKey) return null;
  return { supabaseUrl, anonKey, serviceRoleKey };
}

type MembershipRow = {
  org_id: string;
  user_id: string;
  role: string;
};

type AuthUser = {
  id: string;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
};

export async function GET(req: Request) {
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

  const { data: profileData, error: profileError } = await authedSupabase
    .from("profiles")
    .select("is_super_admin")
    .eq("user_id", userData.user.id)
    .single();

  if (profileError || !profileData?.is_super_admin) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const adminSupabase = createClient(env.supabaseUrl, env.serviceRoleKey);

  const { data: ownersData, error: ownersError } = await adminSupabase
    .from("memberships")
    .select("org_id,user_id,role")
    .eq("role", "owner");

  if (ownersError) {
    return NextResponse.json({ error: ownersError.message }, { status: 500 });
  }

  const ownerMemberships = (ownersData ?? []) as MembershipRow[];
  const ownerUserIds = Array.from(new Set(ownerMemberships.map((m) => m.user_id)));

  const userAcceptedMap = new Map<string, boolean>();
  if (ownerUserIds.length > 0) {
    let page = 1;
    const perPage = 1000;

    while (true) {
      const { data, error } = await adminSupabase.auth.admin.listUsers({ page, perPage });
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      const users = ((data?.users ?? []) as AuthUser[]).filter((u) => ownerUserIds.includes(u.id));
      for (const user of users) {
        userAcceptedMap.set(user.id, Boolean(user.last_sign_in_at || user.email_confirmed_at));
      }

      const totalUsers = data?.users?.length ?? 0;
      if (totalUsers < perPage) break;
      page += 1;
    }
  }

  const orgStatusMap = new Map<string, { ownerCount: number; acceptedOwnerCount: number }>();
  for (const membership of ownerMemberships) {
    const current = orgStatusMap.get(membership.org_id) ?? { ownerCount: 0, acceptedOwnerCount: 0 };
    current.ownerCount += 1;
    if (userAcceptedMap.get(membership.user_id)) {
      current.acceptedOwnerCount += 1;
    }
    orgStatusMap.set(membership.org_id, current);
  }

  const statuses = Array.from(orgStatusMap.entries()).map(([orgId, counts]) => ({
    orgId,
    ownerCount: counts.ownerCount,
    acceptedOwnerCount: counts.acceptedOwnerCount,
  }));

  return NextResponse.json({ ok: true, statuses });
}
