"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useState } from "react";
import { defaultMarketingHomepageContent, MarketingHomepageContent, normalizeMarketingHomepageContent } from "@/lib/marketing-homepage-content";

export default function MarketingHomepage() {
  const [content, setContent] = useState<MarketingHomepageContent>(defaultMarketingHomepageContent);

  useEffect(() => {
    const nav = document.getElementById("marketing-nav");
    const onScroll = () => {
      if (!nav) return;
      nav.classList.toggle("scrolled", window.scrollY > 40);
    };

    window.addEventListener("scroll", onScroll);
    onScroll();

    const reveals = document.querySelectorAll(".reveal");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry, i) => {
          if (entry.isIntersecting) {
            window.setTimeout(() => entry.target.classList.add("visible"), i * 80);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );

    reveals.forEach((el) => observer.observe(el));

    return () => {
      window.removeEventListener("scroll", onScroll);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();

    async function loadContent() {
      try {
        const response = await fetch("/api/marketing-homepage", {
          method: "GET",
          signal: controller.signal,
          cache: "no-store",
        });
        const body = (await response.json()) as { content?: unknown };
        if (!mounted) return;
        setContent(normalizeMarketingHomepageContent(body.content));
      } catch {
        if (!mounted) return;
        setContent(defaultMarketingHomepageContent);
      }
    }

    void loadContent();
    return () => {
      mounted = false;
      controller.abort();
    };
  }, []);

  const featureOne = content.features.items[0] ?? defaultMarketingHomepageContent.features.items[0];
  const featureTwo = content.features.items[1] ?? defaultMarketingHomepageContent.features.items[1];
  const trustedLogos = content.trusted.logos.slice(0, 6);
  const metrics = content.metrics.items.slice(0, 3);
  const whyCards = content.why.cards.slice(0, 3);
  const testimonials = content.testimonials.items.slice(0, 3);
  const securityItems = content.security.items.slice(0, 6);
  const howSteps = content.howItWorks.steps.slice(0, 3);
  const demoHref = content.nav.bookDemoUrl.trim() || "#cta";
  const demoExternal = /^https?:\/\//i.test(demoHref);

  return (
    <main className="marketing-homepage">
      <nav id="marketing-nav">
        <div className="nav-logo">
          <span className="logo-dot" /> PhotoVault
        </div>
        <div className="nav-links">
          <a href="#features">{content.nav.featuresText}</a>
          <a href="#testimonials">{content.nav.testimonialsText}</a>
          <Link href="/login" className="btn-signin">
            {content.nav.signInText}
          </Link>
          <a
            href={demoHref}
            className="btn-demo"
            target={demoExternal ? "_blank" : undefined}
            rel={demoExternal ? "noopener noreferrer" : undefined}
          >
            {content.nav.bookDemoText}
          </a>
        </div>
      </nav>

      <section className="hero">
        <div className="container">
          <div className="hero-text">
            <div className="hero-badge">
              <span className="dot" />
              {content.hero.badge}
            </div>
            <h1>
              {content.hero.title} <em>{content.hero.emphasis}</em>
            </h1>
            <p className="hero-sub">{content.hero.subtitle}</p>
            <div className="hero-actions">
              <a
                href={demoHref}
                className="btn-primary"
                target={demoExternal ? "_blank" : undefined}
                rel={demoExternal ? "noopener noreferrer" : undefined}
              >
                {content.hero.primaryCta}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14" />
                  <path d="M12 5l7 7-7 7" />
                </svg>
              </a>
            </div>
            <div className="hero-trust">
              <span className="trust-line" />
              {content.hero.trust}
            </div>
          </div>

          <div className="hero-visual">
            {content.hero.imageUrl ? (
              <div className="hero-custom-image-shell">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={content.hero.imageUrl} alt="PhotoVault hero preview" className="hero-image hero-image-transparent" />
              </div>
            ) : (
              <div className="hero-mockup">
                <>
                  <div className="mockup-topbar">
                    <span className="mockup-dot" />
                    <span className="mockup-dot" />
                    <span className="mockup-dot" />
                    <span className="mockup-sidebar-label">School Brand Hub</span>
                  </div>
                  <div className="mockup-body">
                    <div className="mockup-sidebar">
                      <div className="sidebar-item active">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <rect x="3" y="3" width="7" height="7" />
                          <rect x="14" y="3" width="7" height="7" />
                          <rect x="3" y="14" width="7" height="7" />
                          <rect x="14" y="14" width="7" height="7" />
                        </svg>
                        Albums
                      </div>
                      <div className="sidebar-item">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <circle cx="12" cy="12" r="10" />
                          <path d="M12 8v8" />
                          <path d="M8 12h8" />
                        </svg>
                        Brand Portal
                      </div>
                      <div className="sidebar-item">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                        </svg>
                        Share Album
                      </div>
                      <div className="sidebar-item">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                        </svg>
                        Audit Logs
                      </div>
                    </div>
                    <div className="mockup-grid">
                      <div className="grid-thumb bg1" />
                      <div className="grid-thumb bg2" />
                      <div className="grid-thumb bg3" />
                      <div className="grid-thumb grid-thumb-wide bg4" />
                      <div className="grid-thumb bg5" />
                      <div className="grid-thumb bg6" />
                      <div className="grid-thumb bg7" />
                      <div className="grid-thumb bg8" />
                    </div>
                  </div>
                </>
              </div>
            )}
            {!content.hero.imageUrl ? (
              <div className="hero-float-badge">
                <div className="float-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                </div>
                <div>
                  <div className="float-label">Brand assets</div>
                  <div className="float-value">100% on-brand</div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="trust-strip" aria-label={content.trusted.label}>
        <div className="container">
          <p className="trusted-logos-label reveal">{content.trusted.label}</p>
          <div className="trusted-logos-grid reveal">
            {trustedLogos.map((logo, index) => (
              <div key={`${logo.name}-${logo.logoUrl}-${index}`} className="trusted-logo-slot">
                {logo.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logo.logoUrl} alt={logo.name || "School logo"} className="trusted-logo-image" />
                ) : (
                  <span className="trusted-logo-wordmark">{logo.name}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="why" id="why">
        <div className="container">
          <div className="section-label reveal">{content.why.label}</div>
          <h2 className="section-title reveal">{content.why.title}</h2>
          <div className="why-grid">
            <div className="why-card reveal">
              <div className="why-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              </div>
              <h3>{whyCards[0]?.title}</h3>
              <p>{whyCards[0]?.body}</p>
            </div>
            <div className="why-card reveal">
              <div className="why-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <h3>{whyCards[1]?.title}</h3>
              <p>{whyCards[1]?.body}</p>
            </div>
            <div className="why-card reveal">
              <div className="why-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <path d="M16 13H8" />
                  <path d="M16 17H8" />
                </svg>
              </div>
              <h3>{whyCards[2]?.title}</h3>
              <p>{whyCards[2]?.body}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="metrics-band" id="metrics">
        <div className="container">
          <div className="metrics-grid">
            {metrics.map((metric) => (
              <div key={`${metric.value}-${metric.label}`} className="metric-card reveal">
                <p className="metric-value">{metric.value}</p>
                <p className="metric-label">{metric.label}</p>
                <p className="metric-detail">{metric.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="features" id="features">
        <div className="container">
          <div className="feature-row reveal">
            <div className="feature-content">
              <div className="section-label">{featureOne.label}</div>
              <h3>{featureOne.title}</h3>
              <p>{featureOne.body}</p>
              <ul className="feature-list">
                {(featureOne.bullets.length > 0 ? featureOne.bullets : defaultMarketingHomepageContent.features.items[0].bullets).slice(0, 3).map((bullet) => (
                  <li key={bullet}><span className="check"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg></span>{bullet}</li>
                ))}
              </ul>
            </div>
            <div className="feature-visual">
              {featureOne.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={featureOne.imageUrl} alt={featureOne.title} className="feature-img" />
              ) : (
                <div className={`feature-img-placeholder ${featureOne.theme === "navy" ? "navy-theme" : "teal-theme"}`}>
                  <div className="grid-overlay" />
                  <div className="feature-icon-large">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <path d="M12 3v12" />
                    </svg>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="feature-row reverse reveal">
            <div className="feature-content">
              <div className="section-label">{featureTwo.label}</div>
              <h3>{featureTwo.title}</h3>
              <p>{featureTwo.body}</p>
              <ul className="feature-list">
                {(featureTwo.bullets.length > 0 ? featureTwo.bullets : defaultMarketingHomepageContent.features.items[1].bullets).slice(0, 3).map((bullet) => (
                  <li key={bullet}><span className="check"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg></span>{bullet}</li>
                ))}
              </ul>
            </div>
            <div className="feature-visual">
              {featureTwo.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={featureTwo.imageUrl} alt={featureTwo.title} className="feature-img" />
              ) : (
                <div className={`feature-img-placeholder ${featureTwo.theme === "navy" ? "navy-theme" : "teal-theme"}`}>
                  <div className="grid-overlay" />
                  <div className="feature-icon-large">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="testimonials" id="testimonials">
        <div className="container">
          <div className="section-label reveal">{content.testimonials.label}</div>
          <h2 className="section-title reveal">{content.testimonials.title}</h2>
          <div className="testimonial-grid">
            <div className="testimonial-card reveal">
              <div className="testimonial-quote">&ldquo;</div>
              <blockquote>{testimonials[0]?.quote}</blockquote>
              <div className="testimonial-divider" />
              <div className="testimonial-author">{testimonials[0]?.author}</div>
              <div className="testimonial-role">{testimonials[0]?.role}</div>
            </div>
            <div className="testimonial-card reveal">
              <div className="testimonial-quote">&ldquo;</div>
              <blockquote>{testimonials[1]?.quote}</blockquote>
              <div className="testimonial-divider" />
              <div className="testimonial-author">{testimonials[1]?.author}</div>
              <div className="testimonial-role">{testimonials[1]?.role}</div>
            </div>
            <div className="testimonial-card reveal">
              <div className="testimonial-quote">&ldquo;</div>
              <blockquote>{testimonials[2]?.quote}</blockquote>
              <div className="testimonial-divider" />
              <div className="testimonial-author">{testimonials[2]?.author}</div>
              <div className="testimonial-role">{testimonials[2]?.role}</div>
            </div>
          </div>
        </div>
      </section>

      <section className="security-highlights" id="security">
        <div className="container">
          <div className="section-label reveal">{content.security.label}</div>
          <h2 className="section-title reveal">{content.security.title}</h2>
          <div className="security-grid">
            {securityItems.map((item) => (
              <div key={`${item.title}-${item.body.slice(0, 16)}`} className="security-item reveal">
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="how-it-works" id="how-it-works">
        <div className="container">
          <div className="section-label reveal">{content.howItWorks.label}</div>
          <h2 className="section-title reveal">{content.howItWorks.title}</h2>
          <div className="how-grid">
            {howSteps.map((step) => (
              <div key={step.title} className="how-card reveal">
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="cta" id="cta">
        <div className="container">
          <div className="cta-box">
            <div className="section-label">{content.cta.label}</div>
            <h2>{content.cta.title}</h2>
            <p>{content.cta.body}</p>
            <div className="cta-actions">
              <a href={`mailto:${content.footer.contactEmail}?subject=PhotoVault%20Pricing%20Request`} className="btn-teal">{content.cta.primaryCta}</a>
            </div>
          </div>
        </div>
      </section>

      <footer>
        <div className="container">
          <div className="footer-inner">
            <div className="footer-logo"><span className="logo-dot" /> PhotoVault</div>
            <div className="footer-links">
              <a href="#features">{content.footer.featuresText}</a>
              <a href="#cta">{content.footer.pricingText}</a>
              <a href="#">{content.footer.privacyText}</a>
              <a href="#">{content.footer.termsText}</a>
              <a href={`mailto:${content.footer.contactEmail}`}>{content.footer.contactText}</a>
            </div>
            <div className="footer-copy">{content.footer.copyright}</div>
          </div>
        </div>
      </footer>

    </main>
  );
}
