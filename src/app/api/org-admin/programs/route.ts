import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type ProfileRow = {
  is_super_admin: boolean | null;
};

type MembershipRow = {
  role: "owner" | "uploader" | "viewer";
};

type ProgramRow = {
  id: string;
  org_id: string;
  code: string;
  name: string;
  sort_order: number | null;
  is_active: boolean | null;
};

type ProgramBody = {
  orgId?: string;
  programId?: string;
  code?: string;
  name?: string;
  isActive?: boolean;
};

function getEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !anonKey || !serviceRoleKey) return null;
  return { supabaseUrl, anonKey, serviceRoleKey };
}

async function canManageOrg(authedSupabase: SupabaseClient, userId: string, orgId: string) {
  const [{ data: profileData }, { data: membershipData }] = await Promise.all([
    authedSupabase.from("profiles").select("is_super_admin").eq("user_id", userId).single(),
    authedSupabase.from("memberships").select("role").eq("org_id", orgId).eq("user_id", userId).single(),
  ]);

  const profile = profileData as ProfileRow | null;
  const membership = membershipData as MembershipRow | null;
  return Boolean(profile?.is_super_admin) || membership?.role === "owner";
}

function normalizeCode(value: string) {
  return value.trim().replace(/\s+/g, " ").toUpperCase();
}

function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, " ");
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
  const { data, error } = await adminSupabase
    .from("org_departments")
    .select("id,org_id,code,name,sort_order,is_active")
    .eq("org_id", orgId)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, programs: (data ?? []) as ProgramRow[] });
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

  const body = (await req.json()) as ProgramBody;
  const orgId = body.orgId?.trim() ?? "";
  const code = normalizeCode(body.code ?? "");
  const name = normalizeName(body.name ?? "");

  if (!UUID_RE.test(orgId)) return NextResponse.json({ error: "Valid orgId is required." }, { status: 400 });
  if (!code) return NextResponse.json({ error: "Program code is required." }, { status: 400 });
  if (!name) return NextResponse.json({ error: "Program name is required." }, { status: 400 });

  const allowed = await canManageOrg(authedSupabase, userData.user.id, orgId);
  if (!allowed) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const adminSupabase = createClient(env.supabaseUrl, env.serviceRoleKey);
  const { data: existingCode } = await adminSupabase
    .from("org_departments")
    .select("id")
    .eq("org_id", orgId)
    .eq("code", code)
    .maybeSingle();

  if (existingCode) {
    return NextResponse.json({ error: "That program code already exists for this school." }, { status: 400 });
  }

  const { data: lastRow } = await adminSupabase
    .from("org_departments")
    .select("sort_order")
    .eq("org_id", orgId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextSortOrder = typeof lastRow?.sort_order === "number" ? lastRow.sort_order + 1 : 1;

  const { data, error } = await adminSupabase
    .from("org_departments")
    .insert({
      org_id: orgId,
      code,
      name,
      sort_order: nextSortOrder,
      is_active: true,
    })
    .select("id,org_id,code,name,sort_order,is_active")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, program: data as ProgramRow });
}

export async function PATCH(req: Request) {
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

  const body = (await req.json()) as ProgramBody;
  const orgId = body.orgId?.trim() ?? "";
  const programId = body.programId?.trim() ?? "";
  const code = normalizeCode(body.code ?? "");
  const name = normalizeName(body.name ?? "");

  if (!UUID_RE.test(orgId)) return NextResponse.json({ error: "Valid orgId is required." }, { status: 400 });
  if (!UUID_RE.test(programId)) return NextResponse.json({ error: "Valid programId is required." }, { status: 400 });
  if (!code) return NextResponse.json({ error: "Program code is required." }, { status: 400 });
  if (!name) return NextResponse.json({ error: "Program name is required." }, { status: 400 });

  const allowed = await canManageOrg(authedSupabase, userData.user.id, orgId);
  if (!allowed) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const adminSupabase = createClient(env.supabaseUrl, env.serviceRoleKey);
  const { data: existingCode } = await adminSupabase
    .from("org_departments")
    .select("id")
    .eq("org_id", orgId)
    .eq("code", code)
    .neq("id", programId)
    .maybeSingle();

  if (existingCode) {
    return NextResponse.json({ error: "That program code already exists for this school." }, { status: 400 });
  }

  const { data, error } = await adminSupabase
    .from("org_departments")
    .update({
      code,
      name,
      is_active: body.isActive ?? true,
    })
    .eq("id", programId)
    .eq("org_id", orgId)
    .select("id,org_id,code,name,sort_order,is_active")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, program: data as ProgramRow });
}
