"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { MediaWorkspaceShell } from "@/components/layout/media-workspace-shell";
import { Button, buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useOrg } from "@/components/org/org-provider";
import { IconDelete, IconDownload, IconEdit, IconGrid, IconList, IconMore, IconOpen, IconView } from "@/components/ui/icons";
import { logAuditEventClient } from "@/lib/audit-client";
import { formatDateMDY, formatDateTimeMDY } from "@/lib/date-format";

type AlbumRow = {
  id: string;
  org_id: string;
  event_name: string;
  event_date: string; // date comes back as string
  rights_status: "unknown" | "ok_for_marketing" | "internal_only" | "do_not_use";
  created_at: string;
  department_id: string | null;
};

type AssetRow = {
  id: string;
  album_id: string;
  org_id?: string;
  storage_path: string;
  original_filename: string;
  canonical_filename: string;
  sequence_number: number;
  mime_type: string;
  size_bytes: number;
  file_hash?: string | null;
  processing_status?: string | null;
  tags?: string[] | null;
  event_type?: string | null;
  campus?: string | null;
  photographer?: string | null;
  width: number | null;
  height: number | null;
  taken_at: string | null;
  created_at: string;
  updated_at?: string | null;
  thumbUrl?: string | null;
};

type UploadQueueStatus = "queued" | "hashing" | "duplicate" | "uploading" | "saving" | "done" | "error";

type UploadQueueItem = {
  id: string;
  filename: string;
  sizeBytes: number;
  status: UploadQueueStatus;
  hash?: string;
  message?: string;
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

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return String(error);
}

function safeFileExt(filename: string) {
  const parts = filename.split(".");
  if (parts.length < 2) return "";
  const ext = parts.pop()!.toLowerCase();
  // basic hardening
  return ext.replace(/[^a-z0-9]/g, "");
}

