export type MarketingWhyCard = {
  title: string;
  body: string;
};

export type MarketingFeature = {
  label: string;
  title: string;
  body: string;
  bullets: string[];
  imageUrl: string;
  theme: "teal" | "navy";
};

export type MarketingTestimonial = {
  quote: string;
  author: string;
  role: string;
};

export type MarketingSecurityItem = {
  title: string;
  body: string;
};

export type MarketingHomepageContent = {
  nav: {
    featuresText: string;
    testimonialsText: string;
    signInText: string;
    bookDemoText: string;
  };
  hero: {
    badge: string;
    title: string;
    emphasis: string;
    subtitle: string;
    primaryCta: string;
    secondaryCta: string;
    trust: string;
  };
  why: {
    label: string;
    title: string;
    cards: MarketingWhyCard[];
  };
  features: {
    items: MarketingFeature[];
  };
  testimonials: {
    label: string;
    title: string;
    items: MarketingTestimonial[];
  };
  security: {
    label: string;
    title: string;
    items: MarketingSecurityItem[];
  };
  cta: {
    label: string;
    title: string;
    body: string;
    primaryCta: string;
    secondaryCta: string;
  };
  footer: {
    featuresText: string;
    pricingText: string;
    privacyText: string;
    termsText: string;
    contactText: string;
    copyright: string;
    contactEmail: string;
  };
};

export const defaultMarketingHomepageContent: MarketingHomepageContent = {
  nav: {
    featuresText: "Features",
    testimonialsText: "Testimonials",
    signInText: "Sign in",
    bookDemoText: "Book demo",
  },
  hero: {
    badge: "Built for Adult Education Teams",
    title: "Photo & brand assets for adult schools,",
    emphasis: "in one place.",
    subtitle:
      "PhotoVault gives adult schools a secure, colorful DAM to organize event photos, protect brand consistency, and share media with confidence.",
    primaryCta: "Request demo",
    secondaryCta: "Sign in",
    trust: "Trusted for school communications, enrollment campaigns, and district reporting.",
  },
  why: {
    label: "Why PhotoVault",
    title: "Everything your school media team needs, nothing it doesn't.",
    cards: [
      {
        title: "One Source of Truth",
        body: "One organized home for school photos, logos, templates, and brand files. No more scattered Google Drives.",
      },
      {
        title: "Role-Safe Permissions",
        body: "Owner, uploader, and viewer permissions protect privacy and reduce mistakes across staff and partners.",
      },
      {
        title: "Audit-Ready Logs",
        body: "Track invites, uploads, deletes, and shares with organization-level audit logs for compliance peace of mind.",
      },
    ],
  },
  features: {
    items: [
      {
        label: "Core Feature",
        title: "Upload, Tag, Search, Share",
        body: "Build event albums, upload fast, apply metadata in bulk, and publish secure share links with expiry and password controls.",
        bullets: [
          "Duplicate checks and upload queue visibility",
          "Metadata fields for campus, event type, photographer",
          "Grid and list views with quick actions for busy teams",
        ],
        imageUrl: "",
        theme: "teal",
      },
      {
        label: "Brand Control",
        title: "Brand Portal + Appearance Controls",
        body: "Keep branding consistent with a centralized portal for logos, iconography, docs, and school-specific appearance settings.",
        bullets: [
          "Per-school logo and color system",
          "Brand files accessible for staff and partners",
          "Built for district and multi-school workflows",
        ],
        imageUrl: "",
        theme: "navy",
      },
    ],
  },
  testimonials: {
    label: "Testimonials",
    title: "Loved by adult education teams across California.",
    items: [
      {
        quote: "Our school team stopped hunting for files. PhotoVault gave us one clean system for every event.",
        author: "Communications Coordinator",
        role: "Adult School District",
      },
      {
        quote: "Share links with expiry and audit logs are exactly what we needed for safer external sharing.",
        author: "Program Manager",
        role: "Career Pathways Division",
      },
      {
        quote: "The Brand Portal made staff onboarding simple. Everyone now uses approved assets from day one.",
        author: "District Marketing Lead",
        role: "Multi-School Consortium",
      },
    ],
  },
  security: {
    label: "Security Highlights",
    title: "Built for school trust, privacy, and operational control.",
    items: [
      {
        title: "Encryption by default",
        body: "Data in transit is protected with TLS and hosted data is encrypted at rest.",
      },
      {
        title: "Role-based access",
        body: "Owner/uploader/viewer roles and row-level access controls isolate school data by organization.",
      },
      {
        title: "Secure sharing controls",
        body: "Password-protected and expiring share links help reduce unintended distribution.",
      },
      {
        title: "Audit visibility",
        body: "Track invites, uploads, deletes, and share actions in organization-level audit logs.",
      },
      {
        title: "Backups and recovery",
        body: "Backups and point-in-time recovery options support reliable restoration workflows.",
      },
      {
        title: "Compliance-ready posture",
        body: "PhotoVault is deployed on hardened cloud infrastructure with enterprise-grade security controls.",
      },
    ],
  },
  cta: {
    label: "Your School DAM Advantage",
    title: "The only enterprise-grade DAM built specifically for adult education.",
    body: "Launch a private, branded PhotoVault for each school while maintaining operational control from one Super Admin workspace.",
    primaryCta: "Request pricing",
    secondaryCta: "Existing client sign in",
  },
  footer: {
    featuresText: "Features",
    pricingText: "Pricing",
    privacyText: "Privacy",
    termsText: "Terms",
    contactText: "Contact",
    contactEmail: "info@photovault.app",
    copyright: "© 2026 PhotoVault. All rights reserved.",
  },
};

