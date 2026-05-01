// Route: /owner/how-it-works

import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import posthog from "posthog-js";
import Layout from "@/components/Layout";
import { useRequireAuth } from "@/hooks/useRequireAuth";

// ── Colour Tokens ─────────────────────────────────────────────────────────────

const C = {
  bg:           "#F5F2EE",
  bgCard:       "#FAFAF8",
  bgDark:       "#1A1916",
  ink:          "#1A1916",
  ink2:         "#3D3B36",
  ink3:         "#6B6860",
  ink4:         "#9B9890",
  border:       "rgba(26,25,22,0.10)",
  borderStrong: "rgba(26,25,22,0.18)",
  accent:       "#2D5A3D",
  accentLight:  "#EBF3EE",
  accentMid:    "#4A8B60",
  gold:         "#B07C2F",
  goldLight:    "#FDF4E7",
  red:          "#9B2335",
  redLight:     "#FCF0F2",
  blue:         "#1E3D5C",
  blueLight:    "#EEF3F8",
} as const;

const FONT_SERIF = "'Instrument Serif', Georgia, serif";
const FONT_SANS  = "'DM Sans', system-ui, sans-serif";

// ── useClaritySection ─────────────────────────────────────────────────────────

function useClaritySection(name: string): React.RefObject<HTMLElement> {
  const ref = useRef<HTMLElement>(null);
  const fired = useRef(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !fired.current) {
          posthog?.capture(`owner_clarity_${name}_viewed`);
          fired.current = true;
        }
      },
      { threshold: 0.3 },
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [name]);
  return ref;
}

// ── TOC links ─────────────────────────────────────────────────────────────────

const TOC_LINKS = [
  { id: "tldr",        label: "At a Glance" },
  { id: "documents",   label: "Key Terms" },
  { id: "who-pays",    label: "Who Pays What" },
  { id: "deposit",     label: "Deposit Rules" },
  { id: "exit-timing", label: "Lock-In & Exit" },
  { id: "turnover",    label: "Turnover Costs" },
  { id: "maintenance", label: "Maintenance" },
  { id: "screening",   label: "Your Control" },
  { id: "deductions",  label: "Deductions" },
  { id: "small-rules", label: "Other Rules" },
  { id: "limits",      label: "Reeve's Limits" },
];

// ── Sub-components ────────────────────────────────────────────────────────────

type IconColor = "green" | "gold" | "red" | "blue" | "ink";

function TldrCard({
  iconColor, icon, title, body,
}: {
  iconColor: IconColor;
  icon: React.ReactNode;
  title: string;
  body: string;
}): React.ReactElement {
  const bg = iconColor === "green" ? C.accentLight
    : iconColor === "gold"  ? C.goldLight
    : iconColor === "red"   ? C.redLight
    : iconColor === "blue"  ? C.blueLight
    : "rgba(26,25,22,0.06)";
  const fg = iconColor === "green" ? C.accent
    : iconColor === "gold"  ? C.gold
    : iconColor === "red"   ? C.red
    : iconColor === "blue"  ? C.blue
    : C.ink;
  return (
    <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 10, padding: "22px 20px" }}>
      <div style={{ width: 36, height: 36, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14, background: bg, color: fg }}>
        {icon}
      </div>
      <h4 style={{ fontSize: 14, fontWeight: 600, color: C.ink, marginBottom: 6, lineHeight: 1.3 }}>{title}</h4>
      <p style={{ fontSize: 13, color: C.ink3, lineHeight: 1.55, margin: 0 }}>{body}</p>
    </div>
  );
}

function TermCard({ name, body }: { name: string; body: string }): React.ReactElement {
  return (
    <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 10, padding: "20px 20px" }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: C.accent, marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
        {name}
        <span style={{ flex: 1, height: 1, background: C.accentLight, display: "block" }} />
      </div>
      <p style={{ fontSize: 13.5, color: C.ink2, lineHeight: 1.6, margin: 0 }}>{body}</p>
    </div>
  );
}

function PayRow({ title, body }: { title: string; body: string }): React.ReactElement {
  return (
    <div className="clarity-pay-row" style={{ padding: "14px 20px", borderTop: `1px solid ${C.border}`, fontSize: 14, color: C.ink2, lineHeight: 1.5 }}>
      <strong style={{ display: "block", fontSize: 13, color: C.ink, marginBottom: 2 }}>{title}</strong>
      {body}
    </div>
  );
}

function WarningBlock({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }): React.ReactElement {
  return (
    <div style={{ background: C.redLight, border: "1px solid rgba(155,35,53,0.2)", borderRadius: 8, padding: "20px 24px", display: "flex", gap: 14, alignItems: "flex-start", marginTop: 20, ...style }}>
      <div style={{ flexShrink: 0 }}>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M10 2L2 17h16L10 2z" stroke={C.red} strokeWidth="1.5" strokeLinejoin="round"/>
          <path d="M10 8v4M10 14.5v.5" stroke={C.red} strokeWidth="1.6" strokeLinecap="round"/>
        </svg>
      </div>
      <div style={{ fontSize: 14, color: C.ink2, lineHeight: 1.65 }}>{children}</div>
    </div>
  );
}

function AutoBlock({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }): React.ReactElement {
  return (
    <div style={{ background: C.bgCard, border: `1.5px solid ${C.accentMid}`, borderRadius: 8, padding: "18px 22px", marginTop: 16, fontSize: 14, color: C.ink2, lineHeight: 1.65, ...style }}>
      {children}
    </div>
  );
}

function InfoBox({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }): React.ReactElement {
  return (
    <div style={{ background: C.blueLight, border: "1px solid rgba(30,61,92,0.15)", borderRadius: 8, padding: "18px 22px", display: "flex", gap: 14, alignItems: "flex-start", marginTop: 16, ...style }}>
      <div style={{ flexShrink: 0, marginTop: 1 }}>
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <circle cx="9" cy="9" r="7.5" stroke={C.blue} strokeWidth="1.4"/>
          <path d="M9 5.5V9.5M9 12v.5" stroke={C.blue} strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </div>
      <div style={{ fontSize: 14, color: C.ink2, lineHeight: 1.65 }}>{children}</div>
    </div>
  );
}

function MaintRow({ label, text, isLast }: { label: string; text: string; isLast?: boolean }): React.ReactElement {
  return (
    <div style={{ padding: "8px 0", borderBottom: isLast ? "none" : `1px solid ${C.border}`, fontSize: 13, color: C.ink2, lineHeight: 1.5, display: "flex", gap: 10 }}>
      <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: C.ink4, minWidth: 52, paddingTop: 2 }}>{label}</div>
      <div>{text}</div>
    </div>
  );
}

function ScreenItem({ text }: { text: string }): React.ReactElement {
  return (
    <div className="clarity-screen-item" style={{ padding: "12px 20px", fontSize: 13.5, color: C.ink2, borderBottom: `1px solid ${C.border}`, display: "flex", gap: 10, alignItems: "flex-start", lineHeight: 1.5 }}>
      <span style={{ color: C.ink4, flexShrink: 0, marginTop: 2 }}>—</span>
      <span>{text}</span>
    </div>
  );
}

function DeductionRow({ num, title, desc, isLast }: { num: number; title: string; desc: string; isLast?: boolean }): React.ReactElement {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 20, padding: "20px 24px", borderBottom: isLast ? "none" : `1px solid ${C.border}` }}>
      <div style={{ width: 32, height: 32, borderRadius: "50%", background: C.accentLight, color: C.accent, fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>{num}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.ink, marginBottom: 4 }}>{title}</div>
        <div style={{ fontSize: 13.5, color: C.ink2, lineHeight: 1.6 }}>{desc}</div>
      </div>
    </div>
  );
}

function SmallRule({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }): React.ReactElement {
  return (
    <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 8, padding: "16px 16px", display: "flex", gap: 12, alignItems: "flex-start" }}>
      <div style={{ flexShrink: 0, marginTop: 2 }}>{icon}</div>
      <div style={{ fontSize: 13, color: C.ink2, lineHeight: 1.55 }}>
        <strong style={{ display: "block", fontSize: 13, color: C.ink, marginBottom: 2 }}>{title}</strong>
        {body}
      </div>
    </div>
  );
}

function LimitItem({ text }: { text: string }): React.ReactElement {
  return (
    <div className="clarity-limits-item" style={{ padding: "13px 20px", fontSize: 13.5, color: C.ink2, borderBottom: `1px solid ${C.border}`, display: "flex", gap: 10, alignItems: "flex-start", lineHeight: 1.5 }}>
      <div style={{ flexShrink: 0, marginTop: 8, width: 5, height: 5, borderRadius: "50%", background: C.ink4 }} />
      {text}
    </div>
  );
}