function formatRights(r: AlbumRow["rights_status"]) {
  switch (r) {
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

async function signUrls(rows: AssetRow[]) {
  const bucket = "originals";

  const signed = await Promise.all(
    rows.map(async (r) => {
      // 24 hours (86400 seconds) lifetime for signed URL
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(r.storage_path, 60 * 60 * 24);

      if (error) return { ...r, thumbUrl: null };
      return { ...r, thumbUrl: data?.signedUrl ?? null };
    })
  );

  return signed;
}

export default function AlbumDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { activeOrgId, loading: orgLoading, isSuperAdmin } = useOrg();

  const albumId = useMemo(() => {
    const id = params?.id;
    return typeof id === "string" ? id : Array.isArray(id) ? id[0] : "";
  }, [params]);

  const [album, setAlbum] = useState<AlbumRow | null>(null);
  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "name_asc" | "name_desc">("newest");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const filteredAssets = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return assets;

    return assets.filter((a) => {
      const hay = [
        a.canonical_filename,
        a.original_filename,
        String(a.sequence_number),
        a.event_type ?? "",
        a.campus ?? "",
        a.photographer ?? "",
        ...(a.tags ?? []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return hay.includes(q);
    });
  }, [assets, query]);
  const sortedAssets = useMemo(() => {
    const items = [...filteredAssets];
    if (sortBy === "oldest") {
      items.sort((a, b) => a.sequence_number - b.sequence_number);
      return items;
    }
    if (sortBy === "name_asc") {
      items.sort((a, b) => a.original_filename.localeCompare(b.original_filename));
      return items;
    }
    if (sortBy === "name_desc") {
      items.sort((a, b) => b.original_filename.localeCompare(a.original_filename));
      return items;
    }
    items.sort((a, b) => b.sequence_number - a.sequence_number);
    return items;
  }, [filteredAssets, sortBy]);
  const heroCoverUrl = useMemo(() => {
    return assets.find((asset) => asset.thumbUrl)?.thumbUrl ?? null;
  }, [assets]);
  const [loading, setLoading] = useState(true);

  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const [creatingShare, setCreatingShare] = useState(false);
  const [shareLinks, setShareLinks] = useState<ShareLinkRow[]>([]);
  const [shareAllowDownload, setShareAllowDownload] = useState(true);
  const [sharePassword, setSharePassword] = useState("");
  const [shareExpiresAt, setShareExpiresAt] = useState("");
  const [shareExpiresInputType, setShareExpiresInputType] = useState<"text" | "date">("text");
  const activeShareLinks = useMemo(() => shareLinks.filter((link) => !link.revoked_at), [shareLinks]);
  const revokedShareLinksCount = useMemo(() => shareLinks.filter((link) => Boolean(link.revoked_at)).length, [shareLinks]);
  const [uploadQueue, setUploadQueue] = useState<UploadQueueItem[]>([]);
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [bulkTagsText, setBulkTagsText] = useState("");
  const [bulkEventType, setBulkEventType] = useState("");
  const [bulkCampus, setBulkCampus] = useState("");
  const [bulkPhotographer, setBulkPhotographer] = useState("");
  const [bulkClearTags, setBulkClearTags] = useState(false);
  const [bulkClearEventType, setBulkClearEventType] = useState(false);
  const [bulkClearCampus, setBulkClearCampus] = useState(false);
  const [bulkClearPhotographer, setBulkClearPhotographer] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkStatus, setBulkStatus] = useState<string | null>(null);

  const [lightbox, setLightbox] = useState<AssetRow | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [deletingAssetIds, setDeletingAssetIds] = useState<string[]>([]);
  const [openAssetMenuId, setOpenAssetMenuId] = useState<string | null>(null);
  const [editingAsset, setEditingAsset] = useState<AssetRow | null>(null);
  const [assetEditorName, setAssetEditorName] = useState("");
  const [assetEditorTags, setAssetEditorTags] = useState<string[]>([]);
  const [assetEditorTagInput, setAssetEditorTagInput] = useState("");
  const [assetEditorEventType, setAssetEditorEventType] = useState("");
  const [assetEditorCampus, setAssetEditorCampus] = useState("");
  const [assetEditorPhotographer, setAssetEditorPhotographer] = useState("");
  const [assetEditorSaving, setAssetEditorSaving] = useState(false);
  const [assetEditorStatus, setAssetEditorStatus] = useState<string | null>(null);
  const dragDepthRef = useRef(0);

  function hasFilePayload(e: React.DragEvent) {
    return Array.from(e.dataTransfer?.types ?? []).includes("Files");
  }

  function onDragEnter(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!hasFilePayload(e)) return;
    dragDepthRef.current += 1;
    setIsDragging(true);
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!hasFilePayload(e)) return;
    e.dataTransfer.dropEffect = "copy";
    if (!isDragging) setIsDragging(true);
  }

  function onDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!hasFilePayload(e)) return;
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) {
      setIsDragging(false);
    }
  }

  function toggleAssetSelection(assetId: string) {
    setSelectedAssetIds((prev) =>
      prev.includes(assetId) ? prev.filter((id) => id !== assetId) : [...prev, assetId]
    );
  }

  function selectAllFilteredAssets() {
    const filteredIds = filteredAssets.map((a) => a.id);
    setSelectedAssetIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
  }

  function clearSelectedAssets() {
    setSelectedAssetIds([]);
  }

  const hasAssetEditorChanges = useMemo(() => {
    if (!editingAsset) return false;

    const baseName = (editingAsset.original_filename ?? "").trim();
    const baseEventType = (editingAsset.event_type ?? "").trim();
    const baseCampus = (editingAsset.campus ?? "").trim();
    const basePhotographer = (editingAsset.photographer ?? "").trim();
    const baseTags = [...(editingAsset.tags ?? [])].map((x) => x.trim()).filter(Boolean).sort().join("|");

    const currentName = assetEditorName.trim();
    const currentEventType = assetEditorEventType.trim();
    const currentCampus = assetEditorCampus.trim();
    const currentPhotographer = assetEditorPhotographer.trim();
    const currentTags = [...assetEditorTags].map((x) => x.trim()).filter(Boolean).sort().join("|");

    return (
      baseName !== currentName ||
      baseEventType !== currentEventType ||
      baseCampus !== currentCampus ||
      basePhotographer !== currentPhotographer ||
      baseTags !== currentTags
    );
  }, [
    editingAsset,
    assetEditorName,
    assetEditorEventType,
    assetEditorCampus,
    assetEditorPhotographer,
    assetEditorTags,
  ]);

  function openAssetEditor(asset: AssetRow) {
    setEditingAsset(asset);
    setAssetEditorName(asset.original_filename ?? "");
    setAssetEditorTags(asset.tags ?? []);
    setAssetEditorTagInput("");
    setAssetEditorEventType(asset.event_type ?? "");
    setAssetEditorCampus(asset.campus ?? "");
    setAssetEditorPhotographer(asset.photographer ?? "");
    setAssetEditorStatus(null);
    setOpenAssetMenuId(null);
  }

  function closeAssetEditor() {
    if (assetEditorSaving) return;
    if (hasAssetEditorChanges) {
      const confirmed = window.confirm("Discard unsaved changes?");
      if (!confirmed) return;
    }
    setEditingAsset(null);
    setAssetEditorStatus(null);
    setAssetEditorTagInput("");
  }

  function addEditorTag(raw: string) {
    const clean = raw.trim();
    if (!clean) return;
    setAssetEditorTags((prev) => (prev.includes(clean) ? prev : [...prev, clean]));
  }

  function removeEditorTag(tag: string) {
    setAssetEditorTags((prev) => prev.filter((item) => item !== tag));
  }

  async function saveAssetEditor() {
    if (!activeOrgId || !editingAsset) return;
    const trimmedName = assetEditorName.trim();
    if (!trimmedName) {
      setAssetEditorStatus("Asset name is required.");
      return;
    }

    setAssetEditorSaving(true);
    setAssetEditorStatus(null);
    try {
      const payload = {
        original_filename: trimmedName,
        tags: assetEditorTags,
        event_type: assetEditorEventType.trim() || null,
        campus: assetEditorCampus.trim() || null,
        photographer: assetEditorPhotographer.trim() || null,
      };

      const { data, error } = await supabase
        .from("assets")
        .update(payload)
        .eq("id", editingAsset.id)
        .eq("org_id", activeOrgId)
        .eq("album_id", albumId)
        .select("updated_at")
        .single();

      if (error) {
        setAssetEditorStatus(`Save failed: ${error.message}`);
        return;
      }
      const updatedAt = data?.updated_at ?? new Date().toISOString();

      setAssets((prev) =>
        prev.map((asset) =>
          asset.id === editingAsset.id
            ? {
                ...asset,
                original_filename: payload.original_filename,
                tags: payload.tags,
                event_type: payload.event_type,
                campus: payload.campus,
                photographer: payload.photographer,
                updated_at: updatedAt,
              }
            : asset
        )
      );

      setLightbox((prev) =>
        prev && prev.id === editingAsset.id
          ? {
              ...prev,
              original_filename: payload.original_filename,
              tags: payload.tags,
              event_type: payload.event_type,
              campus: payload.campus,
              photographer: payload.photographer,
              updated_at: updatedAt,
            }
          : prev
      );

      void logAuditEventClient({
        orgId: activeOrgId,
        eventType: "asset_metadata_updated",
        entityType: "asset",
        entityId: editingAsset.id,
        metadata: {
          albumId,
          updatedFields: ["original_filename", "tags", "event_type", "campus", "photographer"],
        },
      });

      setEditingAsset((prev) =>
        prev
          ? {
              ...prev,
              original_filename: payload.original_filename,
              tags: payload.tags,
              event_type: payload.event_type,
              campus: payload.campus,
              photographer: payload.photographer,
              updated_at: updatedAt,
            }
          : prev
      );
      setAssetEditorStatus("Saved.");
    } catch (error) {
      setAssetEditorStatus(`Save failed: ${getErrorMessage(error)}`);
    } finally {
      setAssetEditorSaving(false);
    }
  }

  async function onDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current = 0;
    setIsDragging(false);

    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;

    // Only allow images (MVP)
    const hasNonImage = Array.from(files).some((f) => !f.type.startsWith("image/"));
    if (hasNonImage) {
      alert("Please drop image files only.");
      return;
    }

    await handleUpload(files);
  }

  async function ensureSessionOrRedirect() {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      router.replace("/login");
      return null;
    }
    return data.session;
  }