function asString(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim().length > 0 ? value : fallback;
}

function asArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}

export function normalizeMarketingHomepageContent(input: unknown): MarketingHomepageContent {
  const source = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const nav = (source.nav as Record<string, unknown>) ?? {};
  const hero = (source.hero as Record<string, unknown>) ?? {};
  const why = (source.why as Record<string, unknown>) ?? {};
  const features = (source.features as Record<string, unknown>) ?? {};
  const testimonials = (source.testimonials as Record<string, unknown>) ?? {};
  const security = (source.security as Record<string, unknown>) ?? {};
  const cta = (source.cta as Record<string, unknown>) ?? {};
  const footer = (source.footer as Record<string, unknown>) ?? {};

  const normalizedWhyCards = asArray(why.cards).map((card, index) => {
    const fallback = defaultMarketingHomepageContent.why.cards[index] ?? defaultMarketingHomepageContent.why.cards[0];
    const row = (card as Record<string, unknown>) ?? {};
    return {
      title: asString(row.title, fallback.title),
      body: asString(row.body, fallback.body),
    };
  });

  const normalizedFeatures = asArray(features.items).map((item, index) => {
    const fallback =
      defaultMarketingHomepageContent.features.items[index] ?? defaultMarketingHomepageContent.features.items[0];
    const row = (item as Record<string, unknown>) ?? {};
    const themeValue = row.theme === "teal" || row.theme === "navy" ? row.theme : fallback.theme;
    return {
      label: asString(row.label, fallback.label),
      title: asString(row.title, fallback.title),
      body: asString(row.body, fallback.body),
      bullets: asArray(row.bullets)
        .map((bullet) => (typeof bullet === "string" ? bullet.trim() : ""))
        .filter(Boolean)
        .slice(0, 6),
      imageUrl: typeof row.imageUrl === "string" ? row.imageUrl.trim() : fallback.imageUrl,
      theme: themeValue,
    };
  });

  const normalizedTestimonials = asArray(testimonials.items).map((item, index) => {
    const fallback =
      defaultMarketingHomepageContent.testimonials.items[index] ?? defaultMarketingHomepageContent.testimonials.items[0];
    const row = (item as Record<string, unknown>) ?? {};
    return {
      quote: asString(row.quote, fallback.quote),
      author: asString(row.author, fallback.author),
      role: asString(row.role, fallback.role),
    };
  });

  const normalizedSecurityItems = asArray(security.items).map((item, index) => {
    const fallback =
      defaultMarketingHomepageContent.security.items[index] ?? defaultMarketingHomepageContent.security.items[0];
    const row = (item as Record<string, unknown>) ?? {};
    return {
      title: asString(row.title, fallback.title),
      body: asString(row.body, fallback.body),
    };
  });

  return {
    nav: {
      featuresText: asString(nav.featuresText, defaultMarketingHomepageContent.nav.featuresText),
      testimonialsText: asString(nav.testimonialsText, defaultMarketingHomepageContent.nav.testimonialsText),
      signInText: asString(nav.signInText, defaultMarketingHomepageContent.nav.signInText),
      bookDemoText: asString(nav.bookDemoText, defaultMarketingHomepageContent.nav.bookDemoText),
    },
    hero: {
      badge: asString(hero.badge, defaultMarketingHomepageContent.hero.badge),
      title: asString(hero.title, defaultMarketingHomepageContent.hero.title),
      emphasis: asString(hero.emphasis, defaultMarketingHomepageContent.hero.emphasis),
      subtitle: asString(hero.subtitle, defaultMarketingHomepageContent.hero.subtitle),
      primaryCta: asString(hero.primaryCta, defaultMarketingHomepageContent.hero.primaryCta),
      secondaryCta: asString(hero.secondaryCta, defaultMarketingHomepageContent.hero.secondaryCta),
      trust: asString(hero.trust, defaultMarketingHomepageContent.hero.trust),
    },
    why: {
      label: asString(why.label, defaultMarketingHomepageContent.why.label),
      title: asString(why.title, defaultMarketingHomepageContent.why.title),
      cards: normalizedWhyCards.length > 0 ? normalizedWhyCards : defaultMarketingHomepageContent.why.cards,
    },
    features: {
      items: normalizedFeatures.length > 0 ? normalizedFeatures : defaultMarketingHomepageContent.features.items,
    },
    testimonials: {
      label: asString(testimonials.label, defaultMarketingHomepageContent.testimonials.label),
      title: asString(testimonials.title, defaultMarketingHomepageContent.testimonials.title),
      items:
        normalizedTestimonials.length > 0 ? normalizedTestimonials : defaultMarketingHomepageContent.testimonials.items,
    },
    security: {
      label: asString(security.label, defaultMarketingHomepageContent.security.label),
      title: asString(security.title, defaultMarketingHomepageContent.security.title),
      items: normalizedSecurityItems.length > 0 ? normalizedSecurityItems : defaultMarketingHomepageContent.security.items,
    },
    cta: {
      label: asString(cta.label, defaultMarketingHomepageContent.cta.label),
      title: asString(cta.title, defaultMarketingHomepageContent.cta.title),
      body: asString(cta.body, defaultMarketingHomepageContent.cta.body),
      primaryCta: asString(cta.primaryCta, defaultMarketingHomepageContent.cta.primaryCta),
      secondaryCta: asString(cta.secondaryCta, defaultMarketingHomepageContent.cta.secondaryCta),
    },
    footer: {
      featuresText: asString(footer.featuresText, defaultMarketingHomepageContent.footer.featuresText),
      pricingText: asString(footer.pricingText, defaultMarketingHomepageContent.footer.pricingText),
      privacyText: asString(footer.privacyText, defaultMarketingHomepageContent.footer.privacyText),
      termsText: asString(footer.termsText, defaultMarketingHomepageContent.footer.termsText),
      contactText: asString(footer.contactText, defaultMarketingHomepageContent.footer.contactText),
      contactEmail: asString(footer.contactEmail, defaultMarketingHomepageContent.footer.contactEmail),
      copyright: asString(footer.copyright, defaultMarketingHomepageContent.footer.copyright),
    },
  };
}
