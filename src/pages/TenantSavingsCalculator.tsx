import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  BadgeIndianRupee,
  CalendarDays,
  CheckCircle2,
  Home,
  Landmark,
  PiggyBank,
  ShieldCheck,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

type Tone = "default" | "negative" | "positive";
type Accent = "emerald" | "blue" | "amber" | "purple";

interface CountUpProps {
  value: number;
  currency?: boolean;
  suffix?: string;
  className?: string;
}

interface ResultRowProps {
  label: string;
  value: number;
  tone?: Tone;
  strong?: boolean;
  note?: string;
}

interface HighlightCardProps {
  icon: LucideIcon;
  value: number;
  label: string;
  accent?: Accent;
  currency?: boolean;
  suffix?: string;
}

interface ComparisonBarProps {
  label: string;
  traditional: number;
  reeve: number;
  traditionalLabel: string;
  reeveLabel: string;
}

interface TraditionalMetrics {
  deposit: number;
  brokerage: number;
  securityDepositDeducted: number;
  stampDuty: number;
  upfront: number;
  directCost: number;
  indirectCost: number;
  totalCost: number;
}

interface ReeveMetrics {
  deposit: number;
  baseRent: number;
  serviceFee: number;
  stampDuty: number;
  upfront: number;
  directCost: number;
  indirectCost: number;
  totalCost: number;
}

interface SavingsMetrics {
  depositSaved: number;
  brokerageSaved: number;
  stampDutySaved: number;
  upfrontSavings: number;
  interestBenefitOnDepositSaved: number;
  interestBenefitOnBrokerageAvoided: number;
  totalCostSavings: number;
  netSavings: number;
}

interface Metrics {
  rent: number;
  tenureMonths: number;
  annualInterest: number;
  traditional: TraditionalMetrics;
  reeve: ReeveMetrics;
  savings: SavingsMetrics;
}

interface FAQItem {
  question: string;
  answer: string;
}

const formatNumberIN = (value: number): string => new Intl.NumberFormat("en-IN").format(value || 0);
const formatINR = (value: number): string => "₹" + formatNumberIN(Math.round(value || 0));
const parseDigits = (value: string): number => Number(String(value).replace(/[^0-9]/g, "") || 0);

function CountUp({ value, currency = false, suffix = "", className = "" }: CountUpProps): JSX.Element {
  const [display, setDisplay] = useState<number>(0);
  const previousRef = useRef<number>(0);

  useEffect(() => {
    const start = previousRef.current;
    const end = Math.round(value || 0);
    const duration = 700;
    const startTime = performance.now();
    let frame = 0;

    const tick = (now: number): void => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + (end - start) * eased);
      setDisplay(current);

      if (progress < 1) {
        frame = window.requestAnimationFrame(tick);
      } else {
        previousRef.current = end;
      }
    };

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [value]);

  return (
    <span className={className}>
      {currency ? formatINR(display) : formatNumberIN(display)}
      {suffix}
    </span>
  );
}

function ResultRow({ label, value, tone = "default", strong = false, note = "" }: ResultRowProps): JSX.Element {
  let toneClass = "text-slate-800";

  if (tone === "negative") {
    toneClass = "text-rose-600";
  } else if (tone === "positive") {
    toneClass = "text-emerald-600";
  }

  const valueClass = "shrink-0 text-right text-sm " + (strong ? "font-semibold " : "font-medium ") + toneClass;

  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-3 last:border-b-0">
      <div className="min-w-0">
        <span className="text-sm text-slate-600">{label}</span>
        {note ? (
          <div className="mt-1 inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium leading-4 text-emerald-700 ring-1 ring-emerald-100">
            {note}
          </div>
        ) : null}
      </div>
      <span className={valueClass}>
        <CountUp value={value} currency />
      </span>
    </div>
  );
}

