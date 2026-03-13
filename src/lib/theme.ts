import { supabase } from "@/lib/supabaseClient";

export type OrgThemeSettings = {
  org_id: string;
  background: string;
  foreground: string;
  surface: string;
  surface_muted: string;
  border: string;
  text_muted: string;
  brand: string;
  brand_contrast: string;
  album_shell: string;
  logo_url: string | null;
  updated_at: string;
};

export type OrgThemeUpdate = Partial<
  Pick<
    OrgThemeSettings,
    | "background"
    | "foreground"
    | "surface"
    | "surface_muted"
    | "border"
    | "text_muted"
    | "brand"
    | "brand_contrast"
    | "album_shell"
    | "logo_url"
  >
>;

export type WorkspaceFontSize = "small" | "medium" | "large";

export const WORKSPACE_FONT_SIZE_STORAGE_KEY = "pv_workspace_font_size_v1";

const STORAGE_REF_PREFIX = "storage://";

const THEME_SELECT = [
  "org_id",
  "background",
  "foreground",
  "surface",
  "surface_muted",
  "border",
  "text_muted",
  "brand",
  "brand_contrast",
  "album_shell",
  "logo_url",
  "updated_at",
].join(",");

const CSS_VAR_MAP: Array<[keyof OrgThemeSettings, string]> = [
  ["background", "--background"],
  ["foreground", "--foreground"],
  ["surface", "--surface"],
  ["surface_muted", "--surface-muted"],
  ["border", "--border"],
  ["text_muted", "--text-muted"],
  ["brand", "--brand"],
  ["brand_contrast", "--brand-contrast"],
  ["album_shell", "--album-shell"],
];

export function applyTheme(theme: Partial<OrgThemeSettings> | null | undefined) {
  if (typeof document === "undefined" || !theme) return;

  const root = document.documentElement;
  for (const [field, cssVar] of CSS_VAR_MAP) {
    const value = theme[field];
    if (typeof value === "string" && value.trim()) {
      root.style.setProperty(cssVar, value);
    }
  }
}

export function readStoredWorkspaceFontSize(): WorkspaceFontSize {
  if (typeof window === "undefined") return "small";

  try {
    const value = window.localStorage.getItem(WORKSPACE_FONT_SIZE_STORAGE_KEY);
    if (value === "medium" || value === "large") return value;
  } catch {
    // ignore localStorage errors
  }

  return "small";
}

export function applyWorkspaceFontSize(size: WorkspaceFontSize) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.workspaceFontSize = size;
}

export function persistWorkspaceFontSize(size: WorkspaceFontSize) {
  applyWorkspaceFontSize(size);

  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(WORKSPACE_FONT_SIZE_STORAGE_KEY, size);
    window.dispatchEvent(new CustomEvent("pv:workspace-font-size", { detail: size }));
  } catch {
    // ignore localStorage errors
  }
}

export async function fetchOrgThemeSettings(orgId: string) {
  const { data, error } = await supabase
    .from("org_theme_settings")
    .select(THEME_SELECT)
    .eq("org_id", orgId)
    .single();

  if (error) throw error;
  return data as unknown as OrgThemeSettings;
}

export async function updateOrgThemeSettings(orgId: string, patch: OrgThemeUpdate) {
  const { data, error } = await supabase
    .from("org_theme_settings")
    .update({
      ...patch,
      updated_at: new Date().toISOString(),
    })
    .eq("org_id", orgId)
    .select(THEME_SELECT)
    .single();

  if (error) throw error;
  return data as unknown as OrgThemeSettings;
}

export function makeStorageRef(bucket: string, path: string) {
  return `${STORAGE_REF_PREFIX}${bucket}/${path}`;
}

export function parseStorageRef(value: string | null | undefined) {
  if (!value || !value.startsWith(STORAGE_REF_PREFIX)) return null;
  const raw = value.slice(STORAGE_REF_PREFIX.length);
  const slashIndex = raw.indexOf("/");
  if (slashIndex <= 0 || slashIndex === raw.length - 1) return null;
  return {
    bucket: raw.slice(0, slashIndex),
    path: raw.slice(slashIndex + 1),
  };
}
