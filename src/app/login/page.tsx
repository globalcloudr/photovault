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
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">PhotoVault Login</h1>
        <p className="mt-2 text-slate-600">Sign in to your school PhotoVault.</p>
        <p className="mt-3 text-sm text-slate-500">
          <Link href="/" className="font-medium text-slate-700 underline-offset-4 hover:text-slate-900 hover:underline">
            Back to homepage
          </Link>
        </p>

        <form onSubmit={signIn} className="mt-6 space-y-3">
          <input
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            type="email"
            placeholder="you@school.org"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button
            className="w-full cursor-pointer rounded-md border border-slate-900 bg-slate-900 px-4 py-2 text-white transition hover:border-slate-700 hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={busy}
          >
            {busy ? "Working..." : "Sign in"}
          </button>

          <button
            type="button"
            className="w-full cursor-pointer rounded-md border border-slate-300 bg-white px-4 py-2 text-slate-800 transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={sendReset}
            disabled={busy}
          >
            Forgot password
          </button>

          {status && <p className="text-sm text-slate-700">{status}</p>}
        </form>
      </div>
    </main>
  );
}
