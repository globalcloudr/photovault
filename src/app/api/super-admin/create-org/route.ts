import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { logAuditEvent } from "@/lib/audit-server";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

type CreateOrgBody = {
  name?: string;
  slug?: string;
};

const DEFAULT_ORG_DEPARTMENTS = [
  { code: "AWD", name: "Adults with Disabilities", sort_order: 10 },
  { code: "AAP", name: "Active Adults Program", sort_order: 20 },
  { code: "ASE", name: "Adult Secondary Education", sort_order: 30 },
  { code: "ABE", name: "Adult Basic Education", sort_order: 40 },
  { code: "CE", name: "Career Education", sort_order: 50 },
  { code: "CTE", name: "Career Technical Education", sort_order: 60 },
  { code: "ESL", name: "English as a Second Language", sort_order: 70 },
  { code: "HSD", name: "High School Diploma", sort_order: 80 },
  { code: "HiSET", name: "High School Equivalency", sort_order: 90 },
  { code: "CC", name: "Community Classes", sort_order: 100 },
] as const;

function getEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !anonKey || !serviceRoleKey) return null;
  return { supabaseUrl, anonKey, serviceRoleKey };
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

  const { data: profileData, error: profileError } = await authedSupabase
    .from("profiles")
    .select("is_super_admin")
    .eq("user_id", userData.user.id)
    .single();

  if (profileError || !profileData?.is_super_admin) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const body = (await req.json()) as CreateOrgBody;
  const name = body.name?.trim() ?? "";
  const slug = body.slug?.trim().toLowerCase() ?? "";

  if (!name) {
    return NextResponse.json({ error: "Organization name is required." }, { status: 400 });
  }
  if (!slug || !SLUG_RE.test(slug)) {
    return NextResponse.json(
      { error: "Slug is required and must use lowercase letters, numbers, and hyphens only." },
      { status: 400 }
    );
  }

  const adminSupabase = createClient(env.supabaseUrl, env.serviceRoleKey);
  const { data, error } = await adminSupabase
    .from("organizations")
    .insert({ name, slug })
    .select("id,name,slug,created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const { error: departmentsError } = await adminSupabase.from("org_departments").insert(
    DEFAULT_ORG_DEPARTMENTS.map((department) => ({
      org_id: data.id,
      code: department.code,
      name: department.name,
      sort_order: department.sort_order,
      is_active: true,
    }))
  );

  if (departmentsError) {
    return NextResponse.json(
      {
        error: `Organization created, but default programs failed to seed: ${departmentsError.message}`,
        org: data,
      },
      { status: 500 }
    );
  }

  await logAuditEvent({
    orgId: data.id,
    eventType: "org_created",
    actorUserId: userData.user.id,
    actorEmail: userData.user.email ?? null,
    entityType: "organization",
    entityId: data.id,
    metadata: {
      name: data.name,
      slug: data.slug,
    },
  });

  return NextResponse.json({
    ok: true,
    org: data,
    message: `Organization ${data.name} created.`,
  });
}
