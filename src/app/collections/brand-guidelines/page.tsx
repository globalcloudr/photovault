"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MediaWorkspaceShell } from "@/components/layout/media-workspace-shell";
import { Card } from "@/components/ui/card";
import { buttonClass } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useOrg } from "@/components/org/org-provider";
import { supabase } from "@/lib/supabaseClient";
import { canEditOrgAppearance } from "@/lib/roles";
import { logAuditEventClient } from "@/lib/audit-client";
import { formatDateMDY } from "@/lib/date-format";

type GuidelineAsset = {
  name: string;
  path: string;
  updatedAt: string | null;
  sizeBytes: number | null;
  signedUrl: string | null;
};

type GuidelineConfig = {
  heroImagePath: string;
  colorsNotes: string;
  color1: string;
  color2: string;
  color3: string;
  color4: string;
  color5: string;
  colorNotes1: string;
  colorNotes2: string;
  colorNotes3: string;
  colorNotes4: string;
  colorNotes5: string;
  typographyNotes: string;
  iconographyNotes: string;
  templatesNotes: string;
  doNotes: string;
  dontNotes: string;
};

const BUCKET = "originals";
const DEFAULT_CONFIG: GuidelineConfig = {
  heroImagePath: "",
  colorsNotes: "Document approved primary, secondary, and accent colors for school use.",
  color1: "#1ce783",
  color2: "#0f172a",
  color3: "#334155",
  color4: "#94a3b8",
  color5: "#e2e8f0",
  colorNotes1: "Hulu Green\nPMS: 7479\nRGB: 28 231 131\nCMYK: 76 0 70 0\nHEX: #1ce783",
  colorNotes2: "Color 2\nPMS:\nRGB:\nCMYK:\nHEX:",
  colorNotes3: "Color 3\nPMS:\nRGB:\nCMYK:\nHEX:",
  colorNotes4: "Color 4\nPMS:\nRGB:\nCMYK:\nHEX:",
  colorNotes5: "Color 5\nPMS:\nRGB:\nCMYK:\nHEX:",
  typographyNotes: "List approved heading/body fonts and usage rules.",
  iconographyNotes: "Store approved icon packs and guidance for usage style.",
  templatesNotes: "Store social templates, print-ready files, and reference docs.",
  doNotes: "Use approved logo files, proper spacing, and official colors.",
  dontNotes: "Stretch logos, alter colors, or use outdated assets.",
};

