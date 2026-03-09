export const MEMBERSHIP_ROLES = ["owner", "uploader", "viewer"] as const;

export type MembershipRole = (typeof MEMBERSHIP_ROLES)[number];

export function isMembershipRole(value: string): value is MembershipRole {
  return MEMBERSHIP_ROLES.includes(value as MembershipRole);
}

export function canEditOrgAppearance(role: string | null | undefined) {
  return role === "owner";
}

