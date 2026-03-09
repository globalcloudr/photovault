import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { normalizeMarketingHomepageContent } from "@/lib/marketing-homepage-content";

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

  const body = (await req.json()) as { versionId?: number };
  if (!body.versionId) {
    return NextResponse.json({ error: "versionId is required." }, { status: 400 });
  }

  const adminSupabase = createClient(env.supabaseUrl, env.serviceRoleKey);

  const [{ data: sourceVersion, error: sourceError }, { data: currentRow }] = await Promise.all([
    adminSupabase
      .from("marketing_page_versions")
      .select("id,content")
      .eq("id", body.versionId)
      .eq("slug", "home")
      .single(),
    adminSupabase.from("marketing_pages").select("content").eq("slug", "home").maybeSingle(),
  ]);

  if (sourceError || !sourceVersion) {
    return NextResponse.json({ error: sourceError?.message ?? "Version not found." }, { status: 404 });
  }

  if (currentRow?.content) {
    await adminSupabase.from("marketing_page_versions").insert({
      slug: "home",
      content: currentRow.content,
      updated_by: userData.user.id,
    });
  }

  const nextContent = normalizeMarketingHomepageContent(sourceVersion.content);
  const { error: updateError } = await adminSupabase
    .from("marketing_pages")
    .update({
      content: nextContent,
      updated_by: userData.user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("slug", "home");

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, content: nextContent });
}

