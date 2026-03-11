"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace("/albums");
    });
  }, [router]);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setStatus(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setBusy(false);

    if (error) {
      setStatus("Error: " + error.message);
      return;
    }

    router.replace("/albums");
  }

  async function sendReset() {
    if (!email) {
      setStatus("Enter your email first, then click Forgot password.");
      return;
    }

    setBusy(true);
    setStatus(null);

    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/reset-password`
        : undefined;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    setBusy(false);

    if (error) setStatus("Error: " + error.message);
    else setStatus("Check your email for the reset link.");
  }

  return (
    <main className="min-h-[100svh] bg-slate-100 lg:h-[100dvh] lg:overflow-hidden">
      <div className="grid min-h-[100svh] lg:h-[100dvh] lg:grid-cols-[1.02fr_0.98fr]">
        <section className="relative overflow-hidden bg-[linear-gradient(180deg,#eef2ff_0%,#e6f0f0_100%)] px-6 py-10 lg:px-14 lg:py-10">
          <div className="absolute inset-x-0 bottom-0 h-56 bg-[radial-gradient(circle_at_bottom,#c7d2fe_0%,transparent_60%)] opacity-60" />
          <div className="absolute inset-x-0 bottom-0 h-36 bg-[radial-gradient(circle_at_bottom,#d1fae5_0%,transparent_55%)] opacity-60" />
          <div className="relative mx-auto flex h-full max-w-2xl flex-col justify-between gap-8">
            <div>
              <Link href="/" className="inline-flex items-center gap-3 text-slate-900">
                <span className="text-3xl font-semibold tracking-tight">PhotoVault</span>
              </Link>
            </div>

            <div className="space-y-6">
              <div className="space-y-3">
                <p className="text-sm font-semibold uppercase tracking-[0.28em] text-emerald-600">
                  Built for adult schools
                </p>
                <h2 className="max-w-xl text-4xl font-medium tracking-tight text-slate-950 sm:text-[3.2rem] sm:leading-[1.04]">
                  Log in to the system built for approved school photos and brand assets.
                </h2>
                <p className="max-w-xl text-lg leading-7 text-slate-600">
                  Organize campaign-ready media, keep branding consistent, and share approved assets without
                  relying on scattered folders and email threads.
                </p>
              </div>

              <div className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur">
                <ul className="space-y-4 text-slate-700">
                  {[
                    "Create event albums and keep approved photos organized by program, campus, or campaign.",
                    "Share media with expiring links, password protection, and download controls.",
                    "Give staff one trusted Brand Portal for logos, templates, and appearance standards.",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-4">
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-600">
                        ✓
                      </span>
                      <span className="text-base leading-7">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-2xl font-semibold tracking-tight text-slate-950">Trusted by adult education teams</p>
                <p className="mt-2 text-base text-slate-600">
                  Built for marketing, communications, enrollment, and district reporting workflows.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {[
                  "San Mateo Adult & Career Education",
                  "Berkeley Adult School",
                  "San Jose Dance Theatre",
                  "Ventura County Adult Education",
                  "Mountain View Adult School",
                  "Santa Clara Adult Education",
                ].map((name) => (
                  <div
                    key={name}
                    className="rounded-2xl border border-white/70 bg-white/75 px-4 py-4 text-sm font-medium text-slate-700 shadow-[0_12px_28px_rgba(15,23,42,0.05)] backdrop-blur"
                  >
                    {name}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="flex min-h-[100svh] items-center justify-center bg-white px-6 py-10 lg:h-full lg:min-h-0 lg:px-14 lg:py-10">
          <div className="w-full max-w-xl">
            <div className="mx-auto w-full max-w-md">
              <h1 className="text-5xl font-semibold tracking-tight text-slate-950">Log in</h1>
              <p className="mt-4 text-lg leading-8 text-slate-600">Sign in to your school PhotoVault.</p>
              <p className="mt-4 text-sm text-slate-500">
                <Link
                  href="/"
                  className="font-medium text-slate-700 underline-offset-4 hover:text-slate-950 hover:underline"
                >
                  Back to homepage
                </Link>
              </p>

              <form onSubmit={signIn} className="mt-8 space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700" htmlFor="email">
                    Email address
                  </label>
                  <input
                    id="email"
                    className="w-full rounded-2xl border border-slate-300 bg-white px-5 py-3.5 text-lg text-slate-900 outline-none transition focus:border-slate-500 focus:ring-4 focus:ring-slate-200"
                    type="email"
                    placeholder="you@school.org"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-4">
                    <label className="text-sm font-medium text-slate-700" htmlFor="password">
                      Password
                    </label>
                    <button
                      type="button"
                      className="text-sm font-medium text-slate-700 underline-offset-4 hover:text-slate-950 hover:underline disabled:cursor-not-allowed disabled:opacity-60"
                      onClick={sendReset}
                      disabled={busy}
                    >
                      Forgot password?
                    </button>
                  </div>
                  <input
                    id="password"
                    className="w-full rounded-2xl border border-slate-300 bg-white px-5 py-3.5 text-lg text-slate-900 outline-none transition focus:border-slate-500 focus:ring-4 focus:ring-slate-200"
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                <button
                  className="w-full cursor-pointer rounded-full border border-slate-950 bg-slate-950 px-6 py-3.5 text-lg font-medium text-white transition hover:border-slate-800 hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={busy}
                >
                  {busy ? "Working..." : "Log in"}
                </button>

                {status && <p className="text-sm text-slate-700">{status}</p>}
              </form>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
