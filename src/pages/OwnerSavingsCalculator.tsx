import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import posthog from 'posthog-js';
import Layout from '@/components/Layout';

// ─── Types ──────────────────────────────────────────────────────────────────

type SavingsResult = {
  rent: number;
  commission: number;
  turnoverExpense: number;
  interestEarned: number;
  traditionalNetCost: number;
  netSavings: number;
  timeSavedHours: number;
  visitsSaved: number;
};

type FaqItem = {
  question: string;
  answer: string;
};

type ComparisonRow = {
  aspect: string;
  selfManaged: string;
  broker: string;
  reeve: string;
  emphasized?: boolean;
};

type AnimatedNumberProps = {
  value: number;
  formatter: (v: number) => string;
  className?: string;
  durationMs?: number;
};

// ─── Constants ───────────────────────────────────────────────────────────────

const LISTING_FEE = 10000;
const TENURE_MONTHS = 11;
const IMPUTED_INTEREST_RATE = 0.1;
const TIME_SAVED_HOURS = 120;
const VISITS_SAVED = 15;
const MIN_RENT = 20000;
const MAX_RENT = 200000;
const DEFAULT_RENT = 50000;

// Page color tokens (defined here per spec — not added to global CSS)
const C = {
  bg: '#0F1C2E',
  surface: '#162538',
  border: 'rgba(255,255,255,0.1)',
  textPrimary: '#FFFFFF',
  textBody: 'rgba(255,255,255,0.75)',
  textMuted: 'rgba(255,255,255,0.45)',
  accent: '#2563EB',
  accentLight: 'rgba(37,99,235,0.15)',
  accentMid: '#93C5FD',
  danger: '#FCA5A5',
  dangerBg: 'rgba(220,38,38,0.12)',
  dangerBorder: 'rgba(220,38,38,0.25)',
} as const;

const FONT_SERIF = "'Instrument Serif', Georgia, serif";
const FONT_SANS = "'DM Sans', system-ui, sans-serif";
const FONT_MONO = "'DM Mono', 'Courier New', monospace";

// ─── Data ────────────────────────────────────────────────────────────────────

const FAQ_ITEMS: FaqItem[] = [
  {
    question: 'Does Reeve charge property owners anything at all?',
    answer:
      'No. Reeve charges zero listing fees, zero commission, and zero management retainer to property owners. Our revenue comes from a service fee charged to tenants — not from you. You receive your full rent amount, transferred directly to your bank account every month. There are no deductions, no hidden charges, and no monthly bills from Reeve.',
  },
  {
    question: 'Who handles tenant viewings? Do I need to be present?',
    answer:
      'Never. Reeve handles every single viewing. When your property is listed, our team coordinates all visit slots and shows the property to every vetted applicant on your behalf. You are not called, not required to be present, and not involved in any showing. The same applies to mid-tenancy check-ins and the move-out walkthrough — Reeve conducts all of these without you.',
  },
  {
    question: "What if my tenant doesn't pay rent?",
    answer:
      "Reeve's Owner Protection Protocol activates automatically. On Day 1 of default, the tenant is notified immediately. By Day 7, a formal reminder goes out across all channels. Day 15, a formal notice is issued. Day 21, a legal notice. Day 30, eviction proceedings begin per the leave and licence agreement. You receive a status update at every stage. You are never asked to chase the tenant yourself.",
  },
  {
    question: 'Who holds the security deposit?',
    answer:
      "Reeve holds and manages the security deposit on behalf of all parties. Under the traditional model, owners collect 2–3 months rent as deposit from tenants. With Reeve, only 1 month's deposit is collected — held by the platform. This makes your property significantly more attractive to tenants and means faster occupancy. The deposit is returned to the tenant at move-out minus any verified damages.",
  },
  {
    question: 'Can I take my property back if I need to?',
    answer:
      "Yes. The service agreement has a 2-month notice period. If you need the property back — for personal use, family, renovation, or any reason — you give us 2 months' notice and we manage the tenant's exit per the lease terms. There is no penalty after the minimum lock-in period has passed. We will give you a clear timeline and handle everything.",
  },
];

const COMPARISON_ROWS: ComparisonRow[] = [
  { aspect: 'Brokerage', selfManaged: '₹0 but you do all the work', broker: '1–2 months rent per cycle', reeve: '₹0 — always' },
  { aspect: 'Visits required from you', selfManaged: '10–15 per cycle', broker: '5–10 per cycle', reeve: 'Zero', emphasized: true },
  { aspect: 'Maintenance', selfManaged: 'You coordinate everything', broker: 'Not their problem', reeve: 'Platform handles end-to-end' },
  { aspect: 'Your time spent', selfManaged: '40+ hours/year', broker: '10–15 hours/year', reeve: 'Near zero' },
  { aspect: 'Cost to owner', selfManaged: '₹0 direct, high time cost', broker: '₹30K–₹1L+ per cycle', reeve: '₹0 — always' },
];

// ─── Utilities ───────────────────────────────────────────────────────────────

const inrFormatter = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
const formatINR = (value: number): string => `₹${inrFormatter.format(Math.round(value))}`;

