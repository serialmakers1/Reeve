import React, { useEffect, useRef, useState } from "react";
import posthog from "posthog-js";
import Layout from "@/components/Layout";

// ─── Types ───────────────────────────────────────────────────────────────────

type SavingsResult = {
  rent: number;
  commission: number;
  turnoverExpense: number;
  depositAbsorbed: number;
  traditionalNetCost: number;
  netSavings: number;
  timeSavedHours: number;
  visitsSaved: number;
};

type AnimatedNumberProps = {
  value: number;
  formatter: (v: number) => string;
  className?: string;
  durationMs?: number;
  style?: React.CSSProperties;
};

// ─── Constants ───────────────────────────────────────────────────────────────

const TIME_SAVED_HOURS = 120;
const VISITS_SAVED = 15;
const MIN_RENT = 20000;
const MAX_RENT = 200000;
const DEFAULT_RENT = 50000;

const C = {
  bg: "#0F1C2E",
  surface: "#1A2D42",
  border: "rgba(255,255,255,0.10)",
  textPrimary: "#FFFFFF",
  textBody: "rgba(255,255,255,0.75)",
  textMuted: "rgba(255,255,255,0.50)",
  accent: "#2563EB",
  accentLight: "rgba(37,99,235,0.15)",
  accentMid: "#93C5FD",
  danger: "#F87171",
  dangerBg: "rgba(220,38,38,0.12)",
  dangerBorder: "rgba(220,38,38,0.25)",
  bgLight: "#FAFAF8",
  bgLightCard: "#FFFFFF",
  borderLight: "#E8E4DC",
  textDark: "#0F1C2E",
  textDarkBody: "#4A5568",
  textDarkMuted: "#94A3B8",
} as const;

const FONT_SERIF = "'Instrument Serif', Georgia, serif";
const FONT_SANS = "'DM Sans', system-ui, sans-serif";
const FONT_MONO = "'DM Mono', 'Courier New', monospace";

// ─── Lifecycle Steps ─────────────────────────────────────────────────────────

const LC_STEPS = [
  {
    icon: "📸",
    title: "Listing",
    hint: "Prepare & present",
    detail:
      "We inspect the property, photograph every room against our PBR baseline, write the listing, and show it to every screened applicant. You are never asked to attend a showing or take a broker call.",
  },
  {
    icon: "🔍",
    title: "Screening",
    hint: "Quality, not urgency",
    detail:
      "Every applicant is verified for Aadhaar, PAN, income, employment, and CIBIL range before their profile reaches you. We filter by qualification standard — not by who responded fastest.",
  },
  {
    icon: "📄",
    title: "Documentation",
    hint: "Records from day one",
    detail:
      "Move-in condition report (MICR) signed by the tenant on possession day. Tripartite leave-and-licence agreement executed digitally with eStamp. Move-in inventory record covering every item, key, and remote.",
  },
  {
    icon: "💳",
    title: "Rent Flow",
    hint: "Clean monthly payout",
    detail:
      "Tenant pays Reeve directly as a single indivisible amount. Your base rent is transferred to your account within 5 days of collection. Automated escalation handles any late payment — you are notified, never asked to chase.",
  },
  {
    icon: "🔧",
    title: "Maintenance",
    hint: "Coordinated intake",
    detail:
      "Tenant raises issues via WhatsApp with video. Reeve acknowledges within 4 hours and categorises by urgency. Minor items are handled without your approval. Larger items need your sign-off within a defined window. Vendor dispatched from our vetted panel.",
  },
  {
    icon: "💬",
    title: "Support",
    hint: "Communication layer",
    detail:
      "All owner–tenant communication routes through Reeve. Neither party has the other's contact details. Queries, escalations, and mid-tenancy incidents are handled through the platform.",
  },
  {
    icon: "🔎",
    title: "Inspections",
    hint: "Preventive oversight",
    detail:
      "Condition inspections at months 5–6 and 10–11 of the tenancy. Every room photographed against the MICR baseline. Findings classified and shared with you in a condition update report.",
  },
  {
    icon: "🏁",
    title: "Exit",
    hint: "Documented closure",
    detail:
      "Move-out inspection comparing exit photos against the signed MICR. Every finding assessed by evidence. RA-001 issued to both parties. Reeve coordinates all repairs from the deposit assessment. Standard repainting and deep cleaning funded by Reeve at exit.",
  },
];

// ─── FAQ Data ─────────────────────────────────────────────────────────────────

type FaqItem = { question: string; answer: string };

