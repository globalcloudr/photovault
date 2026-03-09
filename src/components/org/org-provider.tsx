"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const ACTIVE_ORG_STORAGE_KEY = "pv_active_org_id_v1";

type OrgOption = {
  id: string;
  name: string;
  slug: string;
};

type OrgContextValue = {
  orgs: OrgOption[];
  activeOrgId: string | null;
  setActiveOrgId: (orgId: string) => void;
  isSuperAdmin: boolean;
  loading: boolean;
  refreshOrgs: () => Promise<void>;
};

const OrgContext = createContext<OrgContextValue | null>(null);

function readStoredOrgId() {
  try {
    return window.localStorage.getItem(ACTIVE_ORG_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStoredOrgId(orgId: string) {
  try {
    window.localStorage.setItem(ACTIVE_ORG_STORAGE_KEY, orgId);
  } catch {
    // ignore localStorage errors
  }
}

export function OrgProvider({ children }: { children: React.ReactNode }) {
  const [orgs, setOrgs] = useState<OrgOption[]>([]);
  const [activeOrgId, setActiveOrgIdState] = useState<string | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadOrgContext = useCallback(async () => {
    setLoading(true);

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setOrgs([]);
      setActiveOrgIdState(null);
      setIsSuperAdmin(false);
      setLoading(false);
      return;
    }

    const userId = userData.user.id;
    const { data: profileData } = await supabase
      .from("profiles")
      .select("is_super_admin")
      .eq("user_id", userId)
      .single();

    const superAdmin = Boolean(profileData?.is_super_admin);
    setIsSuperAdmin(superAdmin);

    let nextOrgs: OrgOption[] = [];
    if (superAdmin) {
      const { data: orgData, error: orgError } = await supabase
        .from("organizations")
        .select("id,name,slug")
        .order("name", { ascending: true });

      if (orgError) {
        console.error("Failed to load organizations", orgError);
      } else {
        nextOrgs = (orgData ?? []) as OrgOption[];
      }
    } else {
      const { data: membershipData, error: membershipError } = await supabase
        .from("memberships")
        .select("org_id")
        .eq("user_id", userId);

      if (membershipError) {
        console.error("Failed to load memberships", membershipError);
      } else {
        const orgIds = Array.from(
          new Set((membershipData ?? []).map((m) => m.org_id).filter(Boolean))
        ) as string[];

        if (orgIds.length > 0) {
          const { data: orgData, error: orgError } = await supabase
            .from("organizations")
            .select("id,name,slug")
            .in("id", orgIds)
            .order("name", { ascending: true });

          if (orgError) {
            console.error("Failed to load organizations for memberships", orgError);
          } else {
            nextOrgs = (orgData ?? []) as OrgOption[];
          }
        }
      }
    }

    setOrgs(nextOrgs);

    const stored = readStoredOrgId();
    const hasStored = stored && nextOrgs.some((o) => o.id === stored);
    const fallback = nextOrgs[0]?.id ?? null;
    const resolved = hasStored ? stored! : fallback;
    setActiveOrgIdState(resolved);
    if (resolved) writeStoredOrgId(resolved);

    setLoading(false);
  }, []);

  useEffect(() => {
    void Promise.resolve().then(loadOrgContext);

    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      loadOrgContext();
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [loadOrgContext]);

  function setActiveOrgId(orgId: string) {
    setActiveOrgIdState(orgId);
    writeStoredOrgId(orgId);
  }

  return (
    <OrgContext.Provider
      value={{ orgs, activeOrgId, setActiveOrgId, isSuperAdmin, loading, refreshOrgs: loadOrgContext }}
    >
      {children}
    </OrgContext.Provider>
  );
}

export function useOrg() {
  const ctx = useContext(OrgContext);
  if (!ctx) throw new Error("useOrg must be used within OrgProvider");
  return ctx;
}
