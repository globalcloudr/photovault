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
import { BodyText, Eyebrow, FieldLabel, MetaText, SectionTitle } from "@/components/ui/typography";
import { supabase } from "@/lib/supabaseClient";
import { canEditOrgAppearance } from "@/lib/roles";
import {
  applyTheme,
  applyWorkspaceFontSize,
  fetchOrgThemeSettings,
  makeStorageRef,
  OrgThemeSettings,
  OrgThemeUpdate,
  parseStorageRef,
  persistWorkspaceFontSize,
  readStoredWorkspaceFontSize,
  updateOrgThemeSettings,
  WorkspaceFontSize,
} from "@/lib/theme";
import { logAuditEventClient } from "@/lib/audit-client";

type FormState = {
  background: string;
  foreground: string;
  surface: string;
  surface_muted: string;
  border: string;
  text_muted: string;
  brand: string;
  brand_contrast: string;
  album_shell: string;
  logo_url: string;
};

const DEFAULTS: FormState = {
  background: "#F8FAFC",
  foreground: "#0F172A",
  surface: "#FFFFFF",
  surface_muted: "#F1F5F9",
  border: "#CBD5E1",
  text_muted: "#64748B",
  brand: "#0F172A",
  brand_contrast: "#FFFFFF",
  album_shell: "rgba(15,23,42,0.95)",
  logo_url: "",
};

const LOGO_BUCKET = "originals";

function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function toFormState(theme: OrgThemeSettings): FormState {
  return {
    background: theme.background,
    foreground: theme.foreground,
    surface: theme.surface,
    surface_muted: theme.surface_muted,
    border: theme.border,
    text_muted: theme.text_muted,
    brand: theme.brand,
    brand_contrast: theme.brand_contrast,
    album_shell: theme.album_shell,
    logo_url: theme.logo_url ?? "",
  };
}

const WORKSPACE_FONT_SIZE_OPTIONS: Array<{ value: WorkspaceFontSize; label: string; description: string }> = [
  { value: "small", label: "Small", description: "Default workspace text size." },
  { value: "medium", label: "Medium", description: "A little easier on the eyes." },
  { value: "large", label: "Large", description: "Best for maximum readability." },
];

