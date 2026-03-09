import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { logAuditEvent } from "@/lib/audit-server";

type ResolveBody = {
  password?: string;
};

function getEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;
  return { supabaseUrl, serviceRoleKey };
}

function hashPassword(password: string) {
  return createHash("sha256").update(password).digest("hex");
}

export async function POST(req: Request, context: { params: Promise<{ token: string }> }) {
  const env = getEnv();
  if (!env) return NextResponse.json({ error: "Missing Supabase environment variables." }, { status: 500 });

  const { token } = await context.params;
  if (!token) return NextResponse.json({ error: "Missing token." }, { status: 400 });

  const body = (await req.json().catch(() => ({}))) as ResolveBody;
  const password = body.password?.trim() ?? "";

  const adminSupabase = createClient(env.supabaseUrl, env.serviceRoleKey);
  const { data: link, error: linkError } = await adminSupabase
    .from("share_links")
    .select("id,org_id,album_id,expires_at,password_hash,allow_download,revoked_at,created_at")
    .eq("token", token)
    .single();

  if (linkError || !link) {
    return NextResponse.json({ error: "Share link not found." }, { status: 404 });
  }

  if (link.revoked_at) {
    return NextResponse.json({ error: "This share link has been revoked." }, { status: 410 });
  }

  if (link.expires_at && new Date(link.expires_at).valueOf() < Date.now()) {
    return NextResponse.json({ error: "This share link has expired." }, { status: 410 });
  }

  if (link.password_hash) {
    if (!password || hashPassword(password) !== link.password_hash) {
      return NextResponse.json({ error: "Password required.", requiresPassword: true }, { status: 401 });
    }
  }

  const [{ data: albumData }, { data: assetsData, error: assetsError }] = await Promise.all([
    adminSupabase
      .from("albums")
      .select("id,event_name,event_date,rights_status")
      .eq("id", link.album_id)
      .eq("org_id", link.org_id)
      .single(),
    adminSupabase
      .from("assets")
      .select("id,storage_path,original_filename,canonical_filename,sequence_number,size_bytes")
      .eq("album_id", link.album_id)
      .eq("org_id", link.org_id)
      .order("sequence_number", { ascending: true }),
  ]);

  if (assetsError) {
    return NextResponse.json({ error: assetsError.message }, { status: 500 });
  }

  const withUrls = await Promise.all(
    (assetsData ?? []).map(async (asset) => {
      const { data } = await adminSupabase.storage.from("originals").createSignedUrl(asset.storage_path, 60 * 60);
      return {
        ...asset,
        url: data?.signedUrl ?? null,
      };
    })
  );

  await logAuditEvent({
    orgId: link.org_id,
    eventType: "share_link_accessed",
    entityType: "album",
    entityId: link.album_id,
    metadata: {
      token,
      allowDownload: Boolean(link.allow_download),
      assetsCount: withUrls.length,
    },
  });

  return NextResponse.json({
    ok: true,
    album: albumData,
    allowDownload: Boolean(link.allow_download),
    expiresAt: link.expires_at,
    assets: withUrls,
  });
}