// ── Scoped CSS ────────────────────────────────────────────────────────────────

const SCOPED_CSS = `
  /* ── Section label */
  .clarity-label {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #6B6860;
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 20px;
  }
  .clarity-label::before {
    content: '';
    display: block;
    width: 20px;
    height: 1px;
    background: #6B6860;
  }

  /* ── Progress bar */
  #clarity-progress-bar {
    position: fixed;
    top: 0; left: 0;
    height: 2px;
    background: #2D5A3D;
    z-index: 200;
    transition: width 0.1s linear;
    pointer-events: none;
  }

  /* ── TOC bar */
  /* TODO: top: 64px assumes Layout header height of 64px — verify against Layout.tsx */
  .clarity-toc-bar {
    position: sticky;
    top: 64px;
    z-index: 90;
    background: rgba(245,242,238,0.95);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-bottom: 1px solid rgba(26,25,22,0.10);
    overflow-x: auto;
    white-space: nowrap;
    scrollbar-width: none;
  }
  .clarity-toc-bar::-webkit-scrollbar { display: none; }
  .clarity-toc-link {
    display: inline-block;
    padding: 12px 16px;
    font-size: 12px;
    font-weight: 500;
    color: #6B6860;
    cursor: pointer;
    border: none;
    background: none;
    border-bottom: 2px solid transparent;
    transition: color 0.15s, border-color 0.15s;
    white-space: nowrap;
    font-family: inherit;
    letter-spacing: 0.01em;
  }
  .clarity-toc-link:hover { color: #1A1916; border-bottom-color: rgba(26,25,22,0.18); }
  .clarity-toc-link.active { color: #1A1916; border-bottom-color: #2D5A3D; }

  /* ── Fade-up */
  @keyframes clarityFadeUp {
    from { opacity: 0; transform: translateY(18px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .clarity-fade-up   { animation: clarityFadeUp 0.5s ease forwards; opacity: 0; }
  .clarity-fade-up-1 { animation-delay: 0.08s; }
  .clarity-fade-up-2 { animation-delay: 0.16s; }
  .clarity-fade-up-3 { animation-delay: 0.24s; }

  /* ── Deposit timeline */
  .clarity-dt-track {
    display: flex;
    align-items: stretch;
    gap: 0;
    margin-bottom: 28px;
    overflow-x: auto;
    padding-bottom: 8px;
  }
  .clarity-dt-step {
    flex: 1;
    min-width: 80px;
    text-align: center;
    position: relative;
    padding: 0 8px;
  }
  .clarity-dt-step::after {
    content: '→';
    position: absolute;
    right: -8px;
    top: 22px;
    transform: translateY(-50%);
    color: #9B9890;
    font-size: 14px;
    z-index: 1;
  }
  .clarity-dt-step:last-child::after { display: none; }

  /* ── Lock timeline */
  .clarity-lock-timeline {
    display: flex;
    align-items: stretch;
    margin: 32px 0 24px;
    background: #FAFAF8;
    border: 1px solid rgba(26,25,22,0.10);
    border-radius: 10px;
    overflow: hidden;
  }
  .clarity-lock-seg {
    flex: 1;
    padding: 20px 16px;
    text-align: center;
    border-right: 1px solid rgba(26,25,22,0.10);
  }
  .clarity-lock-seg:last-child { border-right: none; }
  @media (max-width: 700px) {
    .clarity-lock-timeline { flex-direction: column; }
    .clarity-lock-seg { border-right: none; border-bottom: 1px solid rgba(26,25,22,0.10); }
    .clarity-lock-seg:last-child { border-bottom: none; }
  }

  /* ── Threshold strip */
  .clarity-threshold-strip {
    display: flex;
    margin-top: 32px;
    border: 1px solid rgba(26,25,22,0.10);
    border-radius: 10px;
    overflow: hidden;
    background: #FAFAF8;
  }
  .clarity-ts-item {
    flex: 1;
    padding: 20px 18px;
    border-right: 1px solid rgba(26,25,22,0.10);
  }
  .clarity-ts-item:last-child { border-right: none; }
  @media (max-width: 650px) {
    .clarity-threshold-strip { flex-direction: column; }
    .clarity-ts-item { border-right: none; border-bottom: 1px solid rgba(26,25,22,0.10); }
    .clarity-ts-item:last-child { border-bottom: none; }
  }

  /* ── Responsive grids */
  .clarity-terms-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
    margin-top: 32px;
  }
  .clarity-pay-split, .clarity-screen-split, .clarity-limits-split {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    margin-top: 32px;
  }
  .clarity-maint-grid {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 16px;
    margin-top: 32px;
  }
  .clarity-tldr-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 16px;
    margin-top: 32px;
  }
  .clarity-small-rules {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 12px;
    margin-top: 32px;
  }
  @media (max-width: 600px) {
    .clarity-terms-grid { grid-template-columns: 1fr; }
    .clarity-pay-split  { grid-template-columns: 1fr; }
    .clarity-screen-split { grid-template-columns: 1fr; }
    .clarity-limits-split { grid-template-columns: 1fr; }
  }
  @media (max-width: 700px) {
    .clarity-maint-grid { grid-template-columns: 1fr; }
  }

  /* ── Last-child border resets */
  .clarity-screen-item:last-child { border-bottom: none; }
  .clarity-limits-item:last-child { border-bottom: none; }
`;

// ── Section heading helper ────────────────────────────────────────────────────

