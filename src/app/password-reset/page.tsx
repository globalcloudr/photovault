"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<string | null>("Checking link…");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // When the user clicks the email link, Supabase puts tokens in the URL hash.
    // supabase-js can detect it and set a session (detectSessionInUrl must be true in supabaseClient).
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        setStatus("Error: " + error.message);
        return;
      }

      // For recovery links, Supabase should set a session here.
      if (!data.session) {
        setStatus("This reset link is missing or expired. Please request a new one.");
        return;
      }

      setStatus(null);
      setReady(true);
    });
  }, []);

  async function updatePassword(e: React.FormEvent) {
    e.preventDefault();

    if (newPassword.length < 6) {
      setStatus("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirm) {
      setStatus("Passwords do not match.");
      return;
    }

    setStatus("Updating password…");

    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      setStatus("Error: " + error.message);
      return;
    }

    setStatus("✅ Password updated. Redirecting…");
    setTimeout(() => router.replace("/login"), 800);
  }

  return (
    <main className="mx-auto max-w-md p-8">
      <h1 className="text-2xl font-semibold">Reset password</h1>

      {status && <p className="mt-4 text-sm text-gray-700">{status}</p>}

      {ready && (
        <form onSubmit={updatePassword} className="mt-6 space-y-3">
          <input
            className="w-full rounded border px-3 py-2"
            type="password"
            placeholder="New password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
          <input
            className="w-full rounded border px-3 py-2"
            type="password"
            placeholder="Confirm new password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
          <button className="w-full rounded bg-black px-4 py-2 text-white">
            Set new password
          </button>
        </form>
      )}
    </main>
  );
}