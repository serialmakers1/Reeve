import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import posthog from 'posthog-js';
import {
  ArrowRight,
  CheckCircle2,
  Info,
  Landmark,
} from 'lucide-react';
import Layout from '@/components/Layout';

// ─── Font constants (matching owner page pattern) ────────────────────────────

const FONT_SERIF = "'Instrument Serif', Georgia, serif";
const FONT_SANS  = "'DM Sans', system-ui, sans-serif";
const FONT_MONO  = "'DM Mono', monospace";

// ─── Calculation constants ───────────────────────────────────────────────────

const DEFAULT_RENT    = 50000;
const MIN_RENT        = 20000;
const MAX_RENT        = 200000;
const SLIDER_STEP     = 1000;
const TENURE_MONTHS   = 11;
const ANNUAL_INTEREST = 0.10;
const SERVICE_FEE_PCT = 0.07;
const DAYS_FASTER     = 7;

// ─── Metrics interface & calculation ────────────────────────────────────────

interface Metrics {
  rent: number;
  trad_deposit: number;
  trad_brokerage: number;
  trad_upfront: number;
  trad_opp_cost: number;
  trad_total_cost: number;
  reeve_deposit: number;
  reeve_upfront: number;
  reeve_service_fee: number;
  reeve_opp_cost: number;
  reeve_total_cost: number;
  deposit_freed: number;
  brokerage_saved: number;
  upfront_saved: number;
  net_savings: number;
}

function calculateMetrics(rent: number): Metrics {
  const trad_deposit      = 3 * rent;
  const trad_brokerage    = 1 * rent;
  const trad_upfront      = trad_deposit + trad_brokerage;
  const trad_opp_cost     = (trad_deposit + trad_brokerage) * ANNUAL_INTEREST * (TENURE_MONTHS / 12);
  const trad_total_cost   = trad_brokerage + trad_opp_cost;
  const reeve_deposit     = 1 * rent;
  const reeve_upfront     = reeve_deposit;
  const reeve_service_fee = rent * TENURE_MONTHS * SERVICE_FEE_PCT;
  const reeve_opp_cost    = reeve_deposit * ANNUAL_INTEREST * (TENURE_MONTHS / 12);
  const reeve_total_cost  = reeve_service_fee + reeve_opp_cost;
  const deposit_freed     = trad_deposit - reeve_deposit;
  const brokerage_saved   = trad_brokerage;
  const upfront_saved     = trad_upfront - reeve_upfront;
  const net_savings       = trad_total_cost - reeve_total_cost;
  return {
    rent,
    trad_deposit, trad_brokerage, trad_upfront, trad_opp_cost, trad_total_cost,
    reeve_deposit, reeve_upfront, reeve_service_fee, reeve_opp_cost, reeve_total_cost,
    deposit_freed, brokerage_saved, upfront_saved, net_savings,
  };
}

// ─── INR formatting ──────────────────────────────────────────────────────────

const inrFmt    = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
const formatINR = (v: number) => `₹${inrFmt.format(Math.round(v))}`;
const formatNum = (v: number) => inrFmt.format(Math.round(v));

// ─── CountUp component ───────────────────────────────────────────────────────

interface CountUpProps {
  value: number;
  formatter?: (v: number) => string;
  durationMs?: number;
  className?: string;
}

function CountUp({
  value,
  formatter = formatINR,
  durationMs = 700,
  className = '',
}: CountUpProps): React.JSX.Element {
  const [display, setDisplay]   = useState<number>(value);
  const previousRef             = useRef<number>(value);
  const frameRef                = useRef<number>(0);

  useEffect(() => {
    const start     = previousRef.current;
    const end       = Math.round(value);
    const startTime = performance.now();

    const tick = (now: number): void => {
      const progress = Math.min((now - startTime) / durationMs, 1);
      const eased    = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + (end - start) * eased));
      if (progress < 1) {
        frameRef.current = window.requestAnimationFrame(tick);
      } else {
        previousRef.current = end;
      }
    };

    frameRef.current = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameRef.current);
  }, [value, durationMs]);

  return <span className={className}>{formatter(display)}</span>;
}

// ─── SectionLabel component ──────────────────────────────────────────────────

function SectionLabel({
  children,
  light = false,
}: {
  children: React.ReactNode;
  light?: boolean;
}): React.JSX.Element {
  return (
    <p
      className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${light ? 'text-blue-400' : 'text-blue-600'}`}
      style={{ fontFamily: FONT_SANS }}
    >
      {children}
    </p>
  );
}

// ─── useSectionView hook ─────────────────────────────────────────────────────

function useSectionView(eventName: string): React.RefObject<HTMLElement> {
  const ref   = useRef<HTMLElement>(null);
  const fired = useRef(false);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !fired.current) {
          posthog?.capture(eventName);
          fired.current = true;
        }
      },
      { threshold: 0.2 },
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [eventName]);

  return ref;
}

// ─── Inline styles for scoped CSS ────────────────────────────────────────────

const SLIDER_AND_ANIMATION_CSS = `
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0);    }
  }
  .t-fade-up {
    animation: fadeUp 0.5s ease both;
  }
  .t-slider[type='range'] {
    -webkit-appearance: none;
    width: 100%;
    height: 6px;
    border-radius: 9999px;
    background: linear-gradient(
      to right,
      #2563EB calc(var(--value-pct) * 1%),
      #334155 calc(var(--value-pct) * 1%)
    );
    outline: none;
    cursor: pointer;
  }
  .t-slider[type='range']::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 26px;
    height: 26px;
    border-radius: 50%;
    background: #2563EB;
    border: 3px solid #ffffff;
    box-shadow: 0 2px 8px rgba(0,0,0,0.25);
    cursor: pointer;
    transition: transform 150ms ease, box-shadow 150ms ease;
  }
  .t-slider[type='range']::-webkit-slider-thumb:hover  { transform: scale(1.15); }
  .t-slider[type='range']::-webkit-slider-thumb:active { transform: scale(1.25); }
  .t-slider[type='range']::-moz-range-thumb {
    width: 26px;
    height: 26px;
    border-radius: 50%;
    background: #2563EB;
    border: 3px solid #ffffff;
    cursor: pointer;
  }
