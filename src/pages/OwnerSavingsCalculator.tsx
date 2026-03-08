'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';

type FAQItem = {
  question: string;
  answer: string;
};

type SavingsBreakdown = {
  rent: number;
  tenureMonths: number;
  imputedInterestRate: number;
  traditionalSecurityCollected: number;
  traditionalSecurityReturned: number;
  reeveSecurityCollected: number;
  listingFee: number;
  commission: number;
  turnoverExpense: number;
  interestEarned: number;
  traditionalNetCost: number;
  reeveNetCost: number;
  commissionSaved: number;
  listingFeeSaved: number;
  turnoverSaved: number;
  interestBenefit: number;
  netSavings: number;
  timeSavedHours: number;
};

type AnimatedNumberProps = {
  value: number;
  formatter: (value: number) => string;
  animate: boolean;
  className?: string;
  durationMs?: number;
};

type ComparisonCellProps = {
  label: string;
  value: React.ReactNode;
  tone: 'traditional' | 'reeve';
  sublabel?: string;
  emphasize?: boolean;
  positiveValue?: boolean;
};

const MIN_RENT: number = 5000;
const MAX_RENT: number = 500000;
const LISTING_FEE: number = 10000;
const TENURE_MONTHS: number = 11;
const IMPUTED_INTEREST_RATE: number = 0.1;
const TIME_SAVED_HOURS: number = 120;
const VISITS_SAVED: number = 15;
const CALLS_SAVED: number = 0;

const inrFormatter: Intl.NumberFormat = new Intl.NumberFormat('en-IN', {
  maximumFractionDigits: 0,
});

const integerFormatter: Intl.NumberFormat = new Intl.NumberFormat('en-IN', {
  maximumFractionDigits: 0,
});

const badgeItems: string[] = [
  'Free Listing',
  'No Commission',
  'No Brokerage',
  'Zero Management Fee',
];

const faqItems: FAQItem[] = [
  {
    question: 'Does Reeve charge owners anything at all?',
    answer:
      'No. Reeve charges zero listing fees, zero commission, and zero management retainer to property owners. Our service fee of 7% of rent is charged to the tenant, not you. You receive your full rent, directly.',
  },
  {
    question: 'Who handles turnover repairs and cleaning between tenants?',
    answer:
      'Reeve manages the full turnover refresh — cleaning, painting, and minor wear-and-tear repairs — at no cost to you. Structural damages or major repairs beyond normal wear are assessed separately and billed to the responsible party based on the move-in condition report.',
  },
  {
    question: "What happens if my tenant doesn't pay rent?",
    answer:
      "Reeve's Owner Protection Protocol kicks in automatically. We follow up with the tenant directly through all channels. If unresolved, outstanding dues are recovered from the security deposit and eviction proceedings are initiated per the leave and license agreement — all without you having to chase anyone. You receive status updates at every stage.",
  },
  {
    question: 'What is the security deposit structure and who holds it?',
    answer:
      'Under the traditional model, owners collect 2–3 months rent as deposit from the tenant. With Reeve, only 1 month deposit is collected — held and managed by the platform. This makes your property significantly more attractive to tenants and reduces the upfront barrier to renting, leading to faster occupancy.',
  },
];

function formatINR(value: number): string {
  return `₹${inrFormatter.format(Math.round(value))}`;
}

function formatIndianInput(value: number): string {
  return integerFormatter.format(Math.round(value));
}

