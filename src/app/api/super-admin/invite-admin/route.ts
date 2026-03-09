import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { MembershipRole, isMembershipRole } from "@/lib/roles";
import { logAuditEvent } from "@/lib/audit-server";
import { DEFAULT_INVITE_TEMPLATE, normalizeInviteTemplate, renderInviteTemplate } from "@/lib/invite-template";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type InviteBody = {
  orgId?: string;
  email?: string;
  role?: string;
};

function getEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return null;
  }

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
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
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

  const body = (await req.json()) as InviteBody;
  const orgId = body.orgId?.trim() ?? "";
  const email = body.email?.trim().toLowerCase() ?? "";
  const roleRaw = body.role?.trim().toLowerCase() ?? "owner";

  if (!isMembershipRole(roleRaw)) {
    return NextResponse.json({ error: "Invalid role. Use owner, uploader, or viewer." }, { status: 400 });
  }
  const role: MembershipRole = roleRaw;

  if (!UUID_RE.test(orgId)) {
    return NextResponse.json({ error: "A valid orgId is required." }, { status: 400 });
  }

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
  }

  const adminSupabase = createClient(env.supabaseUrl, env.serviceRoleKey);

  const { data: orgData, error: orgError } = await adminSupabase
    .from("organizations")
    .select("id,name,slug")
    .eq("id", orgId)
    .single();

  if (orgError || !orgData) {
    return NextResponse.json({ error: "Organization not found." }, { status: 404 });
  }

  const { data: templateData } = await adminSupabase
    .from("org_invite_templates")
    .select("subject,body,signature")
    .eq("org_id", orgId)
    .maybeSingle();

  const template = normalizeInviteTemplate(templateData ?? DEFAULT_INVITE_TEMPLATE);
  const renderedInvite = renderInviteTemplate(template, {
    schoolName: orgData.name,
    inviteeEmail: email,
    senderName: userData.user.email ?? "PhotoVault",
  });

  const { data: inviteData, error: inviteError } = await adminSupabase.auth.admin.inviteUserByEmail(
    email,
    {
      data: {
        org_id: orgId,
        org_name: orgData.name,
        invite_message_subject: renderedInvite.subject,
        invite_message_body: renderedInvite.body,
        invite_message_signature: renderedInvite.signature,
      },
    }
  );

  if (inviteError) {
    return NextResponse.json({ error: inviteError.message }, { status: 400 });
  }

  const invitedUserId = inviteData.user?.id;
  if (invitedUserId) {
    const membershipPayload: Record<string, string> = {
      org_id: orgId,
      user_id: invitedUserId,
      role,
    };

    const { error: membershipError } = await adminSupabase
      .from("memberships")
      .upsert(membershipPayload, { onConflict: "org_id,user_id" });

    if (membershipError) {
      return NextResponse.json(
        {
          error:
            `Invite sent, but failed to assign org admin membership: ${membershipError.message}. ` +
            `Check memberships schema for org_id/user_id/role compatibility.`,
        },
        { status: 500 }
      );
    }
  }

  await logAuditEvent({
    orgId,
    eventType: "org_admin_invited",
    actorUserId: userData.user.id,
    actorEmail: userData.user.email ?? null,
    entityType: "membership",
    entityId: invitedUserId ?? email,
    metadata: {
      invitedEmail: email,
      invitedUserId: invitedUserId ?? null,
      role,
      templateSubject: template.subject,
    },
  });

  return NextResponse.json({
    ok: true,
    message: `Invite sent to ${email} for ${orgData.name} as ${role}.`,
    org: orgData,
    role,
    invitedUserId: invitedUserId ?? null,
  });
}
