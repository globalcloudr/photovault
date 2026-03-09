"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Button, buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useOrg } from "@/components/org/org-provider";

type Dept = { id: string; code: string; name: string };
type RightsStatus = "unknown" | "ok_for_marketing" | "internal_only" | "do_not_use";

export default function NewAlbumPage() {
  const router = useRouter();
  const { activeOrgId, loading: orgLoading } = useOrg();

  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventDateInputType, setEventDateInputType] = useState<"text" | "date">("text");
  const [rightsStatus, setRightsStatus] = useState<RightsStatus>("unknown");

  const [departments, setDepartments] = useState<Dept[]>([]);
  const [departmentId, setDepartmentId] = useState<string>("");

  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (orgLoading || !activeOrgId) return;

    (async () => {
      // load departments (optional). If none, we’ll still allow create after we fix schema below.
      const { data, error } = await supabase
        .from("org_departments")
        .select("id,code,name")
        .eq("org_id", activeOrgId)
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (!error && data) {
        setDepartments(data as Dept[]);
        if (data.length > 0) setDepartmentId(data[0].id);
      }
    })();
  }, [activeOrgId, orgLoading]);

  async function createAlbum(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setStatus(null);

    if (!activeOrgId) {
      setBusy(false);
      setStatus("No active organization selected.");
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      setBusy(false);
      setStatus("Not logged in. Please sign in again.");
      return;
    }

    const createdBy = sessionData.session.user.id;

    const payload: {
      org_id: string;
      event_name: string;
      event_date: string;
      rights_status: RightsStatus;
      created_by: string;
      department_id?: string;
    } = {
      org_id: activeOrgId,
      event_name: eventName,
      event_date: eventDate,
      rights_status: rightsStatus,
      created_by: createdBy,
    };

    // only include department_id if we have one selected
    if (departmentId) payload.department_id = departmentId;

    const { error } = await supabase.from("albums").insert(payload);

    setBusy(false);

    if (error) {
      setStatus("Error: " + error.message);
      return;
    }

    router.push("/albums");
  }

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-3xl p-6 sm:p-8">
        <PageHeader
          eyebrow="PhotoVault"
          title="Create New Album"
          subtitle="Set event details now, then upload and organize photos."
          actions={[
            {
              key: "back",
              node: (
                <Link href="/albums" className={buttonClass("secondary", "sm")}>
                  Back
                </Link>
              ),
            },
          ]}
        />

        <Card className="mt-6 p-5 sm:p-6">
          <form onSubmit={createAlbum}>
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-800">Event name</label>
              <Input
                className="mt-1.5"
                placeholder="e.g., Spring Graduation"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-800">Event date</label>
              <Input
                className="mt-1.5"
                type={eventDateInputType}
                placeholder="Event Date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                onFocus={() => setEventDateInputType("date")}
                onBlur={() => {
                  if (!eventDate) setEventDateInputType("text");
                }}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-800">Rights status</label>
              <select
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-900"
                value={rightsStatus}
                onChange={(e) => setRightsStatus(e.target.value as RightsStatus)}
              >
                <option value="unknown">Unknown</option>
                <option value="ok_for_marketing">OK for marketing</option>
                <option value="internal_only">Internal only</option>
                <option value="do_not_use">Do not use</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-800">Department (optional)</label>
              <select
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-900"
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
              >
                {departments.length === 0 ? (
                  <option value="">No departments yet</option>
                ) : (
                  departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.code} — {d.name}
                    </option>
                  ))
                )}
              </select>
              <p className="mt-1.5 text-xs text-slate-500">Department can be changed later as needed.</p>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-2 border-t border-slate-200 pt-4">
            <Link href="/albums" className={buttonClass("secondary")}>
              Cancel
            </Link>
            <Button variant="primary" type="submit" disabled={busy}>
              {busy ? "Creating…" : "Create album"}
            </Button>
          </div>

          {status && <p className="mt-4 text-sm text-red-700">{status}</p>}
          </form>
        </Card>
      </div>
    </main>
  );
}