function calculateSavings(rent: number): SavingsBreakdown {
  const traditionalSecurityCollected: number = 3 * rent;
  const traditionalSecurityReturned: number = 2 * rent;
  const reeveSecurityCollected: number = 1 * rent;
  const commission: number = 1 * rent;
  const turnoverExpense: number = 0.5 * rent;
  const interestEarned: number =
    traditionalSecurityCollected * IMPUTED_INTEREST_RATE * (TENURE_MONTHS / 12);

  const traditionalNetCost: number =
    LISTING_FEE + commission + turnoverExpense - interestEarned - rent;

  const reeveNetCost: number = 0;
  const commissionSaved: number = commission;
  const listingFeeSaved: number = LISTING_FEE;
  const turnoverSaved: number = turnoverExpense;
  const interestBenefit: number = interestEarned;
  const netSavings: number = traditionalNetCost;

  return {
    rent,
    tenureMonths: TENURE_MONTHS,
    imputedInterestRate: IMPUTED_INTEREST_RATE,
    traditionalSecurityCollected,
    traditionalSecurityReturned,
    reeveSecurityCollected,
    listingFee: LISTING_FEE,
    commission,
    turnoverExpense,
    interestEarned,
    traditionalNetCost,
    reeveNetCost,
    commissionSaved,
    listingFeeSaved,
    turnoverSaved,
    interestBenefit,
    netSavings,
    timeSavedHours: TIME_SAVED_HOURS,
  };
}

