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

export type MarketingMetric = {
  value: string;
  label: string;
  detail: string;
};

export type MarketingHowStep = {
  title: string;
  body: string;
};

export type MarketingTrustedLogo = {
  name: string;
  logoUrl: string;
};

export type MarketingHomepageContent = {
  nav: {
    featuresText: string;
    testimonialsText: string;
    signInText: string;
    bookDemoText: string;
    bookDemoUrl: string;
  };
  hero: {
    badge: string;
    title: string;
    emphasis: string;
    subtitle: string;
    primaryCta: string;
    secondaryCta: string;
    trust: string;
    imageUrl: string;
  };
  trusted: {
    label: string;
    logos: MarketingTrustedLogo[];
  };
  metrics: {
    items: MarketingMetric[];
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
  howItWorks: {
    label: string;
    title: string;
    steps: MarketingHowStep[];
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
    bookDemoText: "Book a demo",
    bookDemoUrl: "",
  },
  hero: {
    badge: "Built Specifically for Adult Education",
    title: "The secure DAM for adult schools,",
    emphasis: "ready for daily team use.",
    subtitle:
      "PhotoVault helps adult schools organize event media, protect brand consistency, and share approved assets faster across communications, enrollment, and district teams.",
    primaryCta: "Book a 20-minute demo",
    secondaryCta: "Client sign in",
    trust: "Designed for school communications, enrollment campaigns, and district reporting workflows.",
    imageUrl: "",
  },
  trusted: {
    label: "Trusted by adult education teams including",
    logos: [
      { name: "Berkeley Adult School", logoUrl: "" },
      { name: "San Mateo Adult & Career Education", logoUrl: "" },
      { name: "San Jose Dance Theatre", logoUrl: "" },
      { name: "Mountain View Adult School", logoUrl: "" },
      { name: "Ventura County Adult Education", logoUrl: "" },
      { name: "Santa Clara Adult Education", logoUrl: "" },
    ],
  },
  metrics: {
    items: [
      {
        value: "3x",
        label: "Faster asset retrieval",
        detail: "Teams find approved photos and files in seconds, not hours.",
      },
      {
        value: "100%",
        label: "On-brand asset usage",
        detail: "Brand Portal and Appearance controls reduce off-brand publishing.",
      },
      {
        value: "<5 min",
        label: "Secure sharing setup",
        detail: "Create password-protected Share Album links with expiration dates quickly.",
      },
    ],
  },
  why: {
    label: "Why PhotoVault",
    title: "Built for the way adult schools actually manage media.",
    cards: [
      {
        title: "One Trusted Source",
        body: "Keep school photos, logos, templates, and brand assets in one organized workspace instead of scattered drives.",
      },
      {
        title: "Role-Safe Permissions",
        body: "Owner, uploader, and viewer roles help protect privacy and reduce mistakes across staff, partners, and vendors.",
      },
      {
        title: "Audit-Ready Logs",
        body: "Track invites, uploads, deletes, and shares with organization-level audit logs that support operational accountability.",
      },
    ],
  },
  features: {
    items: [
      {
        label: "Daily Workflow",
        title: "Upload, Tag, Search, Share",
        body: "Create event albums, upload quickly, apply metadata in bulk, and publish secure Share Album links with expiration dates and password controls.",
        bullets: [
          "Duplicate checks and upload queue visibility",
          "Metadata fields for campus, event type, photographer",
          "Grid and list views with quick actions for busy school teams",
        ],
        imageUrl: "",
        theme: "teal",
      },
      {
        label: "Brand Consistency",
        title: "Brand Portal + Appearance Controls",
        body: "Keep branding consistent with a centralized Brand Portal for logos, iconography, documents, and school-specific Appearance settings.",
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
    title: "Trusted by adult education teams.",
    items: [
      {
        quote: "Our team stopped hunting for files. PhotoVault gave us one clean system for every event and campaign.",
        author: "Communications Coordinator",
        role: "Adult School District",
      },
      {
        quote: "Share Album links with expiration dates and audit logs gave us the control we were missing.",
        author: "Program Manager",
        role: "Career Pathways Division",
      },
      {
        quote: "The Brand Portal made onboarding simple. Staff now use approved assets from day one.",
        author: "District Marketing Lead",
        role: "Multi-School Consortium",
      },
    ],
  },
  security: {
    label: "Security and Governance",
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
        body: "Password-protected Share Album links with expiration dates help reduce unintended distribution.",
      },
      {
        title: "Audit visibility",
        body: "Track invites, uploads, deletes, and sharing actions in organization-level audit logs.",
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
  howItWorks: {
    label: "How It Works",
    title: "From upload to approved sharing in three simple steps.",
    steps: [
      {
        title: "1. Organize your media",
        body: "Create albums by event, upload photos in batches, and apply metadata so teams can find files fast.",
      },
      {
        title: "2. Control brand and access",
        body: "Set school Appearance, maintain a Brand Portal, and use role-based permissions for staff and partners.",
      },
      {
        title: "3. Share with confidence",
        body: "Generate Share Album links with expiration dates, optional passwords, and audit visibility for every action.",
      },
    ],
  },
  cta: {
    label: "Ready for a better school DAM?",
    title: "The only enterprise-grade DAM built specifically for adult education.",
    body: "Give every school a private, branded PhotoVault to organize, govern, and share approved media with confidence.",
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
  return typeof value === "string" ? value : fallback;
}

function asArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}

export function normalizeMarketingHomepageContent(input: unknown): MarketingHomepageContent {
  const source = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const nav = (source.nav as Record<string, unknown>) ?? {};
  const hero = (source.hero as Record<string, unknown>) ?? {};
  const trusted = (source.trusted as Record<string, unknown>) ?? {};
  const metrics = (source.metrics as Record<string, unknown>) ?? {};
  const why = (source.why as Record<string, unknown>) ?? {};
  const features = (source.features as Record<string, unknown>) ?? {};
  const testimonials = (source.testimonials as Record<string, unknown>) ?? {};
  const security = (source.security as Record<string, unknown>) ?? {};
  const howItWorks = (source.howItWorks as Record<string, unknown>) ?? {};
  const cta = (source.cta as Record<string, unknown>) ?? {};
  const footer = (source.footer as Record<string, unknown>) ?? {};

  const normalizedTrustedLogos = asArray(trusted.logos)
    .map((logo, index) => {
      const fallback =
        defaultMarketingHomepageContent.trusted.logos[index] ?? defaultMarketingHomepageContent.trusted.logos[0];
      if (typeof logo === "string") {
        const legacyName = logo.trim();
        return {
          name: legacyName || fallback.name,
          logoUrl: "",
        };
      }
      const row = (logo as Record<string, unknown>) ?? {};
      return {
        name: asString(row.name, fallback.name),
        logoUrl: typeof row.logoUrl === "string" ? row.logoUrl.trim() : fallback.logoUrl,
      };
    })
    .filter((logo) => logo.name.length > 0 || logo.logoUrl.length > 0)
    .slice(0, 8);

  const normalizedMetrics = asArray(metrics.items).map((item, index) => {
    const fallback =
      defaultMarketingHomepageContent.metrics.items[index] ?? defaultMarketingHomepageContent.metrics.items[0];
    const row = (item as Record<string, unknown>) ?? {};
    return {
      value: asString(row.value, fallback.value),
      label: asString(row.label, fallback.label),
      detail: asString(row.detail, fallback.detail),
    };
  });

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

  const normalizedHowSteps = asArray(howItWorks.steps).map((step, index) => {
    const fallback =
      defaultMarketingHomepageContent.howItWorks.steps[index] ?? defaultMarketingHomepageContent.howItWorks.steps[0];
    const row = (step as Record<string, unknown>) ?? {};
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
      bookDemoUrl: asString(nav.bookDemoUrl, defaultMarketingHomepageContent.nav.bookDemoUrl),
    },
    hero: {
      badge: asString(hero.badge, defaultMarketingHomepageContent.hero.badge),
      title: asString(hero.title, defaultMarketingHomepageContent.hero.title),
      emphasis: asString(hero.emphasis, defaultMarketingHomepageContent.hero.emphasis),
      subtitle: asString(hero.subtitle, defaultMarketingHomepageContent.hero.subtitle),
      primaryCta: asString(hero.primaryCta, defaultMarketingHomepageContent.hero.primaryCta),
      secondaryCta: asString(hero.secondaryCta, defaultMarketingHomepageContent.hero.secondaryCta),
      trust: asString(hero.trust, defaultMarketingHomepageContent.hero.trust),
      imageUrl: typeof hero.imageUrl === "string" ? hero.imageUrl.trim() : defaultMarketingHomepageContent.hero.imageUrl,
    },
    trusted: {
      label: asString(trusted.label, defaultMarketingHomepageContent.trusted.label),
      logos: normalizedTrustedLogos.length > 0 ? normalizedTrustedLogos : defaultMarketingHomepageContent.trusted.logos,
    },
    metrics: {
      items: normalizedMetrics.length > 0 ? normalizedMetrics : defaultMarketingHomepageContent.metrics.items,
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
    howItWorks: {
      label: asString(howItWorks.label, defaultMarketingHomepageContent.howItWorks.label),
      title: asString(howItWorks.title, defaultMarketingHomepageContent.howItWorks.title),
      steps: normalizedHowSteps.length > 0 ? normalizedHowSteps : defaultMarketingHomepageContent.howItWorks.steps,
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
