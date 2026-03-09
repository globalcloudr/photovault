import { randomBytes, createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { logAuditEvent } from "@/lib/audit-server";

type CreateShareLinkBody = {
  orgId?: string;
  albumId?: string;
  expiresAt?: string | null;
  allowDownload?: boolean;
  password?: string;
};

function getEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !anonKey || !serviceRoleKey) return null;
  return { supabaseUrl, anonKey, serviceRoleKey };
}

function hashPassword(password: string) {
  return createHash("sha256").update(password).digest("hex");
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
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
  if (userError || !userData.user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const body = (await req.json()) as CreateShareLinkBody;
  const orgId = body.orgId?.trim() ?? "";
  const albumId = body.albumId?.trim() ?? "";
  const allowDownload = body.allowDownload ?? true;
  const expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
  const password = body.password?.trim() ?? "";

  if (!orgId || !albumId) {
    return NextResponse.json({ error: "orgId and albumId are required." }, { status: 400 });
  }

  if (expiresAt && Number.isNaN(expiresAt.valueOf())) {
    return NextResponse.json({ error: "Invalid expiresAt value." }, { status: 400 });
  }

  const adminSupabase = createClient(env.supabaseUrl, env.serviceRoleKey);

  const [{ data: profileData }, { data: membershipData }, { data: albumData, error: albumError }] = await Promise.all([
    authedSupabase.from("profiles").select("is_super_admin").eq("user_id", userData.user.id).single(),
    authedSupabase
      .from("memberships")
      .select("role")
      .eq("org_id", orgId)
      .eq("user_id", userData.user.id)
      .single(),
    authedSupabase.from("albums").select("id").eq("id", albumId).eq("org_id", orgId).single(),
  ]);

  const isSuperAdmin = Boolean(profileData?.is_super_admin);
  const isOwner = membershipData?.role === "owner";
  if (!isSuperAdmin && !isOwner) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  if (albumError || !albumData) {
    return NextResponse.json({ error: "Album not found for this organization." }, { status: 404 });
  }

  const token = randomBytes(24).toString("base64url");
  const tokenHash = hashToken(token);
  const passwordHash = password ? hashPassword(password) : null;

  const baseInsert = {
    org_id: orgId,
    album_id: albumId,
    token,
    expires_at: expiresAt ? expiresAt.toISOString() : null,
    allow_download: allowDownload,
    password_hash: passwordHash,
    revoked_at: null,
    created_by: userData.user.id,
  };

  let insertResult = await adminSupabase
    .from("share_links")
    .insert({
      ...baseInsert,
      token_hash: tokenHash,
    })
    .select("id,token,expires_at,allow_download,created_at")
    .single();

  if (insertResult.error?.message?.includes('column "token_hash" of relation "share_links" does not exist')) {
    insertResult = await adminSupabase
      .from("share_links")
      .insert(baseInsert)
      .select("id,token,expires_at,allow_download,created_at")
      .single();
  }

  const { data: inserted, error: insertError } = insertResult;

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 400 });
  }

  const origin = new URL(req.url).origin;
  await logAuditEvent({
    orgId,
    eventType: "share_link_created",
    actorUserId: userData.user.id,
    actorEmail: userData.user.email ?? null,
    entityType: "album",
    entityId: albumId,
    metadata: {
      shareLinkId: inserted.id,
      expiresAt: inserted.expires_at,
      allowDownload: inserted.allow_download,
      hasPassword: Boolean(passwordHash),
    },
  });

  return NextResponse.json({
    ok: true,
    link: inserted,
    url: `${origin}/share/${token}`,
  });
}
