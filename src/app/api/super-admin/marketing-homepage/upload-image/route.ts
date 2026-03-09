import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

function getEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !anonKey || !serviceRoleKey) return null;
  return { supabaseUrl, anonKey, serviceRoleKey };
}

function makeStorageRef(bucket: string, path: string) {
  return `storage://${bucket}/${path}`;
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

  const formData = await req.formData();
  const file = formData.get("file");
  const slot = (formData.get("slot") as string | null) ?? "feature";
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "File is required." }, { status: 400 });
  }

  const originalName = file.name || "upload";
  const sanitizedName = originalName.replace(/[^a-zA-Z0-9._-]/g, "-");
  const path = `marketing/home/${slot}-${Date.now()}-${sanitizedName}`;

  const adminSupabase = createClient(env.supabaseUrl, env.serviceRoleKey);
  const { error: uploadError } = await adminSupabase.storage
    .from("originals")
    .upload(path, file, {
      upsert: false,
      contentType: file.type || "application/octet-stream",
    });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 400 });
  }

  const { data: signedData } = await adminSupabase.storage.from("originals").createSignedUrl(path, 60 * 60 * 24);

  return NextResponse.json({
    ok: true,
    storageRef: makeStorageRef("originals", path),
    previewUrl: signedData?.signedUrl ?? null,
  });
}

