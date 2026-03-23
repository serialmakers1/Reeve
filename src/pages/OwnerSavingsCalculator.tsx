import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import posthog from 'posthog-js';
import Layout from '@/components/Layout';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

// ─── Types ──────────────────────────────────────────────────────────────────

type BhkType = Database['public']['Enums']['bhk_type'];

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

type LeadFormData = {
  name: string;
  phone: string;
  locality: string;
  bhk: BhkType | '';
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
  bg: '#F8F7F4',
  surface: '#FFFFFF',
  border: '#E8E4DC',
  textPrimary: '#1A1714',
  textBody: '#4A4540',
  textMuted: '#8A847C',
  accent: '#1B4332',
  accentLight: '#D1FAE5',
  accentMid: '#6EE7B7',
  danger: '#7F1D1D',
  dangerBg: '#FEF2F2',
  dangerBorder: '#FECACA',
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
    question: 'Who pays the service fee — the owner or the tenant?',
    answer:
      'The service fee is paid entirely by the tenant. It is 7% of the monthly rent, charged on top of rent — not deducted from it. This is fully disclosed to every tenant before they apply. Your listed rent is the amount you receive. Reeve\'s fee is a separate charge that the tenant pays to us for screening, agreement execution, maintenance management, and platform services.',
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
    question: 'What happens at move-out — do I need to be there?',
    answer:
      "No. Reeve conducts the full move-out inspection. We compare every room against the move-in condition report signed by the tenant on day one. We document everything, assess normal wear vs. actual damage, handle the settlement calculation, and process the deposit return. You receive a summary report with photos. Your physical presence is not required at any point.",
  },
  {
    question: 'Can I take my property back if I need to?',
    answer:
      "Yes. The service agreement has a 2-month notice period. If you need the property back — for personal use, family, renovation, or any reason — you give us 2 months' notice and we manage the tenant's exit per the lease terms. There is no penalty after the minimum lock-in period has passed. We will give you a clear timeline and handle everything.",
  },
  {
    question: 'What is the security deposit structure and who holds it?',
    answer:
      "One month's rent is collected as a security deposit from the tenant at move-in. This is significantly lower than the Bangalore market norm of 2–3 months — intentional, so your property rents faster. The deposit is held by Reeve, not by you. At move-out, it settles verified damages first, with the balance returned to the tenant. You are not involved in holding, managing, or returning the deposit.",
  },
];

