"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOrg } from "@/components/org/org-provider";
import { MediaWorkspaceShell } from "@/components/layout/media-workspace-shell";
import { Card } from "@/components/ui/card";
import { Button, buttonClass } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabaseClient";
import { MEMBERSHIP_ROLES, MembershipRole } from "@/lib/roles";
import { parseStorageRef } from "@/lib/theme";
import { IconAlbums, IconAudit, IconGuidelines, IconMore, IconSettings } from "@/components/ui/icons";
import { DEFAULT_INVITE_TEMPLATE, renderInviteTemplate } from "@/lib/invite-template";

type OrgInviteStatus = {
  orgId: string;
  ownerCount: number;
  acceptedOwnerCount: number;
};

type OrgPortalSummary = {
  brand: string;
  logoUrl: string | null;
  albumsCount: number;
  photosCount: number;
  guidelinesCount: number;
};

export default function SuperAdminPage() {
  const router = useRouter();
  const { loading, isSuperAdmin, orgs, activeOrgId, setActiveOrgId, refreshOrgs } = useOrg();
  const activeOrg = orgs.find((org) => org.id === activeOrgId) ?? null;
  const [createName, setCreateName] = useState("");
  const [createSlug, setCreateSlug] = useState("");
  const [createBusy, setCreateBusy] = useState(false);
  const [createStatus, setCreateStatus] = useState<string | null>(null);
  const [inviteOrgId, setInviteOrgId] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<MembershipRole>("owner");
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteStatus, setInviteStatus] = useState<string | null>(null);
  const [templateSubject, setTemplateSubject] = useState(DEFAULT_INVITE_TEMPLATE.subject);
  const [templateBody, setTemplateBody] = useState(DEFAULT_INVITE_TEMPLATE.body);
  const [templateSignature, setTemplateSignature] = useState(DEFAULT_INVITE_TEMPLATE.signature);
  const [templateBusy, setTemplateBusy] = useState(false);
  const [templateStatus, setTemplateStatus] = useState<string | null>(null);
  const [orgInviteStatuses, setOrgInviteStatuses] = useState<Record<string, OrgInviteStatus>>({});
  const [orgPortalData, setOrgPortalData] = useState<Record<string, OrgPortalSummary>>({});
  const [portalLoading, setPortalLoading] = useState(false);
  const [openActionsOrgId, setOpenActionsOrgId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !isSuperAdmin) {
      router.replace("/albums");
    }
  }, [isSuperAdmin, loading, router]);

  useEffect(() => {
    if (!inviteOrgId && activeOrgId) {
      setInviteOrgId(activeOrgId);
    }
  }, [activeOrgId, inviteOrgId]);

  useEffect(() => {
    if (loading || !isSuperAdmin) return;

    async function loadOrgInviteStatuses() {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData.session?.access_token;
        if (!accessToken) return;

        const response = await fetch("/api/super-admin/org-invite-status", {
          headers: {
            authorization: `Bearer ${accessToken}`,
          },
        });

        const body = (await response.json()) as { statuses?: OrgInviteStatus[]; error?: string };
        if (!response.ok) {
          console.error(body.error ?? "Failed to load org invite statuses.");
          return;
        }

        const mapped = (body.statuses ?? []).reduce<Record<string, OrgInviteStatus>>((acc, row) => {
          acc[row.orgId] = row;
          return acc;
        }, {});
        setOrgInviteStatuses(mapped);
      } catch (error) {
        console.error("Failed to load org invite statuses", error);
      }
    }

    void loadOrgInviteStatuses();
  }, [loading, isSuperAdmin, orgs.length]);

  const inviteableOrgs = orgs.filter((org) => {
    const status = orgInviteStatuses[org.id];
    return !status || status.acceptedOwnerCount === 0;
  });

  useEffect(() => {
    if (inviteableOrgs.length === 0) {
      setInviteOrgId("");
      return;
    }
    if (!inviteableOrgs.some((org) => org.id === inviteOrgId)) {
      setInviteOrgId(inviteableOrgs[0].id);
    }
  }, [inviteOrgId, inviteableOrgs]);

  useEffect(() => {
    if (loading || !isSuperAdmin) return;
    if (orgs.length === 0) {
      setOrgPortalData({});
      return;
    }

    async function loadPortalData() {
      setPortalLoading(true);
      try {
        const orgIds = orgs.map((org) => org.id);

        const { data: themeRows } = await supabase
          .from("org_theme_settings")
          .select("org_id,brand,logo_url")
          .in("org_id", orgIds);

        const themeByOrgId = new Map<string, { brand: string | null; logo_url: string | null }>();
        for (const row of themeRows ?? []) {
          const typedRow = row as { org_id: string; brand: string | null; logo_url: string | null };
          themeByOrgId.set(typedRow.org_id, {
            brand: typedRow.brand,
            logo_url: typedRow.logo_url,
          });
        }

        const summaryRows = await Promise.all(
          orgIds.map(async (orgId) => {
            const [{ count: albumsCount }, { count: photosCount }] = await Promise.all([
              supabase.from("albums").select("id", { count: "exact", head: true }).eq("org_id", orgId),
              supabase.from("assets").select("id", { count: "exact", head: true }).eq("org_id", orgId),
            ]);

            const theme = themeByOrgId.get(orgId);
            let logoUrl = theme?.logo_url ?? null;
            const storageRef = parseStorageRef(logoUrl);
            if (storageRef) {
              const { data: signedData } = await supabase.storage
                .from(storageRef.bucket)
                .createSignedUrl(storageRef.path, 60 * 60 * 24);
              logoUrl = signedData?.signedUrl ?? null;
            }

            return [
              orgId,
              {
                brand: theme?.brand ?? "#0F172A",
                logoUrl,
                albumsCount: albumsCount ?? 0,
                photosCount: photosCount ?? 0,
                guidelinesCount: 1,
              } satisfies OrgPortalSummary,
            ] as const;
          })
        );

        setOrgPortalData(Object.fromEntries(summaryRows));
      } catch (error) {
        console.error("Failed to load portal summary data", error);
      } finally {
        setPortalLoading(false);
      }
    }

    void loadPortalData();
  }, [loading, isSuperAdmin, orgs]);

  useEffect(() => {
    if (!inviteOrgId) return;
    let mounted = true;

    async function loadTemplate() {
      setTemplateStatus(null);
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData.session?.access_token;
        if (!accessToken) return;

        const response = await fetch(`/api/super-admin/invite-template?orgId=${inviteOrgId}`, {
          headers: { authorization: `Bearer ${accessToken}` },
        });

        const body = (await response.json()) as {
          template?: { subject: string; body: string; signature: string };
          error?: string;
        };

        if (!mounted) return;
        if (!response.ok || !body.template) {
          setTemplateSubject(DEFAULT_INVITE_TEMPLATE.subject);
          setTemplateBody(DEFAULT_INVITE_TEMPLATE.body);
          setTemplateSignature(DEFAULT_INVITE_TEMPLATE.signature);
          return;
        }

        setTemplateSubject(body.template.subject);
        setTemplateBody(body.template.body);
        setTemplateSignature(body.template.signature);
      } catch (error) {
        if (!mounted) return;
        console.error("Failed to load invite template", error);
      }
    }

    void loadTemplate();
    return () => {
      mounted = false;
    };
  }, [inviteOrgId]);

  function openOrgRoute(orgId: string, path: string) {
    setActiveOrgId(orgId);
    setOpenActionsOrgId(null);
    router.push(path);
  }

  function slugify(value: string) {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .replace(/-{2,}/g, "-");
  }

  async function submitCreateOrg(e: React.FormEvent) {
    e.preventDefault();
    setCreateStatus(null);

    const name = createName.trim();
    const slug = slugify(createSlug || createName);
    if (!name) {
      setCreateStatus("Organization name is required.");
      return;
    }
    if (!slug) {
      setCreateStatus("Provide a valid slug.");
      return;
    }

    setCreateBusy(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        setCreateStatus("Not authenticated. Please sign in again.");
        return;
      }

      const response = await fetch("/api/super-admin/create-org", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ name, slug }),
      });

      const body = (await response.json()) as {
        message?: string;
        error?: string;
        org?: { id: string; name: string; slug: string };
      };

      if (!response.ok) {
        setCreateStatus(body.error ?? "Failed to create organization.");
        return;
      }

      setCreateStatus(body.message ?? "Organization created.");
      setCreateName("");
      setCreateSlug("");
      await refreshOrgs();
      if (body.org?.id) {
        setActiveOrgId(body.org.id);
        setInviteOrgId(body.org.id);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setCreateStatus("Failed to create organization: " + message);
    } finally {
      setCreateBusy(false);
    }
  }

  async function submitInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteStatus(null);

    if (!inviteOrgId) {
      setInviteStatus("Choose an organization first.");
      return;
    }
    if (!inviteEmail.trim()) {
      setInviteStatus("Enter an email address.");
      return;
    }

    setInviteBusy(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        setInviteStatus("Not authenticated. Please sign in again.");
        return;
      }

      const response = await fetch("/api/super-admin/invite-admin", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          orgId: inviteOrgId,
          email: inviteEmail.trim(),
          role: inviteRole,
        }),
      });

      const body = (await response.json()) as { message?: string; error?: string };
      if (!response.ok) {
        setInviteStatus(body.error ?? "Invite failed.");
        return;
      }

      setInviteStatus(body.message ?? "Invite sent.");
      setInviteEmail("");
      const next = { ...orgInviteStatuses };
      const current = next[inviteOrgId] ?? { orgId: inviteOrgId, ownerCount: 0, acceptedOwnerCount: 0 };
      current.ownerCount += 1;
      next[inviteOrgId] = current;
      setOrgInviteStatuses(next);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setInviteStatus("Invite failed: " + message);
    } finally {
      setInviteBusy(false);
    }
  }

  async function saveInviteTemplate(e: React.FormEvent) {
    e.preventDefault();
    setTemplateStatus(null);
    if (!inviteOrgId) {
      setTemplateStatus("Choose an organization first.");
      return;
    }

    setTemplateBusy(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        setTemplateStatus("Not authenticated. Please sign in again.");
        return;
      }

      const response = await fetch("/api/super-admin/invite-template", {
        method: "PUT",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          orgId: inviteOrgId,
          subject: templateSubject,
          body: templateBody,
          signature: templateSignature,
        }),
      });

      const body = (await response.json()) as { message?: string; error?: string };
      if (!response.ok) {
        setTemplateStatus(body.error ?? "Failed to save invite template.");
        return;
      }
      setTemplateStatus(body.message ?? "Invite template saved.");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setTemplateStatus("Failed to save invite template: " + message);
    } finally {
      setTemplateBusy(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen">
        <div className="mx-auto max-w-5xl p-6 sm:p-8">
          <p className="text-slate-600">Loading super admin dashboard…</p>
        </div>
      </main>
    );
  }

  if (!isSuperAdmin) return null;

  return (
    <MediaWorkspaceShell
      title="Super Admin"
      subtitle="Manage client schools and switch active organization context."
      actions={[
        {
          key: "albums",
          node: (
            <Link href="/albums" className={buttonClass("secondary")}>
              Back to albums
            </Link>
          ),
        },
        {
          key: "branding",
          node: (
            <Link href="/settings/branding" className={buttonClass("secondary")}>
              Appearance
            </Link>
          ),
        },
      ]}
      customSidebar={
        <div className="flex h-full flex-col">
          <div>
            <p className="text-sm font-semibold tracking-tight text-slate-900">Super Admin</p>
            <p className="mt-1 text-xs text-slate-500">Platform controls and client portals</p>
          </div>

          <nav className="mt-4 border-t border-slate-200 pt-3">
            <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Admin Nav</p>
            <a href="#client-portals" className="block rounded-md px-3 py-2.5 text-base font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-900">
              Client Portals
            </a>
            <a href="#school-ops" className="block rounded-md px-3 py-2.5 text-base font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-900">
              School Ops
            </a>
            <Link href="/super-admin/homepage" className="block rounded-md px-3 py-2.5 text-base font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-900">
              Homepage CMS
            </Link>
            <Link href="/collections/brand-guidelines" className="flex items-center gap-2 rounded-md px-3 py-2.5 text-base font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-900">
              <IconGuidelines className="h-4 w-4" />
              Open Active Brand Portal
            </Link>
            <Link href="/albums" className="flex items-center gap-2 rounded-md px-3 py-2.5 text-base font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-900">
              <IconAlbums className="h-4 w-4" />
              Open Active Workspace
            </Link>
            <Link href="/audit" className="flex items-center gap-2 rounded-md px-3 py-2.5 text-base font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-900">
              <IconAudit className="h-4 w-4" />
              Open Active Audit Log
            </Link>
          </nav>

          <section className="mt-4 border-t border-slate-200 pt-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Platform Snapshot</p>
            <p className="mt-1.5 text-sm text-slate-700">{orgs.length} organizations</p>
            <p className="text-xs text-slate-500">
              Current org: {activeOrg ? `${activeOrg.name} (${activeOrg.slug})` : activeOrgId ?? "none"}
            </p>
          </section>

          <section className="mt-auto border-t border-slate-200 pt-4">
            <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Support</p>
            <a href="#school-ops" className="block rounded-md px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100">
              Access Management
            </a>
            <a href="mailto:support@photovault.app" className="block rounded-md px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100">
              Help
            </a>
          </section>
        </div>
      }
    >
        <Card className="overflow-hidden">
          <div className="relative h-36 border-b border-slate-200 bg-gradient-to-r from-slate-900 to-slate-700 sm:h-44">
            <div className="absolute inset-0 bg-slate-900/25" />
            <div className="absolute inset-x-0 bottom-0 p-4 text-white sm:p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-100">Platform Control</p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">Super Admin Workspace</h2>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 px-4 py-3">
            <Badge>{orgs.length} organizations</Badge>
            <Badge>Active org: {activeOrgId ? "set" : "none"}</Badge>
            <Badge>Admin invites enabled</Badge>
          </div>
        </Card>

        <Card id="client-portals" className="mt-4 p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-slate-900">Client Brand Portals</h2>
          <p className="mt-1 text-sm text-slate-600">
            Default view is privacy-first: portal identity and counts only. Open workspace only when you need support/testing access.
          </p>

          {orgs.length === 0 ? (
            <p className="mt-4 text-sm text-slate-600">No organizations found.</p>
          ) : portalLoading ? (
            <p className="mt-4 text-sm text-slate-600">Loading client portal data…</p>
          ) : (
            <ul className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {orgs.map((org) => {
                const isActive = org.id === activeOrgId;
                const orgInviteStatus = orgInviteStatuses[org.id];
                const acceptedOwnerCount = orgInviteStatus?.acceptedOwnerCount ?? 0;
                const ownerCount = orgInviteStatus?.ownerCount ?? 0;
                const summary = orgPortalData[org.id];
                const brandColor = summary?.brand || "#0F172A";
                return (
                  <li
                    key={org.id}
                    className="overflow-hidden rounded-xl border border-slate-200 bg-white"
                  >
                    <div className="h-20" style={{ background: brandColor }} />

                    <div className="relative p-4">
                      <div className="-mt-10 mb-2 flex items-start justify-between">
                        <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-white shadow-sm">
                          {summary?.logoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={summary.logoUrl} alt={`${org.name} logo`} className="h-12 w-12 object-contain" />
                          ) : (
                            <span className="text-xs font-semibold text-slate-500">{org.name.slice(0, 2).toUpperCase()}</span>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 bg-white/95 text-slate-700 shadow-sm backdrop-blur transition hover:bg-white hover:text-slate-900"
                            title="Settings"
                            aria-label="Settings"
                            onClick={() => openOrgRoute(org.id, "/settings/branding")}
                          >
                            <IconSettings className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 bg-white/95 text-slate-700 shadow-sm backdrop-blur transition hover:bg-white hover:text-slate-900"
                            title="More actions"
                            aria-label="More actions"
                            onClick={() => setOpenActionsOrgId((prev) => (prev === org.id ? null : org.id))}
                          >
                            <IconMore className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {openActionsOrgId === org.id ? (
                        <div className="absolute right-4 top-14 z-10 w-44 rounded-lg border border-slate-200 bg-white p-1 shadow-md">
                          <button
                            type="button"
                            className="block w-full rounded-md px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
                            onClick={() => openOrgRoute(org.id, "/albums")}
                          >
                            Open workspace
                          </button>
                          <button
                            type="button"
                            className="block w-full rounded-md px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
                            onClick={() => openOrgRoute(org.id, "/audit")}
                          >
                            Open audit log
                          </button>
                          <button
                            type="button"
                            className="block w-full rounded-md px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
                            onClick={() => {
                              setActiveOrgId(org.id);
                              setOpenActionsOrgId(null);
                            }}
                          >
                            Set active org
                          </button>
                        </div>
                      ) : null}

                      <button
                        type="button"
                        className="w-full text-left"
                        onClick={() => openOrgRoute(org.id, "/collections/brand-guidelines")}
                      >
                        <p className="truncate text-2xl font-semibold tracking-tight text-slate-900">{org.name}</p>
                      </button>
                      <p className="mt-1 text-sm text-slate-600">{org.slug}</p>
                      <p className="mt-1 text-xs text-slate-500">{org.id}</p>
                    </div>

                    <div className="grid grid-cols-3 border-t border-slate-200 bg-slate-50 px-3 py-2 text-center text-xs text-slate-600">
                      <div>
                        <p className="font-semibold text-slate-900">{summary?.guidelinesCount ?? 1}</p>
                        <p>portal</p>
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{summary?.albumsCount ?? 0}</p>
                        <p>albums</p>
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{summary?.photosCount ?? 0}</p>
                        <p>photos</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 px-3 py-2">
                      {isActive && <Badge>Active</Badge>}
                      {acceptedOwnerCount > 0 ? <Badge>Admin accepted</Badge> : null}
                      {acceptedOwnerCount === 0 && ownerCount > 0 ? <Badge>Invite sent</Badge> : null}
                      {ownerCount === 0 ? <Badge>Needs invite</Badge> : null}
                      <Button size="sm" variant="secondary" onClick={() => openOrgRoute(org.id, "/collections/brand-guidelines")}>
                        <IconGuidelines className="mr-1 h-3.5 w-3.5" />
                        Open Brand Portal
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => openOrgRoute(org.id, "/albums")}>
                        <IconAlbums className="mr-1 h-3.5 w-3.5" />
                        Open workspace
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => openOrgRoute(org.id, "/audit")}>
                        <IconAudit className="mr-1 h-3.5 w-3.5" />
                        Open audit
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card id="school-ops" className="mt-4 p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-slate-900">School Operations</h2>
          <p className="mt-1 text-sm text-slate-600">
            Create schools and invite school admins from one place.
          </p>

          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <Card className="p-5 sm:p-6">
              <h3 className="text-lg font-semibold text-slate-900">Create School</h3>
              <p className="mt-1 text-sm text-slate-600">Create a new school organization and make it available immediately.</p>
              <p className="mt-1 text-xs text-slate-500">
                Next step: use <span className="font-medium">Invite School Admin</span> to send access. Planned update PV-023
                will personalize invite acceptance and workspace setup UX.
              </p>

              <form className="mt-4 space-y-4" onSubmit={submitCreateOrg}>
                <div>
                  <label className="block text-sm font-medium text-slate-800">School name</label>
                  <Input
                    className="mt-1.5"
                    type="text"
                    placeholder="Springfield Adult School"
                    value={createName}
                    onChange={(e) => {
                      setCreateName(e.target.value);
                      if (!createSlug) setCreateSlug(slugify(e.target.value));
                    }}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-800">Slug</label>
                  <Input
                    className="mt-1.5"
                    type="text"
                    placeholder="springfield-adult"
                    value={createSlug}
                    onChange={(e) => setCreateSlug(slugify(e.target.value))}
                    required
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Button type="submit" variant="primary" disabled={createBusy}>
                    {createBusy ? "Creating school…" : "Create school"}
                  </Button>
                  {createStatus && <p className="text-sm text-slate-700">{createStatus}</p>}
                </div>
              </form>
            </Card>

            <Card className="p-5 sm:p-6">
              <h3 className="text-lg font-semibold text-slate-900">Invite School Admin</h3>
              <p className="mt-1 text-sm text-slate-600">
                Send an invite and assign org role for the selected organization.
              </p>

              <form className="mt-4 space-y-4" onSubmit={submitInvite}>
                <div>
                  <label className="block text-sm font-medium text-slate-800">Organization</label>
                  <select
                    className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-900"
                    value={inviteOrgId}
                    onChange={(e) => setInviteOrgId(e.target.value)}
                    required
                    disabled={inviteableOrgs.length === 0}
                  >
                    <option value="">{inviteableOrgs.length === 0 ? "All schools already accepted" : "Select organization"}</option>
                    {inviteableOrgs.map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.name} ({org.slug})
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-slate-500">
                    Schools with an accepted admin are hidden from this list.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-800">User email</label>
                  <Input
                    className="mt-1.5"
                    type="email"
                    placeholder="user@school.edu"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-800">Role</label>
                  <select
                    className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-900"
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as MembershipRole)}
                  >
                    {MEMBERSHIP_ROLES.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <Button type="submit" variant="primary" disabled={inviteBusy || inviteableOrgs.length === 0}>
                    {inviteBusy ? "Sending invite…" : "Send invite"}
                  </Button>
                  {inviteStatus && <p className="text-sm text-slate-700">{inviteStatus}</p>}
                </div>
              </form>

              <form className="mt-6 space-y-4 border-t border-slate-200 pt-4" onSubmit={saveInviteTemplate}>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-900">Invite Message Template</p>
                  <p className="text-xs text-slate-500">
                    Placeholders: {"{{school_name}}"}, {"{{invitee_email}}"}, {"{{sender_name}}"}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-800">Subject</label>
                  <Input
                    className="mt-1.5"
                    type="text"
                    value={templateSubject}
                    onChange={(e) => setTemplateSubject(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-800">Body</label>
                  <textarea
                    className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-900"
                    rows={5}
                    value={templateBody}
                    onChange={(e) => setTemplateBody(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-800">Signature</label>
                  <Input
                    className="mt-1.5"
                    type="text"
                    value={templateSignature}
                    onChange={(e) => setTemplateSignature(e.target.value)}
                    required
                  />
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Preview</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {
                      renderInviteTemplate(
                        { subject: templateSubject, body: templateBody, signature: templateSignature },
                        {
                          schoolName: orgs.find((org) => org.id === inviteOrgId)?.name ?? "School",
                          inviteeEmail: inviteEmail || "user@school.edu",
                          senderName: "PhotoVault",
                        }
                      ).subject
                    }
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                    {
                      renderInviteTemplate(
                        { subject: templateSubject, body: templateBody, signature: templateSignature },
                        {
                          schoolName: orgs.find((org) => org.id === inviteOrgId)?.name ?? "School",
                          inviteeEmail: inviteEmail || "user@school.edu",
                          senderName: "PhotoVault",
                        }
                      ).body
                    }
                  </p>
                  <p className="mt-3 text-sm text-slate-800">
                    {
                      renderInviteTemplate(
                        { subject: templateSubject, body: templateBody, signature: templateSignature },
                        {
                          schoolName: orgs.find((org) => org.id === inviteOrgId)?.name ?? "School",
                          inviteeEmail: inviteEmail || "user@school.edu",
                          senderName: "PhotoVault",
                        }
                      ).signature
                    }
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button type="submit" variant="secondary" disabled={templateBusy || !inviteOrgId}>
                    {templateBusy ? "Saving template…" : "Save template"}
                  </Button>
                  {templateStatus && <p className="text-sm text-slate-700">{templateStatus}</p>}
                </div>
              </form>
            </Card>
          </div>
        </Card>
    </MediaWorkspaceShell>
  );
}