const FAQ_ITEMS: FaqItem[] = [
  {
    question: "What does Reeve charge property owners?",
    answer:
      "Nothing. Reeve charges property owners ₹0 — zero listing fee, zero commission, and zero monthly owner-side charge. The tenant pays a 7% Reeve Fee on top of the agreed base rent, so your rent is not reduced by Reeve's fee. You receive the full agreed amount transferred to your account.",
  },
  {
    question: "Do I still approve who moves into my property?",
    answer:
      "Yes. You receive a clean, verified tenant profile — name, occupation, verified income, resident count, and proposed rent — and you decide to accept, reject, or make one counter-offer. You never see raw documents or get direct calls from applicants. If you prefer, you can opt out of the review step entirely and let Reeve auto-accept the first qualifying applicant at your listed rent.",
  },
  {
    question: "Who pays for repainting and deep cleaning at exit?",
    answer:
      "Reeve bears the cost of standard deep cleaning and standard interior repainting at exit, subject to the service agreement terms. Anything beyond the defined standard scope — premium finishes, non-standard materials, or owner-requested upgrades — can be handled separately if required.",
  },
  {
    question: "When can I take my property back?",
    answer:
      "Give 2 months' written notice through Reeve and we manage the tenant's exit per the lease terms. There is no penalty after the minimum lock-in period has passed. You get a clear timeline and Reeve handles the entire handback process — inspection, deposit settlement, and property closure.",
  },
];

// ─── Utilities ────────────────────────────────────────────────────────────────

const inrFormatter = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
const formatINR = (value: number): string => `₹${inrFormatter.format(Math.round(value))}`;

function calculateSavings(rent: number): SavingsResult {
  const commission = 1 * rent;
  const turnoverExpense = 0.5 * rent;
  const depositAbsorbed = 1 * rent;
  const traditionalNetCost = commission + turnoverExpense;
  return {
    rent,
    commission,
    turnoverExpense,
    depositAbsorbed,
    traditionalNetCost,
    netSavings: traditionalNetCost,
    timeSavedHours: TIME_SAVED_HOURS,
    visitsSaved: VISITS_SAVED,
  };
}

// ─── AnimatedNumber ───────────────────────────────────────────────────────────

function AnimatedNumber({
  value,
  formatter,
  className,
  durationMs = 900,
  style,
}: AnimatedNumberProps): React.ReactElement {
  const [displayValue, setDisplayValue] = useState<number>(value);
  const previousTargetRef = useRef<number>(value);
  const frameIdRef = useRef<number>(0);

  useEffect(() => {
    const startValue = previousTargetRef.current;
    const change = value - startValue;
    const animationStart = performance.now();

    const tick = (now: number): void => {
      const rawProgress = Math.min((now - animationStart) / durationMs, 1);
      const eased = 1 - Math.pow(1 - rawProgress, 3);
      setDisplayValue(startValue + change * eased);
      if (rawProgress < 1) {
        frameIdRef.current = window.requestAnimationFrame(tick);
      } else {
        previousTargetRef.current = value;
        setDisplayValue(value);
      }
    };

    frameIdRef.current = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameIdRef.current);
  }, [value, durationMs]);

  return (
    <span className={className} style={style}>
      {formatter(displayValue)}
    </span>
  );
}

// ─── useSectionView ───────────────────────────────────────────────────────────