function SectionH2({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <h2 style={{ fontFamily: FONT_SERIF, fontSize: "clamp(26px, 4vw, 36px)", fontWeight: 400, lineHeight: 1.2, color: C.ink, marginBottom: 16 }}>
      {children}
    </h2>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function OwnerClarityGuide(): React.ReactElement {
  const { loading: authLoading } = useRequireAuth();
  const navigate = useNavigate();
  const [scrollPct, setScrollPct] = useState(0);
  const [activeSection, setActiveSection] = useState("");
  const ctaRef = useClaritySection("cta");

  // Scroll progress
  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setScrollPct(max > 0 ? (window.scrollY / max) * 100 : 0);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Active TOC section
  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    TOC_LINKS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveSection(id); },
        { threshold: 0.3, rootMargin: "-80px 0px -60% 0px" },
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, []);

  // PostHog: hero viewed
  useEffect(() => { posthog?.capture("owner_clarity_hero_viewed"); }, []);

  if (authLoading) return null;

  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  // ── Shared section wrapper style ────────────────────────────────────────────

  const sec = (pt = 80): React.CSSProperties => ({
    padding: `${pt}px 0 80px`,
    borderTop: `1px solid ${C.border}`,
  });

  const wrap: React.CSSProperties = {
    maxWidth: 860,
    margin: "0 auto",
    padding: "0 24px",
  };

  return (
    <Layout>
      <style>{SCOPED_CSS}</style>

      {/* Fixed scroll progress bar */}
      <div id="clarity-progress-bar" style={{ width: `${scrollPct}%` }} />

      <div style={{ background: C.bg, fontFamily: FONT_SANS, color: C.ink }}>

        {/* ══ HERO ════════════════════════════════════════════════════════════ */}
        <section id="hero" style={{ background: C.bg, position: "relative", overflow: "hidden", padding: "100px 0 80px" }}>
          {/* Subtle radial gradient overlay */}
          <div aria-hidden="true" style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 700px 500px at 70% -10%, rgba(45,90,61,0.06), transparent)", pointerEvents: "none" }} />

          <div style={wrap}>
            {/* Eyebrow pill */}
            <div className="clarity-fade-up" style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: C.accent, marginBottom: 28, padding: "6px 14px 6px 10px", background: C.accentLight, borderRadius: 4 }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="6.5" stroke="currentColor"/>
                <path d="M7 4v3.5l2 1" stroke="currentColor" strokeLinecap="round"/>
              </svg>
              Before You Sign — Read This First
            </div>

            <h1 className="clarity-fade-up clarity-fade-up-1" style={{ fontFamily: FONT_SERIF, fontSize: "clamp(36px, 6vw, 60px)", fontWeight: 400, lineHeight: 1.1, letterSpacing: "-0.02em", color: C.ink, marginBottom: 24, maxWidth: 700 }}>
              No fine print.<br />
              Just <em style={{ fontStyle: "italic", color: C.accent }}>plain answers</em><br />
              to how this works.
            </h1>

            <p className="clarity-fade-up clarity-fade-up-2" style={{ fontSize: 17, color: C.ink2, lineHeight: 1.7, maxWidth: 560, marginBottom: 40 }}>
              This is Reeve's owner-side clarity guide. It covers the important rules, obligations, and timelines you should understand before you list your property — written in plain language, not legal language.
            </p>

            <div className="clarity-fade-up clarity-fade-up-3" style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", marginBottom: 48 }}>
              <button
                onClick={() => navigate("/login?returnTo=/owner/add")}
                style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "13px 22px", fontFamily: FONT_SANS, fontSize: 14, fontWeight: 500, borderRadius: 6, cursor: "pointer", border: "none", background: C.ink, color: "white", transition: "all 0.15s ease", letterSpacing: "0.01em" }}
              >
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M7.5 1L14 7.5L7.5 14M14 7.5H1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                List My Property
              </button>
              <button
                onClick={() => scrollTo("tldr")}
                style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "13px 22px", fontFamily: FONT_SANS, fontSize: 14, fontWeight: 500, borderRadius: 6, cursor: "pointer", background: "transparent", color: C.ink, border: `1.5px solid ${C.borderStrong}`, transition: "all 0.15s ease", letterSpacing: "0.01em" }}
              >
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M7.5 1v13M1 7.5h13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                See Full Guide
              </button>
            </div>

            <p style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: C.ink3, fontStyle: "italic", margin: 0 }}>
              <span style={{ display: "block", width: 28, height: 1, background: C.ink4, flexShrink: 0 }} />
              We'd rather you understand exactly what you're agreeing to — before you agree to it.
            </p>
          </div>
        </section>

        {/* ══ TOC BAR ═════════════════════════════════════════════════════════ */}
        <div className="clarity-toc-bar">
          <div style={{ display: "inline-flex", gap: 0 }}>
            {TOC_LINKS.map(({ id, label }) => (
              <button
                key={id}
                className={`clarity-toc-link${activeSection === id ? " active" : ""}`}
                onClick={() => scrollTo(id)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ══ NOTICE BAR ══════════════════════════════════════════════════════ */}
        <div style={{ padding: "48px 0", borderTop: `1px solid ${C.border}` }}>
          <div style={wrap}>
            <div style={{ background: C.goldLight, border: "1px solid rgba(176,124,47,0.25)", borderRadius: 8, padding: "20px 24px", display: "flex", gap: 16, alignItems: "flex-start" }}>
              <div style={{ flexShrink: 0, marginTop: 1 }}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <circle cx="10" cy="10" r="9" stroke={C.gold} strokeWidth="1.5"/>
                  <path d="M10 6v5M10 13v1" stroke={C.gold} strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
              <div style={{ fontSize: 14, color: C.ink2, lineHeight: 1.6 }}>
                <strong style={{ color: C.gold }}>Informational guide only.</strong> This page is a plain-English explanation of how Reeve works. It does not replace your signed agreements. The Property Management Service Agreement (PMSA) and the Tripartite Leave and License Agreement are the binding documents. If this guide and the signed agreements ever differ on any point, <strong style={{ color: C.gold }}>the signed agreements prevail</strong> in all cases.
              </div>
            </div>
          </div>
        </div>

        {/* ══ AT A GLANCE ═════════════════════════════════════════════════════ */}
        <section id="tldr" style={sec()}>
          <div style={wrap}>
            <div className="clarity-label">At a Glance</div>
            <SectionH2>The things that matter most — upfront.</SectionH2>
            <p style={{ color: C.ink2 }}>Before you go through the full guide, here are the eight things every owner should know before listing with Reeve.</p>

            <div className="clarity-tldr-grid">
              <TldrCard iconColor="green" title="You pay Reeve nothing" body="Reeve's fee is charged to the tenant — 7% above base rent for the first term, 4% at renewal. You receive 100% of your agreed base rent." icon={<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 9l4 4 8-8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>} />
              <TldrCard iconColor="gold" title="You hold the deposit — with rules" body="The 2-month security deposit is paid by the tenant directly to you before possession. You hold it during the tenancy. Once either party serves notice, you must transfer the full deposit amount to Reeve within 5 business days. This is a fixed, non-negotiable, self-executing obligation." icon={<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="2" y="5" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.6"/><path d="M6 5V4a3 3 0 0 1 6 0v1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>} />
              <TldrCard iconColor="red" title="Non-transfer triggers automatic consequences" body="If you don't transfer the deposit on time, two consequences activate automatically from Day 6 — no discretion. A flat delay charge of 0.5% of the security deposit per day accrues (capped at 15% of the deposit), and Reeve withholds your rent payout in an amount equivalent to the full deposit. This is contractual." icon={<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.6"/><path d="M9 5.5V10M9 12v.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>} />
              <TldrCard iconColor="blue" title="RA-001 governs all deductions" body="You cannot add, change, or dispute deductions outside the RA-001 process. Reeve's assessment is the binding instrument for deposit settlement." icon={<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="3" y="3" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.6"/><path d="M6 9h6M6 12h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>} />
              <TldrCard iconColor="ink" title="6-month lock-in, 8-month minimum" body="The lock-in period is 6 months. Notice can be served earlier, but the 2-month notice clock only starts after lock-in ends. Minimum effective tenancy: 8 months." icon={<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M4 9h10M9 4v10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>} />
              <TldrCard iconColor="green" title="Standard turnover is platform-borne" body="Standard deep cleaning and interior repainting at exit are paid by Reeve — not the tenant, not you — provided the property has been under an active PMSA for at least 11 completed months as of the exit date." icon={<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 2a7 7 0 1 1 0 14A7 7 0 0 1 9 2z" stroke="currentColor" strokeWidth="1.6"/><path d="M6 9l2 2 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>} />
              <TldrCard iconColor="gold" title="Small repairs: pre-authorised up to ₹2,000" body="For defined minor repairs, Reeve can arrange fixes up to ₹2,000 per incident without repeated back-and-forth, so small issues do not stay pending. This pre-authorised flow continues only until such repairs total ₹5,000 in a month. Anything beyond these limits is always routed to you for approval." icon={<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 14s-6-3.5-6-7a6 6 0 0 1 12 0c0 3.5-6 7-6 7z" stroke="currentColor" strokeWidth="1.6"/><circle cx="9" cy="7" r="1.5" stroke="currentColor" strokeWidth="1.4"/></svg>} />
              <TldrCard iconColor="ink" title="Reeve coordinates — owner decides the big things" body="You approve tenant applications, set house rules, set base rent, and approve all non-emergency repairs above the pre-authorised threshold. Reeve doesn't override your decisions." icon={<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.6"/><path d="M9 6v3l2 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>} />
            </div>
          </div>
        </section>

        {/* ══ KEY TERMS ════════════════════════════════════════════════════════ */}
        <section id="documents" style={sec()}>
          <div style={wrap}>
            <div className="clarity-label">Key Terms</div>
            <SectionH2>Documents and terminology you'll see throughout.</SectionH2>
            <p style={{ color: C.ink2 }}>Reeve uses precise terms consistently. Here's what each one means.</p>

            <div className="clarity-terms-grid">
              <TermCard name="Property Management Service Agreement (PMSA)" body="The agreement between you and Reeve that governs how Reeve operates, what it does on your behalf, what you are obligated to do, and how either party may terminate the arrangement. Initial term is 2 years, renewable. This is a separate document from the tenancy agreement. (You may also see this referred to as the &quot;owner service agreement&quot; in plain-language sections of this guide.)" />
              <TermCard name="Tripartite Leave & License Agreement" body="The three-party tenancy agreement signed by you, the tenant, and Reeve. It governs rent, deposit, lock-in, notice, maintenance obligations, and exit terms. This is the e-stamped (via SHCIL Karnataka) and e-signed (via Leegality, sequentially Tenant → Owner → Reeve) document that constitutes the tenancy." />
              <TermCard name="PBR — Property Baseline Report" body="The condition baseline prepared at owner onboarding under the PMSA. Signed by you. It contains the property's baseline condition, inventory, photos, video walkthroughs, room mapping, keys, remotes, accessories, fixtures, fittings, and appliances. The PBR is the source from which the MIR is derived on the tenant's possession day." />
              <TermCard name="MIR — Move-In Report" body="A single signed document produced on possession day, derived from the PBR and updated to record any change in condition, inventory, keys, remotes, accessories, detachable parts, fixtures, fittings, appliances, photographs, or other baseline particulars between owner onboarding and possession. The tenant signs this on possession day. It is the binding move-in baseline against which exit condition is compared." />
              <TermCard name="BIR — Bi-Annual Inspection Report" body="A limited mid-tenancy inspection report (maximum once per 6-month period) covering observed condition and visible variances from the MIR. Used for monitoring and maintenance tracking only. The BIR does not replace the MIR as the move-in baseline and is not a binding deduction-trigger by itself." />
              <TermCard name="MOCR — Move-Out Condition Report" body="The room-by-room exit condition record produced when the tenant vacates, signed by the tenant on move-out day. The MOCR is compared against the MIR to produce the RA-001." />
              <TermCard name="RA-001 — Damage Assessment Report" body="The exit assessment issued by Reeve after the MOCR. It documents differences between the MIR and MOCR, classifies findings under Reeve's Damage Dictionary responsibility codes, and determines what, if any, deposit deductions apply. The RA-001 is the binding instrument for deposit settlement. No deduction may be made outside this process." />
              <TermCard name="Active Tenancy" body="The period from the date the tenant takes possession to the date the property is formally handed back to you after exit. The security deposit remains with you until written notice is served through the platform, after which it must be transferred in full to Reeve within 5 business days for settlement." />
              <TermCard name="Written Notice Through the Platform" body="Formal notice served by either you or the tenant through Reeve's platform — not a WhatsApp message, not a phone call. The platform notice is the recognised trigger for the 2-month notice period (for tenancy exit) and the deposit transfer obligation. Notice is also deemed served on email delivery confirmation or 3 business days after dispatch by registered post/courier." />
              <TermCard name="Confirmation Token" body="The pre-possession booking amount paid by a prospective tenant to Reeve to reserve the property and start onboarding. If the tenant takes possession, it is adjusted against the first month's payment. If the tenant cancels before possession, it is non-refundable. If you (the owner) cancel or are unable to deliver possession before the Possession Date, the token is refunded in full to the tenant, and you separately pay Reeve a fixed cancellation charge of ₹5,000." />
            </div>
          </div>
        </section>

        {/* ══ WHO PAYS WHAT ════════════════════════════════════════════════════ */}
        <section id="who-pays" style={sec()}>
          <div style={wrap}>
            <div className="clarity-label">Who Pays What</div>
            <SectionH2>Money — how it flows and who owes what.</SectionH2>
            <p style={{ color: C.ink2 }}>The financial structure is straightforward. Reeve's fee never comes from your side of the ledger.</p>

            <div className="clarity-pay-split">
              {/* Owner column */}
              <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
                <div style={{ padding: "14px 20px", fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", background: C.accentLight, color: C.accent }}>Owner — What You Pay</div>
                {/* PayZero */}
                <div style={{ padding: "18px 20px", borderTop: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ fontFamily: FONT_SERIF, fontSize: 26, fontStyle: "italic", color: C.accent, lineHeight: 1 }}>₹0</div>
                  <div style={{ fontSize: 13, color: C.ink2, lineHeight: 1.4 }}>You pay Reeve nothing — not at listing, not monthly, not at renewal.</div>
                </div>
                <PayRow title="Society Maintenance" body="Included in the base rent you list. You receive it from the tenant via Reeve and pay the society directly. The tenant pays nothing separately for society maintenance." />
                <PayRow title="Bucket 1 Repairs (small, defined)" body="Only a defined category of small routine issues falls under Reeve's Bucket 1 framework. When Reeve classifies such an issue as normal owner-side upkeep (and not tenant responsibility), Reeve can arrange the fix up to ₹2,000 per incident, until such repairs total ₹5,000 in a calendar month. Cost is deducted from your next rent payout with vendor invoice. This is a defined process — not an automatic adjustment for every small repair." />
                <PayRow title="Bucket 2 Repairs (larger, owner-side)" body="Bucket 2 applies to owner-side issues that fall outside the Bucket 1 list, exceed its limits, or otherwise require your approval. You arrange and fund Bucket 2 repairs directly, unless Reeve is forced to commission urgent work after the defined non-response escalation." />
                <PayRow title="Tier 1 Emergency Repairs" body="For genuine habitability or safety emergencies (structural damage, water leak affecting electrics, gas leak, security breach, complete bathroom failure), Reeve acts immediately. Up to ₹10,000 per incident is self-executing and deducted from your next rent payout without prior approval. Above ₹10,000, Reeve still acts to protect the property and its occupants, but notifies you within 2 hours of action with vendor invoice (where available) and photos, and you may raise a good-faith objection within 7 days on grounds of manifest error, fraud, or gross negligence." />
                <PayRow title="Turnover Costs (if <11 months under PMSA)" body="Standard interior repainting and standard deep cleaning are borne by Reeve only if the PMSA has remained active for at least 11 completed months as of the exit date. If you choose to end the PMSA before that 11-month mark, those standard turnover costs are no longer Reeve-borne and become your responsibility — whether or not a tenant is still in place at that time. Active tenancy lock-in supersedes PMSA termination." />
              </div>
              {/* Tenant column */}
              <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
                <div style={{ padding: "14px 20px", fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", background: C.blueLight, color: C.blue }}>Tenant — What They Pay</div>
                <PayRow title="Base Rent" body="Paid to Reeve as part of the indivisible Total Monthly Payment. Routed to you within 2 business days of confirmed receipt." />
                <PayRow title="Reeve Fee — First Term" body="Flat 7% above base rent, paid by the tenant on top of rent. Does not reduce your take-home." />
                <PayRow title="Reeve Fee — At Renewal" body="Flat 4% above base rent. You continue paying nothing at renewal." />
                <PayRow title="Security Deposit" body="2 months' rent. Paid by the tenant directly to you before possession. Held by you during the tenancy. Transferred in full to Reeve within 5 business days of either party serving notice, for the settlement window only." />
                <PayRow title="TDS" body="TDS on base rent is the tenant's sole responsibility — not yours and not Reeve's. Reeve is not a withholding agent. Where applicable: Section 194-IB at 2% for resident owners (above the rent threshold) and Section 195 at 30% for NRI owners (regardless of threshold)." />
                <div style={{ padding: "14px 20px", borderTop: `1px solid ${C.border}`, fontSize: 13, color: C.ink4, fontStyle: "italic" }}>
                  Standard turnover costs (deep cleaning, interior repainting) are not charged to the tenant under any circumstances.
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══ DEPOSIT RULES ════════════════════════════════════════════════════ */}
        <section id="deposit" style={sec()}>
          <div style={wrap}>
            <div className="clarity-label">Deposit Rules</div>
            <SectionH2>The deposit: how it's held and what happens at exit.</SectionH2>
            <p style={{ color: C.ink2 }}>This section is important. The deposit rules have automatic consequences if not followed. Read it carefully.</p>

            {/* Deposit Timeline */}
            <div style={{ marginTop: 32 }}>
              <div className="clarity-dt-track">
                {/* Step 1: Move-In */}
                <div className="clarity-dt-step">
                  <div style={{ width: 44, height: 44, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px", background: C.blueLight, color: C.blue }}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2a6 6 0 1 1 0 12A6 6 0 0 1 8 2z" stroke="currentColor" strokeWidth="1.4"/><path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                  <div style={{ fontSize: 12, color: C.ink3, lineHeight: 1.4 }}><strong style={{ display: "block", fontSize: 13, color: C.ink, marginBottom: 2 }}>Move-In</strong>Tenant pays the 2-month deposit directly to you before possession</div>
                </div>
                {/* Step 2: Active Tenancy */}
                <div className="clarity-dt-step">
                  <div style={{ width: 44, height: 44, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px", background: C.blueLight, color: C.blue }}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="3" y="4" width="10" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><path d="M5 4V3.5a3 3 0 0 1 6 0V4" stroke="currentColor" strokeWidth="1.4"/></svg>
                  </div>
                  <div style={{ fontSize: 12, color: C.ink3, lineHeight: 1.4 }}><strong style={{ display: "block", fontSize: 13, color: C.ink, marginBottom: 2 }}>Active Tenancy</strong>You hold the deposit in your account</div>
                </div>
                {/* Step 3: Notice Served */}
                <div className="clarity-dt-step">
                  <div style={{ width: 44, height: 44, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px", background: C.goldLight, color: C.gold }}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2v7M8 12v1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                  </div>
                  <div style={{ fontSize: 12, color: C.ink3, lineHeight: 1.4 }}><strong style={{ display: "block", fontSize: 13, color: C.ink, marginBottom: 2 }}>Notice Served</strong>Either party through the platform</div>
                </div>
                {/* Step 4: Day 5 Deadline */}
                <div className="clarity-dt-step">
                  <div style={{ width: 44, height: 44, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px", background: C.redLight, color: C.red }}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4"/><path d="M8 5v3M8 10v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
                  </div>
                  <div style={{ fontSize: 12, color: C.ink3, lineHeight: 1.4 }}><strong style={{ display: "block", fontSize: 13, color: C.ink, marginBottom: 2 }}>5 Business Day Deadline</strong>Full deposit must reach Reeve from the date of notice</div>
                </div>
                {/* Step 5: Settlement */}
                <div className="clarity-dt-step">
                  <div style={{ width: 44, height: 44, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px", background: C.accentLight, color: C.accent }}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 8l3 3 5-5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                  <div style={{ fontSize: 12, color: C.ink3, lineHeight: 1.4 }}><strong style={{ display: "block", fontSize: 13, color: C.ink, marginBottom: 2 }}>Settlement</strong>RA-001 assessment → final disbursement</div>
                </div>
              </div>
            </div>

            <WarningBlock>
              <strong style={{ color: C.red }}>If you do not transfer the deposit within 5 business days:</strong> Starting Day 6, two automatic consequences activate — no discretion, no grace period.
              <br /><br />
              <strong style={{ color: C.red }}>Delay charges:</strong> A flat 0.5% of the security deposit amount per day from Day 6 until the date of actual transfer, capped at a maximum of 15% of the security deposit — deducted from your rent payouts.
              <br /><br />
              <strong style={{ color: C.red }}>Rent withholding:</strong> Reeve withholds your rent payout in an amount equivalent to the full deposit. If the deposit is not transferred within 60 days of notice, Reeve disburses the withheld rent to the tenant as deposit compensation, and your PMSA is terminated. This is written into the tripartite agreement and PMSA and executes automatically.
            </WarningBlock>

            <AutoBlock>
              <strong style={{ color: C.accent }}>Self-executing clause:</strong> The rent withholding and delay charges are not Reeve's discretionary decision. They activate automatically on Day 6 as contractual obligations written into the agreements. Reeve does not need to issue a separate notice to enforce them.
            </AutoBlock>
          </div>
        </section>

        {/* ══ LOCK-IN & EXIT TIMING ════════════════════════════════════════════ */}
        <section id="exit-timing" style={sec()}>
          <div style={wrap}>
            <div className="clarity-label">Lock-In &amp; Exit Timing</div>
            <SectionH2>Lock-in, notice, and minimum tenancy — clearly.</SectionH2>
            <p style={{ color: C.ink2 }}>The timing rules are simple but have one counterintuitive aspect. Read the notice rule carefully.</p>

            {/* Lock Timeline */}
            <div className="clarity-lock-timeline">
              <div className="clarity-lock-seg">
                <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: C.ink3, marginBottom: 6 }}>Lock-In Period</div>
                <div style={{ fontFamily: FONT_SERIF, fontSize: 22, lineHeight: 1, marginBottom: 4, color: C.accent }}>Months 1–6</div>
                <div style={{ fontSize: 12, color: C.ink3, lineHeight: 1.4 }}>Neither party can exit except in the case of a Material Breach by the other party. Early exit otherwise = the exiting party pays Base Rent for each remaining lock-in month to the non-exiting party, plus the Reeve Service Fee for each remaining lock-in month to Reeve (Early Exit Liability).</div>
              </div>
              <div className="clarity-lock-seg">
                <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: C.ink3, marginBottom: 6 }}>Notice Window Opens</div>
                <div style={{ fontFamily: FONT_SERIF, fontSize: 22, lineHeight: 1, marginBottom: 4, color: C.gold }}>From Month 7</div>
                <div style={{ fontSize: 12, color: C.ink3, lineHeight: 1.4 }}>2-month notice clock begins only after lock-in ends, regardless of when notice was served.</div>
              </div>
              <div className="clarity-lock-seg" style={{ background: C.accentLight }}>
                <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: C.ink3, marginBottom: 6 }}>Earliest Possible Exit</div>
                <div style={{ fontFamily: FONT_SERIF, fontSize: 22, lineHeight: 1, marginBottom: 4, color: C.ink }}>Month 8</div>
                <div style={{ fontSize: 12, color: C.ink3, lineHeight: 1.4 }}>Minimum effective tenancy = 6 months lock-in + 2 months notice = 8 months.</div>
              </div>
            </div>

            <InfoBox>
              <strong style={{ color: C.blue }}>The notice timing rule:</strong> A tenant (or owner) may serve written notice through the platform at any point — including during the lock-in period. However, the 2-month notice clock does not start counting until lock-in ends. So a notice served in Month 3 does not move the exit date forward. The earliest exit under that notice remains Month 8. <strong style={{ color: C.blue }}>The notice is registered, but the calendar only starts at the end of lock-in.</strong>
            </InfoBox>

            <InfoBox style={{ marginTop: 12 }}>
              <strong style={{ color: C.blue }}>Terminating the PMSA:</strong> You may terminate the PMSA with 60 days' written notice through the platform, provided there is no active tenancy lock-in in force. If a tenant is within their lock-in period, you cannot terminate the PMSA until that lock-in ends — and forced termination during a tenant's lock-in triggers compensation to the tenant (remaining-lock-in Base Rent) and to Reeve (remaining-lock-in Reeve Service Fee). Termination triggered by vacancy non-placement under the Day 30 Owner Decision Point or the Day 45 auto-terminate path does not require the 60-day notice.
            </InfoBox>
          </div>
        </section>

        {/* ══ TURNOVER COST ELIGIBILITY ════════════════════════════════════════ */}
        <section id="turnover" style={sec()}>
          <div style={wrap}>
            <div className="clarity-label">Turnover Cost Eligibility</div>
            <SectionH2>Who bears the cost of deep cleaning and repainting at exit.</SectionH2>
            <p style={{ color: C.ink2 }}>Standard deep cleaning and standard interior repainting are not charged to the tenant under any circumstances. Which party bears these costs depends on how long your property has been under an active PMSA.</p>

            {/* Turnover Box */}
            <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden", marginTop: 32 }}>
              <div style={{ padding: "18px 24px", background: C.accentLight, borderBottom: "1px solid rgba(45,90,61,0.15)", display: "flex", alignItems: "center", gap: 12 }}>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M4 9.5l3 3 7-7" stroke={C.accent} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                <h4 style={{ fontSize: 14, fontWeight: 600, color: C.accent, margin: 0 }}>Turnover Cost Eligibility Rule</h4>
              </div>
              <div style={{ padding: "20px 24px" }}>
                <p style={{ fontSize: 14, color: C.ink2, lineHeight: 1.7, marginBottom: 12 }}>Standard deep cleaning and standard interior repainting at exit are <strong style={{ color: C.ink }}>platform-borne (Reeve pays)</strong> only if the property has remained under an active PMSA for at least <strong style={{ color: C.ink }}>11 completed months</strong> as of the exit date.</p>
                <p style={{ fontSize: 14, color: C.ink2, lineHeight: 1.7, marginBottom: 12 }}>If the PMSA was terminated and the property has completed <strong style={{ color: C.ink }}>fewer than 11 months</strong> under that agreement at the time of exit, these turnover costs become <strong style={{ color: C.ink }}>owner-borne</strong> (you pay).</p>
                <p style={{ fontSize: 14, color: C.ink2, lineHeight: 1.7, marginBottom: 14 }}>These costs are <strong style={{ color: C.ink }}>not</strong> charged to the tenant under any circumstance.</p>
                <div style={{ background: C.accentLight, borderRadius: 6, padding: "14px 18px", fontSize: 13.5, color: C.accent, fontWeight: 500, lineHeight: 1.6, display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: 1 }}><path d="M8 2l1.8 3.6L14 6.6l-3 2.9.7 4.1L8 11.4l-3.7 2.2.7-4.1L2 6.6l4.2-.9L8 2z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/></svg>
                  Active tenancy lock-in supersedes PMSA termination. If a tenant is within their lock-in period, the active tenancy continues even if you have served notice on the PMSA.
                </div>
              </div>
            </div>

            <div style={{ marginTop: 16, padding: "16px 20px", background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13.5, color: C.ink2, lineHeight: 1.65 }}>
              <strong style={{ color: C.ink }}>What the standard exit service covers:</strong> All interior walls and ceilings (all rooms), kitchen walls excluding tiled backsplash, bathroom walls above tile line, balcony interior walls. Deep cleaning covers all rooms, kitchen inside and out, all bathrooms, and the balcony. It does <em>not</em> include exterior surfaces, specialty finishes documented in the Property Baseline Record, pest control, carpet or upholstery cleaning, marble polishing, or facade cleaning. Any premium finish documented at move-in (PBR) that exceeds the standard — the difference in cost is chargeable to you, not covered by Reeve.
            </div>
          </div>
        </section>

        {/* ══ MAINTENANCE FRAMEWORK ════════════════════════════════════════════ */}
        <section id="maintenance" style={sec()}>
          <div style={wrap}>
            <div className="clarity-label">Maintenance Framework</div>
            <SectionH2>Three tiers. Three different owner obligations.</SectionH2>
            <p style={{ color: C.ink2 }}>Reeve operates a three-tier maintenance framework. Repairs are not classified by amount alone — Reeve first determines whether the issue is tenant responsibility, normal owner-side upkeep, or outside the pre-authorised framework, and then applies the relevant process.</p>

            <div className="clarity-maint-grid">
              {/* Emergency */}
              <div style={{ borderRadius: 10, overflow: "hidden", border: `1px solid ${C.border}`, background: C.bgCard }}>
                <div style={{ padding: "16px 18px", display: "flex", alignItems: "center", gap: 10, background: C.redLight }}>
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="7.5" stroke={C.red} strokeWidth="1.4"/><path d="M9 5v4M9 12.5v.5" stroke={C.red} strokeWidth="1.8" strokeLinecap="round"/></svg>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.red }}>Emergency</div>
                    <div style={{ fontSize: 11, color: C.red, opacity: 0.75 }}>Immediate action</div>
                  </div>
                </div>
                <div style={{ padding: "16px 18px" }}>
                  <MaintRow label="What" text="Structural damage, water leak near electrics, gas leak, security breach, complete bathroom failure" />
                  <MaintRow label="Reeve" text="Acts immediately. Vendor dispatched within 4 hours. No owner approval required — ever." />
                  <MaintRow label="You" text="Notified within 2 hours of action taken — not before. Up to ₹10,000 per incident is self-executing and deducted from your next rent payout. Above ₹10,000, action remains self-executing to protect the property and its occupants, but Reeve notifies you within 2 hours with vendor invoice (where available) and photos, and you may raise a good-faith objection within 7 days on grounds of manifest error, fraud, or gross negligence (resolved through the dispute mechanism in the agreements)." />
                  <MaintRow label="If ignored" text="Your response is not required for action; the protective response proceeds either way." isLast />
                </div>
              </div>

              {/* Bucket 1 */}
              <div style={{ borderRadius: 10, overflow: "hidden", border: `1px solid ${C.border}`, background: C.bgCard }}>
                <div style={{ padding: "16px 18px", display: "flex", alignItems: "center", gap: 10, background: C.accentLight }}>
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="3" y="3" width="12" height="12" rx="2" stroke={C.accent} strokeWidth="1.4"/><path d="M6 9h6M9 6v6" stroke={C.accent} strokeWidth="1.4" strokeLinecap="round"/></svg>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.accent }}>Bucket 1 — Pre-Authorised</div>
                    <div style={{ fontSize: 11, color: C.accent, opacity: 0.75 }}>Defined owner-side upkeep items</div>
                  </div>
                </div>
                <div style={{ padding: "16px 18px" }}>
                  <MaintRow label="What" text="Leaking taps, broken latches, fused switches, running toilets, minor plumbing blockages, broken exhaust fan covers, loose hinges, and similar small defined repairs" />
                  <MaintRow label="Reeve" text="Assesses the issue within 4 hours (8am–8pm, 7 days a week). For defined Bucket 1 items classified as normal owner-side upkeep, a vendor may be deployed within 24 hours without per-incident approval, subject to the rupee thresholds." />
                  <MaintRow label="You" text="You receive the vendor invoice, and the amount is adjusted from your next rent payout — only where the issue is documented by Reeve as a Bucket 1 owner-side upkeep item and not tenant responsibility." />
                  <MaintRow label="Limit" text="Up to ₹2,000 per incident, until such items total ₹5,000 in a calendar month. Items between ₹2,001 and ₹5,000 trigger a 4-hour owner approval window before Reeve proceeds. It does not apply to every repair below ₹2,000." isLast />
                </div>
              </div>

              {/* Bucket 2 */}
              <div style={{ borderRadius: 10, overflow: "hidden", border: `1px solid ${C.border}`, background: C.bgCard }}>
                <div style={{ padding: "16px 18px", display: "flex", alignItems: "center", gap: 10, background: C.blueLight }}>
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 3v12M3 9h12" stroke={C.blue} strokeWidth="1.4" strokeLinecap="round"/></svg>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.blue }}>Bucket 2 — Owner Approval</div>
                    <div style={{ fontSize: 11, color: C.blue, opacity: 0.75 }}>Larger or non-pre-authorised owner-side upkeep</div>
                  </div>
                </div>
                <div style={{ padding: "16px 18px" }}>
                  <MaintRow label="What" text="Issues that fall outside the defined Bucket 1 framework, exceed its limits, or are documented by Reeve as larger owner-side upkeep items requiring a different approval path (for example, appliance failure, structural work, or plumbing beyond the pre-authorised scope)" />
                  <MaintRow label="Reeve" text="Documents the issue, notifies you within 4 hours of the request, and routes it through the owner-approval path." />
                  <MaintRow label="You" text="Urgent items: 48-hour response window. Non-urgent: 5-day window. You arrange and fund the repair directly, or authorise Reeve to commission it." />
                  <MaintRow label="If ignored" text="Urgent items: if you do not respond within 48 hours, Reeve sends a formal escalation. If you do not respond within 24 more hours (72 hours total), Reeve commissions the repair under the documented escalation process and adjusts the amount from your payout. Non-urgent: owner non-response is recorded in the platform trail and may be relevant in any future dispute." isLast />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══ THRESHOLD EXPLAINER ══════════════════════════════════════════════ */}
        <section id="threshold" style={{ padding: "0 0 80px", borderTop: `1px solid ${C.border}` }}>
          <div style={{ ...wrap, paddingTop: 80 }}>
            <div className="clarity-label">The ₹2,000 / ₹5,000 Rule</div>
            <SectionH2>Pre-authorised repair limits — explained clearly.</SectionH2>
            <p style={{ color: C.ink2 }}>When you sign the PMSA, you pre-authorise Reeve to act only on defined Bucket 1 owner-side upkeep items, within set limits and through a documented process.</p>

            <div className="clarity-threshold-strip">
              <div className="clarity-ts-item">
                <div style={{ fontFamily: FONT_SERIF, fontSize: 18, color: C.ink, marginBottom: 6, lineHeight: 1.2 }}>Up to ₹2,000<br /><span style={{ fontSize: 13, color: C.ink3, fontFamily: FONT_SANS }}>per incident</span></div>
                <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8, color: C.accent }}>Reeve acts automatically</div>
                <div style={{ fontSize: 13, color: C.ink3, lineHeight: 1.5 }}>For defined Bucket 1 items that Reeve documents as normal owner-side upkeep and not tenant responsibility, Reeve can arrange the fix without waiting for per-incident approval.</div>
              </div>
              <div className="clarity-ts-item">
                <div style={{ fontFamily: FONT_SERIF, fontSize: 18, color: C.ink, marginBottom: 6, lineHeight: 1.2 }}>₹2,001 – ₹5,000<br /><span style={{ fontSize: 13, color: C.ink3, fontFamily: FONT_SANS }}>per incident</span></div>
                <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8, color: C.gold }}>4-hour approval window</div>
                <div style={{ fontSize: 13, color: C.ink3, lineHeight: 1.5 }}>For owner-side upkeep items above ₹2,000 and up to ₹5,000, Reeve notifies you and waits up to 4 hours for approval before proceeding. If you do not respond within 4 hours, Reeve may proceed.</div>
              </div>
              <div className="clarity-ts-item">
                <div style={{ fontFamily: FONT_SERIF, fontSize: 18, color: C.ink, marginBottom: 6, lineHeight: 1.2 }}>Above ₹5,000<br /><span style={{ fontSize: 13, color: C.ink3, fontFamily: FONT_SANS }}>per incident</span></div>
                <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8, color: C.red }}>Explicit approval required</div>
                <div style={{ fontSize: 13, color: C.ink3, lineHeight: 1.5 }}>Items above ₹5,000, or issues outside the defined Bucket 1 list, move to the owner-approval (Bucket 2) path before any work proceeds.</div>
              </div>
              <div className="clarity-ts-item">
                <div style={{ fontFamily: FONT_SERIF, fontSize: 18, color: C.ink, marginBottom: 6, lineHeight: 1.2 }}>Tier 1 Emergency<br /><span style={{ fontSize: 13, color: C.ink3, fontFamily: FONT_SANS }}>self-executing within defined rules</span></div>
                <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8, color: C.red }}>Immediate</div>
                <div style={{ fontSize: 13, color: C.ink3, lineHeight: 1.5 }}>For genuine safety or habitability emergencies, Reeve acts immediately within the documented emergency framework. Up to ₹10,000 per incident is self-executing and deducted from your next rent payout. Above ₹10,000, action remains self-executing to protect the property and its occupants, but you are notified within 2 hours with vendor invoice (where available) and photos, with a 7-day good-faith objection window on manifest error, fraud, or gross negligence grounds.</div>
              </div>
            </div>

            {/* Monthly Cap Note */}
            <div style={{ marginTop: 14, background: C.goldLight, border: "1px solid rgba(176,124,47,0.2)", borderRadius: 8, padding: "14px 18px", fontSize: 14, color: C.ink2, display: "flex", gap: 12, alignItems: "flex-start" }}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ flexShrink: 0, marginTop: 1 }}><circle cx="9" cy="9" r="7.5" stroke={C.gold} strokeWidth="1.4"/><path d="M9 5.5V9.5M9 12v.5" stroke={C.gold} strokeWidth="1.5" strokeLinecap="round"/></svg>
              <div><strong style={{ color: C.gold }}>Monthly accumulation cap:</strong> Reeve's pre-authorised Bucket 1 authority operates only until the total Bucket 1 costs in a given month accumulate to ₹5,000. Once this cap is reached, no further Bucket 1 repairs proceed without your explicit approval for the remainder of that month — regardless of individual incident cost.</div>
            </div>
          </div>
        </section>

        {/* ══ YOUR CONTROL ═════════════════════════════════════════════════════ */}
        <section id="screening" style={sec()}>
          <div style={wrap}>
            <div className="clarity-label">Your Control</div>
            <SectionH2>What Reeve handles vs. what you decide.</SectionH2>
            <p style={{ color: C.ink2 }}>Reeve operates between you and the tenant so you don't have to manage day-to-day interactions. But there are things that remain entirely your call.</p>

            <div className="clarity-screen-split">
              <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
                <div style={{ padding: "14px 20px", fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", borderBottom: `1px solid ${C.border}`, background: C.accentLight, color: C.accent }}>Reeve Handles</div>
                {[
                  "Tenant sourcing, marketing, and inquiries",
                  "Identity verification (Aadhaar + PAN), income verification, resident count, CIBIL self-declaration",
                  "Application screening and shortlisting — only verified applications reach you",
                  "All communication with the tenant during the tenancy",
                  "Rent collection, routing to you, and delay charge enforcement",
                  "Move-in condition documentation (MIR) and signature, and the 5-day Amendment Window after possession",
                  "Maintenance intake, assessment, vendor dispatch (Emergency + Bucket 1)",
                  "Exit inspection, MOCR, and RA-001 damage assessment",
                  "Deposit custody during the settlement window and final disbursement",
                ].map((item) => <ScreenItem key={item} text={item} />)}
              </div>
              <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
                <div style={{ padding: "14px 20px", fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", borderBottom: `1px solid ${C.border}`, background: "rgba(26,25,22,0.05)", color: C.ink }}>You Decide</div>
                {[
                  "Base rent amount",
                  "Tenant acceptance or rejection (one counter-offer round allowed per application)",
                  "House rules — no pets, family-only, vegetarian preference, etc. (enforced at filter stage)",
                  "Approval or rejection of Bucket 2 repair proposals",
                  "Whether to opt out of reviewing applications (auto-accept first eligible applicant)",
                  "Any premium improvements or upgrades beyond standard exit service scope",
                ].map((item) => <ScreenItem key={item} text={item} />)}
              </div>
            </div>

            <InfoBox style={{ marginTop: 16 }}>
              <strong style={{ color: C.blue }}>Tenant types Reeve screens out automatically:</strong> Students, foreign nationals, applicants under 21, applicants with no verifiable income proof, and anyone intending to stay less than 10 months are rejected before any application reaches you. Your house rule preferences are applied as additional filters on top of this.
            </InfoBox>
          </div>
        </section>

        {/* ══ DEPOSIT DEDUCTIONS ═══════════════════════════════════════════════ */}
        <section id="deductions" style={sec()}>
          <div style={wrap}>
            <div className="clarity-label">Deposit Deductions</div>
            <SectionH2>How damage is assessed and deductions are determined.</SectionH2>
            <p style={{ color: C.ink2 }}>Deductions are not subjective or negotiable. They follow a documented process with defined rules. Here is how it works.</p>

            <div style={{ marginTop: 32, border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden", background: C.bgCard }}>
              <DeductionRow num={1} title="MIR — The baseline is set at move-in" desc="On possession day, Reeve prepares the MIR (Move-In Report), derived from the PBR and updated for any changes in condition, inventory, accessories, keys, remotes, fixtures, fittings, appliances, or other baseline particulars between owner onboarding and possession. The tenant signs this as the agreed baseline. Any defect recorded at move-in cannot be charged at exit. Any defect the tenant wants to add must be raised within the 5-day Amendment Window after possession — after that, the signed MIR stands as-is." />
              <DeductionRow num={2} title="Exit inspection — condition is compared to MIR" desc="At move-out, Reeve conducts an exit inspection using the same room-by-room, item-by-item protocol and produces the MOCR (Move-Out Condition Report). Every finding is compared against the MIR baseline. Pre-existing defects are excluded. Ordinary wear and tear, age-related deterioration, and environmental factors are not deductible from the deposit." />
              <DeductionRow num={3} title="RA-001 — The Damage Assessment Report is issued" desc="Reeve produces the RA-001 report classifying every finding under the Damage Dictionary responsibility codes. Deductions are calculated based on at-par restoration cost — repair to the same quality as documented at move-in, no betterment, no upgrades. Reeve arranges all repairs through its vendor panel. You receive the restored property. You do not receive a cash payment for the deduction amount." />
              <DeductionRow num={4} title="5-day objection window — one round of review" desc="From confirmed delivery of the RA-001, you have 5 days to raise a permitted objection, limited to a missed-item omission or clear labelling error, with photographic evidence. No fresh deduction claims, new damage claims, or independent quotes are permitted after the RA-001 is issued. The Operations Manager reviews and makes a final call. After this window, the RA-001 is final." isLast />
            </div>

            <WarningBlock style={{ marginTop: 16 }}>
              <strong style={{ color: C.red }}>Owner cannot create extra deductions outside RA-001.</strong> You cannot unilaterally add items to the deduction list, commission your own vendor, or submit your own quote after the RA-001 is issued. The RA-001 is the sole binding instrument. Beyond the platform process, the dispute resolution mechanism in the agreements (good-faith negotiation followed by mandatory arbitration) is the only further route.
            </WarningBlock>
          </div>
        </section>

        {/* ══ OTHER IMPORTANT RULES ════════════════════════════════════════════ */}
        <section id="small-rules" style={sec()}>
          <div style={wrap}>
            <div className="clarity-label">Other Important Rules</div>
            <SectionH2>Small rules with real consequences.</SectionH2>
            <p style={{ color: C.ink2 }}>These don't need a long section, but they matter enough to name clearly.</p>

            <div className="clarity-small-rules">
              <SmallRule
                icon={<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="7.5" stroke={C.ink3} strokeWidth="1.4"/><path d="M9 5.5V9.5M9 12v.5" stroke={C.ink3} strokeWidth="1.5" strokeLinecap="round"/></svg>}
                title="Late Rent — Defined Escalation"
                body="Tenant non-payment triggers an automatic escalation. A flat 1% of the Total Monthly Payment per day accrues from Day 6 until the earlier of actual receipt or the last day of that month. Capped at 30 days. Once the tenant remains in payment default for 30 continuous days, that constitutes a Material Breach under the tripartite agreement and you may initiate arbitration under the Arbitration & Conciliation Act, 1996 (sole arbitrator, Bengaluru seat). Delay charges collected from the tenant are credited to your payout. Reeve does not advance, subsidise, or pay your base rent from its own funds — your payout is strictly contingent on actual receipt of the tenant's payment."
              />
              <SmallRule
                icon={<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="4" y="7" width="10" height="8" rx="1.5" stroke={C.ink3} strokeWidth="1.4"/><path d="M6 7V5.5a3 3 0 0 1 6 0V7" stroke={C.ink3} strokeWidth="1.4"/></svg>}
                title="Key Return"
                body="Keys documented in the Move-In Inventory Record (MIR) must be returned at exit. Missing keys are a deductible item — governed by RA-001 in the same way as any other documented missing item."
              />
              <SmallRule
                icon={<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 3v12M3 9h12" stroke={C.ink3} strokeWidth="1.4" strokeLinecap="round"/></svg>}
                title="Society Maintenance at Exit"
                body="Society maintenance is not charged to the tenant at exit or at any other point. It is included in base rent and is your responsibility to pay the society directly from rent received."
              />
              <SmallRule
                icon={<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="3" y="3" width="12" height="12" rx="2" stroke={C.ink3} strokeWidth="1.4"/><path d="M6 9h6M6 12h4" stroke={C.ink3} strokeWidth="1.4" strokeLinecap="round"/></svg>}
                title="Utility Bills Must Be Cleared"
                body="Any unpaid utility bills — such as electricity, water, or gas — must be cleared before final deposit settlement. If they remain unpaid at exit, the outstanding amount may be adjusted from the security deposit before the final balance is released."
              />
              <SmallRule
                icon={<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 3v12M3 9h12" stroke={C.ink3} strokeWidth="1.4" strokeLinecap="round"/></svg>}
                title="Society Move-In / Move-Out Charges"
                body="Where applicable, society move-in, move-out, shifting, lift-padding, gate-pass, or similar charges are the tenant's direct responsibility to the society. The applicable details, where known, are recorded in the tripartite agreement schedule."
              />
              <SmallRule
                icon={<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="7.5" stroke={C.ink3} strokeWidth="1.4"/><path d="M9 6v3l2 1.5" stroke={C.ink3} strokeWidth="1.4" strokeLinecap="round"/></svg>}
                title="Vacancy Review Checkpoints"
                body="If no tenant is placed after listing: Day 14 — pricing review (Reeve recommends pricing adjustments and listing improvements). Day 21 — listing quality, furnishing, and pricing review. Day 30 — Owner Decision Point: you elect within 5 days to (a) continue for an Extended Vacancy Period of 15 days (Day 31–45) with implemented changes, or (b) terminate the PMSA immediately (no 60-day notice required for this scenario). Day 45 — if no tenant has been placed, the PMSA auto-terminates without further notice."
              />
              <SmallRule
                icon={<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M4 9.5l3 3 7-7" stroke={C.ink3} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                title="No Direct Owner-Tenant Contact"
                body="All communication during the tenancy is routed through Reeve's platform. Neither party has direct contact with the other. Flat numbers are hidden from listings until a visit is confirmed."
              />
            </div>
          </div>
        </section>

        {/* ══ REEVE'S LIMITS ═══════════════════════════════════════════════════ */}
        <section id="limits" style={sec()}>
          <div style={wrap}>
            <div className="clarity-label">Reeve's Limits</div>
            <SectionH2>What Reeve does not do.</SectionH2>
            <p style={{ color: C.ink2 }}>Being honest about limits is part of the model. These are the things Reeve explicitly does not offer, regardless of circumstances.</p>

            <div className="clarity-limits-split">
              <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
                <div style={{ padding: "14px 20px", fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", borderBottom: `1px solid ${C.border}`, background: "rgba(26,25,22,0.04)", color: C.ink2 }}>Reeve does not provide</div>
                {[
                  "Legal representation for you or the tenant in any forum",
                  "Guaranteed deposit recovery — the self-executing mechanism is strong, but is not an absolute guarantee",
                  "Guaranteed Bucket 2 repair timelines — you are responsible; Reeve escalates and may commission urgent items after defined non-response",
                  "Guaranteed vacancy timelines — Reeve reviews and recommends but cannot control market demand",
                  "Binding dispute adjudication — the RA-001 has defined finality within the platform; beyond that, the agreements provide for good-faith negotiation followed by mandatory arbitration under the Arbitration & Conciliation Act, 1996 (sole arbitrator, Bengaluru seat). There is no Rent Authority route under these agreements (the tripartite is structured as a license under the Indian Easements Act, 1882, not a tenancy under any rent control regime).",
                  "Tax/TDS withholding or reconciliation — TDS on rent is the tenant's sole responsibility (Section 194-IB for resident owners, Section 195 for NRI owners). Reeve is not a withholding agent.",
                ].map((item) => <LimitItem key={item} text={item} />)}
              </div>
              <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
                <div style={{ padding: "14px 20px", fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", borderBottom: `1px solid ${C.border}`, background: "rgba(26,25,22,0.04)", color: C.ink2 }}>Reeve does not bear cost for</div>
                {[
                  "Premium painting, specialty finishes, wallpaper, or non-standard surfaces beyond the defined exit service scope",
                  "Standard turnover costs if the PMSA was active for less than 11 months at exit",
                  "Appliance replacement, structural repairs, or any Bucket 2 item (owner-side)",
                  "Society dues increases mid-tenancy — any rise in society charges is your responsibility",
                  "Any repair or service requested by you that falls outside the defined service scope without separate written agreement",
                ].map((item) => <LimitItem key={item} text={item} />)}
              </div>
            </div>

            <AutoBlock style={{ marginTop: 20, borderColor: C.borderStrong }}>
              <span style={{ color: C.ink, fontWeight: 500 }}>What Reeve actually is:</span>{" "}
              <span style={{ color: C.ink2 }}>A structured operating layer that controls matching, documentation, communication, money flow, and the exit process. Reeve's value is that it creates a documented framework where fewer problems become personal, subjective, or unresolvable. Structured renting — not unlimited management.</span>
            </AutoBlock>
          </div>
        </section>

        {/* ══ FINAL CTA ════════════════════════════════════════════════════════ */}
        <section ref={ctaRef as React.RefObject<HTMLElement>} style={{ background: C.bgDark, padding: "80px 0", textAlign: "center" }}>
          <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 24px" }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 20 }}>
              <span style={{ display: "block", width: 20, height: 1, background: "rgba(255,255,255,0.15)" }} />
              You've read the guide
            </div>
            <h2 style={{ fontFamily: FONT_SERIF, fontSize: "clamp(28px, 5vw, 44px)", fontWeight: 400, color: "white", marginBottom: 16 }}>
              Now you know exactly what you're signing.
            </h2>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 15, maxWidth: 500, margin: "0 auto 32px" }}>
              No surprises after the fact. If you have questions about anything on this page, reach out before listing — we'd rather answer them now.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <button
                onClick={() => navigate("/login?returnTo=/owner/add")}
                style={{ background: "white", color: C.ink, display: "inline-flex", alignItems: "center", gap: 8, padding: "13px 22px", fontFamily: FONT_SANS, fontSize: 14, fontWeight: 500, borderRadius: 6, border: "none", cursor: "pointer", transition: "opacity 0.15s" }}
              >
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M7.5 1L14 7.5L7.5 14M14 7.5H1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                List My Property on Reeve
              </button>
              <button
                onClick={() => navigate("/contact")}
                style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.8)", border: "1px solid rgba(255,255,255,0.2)", display: "inline-flex", alignItems: "center", gap: 8, padding: "13px 22px", fontFamily: FONT_SANS, fontSize: 14, fontWeight: 500, borderRadius: 6, cursor: "pointer", transition: "background 0.15s" }}
              >
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M2 4a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4z" stroke="currentColor" strokeWidth="1.3"/><path d="M2 4l5.5 4L13 4" stroke="currentColor" strokeWidth="1.3"/></svg>
                Ask Us a Question
              </button>
            </div>
            <div style={{ marginTop: 48, paddingTop: 24, borderTop: "1px solid rgba(255,255,255,0.1)", fontSize: 12, color: "rgba(255,255,255,0.3)" }}>
              This page is a plain-English explanatory guide. It does not constitute legal advice or a binding agreement. The signed Property Management Service Agreement (PMSA) and the Tripartite Leave and License Agreement are the binding documents. In the event of any inconsistency between this guide and those agreements, the signed agreements prevail.
              <br /><br />
              Reeve · Bengaluru · reeve.in · Version 2.1 · 2026
            </div>
          </div>
        </section>

      </div>
    </Layout>
  );
}