export default function BrandingSettingsPage() {
  const router = useRouter();
  const { activeOrgId, loading: orgLoading, isSuperAdmin, orgs } = useOrg();
  const activeOrg = orgs.find((o) => o.id === activeOrgId) ?? null;
  const noActiveOrg = !orgLoading && !activeOrgId;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(DEFAULTS);
  const [workspaceFontSize, setWorkspaceFontSize] = useState<WorkspaceFontSize>("small");
  const hasLogo = Boolean(form.logo_url);

  useEffect(() => {
    const storedSize = readStoredWorkspaceFontSize();
    setWorkspaceFontSize(storedSize);
    applyWorkspaceFontSize(storedSize);
  }, []);

  useEffect(() => {
    if (orgLoading) return;
    if (!activeOrgId) return;
    const orgId = activeOrgId;

    async function load() {
      setLoading(true);
      setStatus(null);

      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id;
      if (!userId) {
        router.replace("/login");
        return;
      }

      let canEdit = isSuperAdmin;
      if (!canEdit) {
        const { data: memberData, error: memberError } = await supabase
          .from("memberships")
          .select("role")
          .eq("org_id", orgId)
          .eq("user_id", userId)
          .single();

        if (!memberError && canEditOrgAppearance(memberData?.role)) {
          canEdit = true;
        }
      }

      if (!canEdit) {
        setAllowed(false);
        setLoading(false);
        setStatus("You must be an org owner or super admin to edit appearance.");
        return;
      }

      try {
        const theme = await fetchOrgThemeSettings(orgId);
        setForm(toFormState(theme));
        applyTheme(theme);
        setAllowed(true);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setStatus("Failed to load appearance settings: " + message);
        setAllowed(false);
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [activeOrgId, isSuperAdmin, orgLoading, router]);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!activeOrgId || !allowed) return;

    setSaving(true);
    setStatus(null);
    try {
      const patch: OrgThemeUpdate = {
        background: form.background,
        foreground: form.foreground,
        surface: form.surface,
        surface_muted: form.surface_muted,
        border: form.border,
        text_muted: form.text_muted,
        brand: form.brand,
        brand_contrast: form.brand_contrast,
        album_shell: form.album_shell,
        logo_url: form.logo_url || null,
      };

      const updated = await updateOrgThemeSettings(activeOrgId, patch);
      applyTheme(updated);
      setStatus("Appearance saved.");
      void logAuditEventClient({
        orgId: activeOrgId,
        eventType: "appearance_updated",
        entityType: "org_theme_settings",
        entityId: activeOrgId,
        metadata: {
          hasLogo: Boolean(patch.logo_url),
          workspaceFontSize,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatus("Failed to save appearance settings: " + message);
    } finally {
      setSaving(false);
    }
  }

  function onReset() {
    setForm(DEFAULTS);
    applyTheme({
      background: DEFAULTS.background,
      foreground: DEFAULTS.foreground,
      surface: DEFAULTS.surface,
      surface_muted: DEFAULTS.surface_muted,
      border: DEFAULTS.border,
      text_muted: DEFAULTS.text_muted,
      brand: DEFAULTS.brand,
      brand_contrast: DEFAULTS.brand_contrast,
      album_shell: DEFAULTS.album_shell,
    });
  }

  async function uploadLogoFile(files: FileList | null) {
    if (!files || files.length === 0 || !activeOrgId || !allowed) return;
    const file = files[0];

    setUploadingLogo(true);
    setStatus(null);
    try {
      const newPath = `${activeOrgId}/appearance/logo/${Date.now()}-${sanitizeFilename(file.name)}`;
      const { error: uploadError } = await supabase.storage.from(LOGO_BUCKET).upload(newPath, file, {
        upsert: false,
        contentType: file.type || undefined,
      });
      if (uploadError) throw uploadError;

      const existingRef = parseStorageRef(form.logo_url);
      if (existingRef && existingRef.bucket === LOGO_BUCKET && existingRef.path !== newPath) {
        await supabase.storage.from(LOGO_BUCKET).remove([existingRef.path]);
      }

      updateField("logo_url", makeStorageRef(LOGO_BUCKET, newPath));
      setStatus("Logo uploaded. Save appearance to keep it.");
      void logAuditEventClient({
        orgId: activeOrgId,
        eventType: "appearance_logo_uploaded",
        entityType: "file",
        entityId: newPath,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatus("Logo upload failed: " + message);
    } finally {
      setUploadingLogo(false);
    }
  }

  return (
    <MediaWorkspaceShell
      title="Appearance Settings"
      subtitle={`Customize colors and identity for ${activeOrg?.name ?? "the active organization"}.`}
      sidebarLogoOnly
      orgLogoUrlOverride={form.logo_url || null}
      actions={[
        {
          key: "albums",
          node: (
            <Link href="/albums" className={buttonClass("secondary")}>
              Back to albums
            </Link>
          ),
        },
      ]}
      sidebarContent={
        <div className="space-y-3">
          <div>
            <Eyebrow>Live Preview</Eyebrow>
            <div className="mt-1.5 rounded-md border border-slate-200 bg-white p-2">
              <div className="h-8 rounded" style={{ background: form.brand }} />
              <MetaText className="mt-2">Brand: {form.brand}</MetaText>
              <div className="mt-1 h-8 rounded border" style={{ background: form.background }} />
              <MetaText className="mt-2">Background: {form.background}</MetaText>
            </div>
          </div>
          <div>
            <Eyebrow>Organization</Eyebrow>
            <BodyText muted className="mt-1.5">{activeOrg?.name ?? "No active org"}</BodyText>
            <MetaText>{activeOrg?.slug ?? ""}</MetaText>
          </div>
        </div>
      }
    >
        <Card className="overflow-hidden">
          <div className="relative h-36 border-b border-slate-200 bg-gradient-to-r from-slate-900 to-slate-700 sm:h-44">
            <div className="absolute inset-0 bg-slate-900/30" />
            <div className="absolute inset-x-0 bottom-0 p-4 text-white sm:p-5">
              <Eyebrow className="text-slate-100">School Appearance</Eyebrow>
              <SectionTitle as="h2" className="mt-1 text-white">{activeOrg?.name ?? "Organization Appearance"}</SectionTitle>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 px-4 py-3">
            <Badge>Theme tokens</Badge>
            <Badge>{hasLogo ? "Logo set" : "No logo yet"}</Badge>
            <Badge>Built-in fonts</Badge>
            <Badge>Workspace text: {workspaceFontSize}</Badge>
          </div>
        </Card>

        {loading ? (
          <BodyText muted>Loading appearance settings…</BodyText>
        ) : noActiveOrg ? (
          <Card className="p-5">
            <BodyText>No active organization selected.</BodyText>
          </Card>
        ) : !allowed ? (
          <Card className="p-5">
            <BodyText>{status ?? "You do not have access to appearance settings."}</BodyText>
          </Card>
        ) : (
          <Card className="p-5 sm:p-6">
            <form onSubmit={onSave} className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <ColorField label="Background" value={form.background} onChange={(v) => updateField("background", v)} />
                <ColorField label="Foreground" value={form.foreground} onChange={(v) => updateField("foreground", v)} />
                <ColorField label="Surface" value={form.surface} onChange={(v) => updateField("surface", v)} />
                <ColorField
                  label="Surface Muted"
                  value={form.surface_muted}
                  onChange={(v) => updateField("surface_muted", v)}
                />
                <ColorField label="Border" value={form.border} onChange={(v) => updateField("border", v)} />
                <ColorField label="Text Muted" value={form.text_muted} onChange={(v) => updateField("text_muted", v)} />
                <ColorField label="Brand" value={form.brand} onChange={(v) => updateField("brand", v)} />
                <ColorField
                  label="Brand Contrast"
                  value={form.brand_contrast}
                  onChange={(v) => updateField("brand_contrast", v)}
                />
              </div>

              <div>
                <FieldLabel>Album Shell (rgba or hex)</FieldLabel>
                <Input
                  className="mt-1.5"
                  value={form.album_shell}
                  onChange={(e) => updateField("album_shell", e.target.value)}
                  placeholder="rgba(15,23,42,0.95)"
                />
              </div>

              <div className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
                <div className="space-y-1">
                  <FieldLabel>Workspace Text Size</FieldLabel>
                  <MetaText>
                    Adjust text size in your workspace. This preference is saved in this browser for your account.
                  </MetaText>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  {WORKSPACE_FONT_SIZE_OPTIONS.map((option) => {
                    const selected = workspaceFontSize === option.value;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        className={`rounded-xl border p-3 text-left transition ${
                          selected
                            ? "border-[var(--foreground)] bg-[var(--surface)] shadow-sm"
                            : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--foreground)]"
                        }`}
                        onClick={() => {
                          setWorkspaceFontSize(option.value);
                          persistWorkspaceFontSize(option.value);
                          setStatus("Workspace text size updated for this browser.");
                        }}
                        aria-pressed={selected}
                      >
                        <p className="font-outfit text-[length:var(--workspace-label-size)] font-semibold text-[var(--foreground)]">
                          {option.label}
                          {option.value === "small" ? " (Default)" : ""}
                        </p>
                        <MetaText className="mt-1">{option.description}</MetaText>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <FieldLabel>School Logo (optional)</FieldLabel>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <label className={`${buttonClass("secondary", "sm")} cursor-pointer`}>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploadingLogo}
                        onChange={(e) => uploadLogoFile(e.target.files)}
                      />
                      {uploadingLogo ? "Uploading…" : "Upload logo"}
                    </label>
                    {form.logo_url ? (
                      <Button size="sm" variant="ghost" type="button" onClick={() => updateField("logo_url", "")}>
                        Remove logo
                      </Button>
                    ) : null}
                  </div>
                  <Input
                    className="mt-2"
                    value={form.logo_url}
                    onChange={(e) => updateField("logo_url", e.target.value)}
                    placeholder="https://... (optional if uploading file)"
                  />
                  <MetaText className="mt-1">
                    Upload a logo file or paste a URL. Uploaded files are stored in your organization space.
                  </MetaText>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Button type="submit" variant="primary" disabled={saving}>
                  {saving ? "Saving…" : "Save appearance"}
                </Button>
                <Button type="button" variant="secondary" onClick={onReset} disabled={saving}>
                  Reset preview
                </Button>
                {status && <BodyText>{status}</BodyText>}
              </div>
            </form>
          </Card>
        )}
    </MediaWorkspaceShell>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const colorValue = /^#[0-9a-fA-F]{6}$/.test(value) ? value : "#000000";

  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div className="mt-1.5 flex items-center gap-2">
        <input
          type="color"
          className="h-10 w-12 cursor-pointer rounded border border-slate-300 bg-white p-1"
          value={colorValue}
          onChange={(e) => onChange(e.target.value)}
        />
        <Input value={value} onChange={(e) => onChange(e.target.value)} />
      </div>
    </div>
  );
}
