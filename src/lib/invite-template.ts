export type InviteTemplate = {
  subject: string;
  body: string;
  signature: string;
};

export const DEFAULT_INVITE_TEMPLATE: InviteTemplate = {
  subject: "Welcome to {{school_name}} on PhotoVault",
  body: "Hi {{invitee_email}},\n\nYou've been invited to join {{school_name}}'s PhotoVault workspace.\nUse the invite link in this email to activate your access and start managing school media securely.",
  signature: "PhotoVault Team",
};

export type InviteRenderContext = {
  schoolName: string;
  inviteeEmail: string;
  senderName: string;
};

function safeReplace(value: string) {
  return value.trim();
}

export function renderInviteTemplate(template: InviteTemplate, context: InviteRenderContext) {
  const replace = (input: string) =>
    input
      .replaceAll("{{school_name}}", safeReplace(context.schoolName))
      .replaceAll("{{invitee_email}}", safeReplace(context.inviteeEmail))
      .replaceAll("{{sender_name}}", safeReplace(context.senderName));

  return {
    subject: replace(template.subject),
    body: replace(template.body),
    signature: replace(template.signature),
  };
}

export function normalizeInviteTemplate(input: unknown): InviteTemplate {
  const source = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  return {
    subject: typeof source.subject === "string" && source.subject.trim() ? source.subject : DEFAULT_INVITE_TEMPLATE.subject,
    body: typeof source.body === "string" && source.body.trim() ? source.body : DEFAULT_INVITE_TEMPLATE.body,
    signature:
      typeof source.signature === "string" && source.signature.trim()
        ? source.signature
        : DEFAULT_INVITE_TEMPLATE.signature,
  };
}

