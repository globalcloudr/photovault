"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { MediaWorkspaceShell } from "@/components/layout/media-workspace-shell";
import { buttonClass, Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useOrg } from "@/components/org/org-provider";
import { IconDelete, IconEdit, IconGrid, IconList, IconMore, IconOpen, IconShare } from "@/components/ui/icons";
import { formatDateMDY, formatDateTimeMDY } from "@/lib/date-format";

const COVER_PREFS_KEY = "album_cover_storage_paths_v1";
const ALBUMS_VIEW_MODE_KEY = "albums_view_mode_v1";
const ALBUMS_SORT_MODE_KEY = "albums_sort_mode_v1";

type Album = {
  id: string;
  event_name: string;
  event_date: string;
  rights_status: string;
  created_at: string;
  department_id: string | null;
};

type AssetThumb = {
  id: string;
  album_id: string;
  storage_path: string;
  canonical_filename: string;
  sequence_number: number;
  size_bytes: number;
  thumbUrl?: string | null;
};

type ShareLinkRow = {
  id: string;
  token: string | null;
  expires_at: string | null;
  allow_download: boolean | null;
  password_hash: string | null;
  revoked_at: string | null;
  created_at: string;
};

type OrgDepartment = {
  id: string;
  code: string;
  name: string;
};

function formatRightsLabel(rightsStatus: string) {
  switch (rightsStatus) {
    case "ok_for_marketing":
      return "OK for marketing";
    case "internal_only":
      return "Internal only";
    case "do_not_use":
      return "Do not use";
    default:
      return "Unknown";
  }
}

