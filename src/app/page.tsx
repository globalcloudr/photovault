"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { buttonClass } from "@/components/ui/button";
import { supabase } from "@/lib/supabaseClient";
import { useOrg } from "@/components/org/org-provider";
import { parseStorageRef } from "@/lib/theme";
import MarketingHomepage from "@/components/marketing/marketing-homepage";

type SetupStage = "auth" | "org" | "workspace" | "complete" | "unauthenticated" | "error";

export default function Home() {
  const router = useRouter();
  const { orgs, activeOrgId, setActiveOrgId, loading: orgLoading } = useOrg();
  const [hasInviteTokens] = useState(() => {
    if (typeof window === "undefined") return false;
    const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : "";
    if (!hash) return false;
    const params = new URLSearchParams(hash);
    return Boolean(params.get("access_token") && params.get("refresh_token"));
  });
  const [stage, setStage] = useState<SetupStage>("auth");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [orgName, setOrgName] = useState<string>("your school");
  const [orgLogoUrl, setOrgLogoUrl] = useState<string | null>(null);
  const [inviteMessageSubject, setInviteMessageSubject] = useState<string | null>(null);
  const [inviteMessageBody, setInviteMessageBody] = useState<string | null>(null);
  const [inviteMessageSignature, setInviteMessageSignature] = useState<string | null>(null);
  const [startedAt] = useState(() => Date.now());
  const [nowTs, setNowTs] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNowTs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : "";
    if (!hash) return;

    const params = new URLSearchParams(hash);
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    if (!accessToken || !refreshToken) return;

    void supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    window.history.replaceState({}, "", window.location.pathname + window.location.search);
  }, []);

  useEffect(() => {
    let mounted = true;

    async function runSetup() {
      setStage("auth");
      setErrorMessage(null);

      const { data: sessionData } = await supabase.auth.getSession();
      if (!mounted) return;

      if (!sessionData.session?.user) {
        setStage("unauthenticated");
        return;
      }

      if (!hasInviteTokens) {
        router.replace("/albums");
        return;
      }

      const userMeta = sessionData.session.user.user_metadata ?? {};
      setInviteMessageSubject(
        typeof userMeta.invite_message_subject === "string" ? userMeta.invite_message_subject : null
      );
      setInviteMessageBody(
        typeof userMeta.invite_message_body === "string" ? userMeta.invite_message_body : null
      );
      setInviteMessageSignature(
        typeof userMeta.invite_message_signature === "string" ? userMeta.invite_message_signature : null
      );

      if (orgLoading) return;

      setStage("org");
      const resolvedOrgId = activeOrgId || orgs[0]?.id || null;
      if (!resolvedOrgId) {
        setErrorMessage("No organization membership found for this account.");
        setStage("error");
        return;
      }

      if (!activeOrgId && orgs[0]?.id) {
        setActiveOrgId(orgs[0].id);
      }

      const activeOrg = orgs.find((org) => org.id === resolvedOrgId) ?? null;
      setOrgName(activeOrg?.name ?? "your school");

      const { data: themeData } = await supabase
        .from("org_theme_settings")
        .select("logo_url")
        .eq("org_id", resolvedOrgId)
        .single();

      if (!mounted) return;

      const rawLogoUrl = (themeData?.logo_url as string | null) ?? null;
      const storageRef = parseStorageRef(rawLogoUrl);

      if (storageRef) {
        const { data: signedData } = await supabase.storage
          .from(storageRef.bucket)
          .createSignedUrl(storageRef.path, 60 * 60 * 24);
        if (!mounted) return;
        setOrgLogoUrl(signedData?.signedUrl ?? null);
      } else {
        setOrgLogoUrl(rawLogoUrl);
      }

      setStage("workspace");
      await new Promise((resolve) => setTimeout(resolve, 900));
      if (!mounted) return;

      setStage("complete");
      await new Promise((resolve) => setTimeout(resolve, 450));
      if (!mounted) return;

      router.replace("/albums");
    }

    void runSetup();
    return () => {
      mounted = false;
    };
  }, [activeOrgId, hasInviteTokens, orgLoading, orgs, router, setActiveOrgId]);

  const elapsedSeconds = Math.floor((nowTs - startedAt) / 1000);
  const showFallback = stage !== "unauthenticated" && stage !== "error" && stage !== "complete" && elapsedSeconds >= 10;
  const showSetupMode = hasInviteTokens && stage !== "unauthenticated";

  const steps = useMemo(
    () => [
      { key: "auth", label: "Verifying invite and sign-in" },
      { key: "org", label: "Loading school profile and branding" },
      { key: "workspace", label: "Preparing your workspace" },
    ],
    []
  );

  function isStepDone(key: string) {
    if (stage === "complete") return true;
    const order = ["auth", "org", "workspace"];
    return order.indexOf(key) < order.indexOf(stage);
  }

  function isStepActive(key: string) {
    return key === stage;
  }

  if (showSetupMode) {
    return (
      <main className="min-h-screen bg-slate-100">
        <div className="mx-auto flex min-h-screen w-full max-w-5xl items-center justify-center p-5 sm:p-8">
          <div className="w-full overflow-hidden rounded-3xl bg-white shadow-sm">
            <div className="relative h-36 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 sm:h-44">
              <div className="absolute inset-x-0 bottom-0 flex items-end gap-3 p-4 sm:p-5">
                <div className="flex h-14 w-20 items-center justify-center overflow-hidden rounded-md bg-white/95">
                  {orgLogoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={orgLogoUrl} alt={`${orgName} logo`} className="h-10 w-16 object-contain" />
                  ) : (
                    <span className="text-xs font-semibold tracking-wide text-slate-700">PV</span>
                  )}
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-200">PhotoVault Setup</p>
                  <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                    Setting up {orgName}
                  </h1>
                </div>
              </div>
            </div>

            <div className="space-y-4 p-4 sm:p-6">
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-slate-900 transition-all"
                  style={{
                    width:
                      stage === "auth"
                        ? "33%"
                        : stage === "org"
                          ? "66%"
                          : stage === "workspace" || stage === "complete"
                            ? "100%"
                            : "0%",
                  }}
                />
              </div>

              <div className="space-y-2">
                {steps.map((step) => (
                  <div key={step.key} className="flex items-center gap-2 text-sm">
                    <span
                      className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold ${
                        isStepDone(step.key)
                          ? "bg-emerald-100 text-emerald-700"
                          : isStepActive(step.key)
                            ? "bg-slate-900 text-white"
                            : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {isStepDone(step.key) ? "✓" : isStepActive(step.key) ? "…" : "•"}
                    </span>
                    <span className={isStepActive(step.key) ? "font-medium text-slate-900" : "text-slate-600"}>{step.label}</span>
                  </div>
                ))}
              </div>

              {inviteMessageSubject || inviteMessageBody ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  {inviteMessageSubject ? (
                    <p className="text-sm font-semibold text-slate-900">{inviteMessageSubject}</p>
                  ) : null}
                  {inviteMessageBody ? (
                    <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{inviteMessageBody}</p>
                  ) : null}
                  {inviteMessageSignature ? (
                    <p className="mt-2 text-sm text-slate-800">{inviteMessageSignature}</p>
                  ) : null}
                </div>
              ) : null}

              {showFallback ? (
                <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  Still setting things up. This can take up to 20 seconds on first access. Please keep this tab open.
                </p>
              ) : null}

              {stage === "complete" ? <p className="text-sm text-slate-700">Setup complete. Redirecting you…</p> : null}

              {stage === "error" || errorMessage ? (
                <div className="space-y-2 rounded-lg bg-red-50 px-3 py-2">
                  <p className="text-sm text-red-700">{errorMessage ?? "Failed to set up workspace."}</p>
                  <div className="flex gap-2">
                    <Link href="/login" className={buttonClass("secondary", "sm")}>
                      Back to login
                    </Link>
                    <Link href="/albums" className={buttonClass("primary", "sm")}>
                      Try workspace
                    </Link>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </main>
    );
  }

  return <MarketingHomepage />;
}