function AnimatedNumber({
  value,
  formatter,
  animate,
  className,
  durationMs = 900,
}: AnimatedNumberProps): React.ReactElement {
  const [displayValue, setDisplayValue] = useState<number>(animate ? 0 : value);
  const previousTargetRef = useRef<number>(0);

  useEffect(() => {
    if (!animate) {
      setDisplayValue(value);
      previousTargetRef.current = value;
      return;
    }

    let frameId: number = 0;
    const startValue: number = previousTargetRef.current;
    const changeInValue: number = value - startValue;
    const animationStart: number = performance.now();

    const tick = (currentTime: number): void => {
      const rawProgress: number = Math.min(
        (currentTime - animationStart) / durationMs,
        1,
      );
      const easedProgress: number = 1 - Math.pow(1 - rawProgress, 3);
      const nextValue: number = startValue + changeInValue * easedProgress;
      setDisplayValue(nextValue);

      if (rawProgress < 1) {
        frameId = window.requestAnimationFrame(tick);
        return;
      }

      previousTargetRef.current = value;
      setDisplayValue(value);
    };

    frameId = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [animate, durationMs, formatter, value]);

  return <span className={className}>{formatter(displayValue)}</span>;
}

function ComparisonCell({
  label,
  value,
  tone,
  sublabel,
  emphasize = false,
  positiveValue = false,
}: ComparisonCellProps): React.ReactElement {
  const wrapperClasses: string =
    tone === 'traditional'
      ? 'border-rose-200 bg-rose-50/80'
      : 'border-emerald-200 bg-emerald-50/80';

  const labelClasses: string = 'text-slate-700';

  const valueClasses: string = positiveValue
    ? 'text-emerald-700'
    : tone === 'traditional'
      ? 'text-rose-700'
      : 'text-emerald-700';

  return (
    <div
      className={`flex min-h-[84px] flex-col justify-center rounded-2xl border px-4 py-4 ${wrapperClasses}`}
    >
      <p className={`text-xs font-semibold uppercase tracking-[0.16em] ${labelClasses}`}>
        {label}
      </p>
      <div
        className={`mt-2 text-sm font-semibold sm:text-base ${valueClasses} ${
          emphasize ? 'text-base sm:text-lg' : ''
        }`}
      >
        {value}
      </div>
      {sublabel ? <p className="mt-1 text-xs leading-5 text-slate-500">{sublabel}</p> : null}
    </div>
  );
}

export default function OwnerSavingsPage(): React.ReactElement {
  const [rentInput, setRentInput] = useState<string>('');
  const [hasAnimatedResults, setHasAnimatedResults] = useState<boolean>(false);
  const resultsRef = useRef<HTMLDivElement | null>(null);
  const hasScrolledToResultsRef = useRef<boolean>(false);

  const parsedRent: number | null = useMemo(() => {
    const digitsOnly: string = rentInput.replace(/\D/g, '');

    if (!digitsOnly) {
      return null;
    }

    const numericValue: number = Number(digitsOnly);

    if (!Number.isFinite(numericValue)) {
      return null;
    }

    return numericValue;
  }, [rentInput]);

  const isRentInRange: boolean =
    parsedRent !== null && parsedRent >= MIN_RENT && parsedRent <= MAX_RENT;

  const breakdown: SavingsBreakdown | null = useMemo(() => {
    if (parsedRent === null || !isRentInRange) {
      return null;
    }

    return calculateSavings(parsedRent);
  }, [isRentInRange, parsedRent]);

  useEffect(() => {
    if (breakdown && resultsRef.current && !hasScrolledToResultsRef.current) {
      const timeoutId: number = window.setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setHasAnimatedResults(true);
      }, 200);

      hasScrolledToResultsRef.current = true;

      return () => {
        window.clearTimeout(timeoutId);
      };
    }

    if (!breakdown) {
      hasScrolledToResultsRef.current = false;
      setHasAnimatedResults(false);
    }

    return undefined;
  }, [breakdown]);

  const handleRentChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const digitsOnly: string = event.target.value.replace(/\D/g, '');

    if (!digitsOnly) {
      setRentInput('');
      return;
    }

    const numericValue: number = Number(digitsOnly);
    const boundedValue: number = Math.min(numericValue, MAX_RENT);
    setRentInput(formatIndianInput(boundedValue));
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white">
              Reeve
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-semibold text-slate-900">Owner Savings Calculator</p>
              <p className="text-xs text-slate-500">Standalone owner-side savings page</p>
            </div>
          </div>

          <a
            href="/savings/tenant"
            className="text-right text-sm font-semibold text-emerald-700 transition hover:text-emerald-800"
          >
            Calculate for Tenants →
          </a>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-b from-white to-slate-50">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-18 lg:px-8 lg:py-20">
            <div className="max-w-3xl">
              <div className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                Owner-side savings, instantly
              </div>
              <h1 className="mt-5 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
                See How Much You Save with Reeve
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-8 text-slate-600 sm:text-lg">
                Most property managers charge you a listing fee upfront, take a month's rent as
                commission, and still leave you to chase tenants yourself. Reeve does all of that —
                and charges you nothing. Enter your expected rent below to see exactly what you save.
              </p>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              {badgeItems.map((badge: string) => (
                <span
                  key={badge}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm"
                >
                  {badge}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8 lg:py-12">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:p-8">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                Calculator
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
                Enter your expected monthly rent
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-base">
                All savings are calculated client-side for a single 11-month tenancy cycle using the
                exact assumptions outlined below.
              </p>
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
              <label
                htmlFor="monthly-rent"
                className="block text-sm font-semibold text-slate-800"
              >
                Expected Monthly Rent
              </label>
              <div className="relative mt-3">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg font-semibold text-slate-500">
                  ₹
                </span>
                <input
                  id="monthly-rent"
                  name="monthly-rent"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="25,000"
                  value={rentInput}
                  onChange={handleRentChange}
                  aria-describedby="monthly-rent-help"
                  className="w-full rounded-2xl border border-slate-300 bg-white py-4 pl-10 pr-4 text-lg font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                />
              </div>
              <p id="monthly-rent-help" className="mt-3 text-sm text-slate-500">
                Enter a value between {formatINR(MIN_RENT)} and {formatINR(MAX_RENT)}.
              </p>
              {parsedRent !== null && !isRentInRange ? (
                <p className="mt-2 text-sm font-medium text-amber-700">
                  Please enter a rent within the supported range to see your savings breakdown.
                </p>
              ) : null}
            </div>
          </div>
        </section>

        {breakdown ? (
          <section
            ref={resultsRef}
            className="scroll-mt-24 mx-auto max-w-6xl px-4 pb-12 sm:px-6 lg:px-8"
          >
            <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:p-8">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Savings breakdown
                  </p>
                  <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                    Your owner-side savings at {formatINR(breakdown.rent)}/month
                  </h2>
                </div>

                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 lg:min-w-[250px] lg:text-right">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
                    Estimated savings
                  </p>
                  <p className="mt-2 text-2xl font-bold text-emerald-700 sm:text-3xl">
                    <AnimatedNumber
                      value={breakdown.netSavings}
                      formatter={formatINR}
                      animate={hasAnimatedResults}
                    />
                  </p>
                </div>
              </div>

              <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-xl text-white">
                      🏛️
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 sm:text-xl">
                        Traditional Property Management
                      </h3>
                      <p className="mt-1 text-sm leading-6 text-slate-600 italic">
                        Pay upfront fees, pay commission, manage it yourself.
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 space-y-4">
                    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
                      <div className="border-b border-slate-200 bg-slate-100 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
                          Upfront capital flow
                        </p>
                      </div>
                      <div className="p-4">
                        <div className="rounded-2xl border border-slate-200 bg-slate-100 px-4 py-4">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <p className="text-sm font-semibold text-slate-700">
                                Security Collected (3× rent)
                              </p>
                              <p className="mt-3 text-2xl font-bold text-slate-900 sm:text-3xl">
                                <AnimatedNumber
                                  value={breakdown.traditionalSecurityCollected}
                                  formatter={formatINR}
                                  animate={hasAnimatedResults}
                                />
                              </p>
                            </div>
                            <span className="inline-flex w-fit rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
                              Inflow
                            </span>
                          </div>
                          <div className="mt-4 space-y-2">
                            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
                              {formatINR(breakdown.rent)} absorbed at end for turnover
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600">
                              Returns {formatINR(breakdown.traditionalSecurityReturned)} to tenant
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="overflow-hidden rounded-3xl border border-rose-200 bg-white">
                      <div className="border-b border-rose-200 bg-rose-50 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-700">
                          Costs you bear
                        </p>
                      </div>
                      <div className="grid gap-3 p-4">
                        <ComparisonCell
                          label="PMS Listing Fee"
                          tone="traditional"
                          value={formatINR(breakdown.listingFee)}
                        />
                        <ComparisonCell
                          label="PMS Commission (1× rent)"
                          tone="traditional"
                          value={formatINR(breakdown.commission)}
                        />
                        <ComparisonCell
                          label="Turnover Expense (0.5× rent)"
                          tone="traditional"
                          value={formatINR(breakdown.turnoverExpense)}
                        />
                        <ComparisonCell
                          label="Interest Earned on Deposit"
                          tone="traditional"
                          value={
                            <AnimatedNumber
                              value={breakdown.interestEarned}
                              formatter={(value: number): string => `+${formatINR(value)}`}
                              animate={hasAnimatedResults}
                              className="font-semibold"
                            />
                          }
                          sublabel="Benefit"
                          positiveValue
                        />
                        <ComparisonCell
                          label="Net Cost"
                          tone="traditional"
                          emphasize
                          value={
                            <AnimatedNumber
                              value={breakdown.traditionalNetCost}
                              formatter={formatINR}
                              animate={hasAnimatedResults}
                              className="font-bold"
                            />
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-xl text-white">
                      ✅
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 sm:text-xl">With Reeve</h3>
                      <p className="mt-1 text-sm leading-6 text-slate-600 italic">
                        Fully managed. Zero owner-side fees. Zero commission.
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 space-y-4">
                    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
                      <div className="border-b border-slate-200 bg-slate-100 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
                          Upfront capital flow
                        </p>
                      </div>
                      <div className="p-4">
                        <div className="rounded-2xl border border-slate-200 bg-slate-100 px-4 py-4">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <p className="text-sm font-semibold text-slate-700">
                                Security Collected (1× rent)
                              </p>
                              <p className="mt-3 text-2xl font-bold text-slate-900 sm:text-3xl">
                                <AnimatedNumber
                                  value={breakdown.reeveSecurityCollected}
                                  formatter={formatINR}
                                  animate={hasAnimatedResults}
                                />
                              </p>
                            </div>
                            <span className="inline-flex w-fit rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
                              Neutral
                            </span>
                          </div>
                          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
                            Held and managed by platform. Fully returned at end.
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="overflow-hidden rounded-3xl border border-emerald-200 bg-white">
                      <div className="border-b border-emerald-200 bg-emerald-50 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
                          Costs you bear
                        </p>
                      </div>
                      <div className="grid gap-3 p-4">
                        <ComparisonCell label="PMS Listing Fee" tone="reeve" value="₹0" />
                        <ComparisonCell label="Commission" tone="reeve" value="₹0" />
                        <ComparisonCell
                          label="Turnover Expense"
                          tone="reeve"
                          value="₹0"
                          sublabel="*see FAQ"
                        />
                        <ComparisonCell label="Interest Earned" tone="reeve" value="₹0" />
                        <ComparisonCell
                          label="Net Cost"
                          tone="reeve"
                          emphasize
                          value={
                            <AnimatedNumber
                              value={breakdown.reeveNetCost}
                              formatter={formatINR}
                              animate={hasAnimatedResults}
                              className="font-bold"
                            />
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                Assumptions used: 11-month tenure cycle, 10% per annum imputed interest on
                traditional security deposit, traditional listing fee of {formatINR(LISTING_FEE)},
                and turnover expense of 0.5× monthly rent.
              </div>
            </div>
          </section>
        ) : null}


        {breakdown ? (
          <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8 lg:pb-20">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:p-8">
              <p className="text-base leading-7 text-slate-700 sm:text-lg">
                You save{' '}
                <span className="font-semibold text-emerald-700">{formatINR(breakdown.netSavings)}</span>{' '}
                in direct costs. But that's not the whole story.
              </p>

              <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-4">
                <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-3 text-center sm:p-4">
                  <p className="text-2xl font-bold text-emerald-700 sm:text-3xl">
                    <AnimatedNumber
                      value={breakdown.timeSavedHours}
                      formatter={(value: number): string => `${Math.round(value)}`}
                      animate={hasAnimatedResults}
                    />
                  </p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 sm:text-sm">
                    Hours
                  </p>
                  <p className="mt-2 text-xs leading-5 text-slate-600 sm:text-sm">
                    saved managing your property
                  </p>
                </div>

                <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-3 text-center sm:p-4">
                  <p className="text-2xl font-bold text-emerald-700 sm:text-3xl">
                    <AnimatedNumber
                      value={VISITS_SAVED}
                      formatter={(value: number): string => `${Math.round(value)}`}
                      animate={hasAnimatedResults}
                    />
                  </p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 sm:text-sm">
                    Visits
                  </p>
                  <p className="mt-2 text-xs leading-5 text-slate-600 sm:text-sm">
                    saved showing your property
                  </p>
                </div>

                <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-3 text-center sm:p-4">
                  <p className="text-2xl font-bold text-emerald-700 sm:text-3xl">
                    <AnimatedNumber
                      value={CALLS_SAVED}
                      formatter={(value: number): string => `${Math.round(value)}`}
                      animate={hasAnimatedResults}
                    />
                  </p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 sm:text-sm">
                    Calls
                  </p>
                  <p className="mt-2 text-xs leading-5 text-slate-600 sm:text-sm">
                    to brokers, tenants, PMS
                  </p>
                </div>
              </div>

              <div className="mt-8 max-w-3xl">
                <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                  The numbers don't show everything.
                </h2>
                <p className="mt-4 text-base leading-7 text-slate-600 sm:text-lg">
                  No chasing rent. No coordinating repairs. No negotiating with brokers every
                  turnover. Just a payout in your account — every month, on time.
                </p>
              </div>

              <div className="mt-8 max-w-3xl">
                <a
                  href="/owner"
                  className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-900 px-5 py-4 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  List Your Property With Us →
                </a>
                <p className="mt-3 text-center text-sm text-slate-500">
                  Free listing · Zero commission · Fully managed
                </p>
              </div>
            </div>
          </section>

      
        ) : null}
      </main>
    </div>
  );
}