`;

// ─── FAQ data ────────────────────────────────────────────────────────────────

interface FaqItem {
  q: string;
  a: string;
}

const FAQS: FaqItem[] = [
  {
    q: 'How is the Reeve fee calculated?',
    a: "Reeve charges a fee on top of your monthly rent. For most tenants this is 7% of monthly rent across the 11-month lease. Your exact rate is confirmed during the application process based on your eligibility profile — you will always see your rate clearly before you commit to anything. On renewal, the fee drops to 4% — because long-term tenants represent lower risk and lower operational cost, and we pass that benefit back to you.",
  },
  {
    q: 'Is the security deposit refundable?',
    a: 'Yes — your deposit is returned at move-out based on the documented condition of the property. If no damage is found beyond normal wear and tear, your full deposit is returned. Any deductions are based strictly on the move-in condition report you sign on day one — complete with photos and notes. No undocumented claims. No vague "renovation" charges. The process is fair, evidence-based, and platform-managed — not left to the landlord\'s judgment.',
  },
  {
    q: 'Do I ever need to contact the owner directly?',
    a: 'No. Once you move in, Reeve is your single point of contact. All maintenance requests, complaints, lease queries, and move-out coordination go through the platform. You are never asked to manage the relationship with your property owner — we do that for you.',
  },
  {
    q: 'What if the owner wants the property back?',
    a: "Owners on Reeve sign long-term management agreements. They cannot ask you to vacate outside of the notice period in your lease. If an owner needs their property back for any reason, Reeve manages all communication, enforces the contractual notice period on your behalf, and gives you full platform support in finding your next home if needed.",
  },
];

// ─── Main component ──────────────────────────────────────────────────────────

export default function TenantSavingsPage(): React.JSX.Element {
  const navigate = useNavigate();

  const [rent,    setRent]    = useState<number>(DEFAULT_RENT);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const calculatorRef     = useRef<HTMLElement>(null);
  const savingsTrackedRef = useRef<boolean>(false);

  const stepsRef = useSectionView('tenant_page_steps_viewed');

  const metrics    = useMemo(() => calculateMetrics(rent), [rent]);
  const sliderPct  = ((rent - MIN_RENT) / (MAX_RENT - MIN_RENT)) * 100;

  // PostHog: hero viewed on mount
  useEffect(() => {
    posthog?.capture('tenant_page_hero_viewed');
  }, []);

  const handleSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      const v = Number(e.target.value);
      setRent(v);
      if (!savingsTrackedRef.current) {
        posthog?.capture('tenant_savings_calculated', { rent_amount: v });
        savingsTrackedRef.current = true;
      }
    },
    [],
  );

  const scrollToCalculator = useCallback((): void => {
    calculatorRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const QUICK_RENTS = [20000, 35000, 50000, 75000, 100000];

  return (
    <Layout>
      {/* Sticky Mobile CTA — appears after scrolling past hero, hides when calculator in view */}
      <div className="fixed bottom-16 left-0 right-0 sm:hidden z-30 px-4 py-3 bg-[#0F1C2E] border-t border-white/10">
        <button
          onClick={scrollToCalculator}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-2xl text-sm transition-colors duration-200"
          style={{ fontFamily: FONT_SANS }}
        >
          See your savings →
        </button>
      </div>

      {/* Scoped CSS */}
      <style>{SLIDER_AND_ANIMATION_CSS}</style>

      {/* ──────────────────────────────────────────────────────────────────────
          SECTION 1: HERO
      ────────────────────────────────────────────────────────────────────── */}
      <section className="bg-[#0F1C2E] overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-24 grid lg:grid-cols-2 gap-12">

          {/* Left column */}
          <div>
            <div className="t-fade-up" style={{ animationDelay: '0ms' }}>
              <SectionLabel light>No broker. Lower upfront cash.</SectionLabel>
            </div>

            <h1
              className="t-fade-up mt-5 text-white font-normal leading-[1.1]"
              style={{
                fontFamily: FONT_SERIF,
                fontSize: 'clamp(40px, 5vw, 60px)',
                animationDelay: '80ms',
              }}
            >
              Your landlord wants<br />
              3 months deposit before<br />
              you move in.<br />
              <span className="text-blue-400">We think that's unfair.</span>
            </h1>

            <p
              className="t-fade-up mt-6 text-slate-300 text-[18px] leading-8 max-w-lg"
              style={{ fontFamily: FONT_SANS, animationDelay: '160ms' }}
            >
              Reeve lets you move into your next Bangalore home with just 2 month's deposit. Zero brokerage. No middlemen.
            </p>

            <div
              className="t-fade-up mt-8 flex flex-wrap gap-3"
              style={{ animationDelay: '240ms' }}
            >
              {[
                '1 Month Deposit Only',
                'Zero Brokerage — Always',
                'Platform-Managed Home',
                'Zero SPAM Policy',
              ].map((badge) => (
                <span
                  key={badge}
                  className="rounded-full border border-slate-600 bg-white/5 px-4 py-2 text-sm font-medium text-slate-300"
                  style={{ fontFamily: FONT_SANS }}
                >
                  {badge}
                </span>
              ))}
            </div>

            <div
              className="t-fade-up mt-8 flex flex-wrap items-center gap-4"
              style={{ animationDelay: '320ms' }}
            >
              <button
                onClick={scrollToCalculator}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3.5 rounded-2xl text-sm transition focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
                style={{ fontFamily: FONT_SANS }}
              >
                Calculate My Savings
              </button>
              <button
                onClick={() => navigate('/search')}
                className="text-slate-300 hover:text-white text-sm font-medium flex items-center gap-1.5 transition"
                style={{ fontFamily: FONT_SANS }}
              >
                Browse Properties <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            {/* Platform fee disclosure — Point 4 */}
            <p
              className="mt-5 text-sm text-slate-400 max-w-lg leading-relaxed"
              style={{ fontFamily: FONT_SANS }}
            >
              Reeve charges a platform fee of 7% of your monthly rent — on top of rent, not deducted from it. We&apos;ll show you exactly why you still come out ahead.
            </p>

            {/* Cross-navigation link — Point 6 */}
            <p className="mt-3" style={{ fontFamily: FONT_SANS }}>
              <Link
                to="/savings/owner"
                className="text-[13px] text-slate-400 hover:text-white transition-colors duration-200"
              >
                Property owner? See owner savings →
              </Link>
            </p>
          </div>

          {/* Right column — stat cards */}
          <div
            className="t-fade-up flex flex-col gap-4 lg:justify-center px-4 sm:px-0"
            style={{ animationDelay: '200ms' }}
          >
            {/* Large card */}
            <div className="bg-[#1A2D42] rounded-3xl border border-slate-700/50 p-6 overflow-hidden">
              <p
                className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400"
                style={{ fontFamily: FONT_SANS }}
              >
                AVERAGE CASH FREED UP PER TENANT
              </p>
              <p
                className="mt-3 text-[32px] sm:text-[40px] lg:text-[64px] font-medium text-blue-400 leading-none break-all"
                style={{ fontFamily: FONT_MONO }}
              >
                ₹1,00,000
              </p>
              <p className="text-slate-400 text-sm mt-2" style={{ fontFamily: FONT_SANS }}>
                That's money back in your pocket, not locked with a landlord
              </p>
            </div>

            {/* Two small cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#1A2D42] rounded-2xl border border-slate-700/50 p-4">
                <p
                  className="text-xs text-slate-400 font-semibold uppercase tracking-wider"
                  style={{ fontFamily: FONT_SANS }}
                >
                  BROKERAGE PAID
                </p>
                <p className="text-2xl sm:text-3xl font-medium text-blue-400 mt-2" style={{ fontFamily: FONT_MONO }}>₹0</p>
                <p className="text-slate-400 text-sm mt-1" style={{ fontFamily: FONT_SANS }}>Always. Zero.</p>
              </div>
              <div className="bg-[#1A2D42] rounded-2xl border border-slate-700/50 p-4">
                <p
                  className="text-xs text-slate-400 font-semibold uppercase tracking-wider"
                  style={{ fontFamily: FONT_SANS }}
                >
                  MOVE-IN SPEED
                </p>
                <p className="text-2xl sm:text-3xl font-medium text-blue-400 mt-2" style={{ fontFamily: FONT_MONO }}>
                  {DAYS_FASTER} Days
                </p>
                <p className="text-slate-400 text-sm mt-1" style={{ fontFamily: FONT_SANS }}>
                  Faster than market average
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────────────────
          SECTION 2: CALCULATOR (moved from Section 8)
      ────────────────────────────────────────────────────────────────────── */}
      <section
        ref={calculatorRef}
        id="calculator"
        className="bg-[#0F1C2E]"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 lg:py-28">
          <SectionLabel light>THE SAVINGS CALCULATOR</SectionLabel>
          <h2
            className="mt-4 font-normal text-white"
            style={{ fontFamily: FONT_SERIF, fontSize: 'clamp(28px, 4vw, 44px)' }}
          >
            Drag the slider. Watch your savings appear.
          </h2>
          <p
            className="mt-4 text-slate-400 text-base max-w-lg leading-7"
            style={{ fontFamily: FONT_SANS }}
          >
            Your expected monthly rent in Bangalore. We'll show you what traditional renting actually costs vs. Reeve.
          </p>

          <div className="mt-14 grid lg:grid-cols-[1fr_1.4fr] gap-8 items-start">

            {/* Left panel */}
            <div className="rounded-3xl border border-slate-700/50 bg-[#1A2D42] p-6 sm:p-8">
              <p
                className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400"
                style={{ fontFamily: FONT_SANS }}
              >
                EXPECTED MONTHLY RENT
              </p>
              <p
                className="mt-3 text-5xl sm:text-6xl font-medium text-blue-400"
                style={{ fontFamily: FONT_MONO }}
              >
                {formatINR(rent)}
              </p>

              {/* Slider */}
              <div className="mt-6 w-full">
                <input
                  type="range"
                  className="t-slider w-full"
                  min={MIN_RENT}
                  max={MAX_RENT}
                  step={SLIDER_STEP}
                  value={rent}
                  onChange={handleSliderChange}
                  aria-label="Expected monthly rent"
                  aria-valuetext={formatINR(rent)}
                  style={{ '--value-pct': sliderPct } as React.CSSProperties}
                />
              </div>
              <div
                className="flex justify-between text-xs text-slate-500 mt-2"
                style={{ fontFamily: FONT_SANS }}
              >
                <span>₹20,000</span>
                <span>₹2,00,000</span>
              </div>

              {/* Quick-select */}
              <div className="mt-5 flex flex-wrap gap-2">
                {QUICK_RENTS.map((v) => {
                  const label =
                    v === 100000 ? '₹1L'
                    : v >= 1000  ? `₹${v / 1000}K`
                    : formatINR(v);
                  return (
                    <button
                      key={v}
                      onClick={() => setRent(v)}
                      className={`rounded-full border px-3 py-1.5 text-sm font-medium cursor-pointer transition focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                        rent === v
                          ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                          : 'border-slate-600 bg-transparent text-slate-300 hover:border-blue-400 hover:text-blue-400'
                      }`}
                      style={{ fontFamily: FONT_SANS }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              {/* Checklist */}
              <div className="mt-8">
                <p
                  className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400"
                  style={{ fontFamily: FONT_SANS }}
                >
                  WHAT CHANGES WITH REEVE
                </p>
                <ul className="mt-3 space-y-2.5">
                  {[
                    { icon: '🔑',  text: '2 month deposit only — not 3' },
                    { icon: '🚫',  text: 'Zero brokerage, always' },
                    { icon: '📋',  text: 'Reeve fee monthly (replaces broker cost)' },
                    { icon: '⚡',  text: '7 days average move-in' },
                    { icon: '🔕',  text: 'Zero SPAM — no broker calls, no unsolicited contact' },
                  ].map((item) => (
                    <li
                      key={item.text}
                      className="flex items-center gap-3 text-sm text-slate-300"
                      style={{ fontFamily: FONT_SANS }}
                    >
                      <span aria-hidden="true" className="text-base">{item.icon}</span>
                      {item.text}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Right panel */}
            <div className="rounded-3xl border border-slate-700/50 bg-[#1A2D42] p-6 sm:p-8">
              <p
                className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400"
                style={{ fontFamily: FONT_SANS }}
              >
                YOUR NET 11-MONTH SAVINGS WITH REEVE
              </p>
              <CountUp
                value={metrics.net_savings}
                className="mt-2 block text-3xl sm:text-4xl lg:text-5xl font-medium text-blue-400 break-all overflow-hidden"
                style={{ fontFamily: FONT_MONO } as React.CSSProperties}
              />
              <p className="text-sm text-slate-400 mt-2" style={{ fontFamily: FONT_SANS }}>
                Over 11 months, compared to traditional renting
              </p>

              {/* Four stat cards */}
              <div className="mt-6 grid grid-cols-2 gap-3">
                {[
                  {
                    label: 'DEPOSIT FREED UP',
                    value: metrics.deposit_freed,
                    color: 'text-blue-400',
                    sub: 'Cash you keep in hand',
                    staticVal: null as string | null,
                  },
                  {
                    label: 'BROKERAGE SAVED',
                    value: 0,
                    color: 'text-blue-400',
                    sub: 'Always zero with Reeve',
                    staticVal: '₹0',
                  },
                  {
                    label: 'UPFRONT (TRADITIONAL)',
                    value: metrics.trad_upfront,
                    color: 'text-red-400',
                    sub: 'Day 1 cash outflow',
                    staticVal: null as string | null,
                  },
                  {
                    label: 'UPFRONT (REEVE)',
                    value: metrics.reeve_upfront,
                    color: 'text-blue-400',
                    sub: 'Day 1 cash outflow',
                    staticVal: null as string | null,
                  },
                ].map((card) => (
                  <div
                    key={card.label}
                    className="rounded-2xl border border-slate-700/50 bg-[#0F1C2E] p-4"
                  >
                    <p
                      className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500"
                      style={{ fontFamily: FONT_SANS }}
                    >
                      {card.label}
                    </p>
                    {card.staticVal !== null ? (
                      <p
                        className={`text-lg sm:text-xl font-medium mt-2 break-all ${card.color}`}
                        style={{ fontFamily: FONT_MONO }}
                      >
                        {card.staticVal}
                      </p>
                    ) : (
                      <CountUp
                        value={card.value}
                        className={`mt-2 block text-lg sm:text-xl font-medium break-all ${card.color}`}
                        style={{ fontFamily: FONT_MONO } as React.CSSProperties}
                      />
                    )}
                    <p
                      className="text-xs text-slate-500 mt-1"
                      style={{ fontFamily: FONT_SANS }}
                    >
                      {card.sub}
                    </p>
                  </div>
                ))}
              </div>

              {/* Comparison table */}
              <div className="mt-6 w-full rounded-2xl border border-slate-700/50 overflow-hidden">
                <div className="grid grid-cols-3 bg-slate-800/50 px-4 py-3">
                  {(['COST', 'TRADITIONAL', 'REEVE'] as const).map((h) => (
                    <p
                      key={h}
                      className={`text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 ${h !== 'COST' ? 'text-right' : ''}`}
                      style={{ fontFamily: FONT_SANS }}
                    >
                      {h}
                    </p>
                  ))}
                </div>
                {[
                  {
                    label: 'Security deposit',
                    trad: metrics.trad_deposit,
                    reeve: metrics.reeve_deposit,
                  },
                  {
                    label: 'Brokerage',
                    trad: metrics.trad_brokerage,
                    reeve: null as number | null,
                  },
                  {
                    label: 'Reeve fee (11m)',
                    trad: null as number | null,
                    reeve: metrics.reeve_service_fee,
                  },
                  {
                    label: 'Opp. cost on deposit',
                    trad: metrics.trad_opp_cost,
                    reeve: metrics.reeve_opp_cost,
                  },
                ].map((row) => (
                  <div
                    key={row.label}
                    className="grid grid-cols-3 px-4 py-3 border-t border-slate-700/50"
                  >
                    <p
                      className="text-sm text-slate-400"
                      style={{ fontFamily: FONT_SANS }}
                    >
                      {row.label}
                    </p>
                    <p
                      className="text-sm font-medium text-red-400 text-right"
                      style={{ fontFamily: FONT_MONO }}
                    >
                      {row.trad !== null ? (
                        <CountUp value={row.trad} />
                      ) : '—'}
                    </p>
                    <p
                      className="text-sm font-medium text-blue-400 text-right"
                      style={{ fontFamily: FONT_MONO }}
                    >
                      {row.reeve !== null ? (
                        <CountUp value={row.reeve} />
                      ) : '₹0'}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-xl border border-slate-700/50 bg-slate-800/30 px-4 py-3">
                <p
                  className="text-xs text-slate-500 leading-5"
                  style={{ fontFamily: FONT_SANS }}
                >
                  Assumptions: 11-month tenure · 10% annual opportunity cost on blocked capital · Reeve fee shown at 7% (may vary by eligibility profile — confirmed before you commit)
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────────────────
          SECTION 3: THE PROBLEM
      ────────────────────────────────────────────────────────────────────── */}
      <section className="bg-[#FAFAF8] border-t border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 lg:py-28">
          <SectionLabel>THE PROBLEM WITH TRADITIONAL RENTING</SectionLabel>

          <h2
            className="mt-4 font-normal text-slate-900 leading-tight max-w-3xl"
            style={{ fontFamily: FONT_SERIF, fontSize: 'clamp(28px, 4vw, 44px)' }}
          >
            Before you sleep night one, the system takes ₹2,00,000 from you.
          </h2>

          <p className="mt-4 text-slate-600 text-base max-w-xl leading-7" style={{ fontFamily: FONT_SANS }}>
            For a ₹50,000/month flat in Bangalore. Most of it you'll never see again — and nobody warned you.
          </p>

          <div className="mt-12 grid lg:grid-cols-3 gap-5">
            {[
              {
                emoji: '🔒',
                amount: '₹1,50,000',
                title: 'Security deposit',
                body: '3 months rent locked away. Refund is a negotiation, not a guarantee.',
              },
              {
                emoji: '💸',
                amount: '₹50,000',
                title: 'Broker commission',
                body: '1 month rent. Gone. The broker disappears after day one.',
              },
              {
                emoji: '⏳',
                amount: '30+ Days',
                title: 'Average wait to move in',
                body: 'Paperwork, verification, and broker coordination that drags on forever.',
              },
            ].map((card) => (
              <div
                key={card.title}
                className="rounded-2xl border bg-white p-6 shadow-sm border-l-4 border-l-red-400"
              >
                <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center">
                  <span aria-hidden="true" className="text-2xl">{card.emoji}</span>
                </div>
                <p
                  className="text-4xl font-medium text-red-500 mt-3"
                  style={{ fontFamily: FONT_MONO }}
                >
                  {card.amount}
                </p>
                <p
                  className="text-base font-semibold text-slate-900 mt-3"
                  style={{ fontFamily: FONT_SANS }}
                >
                  {card.title}
                </p>
                <p
                  className="text-sm text-slate-600 mt-2 leading-6"
                  style={{ fontFamily: FONT_SANS }}
                >
                  {card.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────────────────
          SECTION 4: HOW IT WORKS
      ────────────────────────────────────────────────────────────────────── */}
      <section ref={stepsRef} className="bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 lg:py-28">
          <SectionLabel>HOW IT WORKS</SectionLabel>
          <h2
            className="mt-4 font-normal text-slate-900"
            style={{ fontFamily: FONT_SERIF, fontSize: 'clamp(28px, 4vw, 44px)' }}
          >
            Four steps to your next Bangalore home.
          </h2>

          {(() => {
            const steps = [
              {
                n: 1,
                title: 'Browse & Shortlist',
                body: 'Search verified properties — every listing is physically inspected and exclusively managed by Reeve. Favourite the ones you like.',
                pill: null as string | null,
              },
              {
                n: 2,
                title: 'Visit the Property',
                body: 'Schedule a visit at your convenience. Our team will be there. See the home before you decide anything.',
                pill: 'Our team handles the visit',
              },
              {
                n: 3,
                title: 'Apply Online',
                body: 'Submit your application with income proof and ID documents. One simple form on the platform. Our team reviews it and coordinates with the owner.',
                pill: null as string | null,
              },
              {
                n: 4,
                title: 'Move In, Stay Supported',
                body: "Once approved, pay first month's rent and one month's security deposit. Keys handed over. Reeve handles all maintenance, rent collection, and disputes throughout your stay.",
                pill: 'You never contact the owner directly',
              },
            ];

            return (
              <>
                {/* Desktop */}
                <div className="mt-14 hidden lg:grid lg:grid-cols-4 gap-8 relative">
                  <div className="absolute top-5 left-[12.5%] right-[12.5%] border-t-2 border-dashed border-slate-200 z-0" />
                  {steps.map((step) => (
                    <div key={step.n} className="relative z-10 text-center">
                      <div
                        className="w-11 h-11 rounded-full bg-blue-600 text-white font-semibold flex items-center justify-center text-base mx-auto mb-5"
                        style={{ fontFamily: FONT_SANS }}
                      >
                        {step.n}
                      </div>
                      <h3 className="text-base font-semibold text-slate-900" style={{ fontFamily: FONT_SANS }}>
                        {step.title}
                      </h3>
                      <p className="text-sm text-slate-600 leading-6 mt-2 text-left" style={{ fontFamily: FONT_SANS }}>
                        {step.body}
                      </p>
                      {step.pill && (
                        <span
                          className="inline-flex mt-3 rounded-full bg-blue-50 border border-blue-200 px-3 py-1 text-xs font-semibold text-blue-700"
                          style={{ fontFamily: FONT_SANS }}
                        >
                          {step.pill}
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Mobile */}
                <div className="mt-10 flex flex-col gap-8 lg:hidden">
                  {steps.map((step) => (
                    <div key={step.n} className="flex items-start gap-5">
                      <div
                        className="w-11 h-11 rounded-full bg-blue-600 text-white font-semibold flex items-center justify-center text-base shrink-0"
                        style={{ fontFamily: FONT_SANS }}
                      >
                        {step.n}
                      </div>
                      <div>
                        <h3
                          className="text-base font-semibold text-slate-900"
                          style={{ fontFamily: FONT_SANS }}
                        >
                          {step.title}
                        </h3>
                        <p
                          className="text-sm text-slate-600 leading-6 mt-2 text-left"
                          style={{ fontFamily: FONT_SANS }}
                        >
                          {step.body}
                        </p>
                        {step.pill && (
                          <span
                            className="inline-flex mt-3 rounded-full bg-blue-50 border border-blue-200 px-3 py-1 text-xs font-semibold text-blue-700"
                            style={{ fontFamily: FONT_SANS }}
                          >
                            {step.pill}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            );
          })()}
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────────────────
          SECTION 5: THE REEVE DIFFERENCE
      ────────────────────────────────────────────────────────────────────── */}
      <section className="bg-[#FAFAF8]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 lg:py-28">
          <SectionLabel>THE REEVE DIFFERENCE</SectionLabel>
          <h2
            className="mt-4 font-normal text-slate-900"
            style={{ fontFamily: FONT_SERIF, fontSize: 'clamp(28px, 4vw, 44px)' }}
          >
            Same apartment. Completely different financial reality.
          </h2>
          <p className="mt-4 text-slate-600 text-base max-w-xl leading-7" style={{ fontFamily: FONT_SANS }}>
            Compare what the traditional system takes vs. what Reeve asks for. It shouldn't even be close.
          </p>

          <div className="mt-12 grid lg:grid-cols-2 gap-6">
            {/* Traditional card */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8">
              <div className="flex items-center gap-3 pb-5 border-b border-slate-200">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
                  <Landmark className="h-6 w-6 text-slate-600" />
                </div>
                <div>
                  <h3
                    className="text-lg font-semibold text-slate-900"
                    style={{ fontFamily: FONT_SANS }}
                  >
                    Traditional Renting
                  </h3>
                  <p className="text-sm text-slate-500" style={{ fontFamily: FONT_SANS }}>
                    Broker model. High upfront. No accountability.
                  </p>
                </div>
              </div>
              <div>
                {[
                  {
                    label: 'Security deposit',
                    sub: '3 months rent, refundable only if the landlord agrees',
                    val: '₹1,50,000',
                  },
                  {
                    label: 'Broker fee',
                    sub: 'Gone forever. No service after signing.',
                    val: '₹50,000',
                  },
                  {
                    label: 'Who handles repairs?',
                    sub: 'You call the landlord. Hope they pick up.',
                    val: 'You',
                  },
                  {
                    label: 'Agreement speed',
                    sub: 'Multiple visits, physical paperwork',
                    val: '3–5 days',
                  },
                  {
                    label: 'Deposit return',
                    sub: 'Depends on landlord mood and negotiation',
                    val: 'Maybe',
                  },
                ].map((row) => (
                  <div
                    key={row.label}
                    className="flex items-start gap-4 py-4 border-b border-slate-100 last:border-0"
                  >
                    <div className="w-6 h-6 rounded-full bg-red-50 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="w-2 h-2 rounded-full bg-red-400 block" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700" style={{ fontFamily: FONT_SANS }}>
                        {row.label}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5" style={{ fontFamily: FONT_SANS }}>
                        {row.sub}
                      </p>
                    </div>
                    <span
                      className="text-sm font-semibold text-red-500 shrink-0 ml-auto"
                      style={{ fontFamily: FONT_SANS }}
                    >
                      {row.val}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Reeve card */}
            <div>
              <div className="rounded-3xl bg-[#0F1C2E] p-6 sm:p-8">
                <div className="flex items-center gap-3 pb-5 border-b border-white/10">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
                    <CheckCircle2 className="h-6 w-6 text-blue-400" />
                  </div>
                  <div>
                    <h3
                      className="text-lg font-semibold text-white"
                      style={{ fontFamily: FONT_SANS }}
                    >
                      Renting with Reeve
                    </h3>
                    <p className="text-sm text-slate-400" style={{ fontFamily: FONT_SANS }}>
                      One month. Platform-managed. Deposit held fairly.
                    </p>
                  </div>
                </div>
                <div>
                  {[
                    {
                      label: 'Security deposit',
                      sub: '2 month only. Returned based on documented condition.',
                      val: '₹1,00,000',
                    },
                    {
                      label: 'Broker fee',
                      sub: 'Zero. Always zero. No hidden charges.',
                      val: '₹0',
                    },
                    {
                      label: 'Who handles repairs?',
                      sub: 'Reeve. Raise a request on the platform, done.',
                      val: 'Platform',
                    },
                    {
                      label: 'Agreement speed',
                      sub: 'Everything coordinated by one team',
                      val: 'Hours, not days',
                    },
                    {
                      label: 'Deposit return',
                      sub: 'Fair process — any deductions based only on documented damage beyond normal wear. No undocumented claims.*',
                      val: 'Fair process',
                    },
                  ].map((row) => (
                    <div
                      key={row.label}
                      className="flex items-start gap-4 py-4 border-b border-white/10 last:border-0"
                    >
                      <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="w-2 h-2 rounded-full bg-blue-400 block" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-sm font-medium text-white"
                          style={{ fontFamily: FONT_SANS }}
                        >
                          {row.label}
                        </p>
                        <p
                          className="text-xs text-slate-400 mt-0.5"
                          style={{ fontFamily: FONT_SANS }}
                        >
                          {row.sub}
                        </p>
                      </div>
                      <span
                        className="text-sm font-semibold text-blue-400 shrink-0 ml-auto"
                        style={{ fontFamily: FONT_SANS }}
                      >
                        {row.val}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <p
                className="text-xs text-slate-400 mt-3 px-1"
                style={{ fontFamily: FONT_SANS }}
              >
                *Any deduction requires photo evidence from the move-in condition report signed by you on day one.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────────────────
          SECTION 6: HOW THE MONEY WORKS
      ────────────────────────────────────────────────────────────────────── */}
      <section className="bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 lg:py-28">
          <SectionLabel>TOTAL TRANSPARENCY</SectionLabel>
          <h2
            className="mt-4 font-normal text-slate-900"
            style={{ fontFamily: FONT_SERIF, fontSize: 'clamp(28px, 4vw, 44px)' }}
          >
            Here's exactly what renting with Reeve costs.
          </h2>
          <p
            className="mt-4 text-slate-600 text-base max-w-xl leading-7"
            style={{ fontFamily: FONT_SANS }}
          >
            No surprises. No hidden charges. Here's how every rupee flows.
          </p>

          <div className="mt-12 grid lg:grid-cols-2 gap-6">
            {/* Card 1: Rent → Owner (navy) */}
            <div className="rounded-3xl bg-[#0F1C2E] p-6 sm:p-8 text-white">
              <p
                className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-400"
                style={{ fontFamily: FONT_SANS }}
              >
                YOUR MONTHLY RENT
              </p>
              <h3
                className="text-2xl font-semibold text-white mt-3"
                style={{ fontFamily: FONT_SANS }}
              >
                Goes directly to your owner.
              </h3>
              <p
                className="text-sm text-slate-300 leading-7 mt-4"
                style={{ fontFamily: FONT_SANS }}
              >
                Your monthly rent is paid to your property owner. Every rupee. Reeve does not
                deduct anything from your rent, does not hold it, and does not route it through
                hidden accounts. Rent is a completely separate transaction from Reeve's fee.
              </p>
              <span
                className="mt-6 inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white"
                style={{ fontFamily: FONT_SANS }}
              >
                Rent → Owner. Always.
              </span>
            </div>

            {/* Card 2: Reeve Fee (white + blue border) */}
            <div className="rounded-3xl border-2 border-blue-200 bg-white p-6 sm:p-8">
              <p
                className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-600"
                style={{ fontFamily: FONT_SANS }}
              >
                REEVE'S FEE
              </p>
              <h3
                className="text-2xl font-semibold text-slate-900 mt-3"
                style={{ fontFamily: FONT_SANS }}
              >
                Paid by you. To Reeve. On top of rent.
              </h3>
              <p
                className="text-sm text-slate-600 leading-7 mt-4"
                style={{ fontFamily: FONT_SANS }}
              >
                Reeve charges a fee on top of your monthly rent. For most tenants this
                is 7% of monthly rent across the 11-month lease. This covers tenant screening,
                visit coordination, agreement execution, maintenance coordination, dispute
                handling, and all platform support throughout your stay.
              </p>

              <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-3">
                <Info className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <p
                  className="text-xs text-amber-800 leading-5"
                  style={{ fontFamily: FONT_SANS }}
                >
                  Your exact fee rate is confirmed during the application process based on
                  your eligibility profile. You will always see your rate clearly before you
                  confirm anything. For most tenants it is 7%. On renewal, it drops to 4% —
                  loyalty is rewarded.
                </p>
              </div>

              <div className="mt-5 rounded-xl bg-slate-50 border border-slate-200 px-4 py-3">
                <p
                  className="text-xs text-slate-500 font-semibold uppercase tracking-wider"
                  style={{ fontFamily: FONT_SANS }}
                >
                  EXAMPLE AT ₹50,000/MONTH
                </p>
                {[
                  { label: 'Monthly rent',    val: '₹50,000 → Owner' },
                  { label: 'Reeve fee (7%)', val: '₹3,500 → Reeve' },
                  { label: 'Total monthly',   val: '₹53,500' },
                ].map((row) => (
                  <div
                    key={row.label}
                    className="text-sm text-slate-700 flex justify-between py-1"
                    style={{ fontFamily: FONT_SANS }}
                  >
                    <span>{row.label}</span>
                    <span className="font-medium">{row.val}</span>
                  </div>
                ))}
              </div>

              <span
                className="mt-5 inline-flex rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700"
                style={{ fontFamily: FONT_SANS }}
              >
                Reeve fee → Reeve. That's it.
              </span>
            </div>
          </div>

          <p
            className="mt-8 text-center text-sm text-slate-500 italic"
            style={{ fontFamily: FONT_SANS }}
          >
            Reeve's business model only works when you're happy in your home. That alignment is intentional.
          </p>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────────────────
          SECTION 7: FAQ
      ────────────────────────────────────────────────────────────────────── */}
      <section className="bg-[#FAFAF8]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 lg:py-28">
          <h2
            className="font-normal text-slate-900"
            style={{ fontFamily: FONT_SERIF, fontSize: 'clamp(28px, 4vw, 44px)' }}
          >
            Common questions from tenants
          </h2>

          <div className="mt-10 space-y-3">
            {FAQS.map((faq, i) => (
              <div
                key={i}
                className="rounded-2xl border border-slate-200 bg-white px-5 py-4 sm:px-6"
              >
                <button
                  className="flex w-full items-center justify-between gap-4 cursor-pointer text-base font-semibold text-slate-900 text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-lg"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  aria-expanded={openFaq === i}
                  style={{ fontFamily: FONT_SANS }}
                >
                  <span>{faq.q}</span>
                  <span
                    className="text-slate-400 text-xl shrink-0 transition-transform duration-200 select-none"
                    style={{ transform: openFaq === i ? 'rotate(45deg)' : 'rotate(0deg)' }}
                    aria-hidden="true"
                  >
                    +
                  </span>
                </button>
                <div
                  className="overflow-hidden transition-all duration-250 ease-in-out"
                  style={{ maxHeight: openFaq === i ? '600px' : '0px' }}
                >
                  <p
                    className="text-sm text-slate-600 leading-7 mt-4 pr-6"
                    style={{ fontFamily: FONT_SANS }}
                  >
                    {faq.a}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────────────────
          SECTION 8: FINAL CTA
      ────────────────────────────────────────────────────────────────────── */}
      <section className="bg-[#0F1C2E]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 lg:py-28">
          <div className="grid lg:grid-cols-2 gap-16 items-center">

            {/* Left */}
            <div>
              <p
                className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-400"
                style={{ fontFamily: FONT_SANS }}
              >
                YOUR NEXT HOME IS WAITING
              </p>
              <h2
                className="mt-4 font-normal text-white leading-tight"
                style={{ fontFamily: FONT_SERIF, fontSize: 'clamp(28px, 4vw, 44px)' }}
              >
                Stop paying for a system that works against you.
              </h2>
              <p
                className="text-slate-300 text-base leading-8 mt-5 max-w-md"
                style={{ fontFamily: FONT_SANS }}
              >
                Browse verified Bangalore flats. 1 month deposit. Zero brokerage. Fully platform-managed.
              </p>
              <p
                className="text-slate-500 text-xs leading-6 mt-5"
                style={{ fontFamily: FONT_SANS }}
              >
                Free to browse · No commitment until agreement signed · Deposit held by platform · Zero SPAM policy
              </p>
            </div>

            {/* Right */}
            <div className="rounded-3xl border border-slate-700/50 bg-[#1A2D42] p-6 sm:p-8">
              <button
                onClick={() => {
                  posthog?.capture('tenant_page_browse_cta_clicked');
                  navigate('/search');
                }}
                className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-base px-6 py-4 transition focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
                style={{ fontFamily: FONT_SANS }}
              >
                Browse Zero-Brokerage Flats
                <ArrowRight className="h-5 w-5" />
              </button>

            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