function HighlightCard({
  icon: Icon,
  value,
  label,
  accent = "emerald",
  currency = true,
  suffix = "",
}: HighlightCardProps): JSX.Element {
  const colorMap: Record<Accent, string> = {
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    blue: "bg-blue-50 text-blue-700 ring-blue-100",
    amber: "bg-amber-50 text-amber-700 ring-amber-100",
    purple: "bg-purple-50 text-purple-700 ring-purple-100",
  };

  const iconClass = "inline-flex h-11 w-11 items-center justify-center rounded-2xl ring-1 " + colorMap[accent];

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className={iconClass}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="mt-4 text-2xl font-semibold tracking-tight text-slate-900">
        {currency ? <CountUp value={value} currency /> : <CountUp value={value} suffix={suffix} />}
      </div>
      <p className="mt-1 text-sm text-slate-600">{label}</p>
    </div>
  );
}

function ComparisonBar({
  label,
  traditional,
  reeve,
  traditionalLabel,
  reeveLabel,
}: ComparisonBarProps): JSX.Element {
  const max = Math.max(traditional, reeve, 1);
  const tradWidth = String((traditional / max) * 100) + "%";
  const reeveWidth = String((reeve / max) * 100) + "%";

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-slate-900">{label}</h3>
        
      </div>

      <div className="space-y-4">
        <div>
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-slate-600">Traditional</span>
            <span className="font-semibold text-rose-600">
              <CountUp value={traditional} currency />
            </span>
          </div>
          <div className="h-3 rounded-full bg-rose-50">
            <div className="h-3 rounded-full bg-rose-500 transition-all duration-700" style={{ width: tradWidth }} />
          </div>
          <p className="mt-2 text-xs text-slate-500">{traditionalLabel}</p>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-slate-600">With Reeve</span>
            <span className="font-semibold text-emerald-600">
              <CountUp value={reeve} currency />
            </span>
          </div>
          <div className="h-3 rounded-full bg-emerald-50">
            <div className="h-3 rounded-full bg-emerald-500 transition-all duration-700" style={{ width: reeveWidth }} />
          </div>
          <p className="mt-2 text-xs text-slate-500">{reeveLabel}</p>
        </div>
      </div>
    </div>
  );
}