async function load() {
  if (!activeOrgId) {
    setLoading(false);
    setStatus("No active organization selected.");
    return;
  }

  setLoading(true);
  setStatus(null);

  try {
    const session = await ensureSessionOrRedirect();
    if (!session) return;

    // Album
    const { data: albumData, error: albumErr } = await supabase
      .from("albums")
      .select("id,org_id,event_name,event_date,rights_status,created_at,department_id")
      .eq("id", albumId)
      .eq("org_id", activeOrgId)
      .single();

    if (albumErr) throw albumErr;
    setAlbum(albumData as AlbumRow);

    // Assets
    const { data: assetData, error: assetErr } = await supabase
      .from("assets")
      .select(
        "id,album_id,org_id,storage_path,original_filename,canonical_filename,sequence_number,mime_type,size_bytes,file_hash,processing_status,tags,event_type,campus,photographer,width,height,taken_at,created_at,updated_at"
      )
      .eq("album_id", albumId)
      .order("sequence_number", { ascending: true });

    if (assetErr) throw assetErr;

    const rows = (assetData ?? []) as AssetRow[];
    const withThumbs = await signUrls(rows);
    setAssets(withThumbs);

    const { data: linkData, error: linkError } = await supabase
      .from("share_links")
      .select("id,token,expires_at,allow_download,password_hash,revoked_at,created_at")
      .eq("album_id", albumId)
      .eq("org_id", activeOrgId)
      .order("created_at", { ascending: false });

    if (linkError) {
      setShareLinks([]);
      setShareStatus(`Share links unavailable: ${linkError.message}`);
    } else {
      setShareStatus(null);
      setShareLinks((linkData ?? []) as ShareLinkRow[]);
    }
  } catch (error: unknown) {
    setStatus(getErrorMessage(error) || "Failed to load album");
  } finally {
    setLoading(false);
  }
}

  useEffect(() => {
    if (orgLoading || !albumId) return;
    if (!activeOrgId) {
      setLoading(false);
      setStatus("No active organization selected.");
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [albumId, activeOrgId, orgLoading]);

  async function applyBulkMetadata() {
    if (!activeOrgId) return;
    if (selectedAssetIds.length === 0) {
      setBulkStatus("Select at least one asset.");
      return;
    }

    const payload: Record<string, unknown> = {};
    const tags = bulkTagsText.split(",").map((t) => t.trim()).filter(Boolean);

    if (bulkClearTags) {
      payload.tags = [];
    } else if (bulkTagsText.trim()) {
      payload.tags = tags;
    }

    if (bulkClearEventType) {
      payload.event_type = null;
    } else if (bulkEventType.trim()) {
      payload.event_type = bulkEventType.trim();
    }

    if (bulkClearCampus) {
      payload.campus = null;
    } else if (bulkCampus.trim()) {
      payload.campus = bulkCampus.trim();
    }

    if (bulkClearPhotographer) {
      payload.photographer = null;
    } else if (bulkPhotographer.trim()) {
      payload.photographer = bulkPhotographer.trim();
    }

    if (Object.keys(payload).length === 0) {
      setBulkStatus("Enter at least one metadata value to apply.");
      return;
    }

    setBulkSaving(true);
    setBulkStatus(null);
    try {
      const { error } = await supabase
        .from("assets")
        .update(payload)
        .eq("album_id", albumId)
        .eq("org_id", activeOrgId)
        .in("id", selectedAssetIds);

      if (error) {
        setBulkStatus(`Bulk update failed: ${error.message}`);
        return;
      }

      setAssets((prev) =>
        prev.map((a) => {
          if (!selectedAssetIds.includes(a.id)) return a;
          return {
            ...a,
            tags: (payload.tags as string[] | undefined) ?? a.tags,
            event_type: (payload.event_type as string | undefined) ?? a.event_type,
            campus: (payload.campus as string | undefined) ?? a.campus,
            photographer: (payload.photographer as string | undefined) ?? a.photographer,
          };
        })
      );

      setBulkStatus(`Bulk metadata applied to ${selectedAssetIds.length} assets.`);
    } catch (error) {
      setBulkStatus(`Bulk update failed: ${getErrorMessage(error)}`);
    } finally {
      setBulkSaving(false);
    }
  }

  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    if (!activeOrgId) {
      setStatus("No active organization selected.");
      return;
    }

    setUploading(true);
    setStatus(null);

    try {
      const session = await ensureSessionOrRedirect();
      if (!session) return;

      const fileArray = Array.from(files);
      const initialQueue: UploadQueueItem[] = fileArray.map((file, idx) => ({
        id: `${Date.now()}-${idx}-${file.name}`,
        filename: file.name,
        sizeBytes: file.size,
        status: "queued",
      }));
      setUploadQueue(initialQueue);

      const updateQueue = (id: string, patch: Partial<UploadQueueItem>) => {
        setUploadQueue((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
      };

      const hashHex = async (file: File) => {
        const buf = await file.arrayBuffer();
        const digest = await crypto.subtle.digest("SHA-256", buf);
        return Array.from(new Uint8Array(digest))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
      };

      if (!("crypto" in window) || !("subtle" in crypto)) {
        throw new Error("Web Crypto is not available in this browser.");
      }

      const hashesByQueueId: Record<string, string> = {};
      for (let i = 0; i < fileArray.length; i += 1) {
        const queueItem = initialQueue[i];
        const file = fileArray[i];
        updateQueue(queueItem.id, { status: "hashing" });
        const h = await hashHex(file);
        hashesByQueueId[queueItem.id] = h;
        updateQueue(queueItem.id, { status: "queued", hash: h });
      }

      const allHashes = Object.values(hashesByQueueId);
      const { data: existingByHash, error: hashCheckError } = await supabase
        .from("assets")
        .select("id,file_hash")
        .eq("org_id", activeOrgId)
        .in("file_hash", allHashes);

      if (hashCheckError) {
        throw new Error(
          `Duplicate check failed: ${hashCheckError.message}. Ensure PV-006 migration was applied (file_hash column).`
        );
      }

      const existingHashSet = new Set(
        ((existingByHash ?? []) as { id: string; file_hash: string | null }[])
          .map((row) => row.file_hash)
          .filter((h): h is string => Boolean(h))
      );

      // Determine starting sequence number
      const currentMaxSeq = assets.reduce((max, a) => Math.max(max, a.sequence_number), 0);
      let seq = currentMaxSeq + 1;
      let uploadedCount = 0;
      let duplicateCount = 0;
      let failedCount = 0;

      // Upload each file sequentially (MVP)
      for (let i = 0; i < fileArray.length; i += 1) {
        const file = fileArray[i];
        const queueItem = initialQueue[i];
        const fileHash = hashesByQueueId[queueItem.id];

        if (existingHashSet.has(fileHash)) {
          duplicateCount += 1;
          updateQueue(queueItem.id, {
            status: "duplicate",
            message: "Duplicate detected (hash already exists in this org).",
            hash: fileHash,
          });
          continue;
        }

        updateQueue(queueItem.id, { status: "uploading", hash: fileHash });

        const ext = safeFileExt(file.name);
        const originalFilename = file.name;

        // Simple canonical naming for MVP:
        // ALBUMID_0001.jpg (we'll replace later with SMACE convention)
        const canonicalFilename = `${albumId}_${String(seq).padStart(4, "0")}${ext ? "." + ext : ""}`;

        // Storage path: org/album/canonicalFilename
        const storagePath = `${activeOrgId}/${albumId}/${canonicalFilename}`;

        // Upload to Storage bucket "originals"
        const { error: upErr } = await supabase.storage
          .from("originals")
          .upload(storagePath, file, {
            upsert: false,
            contentType: file.type || undefined,
          });

        if (upErr) throw upErr;
        updateQueue(queueItem.id, { status: "saving" });

        // Insert asset row
        const { error: insErr } = await supabase.from("assets").insert({
          org_id: activeOrgId,
          album_id: albumId,
          storage_path: storagePath,
          original_filename: originalFilename,
          canonical_filename: canonicalFilename,
          sequence_number: seq,
          mime_type: file.type || "application/octet-stream",
          size_bytes: file.size,
          file_hash: fileHash,
          processing_status: "ready",
          tags: [],
          event_type: null,
          campus: null,
          photographer: null,
          width: null,
          height: null,
          taken_at: null,
          status: "ready",
          uploader_id: session.user.id,
        });

        if (insErr) {
          failedCount += 1;
          updateQueue(queueItem.id, { status: "error", message: insErr.message });
          continue;
        }

        uploadedCount += 1;
        updateQueue(queueItem.id, { status: "done", message: "Uploaded." });
        seq += 1;
        existingHashSet.add(fileHash);
      }

      setStatus(`Upload complete: ${uploadedCount} uploaded, ${duplicateCount} duplicate, ${failedCount} failed.`);
      if (uploadedCount > 0 || duplicateCount > 0 || failedCount > 0) {
        void logAuditEventClient({
          orgId: activeOrgId,
          eventType: "assets_uploaded_batch",
          entityType: "album",
          entityId: albumId,
          metadata: {
            uploadedCount,
            duplicateCount,
            failedCount,
            attemptedCount: fileArray.length,
          },
        });
      }
      await load();
    } catch (error: unknown) {
      console.error(error);
      setStatus("Upload failed: " + getErrorMessage(error));
    } finally {
      setUploading(false);
    }
  }

  async function getFreshSignedUrl(path: string) {
    const { data, error } = await supabase.storage
      .from("originals")
      .createSignedUrl(path, 60 * 60); // 1 hour

    if (error) throw error;
    return data?.signedUrl;
  }

  async function openAsset(a: AssetRow) {
    try {
      const url = await getFreshSignedUrl(a.storage_path);
      if (!url) throw new Error("No signed URL returned");
      window.open(url, "_blank", "noreferrer");
    } catch (error: unknown) {
      alert("Open failed: " + getErrorMessage(error));
    }
  }

  async function downloadAsset(a: AssetRow) {
    try {
      const url = await getFreshSignedUrl(a.storage_path);
      if (!url) throw new Error("No signed URL returned");

      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();

      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = a.canonical_filename || a.original_filename || "download";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (error: unknown) {
      alert("Download failed: " + getErrorMessage(error));
    }
  }

  async function deleteAssets(assetIds: string[]) {
    if (!activeOrgId || assetIds.length === 0) return;

    const targets = assets.filter((asset) => assetIds.includes(asset.id));
    if (targets.length === 0) return;

    const confirmed = window.confirm(
      targets.length === 1
        ? `Delete "${targets[0].original_filename}"? This cannot be undone.`
        : `Delete ${targets.length} photos? This cannot be undone.`
    );
    if (!confirmed) return;

    setStatus(null);
    if (targets.length > 1) setBulkDeleting(true);
    setDeletingAssetIds(assetIds);

    try {
      const { error: deleteRowError } = await supabase
        .from("assets")
        .delete()
        .eq("org_id", activeOrgId)
        .eq("album_id", albumId)
        .in("id", assetIds);

      if (deleteRowError) throw deleteRowError;

      const paths = targets.map((target) => target.storage_path).filter(Boolean);
      let storageWarning: string | null = null;
      if (paths.length > 0) {
        const { error: removeError } = await supabase.storage.from("originals").remove(paths);
        if (removeError) {
          storageWarning = removeError.message;
        }
      }

      setAssets((prev) => prev.filter((asset) => !assetIds.includes(asset.id)));
      setSelectedAssetIds((prev) => prev.filter((id) => !assetIds.includes(id)));
      setLightbox((prev) => (prev && assetIds.includes(prev.id) ? null : prev));

      if (storageWarning) {
        setStatus(`Photos removed from album, but file cleanup had an issue: ${storageWarning}`);
      } else {
        setStatus(
          `${targets.length} ${targets.length === 1 ? "photo" : "photos"} deleted.`
        );
      }

      void logAuditEventClient({
        orgId: activeOrgId,
        eventType: "assets_deleted",
        entityType: "album",
        entityId: albumId,
        metadata: {
          count: targets.length,
          storageWarning,
        },
      });
    } catch (error) {
      setStatus(`Delete failed: ${getErrorMessage(error)}`);
    } finally {
      setBulkDeleting(false);
      setDeletingAssetIds([]);
    }
  }

  async function createShareLink() {
    if (!activeOrgId || !albumId) return;
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
          albumId,
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
      await load();
    } catch (error) {
      setShareStatus(`Failed to create share link: ${getErrorMessage(error)}`);
    } finally {
      setCreatingShare(false);
    }
  }

  async function revokeShareLink(linkId: string) {
    if (!activeOrgId) return;
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
    setShareLinks((prev) => prev.map((x) => (x.id === linkId ? { ...x, revoked_at: new Date().toISOString() } : x)));
    void logAuditEventClient({
      orgId: activeOrgId,
      eventType: "share_link_revoked",
      entityType: "share_link",
      entityId: linkId,
      metadata: {
        albumId,
      },
    });
  }

  async function copyShareLink(token: string) {
    const url = `${window.location.origin}/share/${token}`;
    await navigator.clipboard.writeText(url);
    setShareStatus("Share link copied.");
  }
  function moveLightbox(delta: number) {
    if (!lightbox || assets.length === 0) return;

    const currentIndex = assets.findIndex((x) => x.id === lightbox.id);
    if (currentIndex === -1) return;

    const nextIndex = (currentIndex + delta + assets.length) % assets.length;
    setLightbox(assets[nextIndex]);
  }

  function prevLightbox() {
    moveLightbox(-1);
  }

  function nextLightbox() {
    moveLightbox(1);
  }

  useEffect(() => {
    if (!lightbox && !editingAsset) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (editingAsset) {
          closeAssetEditor();
        } else {
          setLightbox(null);
        }
      }
      if (!editingAsset && e.key === "ArrowLeft") prevLightbox();
      if (!editingAsset && e.key === "ArrowRight") nextLightbox();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightbox, assets, editingAsset, assetEditorSaving]);

  useEffect(() => {
    if (!editingAsset && !lightbox) return;
    const priorOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = priorOverflow;
    };
  }, [editingAsset, lightbox]);

  return (
    <MediaWorkspaceShell
      title="Photos"
      subtitle={album?.event_name ?? "Upload, browse, and deliver image assets."}
      sidebarLogoOnly
      actions={[
        {
          key: "upload",
          node: (
            <label className={`${buttonClass("primary")} cursor-pointer`}>
              <input
                type="file"
                className="hidden"
                accept="image/*"
                multiple
                disabled={uploading}
                onChange={(e) => handleUpload(e.target.files)}
              />
              {uploading ? "Uploading…" : "Upload photos"}
            </label>
          ),
        },
        {
          key: "back",
          node: (
            <Link href="/albums" className={buttonClass("secondary")}>
              Back to albums
            </Link>
          ),
        },
        {
          key: "branding",
          node: (
            <Link href="/settings/branding" className={buttonClass("secondary")}>
              Appearance
            </Link>
          ),
        },
        ...(isSuperAdmin
          ? [
              {
                key: "super",
                node: (
                  <Link href="/super-admin" className={buttonClass("secondary")}>
                    Super admin
                  </Link>
                ),
              },
            ]
          : []),
        {
          key: "signout",
          node: (
            <Button
              variant="secondary"
              onClick={async () => {
                await supabase.auth.signOut();
                router.replace("/login");
              }}
            >
              Sign out
            </Button>
          ),
        },
      ]}
      sidebarContent={
        <div className="space-y-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Album Stats</p>
            <p className="mt-1.5 text-sm text-slate-700">{assets.length} total photos</p>
            <p className="text-sm text-slate-700">{filteredAssets.length} matching search</p>
          </div>
          {album ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Rights</p>
              <Badge className="mt-1.5">{formatRights(album.rights_status)}</Badge>
            </div>
          ) : null}
        </div>
      }
    >
      <div onDragEnter={onDragEnter} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}>
        {isDragging && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/80">
            <div className="rounded-xl border border-white/20 bg-white/10 px-6 py-4 text-lg font-medium text-white">
              Drop photos to upload
              <div className="mt-2 text-sm text-slate-300">They’ll be added to this album</div>
            </div>
          </div>
        )}

        {loading ? (
          <p className="text-slate-600">Loading…</p>
        ) : status ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{status}</p>
        ) : null}

        {uploadQueue.length > 0 ? (
          <Card className="mt-3 border-slate-200 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">Upload Queue</h3>
              <p className="text-xs text-slate-500">{uploadQueue.length} files</p>
            </div>
            <ul className="mt-3 space-y-2">
              {uploadQueue.map((item) => (
                <li key={item.id} className="rounded-md border border-slate-200 px-3 py-2">
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-sm text-slate-800" title={item.filename}>
                      {item.filename}
                    </p>
                    <span className="text-xs font-medium text-slate-600">{item.status}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {(item.sizeBytes / 1024).toFixed(0)} KB
                    {item.message ? ` • ${item.message}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          </Card>
        ) : null}

        {album && (
          <Card className="overflow-hidden">
            <div className="relative h-36 overflow-hidden border-b border-slate-200 sm:h-44">
              {heroCoverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={heroCoverUrl}
                  alt={`${album.event_name} cover`}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : null}
              <div className={`absolute inset-0 ${heroCoverUrl ? "bg-slate-900/45" : "bg-gradient-to-r from-slate-900 to-slate-700"}`} />
              <div className="absolute inset-x-0 bottom-0 p-4 text-white sm:p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-100">Event Date: {formatDateMDY(album.event_date)}</p>
                <h2 className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">{album.event_name}</h2>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 px-4 py-3">
              <Badge>{assets.length} {assets.length === 1 ? "photo" : "photos"}</Badge>
              <Badge>Rights: {formatRights(album.rights_status)}</Badge>
              <Badge>Album ID: {album.id.slice(0, 8)}…</Badge>
            </div>
          </Card>
        )}

        <Card className="mt-4 border-slate-200 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Share Album</h3>
              <p className="mt-1 text-xs text-slate-500">
                Create secure external links with expiry, optional password, and download control. Revoked/expired links are retained for audit for up to 1 year.
              </p>
            </div>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
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
              onChange={(e) => setSharePassword(e.target.value)}
            />
            <Input
              type={shareExpiresInputType}
              placeholder="Expiration Date"
              value={shareExpiresAt}
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
                      <Button size="sm" variant="secondary" onClick={() => copyShareLink(link.token!)}>
                        Copy link
                      </Button>
                    ) : null}
                    <Button size="sm" variant="danger" onClick={() => revokeShareLink(link.id)}>
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
        </Card>

        <Card className="mt-4 p-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="w-full sm:max-w-md">
              <Input
                placeholder="Search photos"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <label className="sr-only" htmlFor="photo-sort">Sort photos</label>
              <select
                id="photo-sort"
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

        <section className="mt-4">
          <div>
            <h3 className="text-xl font-semibold text-slate-900">Photos</h3>
            <p className="mt-1 text-xs text-slate-400">
              {assets.length} total{query ? ` • ${sortedAssets.length} matching` : ""}
            </p>
          </div>

          {selectedAssetIds.length > 0 ? (
            <Card className="mt-3 border-slate-200 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm text-slate-700">
                  {selectedAssetIds.length} selected
                </p>
                <Button size="sm" variant="secondary" onClick={selectAllFilteredAssets}>
                  Select all shown
                </Button>
                <Button size="sm" variant="ghost" onClick={clearSelectedAssets}>
                  Clear
                </Button>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <Input
                  placeholder="Tags (comma separated)"
                  value={bulkTagsText}
                  onChange={(e) => setBulkTagsText(e.target.value)}
                  disabled={bulkClearTags}
                />
                <label className="flex items-center gap-2 text-xs text-slate-600">
                  <input
                    type="checkbox"
                    checked={bulkClearTags}
                    onChange={(e) => setBulkClearTags(e.target.checked)}
                  />
                  Clear tags
                </label>
                <Input
                  placeholder="Event type"
                  value={bulkEventType}
                  onChange={(e) => setBulkEventType(e.target.value)}
                  disabled={bulkClearEventType}
                />
                <label className="flex items-center gap-2 text-xs text-slate-600">
                  <input
                    type="checkbox"
                    checked={bulkClearEventType}
                    onChange={(e) => setBulkClearEventType(e.target.checked)}
                  />
                  Clear event type
                </label>
                <Input
                  placeholder="Campus"
                  value={bulkCampus}
                  onChange={(e) => setBulkCampus(e.target.value)}
                  disabled={bulkClearCampus}
                />
                <label className="flex items-center gap-2 text-xs text-slate-600">
                  <input
                    type="checkbox"
                    checked={bulkClearCampus}
                    onChange={(e) => setBulkClearCampus(e.target.checked)}
                  />
                  Clear campus
                </label>
                <Input
                  placeholder="Photographer"
                  value={bulkPhotographer}
                  onChange={(e) => setBulkPhotographer(e.target.value)}
                  disabled={bulkClearPhotographer}
                />
                <label className="flex items-center gap-2 text-xs text-slate-600">
                  <input
                    type="checkbox"
                    checked={bulkClearPhotographer}
                    onChange={(e) => setBulkClearPhotographer(e.target.checked)}
                  />
                  Clear photographer
                </label>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Button size="sm" variant="primary" onClick={applyBulkMetadata} disabled={bulkSaving}>
                  {bulkSaving ? "Applying…" : "Apply to selected"}
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => deleteAssets(selectedAssetIds)}
                  disabled={bulkDeleting}
                >
                  <IconDelete className="mr-1 h-3.5 w-3.5" />
                  {bulkDeleting ? "Deleting…" : "Delete selected"}
                </Button>
                {bulkStatus ? <p className="text-xs text-slate-600">{bulkStatus}</p> : null}
              </div>
            </Card>
          ) : null}

          {loading ? (
            <p className="mt-4 text-slate-600">Loading photos…</p>
          ) : sortedAssets.length === 0 ? (
            <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
              <p className="text-sm font-medium text-slate-800">No photos uploaded yet</p>
              <p className="mt-2 text-sm text-slate-600">Drag files into this area, or upload from your computer.</p>
              <label className={`${buttonClass("primary", "sm")} mt-5 inline-flex cursor-pointer`}>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  multiple
                  disabled={uploading}
                  onChange={(e) => handleUpload(e.target.files)}
                />
                {uploading ? "Uploading…" : "Upload photos"}
              </label>
            </div>
          ) : viewMode === "grid" ? (
            <div
              className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            >
              {sortedAssets.map((a) => (
                <div
                  key={a.id}
                  className="overflow-hidden rounded-lg border border-slate-200 bg-white"
                >
                  <div className="group relative aspect-square w-full bg-slate-100">
                    <button
                      type="button"
                      className="block h-full w-full"
                      onClick={() => {
                        setOpenAssetMenuId(null);
                        setLightbox(a);
                      }}
                      aria-label={`View ${a.canonical_filename}`}
                    >
                      {a.thumbUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={a.thumbUrl}
                          alt={a.canonical_filename}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-sm text-slate-500">
                          No preview
                        </div>
                      )}
                    </button>

                    <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/40 to-transparent opacity-90 transition sm:opacity-0 sm:group-hover:opacity-100" />

                    <label className="absolute left-2 top-2 z-10 inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-slate-200 bg-white/95 px-2 py-1 text-[11px] font-medium text-slate-700 shadow-sm backdrop-blur">
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5 rounded border-slate-300"
                        checked={selectedAssetIds.includes(a.id)}
                        onChange={() => toggleAssetSelection(a.id)}
                      />
                      Select
                    </label>

                    <div className="absolute right-2 top-2 z-20 flex items-center gap-1">
                      <button
                        type="button"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-slate-700 shadow-sm backdrop-blur transition hover:bg-slate-100"
                        aria-label="View"
                        title="View"
                        onClick={() => {
                          setOpenAssetMenuId(null);
                          setLightbox(a);
                        }}
                      >
                        <IconView className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-slate-700 shadow-sm backdrop-blur transition hover:bg-slate-100"
                        aria-label="Download"
                        title="Download"
                        onClick={() => {
                          setOpenAssetMenuId(null);
                          void downloadAsset(a);
                        }}
                      >
                        <IconDownload className="h-4 w-4" />
                      </button>
                      <div className="relative">
                        <button
                          type="button"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-slate-700 shadow-sm backdrop-blur transition hover:bg-slate-100"
                          aria-label="More actions"
                          title="More actions"
                          onClick={() => setOpenAssetMenuId((prev) => (prev === a.id ? null : a.id))}
                        >
                          <IconMore className="h-4 w-4" />
                        </button>
                        {openAssetMenuId === a.id ? (
                          <div className="absolute right-0 top-9 z-30 w-36 rounded-lg border border-slate-200 bg-white p-1 shadow-md">
                            <button
                              type="button"
                              className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
                              onClick={() => openAssetEditor(a)}
                            >
                              <IconEdit className="h-4 w-4" />
                              Edit
                            </button>
                            <button
                              type="button"
                              className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
                              onClick={() => {
                                setOpenAssetMenuId(null);
                                void openAsset(a);
                              }}
                            >
                              <IconOpen className="h-4 w-4" />
                              Open
                            </button>
                            <button
                              type="button"
                              className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-red-700 hover:bg-red-50"
                              onClick={() => {
                                setOpenAssetMenuId(null);
                                void deleteAssets([a.id]);
                              }}
                              disabled={deletingAssetIds.includes(a.id)}
                            >
                              <IconDelete className="h-4 w-4" />
                              {deletingAssetIds.includes(a.id) ? "Deleting…" : "Delete"}
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 border-t border-slate-200 p-3">
                    <p className="truncate text-sm font-medium text-slate-800" title={a.original_filename}>
                      {a.original_filename}
                    </p>
                    <p className="text-xs text-slate-500">
                      #{a.sequence_number} • {(a.size_bytes / 1024).toFixed(0)} KB
                    </p>
                    {(a.tags?.length || a.event_type || a.campus || a.photographer) ? (
                      <p className="line-clamp-1 text-xs text-slate-500">
                        {[a.event_type, a.campus, a.photographer, ...(a.tags ?? [])].filter(Boolean).join(" • ")}
                      </p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {sortedAssets.map((a) => (
                <Card key={a.id} className="border-slate-200 bg-white p-3 sm:p-4">
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      className="h-20 w-28 overflow-hidden rounded-md border border-slate-200 bg-slate-100"
                      onClick={() => setLightbox(a)}
                      aria-label={`View ${a.canonical_filename}`}
                    >
                      {a.thumbUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={a.thumbUrl} alt={a.canonical_filename} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-slate-500">No preview</div>
                      )}
                    </button>

                    <div className="min-w-0 flex-1">
                      <label className="mb-1 inline-flex cursor-pointer items-center gap-2 text-xs text-slate-600">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-slate-300"
                          checked={selectedAssetIds.includes(a.id)}
                          onChange={() => toggleAssetSelection(a.id)}
                        />
                        Select
                      </label>
                      <p className="truncate text-sm font-medium text-slate-800" title={a.original_filename}>{a.original_filename}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        #{a.sequence_number} • {(a.size_bytes / 1024).toFixed(0)} KB
                      </p>
                      {(a.tags?.length || a.event_type || a.campus || a.photographer) ? (
                        <p className="mt-1 line-clamp-1 text-xs text-slate-500">
                          {[a.event_type, a.campus, a.photographer, ...(a.tags ?? [])].filter(Boolean).join(" • ")}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Button size="sm" variant="ghost" onClick={() => setLightbox(a)}>
                        <IconView className="mr-1 h-3.5 w-3.5" />
                        View
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => openAssetEditor(a)}>
                        <IconEdit className="mr-1 h-3.5 w-3.5" />
                        Edit
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => openAsset(a)}>
                        <IconOpen className="mr-1 h-3.5 w-3.5" />
                        Open
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => downloadAsset(a)}>
                        <IconDownload className="mr-1 h-3.5 w-3.5" />
                        Download
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => deleteAssets([a.id])}
                        disabled={deletingAssetIds.includes(a.id)}
                      >
                        <IconDelete className="mr-1 h-3.5 w-3.5" />
                        {deletingAssetIds.includes(a.id) ? "Deleting…" : "Delete"}
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>

        {editingAsset ? (
          <div className="fixed inset-0 z-[60]">
            <button
              type="button"
              aria-label="Close asset editor"
              className="absolute inset-0 bg-slate-950/35"
              onClick={closeAssetEditor}
            />
            <aside className="absolute inset-y-0 right-0 w-full overflow-y-auto overscroll-contain bg-white shadow-2xl sm:max-w-xl sm:border-l sm:border-slate-200">
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-4 sm:px-5">
                <h3 className="text-2xl font-semibold tracking-tight text-slate-950">Asset Details</h3>
                <Button size="sm" variant="ghost" onClick={closeAssetEditor} disabled={assetEditorSaving}>
                  Close
                </Button>
              </div>

              <div className="space-y-5 px-4 py-4 pb-28 sm:px-5 sm:py-5 sm:pb-24">
                <div>
                  <p className="mb-2 text-sm font-semibold text-slate-900">Preview</p>
                  <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                    {editingAsset.thumbUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={editingAsset.thumbUrl}
                        alt={editingAsset.original_filename}
                        className="h-64 w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-64 items-center justify-center text-sm text-slate-500">No preview</div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-900">Asset name</label>
                  <Input
                    value={assetEditorName}
                    onChange={(e) => setAssetEditorName(e.target.value)}
                    placeholder="Asset name"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-900">Tags</label>
                  <div className="rounded-lg border border-slate-200 px-3 py-2">
                    {assetEditorTags.length > 0 ? (
                      <div className="mb-2 flex flex-wrap gap-2">
                        {assetEditorTags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700"
                          >
                            {tag}
                            <button
                              type="button"
                              className="text-slate-500 hover:text-slate-800"
                              aria-label={`Remove ${tag}`}
                              onClick={() => removeEditorTag(tag)}
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    ) : null}
                    <Input
                      value={assetEditorTagInput}
                      onChange={(e) => setAssetEditorTagInput(e.target.value)}
                      placeholder="Type a tag and press Enter"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === ",") {
                          e.preventDefault();
                          addEditorTag(assetEditorTagInput.replace(/,$/, ""));
                          setAssetEditorTagInput("");
                        }
                      }}
                      onBlur={() => {
                        if (assetEditorTagInput.trim()) {
                          addEditorTag(assetEditorTagInput);
                          setAssetEditorTagInput("");
                        }
                      }}
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-slate-900">Event type</label>
                    <Input
                      value={assetEditorEventType}
                      onChange={(e) => setAssetEditorEventType(e.target.value)}
                      placeholder="e.g., Graduation"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-slate-900">Campus</label>
                    <Input
                      value={assetEditorCampus}
                      onChange={(e) => setAssetEditorCampus(e.target.value)}
                      placeholder="e.g., Downtown"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-sm font-semibold text-slate-900">Photographer</label>
                    <Input
                      value={assetEditorPhotographer}
                      onChange={(e) => setAssetEditorPhotographer(e.target.value)}
                      placeholder="Photographer name"
                    />
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-sm font-semibold text-slate-900">Asset details</p>
                  <div className="overflow-hidden rounded-lg border border-slate-200">
                    <dl className="divide-y divide-slate-200 text-sm">
                      <div className="grid grid-cols-[140px_1fr] gap-3 px-3 py-2">
                        <dt className="text-slate-500">Created</dt>
                        <dd className="text-slate-800">{formatDateTimeMDY(editingAsset.created_at)}</dd>
                      </div>
                      <div className="grid grid-cols-[140px_1fr] gap-3 px-3 py-2">
                        <dt className="text-slate-500">Updated</dt>
                        <dd className="text-slate-800">
                          {editingAsset.updated_at ? formatDateTimeMDY(editingAsset.updated_at) : "Not available"}
                        </dd>
                      </div>
                      <div className="grid grid-cols-[140px_1fr] gap-3 px-3 py-2">
                        <dt className="text-slate-500">File format</dt>
                        <dd className="text-slate-800">{editingAsset.mime_type || "Unknown"}</dd>
                      </div>
                      <div className="grid grid-cols-[140px_1fr] gap-3 px-3 py-2">
                        <dt className="text-slate-500">File size</dt>
                        <dd className="text-slate-800">{(editingAsset.size_bytes / 1024).toFixed(0)} KB</dd>
                      </div>
                      <div className="grid grid-cols-[140px_1fr] gap-3 px-3 py-2">
                        <dt className="text-slate-500">Image size</dt>
                        <dd className="text-slate-800">
                          {editingAsset.width && editingAsset.height ? `${editingAsset.width}×${editingAsset.height}px` : "Unknown"}
                        </dd>
                      </div>
                      <div className="grid grid-cols-[140px_1fr] gap-3 px-3 py-2">
                        <dt className="text-slate-500">Taken at</dt>
                        <dd className="text-slate-800">
                          {editingAsset.taken_at ? formatDateTimeMDY(editingAsset.taken_at) : "Not set"}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>
              </div>

              <div className="sticky bottom-0 border-t border-slate-200 bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-5 sm:py-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="min-h-4 text-xs text-slate-600">{assetEditorStatus ?? " "}</p>
                  <div className="flex items-center justify-end gap-2">
                  <Button size="sm" variant="secondary" onClick={closeAssetEditor} disabled={assetEditorSaving}>
                    Cancel
                  </Button>
                  <Button size="sm" variant="primary" onClick={saveAssetEditor} disabled={assetEditorSaving}>
                    {assetEditorSaving ? "Saving…" : "Save changes"}
                  </Button>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        ) : null}

        {lightbox && (
          <div
            className="fixed inset-0 z-50 bg-black/90 p-0 sm:flex sm:items-center sm:justify-center sm:bg-black/85 sm:p-4 sm:p-6"
            onClick={() => setLightbox(null)}
          >
            <div className="flex h-full w-full flex-col sm:h-auto sm:max-w-5xl" onClick={(e) => e.stopPropagation()}>
              <div className="hidden items-center justify-between text-sm text-slate-300 sm:mb-3 sm:flex">
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="ghost" className="bg-white/10 px-2 py-1 hover:bg-white/20" onClick={prevLightbox}>
                    ←
                  </Button>

                  <Button size="sm" variant="ghost" className="bg-white/10 px-2 py-1 hover:bg-white/20" onClick={nextLightbox}>
                    →
                  </Button>

                  <span className="ml-2 truncate">{lightbox.canonical_filename}</span>
                  <span className="ml-2 text-slate-500">
                    {Math.max(assets.findIndex((x) => x.id === lightbox.id) + 1, 1)}/{assets.length}
                  </span>
                </div>

                <Button size="sm" variant="ghost" className="bg-white/10 hover:bg-white/20" onClick={() => setLightbox(null)}>
                  Close
                </Button>
              </div>

              <div className="flex min-h-0 flex-1 items-center justify-center px-2 py-2 sm:px-0 sm:py-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={lightbox.thumbUrl ?? ""}
                  alt={lightbox.canonical_filename}
                  className="max-h-full w-full rounded object-contain sm:max-h-[80vh]"
                  onClick={nextLightbox}
                />
              </div>

              <div className="border-t border-white/10 bg-black/70 px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-slate-200 sm:hidden">
                <p className="truncate text-sm">{lightbox.canonical_filename}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {Math.max(assets.findIndex((x) => x.id === lightbox.id) + 1, 1)}/{assets.length}
                </p>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <Button size="sm" variant="ghost" className="bg-white/10 px-3 py-2 hover:bg-white/20" onClick={prevLightbox}>
                    Prev
                  </Button>
                  <Button size="sm" variant="ghost" className="bg-white/10 px-3 py-2 hover:bg-white/20" onClick={nextLightbox}>
                    Next
                  </Button>
                  <Button size="sm" variant="ghost" className="bg-white/10 px-3 py-2 hover:bg-white/20" onClick={() => setLightbox(null)}>
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </MediaWorkspaceShell>
  );
}