function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function formatSize(bytes: number | null) {
  if (!bytes) return "Unknown size";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function BrandGuidelinesPage() {
  const { activeOrgId, loading: orgLoading, isSuperAdmin } = useOrg();
  const [logos, setLogos] = useState<GuidelineAsset[]>([]);
  const [documents, setDocuments] = useState<GuidelineAsset[]>([]);
  const [icons, setIcons] = useState<GuidelineAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState<"hero" | "logo" | "document" | "icon" | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [config, setConfig] = useState<GuidelineConfig>(DEFAULT_CONFIG);
  const [savingConfig, setSavingConfig] = useState(false);
  const [heroImageUrl, setHeroImageUrl] = useState<string | null>(null);

  const noActiveOrg = !orgLoading && !activeOrgId;

  const logoPrefix = useMemo(() => (activeOrgId ? `${activeOrgId}/brand-guidelines/logos` : ""), [activeOrgId]);
  const docsPrefix = useMemo(() => (activeOrgId ? `${activeOrgId}/brand-guidelines/documents` : ""), [activeOrgId]);
  const iconsPrefix = useMemo(() => (activeOrgId ? `${activeOrgId}/brand-guidelines/icons` : ""), [activeOrgId]);
  const configPath = useMemo(() => (activeOrgId ? `${activeOrgId}/brand-guidelines/config.json` : ""), [activeOrgId]);
  const featuredGuide = useMemo(
    () => documents.find((d) => /guide|brand/i.test(d.name)) ?? documents[0] ?? null,
    [documents]
  );
  const guidelineSections = [
    { id: "logos", label: "Logos" },
    { id: "colors", label: "Colors" },
    { id: "typography", label: "Typography" },
    { id: "iconography", label: "Iconography" },
    { id: "templates-social", label: "Templates / Social" },
    { id: "do-dont-examples", label: "Do/Don't examples" },
  ] as const;

  const loadAssets = useCallback(async () => {
    if (!activeOrgId) return;

    setLoading(true);
    setStatus(null);
    try {
      const [logoList, docList, iconList] = await Promise.all([
        supabase.storage.from(BUCKET).list(logoPrefix, { limit: 100, sortBy: { column: "name", order: "asc" } }),
        supabase.storage.from(BUCKET).list(docsPrefix, { limit: 100, sortBy: { column: "name", order: "asc" } }),
        supabase.storage.from(BUCKET).list(iconsPrefix, { limit: 200, sortBy: { column: "name", order: "asc" } }),
      ]);

      if (logoList.error) throw logoList.error;
      if (docList.error) throw docList.error;
      if (iconList.error) throw iconList.error;

      const toAssets = async (prefix: string, items: { name: string; updated_at?: string; metadata?: { size?: number } }[]) => {
        const mapped = await Promise.all(
          items.map(async (item) => {
            const path = `${prefix}/${item.name}`;
            const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60 * 24);
            return {
              name: item.name,
              path,
              updatedAt: item.updated_at ?? null,
              sizeBytes: item.metadata?.size ?? null,
              signedUrl: data?.signedUrl ?? null,
            } satisfies GuidelineAsset;
          })
        );
        return mapped;
      };

      setLogos(await toAssets(logoPrefix, logoList.data ?? []));
      setDocuments(await toAssets(docsPrefix, docList.data ?? []));
      setIcons(await toAssets(iconsPrefix, iconList.data ?? []));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatus(`Failed to load Brand Portal files: ${message}`);
    } finally {
      setLoading(false);
    }
  }, [activeOrgId, docsPrefix, iconsPrefix, logoPrefix]);

  const loadConfig = useCallback(async () => {
    if (!activeOrgId || !configPath) return;
    try {
      const { data, error } = await supabase.storage.from(BUCKET).download(configPath);
      if (error) {
        setConfig(DEFAULT_CONFIG);
        return;
      }
      const text = await data.text();
      const parsed = JSON.parse(text) as Partial<GuidelineConfig>;
      setConfig({
        heroImagePath: parsed.heroImagePath ?? DEFAULT_CONFIG.heroImagePath,
        colorsNotes: parsed.colorsNotes ?? DEFAULT_CONFIG.colorsNotes,
        color1: parsed.color1 ?? DEFAULT_CONFIG.color1,
        color2: parsed.color2 ?? DEFAULT_CONFIG.color2,
        color3: parsed.color3 ?? DEFAULT_CONFIG.color3,
        color4: parsed.color4 ?? DEFAULT_CONFIG.color4,
        color5: parsed.color5 ?? DEFAULT_CONFIG.color5,
        colorNotes1: parsed.colorNotes1 ?? DEFAULT_CONFIG.colorNotes1,
        colorNotes2: parsed.colorNotes2 ?? DEFAULT_CONFIG.colorNotes2,
        colorNotes3: parsed.colorNotes3 ?? DEFAULT_CONFIG.colorNotes3,
        colorNotes4: parsed.colorNotes4 ?? DEFAULT_CONFIG.colorNotes4,
        colorNotes5: parsed.colorNotes5 ?? DEFAULT_CONFIG.colorNotes5,
        typographyNotes: parsed.typographyNotes ?? DEFAULT_CONFIG.typographyNotes,
        iconographyNotes: parsed.iconographyNotes ?? DEFAULT_CONFIG.iconographyNotes,
        templatesNotes: parsed.templatesNotes ?? DEFAULT_CONFIG.templatesNotes,
        doNotes: parsed.doNotes ?? DEFAULT_CONFIG.doNotes,
        dontNotes: parsed.dontNotes ?? DEFAULT_CONFIG.dontNotes,
      });
    } catch {
      setConfig(DEFAULT_CONFIG);
    }
  }, [activeOrgId, configPath]);

  useEffect(() => {
    if (!config.heroImagePath) {
      setHeroImageUrl(null);
      return;
    }

    (async () => {
      const { data } = await supabase.storage.from(BUCKET).createSignedUrl(config.heroImagePath, 60 * 60 * 24);
      setHeroImageUrl(data?.signedUrl ?? null);
    })();
  }, [config.heroImagePath]);

  const loadPermissions = useCallback(async () => {
    if (!activeOrgId) return;
    if (isSuperAdmin) {
      setCanEdit(true);
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId) {
      setCanEdit(false);
      return;
    }

    const { data: memberData } = await supabase
      .from("memberships")
      .select("role")
      .eq("org_id", activeOrgId)
      .eq("user_id", userId)
      .single();

    setCanEdit(canEditOrgAppearance(memberData?.role));
  }, [activeOrgId, isSuperAdmin]);

  useEffect(() => {
    if (!activeOrgId || orgLoading) return;
    void loadAssets();
    void loadConfig();
    void loadPermissions();
  }, [activeOrgId, orgLoading, loadAssets, loadConfig, loadPermissions]);

  async function uploadFiles(files: FileList | null, type: "logo" | "document") {
    if (!files || files.length === 0 || !activeOrgId) return;
    setUploading(type);
    setStatus(null);

    try {
      const prefix = type === "logo" ? logoPrefix : docsPrefix;
      for (const file of Array.from(files)) {
        const path = `${prefix}/${Date.now()}-${sanitizeFilename(file.name)}`;
        const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
          upsert: false,
          contentType: file.type || undefined,
        });
        if (error) throw error;
      }

      setStatus(type === "logo" ? "Logo files uploaded." : "Guideline files uploaded.");
      void logAuditEventClient({
        orgId: activeOrgId,
        eventType: type === "logo" ? "guideline_logos_uploaded" : "guideline_docs_uploaded",
        entityType: "brand_guidelines",
        entityId: activeOrgId,
        metadata: {
          count: files.length,
        },
      });
      await loadAssets();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatus(`Upload failed: ${message}`);
    } finally {
      setUploading(null);
    }
  }

  async function uploadIconFiles(files: FileList | null) {
    if (!files || files.length === 0 || !activeOrgId || !canEdit) return;
    setUploading("icon");
    setStatus(null);

    try {
      for (const file of Array.from(files)) {
        const path = `${iconsPrefix}/${Date.now()}-${sanitizeFilename(file.name)}`;
        const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
          upsert: false,
          contentType: file.type || undefined,
        });
        if (error) throw error;
      }
      setStatus("Icon files uploaded.");
      void logAuditEventClient({
        orgId: activeOrgId,
        eventType: "guideline_icons_uploaded",
        entityType: "brand_guidelines",
        entityId: activeOrgId,
        metadata: {
          count: files.length,
        },
      });
      await loadAssets();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatus(`Icon upload failed: ${message}`);
    } finally {
      setUploading(null);
    }
  }

  async function saveConfig() {
    if (!activeOrgId || !canEdit || !configPath) return;

    setSavingConfig(true);
    setStatus(null);
    try {
      const { error } = await supabase.storage.from(BUCKET).upload(
        configPath,
        new Blob([JSON.stringify(config, null, 2)], { type: "application/json" }),
        { upsert: true, contentType: "application/json" }
      );
      if (error) throw error;
      setStatus("Brand Portal notes saved.");
      void logAuditEventClient({
        orgId: activeOrgId,
        eventType: "guideline_notes_saved",
        entityType: "brand_guidelines",
        entityId: activeOrgId,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatus(`Failed to save Brand Portal notes: ${message}`);
    } finally {
      setSavingConfig(false);
    }
  }

  async function persistConfig(nextConfig: GuidelineConfig) {
    if (!activeOrgId || !configPath) return;
    const { error } = await supabase.storage.from(BUCKET).upload(
      configPath,
      new Blob([JSON.stringify(nextConfig, null, 2)], { type: "application/json" }),
      { upsert: true, contentType: "application/json" }
    );
    if (error) throw error;
  }

  async function uploadHeroImage(files: FileList | null) {
    if (!files || files.length === 0 || !activeOrgId || !canEdit) return;
    const file = files[0];

    setUploading("hero");
    setStatus(null);
    try {
      const newPath = `${activeOrgId}/brand-guidelines/hero/${Date.now()}-${sanitizeFilename(file.name)}`;
      const { error: uploadError } = await supabase.storage.from(BUCKET).upload(newPath, file, {
        upsert: false,
        contentType: file.type || undefined,
      });
      if (uploadError) throw uploadError;

      if (config.heroImagePath) {
        await supabase.storage.from(BUCKET).remove([config.heroImagePath]);
      }

      const nextConfig = { ...config, heroImagePath: newPath };
      await persistConfig(nextConfig);
      setConfig(nextConfig);
      setStatus("Hero image updated.");
      void logAuditEventClient({
        orgId: activeOrgId,
        eventType: "guideline_hero_updated",
        entityType: "file",
        entityId: newPath,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatus(`Hero image upload failed: ${message}`);
    } finally {
      setUploading(null);
    }
  }

  async function removeHeroImage() {
    if (!canEdit || !config.heroImagePath) return;
    setStatus(null);
    try {
      await supabase.storage.from(BUCKET).remove([config.heroImagePath]);
      const nextConfig = { ...config, heroImagePath: "" };
      await persistConfig(nextConfig);
      setConfig(nextConfig);
      setStatus("Hero image removed.");
      void logAuditEventClient({
        orgId: activeOrgId,
        eventType: "guideline_hero_removed",
        entityType: "file",
        entityId: config.heroImagePath,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatus(`Failed to remove hero image: ${message}`);
    }
  }

  async function deleteAsset(path: string) {
    if (!canEdit) return;
    setStatus(null);
    try {
      const { error } = await supabase.storage.from(BUCKET).remove([path]);
      if (error) throw error;
      setStatus("Asset deleted.");
      if (activeOrgId) {
        void logAuditEventClient({
          orgId: activeOrgId,
          eventType: "guideline_asset_deleted",
          entityType: "file",
          entityId: path,
        });
      }
      await loadAssets();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatus(`Delete failed: ${message}`);
    }
  }

  return (
    <MediaWorkspaceShell
      title="Brand Portal"
      subtitle="Centralize logos, visual standards, and usage references for your school team."
      actions={[
        ...(canEdit
          ? [
              {
                key: "save-notes",
                node: (
                  <button type="button" className={buttonClass("primary")} onClick={saveConfig} disabled={savingConfig}>
                    {savingConfig ? "Saving…" : "Save portal notes"}
                  </button>
                ),
              },
            ]
          : []),
        {
          key: "appearance",
          node: (
            <Link href="/settings/branding" className={buttonClass("secondary")}>
              Appearance
            </Link>
          ),
        },
        {
          key: "albums",
          node: (
            <Link href="/albums" className={buttonClass("secondary")}>
              Back to albums
            </Link>
          ),
        },
      ]}
      utilityActions={[
        ...(isSuperAdmin
          ? [
              {
                key: "super",
                node: (
                  <Link href="/super-admin" className={buttonClass("secondary", "sm")}>
                    Super admin
                  </Link>
                ),
              },
            ]
          : []),
      ]}
      sidebarLogoOnly
      sidebarContent={
        <div className="space-y-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Quick Jump</p>
            <div className="mt-1.5 space-y-1">
              {guidelineSections.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="block rounded-md px-2 py-1 text-sm text-slate-700 hover:bg-slate-100"
                >
                  {section.label}
                </a>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Guidelines Checklist</p>
            <ul className="mt-1.5 space-y-1 text-sm text-slate-700">
              <li>Primary + alternate logos</li>
              <li>Color standards</li>
              <li>Typography standards</li>
              <li>Approved usage notes</li>
            </ul>
            <p className="mt-2 text-xs text-slate-500">{canEdit ? "Edit enabled (owner/super admin)." : "View mode."}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Library Counts</p>
            <p className="mt-1.5 text-sm text-slate-700">{logos.length} logo files</p>
            <p className="text-sm text-slate-700">{icons.length} icon files</p>
            <p className="text-sm text-slate-700">{documents.length} portal files</p>
          </div>
        </div>
      }
    >
      <Card className="p-5 sm:p-6">
        <div className="grid gap-5 lg:grid-cols-2 lg:items-stretch">
          <div className="space-y-4">
            <h2 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">Brand Portal</h2>
            <p className="max-w-2xl text-lg text-slate-700">
              Keep your school brand consistent with shared standards, approved assets, and practical usage guidance.
            </p>
            <p className="max-w-2xl text-lg text-slate-700">
              This page gives staff one place to access logos, templates, and the most important rules to follow.
            </p>

            {featuredGuide?.signedUrl ? (
              <a href={featuredGuide.signedUrl} target="_blank" rel="noreferrer" className={buttonClass("primary")}>
                Download guide
              </a>
            ) : (
              <button type="button" className={buttonClass("primary")} disabled>
                Download guide
              </button>
            )}

          </div>

          {heroImageUrl ? (
            <div className="relative min-h-[260px] overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={heroImageUrl} alt="Brand Portal hero" className="h-full w-full object-cover" />
              {canEdit ? (
                <div className="absolute right-3 top-3 flex items-center gap-2">
                  <label className={`${buttonClass("secondary", "sm")} cursor-pointer bg-white/90 backdrop-blur`}>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploading !== null}
                      onChange={(e) => uploadHeroImage(e.target.files)}
                    />
                    {uploading === "hero" ? "Uploading…" : "Upload hero image"}
                  </label>
                  <button type="button" className={`${buttonClass("danger", "sm")} bg-white/90`} onClick={removeHeroImage} disabled={uploading !== null}>
                    Remove
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="relative flex min-h-[260px] items-center rounded-2xl bg-emerald-400 px-6 py-5">
              <p className="text-5xl font-semibold uppercase leading-[0.95] tracking-tight text-slate-950 sm:text-6xl">
                Big
                <br />
                Brand
                <br />
                Guide
              </p>
              {canEdit ? (
                <div className="absolute right-3 top-3">
                  <label className={`${buttonClass("secondary", "sm")} cursor-pointer bg-white/90 backdrop-blur`}>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploading !== null}
                      onChange={(e) => uploadHeroImage(e.target.files)}
                    />
                    {uploading === "hero" ? "Uploading…" : "Upload hero image"}
                  </label>
                </div>
              ) : null}
            </div>
          )}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-200 pt-3">
          <Badge>{logos.length} logos</Badge>
          <Badge>{icons.length} icons</Badge>
          <Badge>{documents.length} docs</Badge>
          <Badge>Shared standards hub</Badge>
        </div>
      </Card>

      {loading ? <p className="text-slate-600">Loading Brand Portal…</p> : null}
      {status ? <p className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">{status}</p> : null}
      {noActiveOrg ? (
        <Card className="p-5">
          <p className="text-sm text-slate-700">No active organization selected.</p>
        </Card>
      ) : null}

      {!noActiveOrg ? (
        <div className="space-y-4">
          <Card id="logos" className="p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Logo Library</h3>
                <p className="mt-1 text-sm text-slate-600">Upload primary, alternate, and monochrome logo versions.</p>
              </div>
              <label className={`${buttonClass("primary", "sm")} ${canEdit ? "cursor-pointer" : "cursor-not-allowed opacity-60"}`}>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  disabled={!canEdit || uploading !== null}
                  onChange={(e) => uploadFiles(e.target.files, "logo")}
                />
                {uploading === "logo" ? "Uploading…" : "Upload logos"}
              </label>
            </div>

            {logos.length === 0 ? (
              <p className="mt-4 text-sm text-slate-600">No logo files yet.</p>
            ) : (
              <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {logos.map((asset) => (
                  <li key={asset.path} className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                    <div className="flex aspect-video items-center justify-center bg-slate-50 p-3">
                      {asset.signedUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={asset.signedUrl} alt={asset.name} className="max-h-full max-w-full object-contain" />
                      ) : (
                        <p className="text-xs text-slate-500">Preview unavailable</p>
                      )}
                    </div>
                    <div className="border-t border-slate-200 p-3">
                      <p className="truncate text-sm font-medium text-slate-800" title={asset.name}>
                        {asset.name}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">{formatSize(asset.sizeBytes)}</p>
                      {asset.signedUrl ? (
                        <a
                          href={asset.signedUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-block text-xs font-medium text-slate-700 underline"
                        >
                          Open file
                        </a>
                      ) : null}
                      {canEdit ? (
                        <button
                          type="button"
                          className="mt-2 ml-3 inline-block text-xs font-medium text-rose-700 underline"
                          onClick={() => deleteAsset(asset.path)}
                        >
                          Delete
                        </button>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card id="colors" className="p-5">
            <h3 className="text-lg font-semibold text-slate-900">Colors</h3>
            <p className="mt-1 text-sm text-slate-600">Document approved primary, secondary, and accent colors for school use.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {(
                [
                  ["color1", "colorNotes1", "Color 1"],
                  ["color2", "colorNotes2", "Color 2"],
                  ["color3", "colorNotes3", "Color 3"],
                  ["color4", "colorNotes4", "Color 4"],
                  ["color5", "colorNotes5", "Color 5"],
                ] as const
              ).map(([colorKey, notesKey, label]) => (
                <div key={colorKey} className="rounded-lg border border-slate-200 p-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      className="h-10 w-14 cursor-pointer rounded border border-slate-300 bg-white p-1 disabled:cursor-not-allowed"
                      disabled={!canEdit}
                      value={config[colorKey]}
                      onChange={(e) => setConfig((prev) => ({ ...prev, [colorKey]: e.target.value }))}
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-800">{label}</p>
                      <p className="truncate text-xs text-slate-500">{config[colorKey]}</p>
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-slate-600">{config.colorsNotes}</p>
                  <textarea
                    className="mt-2 w-full rounded-md border border-slate-300 bg-white p-2 text-xs text-slate-800 outline-none focus:border-slate-900 disabled:bg-slate-50"
                    rows={6}
                    disabled={!canEdit}
                    value={config[notesKey]}
                    onChange={(e) => setConfig((prev) => ({ ...prev, [notesKey]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
          </Card>

          <Card id="typography" className="p-5">
            <h3 className="text-lg font-semibold text-slate-900">Typography</h3>
            <p className="mt-1 text-sm text-slate-600">List approved heading/body fonts and usage rules.</p>
            <textarea
              className="mt-3 w-full rounded-md border border-slate-300 bg-white p-2 text-sm text-slate-800 outline-none focus:border-slate-900 disabled:bg-slate-50"
              rows={3}
              disabled={!canEdit}
              value={config.typographyNotes}
              onChange={(e) => setConfig((prev) => ({ ...prev, typographyNotes: e.target.value }))}
            />
            <div className="mt-4 rounded-lg border border-slate-200 p-3">
              <p className="text-sm text-slate-700">Recommended structure:</p>
              <ul className="mt-1.5 space-y-1 text-sm text-slate-600">
                <li>Heading font (campaign headers, page titles)</li>
                <li>Body font (documents, website body copy)</li>
                <li>Fallback stack for accessibility</li>
              </ul>
            </div>
          </Card>

          <Card id="iconography" className="p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Iconography</h3>
                <p className="mt-1 text-sm text-slate-600">Store approved icon packs and guidance for usage style.</p>
              </div>
              <label className={`${buttonClass("secondary", "sm")} ${canEdit ? "cursor-pointer" : "cursor-not-allowed opacity-60"}`}>
                <input
                  type="file"
                  accept=".svg,image/*"
                  multiple
                  className="hidden"
                  disabled={!canEdit || uploading !== null}
                  onChange={(e) => uploadIconFiles(e.target.files)}
                />
                {uploading === "icon" ? "Uploading…" : "Upload icons"}
              </label>
            </div>
            <textarea
              className="mt-3 w-full rounded-md border border-slate-300 bg-white p-2 text-sm text-slate-800 outline-none focus:border-slate-900 disabled:bg-slate-50"
              rows={3}
              disabled={!canEdit}
              value={config.iconographyNotes}
              onChange={(e) => setConfig((prev) => ({ ...prev, iconographyNotes: e.target.value }))}
            />
            {icons.length === 0 ? (
              <div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
                No icons yet. Upload SVG/PNG icons for this school&apos;s Brand Portal library.
              </div>
            ) : (
              <>
                <div className="mt-4 flex items-center gap-2">
                  <a href={icons[0].signedUrl ?? "#"} target="_blank" rel="noreferrer" className={buttonClass("primary", "sm")}>
                    Download icons
                  </a>
                  <p className="text-xs text-slate-500">Org-specific icon set for this school.</p>
                </div>
                <div className="mt-4 rounded-xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800 p-4">
                  <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                    {icons.map((asset) => (
                      <div key={asset.path} className="group rounded-lg border border-emerald-300/30 bg-black/25 p-3">
                        <a href={asset.signedUrl ?? "#"} target="_blank" rel="noreferrer" className="block">
                          <div className="flex aspect-square items-center justify-center">
                            {asset.signedUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={asset.signedUrl} alt={asset.name} className="max-h-full max-w-full object-contain" />
                            ) : (
                              <span className="text-xs text-slate-300">No preview</span>
                            )}
                          </div>
                        </a>
                        <p className="mt-2 truncate text-[11px] text-emerald-100" title={asset.name}>
                          {asset.name}
                        </p>
                        {canEdit ? (
                          <button
                            type="button"
                            className="mt-1 text-[11px] font-medium text-rose-300 underline"
                            onClick={() => deleteAsset(asset.path)}
                          >
                            Delete
                          </button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </Card>

          <Card id="templates-social" className="p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Templates / Social</h3>
                <p className="mt-1 text-sm text-slate-600">Store social templates, print-ready files, and reference docs.</p>
              </div>
              <label className={`${buttonClass("secondary", "sm")} ${canEdit ? "cursor-pointer" : "cursor-not-allowed opacity-60"}`}>
                <input
                  type="file"
                  multiple
                  className="hidden"
                  disabled={!canEdit || uploading !== null}
                  onChange={(e) => uploadFiles(e.target.files, "document")}
                />
                {uploading === "document" ? "Uploading…" : "Upload docs"}
              </label>
            </div>
            <textarea
              className="mt-3 w-full rounded-md border border-slate-300 bg-white p-2 text-sm text-slate-800 outline-none focus:border-slate-900 disabled:bg-slate-50"
              rows={3}
              disabled={!canEdit}
              value={config.templatesNotes}
              onChange={(e) => setConfig((prev) => ({ ...prev, templatesNotes: e.target.value }))}
            />

            {documents.length === 0 ? (
              <p className="mt-4 text-sm text-slate-600">No Brand Portal documents yet.</p>
            ) : (
              <ul className="mt-4 space-y-2">
                {documents.map((asset) => (
                  <li key={asset.path} className="rounded-md border border-slate-200 bg-white px-3 py-2">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-slate-800">{asset.name}</p>
                        <p className="text-xs text-slate-500">
                          {formatSize(asset.sizeBytes)}
                          {asset.updatedAt ? ` • updated ${formatDateMDY(asset.updatedAt)}` : ""}
                        </p>
                      </div>
                      {asset.signedUrl ? (
                        <a href={asset.signedUrl} target="_blank" rel="noreferrer" className={buttonClass("secondary", "sm")}>
                          Open
                        </a>
                      ) : null}
                      {canEdit ? (
                        <button
                          type="button"
                          className={buttonClass("danger", "sm")}
                          onClick={() => deleteAsset(asset.path)}
                        >
                          Delete
                        </button>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card id="do-dont-examples" className="p-5">
            <h3 className="text-lg font-semibold text-slate-900">Do/Don&apos;t examples</h3>
            <p className="mt-1 text-sm text-slate-600">Show staff what approved and non-approved brand usage looks like.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-3">
                <p className="text-sm font-medium text-emerald-800">Do</p>
                <textarea
                  className="mt-2 w-full rounded-md border border-emerald-300 bg-emerald-100/70 p-2 text-xs text-emerald-900 outline-none disabled:bg-emerald-100/70"
                  rows={3}
                  disabled={!canEdit}
                  value={config.doNotes}
                  onChange={(e) => setConfig((prev) => ({ ...prev, doNotes: e.target.value }))}
                />
              </div>
              <div className="rounded-lg border border-rose-300 bg-rose-50 p-3">
                <p className="text-sm font-medium text-rose-800">Don&apos;t</p>
                <textarea
                  className="mt-2 w-full rounded-md border border-rose-300 bg-rose-100/70 p-2 text-xs text-rose-900 outline-none disabled:bg-rose-100/70"
                  rows={3}
                  disabled={!canEdit}
                  value={config.dontNotes}
                  onChange={(e) => setConfig((prev) => ({ ...prev, dontNotes: e.target.value }))}
                />
              </div>
            </div>
          </Card>
        </div>
      ) : null}
    </MediaWorkspaceShell>
  );
}
