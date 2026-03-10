import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { defaultMarketingHomepageContent, normalizeMarketingHomepageContent } from "@/lib/marketing-homepage-content";

function parseStorageRef(value: string | null | undefined) {
  if (!value || !value.startsWith("storage://")) return null;
  const raw = value.slice("storage://".length);
  const slashIndex = raw.indexOf("/");
  if (slashIndex <= 0 || slashIndex === raw.length - 1) return null;
  return {
    bucket: raw.slice(0, slashIndex),
    path: raw.slice(slashIndex + 1),
  };
}

function getEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;
  return { supabaseUrl, serviceRoleKey };
}

export async function GET() {
  const env = getEnv();
  if (!env) {
    return NextResponse.json({ content: defaultMarketingHomepageContent }, { status: 200 });
  }

  try {
    const adminSupabase = createClient(env.supabaseUrl, env.serviceRoleKey);
    const { data, error } = await adminSupabase
      .from("marketing_pages")
      .select("content")
      .eq("slug", "home")
      .maybeSingle();

    if (error) {
      return NextResponse.json({ content: defaultMarketingHomepageContent }, { status: 200 });
    }

    const content = normalizeMarketingHomepageContent(data?.content ?? defaultMarketingHomepageContent);

    const heroStorageRef = parseStorageRef(content.hero.imageUrl);
    let signedHeroImageUrl = content.hero.imageUrl;
    if (heroStorageRef) {
      const { data: signedHeroData, error: signedHeroError } = await adminSupabase.storage
        .from(heroStorageRef.bucket)
        .createSignedUrl(heroStorageRef.path, 60 * 60 * 24);

      if (!signedHeroError && signedHeroData?.signedUrl) {
        signedHeroImageUrl = signedHeroData.signedUrl;
      }
    }

    const signedFeatures = await Promise.all(
      content.features.items.map(async (feature) => {
        const storageRef = parseStorageRef(feature.imageUrl);
        if (!storageRef) return feature;

        const { data: signedData, error: signedError } = await adminSupabase.storage
          .from(storageRef.bucket)
          .createSignedUrl(storageRef.path, 60 * 60 * 24);

        if (signedError || !signedData?.signedUrl) return feature;
        return {
          ...feature,
          imageUrl: signedData.signedUrl,
        };
      })
    );

    return NextResponse.json(
      {
        content: {
          ...content,
          hero: {
            ...content.hero,
            imageUrl: signedHeroImageUrl,
          },
          features: {
            ...content.features,
            items: signedFeatures,
          },
        },
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json({ content: defaultMarketingHomepageContent }, { status: 200 });
  }
}
