"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MediaWorkspaceShell } from "@/components/layout/media-workspace-shell";
import { Card } from "@/components/ui/card";
import { Button, buttonClass } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BodyText, Eyebrow, FieldLabel, LabelText, MetaText, SectionTitle } from "@/components/ui/typography";
import { useOrg } from "@/components/org/org-provider";
import { supabase } from "@/lib/supabaseClient";
import { defaultMarketingHomepageContent, MarketingHomepageContent, normalizeMarketingHomepageContent } from "@/lib/marketing-homepage-content";
import { formatDateTimeMDY } from "@/lib/date-format";

type VersionRow = {
  id: number;
  updated_at: string;
  updated_by: string | null;
};

function textAreaClass() {
  return "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-900";
}

export default function SuperAdminHomepageCmsPage() {
  const router = useRouter();
  const { loading, isSuperAdmin } = useOrg();
  const [content, setContent] = useState<MarketingHomepageContent>(defaultMarketingHomepageContent);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [uploadingSlot, setUploadingSlot] = useState<string | null>(null);
  const [historyBusy, setHistoryBusy] = useState(false);
  const [historyRows, setHistoryRows] = useState<VersionRow[]>([]);

  useEffect(() => {
    if (!loading && !isSuperAdmin) {
      router.replace("/albums");
    }
  }, [isSuperAdmin, loading, router]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const response = await fetch("/api/marketing-homepage", { cache: "no-store" });
        const body = (await response.json()) as { content?: unknown };
        if (!mounted) return;
        setContent(normalizeMarketingHomepageContent(body.content));
      } catch {
        if (!mounted) return;
        setContent(defaultMarketingHomepageContent);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  async function loadHistory() {
    setHistoryBusy(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) return;
      const response = await fetch("/api/super-admin/marketing-homepage/history", {
        headers: { authorization: `Bearer ${accessToken}` },
      });
      const body = (await response.json()) as { versions?: VersionRow[] };
      if (!response.ok) return;
      setHistoryRows(body.versions ?? []);
    } finally {
      setHistoryBusy(false);
    }
  }

  useEffect(() => {
    void loadHistory();
  }, []);

  function setPath(path: string, value: string) {
    setContent((prev) => {
      const next = structuredClone(prev);
      const keys = path.split(".");
      let cursor: Record<string, unknown> = next as unknown as Record<string, unknown>;
      for (let i = 0; i < keys.length - 1; i += 1) {
        const key = keys[i];
        cursor[key] = cursor[key] as unknown as Record<string, unknown>;
        cursor = cursor[key] as Record<string, unknown>;
      }
      cursor[keys[keys.length - 1]] = value;
      return normalizeMarketingHomepageContent(next);
    });
  }

  function setBullet(featureIndex: number, bulletIndex: number, value: string) {
    setContent((prev) => {
      const next = structuredClone(prev);
      const feature = next.features.items[featureIndex];
      if (!feature) return prev;
      feature.bullets[bulletIndex] = value;
      return normalizeMarketingHomepageContent(next);
    });
  }

  function applyLatestDefaults() {
    setContent(structuredClone(defaultMarketingHomepageContent));
    setStatus("Loaded latest recommended homepage copy and structure. Click Save changes to publish.");
  }

  async function save() {
    setStatus(null);
    setBusy(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        setStatus("Not authenticated. Please sign in again.");
        return;
      }

      const response = await fetch("/api/super-admin/marketing-homepage", {
        method: "PUT",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ content }),
      });

      const body = (await response.json()) as { error?: string };
      if (!response.ok) {
        setStatus(body.error ?? "Failed to save homepage content.");
        return;
      }
      setStatus("Homepage content saved.");
      void loadHistory();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatus("Save failed: " + message);
    } finally {
      setBusy(false);
    }
  }

  async function uploadFeatureImage(featureIndex: number, file: File) {
    const slot = `feature-${featureIndex + 1}`;
    setUploadingSlot(slot);
    setStatus(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        setStatus("Not authenticated. Please sign in again.");
        return;
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("slot", slot);

      const response = await fetch("/api/super-admin/marketing-homepage/upload-image", {
        method: "POST",
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      });

      const body = (await response.json()) as { error?: string; storageRef?: string };
      if (!response.ok || !body.storageRef) {
        setStatus(body.error ?? "Image upload failed.");
        return;
      }

      setPath(`features.items.${featureIndex}.imageUrl`, body.storageRef);
      setStatus("Image uploaded. Save changes to publish.");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatus("Image upload failed: " + message);
    } finally {
      setUploadingSlot(null);
    }
  }

  async function uploadHeroImage(file: File) {
    const slot = "hero";
    setUploadingSlot(slot);
    setStatus(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        setStatus("Not authenticated. Please sign in again.");
        return;
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("slot", slot);

      const response = await fetch("/api/super-admin/marketing-homepage/upload-image", {
        method: "POST",
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      });

      const body = (await response.json()) as { error?: string; storageRef?: string };
      if (!response.ok || !body.storageRef) {
        setStatus(body.error ?? "Image upload failed.");
        return;
      }

      setPath("hero.imageUrl", body.storageRef);
      setStatus("Hero image uploaded. Save changes to publish.");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatus("Image upload failed: " + message);
    } finally {
      setUploadingSlot(null);
    }
  }

  async function restoreVersion(versionId: number) {
    setBusy(true);
    setStatus(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        setStatus("Not authenticated. Please sign in again.");
        return;
      }

      const response = await fetch("/api/super-admin/marketing-homepage/restore", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ versionId }),
      });
      const body = (await response.json()) as { error?: string; content?: unknown };
      if (!response.ok) {
        setStatus(body.error ?? "Restore failed.");
        return;
      }

      setContent(normalizeMarketingHomepageContent(body.content));
      setStatus("Version restored.");
      void loadHistory();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatus("Restore failed: " + message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen">
        <div className="mx-auto max-w-5xl p-6 sm:p-8">
          <p className="text-slate-600">Loading homepage editor…</p>
        </div>
      </main>
    );
  }

  if (!isSuperAdmin) return null;

  return (
    <MediaWorkspaceShell
      title="Homepage CMS"
      subtitle="Edit public homepage copy and imagery without touching code."
      actions={[
        {
          key: "defaults",
          node: (
            <Button type="button" variant="secondary" onClick={applyLatestDefaults}>
              Apply recommended defaults
            </Button>
          ),
        },
        {
          key: "preview",
          node: (
            <Link href="/" className={buttonClass("secondary")}>
              Open homepage
            </Link>
          ),
        },
        {
          key: "save",
          node: (
            <Button type="button" variant="primary" onClick={save} disabled={busy}>
              {busy ? "Saving…" : "Save changes"}
            </Button>
          ),
        },
      ]}
    >
      <Card className="p-5 sm:p-6">
        <SectionTitle as="h2">Hero</SectionTitle>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <FieldLabel>Book demo URL (Calendly)</FieldLabel>
            <Input
              className="mt-1.5"
              value={content.nav.bookDemoUrl}
              onChange={(e) => setPath("nav.bookDemoUrl", e.target.value)}
              placeholder="https://calendly.com/your-handle/your-event"
            />
            <MetaText className="mt-1">Used by the top nav and hero Book demo buttons.</MetaText>
          </div>
          <div>
            <FieldLabel>Badge</FieldLabel>
            <Input className="mt-1.5" value={content.hero.badge} onChange={(e) => setPath("hero.badge", e.target.value)} />
          </div>
          <div>
            <FieldLabel>Trust line</FieldLabel>
            <Input className="mt-1.5" value={content.hero.trust} onChange={(e) => setPath("hero.trust", e.target.value)} />
          </div>
          <div>
            <FieldLabel>Title</FieldLabel>
            <Input className="mt-1.5" value={content.hero.title} onChange={(e) => setPath("hero.title", e.target.value)} />
          </div>
          <div>
            <FieldLabel>Title emphasis</FieldLabel>
            <Input className="mt-1.5" value={content.hero.emphasis} onChange={(e) => setPath("hero.emphasis", e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <FieldLabel>Subtitle</FieldLabel>
            <textarea className={`${textAreaClass()} mt-1.5`} rows={3} value={content.hero.subtitle} onChange={(e) => setPath("hero.subtitle", e.target.value)} />
          </div>
          <div>
            <FieldLabel>Primary CTA</FieldLabel>
            <Input className="mt-1.5" value={content.hero.primaryCta} onChange={(e) => setPath("hero.primaryCta", e.target.value)} />
          </div>
          <div>
            <FieldLabel>Secondary CTA</FieldLabel>
            <Input className="mt-1.5" value={content.hero.secondaryCta} onChange={(e) => setPath("hero.secondaryCta", e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <FieldLabel>Hero image URL</FieldLabel>
            <Input
              className="mt-1.5"
              value={content.hero.imageUrl}
              onChange={(e) => setPath("hero.imageUrl", e.target.value)}
              placeholder="/images/home/hero.jpg or storage://..."
            />
            <div className="mt-2 flex items-center gap-2">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void uploadHeroImage(file);
                  e.currentTarget.value = "";
                }}
                className="text-xs text-slate-600"
              />
              {uploadingSlot === "hero" ? <MetaText as="span">Uploading…</MetaText> : null}
            </div>
            <MetaText className="mt-1">If empty, the current mockup illustration remains in place.</MetaText>
          </div>
        </div>
      </Card>

      <Card className="p-5 sm:p-6">
        <SectionTitle as="h2">Trusted Logos + Metrics + How It Works</SectionTitle>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <FieldLabel>Trusted by label</FieldLabel>
            <Input className="mt-1.5" value={content.trusted.label} onChange={(e) => setPath("trusted.label", e.target.value)} />
          </div>
          {content.trusted.logos.slice(0, 6).map((logo, index) => (
            <div key={`trusted-logo-${index}`} className="rounded-lg border border-slate-200 p-3 sm:col-span-2">
              <Eyebrow>{`Trusted logo ${index + 1}`}</Eyebrow>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                <div>
                  <FieldLabel>Name (alt text)</FieldLabel>
                  <Input className="mt-1.5" value={logo.name} onChange={(e) => setPath(`trusted.logos.${index}.name`, e.target.value)} />
                </div>
                <div>
                  <FieldLabel>Logo URL</FieldLabel>
                  <Input
                    className="mt-1.5"
                    value={logo.logoUrl}
                    onChange={(e) => setPath(`trusted.logos.${index}.logoUrl`, e.target.value)}
                    placeholder="https://... or /images/..."
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-4">
          {content.metrics.items.slice(0, 3).map((metric, index) => (
            <div key={`metric-${index}`} className="rounded-lg border border-slate-200 p-3">
              <Eyebrow>{`Metric ${index + 1}`}</Eyebrow>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                <div>
                  <FieldLabel>Value</FieldLabel>
                  <Input className="mt-1.5" value={metric.value} onChange={(e) => setPath(`metrics.items.${index}.value`, e.target.value)} />
                </div>
                <div>
                  <FieldLabel>Label</FieldLabel>
                  <Input className="mt-1.5" value={metric.label} onChange={(e) => setPath(`metrics.items.${index}.label`, e.target.value)} />
                </div>
                <div className="sm:col-span-2">
                  <FieldLabel>Detail</FieldLabel>
                  <textarea
                    className={`${textAreaClass()} mt-1.5`}
                    rows={2}
                    value={metric.detail}
                    onChange={(e) => setPath(`metrics.items.${index}.detail`, e.target.value)}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <FieldLabel>How it works label</FieldLabel>
            <Input className="mt-1.5" value={content.howItWorks.label} onChange={(e) => setPath("howItWorks.label", e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <FieldLabel>How it works title</FieldLabel>
            <Input className="mt-1.5" value={content.howItWorks.title} onChange={(e) => setPath("howItWorks.title", e.target.value)} />
          </div>
        </div>
        <div className="mt-4 grid gap-4">
          {content.howItWorks.steps.slice(0, 3).map((step, index) => (
            <div key={`how-step-${index}`} className="rounded-lg border border-slate-200 p-3">
              <Eyebrow>{`Step ${index + 1}`}</Eyebrow>
              <div className="mt-2 grid gap-3">
                <div>
                  <FieldLabel>Title</FieldLabel>
                  <Input className="mt-1.5" value={step.title} onChange={(e) => setPath(`howItWorks.steps.${index}.title`, e.target.value)} />
                </div>
                <div>
                  <FieldLabel>Body</FieldLabel>
                  <textarea
                    className={`${textAreaClass()} mt-1.5`}
                    rows={2}
                    value={step.body}
                    onChange={(e) => setPath(`howItWorks.steps.${index}.body`, e.target.value)}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-5 sm:p-6">
        <SectionTitle as="h2">Why + Testimonials</SectionTitle>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <FieldLabel>Why label</FieldLabel>
            <Input className="mt-1.5" value={content.why.label} onChange={(e) => setPath("why.label", e.target.value)} />
          </div>
          <div>
            <FieldLabel>Testimonials label</FieldLabel>
            <Input className="mt-1.5" value={content.testimonials.label} onChange={(e) => setPath("testimonials.label", e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <FieldLabel>Why title</FieldLabel>
            <Input className="mt-1.5" value={content.why.title} onChange={(e) => setPath("why.title", e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <FieldLabel>Testimonials title</FieldLabel>
            <Input className="mt-1.5" value={content.testimonials.title} onChange={(e) => setPath("testimonials.title", e.target.value)} />
          </div>
        </div>
      </Card>

      <Card className="p-5 sm:p-6">
        <SectionTitle as="h2">Security Highlights</SectionTitle>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <FieldLabel>Section label</FieldLabel>
            <Input className="mt-1.5" value={content.security.label} onChange={(e) => setPath("security.label", e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <FieldLabel>Section title</FieldLabel>
            <Input className="mt-1.5" value={content.security.title} onChange={(e) => setPath("security.title", e.target.value)} />
          </div>
        </div>
        <div className="mt-4 grid gap-4">
          {content.security.items.slice(0, 6).map((item, index) => (
            <div key={`${index}-${item.title}`} className="rounded-lg border border-slate-200 p-3">
              <Eyebrow>{`Item ${index + 1}`}</Eyebrow>
              <div className="mt-2 grid gap-3">
                <div>
                  <FieldLabel>Title</FieldLabel>
                  <Input
                    className="mt-1.5"
                    value={item.title}
                    onChange={(e) => setPath(`security.items.${index}.title`, e.target.value)}
                  />
                </div>
                <div>
                  <FieldLabel>Body</FieldLabel>
                  <textarea
                    className={`${textAreaClass()} mt-1.5`}
                    rows={2}
                    value={item.body}
                    onChange={(e) => setPath(`security.items.${index}.body`, e.target.value)}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-5 sm:p-6">
        <SectionTitle as="h2">Feature Sections</SectionTitle>
        <BodyText muted className="mt-1">Add an image URL or upload directly from your computer.</BodyText>
        <div className="mt-4 grid gap-6">
          {content.features.items.slice(0, 2).map((feature, featureIndex) => (
            <div key={featureIndex} className="rounded-lg border border-slate-200 p-4">
              <LabelText>{`Feature ${featureIndex + 1}`}</LabelText>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <div>
                  <FieldLabel>Label</FieldLabel>
                  <Input className="mt-1.5" value={feature.label} onChange={(e) => setPath(`features.items.${featureIndex}.label`, e.target.value)} />
                </div>
                <div>
                  <FieldLabel>Image URL</FieldLabel>
                  <Input className="mt-1.5" value={feature.imageUrl} onChange={(e) => setPath(`features.items.${featureIndex}.imageUrl`, e.target.value)} placeholder="/images/home/feature-1.jpg" />
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void uploadFeatureImage(featureIndex, file);
                        e.currentTarget.value = "";
                      }}
                      className="text-xs text-slate-600"
                    />
                    {uploadingSlot === `feature-${featureIndex + 1}` ? <MetaText as="span">Uploading…</MetaText> : null}
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <FieldLabel>Title</FieldLabel>
                  <Input className="mt-1.5" value={feature.title} onChange={(e) => setPath(`features.items.${featureIndex}.title`, e.target.value)} />
                </div>
                <div className="sm:col-span-2">
                  <FieldLabel>Body</FieldLabel>
                  <textarea className={`${textAreaClass()} mt-1.5`} rows={3} value={feature.body} onChange={(e) => setPath(`features.items.${featureIndex}.body`, e.target.value)} />
                </div>
                <div>
                  <FieldLabel>Bullet 1</FieldLabel>
                  <Input className="mt-1.5" value={feature.bullets[0] ?? ""} onChange={(e) => setBullet(featureIndex, 0, e.target.value)} />
                </div>
                <div>
                  <FieldLabel>Bullet 2</FieldLabel>
                  <Input className="mt-1.5" value={feature.bullets[1] ?? ""} onChange={(e) => setBullet(featureIndex, 1, e.target.value)} />
                </div>
                <div className="sm:col-span-2">
                  <FieldLabel>Bullet 3</FieldLabel>
                  <Input className="mt-1.5" value={feature.bullets[2] ?? ""} onChange={(e) => setBullet(featureIndex, 2, e.target.value)} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-5 sm:p-6">
        <SectionTitle as="h2">Version History</SectionTitle>
        <BodyText muted className="mt-1">Each save stores the previous homepage version. Restore at any time.</BodyText>
        {historyBusy ? (
          <BodyText muted className="mt-3">Loading history…</BodyText>
        ) : historyRows.length === 0 ? (
          <BodyText muted className="mt-3">No previous versions yet.</BodyText>
        ) : (
          <ul className="mt-3 space-y-2">
            {historyRows.map((row) => (
              <li key={row.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                <div>
                  <LabelText>{`Version #${row.id}`}</LabelText>
                  <MetaText>{formatDateTimeMDY(row.updated_at)}</MetaText>
                </div>
                <Button type="button" size="sm" variant="secondary" onClick={() => restoreVersion(row.id)}>
                  Restore
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="p-5 sm:p-6">
        <SectionTitle as="h2">CTA + Footer</SectionTitle>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <FieldLabel>CTA label</FieldLabel>
            <Input className="mt-1.5" value={content.cta.label} onChange={(e) => setPath("cta.label", e.target.value)} />
          </div>
          <div>
            <FieldLabel>Contact email</FieldLabel>
            <Input className="mt-1.5" value={content.footer.contactEmail} onChange={(e) => setPath("footer.contactEmail", e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <FieldLabel>CTA title</FieldLabel>
            <Input className="mt-1.5" value={content.cta.title} onChange={(e) => setPath("cta.title", e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <FieldLabel>CTA body</FieldLabel>
            <textarea className={`${textAreaClass()} mt-1.5`} rows={3} value={content.cta.body} onChange={(e) => setPath("cta.body", e.target.value)} />
          </div>
          <div>
            <FieldLabel>CTA primary button</FieldLabel>
            <Input className="mt-1.5" value={content.cta.primaryCta} onChange={(e) => setPath("cta.primaryCta", e.target.value)} />
          </div>
        </div>
      </Card>

      {status ? <BodyText>{status}</BodyText> : null}
    </MediaWorkspaceShell>
  );
}