function calculateSavings(rent: number): SavingsResult {
  const traditionalSecurityCollected = 3 * rent;
  const commission = 1 * rent;
  const turnoverExpense = 0.5 * rent;
  const interestEarned =
    traditionalSecurityCollected * IMPUTED_INTEREST_RATE * (TENURE_MONTHS / 12);
  const traditionalNetCost =
    LISTING_FEE + commission + turnoverExpense - interestEarned - rent;
  return {
    rent,
    commission,
    turnoverExpense,
    interestEarned,
    traditionalNetCost,
    netSavings: traditionalNetCost,
    timeSavedHours: TIME_SAVED_HOURS,
    visitsSaved: VISITS_SAVED,
  };
}

// ─── AnimatedNumber ──────────────────────────────────────────────────────────

function AnimatedNumber({
  value,
  formatter,
  className,
  durationMs = 900,
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

  return <span className={className}>{formatter(displayValue)}</span>;
}

// ─── useSectionView ──────────────────────────────────────────────────────────

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

// ─── Main Component ──────────────────────────────────────────────────────────

export default function OwnerSavingsPage(): React.ReactElement {
  const navigate = useNavigate();

  // Calculator
  const [currentRent, setCurrentRent] = useState<number>(DEFAULT_RENT);
  const hasTrackedCalcRef = useRef(false);
  const savings = calculateSavings(currentRent);
  const sliderPct = ((currentRent - MIN_RENT) / (MAX_RENT - MIN_RENT)) * 100;

  // FAQ
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  // Comparison accordion (mobile)
  const [openComparisonIndex, setOpenComparisonIndex] = useState<number | null>(null);

  // Section refs for PostHog
  const processRef = useSectionView('process');
  const protectionRef = useSectionView('protection');

  // ── Effects ──────────────────────────────────────────────────────────────

  useEffect(() => {
    posthog?.capture('owner_page_hero_viewed');
  }, []);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setCurrentRent(val);
    if (!hasTrackedCalcRef.current) {
      posthog?.capture('owner_savings_calculated', { rent_amount: val });
      hasTrackedCalcRef.current = true;
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <Layout>
      {/* Injected CSS: animations, slider thumb, accordion */}
      <style>{`
        @keyframes ownerFadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes ownerFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .owner-fade-up { animation: ownerFadeUp 0.55s ease-out forwards; opacity: 0; }
        .owner-fade-in { animation: ownerFadeIn 0.55s ease-out forwards; opacity: 0; }

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

      {/* Sticky mobile CTA */}
      <div className="fixed bottom-16 left-0 right-0 sm:hidden z-30 px-4 py-3 bg-[#0F1C2E] border-t border-white/10">
        <Link
          to="/my-properties/new"
          className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-2xl text-sm text-center transition-colors duration-200"
          style={{ fontFamily: FONT_SANS }}
        >
          List Your Property — Free →
        </Link>
      </div>

      <div style={{ background: C.bg, fontFamily: FONT_SANS, color: C.textPrimary }}>

        {/* ══ SECTION 1: HERO ══════════════════════════════════════════════ */}
        <section
          style={{ background: C.bg, borderBottom: `1px solid ${C.border}` }}
          className="relative overflow-hidden py-10 sm:py-16 lg:py-28"
        >
          {/* Grain overlay */}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute', inset: 0, pointerEvents: 'none',
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
              opacity: 0.03,
            }}
          />
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">

              {/* Left column */}
              <div>
                <p
                  className="owner-fade-up text-xs font-semibold uppercase tracking-widest"
                  style={{ color: C.accent, animationDelay: '0ms' }}
                >
                  For Bangalore Property Owners
                </p>
                <h1
                  className="owner-fade-up mt-4 text-[48px] leading-[52px] lg:text-[64px] lg:leading-[68px]"
                  style={{ fontFamily: FONT_SERIF, fontWeight: 400, color: C.textPrimary, animationDelay: '80ms' }}
                >
                  Your rental property
                  <br />shouldn&apos;t call you
                  <br />at 11 PM.
                </h1>
                <p
                  className="owner-fade-up mt-6 text-lg leading-relaxed"
                  style={{ color: C.textMuted, maxWidth: 480, animationDelay: '160ms' }}
                >
                  Every Sunday drive to show the flat to someone who doesn&apos;t show up. Every
                  broker fee that disappears after the deal. Every tenant call you didn&apos;t ask
                  for. There is a better way — and it costs you nothing.
                </p>

                <p
                  className="owner-fade-up mt-5 text-sm leading-relaxed"
                  style={{ color: C.textMuted, maxWidth: 480, animationDelay: '200ms' }}
                >
                  Your tenants pay only 1 month deposit — not 3. That means faster occupancy,
                  lower vacancy risk, and better-quality tenants who aren&apos;t stretched thin
                  from day one.
                </p>

                <div
                  className="owner-fade-up mt-6 flex flex-wrap gap-2"
                  style={{ animationDelay: '240ms' }}
                >
                  {['Free Listing', 'Zero Commission', 'Zero Management Fee', 'No Owner-Side Charges — Ever'].map((b) => (
                    <span
                      key={b}
                      className="rounded-full px-3 py-1 text-sm font-medium"
                      style={{ border: `1px solid ${C.border}`, background: C.surface, color: C.textBody }}
                    >
                      {b}
                    </span>
                  ))}
                </div>

                <div
                  className="owner-fade-up mt-8 flex flex-col gap-3 sm:flex-row sm:items-center"
                  style={{ animationDelay: '320ms' }}
                >
                  <button
                    onClick={() => navigate('/login?returnTo=/owner/add')}
                    className="w-full sm:w-auto rounded-xl px-6 py-4 text-base font-semibold text-white transition"
                    style={{ background: C.accent, minHeight: 44 }}
                  >
                    List Your Property — It&apos;s Free →
                  </button>
                </div>

                <p className="mt-3" style={{ fontFamily: FONT_SANS }}>
                  <Link to="/savings/tenant" className="text-[13px] text-slate-400 hover:text-white transition-colors duration-200">
                    Tenant? See tenant savings →
                  </Link>
                </p>
              </div>

              {/* Right column — hero image */}
              <div className="w-full flex justify-center">
                <img
                  src="/images/hero-owner.png"
                  alt="Reeve owner dashboard — rent received on time"
                  className="w-2/3 rounded-2xl shadow-xl object-contain"
                />
              </div>
            </div>
          </div>
        </section>

        {/* ══ SECTION 2: HOW THE MONEY WORKS ══════════════════════════════ */}
        <section style={{ background: C.surface }} className="py-10 sm:py-16 lg:py-28">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: C.textMuted }}>
              Total Transparency
            </p>
            <h2
              className="mt-3 text-[32px] leading-[38px] lg:text-[44px] lg:leading-[50px]"
              style={{ fontFamily: FONT_SERIF, fontWeight: 400, color: C.textPrimary }}
            >
              Here&apos;s exactly who pays what.
            </h2>
            <p className="mt-3 text-base" style={{ color: C.textMuted }}>
              Before you go further — here&apos;s how Reeve earns, and why your rent is never touched.
            </p>

            <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Owner card */}
              <div className="rounded-3xl p-8 lg:p-10" style={{ background: C.accent }}>
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: C.accentMid }}>
                  As the property owner
                </p>
                <p className="mt-4 text-6xl font-bold text-white" style={{ fontFamily: FONT_MONO }}>
                  ₹0
                </p>
                <p className="text-sm text-white opacity-70">charged to you</p>
                <p className="mt-6 text-sm leading-relaxed text-white opacity-80">
                  You pay nothing to list. You pay nothing when a tenant is found. You pay no monthly
                  management fee, no commission, and no platform retainer — ever.
                </p>
                <p className="mt-4 text-sm leading-relaxed text-white opacity-80">
                  Your full rent amount is transferred to your bank account every month. Nothing is deducted on your end.
                </p>
                <span
                  className="mt-6 inline-block rounded-full px-4 py-2 text-xs font-semibold"
                  style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}
                >
                  Free listing · Zero commission · Always
                </span>
              </div>

              {/* How Reeve earns card */}
              <div
                className="rounded-3xl p-8 lg:p-10"
                style={{ background: C.bg, border: `2px solid ${C.accent}` }}
              >
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: C.textMuted }}>
                  How Reeve Earns
                </p>
                <p className="mt-6 text-sm leading-relaxed" style={{ color: C.textBody }}>
                  Reeve charges tenants a service fee of 7% of the monthly rent, paid by the tenant on
                  top of their rent.
                </p>
                <p className="mt-4 text-sm leading-relaxed" style={{ color: C.textBody }}>
                  This fee is fully disclosed to tenants before they apply. It covers tenant screening,
                  agreement execution, maintenance coordination, dispute handling, and everything else Reeve does.
                </p>
                <p className="mt-4 text-sm leading-relaxed" style={{ color: C.textBody }}>
                  Your rent and Reeve&apos;s fee are completely separate. We earn when your property is
                  occupied and your tenant is happy — which is exactly the alignment you want.
                </p>
              </div>
            </div>

            <p className="mt-8 text-center text-sm" style={{ color: C.textMuted }}>
              &ldquo;Reeve&apos;s business model only works when your property is leased. That&apos;s not a coincidence — it&apos;s intentional.&rdquo;
            </p>
          </div>
        </section>

        {/* ══ SECTION 3: PAIN CARDS ════════════════════════════════════════ */}
        <section style={{ background: C.bg }} className="py-10 sm:py-16 lg:py-28">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: C.textMuted }}>
                The reality of self-managing
              </p>
              <h2
                className="mx-auto mt-4 max-w-2xl text-[32px] leading-[36px] lg:text-[44px] lg:leading-[48px]"
                style={{ fontFamily: FONT_SERIF, fontWeight: 400, color: C.textPrimary }}
              >
                Owning rental property in Bangalore shouldn&apos;t feel like a second job.
              </h2>
            </div>

            <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-3">
              {[
                {
                  icon: '💸',
                  title: 'Broker fees eat your returns',
                  body: "Every tenant cycle costs you brokerage. A middleman who disappears the moment the deal is done — and reappears asking for more money next vacancy. It's a recurring cost every time you need a new tenant.",
                },
                {
                  icon: '🚗',
                  title: "You show up. They don't.",
                  body: "You took half a day off work. You drove across the city on a Sunday afternoon. The prospective tenant confirmed the night before. They didn't show up. No call. No message. This happens 10–15 times before the right tenant walks through that door.",
                  cost: '15+ visits. Most wasted.',
                },
                {
                  icon: '📱',
                  title: 'Tenant problems are your problems',
                  body: "A dripping tap at 11PM. A society dispute on a Tuesday morning. A maintenance argument you didn't ask to referee. When you self-manage — or use a broker who disappears after the deal — every call is yours to handle.",
                  cost: 'Your time, your stress, your calls',
                },
              ].map((card) => (
                <div
                  key={card.title}
                  className="hover-lift rounded-2xl p-6"
                  style={{
                    background: C.dangerBg,
                    border: `1px solid ${C.dangerBorder}`,
                    borderLeft: `4px solid ${C.danger}`,
                  }}
                >
                  <div className="text-3xl">{card.icon}</div>
                  <h3 className="mt-4 text-lg font-semibold" style={{ color: C.danger }}>
                    {card.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed" style={{ color: C.textBody }}>
                    {card.body}
                  </p>
                  {card.cost && (
                    <p className="mt-4 text-sm font-bold" style={{ color: C.danger }}>
                      {card.cost}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══ SECTION 4: HOW IT WORKS ══════════════════════════════════════ */}
        <section
          ref={processRef as React.RefObject<HTMLElement>}
          style={{ background: C.surface }}
          className="py-10 sm:py-16 lg:py-28"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: C.textMuted }}>
              The Process
            </p>
            <h2
              className="mt-3 text-[32px] leading-[38px] lg:text-[44px] lg:leading-[50px]"
              style={{ fontFamily: FONT_SERIF, fontWeight: 400, color: C.textPrimary }}
            >
              List once. We handle everything else.
            </h2>

            {/* Mobile: vertical */}
            <div className="mt-12 flex flex-col gap-0 lg:hidden">
              {[
                { n: '1', title: 'Submit Your Property', body: "Fill a quick form or give us a call. No photos, no documents, no preparation needed at this stage. Just your name, phone number, property area, and BHK. That's it.", pill: null },
                { n: '2', title: 'We Inspect & List', body: "Our team visits, photographs, documents every detail, and lists your property professionally. We show it to every vetted applicant — you are never asked to be present for a single viewing.", pill: 'You never show the flat yourself' },
                { n: '3', title: 'Tenant Moves In', body: "You review and approve the tenant application. We handle the digital agreement, key handover, and move-in condition report. Police verification for foreign citizens is handled by us.", pill: null },
                { n: '4', title: 'We Manage Everything', body: "Rent collected and transferred to you on the 5th every month. Maintenance coordinated end-to-end. Disputes handled. Move-out inspections conducted. Lease renewals managed. Your only job is to receive your payout.", pill: 'Zero effort from you — and zero cost, ever' },
              ].map((step, i, arr) => (
                <div key={step.n} className="flex gap-5">
                  <div className="flex flex-col items-center">
                    <div
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-base font-bold text-white"
                      style={{ background: C.accent }}
                    >
                      {step.n}
                    </div>
                    {i < arr.length - 1 && (
                      <div className="my-1 w-px flex-1" style={{ background: C.border }} />
                    )}
                  </div>
                  <div className="pb-10">
                    <h3 className="font-semibold text-lg" style={{ color: C.textPrimary }}>{step.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-left" style={{ color: C.textBody }}>{step.body}</p>
                    {step.pill && (
                      <span
                        className="mt-3 inline-block rounded-full px-3 py-1 text-xs font-semibold"
                        style={{ background: C.accentLight, color: C.accentMid }}
                      >
                        {step.pill}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop: horizontal */}
            <div className="mt-12 hidden lg:block">
              <div className="relative grid grid-cols-4 gap-8">
                {/* Connector line */}
                <div
                  className="absolute top-6 left-[12.5%] right-[12.5%] h-px"
                  style={{ background: C.border, borderTop: `2px dashed ${C.border}` }}
                />
                {[
                  { n: '1', title: 'Submit Your Property', body: "Fill a quick form or give us a call. No photos, no documents, no preparation needed at this stage. Just your name, phone, property area, and BHK.", pill: null },
                  { n: '2', title: 'We Inspect & List', body: "Our team visits, photographs, lists your property, and shows it to every vetted applicant. You are never asked to be present for a single viewing.", pill: 'You never show the flat yourself' },
                  { n: '3', title: 'Tenant Moves In', body: "You review and approve the tenant. We handle the digital agreement, key handover, and move-in condition report.", pill: null },
                  { n: '4', title: 'We Manage Everything', body: "Rent transferred to you on the 5th. Maintenance coordinated. Disputes handled. Move-out inspections done. Your only job: receive your payout.", pill: 'Zero effort from you — and zero cost, ever' },
                ].map((step) => (
                  <div key={step.n} className="flex flex-col items-center text-center">
                    <div
                      className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold text-white"
                      style={{ background: C.accent }}
                    >
                      {step.n}
                    </div>
                    <h3 className="mt-5 font-semibold text-base" style={{ color: C.textPrimary }}>{step.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-left" style={{ color: C.textBody }}>{step.body}</p>
                    {step.pill && (
                      <span
                        className="mt-3 inline-block rounded-full px-3 py-1 text-xs font-semibold"
                        style={{ background: C.accentLight, color: C.accentMid }}
                      >
                        {step.pill}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ══ SECTION 5: SAVINGS CALCULATOR ═══════════════════════════════ */}
        <section style={{ background: C.bg }} className="py-10 sm:py-16 lg:py-28">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: C.textMuted }}>
              Your Savings
            </p>
            <h2
              className="mt-3 text-[32px] leading-[38px] lg:text-[44px] lg:leading-[50px]"
              style={{ fontFamily: FONT_SERIF, fontWeight: 400, color: C.textPrimary }}
            >
              See exactly what you save at your rent.
            </h2>
            <p className="mt-3 text-sm" style={{ color: C.textMuted }}>
              All calculations are done locally in your browser using verified Bangalore market assumptions.
            </p>

            {/* Slider card */}
            <div className="mt-10 rounded-3xl p-8 lg:p-10" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
              <p className="text-sm font-semibold" style={{ color: C.textMuted }}>Expected Monthly Rent (₹)</p>
              <p
                className="mt-3 text-center text-[48px] font-bold leading-none"
                style={{ fontFamily: FONT_MONO, color: C.accent }}
              >
                {formatINR(currentRent)}
                <span className="text-xl font-normal" style={{ color: C.textMuted }}> /month</span>
              </p>

              <div className="mt-6 px-1">
                <input
                  type="range"
                  min={MIN_RENT}
                  max={MAX_RENT}
                  step={1000}
                  value={currentRent}
                  onChange={handleSliderChange}
                  className="owner-slider w-full"
                  style={{
                    background: `linear-gradient(to right, ${C.accent} 0%, ${C.accent} ${sliderPct}%, ${C.border} ${sliderPct}%, ${C.border} 100%)`,
                  }}
                  aria-label="Monthly rent amount"
                />
                <div className="mt-2 flex justify-between">
                  <span className="text-xs" style={{ color: C.textMuted }}>₹20,000</span>
                  {[50000, 100000, 150000].map((tick) => (
                    <div key={tick} className="flex flex-col items-center">
                      <div className="h-2 w-px" style={{ background: C.border }} />
                      <span className="mt-0.5 text-[10px]" style={{ color: C.textMuted }}>
                        {tick === 100000 ? '₹1L' : tick === 150000 ? '₹1.5L' : '₹50K'}
                      </span>
                    </div>
                  ))}
                  <span className="text-xs" style={{ color: C.textMuted }}>₹2,00,000</span>
                </div>
              </div>
            </div>

            {/* Results comparison */}
            <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Traditional */}
              <div className="rounded-3xl overflow-hidden" style={{ border: `1px solid ${C.border}` }}>
                <div className="px-6 py-4" style={{ background: C.bg }}>
                  <p className="font-semibold text-white">Traditional Property Management</p>
                  <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.6)' }}>Pay upfront fees, pay commission, manage it yourself.</p>
                </div>
                <div className="p-6" style={{ background: C.surface }}>
                  {/* Security */}
                  <div className="rounded-2xl p-4 mb-4" style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}` }}>
                    <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: C.textMuted }}>Upfront capital flow</p>
                    <p className="text-sm font-medium" style={{ color: C.textBody }}>
                      Security Collected (3× rent):{' '}
                      <span className="font-bold" style={{ color: C.textPrimary }}>
                        <AnimatedNumber value={savings.rent * 3} formatter={formatINR} />
                      </span>
                    </p>
                    <p className="text-xs mt-1" style={{ color: C.textMuted }}>→ {formatINR(savings.rent)} absorbed at end for turnover</p>
                    <p className="text-xs" style={{ color: C.textMuted }}>→ Returns {formatINR(savings.rent * 2)} to tenant</p>
                  </div>
                  {/* Costs */}
                  <div className="space-y-2">
                    {[
                      { label: 'PMS Listing Fee', value: formatINR(LISTING_FEE), animated: false },
                      { label: 'PMS Commission (1× rent)', value: null, animated: true, raw: savings.commission },
                      { label: 'Turnover Expense (0.5× rent)', value: null, animated: true, raw: savings.turnoverExpense },
                    ].map((row) => (
                      <div key={row.label} className="flex justify-between rounded-xl px-4 py-3 text-sm" style={{ background: C.dangerBg, border: `1px solid ${C.dangerBorder}` }}>
                        <span style={{ color: C.textBody }}>{row.label}</span>
                        <span className="font-semibold" style={{ color: C.danger }}>
                          {row.animated && row.raw !== undefined
                            ? <AnimatedNumber value={row.raw} formatter={formatINR} />
                            : row.value}
                        </span>
                      </div>
                    ))}
                    <div className="flex justify-between rounded-xl px-4 py-3 text-sm" style={{ background: C.accentLight, border: `1px solid ${C.accentMid}` }}>
                      <span style={{ color: C.textBody }}>Interest Earned on Deposit</span>
                      <span className="font-semibold" style={{ color: C.accentMid }}>
                        +<AnimatedNumber value={savings.interestEarned} formatter={formatINR} />
                      </span>
                    </div>
                    <div className="flex justify-between rounded-xl px-4 py-3 text-sm font-bold" style={{ background: C.dangerBg, border: `1px solid ${C.dangerBorder}` }}>
                      <span style={{ color: C.danger }}>Net Cost</span>
                      <AnimatedNumber value={savings.traditionalNetCost} formatter={formatINR} className="font-bold" style={{ color: C.danger } as React.CSSProperties} />
                    </div>
                  </div>
                </div>
              </div>

              {/* With Reeve */}
              <div className="rounded-3xl overflow-hidden" style={{ border: `1px solid ${C.border}` }}>
                <div className="px-6 py-4" style={{ background: C.accent }}>
                  <p className="font-semibold text-white">With Reeve</p>
                  <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.6)' }}>Fully managed. Zero owner-side fees. Zero commission.</p>
                </div>
                <div className="p-6" style={{ background: C.surface }}>
                  <div className="rounded-2xl p-4 mb-4" style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}` }}>
                    <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: C.textMuted }}>Upfront capital flow</p>
                    <p className="text-sm font-medium" style={{ color: C.textBody }}>
                      Security Collected (1× rent):{' '}
                      <span className="font-bold" style={{ color: C.textPrimary }}>
                        <AnimatedNumber value={savings.rent} formatter={formatINR} />
                      </span>
                    </p>
                    <p className="text-xs mt-1" style={{ color: C.textMuted }}>→ Held and managed by platform. Fully returned at end.</p>
                  </div>
                  <div className="space-y-2">
                    {['PMS Listing Fee', 'Commission', 'Turnover Expense (*see FAQ)', 'Interest Earned'].map((label) => (
                      <div key={label} className="flex justify-between rounded-xl px-4 py-3 text-sm" style={{ background: C.accentLight, border: `1px solid ${C.accentMid}` }}>
                        <span style={{ color: C.textBody }}>{label}</span>
                        <span className="font-semibold" style={{ color: C.accentMid }}>₹0</span>
                      </div>
                    ))}
                    <div className="flex justify-between rounded-xl px-4 py-3 text-sm font-bold" style={{ background: C.accentLight, border: `1px solid ${C.accentMid}` }}>
                      <span style={{ color: C.accentMid }}>Net Cost</span>
                      <span className="font-bold" style={{ color: C.accentMid }}>₹0</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Savings headline */}
            <div className="mt-10 text-center">
              <p
                className="text-[32px] leading-tight lg:text-[40px]"
                style={{ fontFamily: FONT_SERIF, fontWeight: 400, color: C.accentMid }}
              >
                You save{' '}
                <AnimatedNumber value={savings.netSavings} formatter={formatINR} />
                {' '}in direct costs.
              </p>
            </div>

            {/* Assumptions */}
            <div className="mt-6 rounded-2xl p-4 text-xs" style={{ border: `1px solid ${C.border}`, color: C.textMuted }}>
              <strong>Assumptions:</strong> 11-month tenure cycle · 10% per annum imputed interest on traditional security deposit · Traditional listing fee ₹10,000 · Turnover expense 0.5× monthly rent.
            </div>
          </div>
        </section>

        {/* ══ SECTION 6: WHAT YOU GAIN — AND WHAT'S PROTECTED ═════════════ */}
        <section
          ref={protectionRef as React.RefObject<HTMLElement>}
          style={{ background: C.surface }}
          className="py-10 sm:py-16 lg:py-28"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: C.textMuted }}>
              Beyond the Numbers
            </p>
            <h2
              className="mt-3 max-w-2xl text-[32px] leading-[38px] lg:text-[44px] lg:leading-[50px]"
              style={{ fontFamily: FONT_SERIF, fontWeight: 400, color: C.textPrimary }}
            >
              What you gain — and what&apos;s protected.
            </h2>

            <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
              {[
                { num: '120', label: 'Hours', desc: 'saved managing your property — coordinating maintenance, chasing rent, handling disputes' },
                { num: '15', label: 'Visits', desc: 'saved showing your property — viewings, check-ins, move-out walkthroughs you never have to make' },
                { num: '₹0', label: 'Broker fees', desc: 'across the entire relationship — not just this tenant cycle, but every renewal and re-leasing' },
              ].map((card) => (
                <div
                  key={card.label}
                  className="hover-lift rounded-3xl p-8 text-center"
                  style={{ border: `1px solid ${C.border}`, background: C.bg }}
                >
                  <p
                    className="text-[56px] font-bold leading-none"
                    style={{ fontFamily: FONT_MONO, color: C.accent }}
                  >
                    {card.num}
                  </p>
                  <p className="mt-2 text-xs font-semibold uppercase tracking-widest" style={{ color: C.textMuted }}>
                    {card.label}
                  </p>
                  <p className="mt-3 text-sm leading-relaxed" style={{ color: C.textBody }}>
                    {card.desc}
                  </p>
                </div>
              ))}
            </div>

            <p
              className="mt-14 text-center text-[24px] leading-relaxed"
              style={{ fontFamily: FONT_SERIF, fontWeight: 400, color: C.accentMid }}
            >
              &ldquo;These don&apos;t appear in a spreadsheet.
              <br />But you&apos;ve felt every one of them.&rdquo;
            </p>

            <h3
              className="mt-16 max-w-2xl text-[28px] leading-[34px] lg:text-[36px] lg:leading-[42px]"
              style={{ fontFamily: FONT_SERIF, fontWeight: 400, color: C.textPrimary }}
            >
              Even when things go wrong — they&apos;re not your problem to solve.
            </h3>
            <p className="mt-3 text-base" style={{ color: C.textMuted }}>
              Reeve&apos;s Owner Protection Promise is written into every service agreement. Here&apos;s what it covers.
            </p>

            <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
              {[
                {
                  icon: '🛡️',
                  title: 'Rent Default Handling',
                  body: "If a tenant misses rent, Reeve follows up immediately. Day 7: formal reminder across all channels. Day 15: formal notice issued. Day 21: legal notice sent. Day 30: eviction process initiated. You receive status updates at every stage — you never chase the tenant yourself.",
                  closing: 'Your job: read the update. Not make the call.',
                },
                {
                  icon: '🏠',
                  title: 'Damage Coverage',
                  body: "The move-in condition report — photos, notes, tenant sign-off — is the legal baseline. At move-out, Reeve compares every room against it. Normal wear is absorbed by the platform. Damage beyond wear is assessed, documented, and billed to the tenant.",
                  closing: "You're shown the evidence. Not asked to argue over it.",
                },
                {
                  icon: '⚖️',
                  title: 'Dispute Resolution',
                  body: "All disputes — damage, deposit, maintenance — are mediated by Reeve first. If unresolved, escalated to appointed arbitration per the service agreement. You never deal directly with the tenant at any point. We maintain the evidence trail throughout.",
                  closing: 'You are never in the room when it gets difficult.',
                },
                {
                  icon: '📅',
                  title: '14-Day Re-Leasing SLA',
                  body: "Reeve actively monitors applications from day one of listing. If there are no applications after 14 days, we pull comparable market data, share it with you, and recommend a revised asking rent. After 21 days, we evaluate the listing quality, furnishing gaps, and marketing reach. Vacancy is our problem to solve.",
                  closing: "You hear about it. You don't have to fix it.",
                },
              ].map((card) => (
                <div
                  key={card.title}
                  className="hover-lift rounded-2xl p-6 lg:p-8"
                  style={{ background: C.bg, border: `1px solid ${C.border}` }}
                >
                  <div className="text-3xl">{card.icon}</div>
                  <h3 className="mt-4 text-lg font-semibold" style={{ color: C.textPrimary }}>
                    {card.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed" style={{ color: C.textBody }}>
                    {card.body}
                  </p>
                  <p className="mt-4 text-sm font-semibold" style={{ color: C.accentMid }}>
                    {card.closing}
                  </p>
                </div>
              ))}
            </div>

            <p className="mt-8 text-center text-sm" style={{ color: C.textMuted }}>
              Owner Protection Promise details are included in every service agreement. Ask us for a copy before you list.
            </p>
          </div>
        </section>

        {/* ══ SECTION 7: COMPARISON TABLE ══════════════════════════════════ */}
        <section style={{ background: C.bg }} className="py-10 sm:py-16 lg:py-28">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: C.textMuted }}>
              How We Compare
            </p>
            <h2
              className="mt-3 text-[32px] leading-[38px] lg:text-[44px] lg:leading-[50px]"
              style={{ fontFamily: FONT_SERIF, fontWeight: 400, color: C.textPrimary }}
            >
              How Reeve compares
            </h2>

            {/* Desktop table */}
            <div className="mt-10 hidden lg:block overflow-hidden rounded-2xl" style={{ border: `1px solid ${C.border}` }}>
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="px-6 py-4 text-left font-semibold" style={{ color: C.textMuted, background: C.surface }}>Aspect</th>
                    <th className="px-6 py-4 text-center font-semibold" style={{ color: C.textBody, background: C.surface }}>Self-managed</th>
                    <th className="px-6 py-4 text-center font-semibold" style={{ color: C.textBody, background: C.surface }}>Traditional Broker</th>
                    <th className="px-6 py-4 text-center font-semibold" style={{ color: '#fff', background: C.accent }}>
                      With Reeve
                      <span className="ml-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: 'rgba(255,255,255,0.2)', color: '#fff' }}>
                        Recommended
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_ROWS.map((row, i) => (
                    <tr
                      key={row.aspect}
                      style={{
                        background: row.emphasized ? C.accentLight : i % 2 === 0 ? C.surface : C.bg,
                        borderLeft: row.emphasized ? `3px solid ${C.accent}` : undefined,
                      }}
                    >
                      <td className="px-6 py-4 font-medium" style={{ color: row.emphasized ? C.accentMid : C.textPrimary, borderBottom: `1px solid ${C.border}` }}>
                        {row.aspect}
                      </td>
                      <td className="px-6 py-4 text-center" style={{ color: C.textBody, borderBottom: `1px solid ${C.border}` }}>{row.selfManaged}</td>
                      <td className="px-6 py-4 text-center" style={{ color: C.textBody, borderBottom: `1px solid ${C.border}` }}>{row.broker}</td>
                      <td className="px-6 py-4 text-center font-semibold" style={{ color: C.accentMid, background: C.accentLight, borderBottom: `1px solid ${C.border}` }}>
                        ✓ {row.reeve}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile accordion */}
            <div className="mt-8 flex flex-col gap-3 lg:hidden">
              {COMPARISON_ROWS.map((row, index) => {
                const isOpen = openComparisonIndex === index;
                return (
                  <div
                    key={row.aspect}
                    className="rounded-2xl overflow-hidden"
                    style={{
                      border: `1px solid ${isOpen || row.emphasized ? C.accent : C.border}`,
                      background: isOpen ? C.accentLight : C.surface,
                      transition: 'background 0.2s ease, border-color 0.2s ease',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setOpenComparisonIndex(isOpen ? null : index)}
                      className="flex w-full items-center justify-between gap-4 p-5 text-left"
                      style={{ minHeight: 52 }}
                      aria-expanded={isOpen}
                    >
                      <span className="text-sm font-semibold" style={{ color: row.emphasized ? C.accentMid : C.textPrimary }}>
                        {row.aspect}
                      </span>
                      <span
                        className="shrink-0 text-xl font-light"
                        style={{
                          color: C.accent,
                          transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)',
                          transition: 'transform 250ms ease',
                          display: 'block',
                        }}
                      >
                        +
                      </span>
                    </button>
                    <div className={`faq-grid-wrap ${isOpen ? 'open' : 'closed'}`}>
                      <div className="faq-grid-inner">
                        <div className="space-y-2 px-5 pb-5">
                          <div className="flex justify-between text-sm">
                            <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: C.textMuted }}>Self-managed</span>
                            <span style={{ color: C.textBody }}>{row.selfManaged}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: C.textMuted }}>Broker</span>
                            <span style={{ color: C.textBody }}>{row.broker}</span>
                          </div>
                          <div
                            className="flex justify-between rounded-xl px-3 py-2 text-sm font-semibold"
                            style={{ background: C.accentLight, color: C.accentMid }}
                          >
                            <span>With Reeve</span>
                            <span>✓ {row.reeve}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ══ SECTION 8: SOCIAL PROOF ══════════════════════════════════════ */}
        <section style={{ background: C.surface }} className="py-10 sm:py-16 lg:py-28">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: C.textMuted }}>
              From Owners Like You
            </p>
            <h2
              className="mt-3 text-[32px] leading-[38px] lg:text-[44px] lg:leading-[50px]"
              style={{ fontFamily: FONT_SERIF, fontWeight: 400, color: C.textPrimary }}
            >
              What Bangalore property owners say
            </h2>

            <div
              className="mx-auto mt-12 max-w-2xl rounded-3xl p-8 lg:p-12"
              style={{ background: C.bg, border: `1px solid ${C.border}` }}
            >
              <p
                className="text-[72px] leading-none"
                style={{ fontFamily: FONT_SERIF, color: C.accentMid, lineHeight: 0.8 }}
              >
                &ldquo;
              </p>
              <p
                className="mt-4 text-[20px] leading-[30px]"
                style={{ fontFamily: FONT_SERIF, color: C.textPrimary }}
              >
                We&apos;re just getting started in Bangalore. Be among the first 10 owners to
                list with Reeve — and we&apos;ll give your property priority placement,
                dedicated onboarding, and our full attention from day one.
              </p>
              <p className="mt-6 text-sm font-semibold" style={{ color: C.accentMid }}>
                Priority placement for early owners · Fully managed from day one
              </p>
            </div>

            <button
              onClick={() => navigate('/login?returnTo=/owner/add')}
              className="mt-8 inline-block rounded-xl px-8 py-4 text-base font-semibold text-white"
              style={{ background: C.accent, minHeight: 44 }}
            >
              Be Among the First 10 →
            </button>
          </div>
        </section>

        {/* ══ SECTION 9: FAQ ════════════════════════════════════════════════ */}
        <section style={{ background: C.bg }} className="py-10 sm:py-16 lg:py-28">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: C.textMuted }}>
              Questions Answered
            </p>
            <h2
              className="mt-3 text-[32px] leading-[38px] lg:text-[44px] lg:leading-[50px]"
              style={{ fontFamily: FONT_SERIF, fontWeight: 400, color: C.textPrimary }}
            >
              Frequently asked questions
            </h2>

            <div className="mt-10 space-y-3">
              {FAQ_ITEMS.map((item, index) => {
                const isOpen = openFaqIndex === index;
                return (
                  <div
                    key={index}
                    className="rounded-2xl overflow-hidden"
                    style={{
                      border: `1px solid ${isOpen ? C.accentMid : C.border}`,
                      background: isOpen ? C.accentLight : C.surface,
                      transition: 'background 0.2s ease, border-color 0.2s ease',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                      className="flex w-full items-center justify-between gap-4 p-5 text-left"
                      style={{ minHeight: 56 }}
                      aria-expanded={isOpen}
                    >
                      <span className="text-base font-semibold" style={{ color: C.textPrimary }}>
                        {item.question}
                      </span>
                      <span
                        className="shrink-0 text-xl font-light"
                        style={{
                          color: C.accent,
                          transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)',
                          transition: 'transform 250ms ease',
                          display: 'block',
                        }}
                      >
                        +
                      </span>
                    </button>
                    <div className={`faq-grid-wrap ${isOpen ? 'open' : 'closed'}`}>
                      <div className="faq-grid-inner">
                        <p className="px-5 pb-5 text-sm leading-relaxed" style={{ color: C.textBody }}>
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

      </div>
    </Layout>
  );
}
