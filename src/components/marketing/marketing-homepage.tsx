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
  const whyCards = content.why.cards.slice(0, 3);
  const testimonials = content.testimonials.items.slice(0, 3);
  const securityItems = content.security.items.slice(0, 6);

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
          <a href="#cta" className="btn-demo">
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
              <a href="#cta" className="btn-primary">
                {content.hero.primaryCta}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14" />
                  <path d="M12 5l7 7-7 7" />
                </svg>
              </a>
              <Link href="/login" className="btn-secondary">
                {content.hero.secondaryCta}
              </Link>
            </div>
            <div className="hero-trust">
              <span className="trust-line" />
              {content.hero.trust}
            </div>
          </div>

          <div className="hero-visual">
            <div className="hero-mockup">
              <div className="mockup-topbar">
                <span className="mockup-dot" />
                <span className="mockup-dot" />
                <span className="mockup-dot" />
                <span className="mockup-sidebar-label">School DAM</span>
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
                    Share Links
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
            </div>
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

      <section className="cta" id="cta">
        <div className="container">
          <div className="cta-box">
            <div className="section-label">{content.cta.label}</div>
            <h2>{content.cta.title}</h2>
            <p>{content.cta.body}</p>
            <div className="cta-actions">
              <a href={`mailto:${content.footer.contactEmail}?subject=PhotoVault%20Pricing%20Request`} className="btn-teal">{content.cta.primaryCta}</a>
              <Link href="/login" className="btn-outline-white">{content.cta.secondaryCta}</Link>
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

      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Outfit:wght@300;400;500;600;700&display=swap");

        .marketing-homepage {
          --navy: #0c1829;
          --navy-mid: #162240;
          --teal: #2dd4a8;
          --teal-dim: #1a9e7a;
          --teal-glow: rgba(45,212,168,0.15);
          --cream: #faf8f4;
          --sand: #e8e0d4;
          --slate: #6b7a90;
          --text: #1a2332;
          --text-light: #4a5568;
          --white: #fff;
          --radius: 14px;
          --radius-sm: 8px;
          --radius-lg: 20px;
          font-family: "Outfit", sans-serif;
          color: var(--text);
          background: var(--cream);
          overflow-x: hidden;
          -webkit-font-smoothing: antialiased;
        }
        .marketing-homepage * { box-sizing: border-box; }
        .marketing-homepage .container { max-width: 1520px; margin: 0 auto; padding: 0 48px; }
        #marketing-nav {
          position: fixed; top: 0; left: 0; right: 0; z-index: 100;
          padding: 18px 48px; display: flex; align-items: center; justify-content: space-between;
          background: rgba(250,248,244,.8); backdrop-filter: blur(20px); border-bottom: 1px solid rgba(0,0,0,.04); transition: all .3s ease;
        }
        #marketing-nav.scrolled { padding: 12px 48px; box-shadow: 0 4px 30px rgba(0,0,0,.06); }
        .marketing-homepage .nav-logo { font-family: "DM Serif Display", serif; font-size: 26px; color: var(--navy); letter-spacing: -.5px; display: flex; align-items: center; gap: 8px; }
        .marketing-homepage .logo-dot { width: 8px; height: 8px; background: var(--teal); border-radius: 50%; display: inline-block; }
        .marketing-homepage .nav-links { display: flex; align-items: center; gap: 32px; }
        .marketing-homepage .nav-links a { text-decoration: none; color: var(--slate); font-size: 16px; font-weight: 500; transition: color .2s; }
        .marketing-homepage .nav-links a:hover { color: var(--navy); }
        .marketing-homepage .btn-signin { padding: 10px 22px; border-radius: 50px; border: 1.5px solid var(--sand); background: transparent; font-size: 16px; font-weight: 500; color: var(--navy); cursor: pointer; transition: all .2s; }
        .marketing-homepage .btn-signin:hover { border-color: var(--navy); background: var(--white); }
        .marketing-homepage .btn-demo { padding: 11px 26px; border-radius: 50px; background: var(--navy); color: var(--white) !important; border: none; font-size: 16px; font-weight: 600; cursor: pointer; transition: all .25s; }
        .marketing-homepage .btn-demo:hover { background: var(--navy-mid); transform: translateY(-1px); box-shadow: 0 6px 20px rgba(12,24,41,.25); }
        .marketing-homepage .hero { padding: 160px 0 100px; position: relative; overflow: hidden; }
        .marketing-homepage .hero::before { content: ""; position: absolute; top: -200px; right: -200px; width: 700px; height: 700px; background: radial-gradient(circle, var(--teal-glow) 0%, transparent 70%); pointer-events: none; }
        .marketing-homepage .hero .container { display: grid; grid-template-columns: 1fr 1fr; gap: 96px; align-items: center; }
        .marketing-homepage .hero-badge { display: inline-flex; align-items: center; gap: 8px; padding: 7px 17px 7px 9px; background: var(--white); border: 1px solid var(--sand); border-radius: 50px; font-size: 13px; font-weight: 600; color: var(--teal-dim); text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 28px; animation: fadeUp .6s ease both; }
        .marketing-homepage .hero-badge .dot { width: 6px; height: 6px; background: var(--teal); border-radius: 50%; animation: pulse 2s ease infinite; }
        .marketing-homepage h1 { font-family: "DM Serif Display", serif; font-size: 68px; line-height: 1.06; color: var(--navy); letter-spacing: -1.5px; margin-bottom: 24px; animation: fadeUp .6s ease .1s both; }
        .marketing-homepage h1 em { font-style: italic; color: var(--teal-dim); }
        .marketing-homepage .hero-sub { font-size: 20px; line-height: 1.6; color: var(--text-light); max-width: 560px; margin-bottom: 36px; animation: fadeUp .6s ease .2s both; }
        .marketing-homepage .hero-actions { display: flex; gap: 14px; align-items: center; margin-bottom: 40px; animation: fadeUp .6s ease .3s both; }
        .marketing-homepage .btn-primary { padding: 16px 34px; border-radius: 50px; background: var(--navy); color: var(--white); border: none; font-size: 17px; font-weight: 600; cursor: pointer; transition: all .25s; display: inline-flex; align-items: center; gap: 8px; text-decoration: none; }
        .marketing-homepage .btn-primary:hover { background: var(--navy-mid); transform: translateY(-2px); box-shadow: 0 8px 24px rgba(12,24,41,.3); color: var(--white); }
        .marketing-homepage .btn-primary svg { transition: transform .2s; }
        .marketing-homepage .btn-primary:hover svg { transform: translateX(3px); }
        .marketing-homepage .btn-secondary { padding: 16px 30px; border-radius: 50px; background: transparent; border: 1.5px solid var(--sand); font-size: 17px; font-weight: 500; color: var(--navy); cursor: pointer; transition: all .2s; text-decoration: none; }
        .marketing-homepage .btn-secondary:hover { border-color: var(--navy); background: var(--white); color: var(--navy); }
        .marketing-homepage .hero-trust { font-size: 15px; color: var(--slate); display: flex; align-items: center; gap: 10px; animation: fadeUp .6s ease .4s both; }
        .marketing-homepage .trust-line { width: 30px; height: 1px; background: var(--sand); }
        .marketing-homepage .hero-visual { position: relative; animation: fadeUp .8s ease .3s both; }
        .marketing-homepage .hero-mockup { background: var(--white); border-radius: var(--radius-lg); box-shadow: 0 2px 4px rgba(0,0,0,.02), 0 8px 24px rgba(0,0,0,.06), 0 24px 60px rgba(0,0,0,.08); padding: 16px; position: relative; z-index: 2; }
        .marketing-homepage .mockup-topbar { display: flex; align-items: center; gap: 8px; padding: 10px 14px; background: var(--navy); border-radius: var(--radius-sm) var(--radius-sm) 0 0; }
        .marketing-homepage .mockup-dot { width: 8px; height: 8px; border-radius: 50%; }
        .marketing-homepage .mockup-dot:nth-child(1) { background: #ff5f57; }
        .marketing-homepage .mockup-dot:nth-child(2) { background: #febc2e; }
        .marketing-homepage .mockup-dot:nth-child(3) { background: #28c840; }
        .marketing-homepage .mockup-sidebar-label { margin-left: auto; font-size: 10px; color: rgba(255,255,255,.5); letter-spacing: 1px; text-transform: uppercase; }
        .marketing-homepage .mockup-body { background: var(--navy-mid); border-radius: 0 0 var(--radius-sm) var(--radius-sm); padding: 20px; display: grid; grid-template-columns: 140px 1fr; gap: 16px; min-height: 280px; }
        .marketing-homepage .mockup-sidebar { display: flex; flex-direction: column; gap: 6px; }
        .marketing-homepage .sidebar-item { padding: 8px 12px; border-radius: 6px; font-size: 11px; font-weight: 500; color: rgba(255,255,255,.4); display: flex; align-items: center; gap: 8px; transition: all .2s; }
        .marketing-homepage .sidebar-item.active { background: rgba(45,212,168,.12); color: var(--teal); }
        .marketing-homepage .sidebar-item svg { width: 14px; height: 14px; opacity: .6; }
        .marketing-homepage .sidebar-item.active svg { opacity: 1; }
        .marketing-homepage .mockup-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 8px; }
        .marketing-homepage .grid-thumb { aspect-ratio: 1; border-radius: 6px; position: relative; overflow: hidden; cursor: pointer; transition: transform .2s, box-shadow .2s; }
        .marketing-homepage .grid-thumb:hover { transform: scale(1.03); box-shadow: 0 4px 12px rgba(0,0,0,.3); }
        .marketing-homepage .grid-thumb::after { content: ""; position: absolute; inset: 0; background: linear-gradient(180deg, transparent 60%, rgba(0,0,0,.4)); opacity: 0; transition: opacity .2s; }
        .marketing-homepage .grid-thumb:hover::after { opacity: 1; }
        .marketing-homepage .grid-thumb-wide { grid-column: span 2; aspect-ratio: 2/1; }
        .marketing-homepage .bg1 { background: linear-gradient(135deg,#667eea,#764ba2); }
        .marketing-homepage .bg2 { background: linear-gradient(135deg,#f093fb,#f5576c); }
        .marketing-homepage .bg3 { background: linear-gradient(135deg,#4facfe,#00f2fe); }
        .marketing-homepage .bg4 { background: linear-gradient(135deg,#43e97b,#38f9d7); }
        .marketing-homepage .bg5 { background: linear-gradient(135deg,#fa709a,#fee140); }
        .marketing-homepage .bg6 { background: linear-gradient(135deg,#a18cd1,#fbc2eb); }
        .marketing-homepage .bg7 { background: linear-gradient(135deg,#fccb90,#d57eeb); }
        .marketing-homepage .bg8 { background: linear-gradient(135deg,#e0c3fc,#8ec5fc); }
        .marketing-homepage .hero-float-badge { position: absolute; bottom: 30px; left: -40px; z-index: 3; background: var(--white); border-radius: var(--radius); padding: 14px 18px; box-shadow: 0 8px 30px rgba(0,0,0,.1); display: flex; align-items: center; gap: 12px; animation: float 3s ease infinite; }
        .marketing-homepage .float-icon { width: 36px; height: 36px; background: var(--teal-glow); border-radius: 10px; display: flex; align-items: center; justify-content: center; }
        .marketing-homepage .float-icon svg { color: var(--teal-dim); }
        .marketing-homepage .float-label { font-size: 11px; color: var(--slate); }
        .marketing-homepage .float-value { font-size: 15px; font-weight: 700; color: var(--navy); }
        .marketing-homepage .why { padding: 100px 0; position: relative; }
        .marketing-homepage .section-label { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: var(--teal-dim); margin-bottom: 16px; }
        .marketing-homepage .section-title { font-family: "DM Serif Display", serif; font-size: 52px; line-height: 1.12; color: var(--navy); letter-spacing: -1px; margin-bottom: 56px; max-width: 680px; }
        .marketing-homepage .why-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 32px; }
        .marketing-homepage .why-card { background: var(--white); border: 1px solid rgba(0,0,0,.04); border-radius: var(--radius); padding: 36px 32px; transition: all .3s ease; position: relative; overflow: hidden; }
        .marketing-homepage .why-card::before { content: ""; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: var(--teal); transform: scaleX(0); transform-origin: left; transition: transform .4s ease; }
        .marketing-homepage .why-card:hover::before { transform: scaleX(1); }
        .marketing-homepage .why-card:hover { transform: translateY(-4px); box-shadow: 0 12px 40px rgba(0,0,0,.06); }
        .marketing-homepage .why-icon { width: 48px; height: 48px; background: linear-gradient(135deg,var(--teal-glow),rgba(45,212,168,.05)); border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-bottom: 20px; }
        .marketing-homepage .why-icon svg { color: var(--teal-dim); }
        .marketing-homepage .why-card h3 { font-family: "DM Serif Display", serif; font-size: 28px; color: var(--navy); margin-bottom: 10px; }
        .marketing-homepage .why-card p { font-size: 18px; line-height: 1.65; color: var(--text-light); }
        .marketing-homepage .features { padding: 80px 0 100px; }
        .marketing-homepage .feature-row { display: grid; grid-template-columns: 1fr 1fr; gap: 60px; align-items: center; margin-bottom: 80px; }
        .marketing-homepage .feature-row:last-child { margin-bottom: 0; }
        .marketing-homepage .feature-row.reverse .feature-visual { order: -1; }
        .marketing-homepage .feature-visual { border-radius: var(--radius-lg); overflow: hidden; position: relative; }
        .marketing-homepage .feature-img-placeholder { width: 100%; height: 340px; border-radius: var(--radius-lg); display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden; }
        .marketing-homepage .feature-img { width: 100%; height: 340px; object-fit: cover; border-radius: var(--radius-lg); display: block; background: var(--sand); }
        .marketing-homepage .teal-theme { background: linear-gradient(135deg,#0f2027,#203a43,#2c5364); }
        .marketing-homepage .navy-theme { background: linear-gradient(135deg,var(--navy),var(--navy-mid),#1a3a5c); }
        .marketing-homepage .grid-overlay { position: absolute; inset: 0; background-image: linear-gradient(rgba(255,255,255,.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.03) 1px, transparent 1px); background-size: 40px 40px; }
        .marketing-homepage .feature-icon-large { position: relative; z-index: 1; width: 80px; height: 80px; background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.1); border-radius: 20px; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(10px); }
        .marketing-homepage .feature-icon-large svg { width: 36px; height: 36px; color: var(--teal); }
        .marketing-homepage .feature-content .section-label { margin-bottom: 12px; }
        .marketing-homepage .feature-content h3 { font-family: "DM Serif Display", serif; font-size: 40px; line-height: 1.15; color: var(--navy); letter-spacing: -.5px; margin-bottom: 16px; }
        .marketing-homepage .feature-content p { font-size: 18px; line-height: 1.7; color: var(--text-light); margin-bottom: 24px; max-width: 520px; }
        .marketing-homepage .feature-list { list-style: none; display: flex; flex-direction: column; gap: 12px; padding: 0; margin: 0; }
        .marketing-homepage .feature-list li { display: flex; align-items: flex-start; gap: 10px; font-size: 18px; color: var(--text-light); line-height: 1.55; }
        .marketing-homepage .feature-list .check { width: 20px; height: 20px; min-width: 20px; background: var(--teal-glow); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-top: 2px; }
        .marketing-homepage .feature-list .check svg { width: 12px; height: 12px; color: var(--teal-dim); }
        .marketing-homepage .testimonials { padding: 100px 0; background: var(--navy); position: relative; overflow: hidden; }
        .marketing-homepage .testimonials::before { content: ""; position: absolute; top: -300px; left: 50%; transform: translateX(-50%); width: 800px; height: 800px; background: radial-gradient(circle, rgba(45,212,168,.08) 0%, transparent 70%); }
        .marketing-homepage .testimonials .section-label { color: var(--teal); }
        .marketing-homepage .testimonials .section-title { color: var(--white); }
        .marketing-homepage .testimonial-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 24px; position: relative; z-index: 1; }
        .marketing-homepage .testimonial-card { background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.06); border-radius: var(--radius); padding: 36px 28px; transition: all .3s; position: relative; }
        .marketing-homepage .testimonial-card:hover { background: rgba(255,255,255,.07); transform: translateY(-3px); }
        .marketing-homepage .testimonial-quote { font-size: 36px; color: var(--teal); margin-bottom: 16px; font-family: "DM Serif Display", serif; line-height: 1; }
        .marketing-homepage .testimonial-card blockquote { font-size: 18px; line-height: 1.65; color: rgba(255,255,255,.7); margin-bottom: 24px; font-style: italic; }
        .marketing-homepage .testimonial-divider { width: 30px; height: 2px; background: var(--teal); margin-bottom: 16px; opacity: .5; }
        .marketing-homepage .testimonial-author { font-size: 16px; font-weight: 600; color: var(--white); }
        .marketing-homepage .testimonial-role { font-size: 14px; color: rgba(255,255,255,.4); margin-top: 4px; }
        .marketing-homepage .security-highlights { padding: 95px 0 70px; background: #f5f7fb; }
        .marketing-homepage .security-highlights .section-title { max-width: 860px; }
        .marketing-homepage .security-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 18px; }
        .marketing-homepage .security-item { background: #fff; border-radius: 14px; padding: 22px; box-shadow: 0 1px 2px rgba(0,0,0,.03); }
        .marketing-homepage .security-item h3 { font-size: 22px; font-family: "DM Serif Display", serif; color: var(--navy); margin: 0 0 10px; }
        .marketing-homepage .security-item p { margin: 0; font-size: 16px; line-height: 1.55; color: var(--text-light); }
        .marketing-homepage .cta { padding: 120px 0; position: relative; }
        .marketing-homepage .cta-box { background: var(--navy); border-radius: 24px; padding: 80px; text-align: center; position: relative; overflow: hidden; }
        .marketing-homepage .cta-box::before { content: ""; position: absolute; inset: 0; background: radial-gradient(ellipse at 20% 50%, rgba(45,212,168,.1) 0%, transparent 50%), radial-gradient(ellipse at 80% 50%, rgba(45,212,168,.06) 0%, transparent 50%); pointer-events: none; }
        .marketing-homepage .cta-box .section-label { color: var(--teal); margin-bottom: 20px; position: relative; z-index: 1; }
        .marketing-homepage .cta-box h2 { font-family: "DM Serif Display", serif; font-size: 56px; line-height: 1.1; color: var(--white); letter-spacing: -1px; max-width: 760px; margin: 0 auto 20px; position: relative; z-index: 1; }
        .marketing-homepage .cta-box p { font-size: 19px; color: rgba(255,255,255,.6); max-width: 620px; margin: 0 auto 36px; line-height: 1.65; position: relative; z-index: 1; }
        .marketing-homepage .cta-actions { display: flex; justify-content: center; gap: 14px; position: relative; z-index: 1; }
        .marketing-homepage .btn-teal { padding: 16px 36px; border-radius: 50px; background: var(--teal); color: var(--navy); border: none; font-size: 17px; font-weight: 700; cursor: pointer; transition: all .25s; text-decoration: none; }
        .marketing-homepage .btn-teal:hover { background: #3ee8b8; transform: translateY(-2px); box-shadow: 0 8px 24px rgba(45,212,168,.3); color: var(--navy); }
        .marketing-homepage .btn-outline-white { padding: 15px 32px; border-radius: 50px; background: transparent; border: 1.5px solid rgba(255,255,255,.2); font-size: 17px; font-weight: 500; color: var(--white); cursor: pointer; transition: all .2s; text-decoration: none; }
        .marketing-homepage .btn-outline-white:hover { border-color: rgba(255,255,255,.5); background: rgba(255,255,255,.05); color: var(--white); }
        .marketing-homepage footer { padding: 60px 0 40px; border-top: 1px solid rgba(0,0,0,.05); }
        .marketing-homepage .footer-inner { display: flex; justify-content: space-between; align-items: center; }
        .marketing-homepage .footer-logo { font-family: "DM Serif Display", serif; font-size: 22px; color: var(--navy); display: flex; align-items: center; gap: 6px; }
        .marketing-homepage .footer-logo .logo-dot { width: 6px; height: 6px; background: var(--teal); border-radius: 50%; }
        .marketing-homepage .footer-links { display: flex; gap: 28px; }
        .marketing-homepage .footer-links a { text-decoration: none; font-size: 15px; color: var(--slate); transition: color .2s; }
        .marketing-homepage .footer-links a:hover { color: var(--navy); }
        .marketing-homepage .footer-copy { font-size: 13px; color: var(--slate); opacity: .6; }
        .marketing-homepage .reveal { opacity: 0; transform: translateY(30px); transition: all .7s cubic-bezier(.25,.46,.45,.94); }
        .marketing-homepage .reveal.visible { opacity: 1; transform: translateY(0); }
        @keyframes pulse { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: .5; transform: scale(1.4); } }
        @keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @media (max-width: 900px) {
          .marketing-homepage .container { padding: 0 20px; }
          #marketing-nav { padding: 14px 20px; }
          #marketing-nav.scrolled { padding: 10px 20px; }
          .marketing-homepage .nav-links { gap: 14px; }
          .marketing-homepage .nav-links a[href="#features"], .marketing-homepage .nav-links a[href="#testimonials"] { display: none; }
          .marketing-homepage .hero .container { grid-template-columns: 1fr; gap: 50px; }
          .marketing-homepage h1 { font-size: 48px; }
          .marketing-homepage .hero-float-badge { left: 0; bottom: 16px; }
          .marketing-homepage .why-grid, .marketing-homepage .testimonial-grid { grid-template-columns: 1fr; }
          .marketing-homepage .security-grid { grid-template-columns: 1fr; }
          .marketing-homepage .feature-row { grid-template-columns: 1fr; gap: 30px; }
          .marketing-homepage .feature-row.reverse .feature-visual { order: 0; }
          .marketing-homepage .cta-box { padding: 50px 30px; }
          .marketing-homepage .cta-box h2 { font-size: 38px; }
          .marketing-homepage .section-title { font-size: 40px; }
          .marketing-homepage .footer-inner { flex-direction: column; gap: 20px; text-align: center; }
          .marketing-homepage .footer-links { flex-wrap: wrap; justify-content: center; }
        }
      `}</style>
    </main>
  );
}
