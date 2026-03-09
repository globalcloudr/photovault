import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { DEFAULT_INVITE_TEMPLATE, normalizeInviteTemplate } from "@/lib/invite-template";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !anonKey || !serviceRoleKey) return null;
  return { supabaseUrl, anonKey, serviceRoleKey };
}

async function requireSuperAdmin(req: Request) {
  const env = getEnv();
  if (!env) return { error: NextResponse.json({ error: "Missing Supabase environment variables." }, { status: 500 }) };

  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { error: NextResponse.json({ error: "Unauthorized." }, { status: 401 }) };
  }

  const authedSupabase = createClient(env.supabaseUrl, env.anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userData, error: userError } = await authedSupabase.auth.getUser();
  if (userError || !userData.user) {
    return { error: NextResponse.json({ error: "Unauthorized." }, { status: 401 }) };
  }

  const { data: profileData, error: profileError } = await authedSupabase
    .from("profiles")
    .select("is_super_admin")
    .eq("user_id", userData.user.id)
    .single();

  if (profileError || !profileData?.is_super_admin) {
    return { error: NextResponse.json({ error: "Forbidden." }, { status: 403 }) };
  }

  return { env, userId: userData.user.id };
}

export async function GET(req: Request) {
  const auth = await requireSuperAdmin(req);
  if ("error" in auth) return auth.error;

  const url = new URL(req.url);
  const orgId = url.searchParams.get("orgId")?.trim() ?? "";
  if (!UUID_RE.test(orgId)) {
    return NextResponse.json({ error: "A valid orgId is required." }, { status: 400 });
  }

  const adminSupabase = createClient(auth.env.supabaseUrl, auth.env.serviceRoleKey);
  const { data, error } = await adminSupabase
    .from("org_invite_templates")
    .select("subject,body,signature")
    .eq("org_id", orgId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({
    template: normalizeInviteTemplate(data ?? DEFAULT_INVITE_TEMPLATE),
  });
}

export async function PUT(req: Request) {
  const auth = await requireSuperAdmin(req);
  if ("error" in auth) return auth.error;

  const body = (await req.json()) as {
    orgId?: string;
    subject?: string;
    body?: string;
    signature?: string;
  };

  const orgId = body.orgId?.trim() ?? "";
  if (!UUID_RE.test(orgId)) {
    return NextResponse.json({ error: "A valid orgId is required." }, { status: 400 });
  }

  const template = normalizeInviteTemplate({
    subject: body.subject,
    body: body.body,
    signature: body.signature,
  });

  const adminSupabase = createClient(auth.env.supabaseUrl, auth.env.serviceRoleKey);
  const { error } = await adminSupabase.from("org_invite_templates").upsert(
    {
      org_id: orgId,
      subject: template.subject,
      body: template.body,
      signature: template.signature,
      updated_by: auth.userId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "org_id" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    template,
    message: "Invite template saved.",
  });
}

