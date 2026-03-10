"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useOrg } from "@/components/org/org-provider";
import { OrgBrandLockup } from "@/components/layout/org-brand-lockup";
import { cn } from "@/lib/cn";
import { parseStorageRef } from "@/lib/theme";
import {
  IconAlbums,
  IconAppearance,
  IconAudit,
  IconBilling,
  IconFeedback,
  IconGuidelines,
  IconHelp,
  IconLogout,
  IconSuperAdmin,
  IconUsers,
} from "@/components/ui/icons";

type WorkspaceAction = {
  key: string;
  node: React.ReactNode;
};

type MediaWorkspaceShellProps = {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: WorkspaceAction[];
  utilityActions?: WorkspaceAction[];
  children: React.ReactNode;
  sidebarContent?: React.ReactNode;
  customSidebar?: React.ReactNode;
  hidePageHeader?: boolean;
  sidebarLogoOnly?: boolean;
};

function navClass(active: boolean) {
  return cn(
    "flex items-center gap-2 rounded-md px-3 py-2.5 text-base font-medium transition",
    active
      ? "bg-white text-slate-900 ring-1 ring-slate-200"
      : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
  );
}

export function MediaWorkspaceShell({
  title,
  subtitle,
  actions = [],
  utilityActions = [],
  children,
  sidebarContent,
  customSidebar,
  hidePageHeader = false,
  sidebarLogoOnly = true,
}: MediaWorkspaceShellProps) {
  const pathname = usePathname();
  const { activeOrgId, isSuperAdmin, orgs } = useOrg();
  const activeOrg = useMemo(() => orgs.find((o) => o.id === activeOrgId) ?? null, [orgs, activeOrgId]);
  const [orgLogoUrl, setOrgLogoUrl] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [userEmail, setUserEmail] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  const [userRole, setUserRole] = useState<string>("viewer");
  const menuRef = useRef<HTMLDivElement | null>(null);
  const displayedLogoUrl = activeOrgId ? orgLogoUrl : null;
  const initials = useMemo(() => {
    if (userName.trim()) {
      return userName
        .split(" ")
        .map((part) => part[0] ?? "")
        .join("")
        .slice(0, 2)
        .toUpperCase();
    }
    return (userEmail[0] ?? "U").toUpperCase();
  }, [userEmail, userName]);
  const displayName = userName.trim() || userEmail || "User";

  async function signOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await supabase.auth.signOut();
      window.location.assign("/login");
    } finally {
      setSigningOut(false);
    }
  }

  useEffect(() => {
    if (!activeOrgId) return;

    (async () => {
      const { data, error } = await supabase
        .from("org_theme_settings")
        .select("logo_url")
        .eq("org_id", activeOrgId)
        .single();

      if (error) {
        setOrgLogoUrl(null);
        return;
      }

      const rawLogoUrl = (data?.logo_url as string | null) ?? null;
      const storageRef = parseStorageRef(rawLogoUrl);

      if (!storageRef) {
        setOrgLogoUrl(rawLogoUrl);
        return;
      }

      const { data: signedData, error: signedError } = await supabase.storage
        .from(storageRef.bucket)
        .createSignedUrl(storageRef.path, 60 * 60 * 24);

      if (signedError) {
        setOrgLogoUrl(null);
        return;
      }

      setOrgLogoUrl(signedData?.signedUrl ?? null);
    })();
  }, [activeOrgId]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) return;
      setUserEmail(user.email ?? "");
      const fullName =
        (typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name) ||
        (typeof user.user_metadata?.name === "string" && user.user_metadata.name) ||
        "";
      setUserName(fullName);
    })();
  }, []);

  useEffect(() => {
    async function loadUserRole() {
      if (!activeOrgId) {
        setUserRole(isSuperAdmin ? "super admin" : "viewer");
        return;
      }

      if (isSuperAdmin) {
        setUserRole("super admin");
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id;
      if (!userId) {
        setUserRole("viewer");
        return;
      }

      const { data: membership } = await supabase
        .from("memberships")
        .select("role")
        .eq("org_id", activeOrgId)
        .eq("user_id", userId)
        .single();

      setUserRole((membership?.role as string) ?? "viewer");
    }

    void loadUserRole();
  }, [activeOrgId, isSuperAdmin]);

  useEffect(() => {
    if (!menuOpen) return;

    const onClickOutside = (event: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };

    document.addEventListener("mousedown", onClickOutside);
    window.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      window.removeEventListener("keydown", onEscape);
    };
  }, [menuOpen]);

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-14 max-w-[1600px] items-center justify-between gap-3 px-4 sm:px-6">
          <p className="text-sm font-semibold tracking-tight text-slate-800">PhotoVault</p>
          <div className="flex items-center gap-2 sm:gap-3">
            {utilityActions.length > 0 &&
              utilityActions.map((action) => <div key={action.key}>{action.node}</div>)}
            <a
              href="mailto:support@photovault.app"
              className="text-sm font-medium text-slate-500 transition hover:text-slate-800"
            >
              Support
            </a>
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-sm font-semibold text-slate-800 transition hover:bg-slate-200"
                onClick={() => setMenuOpen((prev) => !prev)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                aria-label="Open profile menu"
              >
                {initials}
              </button>

              {menuOpen ? (
                <div className="absolute right-0 top-12 z-50 w-72 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                  <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold text-slate-800">{displayName}</p>
                      {userName ? (
                        <p className="truncate text-xs text-slate-500">{userEmail}</p>
                      ) : null}
                    </div>
                    <p className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-500">
                      {userRole}
                    </p>
                  </div>

                  <div className="space-y-0.5 px-2 py-2">
                    <a
                      href="mailto:info@akkedisdigital.com"
                      className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
                    >
                      <IconHelp className="h-4 w-4" />
                      Help
                    </a>
                    <a
                      href="mailto:info@akkedisdigital.com?subject=PhotoVault%20Question%20%2F%20Feedback"
                      className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
                    >
                      <IconFeedback className="h-4 w-4" />
                      Questions / feedback
                    </a>
                    <button
                      type="button"
                      disabled
                      className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-slate-400"
                      title="Billing dashboard coming soon"
                    >
                      <IconBilling className="h-4 w-4" />
                      Billing
                    </button>
                    <Link
                      href="/settings/profile"
                      className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
                      onClick={() => setMenuOpen(false)}
                    >
                      <IconAppearance className="h-4 w-4" />
                      Settings (Profile)
                    </Link>
                    {isSuperAdmin ? (
                      <Link
                        href="/super-admin"
                        className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
                        onClick={() => setMenuOpen(false)}
                      >
                        <IconSuperAdmin className="h-4 w-4" />
                        Super Admin
                      </Link>
                    ) : null}
                  </div>

                  <div className="border-t border-slate-200 p-2">
                    <button
                      type="button"
                      disabled={signingOut}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                      onClick={() => {
                        setMenuOpen(false);
                        void signOut();
                      }}
                    >
                      <IconLogout className="h-4 w-4" />
                      {signingOut ? "Logging out…" : "Logout"}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1600px]">
        <div className="grid min-h-[calc(100vh-3.5rem)] gap-0 md:grid-cols-[280px_minmax(0,1fr)]">
          {customSidebar ? (
            <aside className="border-b border-slate-200 bg-slate-50 p-4 md:border-b-0 md:border-r">{customSidebar}</aside>
          ) : (
            <aside className="border-b border-slate-200 bg-slate-50 p-4 md:border-b-0 md:border-r">
              <section className="pb-4">
                <OrgBrandLockup
                  orgName={activeOrg?.name}
                  logoUrl={displayedLogoUrl}
                  showName={!sidebarLogoOnly}
                  className="items-start gap-2"
                  textClassName="text-lg font-semibold tracking-tight text-slate-900"
                  logoFrameClassName={sidebarLogoOnly ? "h-14 w-44" : "h-12 w-32"}
                  logoImageClassName={sidebarLogoOnly ? "h-10" : "h-9"}
                />
                <p className="mt-2 text-xs text-slate-500">{activeOrg?.slug ?? "No active org"}</p>
              </section>

              <nav className="mt-2 border-t border-slate-200 pt-3">
                <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Collections</p>
                <Link href="/albums" className={navClass(pathname.startsWith("/albums"))}>
                  <IconAlbums className="h-4 w-4" />
                  Albums
                </Link>
                <Link href="/settings/branding" className={navClass(pathname.startsWith("/settings/branding"))}>
                  <IconAppearance className="h-4 w-4" />
                  Appearance
                </Link>
                <Link href="/settings/users" className={navClass(pathname.startsWith("/settings/users"))}>
                  <IconUsers className="h-4 w-4" />
                  Staff
                </Link>
                <Link href="/collections/brand-guidelines" className={navClass(pathname.startsWith("/collections/brand-guidelines"))}>
                  <IconGuidelines className="h-4 w-4" />
                  Brand Portal
                </Link>
                <Link href="/audit" className={navClass(pathname.startsWith("/audit"))}>
                  <IconAudit className="h-4 w-4" />
                  Audit Log
                </Link>
                {isSuperAdmin && (
                  <Link href="/super-admin" className={navClass(pathname.startsWith("/super-admin"))}>
                    <IconSuperAdmin className="h-4 w-4" />
                    Super Admin
                  </Link>
                )}
              </nav>

              {sidebarContent ? (
                <section className="mt-4 border-t border-slate-200 pt-4">{sidebarContent}</section>
              ) : null}
            </aside>
          )}

          <section className="space-y-5 p-4 sm:p-6 md:overflow-y-auto md:p-8">
            {!hidePageHeader ? (
              <header>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h1 className="text-4xl font-semibold tracking-tight text-slate-900">{title}</h1>
                    {subtitle ? <p className="mt-1.5 text-sm text-slate-600">{subtitle}</p> : null}
                  </div>

                  {actions.length > 0 ? (
                    <div className="flex flex-wrap items-center gap-2">
                      {actions.map((action) => (
                        <div key={action.key}>{action.node}</div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </header>
            ) : null}

            {children}
          </section>
        </div>
      </div>
    </main>
  );
}