function readStoredCoverPaths(): Record<string, string> {
  try {
    const raw = window.localStorage.getItem(COVER_PREFS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as Record<string, string>;
  } catch {
    return {};
  }
}

function saveStoredCoverPaths(pathsByAlbumId: Record<string, string>) {
  try {
    window.localStorage.setItem(COVER_PREFS_KEY, JSON.stringify(pathsByAlbumId));
  } catch {
    // ignore localStorage errors
  }
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function readInitialAlbumsViewMode(): "grid" | "list" {
  if (typeof window === "undefined") return "grid";
  const stored = window.localStorage.getItem(ALBUMS_VIEW_MODE_KEY);
  return stored === "list" ? "list" : "grid";
}

function readInitialAlbumsSortMode(): "newest" | "oldest" | "name_asc" | "name_desc" {
  if (typeof window === "undefined") return "newest";
  const stored = window.localStorage.getItem(ALBUMS_SORT_MODE_KEY);
  if (
    stored === "newest" ||
    stored === "oldest" ||
    stored === "name_asc" ||
    stored === "name_desc"
  ) {
    return stored;
  }
  return "newest";
}

export default function AlbumsPage() {
  const { activeOrgId, loading: orgLoading, isSuperAdmin, orgs } = useOrg();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [assetsByAlbumId, setAssetsByAlbumId] = useState<Record<string, AssetThumb[]>>({});
  const [coverByAlbumId, setCoverByAlbumId] = useState<Record<string, AssetThumb | null>>({});
  const [pickerAlbumId, setPickerAlbumId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "name_asc" | "name_desc">(readInitialAlbumsSortMode);
  const [viewMode, setViewMode] = useState<"grid" | "list">(readInitialAlbumsViewMode);
  const [rightsFilter, setRightsFilter] = useState<"all" | "ok_for_marketing" | "internal_only" | "do_not_use" | "unknown">("all");
  const [departments, setDepartments] = useState<OrgDepartment[]>([]);
  const [shareAlbumId, setShareAlbumId] = useState<string | null>(null);
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const [creatingShare, setCreatingShare] = useState(false);
  const [shareLinksByAlbumId, setShareLinksByAlbumId] = useState<Record<string, ShareLinkRow[]>>({});
  const [shareAllowDownload, setShareAllowDownload] = useState(true);
  const [sharePassword, setSharePassword] = useState("");
  const [shareExpiresAt, setShareExpiresAt] = useState("");
  const [shareExpiresInputType, setShareExpiresInputType] = useState<"text" | "date">("text");
  const [editingAlbum, setEditingAlbum] = useState<Album | null>(null);
  const [albumEditorName, setAlbumEditorName] = useState("");
  const [albumEditorEventDate, setAlbumEditorEventDate] = useState("");
  const [albumEditorRights, setAlbumEditorRights] = useState<Album["rights_status"]>("unknown");
  const [albumEditorDepartmentId, setAlbumEditorDepartmentId] = useState("");
  const [albumEditorSaving, setAlbumEditorSaving] = useState(false);
  const [albumEditorStatus, setAlbumEditorStatus] = useState<string | null>(null);
  const [openAlbumMenuId, setOpenAlbumMenuId] = useState<string | null>(null);
  const [deletingAlbumId, setDeletingAlbumId] = useState<string | null>(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(ALBUMS_VIEW_MODE_KEY, viewMode);
    } catch {
      // ignore localStorage write errors
    }
  }, [viewMode]);

  useEffect(() => {
    try {
      window.localStorage.setItem(ALBUMS_SORT_MODE_KEY, sortBy);
    } catch {
      // ignore localStorage write errors
    }
  }, [sortBy]);

  useEffect(() => {
    if (orgLoading) return;
    if (!activeOrgId) return;

    (async () => {
      setLoading(true);
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        window.location.href = "/login";
        return;
      }

      const { data, error } = await supabase
        .from("albums")
        .select("id,event_name,event_date,rights_status,created_at,department_id")
        .eq("org_id", activeOrgId)
        .order("event_date", { ascending: false });

      if (error) {
        alert(error.message);
        setLoading(false);
        return;
      }

      const albumRows = (data ?? []) as Album[];
      setAlbums(albumRows);

      if (albumRows.length === 0) {
        setAssetsByAlbumId({});
        setCoverByAlbumId({});
        setLoading(false);
        return;
      }

      const albumIds = albumRows.map((a) => a.id);
      const { data: assetsData, error: assetsError } = await supabase
        .from("assets")
        .select("id,album_id,storage_path,canonical_filename,sequence_number,size_bytes")
        .in("album_id", albumIds)
        .order("sequence_number", { ascending: true });

      if (assetsError) {
        alert(assetsError.message);
        setLoading(false);
        return;
      }

      const assetRows = (assetsData ?? []) as AssetThumb[];
      const signedAssets = await Promise.all(
        assetRows.map(async (a) => {
          const { data: signedData, error: signedError } = await supabase.storage
            .from("originals")
            .createSignedUrl(a.storage_path, 60 * 60 * 24);

          if (signedError) return { ...a, thumbUrl: null };
          return { ...a, thumbUrl: signedData?.signedUrl ?? null };
        })
      );

      const grouped: Record<string, AssetThumb[]> = {};
      for (const a of signedAssets) {
        if (!grouped[a.album_id]) grouped[a.album_id] = [];
        grouped[a.album_id].push(a);
      }

      const storedCoverPaths = readStoredCoverPaths();
      const initialCovers: Record<string, AssetThumb | null> = {};
      for (const album of albumRows) {
        const albumAssets = grouped[album.id] ?? [];
        const storedPath = storedCoverPaths[album.id];
        const storedAsset = storedPath
          ? albumAssets.find((asset) => asset.storage_path === storedPath) ?? null
          : null;
        initialCovers[album.id] = storedAsset ?? albumAssets[0] ?? null;
      }

      setAssetsByAlbumId(grouped);
      setCoverByAlbumId(initialCovers);
      setLoading(false);
    })();
  }, [activeOrgId, orgLoading]);

  useEffect(() => {
    if (orgLoading || !activeOrgId) return;

    (async () => {
      const { data, error } = await supabase
        .from("org_departments")
        .select("id,code,name")
        .eq("org_id", activeOrgId)
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (!error && data) {
        setDepartments(data as OrgDepartment[]);
      }
    })();
  }, [activeOrgId, orgLoading]);

  function pickCover(albumId: string, asset: AssetThumb) {
    const next = { ...coverByAlbumId, [albumId]: asset };
    setCoverByAlbumId(next);

    const storedPaths = readStoredCoverPaths();
    storedPaths[albumId] = asset.storage_path;
    saveStoredCoverPaths(storedPaths);
  }

  const pickerAssets = pickerAlbumId ? assetsByAlbumId[pickerAlbumId] ?? [] : [];
  const selectedPickerCoverId = pickerAlbumId ? coverByAlbumId[pickerAlbumId]?.id ?? null : null;
  const shareLinks = useMemo(() => {
    if (!shareAlbumId) return [];
    return shareLinksByAlbumId[shareAlbumId] ?? [];
  }, [shareAlbumId, shareLinksByAlbumId]);
  const activeShareLinks = useMemo(() => shareLinks.filter((link) => !link.revoked_at), [shareLinks]);
  const revokedShareLinksCount = useMemo(() => shareLinks.filter((link) => Boolean(link.revoked_at)).length, [shareLinks]);
  const shareAlbum = useMemo(() => (shareAlbumId ? albums.find((a) => a.id === shareAlbumId) ?? null : null), [albums, shareAlbumId]);
  const noActiveOrg = !orgLoading && !activeOrgId;
  const filteredAlbums = useMemo(() => {
    const q = search.trim().toLowerCase();
    return albums.filter((album) => {
      if (rightsFilter !== "all" && album.rights_status !== rightsFilter) return false;
      if (!q) return true;
      return album.event_name.toLowerCase().includes(q) || album.event_date.toLowerCase().includes(q);
    });
  }, [albums, rightsFilter, search]);
  const sortedAlbums = useMemo(() => {
    const items = [...filteredAlbums];
    if (sortBy === "oldest") {
      items.sort((a, b) => a.event_date.localeCompare(b.event_date));
      return items;
    }
    if (sortBy === "name_asc") {
      items.sort((a, b) => a.event_name.localeCompare(b.event_name));
      return items;
    }
    if (sortBy === "name_desc") {
      items.sort((a, b) => b.event_name.localeCompare(a.event_name));
      return items;
    }
    items.sort((a, b) => b.event_date.localeCompare(a.event_date));
    return items;
  }, [filteredAlbums, sortBy]);

  const rightsCounts = useMemo(() => {
    return {
      all: albums.length,
      ok_for_marketing: albums.filter((a) => a.rights_status === "ok_for_marketing").length,
      internal_only: albums.filter((a) => a.rights_status === "internal_only").length,
      do_not_use: albums.filter((a) => a.rights_status === "do_not_use").length,
      unknown: albums.filter((a) => a.rights_status === "unknown").length,
    };
  }, [albums]);
  const activeOrg = useMemo(() => orgs.find((o) => o.id === activeOrgId) ?? null, [orgs, activeOrgId]);
  const heroCoverUrl = useMemo(() => {
    const covers = Object.values(coverByAlbumId).filter((c): c is AssetThumb => Boolean(c?.thumbUrl));
    return covers[0]?.thumbUrl ?? null;
  }, [coverByAlbumId]);
  const totalStorageBytes = useMemo(
    () =>
      Object.values(assetsByAlbumId).reduce(
        (sum, items) => sum + items.reduce((innerSum, item) => innerSum + (item.size_bytes ?? 0), 0),
        0
      ),
    [assetsByAlbumId]
  );
  const editingAlbumPhotoCount = useMemo(
    () => (editingAlbum ? (assetsByAlbumId[editingAlbum.id] ?? []).length : 0),
    [assetsByAlbumId, editingAlbum]
  );
  const editingAlbumStorageBytes = useMemo(
    () =>
      editingAlbum
        ? (assetsByAlbumId[editingAlbum.id] ?? []).reduce((sum, item) => sum + (item.size_bytes ?? 0), 0)
        : 0,
    [assetsByAlbumId, editingAlbum]
  );
  const editingAlbumCover = useMemo(
    () => (editingAlbum ? coverByAlbumId[editingAlbum.id] ?? null : null),
    [coverByAlbumId, editingAlbum]
  );
  const departmentLabelById = useMemo(
    () =>
      Object.fromEntries(
        departments.map((department) => [
          department.id,
          department.code ? `${department.code} — ${department.name}` : department.name,
        ])
      ) as Record<string, string>,
    [departments]
  );
  const hasAlbumEditorChanges = useMemo(() => {
    if (!editingAlbum) return false;
    return (
      editingAlbum.event_name !== albumEditorName.trim() ||
      editingAlbum.event_date !== albumEditorEventDate ||
      editingAlbum.rights_status !== albumEditorRights ||
      (editingAlbum.department_id ?? "") !== albumEditorDepartmentId
    );
  }, [albumEditorDepartmentId, albumEditorEventDate, albumEditorName, albumEditorRights, editingAlbum]);

  async function loadShareLinks(albumId: string) {
    if (!activeOrgId) return;
    const { data, error } = await supabase
      .from("share_links")
      .select("id,token,expires_at,allow_download,password_hash,revoked_at,created_at")
      .eq("album_id", albumId)
      .eq("org_id", activeOrgId)
      .order("created_at", { ascending: false });

    if (error) {
      setShareStatus(`Share links unavailable: ${error.message}`);
      return;
    }

    setShareLinksByAlbumId((prev) => ({
      ...prev,
      [albumId]: (data ?? []) as ShareLinkRow[],
    }));
  }

  async function openShareModal(albumId: string) {
    setShareAlbumId(albumId);
    setShareAllowDownload(true);
    setSharePassword("");
    setShareExpiresAt("");
    setShareExpiresInputType("text");
    setShareStatus(null);
    await loadShareLinks(albumId);
  }

  async function createShareLink() {
    if (!activeOrgId || !shareAlbumId) return;
    setCreatingShare(true);
    setShareStatus(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        setShareStatus("Not authenticated. Please sign in again.");
        return;
      }

      const response = await fetch("/api/share-links", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          orgId: activeOrgId,
          albumId: shareAlbumId,
          allowDownload: shareAllowDownload,
          password: sharePassword || undefined,
          expiresAt: shareExpiresAt ? `${shareExpiresAt}T23:59:59` : null,
        }),
      });

      const body = (await response.json()) as { error?: string; url?: string };
      if (!response.ok) {
        setShareStatus(body.error ?? "Failed to create share link.");
        return;
      }

      if (body.url) {
        await navigator.clipboard.writeText(body.url);
      }
      setShareStatus(body.url ? "Share link created and copied to clipboard." : "Share link created.");
      setSharePassword("");
      setShareExpiresAt("");
      setShareExpiresInputType("text");
      await loadShareLinks(shareAlbumId);
    } catch (error) {
      setShareStatus(`Failed to create share link: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setCreatingShare(false);
    }
  }

  async function revokeShareLink(linkId: string) {
    if (!activeOrgId || !shareAlbumId) return;
    setShareStatus(null);
    const confirmed = window.confirm("Revoke this share link?");
    if (!confirmed) return;

    const { error } = await supabase
      .from("share_links")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", linkId)
      .eq("org_id", activeOrgId);

    if (error) {
      setShareStatus(`Failed to revoke link: ${error.message}`);
      return;
    }

    setShareStatus("Share link revoked.");
    setShareLinksByAlbumId((prev) => {
      const items = prev[shareAlbumId] ?? [];
      return {
        ...prev,
        [shareAlbumId]: items.map((x) => (x.id === linkId ? { ...x, revoked_at: new Date().toISOString() } : x)),
      };
    });
  }

  async function copyShareLink(token: string) {
    const url = `${window.location.origin}/share/${token}`;
    await navigator.clipboard.writeText(url);
    setShareStatus("Share link copied.");
  }

  function openAlbumEditor(album: Album) {
    setEditingAlbum(album);
    setAlbumEditorName(album.event_name);
    setAlbumEditorEventDate(album.event_date);
    setAlbumEditorRights(album.rights_status);
    setAlbumEditorDepartmentId(album.department_id ?? "");
    setAlbumEditorStatus(null);
  }

  function closeAlbumEditor() {
    if (albumEditorSaving) return;
    if (hasAlbumEditorChanges) {
      const confirmed = window.confirm("Discard unsaved changes?");
      if (!confirmed) return;
    }
    setEditingAlbum(null);
    setAlbumEditorStatus(null);
  }

  async function saveAlbumEditor() {
    if (!activeOrgId || !editingAlbum) return;
    const trimmedName = albumEditorName.trim();
    if (!trimmedName) {
      setAlbumEditorStatus("Album name is required.");
      return;
    }
    if (!albumEditorEventDate) {
      setAlbumEditorStatus("Event date is required.");
      return;
    }

    setAlbumEditorSaving(true);
    setAlbumEditorStatus(null);
    try {
      const payload = {
        event_name: trimmedName,
        event_date: albumEditorEventDate,
        rights_status: albumEditorRights,
        department_id: albumEditorDepartmentId || null,
      };
      const { error } = await supabase
        .from("albums")
        .update(payload)
        .eq("id", editingAlbum.id)
        .eq("org_id", activeOrgId);

      if (error) {
        setAlbumEditorStatus(`Save failed: ${error.message}`);
        return;
      }

      setAlbums((prev) =>
        prev.map((album) => (album.id === editingAlbum.id ? { ...album, ...payload } : album))
      );
      setEditingAlbum((prev) => (prev ? { ...prev, ...payload } : prev));
      setAlbumEditorStatus("Saved.");
    } catch (error) {
      setAlbumEditorStatus(
        `Save failed: ${error instanceof Error ? error.message : String(error)}`
      );
    } finally {
      setAlbumEditorSaving(false);
    }
  }

  async function deleteAlbum(album: Album) {
    if (!activeOrgId || deletingAlbumId) return;
    const photoCount = (assetsByAlbumId[album.id] ?? []).length;
    const confirmed = window.confirm(
      photoCount > 0
        ? `Delete "${album.event_name}" and its ${photoCount} ${photoCount === 1 ? "photo" : "photos"}?`
        : `Delete "${album.event_name}"?`
    );
    if (!confirmed) return;

    setDeletingAlbumId(album.id);
    setOpenAlbumMenuId(null);

    try {
      const albumAssets = assetsByAlbumId[album.id] ?? [];

      const { error: shareLinksError } = await supabase
        .from("share_links")
        .delete()
        .eq("album_id", album.id)
        .eq("org_id", activeOrgId);

      if (shareLinksError) {
        window.alert(`Delete failed: ${shareLinksError.message}`);
        return;
      }

      const { data: deletedAssets, error: assetsError } = await supabase
        .from("assets")
        .delete()
        .eq("album_id", album.id)
        .eq("org_id", activeOrgId)
        .select("id,storage_path");

      if (assetsError) {
        window.alert(`Delete failed: ${assetsError.message}`);
        return;
      }

      const deletedAssetRows = (deletedAssets ?? []) as Pick<AssetThumb, "id" | "storage_path">[];
      if (deletedAssetRows.length !== albumAssets.length) {
        window.alert(
          `Delete failed: expected to remove ${albumAssets.length} asset rows, removed ${deletedAssetRows.length}.`
        );
        return;
      }

      const { data: deletedAlbums, error: albumError } = await supabase
        .from("albums")
        .delete()
        .eq("id", album.id)
        .eq("org_id", activeOrgId)
        .select("id");

      if (albumError) {
        window.alert(`Delete failed: ${albumError.message}`);
        return;
      }

      if ((deletedAlbums ?? []).length !== 1) {
        window.alert("Delete failed: album row was not removed.");
        return;
      }

      const storagePaths = deletedAssetRows.map((asset) => asset.storage_path).filter(Boolean);
      if (storagePaths.length > 0) {
        const { error: storageError } = await supabase.storage.from("originals").remove(storagePaths);
        if (storageError) {
          window.alert(`Album deleted, but storage cleanup failed: ${storageError.message}`);
        }
      }

      setAlbums((prev) => prev.filter((item) => item.id !== album.id));
      setAssetsByAlbumId((prev) => {
        const next = { ...prev };
        delete next[album.id];
        return next;
      });
      setCoverByAlbumId((prev) => {
        const next = { ...prev };
        delete next[album.id];
        return next;
      });
      setShareLinksByAlbumId((prev) => {
        const next = { ...prev };
        delete next[album.id];
        return next;
      });
      const storedCoverPaths = readStoredCoverPaths();
      if (storedCoverPaths[album.id]) {
        delete storedCoverPaths[album.id];
        saveStoredCoverPaths(storedCoverPaths);
      }

      if (editingAlbum?.id === album.id) {
        setEditingAlbum(null);
        setAlbumEditorStatus(null);
      }
    } finally {
      setDeletingAlbumId(null);
    }
  }

  return (
    <MediaWorkspaceShell
      title="Albums"
      subtitle="Find, organize, and share school photos."
      actions={[
        {
          key: "new",
          node: (
            <Link href="/albums/new" className={buttonClass("primary")}>
              New album
            </Link>
          ),
        },
      ]}
      sidebarLogoOnly
      sidebarContent={
        <div className="space-y-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Rights Filter</p>
            <div className="mt-1.5 space-y-1">
              {(
                [
                  ["all", `All (${rightsCounts.all})`],
                  ["ok_for_marketing", `OK (${rightsCounts.ok_for_marketing})`],
                  ["internal_only", `Internal (${rightsCounts.internal_only})`],
                  ["do_not_use", `Do not use (${rightsCounts.do_not_use})`],
                  ["unknown", `Unknown (${rightsCounts.unknown})`],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={`w-full rounded-md px-2 py-1 text-left text-sm transition ${
                    rightsFilter === value
                      ? "bg-slate-900 text-white"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                  onClick={() => setRightsFilter(value)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      }
    >
      <Card className="overflow-hidden">
        <div className="relative h-36 overflow-hidden border-b border-slate-200 sm:h-44">
          {heroCoverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={heroCoverUrl}
              alt="School cover"
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : null}
          <div className={`absolute inset-0 ${heroCoverUrl ? "bg-slate-900/45" : "bg-gradient-to-r from-slate-900 to-slate-700"}`} />
          <div className="absolute inset-x-0 bottom-0 p-4 text-white sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-100">School Library</p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">
              {activeOrg?.name ?? "Organization"}
            </h2>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 px-4 py-3">
          <Badge>{albums.length} albums</Badge>
          <Badge>{rightsCounts.ok_for_marketing} marketing ready</Badge>
          <Badge>{Object.values(assetsByAlbumId).reduce((sum, items) => sum + items.length, 0)} photos</Badge>
          <Badge>{formatBytes(totalStorageBytes)} used</Badge>
        </div>
      </Card>

      <Card className="p-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="w-full sm:max-w-md">
            <Input
              placeholder="Search albums"
              value={search}
              name="album-search"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <label className="sr-only" htmlFor="album-sort">Sort albums</label>
            <select
              id="album-sort"
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-900"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            >
              <option value="newest">Sort by Newest</option>
              <option value="oldest">Sort by Oldest</option>
              <option value="name_asc">Sort by Name (A-Z)</option>
              <option value="name_desc">Sort by Name (Z-A)</option>
            </select>
            <button
              type="button"
              className={`inline-flex items-center gap-1 rounded-md border px-2 py-2 text-xs ${
                viewMode === "grid"
                  ? "border-slate-300 bg-slate-100 text-slate-900"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
              title="Grid view"
              aria-label="Grid view"
              onClick={() => setViewMode("grid")}
            >
              <IconGrid className="h-3.5 w-3.5" />
              Grid
            </button>
            <button
              type="button"
              className={`inline-flex items-center gap-1 rounded-md border px-2 py-2 text-xs ${
                viewMode === "list"
                  ? "border-slate-300 bg-slate-100 text-slate-900"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
              title="List view"
              aria-label="List view"
              onClick={() => setViewMode("list")}
            >
              <IconList className="h-3.5 w-3.5" />
              List
            </button>
          </div>
        </div>
      </Card>

      <section>
        {orgLoading || loading ? (
          <p className="mt-6 text-slate-600">Loading albums…</p>
        ) : noActiveOrg ? (
          <section className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white/80 p-10 text-center">
            <h2 className="text-xl font-semibold text-slate-900">No active organization selected</h2>
            <p className="mt-2 text-sm text-slate-600">Choose an organization in Super Admin to load albums.</p>
            {isSuperAdmin && (
              <Link className={`${buttonClass("secondary")} mt-5`} href="/super-admin">
                Open Super Admin
              </Link>
            )}
          </section>
        ) : sortedAlbums.length === 0 ? (
          <section className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white/80 p-10 text-center">
            <h2 className="text-xl font-semibold text-slate-900">{albums.length === 0 ? "No albums yet" : "No albums match filters"}</h2>
            <p className="mt-2 text-sm text-slate-600">
              {albums.length === 0
                ? "Create your first album to start uploading and organizing photos."
                : "Try a different search term or rights filter."}
            </p>
            <Link className={`${buttonClass("primary")} mt-5`} href="/albums/new">
              {albums.length === 0 ? "Create first album" : "Create new album"}
            </Link>
          </section>
        ) : viewMode === "grid" ? (
          <ul className="mt-3 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {sortedAlbums.map((a) => {
              const cover = coverByAlbumId[a.id];

              return (
                <Card key={a.id} className="overflow-hidden border-slate-200 bg-white">
                  <div className="group relative border-b border-slate-200 bg-slate-100">
                    <div className="aspect-video w-full">
                      {cover?.thumbUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={cover.thumbUrl}
                          alt={`${a.event_name} cover`}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-sm text-slate-500">
                          No cover photo
                        </div>
                      )}
                    </div>
                    <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/40 to-transparent opacity-90 transition sm:opacity-0 sm:group-hover:opacity-100" />

                    <button
                      type="button"
                      className="absolute left-2 top-2 z-10 inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/95 px-2 py-1 text-[11px] font-medium text-slate-700 shadow-sm backdrop-blur transition hover:bg-slate-100"
                      onClick={() => openAlbumEditor(a)}
                      aria-label={`Edit ${a.event_name}`}
                      title="Edit album"
                    >
                      <IconEdit className="h-3.5 w-3.5" />
                      Select
                    </button>

                    <div className="absolute right-2 top-2 z-20 flex items-center gap-1">
                      <Link
                        href={`/albums/${a.id}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-slate-700 shadow-sm backdrop-blur transition hover:bg-slate-100"
                        aria-label={`Open ${a.event_name}`}
                        title="Open"
                        onClick={() => setOpenAlbumMenuId(null)}
                      >
                        <IconOpen className="h-4 w-4" />
                      </Link>
                      <button
                        type="button"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-slate-700 shadow-sm backdrop-blur transition hover:bg-slate-100"
                        aria-label="Share"
                        title="Share"
                        onClick={() => {
                          setOpenAlbumMenuId(null);
                          void openShareModal(a.id);
                        }}
                      >
                        <IconShare className="h-4 w-4" />
                      </button>
                      <div className="relative">
                        <button
                          type="button"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-slate-700 shadow-sm backdrop-blur transition hover:bg-slate-100"
                          aria-label="More actions"
                          title="More actions"
                          onClick={() => setOpenAlbumMenuId((prev) => (prev === a.id ? null : a.id))}
                        >
                          <IconMore className="h-4 w-4" />
                        </button>
                        {openAlbumMenuId === a.id ? (
                          <div className="absolute right-0 top-9 z-30 w-36 rounded-lg border border-slate-200 bg-white p-1 shadow-md">
                            <button
                              type="button"
                              className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
                              onClick={() => openAlbumEditor(a)}
                            >
                              <IconEdit className="h-4 w-4" />
                              Edit
                            </button>
                            <Link
                              href={`/albums/${a.id}`}
                              className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
                              onClick={() => setOpenAlbumMenuId(null)}
                            >
                              <IconOpen className="h-4 w-4" />
                              Open
                            </Link>
                            <button
                              type="button"
                              className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-red-700 hover:bg-red-50"
                              onClick={() => void deleteAlbum(a)}
                              disabled={deletingAlbumId === a.id}
                            >
                              <IconDelete className="h-4 w-4" />
                              {deletingAlbumId === a.id ? "Deleting…" : "Delete"}
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2.5 p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">{formatDateMDY(a.event_date)}</p>
                      <p className="text-xs text-slate-500">
                        Updated {formatDateMDY(a.created_at)}
                      </p>
                    </div>
                    <h2 className="line-clamp-2 text-lg font-semibold text-slate-900">{a.event_name}</h2>
                    <p className="text-xs text-slate-600">
                      Rights: <span className="font-medium text-slate-800">{formatRightsLabel(a.rights_status)}</span>
                    </p>
                    {a.department_id && departmentLabelById[a.department_id] ? (
                      <p className="text-xs text-slate-600">
                        Program / Department:{" "}
                        <span className="font-medium text-slate-800">{departmentLabelById[a.department_id]}</span>
                      </p>
                    ) : null}
                  </div>
                </Card>
              );
            })}
          </ul>
        ) : (
          <ul className="mt-3 space-y-3">
            {sortedAlbums.map((a) => {
              const cover = coverByAlbumId[a.id];

              return (
                <Card key={a.id} className="border-slate-200 bg-white p-3 sm:p-4">
                  <div className="flex items-start gap-3">
                    <div className="relative h-20 w-28 overflow-hidden rounded-md border border-slate-200 bg-slate-100">
                      {cover?.thumbUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={cover.thumbUrl}
                          alt={`${a.event_name} cover`}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-slate-500">
                          No cover
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                        <button
                          type="button"
                          className="inline-flex items-center gap-2 text-xs text-slate-600 transition hover:text-slate-800"
                          onClick={() => openAlbumEditor(a)}
                          aria-label={`Edit ${a.event_name}`}
                          title="Edit album"
                        >
                          <IconEdit className="h-4 w-4" />
                          Select
                        </button>
                        <h2 className="truncate text-base font-semibold text-slate-900">{a.event_name}</h2>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {formatDateMDY(a.event_date)} • Updated {formatDateMDY(a.created_at)}
                      </p>
                      <p className="mt-1 text-xs text-slate-600">
                        Rights: <span className="font-medium text-slate-800">{formatRightsLabel(a.rights_status)}</span>
                      </p>
                      {a.department_id && departmentLabelById[a.department_id] ? (
                        <p className="mt-1 text-xs text-slate-600">
                          Program / Department:{" "}
                          <span className="font-medium text-slate-800">{departmentLabelById[a.department_id]}</span>
                        </p>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Link className={buttonClass("secondary", "sm") + " whitespace-nowrap"} href={`/albums/${a.id}`}>
                        <IconOpen className="mr-1 h-3.5 w-3.5" />
                        Open
                      </Link>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="whitespace-nowrap"
                        onClick={() => void openShareModal(a.id)}
                      >
                        <IconShare className="mr-1 h-3.5 w-3.5" />
                        Share
                      </Button>
                      <div className="relative">
                        <button
                          type="button"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-100"
                          aria-label="More actions"
                          title="More actions"
                          onClick={() => setOpenAlbumMenuId((prev) => (prev === a.id ? null : a.id))}
                        >
                          <IconMore className="h-4 w-4" />
                        </button>
                        {openAlbumMenuId === a.id ? (
                          <div className="absolute right-0 top-9 z-30 w-36 rounded-lg border border-slate-200 bg-white p-1 shadow-md">
                            <button
                              type="button"
                              className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
                              onClick={() => openAlbumEditor(a)}
                            >
                              <IconEdit className="h-4 w-4" />
                              Edit
                            </button>
                            <Link
                              href={`/albums/${a.id}`}
                              className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
                              onClick={() => setOpenAlbumMenuId(null)}
                            >
                              <IconOpen className="h-4 w-4" />
                              Open
                            </Link>
                            <button
                              type="button"
                              className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-red-700 hover:bg-red-50"
                              onClick={() => void deleteAlbum(a)}
                              disabled={deletingAlbumId === a.id}
                            >
                              <IconDelete className="h-4 w-4" />
                              {deletingAlbumId === a.id ? "Deleting…" : "Delete"}
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </ul>
        )}
      </section>

      {pickerAlbumId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/75 p-6"
          onClick={() => setPickerAlbumId(null)}
        >
          <div
            className="max-h-[85vh] w-full max-w-5xl overflow-auto rounded-2xl border border-slate-300 bg-white p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Choose cover photo</h2>
                <p className="text-sm text-slate-600">Pick one image to represent this album in the grid.</p>
              </div>
              <Button size="sm" variant="secondary" onClick={() => setPickerAlbumId(null)}>
                Close
              </Button>
            </div>

            {pickerAssets.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
                No photos in this album yet.
              </p>
            ) : (
              <div
                className="grid gap-3"
                style={{ gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))" }}
              >
                {pickerAssets.map((asset) => {
                  const isSelected = asset.id === selectedPickerCoverId;
                  return (
                    <button
                      key={asset.id}
                      type="button"
                      className={`group relative overflow-hidden rounded-lg border bg-slate-100 transition ${
                        isSelected
                          ? "border-slate-900 ring-2 ring-slate-900/30"
                          : "border-slate-200 hover:border-slate-900"
                      }`}
                      onClick={() => {
                        pickCover(pickerAlbumId, asset);
                        setPickerAlbumId(null);
                      }}
                      title={asset.canonical_filename}
                    >
                      <div className="aspect-square w-full bg-slate-100">
                        {asset.thumbUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={asset.thumbUrl}
                            alt={asset.canonical_filename}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs text-slate-500">
                            No preview
                          </div>
                        )}
                      </div>

                      {isSelected && (
                        <span className="absolute right-2 top-2 rounded-full bg-slate-900 px-2 py-1 text-xs font-medium text-white">
                          Selected
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {shareAlbumId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/75 p-6"
          onClick={() => setShareAlbumId(null)}
        >
          <div
            className="max-h-[85vh] w-full max-w-5xl overflow-auto rounded-2xl border border-slate-300 bg-white p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Share Album</h2>
                <p className="text-sm text-slate-600">
                  {shareAlbum ? `Create secure links for ${shareAlbum.event_name}.` : "Create secure links for this album."}
                </p>
              </div>
              <Button size="sm" variant="secondary" onClick={() => setShareAlbumId(null)}>
                Close
              </Button>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <label className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={shareAllowDownload}
                  onChange={(e) => setShareAllowDownload(e.target.checked)}
                />
                Allow download
              </label>
              <Input
                type="password"
                placeholder="Password (optional)"
                value={sharePassword}
                name="share-password"
                autoComplete="new-password"
                autoCorrect="off"
                autoCapitalize="none"
                onChange={(e) => setSharePassword(e.target.value)}
              />
              <Input
                type={shareExpiresInputType}
                placeholder="Expiration Date"
                value={shareExpiresAt}
                name="share-expiration-date"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                onFocus={() => setShareExpiresInputType("date")}
                onBlur={() => {
                  if (!shareExpiresAt) setShareExpiresInputType("text");
                }}
                onChange={(e) => setShareExpiresAt(e.target.value)}
                aria-label="Expiration Date"
              />
              <Button variant="primary" onClick={createShareLink} disabled={creatingShare}>
                {creatingShare ? "Creating…" : "Create share link"}
              </Button>
            </div>

            <p className="mt-2 text-xs text-slate-500">
              Revoked/expired links are retained for audit for up to 1 year.
            </p>
            {shareStatus ? <p className="mt-2 text-xs text-slate-600">{shareStatus}</p> : null}

            <div className="mt-3 space-y-2">
              {activeShareLinks.length === 0 ? (
                <p className="text-xs text-slate-500">No share links created yet.</p>
              ) : (
                activeShareLinks.map((link) => (
                  <div key={link.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-200 px-3 py-2">
                    <div>
                      <p className="text-xs font-medium text-slate-700">
                        {link.expires_at ? `Expires ${formatDateMDY(link.expires_at)}` : "No expiry"}
                        {" • "}
                        {link.allow_download ? "Download enabled" : "Download disabled"}
                        {" • "}
                        {link.password_hash ? "Password protected" : "No password"}
                      </p>
                      <p className="text-xs text-slate-500">
                        Created {formatDateTimeMDY(link.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {link.token ? (
                        <Button size="sm" variant="secondary" onClick={() => void copyShareLink(link.token!)}>
                          Copy link
                        </Button>
                      ) : null}
                      <Button size="sm" variant="danger" onClick={() => void revokeShareLink(link.id)}>
                        Revoke
                      </Button>
                    </div>
                  </div>
                ))
              )}
              {revokedShareLinksCount > 0 ? (
                <p className="text-xs text-slate-400">
                  {revokedShareLinksCount} revoked {revokedShareLinksCount === 1 ? "link is" : "links are"} hidden.
                </p>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {editingAlbum ? (
        <div className="fixed inset-0 z-[60]">
          <button
            type="button"
            aria-label="Close album editor"
            className="absolute inset-0 bg-slate-950/35"
            onClick={closeAlbumEditor}
          />
          <aside className="absolute inset-y-0 right-0 w-full overflow-y-auto overscroll-contain bg-white shadow-2xl sm:max-w-xl sm:border-l sm:border-slate-200">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-4 sm:px-5">
              <h3 className="text-2xl font-semibold tracking-tight text-slate-950">Album Details</h3>
              <Button size="sm" variant="ghost" onClick={closeAlbumEditor} disabled={albumEditorSaving}>
                Close
              </Button>
            </div>

            <div className="space-y-5 px-4 py-4 pb-28 sm:px-5 sm:py-5 sm:pb-24">
              <div>
                <p className="mb-2 text-sm font-semibold text-slate-900">Preview</p>
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                  {editingAlbumCover?.thumbUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={editingAlbumCover.thumbUrl}
                      alt={`${editingAlbum.event_name} cover`}
                      className="h-64 w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-64 items-center justify-center text-sm text-slate-500">
                      No cover selected
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-900">Album name</label>
                <Input
                  value={albumEditorName}
                  onChange={(e) => setAlbumEditorName(e.target.value)}
                  placeholder="Album name"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-900">Date</label>
                  <Input
                    type="date"
                    value={albumEditorEventDate}
                    onChange={(e) => setAlbumEditorEventDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-900">Rights</label>
                  <select
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-900"
                    value={albumEditorRights}
                    onChange={(e) => setAlbumEditorRights(e.target.value)}
                  >
                    <option value="ok_for_marketing">OK for marketing</option>
                    <option value="internal_only">Internal only</option>
                    <option value="do_not_use">Do not use</option>
                    <option value="unknown">Unknown</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-900">Program / Department</label>
                <select
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-900"
                  value={albumEditorDepartmentId}
                  onChange={(e) => setAlbumEditorDepartmentId(e.target.value)}
                >
                  <option value="">No program / department</option>
                  {departments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.code ? `${department.code} — ${department.name}` : department.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1.5 text-xs text-slate-500">
                  Use this to group albums by school program area, such as Career Education, ESL, GED, or Active Adults.
                </p>
              </div>

              <div>
                <p className="mb-2 text-sm font-semibold text-slate-900">Album details</p>
                <div className="overflow-hidden rounded-lg border border-slate-200">
                  <dl className="divide-y divide-slate-200 text-sm">
                    <div className="grid grid-cols-[140px_1fr] gap-3 px-3 py-2">
                      <dt className="text-slate-500">Program / Department</dt>
                      <dd className="text-slate-800">
                        {albumEditorDepartmentId && departmentLabelById[albumEditorDepartmentId]
                          ? departmentLabelById[albumEditorDepartmentId]
                          : "Not set"}
                      </dd>
                    </div>
                    <div className="grid grid-cols-[140px_1fr] gap-3 px-3 py-2">
                      <dt className="text-slate-500">Created</dt>
                      <dd className="text-slate-800">{formatDateTimeMDY(editingAlbum.created_at)}</dd>
                    </div>
                    <div className="grid grid-cols-[140px_1fr] gap-3 px-3 py-2">
                      <dt className="text-slate-500">Photos</dt>
                      <dd className="text-slate-800">
                        {editingAlbumPhotoCount} {editingAlbumPhotoCount === 1 ? "photo" : "photos"}
                      </dd>
                    </div>
                    <div className="grid grid-cols-[140px_1fr] gap-3 px-3 py-2">
                      <dt className="text-slate-500">Storage used</dt>
                      <dd className="text-slate-800">{formatBytes(editingAlbumStorageBytes)}</dd>
                    </div>
                  </dl>
                </div>
                <div className="mt-3">
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={editingAlbumPhotoCount === 0}
                    onClick={() => {
                      setPickerAlbumId(editingAlbum.id);
                    }}
                  >
                    Choose cover
                  </Button>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 border-t border-slate-200 bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-5 sm:py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="min-h-4 text-xs text-slate-600">{albumEditorStatus ?? " "}</p>
                <div className="flex items-center justify-end gap-2">
                  <Button size="sm" variant="secondary" onClick={closeAlbumEditor} disabled={albumEditorSaving}>
                    Cancel
                  </Button>
                  <Button size="sm" variant="primary" onClick={saveAlbumEditor} disabled={albumEditorSaving}>
                    {albumEditorSaving ? "Saving…" : "Save changes"}
                  </Button>
                </div>
              </div>
            </div>
          </aside>
        </div>
      ) : null}
    </MediaWorkspaceShell>
  );
}