export default function TenantSavingsPage(): JSX.Element {
  const [inputValue, setInputValue] = useState<string>("");
  const [rent, setRent] = useState<number>(0);
  const resultsRef = useRef<HTMLDivElement | null>(null);
  const rentRange = { min: 5000, max: 500000 };
  const hasTyped = inputValue.length > 0;
  const hasValidRent = rent >= rentRange.min && rent <= rentRange.max;

  useEffect(() => {
    if (hasValidRent && resultsRef.current) {
      const timeoutId = window.setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 120);

      return () => window.clearTimeout(timeoutId);
    }

    return undefined;
  }, [hasValidRent]);

  const metrics = useMemo<Metrics | null>(() => {
    if (!hasValidRent) {
      return null;
    }

    const R = rent;
    const annualInterest = 0.1;
    const tenureMonths = 11;

    const traditional: TraditionalMetrics = {
      deposit: 3 * R,
      brokerage: 1 * R,
      securityDepositDeducted: 1 * R,
      stampDuty: 750,
      upfront: 4 * R + 750,
      directCost: R + R + 750,
      indirectCost: R * annualInterest + 3 * R * annualInterest,
      totalCost: 0,
    };
    traditional.totalCost = traditional.directCost + traditional.indirectCost;

    const reeve: ReeveMetrics = {
      deposit: 1 * R,
      baseRent: R * tenureMonths,
      serviceFee: R * tenureMonths * 0.07,
      stampDuty: 0,
      upfront: 1 * R,
      directCost: R * tenureMonths * 0.07,
      indirectCost: R * annualInterest,
      totalCost: 0,
    };
    reeve.totalCost = reeve.directCost + reeve.indirectCost;

    const savings: SavingsMetrics = {
      depositSaved: 2 * R,
      brokerageSaved: 1 * R,
      stampDutySaved: 750,
      upfrontSavings: traditional.upfront - reeve.upfront,
      interestBenefitOnDepositSaved: 2 * R * annualInterest,
      interestBenefitOnBrokerageAvoided: 1 * R * annualInterest,
      totalCostSavings: traditional.totalCost - reeve.totalCost,
      netSavings: traditional.totalCost - reeve.totalCost,
    };

    return {
      rent: R,
      tenureMonths,
      annualInterest,
      traditional,
      reeve,
      savings,
    };
  }, [rent, hasValidRent]);

  const faqs: FAQItem[] = [
    {
      question: "How is the Reeve savings amount calculated?",
      answer:
        "We compare traditional renting costs like 3 months of deposit, 1 month brokerage, stamp duty, and capital blocked upfront against Reeve’s 1 month deposit and 7% service fee on the 11-month lease.",
    },
    {
      question: "Is the 1-month security deposit refundable?",
      answer:
        "Yes. The deposit is fully refundable if there are no damages, based on the final property check and Damage Assessment SOP.",
    },
    {
      question: "Why is there a 10% annual capital cost in the calculator?",
      answer:
        "This represents the opportunity cost of money locked in deposits or other upfront payments. It helps show the real financial impact beyond just visible fees.",
    },
    {
      question: "Does this calculator include monthly rent itself?",
      answer:
        "No. This page compares the extra cost of renting under each model, not the base rent you pay every month for the home.",
    },
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const digits = parseDigits(e.target.value);
    setInputValue(digits ? formatNumberIN(digits) : "");
    setRent(digits);
  };

  const setQuickRent = (value: number): void => {
    setRent(value);
    setInputValue(formatNumberIN(value));
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm">
              <Home className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold tracking-wide text-slate-900">Reeve</p>
              <p className="text-xs text-slate-500">Tenant Savings Calculator</p>
            </div>
          </div>

          <a
            href="/savings/owner"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
          >
            Calculate for Owners
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden border-b border-slate-200 bg-white">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(16,185,129,0.10),_transparent_28%),radial-gradient(circle_at_left,_rgba(59,130,246,0.08),_transparent_25%)]" />
          <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:px-8 lg:py-20">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">
                <ShieldCheck className="h-4 w-4" />
                No broker. Lower upfront cash.
              </div>

              <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                See how much you save with Reeve
              </h1>
              <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
                Compare the cost of renting the traditional way versus renting through Reeve over an 11-month lease. Enter your monthly rent and get a simple side-by-side breakdown.
              </p>

              <div className="mt-8 flex flex-wrap gap-3 text-sm">
                <span className="rounded-full bg-slate-100 px-4 py-2 font-medium text-slate-700">11-month lease</span>
                <span className="rounded-full bg-slate-100 px-4 py-2 font-medium text-slate-700">10% annual capital cost</span>
                <span className="rounded-full bg-slate-100 px-4 py-2 font-medium text-slate-700">Client-side calculator</span>
              </div>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/50">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                  <BadgeIndianRupee className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Monthly rent input</h2>
                  <p className="text-sm text-slate-500">Use a realistic Bangalore rent to compare both models.</p>
                </div>
              </div>

              <label className="mt-6 block text-sm font-medium text-slate-700">Expected Monthly Rent</label>
              <div className="mt-2 flex items-center rounded-2xl border border-slate-300 bg-slate-50 px-4 py-4 shadow-sm transition focus-within:border-slate-900 focus-within:bg-white">
                <span className="mr-2 text-xl font-semibold text-slate-500">₹</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={inputValue}
                  onChange={handleInputChange}
                  placeholder="25,000"
                  className="w-full border-0 bg-transparent p-0 text-2xl font-semibold tracking-tight text-slate-950 outline-none placeholder:text-slate-400"
                  aria-label="Expected monthly rent in rupees"
                />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {[25000, 40000, 60000].map((value: number) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setQuickRent(value)}
                    className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
                  >
                    {formatINR(value)}
                  </button>
                ))}
              </div>

              <p className="mt-4 text-sm text-slate-500">Allowed range: {formatINR(rentRange.min)} to {formatINR(rentRange.max)}</p>
              {hasTyped && !hasValidRent ? (
                <p className="mt-2 text-sm font-medium text-amber-700">
                  Enter a rent between {formatINR(rentRange.min)} and {formatINR(rentRange.max)} to see your comparison.
                </p>
              ) : null}

              <div className="mt-6 rounded-2xl bg-slate-900 p-4 text-white">
                <p className="text-sm text-slate-300">What changes with Reeve?</p>
                <div className="mt-2 grid grid-cols-3 gap-3 text-center text-sm">
                  <div className="rounded-2xl bg-white/10 p-3">
                    <div className="font-semibold text-white">1 month</div>
                    <div className="mt-1 text-xs text-slate-300">deposit</div>
                  </div>
                  <div className="rounded-2xl bg-white/10 p-3">
                    <div className="font-semibold text-white">0</div>
                    <div className="mt-1 text-xs text-slate-300">brokerage</div>
                  </div>
                  <div className="rounded-2xl bg-white/10 p-3">
                    <div className="font-semibold text-white">7%</div>
                    <div className="mt-1 text-xs text-slate-300">service fee</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {metrics ? (
          <section ref={resultsRef} className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Savings breakdown</p>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Your rent comparison at {formatINR(metrics.rent)}/month</h2>
              </div>
              <div className="rounded-full bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700">
                Estimated 11-month savings: {formatINR(metrics.savings.netSavings)}
              </div>
            </div>

            <div className="mt-8 grid items-stretch gap-6 md:grid-cols-2">
              <div className="flex h-full flex-col rounded-[2rem] border border-rose-100 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
                    <Landmark className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900">Traditional Renting</h3>
                    <p className="text-sm text-slate-500">Broker model with higher upfront cash and added friction.</p>
                  </div>
                </div>

                <div className="mt-6 flex-1 rounded-3xl bg-rose-50/50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-600">Upfront payments</p>
                  <div className="mt-3 space-y-1">
                    <ResultRow label="Security deposit (3× rent)" value={metrics.traditional.deposit} tone="negative" />
                    <ResultRow label="Brokerage (1× rent)" value={metrics.traditional.brokerage} tone="negative" />
                    <ResultRow label="Stamp duty" value={metrics.traditional.stampDuty} tone="negative" />
                    <ResultRow label="Total upfront outflow" value={metrics.traditional.upfront} tone="negative" strong />
                  </div>
                </div>

                <div className="mt-5 flex-1 rounded-3xl border border-slate-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Money You Never Get Back</p>
                  <div className="mt-3 space-y-1">
                    <ResultRow label="Brokerage" value={metrics.traditional.brokerage} />
                    <ResultRow label="Security deposit deducted" value={metrics.traditional.securityDepositDeducted} />
                    <ResultRow label="Opportunity cost on blocked deposit" value={metrics.traditional.indirectCost} />
                    <ResultRow label="Total cost" value={metrics.traditional.totalCost} strong />
                  </div>
                </div>
              </div>

              <div className="flex h-full flex-col rounded-[2rem] border border-emerald-100 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900">Renting with Reeve</h3>
                    <p className="text-sm text-slate-500">Lower cash blocked upfront with a simple platform fee.</p>
                  </div>
                </div>

                <div className="mt-6 flex-1 rounded-3xl bg-emerald-50/60 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Upfront payments</p>
                  <div className="mt-3 space-y-1">
                    <ResultRow
                      label="Security deposit (1× rent)"
                      value={metrics.reeve.deposit}
                      tone="positive"
                      note="Fully Refundable* (FAQs)"
                    />
                    <ResultRow label="Brokerage" value={0} tone="positive" />
                    <ResultRow label="Stamp duty" value={0} tone="positive" />
                    <ResultRow label="Total upfront outflow" value={metrics.reeve.upfront} tone="positive" strong />
                  </div>
                </div>

                <div className="mt-5 flex-1 rounded-3xl border border-slate-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Money You Never Get Back</p>
                  <div className="mt-3 space-y-1">
                    <ResultRow label="Service fee (7% of 11-month base rent)" value={metrics.reeve.serviceFee} />
                    <ResultRow label="Opportunity cost on blocked deposit" value={metrics.reeve.indirectCost} />
                    <ResultRow label="Total cost" value={metrics.reeve.totalCost} strong />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <ComparisonBar
                label="Upfront cash needed to move in"
                traditional={metrics.traditional.upfront}
                reeve={metrics.reeve.upfront}
                traditionalLabel="Traditional renting locks in 4 months of rent plus stamp duty upfront."
                reeveLabel="Reeve keeps it to just 1 month of rent as deposit."
              />
              <ComparisonBar
                label="Total cost over the 11-month lease"
                traditional={metrics.traditional.totalCost}
                reeve={metrics.reeve.totalCost}
                traditionalLabel="Brokerage, deductions, and interest drag your total cost up."
                reeveLabel="A platform fee plus a smaller deposit keeps total cost lower."
              />
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <HighlightCard icon={PiggyBank} value={metrics.savings.depositSaved} label="Deposit Saved" accent="emerald" />
              <HighlightCard icon={CheckCircle2} value={metrics.savings.brokerageSaved} label="Zero Brokerage" accent="blue" />
              <HighlightCard icon={CalendarDays} value={18} label="Faster Move-in" accent="amber" currency={false} suffix=" Days" />
              <HighlightCard icon={TrendingUp} value={metrics.savings.netSavings} label="Net 11-Month Savings" accent="purple" />
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">How these savings are calculated</h3>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-3xl bg-slate-50 p-4">
                    <p className="text-sm font-medium text-slate-900">Traditional model</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      3 months deposit + 1 month brokerage + ₹750 stamp duty upfront. Total cost also includes brokerage, stamp duty, one-month deduction, and 10% annual imputed interest on locked capital.
                    </p>
                  </div>
                  <div className="rounded-3xl bg-slate-50 p-4">
                    <p className="text-sm font-medium text-slate-900">Reeve model</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      1 month deposit upfront. Total cost includes a 7% platform fee on 11 months of base rent plus 10% annual imputed interest on the deposit amount.
                    </p>
                  </div>
                </div>
                <div className="mt-4 rounded-3xl border border-emerald-100 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">
                  Your upfront cash-flow benefit is <span className="font-semibold">{formatINR(metrics.savings.upfrontSavings)}</span>, and your total estimated 11-month savings are <span className="font-semibold">{formatINR(metrics.savings.totalCostSavings)}</span>.
                </div>
              </div>

              <div className="rounded-[2rem] border border-slate-200 bg-slate-950 p-6 text-white shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-300">Ready to move?</p>
                <h3 className="mt-3 text-3xl font-semibold tracking-tight">
                  Ready to save {formatINR(metrics.savings.upfrontSavings)} on your next rental?
                </h3>
                <p className="mt-4 text-sm leading-6 text-slate-300">
                  Skip brokerage, keep more cash in hand, and move in with just 1 month of deposit.
                </p>
                <a
                  href="/login"
                  className="mt-8 inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
                >
                  Sign Up and Start Saving
                  <ArrowRight className="h-4 w-4" />
                </a>
                <p className="mt-4 text-sm text-slate-400">Zero brokerage · 1 month deposit · Fully managed</p>
              </div>
            </div>

            <div className="mt-8 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="max-w-2xl">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">FAQ</p>
                <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Common questions from tenants</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  A few quick answers to help tenants understand how the comparison works.
                </p>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {faqs.map((faq: FAQItem) => (
                  <div key={faq.question} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                    <h4 className="text-base font-semibold text-slate-900">{faq.question}</h4>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{faq.answer}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}