const COMPARISON_ROWS: ComparisonRow[] = [
  { aspect: 'Brokerage', selfManaged: '₹0 but you do all the work', broker: '1–2 months rent per cycle', reeve: '₹0 — always' },
  { aspect: 'Tenant screening', selfManaged: 'You verify yourself', broker: 'Broker sends whoever pays', reeve: 'Income, employment, KYC verified' },
  { aspect: 'Rent collection', selfManaged: 'Chase via WhatsApp', broker: "Not their problem", reeve: 'Auto-collected on the 5th' },
  { aspect: 'Maintenance', selfManaged: 'You coordinate everything', broker: "Not their problem", reeve: 'Platform handles end-to-end' },
  { aspect: 'Agreement', selfManaged: 'You arrange stamp paper, notary', broker: 'Broker may help, extra cost', reeve: 'Fully digital, ₹200 e-stamp' },
  { aspect: 'Vacancy gap', selfManaged: 'You relist, screen, repeat', broker: '2–4 weeks typical', reeve: '14-day re-leasing SLA' },
  { aspect: 'Visits required from you', selfManaged: '10–15 per cycle', broker: '5–10 per cycle', reeve: 'Zero', emphasized: true },
  { aspect: 'Deposit disputes', selfManaged: 'You negotiate directly', broker: "Not their problem", reeve: 'Platform mediates with evidence' },
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

  // Sticky CTA
  const heroRef = useRef<HTMLElement>(null);
  const [showStickyBar, setShowStickyBar] = useState(false);

  // FAQ
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  // Lead form
  const [leadForm, setLeadForm] = useState<LeadFormData>({ name: '', phone: '', locality: '', bhk: '' });
  const [leadLoading, setLeadLoading] = useState(false);
  const [leadError, setLeadError] = useState<string | null>(null);

  // Callback form
  const [callbackPhone, setCallbackPhone] = useState('');
  const [callbackLoading, setCallbackLoading] = useState(false);
  const [callbackSuccess, setCallbackSuccess] = useState(false);
  const [callbackError, setCallbackError] = useState<string | null>(null);

  // Section refs for PostHog
  const processRef = useSectionView('process');
  const protectionRef = useSectionView('protection');

  // ── Effects ──────────────────────────────────────────────────────────────

  useEffect(() => {
    posthog?.capture('owner_page_hero_viewed');
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setShowStickyBar(!entry.isIntersecting),
      { threshold: 0 },
    );
    if (heroRef.current) observer.observe(heroRef.current);
    return () => observer.disconnect();
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

  const handleLeadSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!leadForm.bhk) return;
    setLeadLoading(true);
    setLeadError(null);
    try {
      const { error } = await supabase.from('leads').insert({
        owner_name: leadForm.name,
        owner_phone: leadForm.phone,
        locality: leadForm.locality,
        bhk: leadForm.bhk as BhkType,
        status: 'new',
        property_address: '',
        referred_by_tenant_id: '',
      });
      if (error) throw error;
      posthog?.capture('owner_listing_form_submitted');
      navigate('/login?returnTo=/owner/add');
    } catch {
      setLeadError('Something went wrong. Please try again.');
    } finally {
      setLeadLoading(false);
    }
  };

  const handleCallbackSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCallbackLoading(true);
    setCallbackError(null);
    try {
      const { error } = await supabase.from('leads').insert({
        owner_phone: callbackPhone,
        owner_name: 'Unknown',
        property_address: '',
        referred_by_tenant_id: '',
        // 'callback_requested' is not in lead_status enum; cast via unknown
        status: 'contacted' as Database['public']['Enums']['lead_status'],
        notes: 'Callback requested from owner savings page',
      });
      if (error) throw error;
      posthog?.capture('owner_callback_requested');
      setCallbackSuccess(true);
    } catch {
      setCallbackError('Something went wrong. Please try again.');
    } finally {
      setCallbackLoading(false);
    }
  };

  const scrollToFinalCta = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    document.getElementById('final-cta')?.scrollIntoView({ behavior: 'smooth' });
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
          background: #1B4332;
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
          background: #1B4332;
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

        {/* ══ SECTION 1: HERO ══════════════════════════════════════════════ */}
        <section
          ref={heroRef}
          style={{ background: C.bg, borderBottom: `1px solid ${C.border}` }}
          className="relative overflow-hidden py-20 lg:py-28"
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
                  <a
                    href="#final-cta"
                    onClick={scrollToFinalCta}
                    className="text-center text-sm font-medium underline-offset-2 hover:underline"
                    style={{ color: C.textMuted }}
                  >
                    Prefer to talk first? We&apos;ll call you. ↓
                  </a>
                </div>
              </div>

              {/* Right column — payout card */}
              <div className="owner-fade-in flex justify-center lg:justify-end" style={{ animationDelay: '200ms' }}>
                <div
                  className="w-full max-w-sm rounded-3xl p-8"
                  style={{ background: C.accent, fontFamily: FONT_SANS }}
                >
                  <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: C.accentMid }}>
                    Latest payout
                  </p>
                  <p className="mt-3 text-4xl font-bold text-white" style={{ fontFamily: FONT_MONO }}>
                    ₹42,000
                  </p>
                  <p className="mt-1 text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>
                    transferred
                  </p>
                  <div className="mt-4 rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.08)' }}>
                    <p className="font-semibold text-white">Koramangala, 2BHK</p>
                    <p className="mt-1 text-sm" style={{ color: 'rgba(255,255,255,0.65)' }}>
                      March 5 · Rent received on time
                    </p>
                  </div>
                  <div
                    className="mt-4 rounded-xl p-4"
                    style={{ background: 'rgba(255,255,255,0.06)', borderTop: `1px solid rgba(255,255,255,0.12)` }}
                  >
                    <div className="grid grid-cols-3 gap-2 text-center">
                      {[['0', 'calls'], ['0', 'visits'], ['0', 'effort']].map(([num, label]) => (
                        <div key={label}>
                          <p className="text-xl font-bold text-white" style={{ fontFamily: FONT_MONO }}>{num}</p>
                          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>{label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══ STICKY MOBILE CTA ═══════════════════════════════════════════ */}
        {showStickyBar && (
          <div
            className="fixed bottom-0 left-0 right-0 z-50 lg:hidden"
            style={{ background: C.accent, padding: '12px 16px', paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
          >
            <button
              onClick={() => navigate('/login?returnTo=/owner/add')}
              className="w-full rounded-xl py-3 text-sm font-semibold"
              style={{ background: '#fff', color: C.accent, minHeight: 44 }}
            >
              List Free →
            </button>
          </div>
        )}

        {/* ══ SECTION 2: PAIN CARDS ════════════════════════════════════════ */}
        <section style={{ background: C.surface }} className="py-20 lg:py-28">
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
                  body: "Every tenant cycle costs you 1–2 months rent in brokerage. Over 3 years with 2–3 tenants, that's ₹1–3 lakhs handed to a middleman who disappears the moment the deal is done — and reappears asking for more money next vacancy.",
                  cost: '₹1–3 lakhs gone per 3-year cycle',
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
                  <p className="mt-4 text-sm font-bold" style={{ color: C.danger }}>
                    {card.cost}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══ SECTION 3: AGITATION STATS ══════════════════════════════════ */}
        <section style={{ background: C.accent }} className="relative overflow-hidden py-20 lg:py-28">
          {/* Watermark */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 flex items-center justify-center select-none"
            style={{
              fontFamily: FONT_SERIF,
              fontSize: 'clamp(80px, 20vw, 180px)',
              color: 'rgba(255,255,255,0.03)',
              transform: 'rotate(15deg)',
              whiteSpace: 'nowrap',
            }}
          >
            3 years
          </div>
          <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 gap-px" style={{ border: `1px solid rgba(255,255,255,0.12)`, borderRadius: 16, overflow: 'hidden' }}>
              {[
                { num: '₹2,40,000+', label: 'Paid to brokers over 3 years (2 tenant cycles, 2BHK at ₹25,000/month)' },
                { num: '120 hrs', label: 'Spent on tenant coordination, visits, maintenance, disputes' },
                { num: '15–20', label: 'Property visits you made — showings, check-ins, inspections' },
                { num: '0', label: 'Of those hours were in your job description when you bought the flat' },
              ].map((stat, i) => (
                <div
                  key={i}
                  className="flex flex-col justify-center p-8 lg:p-12"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    borderRight: i % 2 === 0 ? '1px solid rgba(255,255,255,0.12)' : undefined,
                    borderBottom: i < 2 ? '1px solid rgba(255,255,255,0.12)' : undefined,
                  }}
                >
                  <p
                    className="text-[48px] leading-none lg:text-[64px] font-bold text-white"
                    style={{ fontFamily: FONT_MONO }}
                  >
                    {stat.num}
                  </p>
                  <p className="mt-3 text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)', fontFamily: FONT_SANS }}>
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-6 text-center text-[11px]" style={{ color: 'rgba(255,255,255,0.45)' }}>
              *Estimates based on Bangalore market averages. Your numbers may vary.
            </p>
          </div>
        </section>

        {/* ══ SECTION 4: THE TURN ══════════════════════════════════════════ */}
        <section style={{ background: C.bg }} className="py-16 lg:py-20">
          <div className="mx-auto max-w-xl px-4 text-center sm:px-6">
            <div className="mx-auto mb-8 h-px w-20" style={{ background: C.accent }} />
            <h2
              className="text-[32px] leading-[36px] lg:text-[44px] lg:leading-[48px]"
              style={{ fontFamily: FONT_SERIF, fontWeight: 400, color: C.textPrimary }}
            >
              It doesn&apos;t have to be this way.
            </h2>
            <p className="mt-6 text-lg leading-relaxed" style={{ color: C.textMuted }}>
              List your property with Reeve once. Hand over the keys once.
              <br />After that — your only involvement is receiving your payout.
            </p>
          </div>
        </section>

        {/* ══ SECTION 5: FEATURE CENTREPIECE ══════════════════════════════ */}
        <section style={{ background: C.surface }} className="py-20 lg:py-28">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: C.accent }}>
                The Reeve Promise
              </p>
              <h2
                className="mx-auto mt-4 max-w-3xl text-[36px] leading-[42px] lg:text-[52px] lg:leading-[58px]"
                style={{ fontFamily: FONT_SERIF, fontWeight: 400, color: C.textPrimary }}
              >
                After you hand over the keys once,
                <br />you never visit your property again.
              </h2>
              <p className="mx-auto mt-6 max-w-xl text-lg" style={{ color: C.textMuted }}>
                Every visit, every showing, every inspection — Reeve handles it. You are never called to your own property.
              </p>
            </div>

            <div className="mt-16 grid grid-cols-1 gap-6 lg:grid-cols-3">
              {[
                {
                  num: '01',
                  title: 'Tenant Finding Visits',
                  body: "When Reeve lists your property, our team shows it to every vetted applicant — one by one. You are never present. Never called. We handle every question, every negotiation, every showing slot.",
                  pill: 'Zero visits required from you',
                },
                {
                  num: '02',
                  title: 'Mid-Tenancy Check-Ins',
                  body: "During the lease, Reeve conducts periodic condition checks and coordinates all maintenance. If anything needs your attention, we tell you — in writing, with documentation. You don't show up to \"check on things.\"",
                  pill: 'Zero unplanned visits',
                },
                {
                  num: '03',
                  title: 'Move-Out Walkthrough',
                  body: "When the tenant leaves, Reeve conducts the full inspection, documents the condition room by room against the move-in report, assesses any damage, and handles the entire settlement process. You are not required at any stage.",
                  pill: 'Zero involvement required',
                },
              ].map((block) => (
                <div
                  key={block.num}
                  className="hover-lift relative rounded-3xl p-8"
                  style={{ border: `1px solid ${C.border}`, background: C.surface }}
                >
                  <p
                    className="absolute right-8 top-8 text-5xl leading-none select-none"
                    style={{ fontFamily: FONT_SERIF, color: C.accentLight }}
                  >
                    {block.num}
                  </p>
                  <h3 className="text-xl font-semibold pr-12" style={{ color: C.textPrimary }}>
                    {block.title}
                  </h3>
                  <p className="mt-4 text-sm leading-relaxed" style={{ color: C.textBody }}>
                    {block.body}
                  </p>
                  <span
                    className="mt-6 inline-block rounded-full px-4 py-1.5 text-xs font-semibold"
                    style={{ background: C.accentLight, color: C.accent }}
                  >
                    {block.pill}
                  </span>
                </div>
              ))}
            </div>

            <p
              className="mt-16 text-center text-[28px] leading-relaxed"
              style={{ fontFamily: FONT_SERIF, fontWeight: 400, color: C.accent }}
            >
              &ldquo;The last time you visit is the day you hand us the keys.&rdquo;
            </p>
          </div>
        </section>

        {/* ══ SECTION 6: HOW THE MONEY WORKS ══════════════════════════════ */}
        <section style={{ background: C.bg }} className="py-20 lg:py-28">
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

              {/* Tenant pays card */}
              <div
                className="rounded-3xl p-8 lg:p-10"
                style={{ background: C.surface, border: `2px solid ${C.accent}` }}
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

        {/* ══ SECTION 7: HOW IT WORKS ══════════════════════════════════════ */}
        <section
          ref={processRef as React.RefObject<HTMLElement>}
          style={{ background: C.surface }}
          className="py-20 lg:py-28"
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
                    <p className="mt-2 text-sm leading-relaxed" style={{ color: C.textBody }}>{step.body}</p>
                    {step.pill && (
                      <span
                        className="mt-3 inline-block rounded-full px-3 py-1 text-xs font-semibold"
                        style={{ background: C.accentLight, color: C.accent }}
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
                    <p className="mt-2 text-sm leading-relaxed" style={{ color: C.textBody }}>{step.body}</p>
                    {step.pill && (
                      <span
                        className="mt-3 inline-block rounded-full px-3 py-1 text-xs font-semibold"
                        style={{ background: C.accentLight, color: C.accent }}
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

        {/* ══ SECTION 8: SAVINGS CALCULATOR ═══════════════════════════════ */}
        <section style={{ background: C.bg }} className="py-20 lg:py-28">
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
                <div className="px-6 py-4" style={{ background: C.textPrimary }}>
                  <p className="font-semibold text-white">Traditional Property Management</p>
                  <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.6)' }}>Pay upfront fees, pay commission, manage it yourself.</p>
                </div>
                <div className="p-6" style={{ background: C.surface }}>
                  {/* Security */}
                  <div className="rounded-2xl p-4 mb-4" style={{ background: '#F8F8F8', border: `1px solid ${C.border}` }}>
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
                      <div key={row.label} className="flex justify-between rounded-xl px-4 py-3 text-sm" style={{ background: '#FEF2F2', border: `1px solid ${C.dangerBorder}` }}>
                        <span style={{ color: C.textBody }}>{row.label}</span>
                        <span className="font-semibold" style={{ color: C.danger }}>
                          {row.animated && row.raw !== undefined
                            ? <AnimatedNumber value={row.raw} formatter={formatINR} />
                            : row.value}
                        </span>
                      </div>
                    ))}
                    <div className="flex justify-between rounded-xl px-4 py-3 text-sm" style={{ background: C.accentLight, border: `1px solid #6EE7B7` }}>
                      <span style={{ color: C.textBody }}>Interest Earned on Deposit</span>
                      <span className="font-semibold" style={{ color: C.accent }}>
                        +<AnimatedNumber value={savings.interestEarned} formatter={formatINR} />
                      </span>
                    </div>
                    <div className="flex justify-between rounded-xl px-4 py-3 text-sm font-bold" style={{ background: '#FEF2F2', border: `1px solid ${C.dangerBorder}` }}>
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
                  <div className="rounded-2xl p-4 mb-4" style={{ background: '#F8F8F8', border: `1px solid ${C.border}` }}>
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
                      <div key={label} className="flex justify-between rounded-xl px-4 py-3 text-sm" style={{ background: C.accentLight, border: `1px solid #6EE7B7` }}>
                        <span style={{ color: C.textBody }}>{label}</span>
                        <span className="font-semibold" style={{ color: C.accent }}>₹0</span>
                      </div>
                    ))}
                    <div className="flex justify-between rounded-xl px-4 py-3 text-sm font-bold" style={{ background: C.accentLight, border: `1px solid #6EE7B7` }}>
                      <span style={{ color: C.accent }}>Net Cost</span>
                      <span className="font-bold" style={{ color: C.accent }}>₹0</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Savings headline */}
            <div className="mt-10 text-center">
              <p
                className="text-[32px] leading-tight lg:text-[40px]"
                style={{ fontFamily: FONT_SERIF, fontWeight: 400, color: C.accent }}
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

        {/* ══ SECTION 9: INVISIBLE COSTS ═══════════════════════════════════ */}
        <section style={{ background: C.surface }} className="py-20 lg:py-28">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <p className="text-center text-lg" style={{ color: C.textBody }}>
              You saved{' '}
              <span className="font-semibold" style={{ color: C.accent }}>
                <AnimatedNumber value={savings.netSavings} formatter={formatINR} />
              </span>
              {' '}in direct costs. But that&apos;s not the whole story.
            </p>

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
              style={{ fontFamily: FONT_SERIF, fontWeight: 400, color: C.accent }}
            >
              &ldquo;These don&apos;t appear in a spreadsheet.
              <br />But you&apos;ve felt every one of them.&rdquo;
            </p>
          </div>
        </section>

        {/* ══ SECTION 10: OWNER PROTECTION PROMISE ═════════════════════════ */}
        <section
          ref={protectionRef as React.RefObject<HTMLElement>}
          style={{ background: C.bg }}
          className="py-20 lg:py-28"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: C.textMuted }}>
              Your Protection
            </p>
            <h2
              className="mt-3 max-w-2xl text-[32px] leading-[38px] lg:text-[44px] lg:leading-[50px]"
              style={{ fontFamily: FONT_SERIF, fontWeight: 400, color: C.textPrimary }}
            >
              Even when things go wrong — they&apos;re not your problem to solve.
            </h2>
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
                  style={{ background: C.surface, border: `1px solid ${C.border}` }}
                >
                  <div className="text-3xl">{card.icon}</div>
                  <h3 className="mt-4 text-lg font-semibold" style={{ color: C.textPrimary }}>
                    {card.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed" style={{ color: C.textBody }}>
                    {card.body}
                  </p>
                  <p className="mt-4 text-sm font-semibold" style={{ color: C.accent }}>
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

        {/* ══ SECTION 11: COMPARISON TABLE ═════════════════════════════════ */}
        <section style={{ background: C.surface }} className="py-20 lg:py-28">
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
                    <th className="px-6 py-4 text-left font-semibold" style={{ color: C.textMuted, background: C.bg }}>Aspect</th>
                    <th className="px-6 py-4 text-center font-semibold" style={{ color: C.textBody, background: C.bg }}>Self-managed</th>
                    <th className="px-6 py-4 text-center font-semibold" style={{ color: C.textBody, background: C.bg }}>Traditional Broker</th>
                    <th className="px-6 py-4 text-center font-semibold" style={{ color: C.accent, background: C.accentLight }}>
                      With Reeve
                      <span className="ml-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: C.accent, color: '#fff' }}>
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
                        background: row.emphasized ? `${C.accentLight}50` : i % 2 === 0 ? C.surface : C.bg,
                        borderLeft: row.emphasized ? `3px solid ${C.accent}` : undefined,
                      }}
                    >
                      <td className="px-6 py-4 font-medium" style={{ color: row.emphasized ? C.accent : C.textPrimary, borderBottom: `1px solid ${C.border}` }}>
                        {row.aspect}
                      </td>
                      <td className="px-6 py-4 text-center" style={{ color: C.textBody, borderBottom: `1px solid ${C.border}` }}>{row.selfManaged}</td>
                      <td className="px-6 py-4 text-center" style={{ color: C.textBody, borderBottom: `1px solid ${C.border}` }}>{row.broker}</td>
                      <td className="px-6 py-4 text-center font-semibold" style={{ color: C.accent, background: `${C.accentLight}80`, borderBottom: `1px solid ${C.border}` }}>
                        ✓ {row.reeve}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile card stack */}
            <div className="mt-8 flex flex-col gap-4 lg:hidden">
              {COMPARISON_ROWS.map((row) => (
                <div
                  key={row.aspect}
                  className="rounded-2xl p-5"
                  style={{
                    border: `1px solid ${row.emphasized ? C.accent : C.border}`,
                    background: row.emphasized ? `${C.accentLight}40` : C.surface,
                  }}
                >
                  <p className="text-sm font-bold mb-3" style={{ color: row.emphasized ? C.accent : C.textPrimary }}>
                    {row.aspect}
                  </p>
                  <div className="space-y-2">
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
                      style={{ background: C.accentLight, color: C.accent }}
                    >
                      <span>With Reeve</span>
                      <span>✓ {row.reeve}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══ SECTION 12: SOCIAL PROOF ══════════════════════════════════════ */}
        <section style={{ background: C.bg }} className="py-20 lg:py-28">
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
              style={{ background: C.surface, border: `1px solid ${C.border}` }}
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
              <p className="mt-6 text-sm font-semibold" style={{ color: C.accent }}>
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

        {/* ══ SECTION 13: FAQ ═══════════════════════════════════════════════ */}
        <section style={{ background: C.surface }} className="py-20 lg:py-28">
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
                      background: isOpen ? `${C.accentLight}60` : C.surface,
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

        {/* ══ SECTION 14: FINAL CTA ════════════════════════════════════════ */}
        <section id="final-cta" style={{ background: C.accent }} className="py-20 lg:py-28">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">

              {/* Left: copy */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: C.accentMid }}>
                  Zero Commitment to Start
                </p>
                <h2
                  className="mt-4 text-[36px] leading-[42px] lg:text-[48px] lg:leading-[54px] text-white"
                  style={{ fontFamily: FONT_SERIF, fontWeight: 400 }}
                >
                  List your property.
                  <br />Free. Takes 3 minutes.
                </h2>
                <p className="mt-6 text-base leading-relaxed" style={{ color: 'rgba(255,255,255,0.8)' }}>
                  No photos needed. No documents at this stage. Just tell us about your property
                  and we&apos;ll take it from there.
                </p>
                <p className="mt-6 text-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>
                  Free listing · Zero commission · Fully managed<br />
                  No commitment until service agreement is signed
                </p>
              </div>

              {/* Right: forms */}
              <div>
                {/* Primary lead form */}
                <form onSubmit={handleLeadSubmit} className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.08)' }}>
                  <p className="text-sm font-semibold text-white mb-4">List My Property</p>
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Full name"
                      required
                      value={leadForm.name}
                      onChange={(e) => setLeadForm((f) => ({ ...f, name: e.target.value }))}
                      className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                      style={{
                        background: 'rgba(255,255,255,0.12)',
                        border: `1px solid rgba(255,255,255,0.2)`,
                        color: '#fff',
                        minHeight: 44,
                      }}
                    />
                    <input
                      type="tel"
                      inputMode="numeric"
                      placeholder="Phone number"
                      required
                      value={leadForm.phone}
                      onChange={(e) => setLeadForm((f) => ({ ...f, phone: e.target.value }))}
                      className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                      style={{
                        background: 'rgba(255,255,255,0.12)',
                        border: `1px solid rgba(255,255,255,0.2)`,
                        color: '#fff',
                        minHeight: 44,
                      }}
                    />
                    <input
                      type="text"
                      placeholder="Property area / locality (e.g. Koramangala, HSR Layout)"
                      required
                      value={leadForm.locality}
                      onChange={(e) => setLeadForm((f) => ({ ...f, locality: e.target.value }))}
                      className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                      style={{
                        background: 'rgba(255,255,255,0.12)',
                        border: `1px solid rgba(255,255,255,0.2)`,
                        color: '#fff',
                        minHeight: 44,
                      }}
                    />
                    <select
                      required
                      value={leadForm.bhk}
                      onChange={(e) => setLeadForm((f) => ({ ...f, bhk: e.target.value as BhkType }))}
                      className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                      style={{
                        background: 'rgba(255,255,255,0.12)',
                        border: `1px solid rgba(255,255,255,0.2)`,
                        color: leadForm.bhk ? '#fff' : 'rgba(255,255,255,0.5)',
                        minHeight: 44,
                      }}
                    >
                      <option value="" disabled>BHK type</option>
                      <option value="studio">Studio</option>
                      <option value="1BHK">1BHK</option>
                      <option value="2BHK">2BHK</option>
                      <option value="3BHK">3BHK</option>
                      <option value="4BHK">3BHK+</option>
                    </select>
                  </div>
                  {leadError && (
                    <p className="mt-3 text-sm" style={{ color: '#FCA5A5' }}>{leadError}</p>
                  )}
                  <button
                    type="submit"
                    disabled={leadLoading}
                    className="mt-4 w-full rounded-xl py-4 text-sm font-semibold transition"
                    style={{ background: '#fff', color: C.accent, minHeight: 44 }}
                  >
                    {leadLoading ? 'Submitting…' : 'List My Property — It\'s Free →'}
                  </button>
                </form>

                {/* Separator */}
                <div className="my-6 flex items-center gap-4">
                  <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.15)' }} />
                  <span className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>Not ready to list yet?</span>
                  <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.15)' }} />
                </div>

                {/* Callback form */}
                {callbackSuccess ? (
                  <div className="rounded-2xl p-6 text-center" style={{ background: 'rgba(255,255,255,0.08)' }}>
                    <p className="text-white font-semibold">We&apos;ll call you soon. ✓</p>
                  </div>
                ) : (
                  <form onSubmit={handleCallbackSubmit} className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.08)' }}>
                    <input
                      type="tel"
                      inputMode="numeric"
                      placeholder="Your phone number"
                      required
                      value={callbackPhone}
                      onChange={(e) => setCallbackPhone(e.target.value)}
                      className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                      style={{
                        background: 'rgba(255,255,255,0.12)',
                        border: `1px solid rgba(255,255,255,0.2)`,
                        color: '#fff',
                        minHeight: 44,
                      }}
                    />
                    {callbackError && (
                      <p className="mt-2 text-sm" style={{ color: '#FCA5A5' }}>{callbackError}</p>
                    )}
                    <button
                      type="submit"
                      disabled={callbackLoading}
                      className="mt-3 w-full rounded-xl py-4 text-sm font-semibold transition"
                      style={{
                        background: 'transparent',
                        border: `1px solid rgba(255,255,255,0.4)`,
                        color: '#fff',
                        minHeight: 44,
                      }}
                    >
                      {callbackLoading ? 'Requesting…' : 'Request a Callback →'}
                    </button>
                    <p className="mt-2 text-center text-[11px]" style={{ color: 'rgba(255,255,255,0.45)' }}>
                      We&apos;ll call within 4 business hours.
                    </p>
                  </form>
                )}
              </div>
            </div>
          </div>
        </section>

      </div>
    </Layout>
  );
}