function useSectionView(sectionName: string): React.RefObject<HTMLElement> {
  const ref = useRef<HTMLElement>(null);
  const firedRef = useRef(false);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !firedRef.current) {
          posthog?.capture(`owner_page_${sectionName}_viewed`);
          firedRef.current = true;
        }
      },
      { threshold: 0.3 },
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [sectionName]);
  return ref;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function OwnerLandingPage(): React.ReactElement {
  const [currentRent, setCurrentRent] = useState<number>(DEFAULT_RENT);
  const hasTrackedCalcRef = useRef(false);
  const savings = calculateSavings(currentRent);
  const sliderPct = ((currentRent - MIN_RENT) / (MAX_RENT - MIN_RENT)) * 100;

  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const [openLcIndex, setOpenLcIndex] = useState<number | null>(null);
  const [openMobLcIndex, setOpenMobLcIndex] = useState<number | null>(null);

  const fitRef = useSectionView("fit");
  const whyRef = useSectionView("why");
  const ctaRef = useSectionView("cta");

  // Scroll-triggered fade-up
  useEffect(() => {
    const elements = document.querySelectorAll<HTMLElement>(".owner-fade-up");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("owner-section-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 },
    );
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    posthog?.capture("owner_page_hero_viewed");
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setCurrentRent(val);
    if (!hasTrackedCalcRef.current) {
      posthog?.capture("owner_calc_first_use", { rent_amount: val });
      hasTrackedCalcRef.current = true;
    }
  };

  return (
    <Layout>
      <style>{`
        @keyframes ownerPanelIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .owner-fade-up {
          opacity: 0;
          transform: translateY(18px);
          transition: opacity 0.55s ease, transform 0.55s ease;
        }
        .owner-section-visible {
          opacity: 1 !important;
          transform: translateY(0) !important;
        }
        .owner-slider {
          -webkit-appearance: none;
          appearance: none;
          height: 6px;
          border-radius: 999px;
          outline: none;
          cursor: pointer;
        }
        .owner-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #2563EB;
          border: 3px solid #fff;
          box-shadow: 0 2px 8px rgba(0,0,0,0.18);
          cursor: pointer;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .owner-slider::-webkit-slider-thumb:hover {
          transform: scale(1.17);
          box-shadow: 0 4px 14px rgba(0,0,0,0.22);
        }
        .owner-slider:active::-webkit-slider-thumb {
          transform: scale(1.25);
        }
        .owner-slider::-moz-range-thumb {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #2563EB;
          border: 3px solid #fff;
          box-shadow: 0 2px 8px rgba(0,0,0,0.18);
          cursor: pointer;
        }
        .faq-grid-wrap {
          display: grid;
          transition: grid-template-rows 250ms ease;
          overflow: hidden;
        }
        .faq-grid-wrap.open  { grid-template-rows: 1fr; }
        .faq-grid-wrap.closed { grid-template-rows: 0fr; }
        .faq-grid-inner { min-height: 0; }
        .hover-lift { transition: transform 0.2s ease, box-shadow 0.2s ease; }
        .hover-lift:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.09); }
      `}</style>

      <div style={{ background: C.bg, fontFamily: FONT_SANS, color: C.textPrimary }}>

        {/* ══ SECTION 1 — HERO ════════════════════════════════════════════ */}
        <section
          id="hero"
          style={{ background: C.bg, borderBottom: `1px solid ${C.border}` }}
          className="relative overflow-hidden py-10 sm:py-16 lg:py-28"
        >
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
              opacity: 0.03,
            }}
          />
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-2">

              {/* Left */}
              <div>
                <p
                  className="owner-fade-up text-xs font-semibold uppercase tracking-widest"
                  style={{ color: C.accentMid, transitionDelay: "0ms" }}
                >
                  For Bangalore Property Owners
                </p>

                <h1
                  className="owner-fade-up mt-5"
                  style={{
                    fontFamily: FONT_SERIF,
                    fontWeight: 400,
                    fontSize: "clamp(2.4rem, 4.5vw, 3.6rem)",
                    lineHeight: 1.1,
                    letterSpacing: "-0.02em",
                    color: C.textPrimary,
                    transitionDelay: "80ms",
                  }}
                >
                  Better tenants start
                  <br />
                  with a better process.
                </h1>

                <p
                  className="owner-fade-up mt-5 text-base leading-relaxed"
                  style={{ color: C.textBody, maxWidth: 500, transitionDelay: "160ms" }}
                >
                  Reeve manages the operational layer of renting — tenant sourcing, documentation, rent routing,
                  maintenance coordination, and exit protocol — so you receive rent on time and your property is cared
                  for throughout.
                </p>

                {/* Chips */}
                <div
                  className="owner-fade-up mt-5 flex flex-wrap gap-2"
                  style={{ transitionDelay: "160ms" }}
                >
                  {["Verified tenants only", "Documented move-in & exit", "Structured rent flow"].map((chip) => (
                    <span
                      key={chip}
                      className="rounded-full px-3 py-1.5 text-sm font-medium"
                      style={{ border: `1px solid ${C.border}`, background: C.surface, color: C.textBody }}
                    >
                      {chip}
                    </span>
                  ))}
                </div>

                {/* CTAs */}
                <div
                  className="owner-fade-up mt-7 flex flex-wrap items-center gap-4"
                  style={{ transitionDelay: "240ms" }}
                >
                  <button
                    onClick={() => scrollTo("fit")}
                    className="rounded-xl px-6 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5"
                    style={{ background: C.accent, minHeight: 44 }}
                  >
                    Check if your property is a fit →
                  </button>
                  <button
                    onClick={() => scrollTo("savings")}
                    className="text-sm font-medium transition-colors duration-200"
                    style={{ color: C.textMuted }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = C.textPrimary)}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = C.textMuted)}
                  >
                    See owner savings ↓
                  </button>
                </div>

                {/* Pricing strip */}
                <div
                  className="owner-fade-up mt-7 inline-flex flex-wrap items-center gap-4 rounded-xl px-5 py-4"
                  style={{ border: `1.5px solid ${C.border}`, background: C.surface, transitionDelay: "240ms" }}
                >
                  <div>
                    <div
                      className="text-xs font-bold uppercase tracking-widest mb-1"
                      style={{ color: C.textMuted }}
                    >
                      What owners pay Reeve
                    </div>
                    <div style={{ fontFamily: FONT_SERIF, fontSize: "1.55rem", color: C.textPrimary, lineHeight: 1 }}>
                      ₹0{" "}
                      <span style={{ fontSize: "0.75em", color: C.textMuted }}>— always</span>
                    </div>
                  </div>
                  <div
                    className="hidden sm:block"
                    style={{ width: 1, height: 32, background: C.border, flexShrink: 0 }}
                  />
                  <div className="text-xs leading-relaxed" style={{ color: C.textMuted, maxWidth: 280 }}>
                    <strong style={{ color: C.textBody, display: "block", marginBottom: 2 }}>
                      No listing fee · No commission · No monthly owner-side charge
                    </strong>
                    Our fee is paid by tenants, so your agreed rent is never reduced.
                  </div>
                </div>
              </div>

              {/* Right — property status card */}
              <div className="owner-fade-up" style={{ transitionDelay: "160ms" }}>
                <div
                  className="rounded-2xl p-7"
                  style={{
                    background: C.surface,
                    border: `1px solid ${C.border}`,
                    boxShadow: "0 16px 48px rgba(0,0,0,0.22)",
                  }}
                >
                  <div
                    className="text-xs font-bold uppercase tracking-widest mb-5"
                    style={{ color: C.textMuted }}
                  >
                    Property on Reeve — live view
                  </div>

                  {[
                    {
                      icon: "🏠",
                      bg: C.accentLight,
                      title: "Tenant placed & verified",
                      sub: "Screened · Agreement executed",
                      badge: "Active",
                      badgeColor: "#2D6A4F",
                      badgeBg: "rgba(45,106,79,0.18)",
                    },
                    {
                      icon: "💳",
                      bg: "rgba(94,127,121,0.18)",
                      title: "Rent received",
                      sub: "Transferred to owner within 5 days",
                      badge: "On time",
                      badgeColor: "#5E9E97",
                      badgeBg: "rgba(94,127,121,0.18)",
                    },
                    {
                      icon: "🔧",
                      bg: "rgba(37,99,235,0.12)",
                      title: "Maintenance request",
                      sub: "Logged · Vendor coordinated",
                      badge: "Resolved",
                      badgeColor: C.accentMid,
                      badgeBg: C.accentLight,
                    },
                    {
                      icon: "📋",
                      bg: "rgba(255,255,255,0.06)",
                      title: "Bi-annual inspection",
                      sub: "Condition report shared with owner",
                      badge: "Upcoming",
                      badgeColor: C.textMuted,
                      badgeBg: "rgba(255,255,255,0.06)",
                    },
                  ].map((row) => (
                    <div
                      key={row.title}
                      className="flex items-center gap-3 rounded-lg px-3 py-3 mb-2"
                      style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}` }}
                    >
                      <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-base"
                        style={{ background: row.bg }}
                      >
                        {row.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold" style={{ color: C.textPrimary }}>
                          {row.title}
                        </div>
                        <div className="text-xs mt-0.5" style={{ color: C.textMuted }}>
                          {row.sub}
                        </div>
                      </div>
                      <span
                        className="text-xs font-bold px-2 py-1 rounded-full shrink-0"
                        style={{ color: row.badgeColor, background: row.badgeBg }}
                      >
                        {row.badge}
                      </span>
                    </div>
                  ))}

                  <div
                    className="mt-3 pt-3 flex justify-between items-center"
                    style={{ borderTop: `1px solid ${C.border}` }}
                  >
                    <span className="text-xs" style={{ color: C.textMuted }}>
                      Owner calls this month
                    </span>
                    <span className="font-bold" style={{ fontFamily: FONT_MONO, color: "#6EE7B7" }}>
                      0
                    </span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ══ SECTION 2 — FIT ══════════════════════════════════════════════ */}
        <section
          id="fit"
          ref={fitRef as React.RefObject<HTMLElement>}
          style={{ background: C.bgLight }}
          className="py-10 sm:py-16 lg:py-28"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">

            <div className="owner-fade-up">
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: C.accent }}>
                Before you list
              </p>
              <h2
                className="mt-3 text-[32px] leading-[38px] lg:text-[44px] lg:leading-[50px]"
                style={{ fontFamily: FONT_SERIF, fontWeight: 400, color: C.textDark }}
              >
                Is your property a fit for Reeve?
              </h2>
              <p className="mt-3 text-base" style={{ color: C.textDarkBody, maxWidth: 560 }}>
                Reeve is selective. We work only with properties that meet our listing standards — because the quality of
                the home directly shapes the quality of tenant it attracts.
              </p>
            </div>

            <div
              className="owner-fade-up mt-10 rounded-2xl p-8 lg:p-11"
              style={{
                background: C.bgLightCard,
                border: `1px solid ${C.borderLight}`,
                boxShadow: "0 2px 8px rgba(30,36,48,0.07)",
                transitionDelay: "80ms",
              }}
            >
              <div className="text-sm font-bold mb-1" style={{ color: C.textDark }}>
                Reeve Listing Standards
              </div>
              <div className="text-sm" style={{ color: C.textDarkMuted }}>
                All of the following must be met before a property goes live on Reeve.
              </div>

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
                {[
                  "Clean walls, floors, bathrooms, and kitchen",
                  "All basic fixtures functional — plumbing, electrical, locks",
                  "No active seepage, leaks, or exposed wiring",
                  "No unfinished repair work at handover",
                  "Ownership documents verified",
                  "Rent expectation aligned with locality benchmarks",
                  "Acceptance of 2-month deposit model and tripartite agreement",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-start gap-3 text-sm"
                    style={{ color: C.textDarkBody, lineHeight: 1.5 }}
                  >
                    <div
                      className="mt-1.5 h-1.5 w-1.5 rounded-full shrink-0"
                      style={{ background: "#5E7F79" }}
                    />
                    {item}
                  </div>
                ))}
              </div>

              <div
                className="mt-6 pt-5 text-sm italic leading-relaxed"
                style={{ borderTop: `1px solid ${C.borderLight}`, color: C.textDarkMuted }}
              >
                If your property meets these standards, Reeve can be a strong fit. If not, we may ask you to make
                targeted upgrades first — and we can help coordinate those.
              </div>
            </div>

          </div>
        </section>

        {/* ══ SECTION 3 — SCOPE ════════════════════════════════════════════ */}
        <section id="scope" style={{ background: C.bg }} className="py-10 sm:py-16 lg:py-28">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">

            <div className="owner-fade-up">
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: C.textMuted }}>
                Full rental lifecycle
              </p>
              <h2
                className="mt-3 text-[32px] leading-[38px] lg:text-[44px] lg:leading-[50px]"
                style={{ fontFamily: FONT_SERIF, fontWeight: 400, color: C.textPrimary }}
              >
                What Reeve manages for you
              </h2>
              <p className="mt-3 text-base" style={{ color: C.textMuted }}>
                Eight stages. One consistent process. Click any stage to see what's included.
              </p>
            </div>

            {/* Desktop lifecycle */}
            <div className="owner-fade-up mt-10 hidden lg:block" style={{ transitionDelay: "80ms" }}>
              <div className="relative grid grid-cols-8 gap-0">
                <div
                  style={{
                    position: "absolute",
                    top: 26,
                    left: "3%",
                    right: "3%",
                    height: 1,
                    background:
                      "linear-gradient(90deg, transparent, rgba(255,255,255,0.10) 6%, rgba(255,255,255,0.10) 94%, transparent)",
                  }}
                />
                {LC_STEPS.map((step, idx) => (
                  <button
                    key={step.title}
                    type="button"
                    onClick={() => setOpenLcIndex(openLcIndex === idx ? null : idx)}
                    className="flex flex-col items-center text-center px-1"
                    style={{ position: "relative", zIndex: 1 }}
                  >
                    <div
                      className="flex h-[52px] w-[52px] items-center justify-center rounded-xl text-lg mb-3"
                      style={{
                        background: openLcIndex === idx ? C.accent : C.surface,
                        border: `1.5px solid ${openLcIndex === idx ? C.accent : C.border}`,
                        boxShadow: openLcIndex === idx ? "0 6px 18px rgba(37,99,235,0.22)" : "none",
                        transform: openLcIndex === idx ? "translateY(-3px)" : "none",
                        transition: "all 0.22s ease",
                      }}
                    >
                      {step.icon}
                    </div>
                    <div
                      className="text-[10px] font-bold uppercase tracking-wider mb-0.5"
                      style={{ color: C.textMuted }}
                    >
                      {String(idx + 1).padStart(2, "0")}
                    </div>
                    <div className="text-xs font-bold" style={{ color: C.textPrimary }}>
                      {step.title}
                    </div>
                    <div className="text-[10px] leading-tight mt-0.5" style={{ color: C.textMuted }}>
                      {step.hint}
                    </div>
                  </button>
                ))}
              </div>

              {openLcIndex !== null && (
                <div
                  className="mt-6 flex items-start gap-4 rounded-xl px-7 py-5"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: `1px solid ${C.border}`,
                    animation: "ownerPanelIn 0.2s ease",
                  }}
                >
                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl"
                    style={{ background: C.accentLight }}
                  >
                    {LC_STEPS[openLcIndex].icon}
                  </div>
                  <div>
                    <h4 className="text-base font-bold mb-1.5" style={{ color: C.textPrimary }}>
                      {LC_STEPS[openLcIndex].title}
                    </h4>
                    <p className="text-sm leading-relaxed" style={{ color: C.textBody }}>
                      {LC_STEPS[openLcIndex].detail}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile lifecycle */}
            <div className="owner-fade-up mt-8 flex flex-col gap-2 lg:hidden" style={{ transitionDelay: "80ms" }}>
              {LC_STEPS.map((step, idx) => {
                const isOpen = openMobLcIndex === idx;
                return (
                  <div
                    key={step.title}
                    className="rounded-xl overflow-hidden"
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: `1px solid ${isOpen ? C.accent : C.border}`,
                      transition: "border-color 0.2s ease",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setOpenMobLcIndex(isOpen ? null : idx)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left"
                      style={{ minHeight: 52 }}
                      aria-expanded={isOpen}
                    >
                      <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-base"
                        style={{ background: C.surface, border: `1px solid ${C.border}` }}
                      >
                        {step.icon}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-bold" style={{ color: C.textPrimary }}>
                          {step.title}
                        </div>
                        <div className="text-xs" style={{ color: C.textMuted }}>
                          {step.hint}
                        </div>
                      </div>
                      <span
                        className="text-sm shrink-0"
                        style={{
                          color: C.textMuted,
                          transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                          transition: "transform 0.22s ease",
                          display: "block",
                        }}
                      >
                        ▾
                      </span>
                    </button>
                    <div className={`faq-grid-wrap ${isOpen ? "open" : "closed"}`}>
                      <div className="faq-grid-inner">
                        <p className="px-4 pb-4 text-sm leading-relaxed" style={{ color: C.textBody }}>
                          {step.detail}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Control strip */}
            <div
              className="owner-fade-up mt-10 rounded-2xl px-8 py-8 grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-8 items-center"
              style={{
                background: "linear-gradient(135deg, #1A2D42 0%, #2A4A72 100%)",
                transitionDelay: "160ms",
              }}
            >
              <div>
                <h3
                  className="text-xl leading-tight"
                  style={{ fontFamily: FONT_SERIF, fontWeight: 400, color: C.textPrimary }}
                >
                  You still stay in control
                </h3>
                <p className="mt-1.5 text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>
                  Reeve handles the operating layer. You retain ownership decisions.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  "You approve the tenant",
                  "You set the rent",
                  "You define house rules",
                  "You stay informed throughout",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold"
                    style={{
                      background: "rgba(255,255,255,0.09)",
                      border: "1px solid rgba(255,255,255,0.14)",
                      color: "rgba(255,255,255,0.82)",
                    }}
                  >
                    <span>✓</span>
                    {item}
                  </div>
                ))}
              </div>
            </div>

          </div>
        </section>

        {/* ══ SECTION 4 — SAVINGS ══════════════════════════════════════════ */}
        <section id="savings" style={{ background: C.bgLight }} className="py-10 sm:py-16 lg:py-28">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">

            <div
              className="owner-fade-up overflow-hidden rounded-2xl"
              style={{ boxShadow: "0 6px 24px rgba(30,36,48,0.11)" }}
            >
              {/* Calc head */}
              <div
                className="px-8 py-9"
                style={{ background: "linear-gradient(135deg, #1E2C42 0%, #2A4A72 100%)" }}
              >
                <p
                  className="text-xs font-semibold uppercase tracking-widest mb-2"
                  style={{ color: "rgba(255,255,255,0.4)" }}
                >
                  Owner Savings
                </p>
                <h2
                  className="text-[28px] leading-[34px] lg:text-[36px] lg:leading-[42px]"
                  style={{ fontFamily: FONT_SERIF, fontWeight: 400, color: C.textPrimary }}
                >
                  Costs Reeve helps you avoid.
                </h2>
                <p className="mt-2 text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
                  Adjust the slider to your expected rent and see the friction you skip each cycle.
                </p>
              </div>

              {/* Calc body */}
              <div className="px-8 py-8" style={{ background: C.surface, border: `1px solid ${C.border}` }}>

                {/* Rent row */}
                <div className="flex justify-between items-baseline mb-2">
                  <span className="text-sm font-semibold" style={{ color: C.textMuted }}>
                    Monthly Rent
                  </span>
                  <span
                    style={{
                      fontFamily: FONT_MONO,
                      fontSize: "2.1rem",
                      fontWeight: 700,
                      color: C.textPrimary,
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {formatINR(currentRent)}
                  </span>
                </div>

                <input
                  type="range"
                  min={MIN_RENT}
                  max={MAX_RENT}
                  step={5000}
                  value={currentRent}
                  onChange={handleSliderChange}
                  className="owner-slider w-full"
                  style={{
                    background: `linear-gradient(to right, ${C.accent} 0%, ${C.accent} ${sliderPct}%, ${C.border} ${sliderPct}%, ${C.border} 100%)`,
                  }}
                  aria-label="Monthly rent amount"
                />

                {/* Quick buttons */}
                <div className="mt-4 flex flex-wrap gap-2 mb-8">
                  {[25000, 50000, 75000, 100000].map((v) => {
                    const label = v === 100000 ? "₹1L" : `₹${v / 1000}K`;
                    return (
                      <button
                        key={v}
                        onClick={() => {
                          setCurrentRent(v);
                          if (!hasTrackedCalcRef.current) {
                            posthog?.capture("owner_calc_first_use", { rent_amount: v });
                            hasTrackedCalcRef.current = true;
                          }
                        }}
                        className="rounded-lg border px-4 py-1.5 text-sm font-bold cursor-pointer transition"
                        style={{
                          borderColor: currentRent === v ? C.accent : C.border,
                          background: currentRent === v ? C.accentLight : "transparent",
                          color: currentRent === v ? C.accentMid : C.textMuted,
                        }}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>

                {/* Primary cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                  <div
                    className="hover-lift rounded-xl p-4"
                    style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}` }}
                  >
                    <div className="text-lg mb-2">🤝</div>
                    <div
                      className="text-xs font-bold uppercase tracking-wider mb-1"
                      style={{ color: C.textMuted }}
                    >
                      Brokerage avoided
                    </div>
                    <div
                      style={{
                        fontFamily: FONT_MONO,
                        fontSize: "1.25rem",
                        fontWeight: 700,
                        color: "#6EE7B7",
                      }}
                    >
                      <AnimatedNumber value={savings.commission} formatter={formatINR} />
                    </div>
                    <div className="text-xs mt-1" style={{ color: C.textMuted }}>
                      Per 11-month cycle
                    </div>
                  </div>

                  <div
                    className="hover-lift rounded-xl p-4"
                    style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}` }}
                  >
                    <div className="text-lg mb-2">🖌</div>
                    <div
                      className="text-xs font-bold uppercase tracking-wider mb-1"
                      style={{ color: C.textMuted }}
                    >
                      Turnover costs avoided
                    </div>
                    <div
                      style={{
                        fontFamily: FONT_MONO,
                        fontSize: "1.25rem",
                        fontWeight: 700,
                        color: "#6EE7B7",
                      }}
                    >
                      <AnimatedNumber value={savings.turnoverExpense} formatter={formatINR} />
                    </div>
                    <div className="text-xs mt-1" style={{ color: C.textMuted }}>
                      Painting &amp; relisting friction
                    </div>
                  </div>

                  <div
                    className="hover-lift rounded-xl p-4"
                    style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}` }}
                  >
                    <div className="text-lg mb-2">💼</div>
                    <div
                      className="text-xs font-bold uppercase tracking-wider mb-1"
                      style={{ color: C.textMuted }}
                    >
                      Owner-side fee with Reeve
                    </div>
                    <div
                      style={{
                        fontFamily: FONT_MONO,
                        fontSize: "1.25rem",
                        fontWeight: 700,
                        color: "#6EE7B7",
                      }}
                    >
                      ₹0
                    </div>
                    <div className="text-xs mt-1" style={{ color: C.textMuted }}>
                      Always. No exceptions.
                    </div>
                  </div>
                </div>

                {/* Secondary items */}
                <div className="flex flex-wrap gap-3 mb-6">
                  <div
                    className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm"
                    style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, color: C.textMuted }}
                  >
                    ⏱{" "}
                    <strong style={{ color: C.textBody }}>
                      ~{TIME_SAVED_HOURS} hrs
                    </strong>{" "}
                    &nbsp;saved in visits &amp; coordination per year
                  </div>
                  <div
                    className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm"
                    style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, color: C.textMuted }}
                  >
                    🏃{" "}
                    <strong style={{ color: C.textBody }}>
                      {VISITS_SAVED} showings
                    </strong>{" "}
                    &nbsp;you never need to attend
                  </div>
                </div>

                {/* Summary bar */}
                <div
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-xl px-6 py-5"
                  style={{ background: "linear-gradient(135deg, #1E2C42 0%, #2A4A72 100%)" }}
                >
                  <div>
                    <h4
                      className="text-sm font-semibold"
                      style={{ color: "rgba(255,255,255,0.65)" }}
                    >
                      Estimated direct cost savings per cycle
                    </h4>
                    <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.38)" }}>
                      Brokerage + turnover — with ₹0 in owner fees
                    </p>
                  </div>
                  <div
                    style={{
                      fontFamily: FONT_MONO,
                      fontSize: "1.9rem",
                      fontWeight: 700,
                      color: "#6EE7B7",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <AnimatedNumber
                      value={savings.commission + savings.turnoverExpense}
                      formatter={formatINR}
                    />
                  </div>
                </div>

                <p className="mt-4 text-xs italic leading-relaxed" style={{ color: C.textMuted }}>
                  Assumptions: 11-month cycle · Brokerage = 1× monthly rent · Painting &amp; cleaning = 0.5× monthly
                  rent · Visits = 15 per cycle (~2 hrs each) · Coordination = ~90 hrs/year. These are illustrative
                  estimates based on common Bangalore rental friction. Not a financial guarantee.
                </p>
              </div>
            </div>

          </div>
        </section>

        {/* ══ SECTION 5 — WHY ══════════════════════════════════════════════ */}
        <section
          id="why"
          ref={whyRef as React.RefObject<HTMLElement>}
          style={{ background: C.bg }}
          className="py-10 sm:py-16 lg:py-28"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">

            <div className="owner-fade-up text-center">
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: C.textMuted }}>
                Why owners choose Reeve
              </p>
              <h2
                className="mt-3 text-[32px] leading-[38px] lg:text-[44px] lg:leading-[50px]"
                style={{ fontFamily: FONT_SERIF, fontWeight: 400, color: C.textPrimary }}
              >
                Three things that actually change.
              </h2>
            </div>

            <div
              className="owner-fade-up mt-10 grid grid-cols-1 lg:grid-cols-3 gap-5"
              style={{ transitionDelay: "80ms" }}
            >
              {[
                {
                  icon: "🕐",
                  bg: C.accentLight,
                  title: "Lower personal involvement",
                  body: "No showings, no broker calls, no late-night repair coordination. Your role is to receive your payout and stay informed — Reeve handles the rest.",
                },
                {
                  icon: "🏅",
                  bg: "rgba(94,127,121,0.15)",
                  title: "Better process, better tenant quality",
                  body: "A structured system — verified screening, documented move-in, defined protocols — helps attract and filter better-fit tenants from the start.",
                },
                {
                  icon: "🔒",
                  bg: "rgba(255,255,255,0.06)",
                  title: "Predictable ownership experience",
                  body: "Documented move-in, defined maintenance handling, and evidence-led exit assessment mean fewer surprises and fewer subjective disputes.",
                },
              ].map((card) => (
                <div
                  key={card.title}
                  className="hover-lift rounded-2xl p-7"
                  style={{ background: C.surface, border: `1px solid ${C.border}` }}
                >
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-xl text-xl mb-4"
                    style={{ background: card.bg }}
                  >
                    {card.icon}
                  </div>
                  <h3 className="text-base font-bold mb-2" style={{ color: C.textPrimary }}>
                    {card.title}
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: C.textBody }}>
                    {card.body}
                  </p>
                </div>
              ))}
            </div>

          </div>
        </section>

        {/* ══ SECTION 6 — FAQ ══════════════════════════════════════════════ */}
        <section id="faq" style={{ background: C.bgLight }} className="py-10 sm:py-16 lg:py-28">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">

            <div className="owner-fade-up text-center">
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: C.accent }}>
                Frequently asked
              </p>
              <h2
                className="mt-3 text-[32px] leading-[38px] lg:text-[44px] lg:leading-[50px]"
                style={{ fontFamily: FONT_SERIF, fontWeight: 400, color: C.textDark }}
              >
                Clear answers.
              </h2>
            </div>

            <div className="owner-fade-up mt-10 space-y-3" style={{ transitionDelay: "80ms" }}>
              {FAQ_ITEMS.map((item, index) => {
                const isOpen = openFaqIndex === index;
                return (
                  <div
                    key={index}
                    className="rounded-2xl overflow-hidden"
                    style={{
                      border: `1px solid ${isOpen ? C.accent : C.borderLight}`,
                      background: isOpen ? C.accentLight : C.bgLightCard,
                      transition: "background 0.2s ease, border-color 0.2s ease",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                      className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left"
                      style={{ minHeight: 56 }}
                      aria-expanded={isOpen}
                    >
                      <span className="text-base font-semibold" style={{ color: C.textDark }}>
                        {item.question}
                      </span>
                      <span
                        className="shrink-0 text-xl font-light"
                        style={{
                          color: C.accent,
                          transform: isOpen ? "rotate(45deg)" : "rotate(0deg)",
                          transition: "transform 250ms ease",
                          display: "block",
                        }}
                      >
                        +
                      </span>
                    </button>
                    <div className={`faq-grid-wrap ${isOpen ? "open" : "closed"}`}>
                      <div className="faq-grid-inner">
                        <p className="px-5 pb-5 text-sm leading-relaxed" style={{ color: C.textDarkBody }}>
                          {item.answer}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        </section>

        {/* ══ SECTION 7 — CTA ══════════════════════════════════════════════ */}
        <section
          id="cta"
          ref={ctaRef as React.RefObject<HTMLElement>}
          style={{ background: "linear-gradient(135deg, #1A2B3C 0%, #243752 100%)" }}
          className="py-16 sm:py-24"
        >
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
            <div className="owner-fade-up">
              <p
                className="text-xs font-semibold uppercase tracking-widest mb-3"
                style={{ color: "rgba(255,255,255,0.32)" }}
              >
                Ready to list?
              </p>
              <h2
                className="text-[32px] leading-[38px] lg:text-[44px] lg:leading-[50px] mb-3"
                style={{ fontFamily: FONT_SERIF, fontWeight: 400, color: C.textPrimary }}
              >
                If your property is well-maintained,
                <br />
                Reeve could be a strong fit.
              </h2>
              <p className="text-sm leading-relaxed mb-8" style={{ color: "rgba(255,255,255,0.45)" }}>
                We work with a focused set of Bangalore owners who want better tenants and a more structured rental
                process.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <button
                  onClick={() => scrollTo("fit")}
                  className="rounded-xl px-8 py-4 text-base font-semibold transition-all duration-200 hover:-translate-y-0.5"
                  style={{
                    background: C.textPrimary,
                    color: "#1A2B3C",
                    minHeight: 52,
                    fontFamily: FONT_SANS,
                  }}
                >
                  Check Property Fit →
                </button>
                <button
                  onClick={() => scrollTo("savings")}
                  className="rounded-xl px-8 py-4 text-sm font-semibold transition-all duration-200"
                  style={{
                    background: "transparent",
                    color: "rgba(255,255,255,0.55)",
                    border: "1.5px solid rgba(255,255,255,0.2)",
                    minHeight: 52,
                    fontFamily: FONT_SANS,
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.55)";
                    (e.currentTarget as HTMLButtonElement).style.color = "#fff";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.2)";
                    (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.55)";
                  }}
                >
                  See Owner Savings
                </button>
              </div>
            </div>
          </div>
        </section>

      </div>
    </Layout>
  );
}
