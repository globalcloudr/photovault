import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

function getEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !anonKey || !serviceRoleKey) return null;
  return { supabaseUrl, anonKey, serviceRoleKey };
}

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
  const [{ data: current }, { data: versions, error: versionsError }] = await Promise.all([
    adminSupabase.from("marketing_pages").select("slug,updated_at,updated_by").eq("slug", "home").maybeSingle(),
    adminSupabase
      .from("marketing_page_versions")
      .select("id,slug,updated_at,updated_by")
      .eq("slug", "home")
      .order("updated_at", { ascending: false })
      .limit(25),
  ]);

  if (versionsError) {
    return NextResponse.json({ error: versionsError.message }, { status: 400 });
  }

  return NextResponse.json({
    current: current ?? null,
    versions: versions ?? [],
  });
}

