import { useEffect, useState } from "react";
import { UserRound, ReceiptText, WalletCards, ShieldCheck, Check, X, CircleHelp, ClipboardCheck, UserCheck, Landmark, FileCheck2, BookOpenCheck, CalendarDays, House, Scale, ChevronDown } from "lucide-react";
import Layout from "@/components/Layout";
import PropertyEnquiryForm, { type RentTdsCheckContext, getRentTdsReview } from "@/components/property-services/PropertyEnquiryForm";

const SERIF = "'Instrument Serif', Georgia, serif";
const SANS = "'DM Sans', system-ui, sans-serif";

const BAND1_STYLE = `
  @keyframes nri-tds-dot-1 {
    0%   { opacity: 0; left: 0; }
    5%   { opacity: 1; left: 0; }
    45%  { opacity: 1; left: calc(100% - 7px); }
    50%  { opacity: 0; left: calc(100% - 7px); }
    100% { opacity: 0; left: calc(100% - 7px); }
  }

  @keyframes nri-tds-dot-2 {
    0%,
    50%  { opacity: 0; left: 0; }
    55%  { opacity: 1; left: 0; }
    95%  { opacity: 1; left: calc(100% - 7px); }
    100% { opacity: 0; left: calc(100% - 7px); }
  }

  @keyframes nri-tds-conn-pulse {
    0%, 100% { opacity: 0.75; }
    50%       { opacity: 1; }
  }

  @media (prefers-reduced-motion: no-preference) {
    .nri-tds-dot-1 { animation: nri-tds-dot-1 6s ease-in-out infinite; }
    .nri-tds-dot-2 { animation: nri-tds-dot-2 6s ease-in-out infinite; }
    .nri-tds-conn-line { animation: nri-tds-conn-pulse 6s ease-in-out infinite; }
  }

  @media (prefers-reduced-motion: reduce) {
    .nri-tds-dot-1, .nri-tds-dot-2 { display: none; }
    .nri-tds-conn-line { opacity: 0.85; }
  }

  @media (hover: hover) and (prefers-reduced-motion: no-preference) {
    .nri-tds-node {
      transition: box-shadow 160ms ease, transform 160ms ease;
      cursor: default;
    }
    .nri-tds-node:hover {
      transform: translateY(-1px);
      box-shadow:
        inset 0 1px 0 rgba(255,255,255,.24),
        0 14px 34px rgba(0,0,0,.38),
        0 0 0 1px rgba(255,255,255,.10) !important;
    }
  }
`;

// ── Band 2 types ──────────────────────────────────────────────────────────────

type RentTdsAnswer = "yes" | "no" | "unsure";
type RentTdsSituationKey =
  | "propertyRented"
  | "tenantDeducting"
  | "deductionRecords"
  | "caHandling"
  | "overOneYear";
type RentTdsAnswers = Partial<Record<RentTdsSituationKey, RentTdsAnswer>>;

const TDS_QUESTIONS: {
  key: RentTdsSituationKey;
  num: string;
  question: string;
  helper?: string;
}[] = [
  { key: "propertyRented",   num: "01", question: "Is the property already rented?",
    helper: "Choose Yes if rent is being paid now or you're reviewing an earlier rental period." },
  { key: "tenantDeducting",  num: "02", question: "Is tax being deducted from the rent before it is paid to you?" },
  { key: "deductionRecords", num: "03", question: "Are you receiving the deduction certificates and supporting records?",
    helper: "For example, records showing what was deducted and deposited." },
  { key: "caHandling",       num: "04", question: "Do you already have a CA or tax professional handling the rental-tax work?" },
  { key: "overOneYear",      num: "05", question: "Has this rental arrangement been running for more than one year?" },
];

function toRentTdsCheckContext(answers: RentTdsAnswers): RentTdsCheckContext | null {
  const keys: RentTdsSituationKey[] = [
    "propertyRented", "tenantDeducting", "deductionRecords", "caHandling", "overOneYear",
  ];
  if (!keys.every(k => answers[k] !== undefined)) return null;
  return answers as unknown as RentTdsCheckContext;
}

// ── REVEAL_STYLE (Band 2 animations) ─────────────────────────────────────────

const REVEAL_STYLE = `
  @keyframes nriTdsReveal {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .nri-tds-result-reveal {
    animation: nriTdsReveal 220ms ease-out both;
  }

  @keyframes nriTdsConsoleIn {
    from { opacity: 0; transform: translateY(4px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .nri-tds-console-in {
    animation: nriTdsConsoleIn 180ms ease-out both;
  }

  @media (prefers-reduced-motion: reduce) {
    .nri-tds-result-reveal,
    .nri-tds-console-in { animation: none; }
  }

  @media (hover: hover) {
    .nri-tds-answer-unselected:hover {
      background: #F1F5F9 !important;
      border-color: #B8C4D4 !important;
    }
  }
`;

// ── BAND4_STYLE (Lower Deduction Certificate animations) ──────────────────────

const BAND4_STYLE = `
  @keyframes nri-band4-glow-h {
    0%   { opacity: 0; transform: translateX(-100%); }
    20%  { opacity: .55; }
    80%  { opacity: .55; }
    100% { opacity: 0; transform: translateX(300%); }
  }
  @keyframes nri-band4-glow-v {
    0%   { opacity: 0; transform: translateY(-100%); }
    20%  { opacity: .55; }
    80%  { opacity: .55; }
    100% { opacity: 0; transform: translateY(300%); }
  }
  .nri-band4-glow-h { opacity: 0; animation: nri-band4-glow-h 5.5s ease-in-out infinite; }
  .nri-band4-glow-v { opacity: 0; animation: nri-band4-glow-v 5.5s ease-in-out infinite; }
  @media (prefers-reduced-motion: reduce) {
    .nri-band4-glow-h, .nri-band4-glow-v { animation: none; opacity: 0; }
  }
`;

// ── BAND6_STYLE (Enquiry next-property decision cards) ────────────────────────

const BAND6_STYLE = `
  .nri-band6-decision {
    transition: transform 160ms ease-out, filter 160ms ease-out, border-color 160ms ease-out;
  }
  .nri-band6-arrow {
    transition: transform 160ms ease-out;
  }
  @media (hover: hover) and (pointer: fine) {
    .nri-band6-decision:hover {
      transform: translateY(-1px);
      filter: brightness(1.06);
    }
    .nri-band6-link:hover .nri-band6-arrow {
      transform: translateX(2px);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .nri-band6-decision,
    .nri-band6-arrow {
      transition: none;
    }
    .nri-band6-decision:hover,
    .nri-band6-link:hover .nri-band6-arrow {
      transform: none;
    }
  }
`;

export default function NriRentTdsIndia() {
  const [tdsAnswers, setTdsAnswers] = useState<RentTdsAnswers>({});
  return (
    <Layout>
      <NriRentTdsHeroSection />
      <NriRentTdsSituationCheck
        answers={tdsAnswers}
        onAnswer={(key, value) => setTdsAnswers(prev => ({ ...prev, [key]: value }))}
      />
      <NriRentTdsTenantComplianceSection />
      <NriRentTdsLowerDeductionSection />
      <NriRentTdsCoordinationSection />
      <EnquirySection
        tdsAnswers={tdsAnswers}
        onRemoveTdsCheck={() => setTdsAnswers({})}
      />
      <NriRentTdsStickyCTA />
    </Layout>
  );
}

// ── Band 1: Hero ──────────────────────────────────────────────────────────────

function NriRentTdsHeroSection() {
  return (
    <>
      <style>{BAND1_STYLE}</style>
      <section
        id="tds-on-rent-paid-to-nri"
        aria-labelledby="nri-rent-tds-title"
        className="relative overflow-hidden"
        style={{
          background: `
            radial-gradient(38% 42% at 74% 48%, rgba(34,211,238,.10), transparent 70%),
            radial-gradient(26% 28% at 74% 52%, rgba(249,115,22,.07), transparent 60%),
            radial-gradient(34% 36% at 90% 8%,  rgba(124,58,237,.12), transparent 70%),
            linear-gradient(125deg, #07101F 0%, #0A1430 45%, #15173D 100%)
          `,
        }}
      >
        {/* Desktop dot-grid texture — right half only */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 hidden xl:block"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.055) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
            maskImage: "linear-gradient(to left, rgba(0,0,0,0.7) 0%, transparent 52%)",
            WebkitMaskImage: "linear-gradient(to left, rgba(0,0,0,0.7) 0%, transparent 52%)",
            opacity: 0.85,
          }}
        />

        <div className="relative mx-auto max-w-[1320px] px-5 sm:px-8 lg:px-12">
          <div className="xl:grid xl:grid-cols-[58fr_42fr] xl:gap-10 xl:items-stretch">

            {/* ── LEFT COLUMN ── */}
            <div className="pt-12 sm:pt-14 lg:pt-[80px] pb-12 sm:pb-16 xl:pb-[72px]">

              {/* Eyebrow */}
              <p
                className="uppercase"
                style={{ fontFamily: SANS, fontSize: 13, fontWeight: 700, letterSpacing: "0.11em", color: "#67E8F9" }}
              >
                NRI RENT &amp; TDS · INDIA
              </p>

              {/* H1 */}
              <h1
                id="nri-rent-tds-title"
                className="mt-4 text-[clamp(38px,10vw,44px)] lg:text-[clamp(48px,4.2vw,66px)] text-[#F8FAFC]"
                style={{ fontFamily: SERIF, fontWeight: 400, lineHeight: 1.02, letterSpacing: "-0.018em" }}
              >
                NRI Rent &amp; TDS in India
              </h1>

              {/* Positioning statement */}
              <p
                className="mt-4 text-[19px] sm:text-[clamp(19px,1.8vw,26px)] text-[#F8FAFC] max-w-[560px]"
                style={{ fontFamily: SANS, fontWeight: 600, lineHeight: 1.23 }}
              >
                Renting out property in India while living abroad? Make sure the rent, withholding and records line up properly.
              </p>

              {/* Supporting copy */}
              <p
                className="mt-4 text-[15.5px] lg:text-[16px] text-[#D7E2F2] max-w-[520px]"
                style={{ fontFamily: SANS, lineHeight: 1.57 }}
              >
                Reeve coordinates the tenant, CA, records, lower-deduction applications, annual reconciliation and related rental-tax work for NRI property owners across India. Regulated tax work is performed by the appropriate professional.
              </p>

              {/* First-rupee slab */}
              <div className="relative mt-[28px] max-w-[480px]">
                {/* Depth underlay */}
                <div
                  className="absolute inset-0 rounded-[17px] translate-x-[3px] translate-y-[4px]"
                  style={{ background: "rgba(249,115,22,.16)" }}
                  aria-hidden="true"
                />
                {/* Main slab */}
                <div
                  className="relative rounded-[16px] border px-[17px] py-[14px]"
                  style={{
                    background: "linear-gradient(135deg, #FFF8ED 0%, #FFF3E0 100%)",
                    borderColor: "rgba(249,115,22,.23)",
                    boxShadow: "0 4px 14px rgba(249,115,22,.10)",
                  }}
                >
                  {/* ₹1 → marker + label row */}
                  <div className="flex items-center gap-[10px] mb-[8px]">
                    <span
                      className="inline-flex h-7 min-w-[44px] px-2 items-center justify-center rounded-full text-[13px] font-[700]"
                      style={{
                        background: "rgba(234,88,12,.10)",
                        color: "#EA580C",
                        border: "1px solid rgba(234,88,12,.25)",
                        fontFamily: SANS,
                      }}
                      aria-hidden="true"
                    >
                      ₹1 →
                    </span>
                    <span
                      className="uppercase"
                      style={{ fontFamily: SANS, fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "#B45309" }}
                    >
                      NO RENT THRESHOLD
                    </span>
                  </div>
                  {/* Main statement — Instrument Serif */}
                  <p style={{ fontFamily: SERIF, fontSize: 24, lineHeight: 1.14, color: "#111827" }}>
                    For an NRI landlord, the tenant&#8217;s withholding obligation applies from the first rupee of rent.
                  </p>
                  {/* Support line */}
                  <p
                    className="mt-[8px]"
                    style={{ fontFamily: SANS, fontSize: 14, color: "#5B6472", lineHeight: 1.45 }}
                  >
                    The resident-landlord threshold does not carry across.
                  </p>
                </div>
              </div>

              {/* Mobile money flow — compact horizontal, xl:hidden */}
              <div className="mt-8 xl:hidden" aria-label="Money flow: Tenant to NRI Owner via withholding">
                <div className="w-full max-w-[620px] flex items-stretch gap-0">

                  {/* Node 1: Tenant */}
                  <div
                    className="flex flex-col items-center gap-[6px] rounded-[12px] px-2 py-3 flex-1 min-w-0"
                    style={{
                      background: "rgba(255,255,255,.06)",
                      border: "1px solid rgba(255,255,255,.12)",
                      boxShadow: "inset 0 1px 0 rgba(255,255,255,.13)",
                    }}
                  >
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: "rgba(34,211,238,.12)", border: "1px solid rgba(34,211,238,.20)" }}
                    >
                      <UserRound size={13} color="#22D3EE" />
                    </div>
                    <p
                      className="uppercase text-center leading-none"
                      style={{ fontFamily: SANS, fontSize: 10, fontWeight: 700, letterSpacing: "0.07em", color: "#22D3EE" }}
                    >
                      TENANT
                    </p>
                    <p
                      className="text-center break-words"
                      style={{ fontFamily: SANS, fontSize: 11.5, color: "#B8CCDF", lineHeight: 1.3 }}
                    >
                      Rent due
                    </p>
                  </div>

                  {/* Connector 1→2 */}
                  <div
                    className="relative flex-shrink-0 flex items-center"
                    style={{ width: 16 }}
                    aria-hidden="true"
                  >
                    <div
                      className="w-full"
                      style={{ height: 1.5, background: "linear-gradient(to right, #22D3EE, rgba(249,115,22,.75))" }}
                    />
                    <div
                      className="absolute right-0 top-1/2 -translate-y-1/2 w-0 h-0"
                      style={{
                        borderTop: "3px solid transparent",
                        borderBottom: "3px solid transparent",
                        borderLeft: "5px solid rgba(249,115,22,.8)",
                      }}
                    />
                  </div>

                  {/* Node 2: TDS Withheld */}
                  <div
                    className="flex flex-col items-center gap-[6px] rounded-[12px] px-2 py-3 flex-1 min-w-0"
                    style={{
                      background: "rgba(255,255,255,.06)",
                      border: "1px solid rgba(255,255,255,.12)",
                      boxShadow: "inset 0 1px 0 rgba(255,255,255,.13)",
                    }}
                  >
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: "rgba(249,115,22,.12)", border: "1px solid rgba(249,115,22,.20)" }}
                    >
                      <ReceiptText size={13} color="#F97316" />
                    </div>
                    <p
                      className="uppercase text-center leading-none"
                      style={{ fontFamily: SANS, fontSize: 10, fontWeight: 700, letterSpacing: "0.07em", color: "#F97316" }}
                    >
                      TDS WITHHELD
                    </p>
                    <p
                      className="text-center break-words"
                      style={{ fontFamily: SANS, fontSize: 11.5, color: "#B8CCDF", lineHeight: 1.3 }}
                    >
                      Before payment
                    </p>
                  </div>

                  {/* Connector 2→3 */}
                  <div
                    className="relative flex-shrink-0 flex items-center"
                    style={{ width: 16 }}
                    aria-hidden="true"
                  >
                    <div
                      className="w-full"
                      style={{ height: 1.5, background: "linear-gradient(to right, rgba(249,115,22,.75), #14B8A6)" }}
                    />
                    <div
                      className="absolute right-0 top-1/2 -translate-y-1/2 w-0 h-0"
                      style={{
                        borderTop: "3px solid transparent",
                        borderBottom: "3px solid transparent",
                        borderLeft: "5px solid rgba(20,184,166,.9)",
                      }}
                    />
                  </div>

                  {/* Node 3: NRI Owner */}
                  <div
                    className="flex flex-col items-center gap-[6px] rounded-[12px] px-2 py-3 flex-1 min-w-0"
                    style={{
                      background: "rgba(255,255,255,.06)",
                      border: "1px solid rgba(255,255,255,.12)",
                      boxShadow: "inset 0 1px 0 rgba(255,255,255,.13)",
                    }}
                  >
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: "rgba(20,184,166,.12)", border: "1px solid rgba(20,184,166,.20)" }}
                    >
                      <WalletCards size={13} color="#14B8A6" />
                    </div>
                    <p
                      className="uppercase text-center leading-none"
                      style={{ fontFamily: SANS, fontSize: 10, fontWeight: 700, letterSpacing: "0.07em", color: "#14B8A6" }}
                    >
                      OWNER
                    </p>
                    <p
                      className="text-center break-words"
                      style={{ fontFamily: SANS, fontSize: 11.5, color: "#B8CCDF", lineHeight: 1.3 }}
                    >
                      Balance received
                    </p>
                  </div>

                </div>

                {/* Mobile Reeve caption + reassurance */}
                <p className="mt-3 text-[12.5px] text-[#7BB3F0]" style={{ fontFamily: SANS }}>
                  Reeve coordinates around this
                </p>
                <p
                  className="mt-[5px] flex items-start gap-[7px] text-[13.5px] text-[#D4E4F5]"
                  style={{ fontFamily: SANS, fontWeight: 540, lineHeight: 1.45 }}
                >
                  <ShieldCheck size={14} className="mt-[2px] flex-shrink-0" color="#7BB3F0" aria-hidden="true" />
                  Reeve never receives, holds or routes the rent.
                </p>
              </div>

              {/* CTAs */}
              <div className="mt-8 xl:mt-10 flex flex-col sm:flex-row gap-3">
                <a
                  href="#rent-tds-check"
                  className="flex items-center justify-center rounded-[12px] px-6 text-[15px] font-[600] text-white
                             bg-[#2563EB] hover:bg-[#1D4ED8] active:bg-[#1E40AF] transition-colors duration-[160ms]
                             w-full sm:w-auto
                             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#67E8F9] focus-visible:ring-offset-2 focus-visible:ring-offset-[#07101F]"
                  style={{ height: 52, fontFamily: SANS, boxShadow: "0 4px 16px rgba(37,99,235,.35)" }}
                >
                  Check my rent &amp; TDS situation
                </a>
                <a
                  href="#enquiry"
                  className="flex items-center justify-center rounded-[12px] px-6 text-[15px] font-[600] transition-colors duration-[160ms]
                             w-full sm:w-auto
                             hover:bg-[rgba(147,197,253,.07)]
                             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#67E8F9] focus-visible:ring-offset-2 focus-visible:ring-offset-[#07101F]"
                  style={{ height: 52, fontFamily: SANS, color: "#BFDBFE", border: "1px solid rgba(147,197,253,.28)" }}
                >
                  Tell us what&#8217;s happening
                </a>
              </div>

              {/* Lower-deduction teaser */}
              <p
                className="mt-5 text-[13.5px] text-[#6B83A0] max-w-[440px]"
                style={{ fontFamily: SANS, lineHeight: 1.5 }}
              >
                Lower deduction may be worth assessing where withholding materially exceeds eventual liability.
              </p>

            </div>
            {/* ── END LEFT COLUMN ── */}

            {/* ── RIGHT COLUMN: desktop money flow ── */}
            <div className="hidden xl:flex xl:self-stretch xl:flex-col xl:justify-center xl:py-0">

              {/* Five-column deterministic grid: [node | connector | node | connector | node] */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "136px 1fr 136px 1fr 136px",
                  alignItems: "center",
                }}
              >

                {/* Node 1: Tenant */}
                <div
                  className="nri-tds-node relative flex flex-col items-center gap-[10px] rounded-[20px] px-4 py-5 w-[136px] self-stretch min-h-[120px]"
                  style={{
                    background: "rgba(255,255,255,.06)",
                    border: "1px solid rgba(255,255,255,.14)",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,.18), 0 10px 28px rgba(0,0,0,.30)",
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(34,211,238,.12)", border: "1px solid rgba(34,211,238,.22)" }}
                  >
                    <UserRound size={18} color="#22D3EE" />
                  </div>
                  <p
                    className="uppercase text-center"
                    style={{ fontFamily: SANS, fontSize: 11, fontWeight: 700, letterSpacing: "0.09em", color: "#22D3EE" }}
                  >
                    TENANT
                  </p>
                  <p
                    className="text-center"
                    style={{ fontFamily: SANS, fontSize: 13, color: "#C8D8EF", lineHeight: 1.35 }}
                  >
                    Rent due
                  </p>
                </div>

                {/* Connector 1→2 */}
                <div className="relative" style={{ height: 2, alignSelf: "center" }}>
                  <div
                    className="nri-tds-conn-line absolute inset-0 rounded-full"
                    style={{ background: "linear-gradient(to right, #22D3EE, rgba(249,115,22,.65))" }}
                    aria-hidden="true"
                  />
                  <div
                    className="absolute right-[-1px] top-1/2 -translate-y-1/2 w-0 h-0"
                    aria-hidden="true"
                    style={{
                      borderTop: "4px solid transparent",
                      borderBottom: "4px solid transparent",
                      borderLeft: "7px solid rgba(249,115,22,.8)",
                    }}
                  />
                  {/* Traveling dot — stationary wrapper prevents transform conflict */}
                  <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
                    <div
                      className="nri-tds-dot-1 absolute top-1/2 -translate-y-1/2"
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: "50%",
                        left: 0,
                        background: "#22D3EE",
                        boxShadow: "0 0 6px 2px rgba(34,211,238,.45)",
                      }}
                    />
                  </div>
                </div>

                {/* Node 2: Withholding */}
                <div
                  className="nri-tds-node relative flex flex-col items-center gap-[10px] rounded-[20px] px-4 py-5 w-[136px] self-stretch min-h-[120px]"
                  style={{
                    background: "rgba(255,255,255,.06)",
                    border: "1px solid rgba(255,255,255,.14)",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,.18), 0 10px 28px rgba(0,0,0,.30)",
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(249,115,22,.12)", border: "1px solid rgba(249,115,22,.22)" }}
                  >
                    <ReceiptText size={18} color="#F97316" />
                  </div>
                  <p
                    className="uppercase text-center"
                    style={{ fontFamily: SANS, fontSize: 11, fontWeight: 700, letterSpacing: "0.09em", color: "#F97316" }}
                  >
                    WITHHOLDING
                  </p>
                  <p
                    className="text-center"
                    style={{ fontFamily: SANS, fontSize: 13, color: "#C8D8EF", lineHeight: 1.35 }}
                  >
                    Applicable tax deducted before payment
                  </p>
                </div>

                {/* Connector 2→3 */}
                <div className="relative" style={{ height: 2, alignSelf: "center" }}>
                  <div
                    className="nri-tds-conn-line absolute inset-0 rounded-full"
                    style={{ background: "linear-gradient(to right, rgba(249,115,22,.65), #14B8A6)" }}
                    aria-hidden="true"
                  />
                  <div
                    className="absolute right-[-1px] top-1/2 -translate-y-1/2 w-0 h-0"
                    aria-hidden="true"
                    style={{
                      borderTop: "4px solid transparent",
                      borderBottom: "4px solid transparent",
                      borderLeft: "7px solid rgba(20,184,166,.9)",
                    }}
                  />
                  <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
                    <div
                      className="nri-tds-dot-2 absolute top-1/2 -translate-y-1/2"
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: "50%",
                        left: 0,
                        background: "#14B8A6",
                        boxShadow: "0 0 6px 2px rgba(20,184,166,.45)",
                      }}
                    />
                  </div>
                </div>

                {/* Node 3: NRI Owner */}
                <div
                  className="nri-tds-node relative flex flex-col items-center gap-[10px] rounded-[20px] px-4 py-5 w-[136px] self-stretch min-h-[120px]"
                  style={{
                    background: "rgba(255,255,255,.06)",
                    border: "1px solid rgba(255,255,255,.14)",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,.18), 0 10px 28px rgba(0,0,0,.30)",
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(20,184,166,.12)", border: "1px solid rgba(20,184,166,.22)" }}
                  >
                    <WalletCards size={18} color="#14B8A6" />
                  </div>
                  <p
                    className="uppercase text-center"
                    style={{ fontFamily: SANS, fontSize: 11, fontWeight: 700, letterSpacing: "0.09em", color: "#14B8A6" }}
                  >
                    NRI OWNER
                  </p>
                  <p
                    className="text-center"
                    style={{ fontFamily: SANS, fontSize: 13, color: "#C8D8EF", lineHeight: 1.35 }}
                  >
                    Receives the balance directly
                  </p>
                </div>

                {/* Reeve coordination rail — spans all 5 columns */}
                <div className="relative mt-5" style={{ gridColumn: "1 / -1" }}>
                  <div style={{ height: 0, borderTop: "1.5px dashed rgba(96,165,250,.28)" }} />
                  {/* Dots aligned to node centers via the same 5-column grid */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "136px 1fr 136px 1fr 136px",
                      position: "absolute",
                      top: -2,
                      left: 0,
                      right: 0,
                    }}
                    aria-hidden="true"
                  >
                    <div className="flex justify-center">
                      <div className="w-[5px] h-[5px] rounded-full" style={{ background: "rgba(96,165,250,.55)" }} />
                    </div>
                    <div />
                    <div className="flex justify-center">
                      <div className="w-[5px] h-[5px] rounded-full" style={{ background: "rgba(96,165,250,.55)" }} />
                    </div>
                    <div />
                    <div className="flex justify-center">
                      <div className="w-[5px] h-[5px] rounded-full" style={{ background: "rgba(96,165,250,.55)" }} />
                    </div>
                  </div>
                </div>

                {/* Rail label */}
                <p
                  className="mt-[10px] text-center text-[12.5px]"
                  style={{ gridColumn: "1 / -1", fontFamily: SANS, color: "#BFDBFE", letterSpacing: "0.04em" }}
                >
                  Reeve · CA · Records · Follow-up
                </p>

              </div>
              {/* End five-column grid */}

              {/* Reassurance — outside the grid so it spans full diagram width */}
              <div className="mt-5 flex items-start gap-[8px]">
                <ShieldCheck size={15} className="mt-[2px] flex-shrink-0" color="#7BB3F0" aria-hidden="true" />
                <p style={{ fontFamily: SANS, fontSize: 14, fontWeight: 560, color: "#E2ECF9", lineHeight: 1.48 }}>
                  Rent goes directly from your tenant to you. Reeve never receives, holds or routes it.
                </p>
              </div>

            </div>
            {/* ── END RIGHT COLUMN ── */}

          </div>
        </div>
      </section>
    </>
  );
}

// ── Band 2: Situation Check ───────────────────────────────────────────────────

const REVIEW_CHIP_STYLE = {
  review:  { bg: "#FFF7ED", color: "#B45309", border: "#FED7AA" },
  clarify: { bg: "#F5F3FF", color: "#6D28D9", border: "#DDD6FE" },
} as const;

function NriRentTdsSituationCheck({
  answers,
  onAnswer,
}: {
  answers: RentTdsAnswers;
  onAnswer: (key: RentTdsSituationKey, value: RentTdsAnswer) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  const answeredCount  = TDS_QUESTIONS.filter(q => answers[q.key] !== undefined).length;
  const allComplete    = answeredCount === 5;
  const rentTdsContext = allComplete ? toRentTdsCheckContext(answers) : null;
  const tdsResult      = rentTdsContext ? getRentTdsReview(rentTdsContext) : null;
  const resultKey      = TDS_QUESTIONS.map(q => answers[q.key] ?? "").join("|");

  return (
    <section
      id="rent-tds-check"
      aria-label="Rent &amp; TDS Situation Check"
      style={{
        background: `
          radial-gradient(44% 36% at 18% 58%, rgba(34,211,238,.07), transparent 70%),
          radial-gradient(32% 28% at 82% 32%, rgba(124,58,237,.07), transparent 70%),
          linear-gradient(180deg, #F4F7FF 0%, #F8F9FF 48%, #FCFCFF 100%)
        `,
      }}
    >
      <style>{REVEAL_STYLE}</style>

      <div
        className={`max-w-[1320px] mx-auto px-5 sm:px-8 lg:px-12 ${
          isExpanded ? "py-[52px]" : "pt-[48px] pb-[16px]"
        } sm:py-[88px]`}
      >
        {/* ── Phone-only teaser (collapsed) ── */}
        {!isExpanded && (
          <div className="sm:hidden py-8">
            <div className="relative w-full">
              <div
                className="absolute inset-0 rounded-[18px] translate-x-[3px] translate-y-[4px]"
                style={{ background: "linear-gradient(135deg, rgba(37,99,235,.13) 0%, rgba(109,40,217,.10) 100%)" }}
                aria-hidden="true"
              />
              <div
                className="relative rounded-[18px] bg-white px-6 py-8 text-center"
                style={{
                  border: "1px solid rgba(37,99,235,.11)",
                  boxShadow: "0 16px 48px rgba(30,41,59,.09), 0 4px 14px rgba(37,99,235,.05)",
                }}
              >
                <p
                  className="uppercase text-[12px] font-[700] tracking-[0.10em] mb-3"
                  style={{ fontFamily: SANS, color: "#4F46E5" }}
                >
                  30-SECOND RENT &amp; TDS CHECK
                </p>
                <h2
                  className="text-[32px] text-[#111827] mb-3"
                  style={{ fontFamily: SERIF, fontWeight: 400, lineHeight: 1.1 }}
                >
                  Is anything in your rent setup worth checking?
                </h2>
                <p
                  className="text-[15px] text-[#4B5563] mb-6"
                  style={{ fontFamily: SANS, lineHeight: 1.5 }}
                >
                  Five quick questions. No login or contact details required.
                </p>
                <button
                  onClick={() => setIsExpanded(true)}
                  className="w-full rounded-[12px] font-[600] text-white bg-[#2563EB] hover:bg-[#1D4ED8] active:bg-[#1E40AF] transition-colors duration-[160ms] min-h-[48px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2"
                  style={{ fontFamily: SANS, fontSize: 15 }}
                >
                  Start the check
                </button>
                <p className="mt-3 text-[13px] text-[#9CA3AF]" style={{ fontFamily: SANS }}>
                  Takes about 30 seconds
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Full console ── */}
        <div className={`${isExpanded ? "block nri-tds-console-in" : "hidden"} sm:block`}>

          {/* Desktop heading — sm+ only */}
          <div className="hidden sm:block text-center mb-[32px]">
            <p
              className="uppercase text-[12px] font-[700] tracking-[0.10em] mb-3"
              style={{ fontFamily: SANS, color: "#4F46E5" }}
            >
              30-SECOND RENT &amp; TDS CHECK
            </p>
            <h2
              id="rent-tds-check-title"
              className="text-[clamp(40px,3.5vw,50px)] mx-auto max-w-[720px]"
              style={{ fontFamily: SERIF, fontWeight: 400, lineHeight: 1.03, color: "#0F172A" }}
            >
              Is anything in your rent setup worth checking?
            </h2>
            <p
              className="mt-4 text-[16px] mx-auto max-w-[620px]"
              style={{ fontFamily: SANS, lineHeight: 1.55, color: "#526173" }}
            >
              Answer five quick questions. No login or contact details required.{" "}
              &#8220;Not sure&#8221; is completely fine.
            </p>
          </div>

          {/* Console outer wrapper */}
          <div className="max-w-[1040px] mx-auto relative">
            {/* Depth underlay */}
            <div
              className="absolute inset-0 rounded-[26px] translate-x-[5px] translate-y-[6px]"
              style={{ background: "linear-gradient(135deg, rgba(37,99,235,.13) 0%, rgba(109,40,217,.10) 100%)" }}
              aria-hidden="true"
            />

            {/* White console plate */}
            <div
              className="relative rounded-[20px] sm:rounded-[24px] bg-white px-4 py-8 sm:px-8 sm:py-10 lg:px-12 lg:py-12"
              style={{
                border: "1px solid rgba(37,99,235,.11)",
                boxShadow: "0 28px 70px rgba(30,41,59,.10), 0 8px 24px rgba(37,99,235,.06)",
              }}
            >
              {/* Console header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-[10px]">
                  <div
                    className="w-8 h-8 rounded-[10px] flex items-center justify-center flex-shrink-0"
                    style={{
                      background: "linear-gradient(135deg, #EEF2FF 0%, #F5F3FF 100%)",
                      border: "1px solid rgba(99,102,241,.18)",
                      boxShadow: "0 2px 6px rgba(99,102,241,.10)",
                    }}
                  >
                    <ClipboardCheck size={16} color="#4F46E5" aria-hidden="true" />
                  </div>
                  <span style={{ fontFamily: SANS, fontSize: 14, fontWeight: 650, color: "#1E293B" }}>
                    Rent &amp; TDS Check
                  </span>
                </div>
                <span style={{ fontFamily: SANS, fontSize: 13, color: "#6B7280" }}>
                  {answeredCount} of 5 answered
                </span>
              </div>

              {/* Progress rail */}
              <div className="flex gap-1 mb-6 mt-1" aria-hidden="true">
                {TDS_QUESTIONS.map(q => {
                  const val = answers[q.key];
                  const bg =
                    val === "yes"    ? "#14B8A6" :
                    val === "no"     ? "#F97316" :
                    val === "unsure" ? "#7C3AED" : "#E7ECF4";
                  return (
                    <div
                      key={q.key}
                      className="flex-1 rounded-full"
                      style={{ height: 4, background: bg, transition: "background-color 170ms ease" }}
                    />
                  );
                })}
              </div>

              {/* Questions */}
              <div>
                {TDS_QUESTIONS.map((q, idx) => (
                  <div
                    key={q.key}
                    className={`py-4 sm:py-5 lg:grid lg:grid-cols-[42px_minmax(0,1fr)_minmax(260px,300px)] lg:gap-4 lg:items-start${
                      idx < TDS_QUESTIONS.length - 1 ? " border-b border-[#EEF0F4]" : ""
                    }`}
                  >
                    {/* Number (desktop only) */}
                    <span
                      className="hidden lg:block"
                      style={{ fontFamily: SANS, fontSize: 13, fontWeight: 700, color: "#9CA3AF" }}
                    >
                      {q.num}
                    </span>

                    {/* Question + helper */}
                    <div className="mb-3 lg:mb-0">
                      <p style={{ fontFamily: SANS, fontSize: 15, fontWeight: 600, color: "#1E293B", lineHeight: 1.4 }}>
                        {q.question}
                      </p>
                      {q.helper && (
                        <p className="mt-[4px]" style={{ fontFamily: SANS, fontSize: 13, color: "#6B7280", lineHeight: 1.5 }}>
                          {q.helper}
                        </p>
                      )}
                    </div>

                    {/* Answer buttons — 3-col horizontal on all viewports */}
                    <fieldset>
                      <legend className="sr-only">{q.question}</legend>
                      <div className="grid grid-cols-3 gap-2">
                        {(["yes", "no", "unsure"] as const).map(val => {
                          const isSelected = answers[q.key] === val;
                          const label = val === "yes" ? "Yes" : val === "no" ? "No" : "Not sure";
                          const Icon  = val === "yes" ? Check : val === "no" ? X : CircleHelp;

                          // Inline styles for selected state; CSS class handles unselected hover
                          const selectedStyles: Record<string, React.CSSProperties> = {
                            yes:    { background: "#ECFDF5", borderColor: "#14B8A6", color: "#0F766E" },
                            no:     { background: "#FFF3EC", borderColor: "#F97316", color: "#B93815" },
                            unsure: { background: "#F5F3FF", borderColor: "#8B5CF6", color: "#6D28D9" },
                          };

                          return (
                            <label
                              key={val}
                              className={[
                                "relative flex items-center justify-center gap-[5px]",
                                "min-h-[46px] px-1.5 sm:px-3 rounded-[10px] cursor-pointer",
                                "text-center border transition-colors duration-[160ms]",
                                "focus-within:ring-2 focus-within:ring-[#2563EB] focus-within:ring-offset-2",
                                isSelected
                                  ? ""
                                  : "nri-tds-answer-unselected bg-[#F8FAFC] border-[rgba(0,0,0,.10)] text-[#374151]",
                              ].join(" ")}
                              style={isSelected ? selectedStyles[val] : undefined}
                            >
                              <input
                                type="radio"
                                name={q.key}
                                value={val}
                                checked={isSelected}
                                onChange={() => onAnswer(q.key, val)}
                                className="sr-only"
                              />
                              {isSelected && <Icon size={13} aria-hidden="true" />}
                              <span style={{ fontFamily: SANS, fontSize: 13, fontWeight: 600 }}>
                                {label}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </fieldset>
                  </div>
                ))}
              </div>

              {/* Result dock — rendered only when all 5 answers are given */}
              {allComplete && tdsResult && (
                <div
                  role="status"
                  aria-live="polite"
                  className="mt-6 pt-6 border-t border-[#EEF0F4]"
                >
                  <div key={resultKey} className="nri-tds-result-reveal">
                    <div className="sm:flex sm:items-start sm:gap-8">
                      <div className="sm:flex-1">
                        <p style={{ fontFamily: SANS, fontSize: 17, fontWeight: 700, color: "#0F172A" }}>
                          {tdsResult.headline}
                        </p>
                        <p className="mt-2" style={{ fontFamily: SANS, fontSize: 13, color: "#6B7280", lineHeight: 1.5 }}>
                          {tdsResult.support}
                        </p>
                        {tdsResult.secondary && (
                          <p className="mt-2" style={{ fontFamily: SANS, fontSize: 13, color: "#6B7280", lineHeight: 1.5 }}>
                            {tdsResult.secondary}
                          </p>
                        )}
                        {tdsResult.items.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {tdsResult.items.map(item => {
                              const c = REVIEW_CHIP_STYLE[item.tone];
                              return (
                                <span
                                  key={item.key}
                                  className="inline-flex items-center px-3 py-1 rounded-full text-[12px] font-[600]"
                                  style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}` }}
                                >
                                  {item.label}
                                </span>
                              );
                            })}
                          </div>
                        )}
                        {tdsResult.professionalContext && (
                          <p className="mt-2" style={{ fontFamily: SANS, fontSize: 13, color: "#6B7280", lineHeight: 1.5 }}>
                            {tdsResult.professionalContext}
                          </p>
                        )}
                      </div>
                      <div className={`mt-4 sm:mt-0 sm:flex-shrink-0 flex flex-col items-start sm:items-end gap-2`}>
                        <a
                          href="#enquiry"
                          className="inline-flex items-center justify-center rounded-[12px] px-5 font-[600] text-white bg-[#2563EB] hover:bg-[#1D4ED8] active:bg-[#1E40AF] transition-colors duration-[160ms] min-h-[48px] w-full sm:w-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2"
                          style={{ fontFamily: SANS, fontSize: 14 }}
                        >
                          {tdsResult.mode === "review" ? "Discuss these with Reeve" : "Discuss the setup with Reeve"}
                        </a>
                        {(tdsResult.mode === "review" || tdsResult.mode === "clarify") && (
                          <p style={{ fontFamily: SANS, fontSize: 12, color: "#9CA3AF" }}>
                            Situation check only — not tax advice.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Band 3: Tenant Compliance ─────────────────────────────────────────────────

const TRANSIT_STATIONS = [
  {
    num: "01",
    taxonomy: "ESTABLISH",
    icon: UserCheck,
    heading: "Confirm that the landlord is non-resident",
    descriptor: "Payments to a non-resident follow a different withholding framework.",
    main: "#ECFEFF", border: "#A5F3FC", depth: "rgba(34,211,238,.18)", text: "#0E7490",
  },
  {
    num: "02",
    taxonomy: "DEDUCT",
    icon: ReceiptText,
    heading: "Determine the withholding and deduct before paying rent",
    descriptor: "Use professional advice where the applicable rate or treatment needs to be determined.",
    main: "#FFF7ED", border: "#FED7AA", depth: "rgba(249,115,22,.18)", text: "#C2410C",
  },
  {
    num: "03",
    taxonomy: "DEPOSIT & REPORT",
    icon: Landmark,
    heading: "Deposit the deduction and file the required quarterly statement",
    descriptor: "Report the deduction to the department for the relevant quarter.",
    main: "#EFF6FF", border: "#BFDBFE", depth: "rgba(37,99,235,.16)", text: "#1D4ED8",
  },
  {
    num: "04",
    taxonomy: "CERTIFY & RETAIN",
    icon: FileCheck2,
    heading: "Give the landlord the certificate and keep the supporting records",
    descriptor: "Those records support later tax-credit, return, refund and reconciliation work.",
    main: "#F0FDFA", border: "#99F6E4", depth: "rgba(20,184,166,.17)", text: "#0F766E",
  },
] as const;

const CLEANUP_STEPS = [
  { num: "01", label: "RECONSTRUCT", question: "What rent was credited or paid, and when?" },
  { num: "02", label: "VERIFY",      question: "What was actually deducted, deposited, reported or certified?" },
  { num: "03", label: "RESOLVE",     question: "Have the appropriate CA determine how each affected period should be handled." },
] as const;

function NriRentTdsTenantComplianceSection() {
  return (
    <section
      aria-labelledby="tenant-tds-heading"
      style={{
        background: `
          radial-gradient(circle at 7% 22%, rgba(34,211,238,.055), transparent 29%),
          radial-gradient(circle at 52% 38%, rgba(249,115,22,.045), transparent 30%),
          radial-gradient(circle at 92% 56%, rgba(20,184,166,.045), transparent 30%),
          linear-gradient(180deg,#FCFCFF 0%,#FFFDFC 10%,#FFFDFC 62%,#F9FAFF 100%)
        `,
      }}
    >
      <div className="max-w-[1140px] mx-auto px-5 sm:px-8 lg:px-12 pt-[52px] pb-[56px] lg:pt-[88px] lg:pb-[92px]">

        {/* ── A. Intro (centred) ── */}
        <div className="text-center">
          <p
            className="uppercase text-[12px] font-[700] tracking-[0.10em] mb-3"
            style={{ fontFamily: SANS, color: "#0E7490" }}
          >
            HOW THE RENT COMPLIANCE WORKS
          </p>
          <h2
            id="tenant-tds-heading"
            className="text-[32px] sm:text-[34px] mx-auto max-w-[700px]"
            style={{
              fontFamily: SERIF,
              fontWeight: 400,
              fontSize: undefined,
              lineHeight: 1.07,
              color: "#0F172A",
              letterSpacing: "-0.015em",
            }}
          >
            <span className="hidden lg:inline" style={{ fontSize: "clamp(40px,3.5vw,50px)", lineHeight: 1.03 }}>
              What does the tenant actually have to do?
            </span>
            <span className="lg:hidden">
              What does the tenant actually have to do?
            </span>
          </h2>
          <p
            className="mt-4 text-[15px] sm:text-[16px] mx-auto max-w-[660px]"
            style={{ fontFamily: SANS, lineHeight: 1.55, color: "#526173" }}
          >
            It starts with recognising that the landlord is non-resident. From there, the tenant
            has a withholding, reporting and record-keeping process to follow.
          </p>
        </div>

        {/* ── B. Four-step transit line ── */}
        <div className="mt-[26px] lg:mt-[36px] max-w-[1040px] mx-auto">
          <div className="relative">
            {/* Desktop gradient connector — sibling to <ol>, behind it */}
            <div
              aria-hidden="true"
              className="hidden lg:block absolute pointer-events-none"
              style={{
                top: 30,
                left: "12.5%",
                right: "12.5%",
                height: 2,
                background: "linear-gradient(90deg,#22D3EE 0%,#F97316 35%,#2563EB 68%,#14B8A6 100%)",
                opacity: 0.72,
                zIndex: 0,
              }}
            />
          <ol
            className="relative flex flex-col gap-6 lg:grid lg:grid-cols-4 lg:gap-0"
            aria-label="Tenant TDS process"
          >

            {TRANSIT_STATIONS.map((s, idx) => {
              const Icon = s.icon;
              return (
                <li
                  key={s.num}
                  className="relative grid grid-cols-[44px_minmax(0,1fr)] gap-3 lg:flex lg:flex-col lg:items-center lg:text-center"
                  style={{ zIndex: 1 }}
                >
                  {/* Phone vertical connector */}
                  {idx < TRANSIT_STATIONS.length - 1 && (
                    <div
                      aria-hidden="true"
                      className="lg:hidden absolute pointer-events-none"
                      style={{
                        left: 21,
                        top: 43,
                        bottom: -32,
                        width: 2,
                        background: s.depth,
                        zIndex: 0,
                      }}
                    />
                  )}

                  {/* Station circle — 2.5D */}
                  <div className="relative flex-shrink-0 w-[44px] h-[44px] lg:w-[60px] lg:h-[60px] lg:mb-4">
                    {/* Depth plate */}
                    <div
                      aria-hidden="true"
                      className="absolute inset-0 rounded-full pointer-events-none"
                      style={{
                        background: s.depth,
                        transform: "translate(2px,3px)",
                        zIndex: 0,
                      }}
                    />
                    {/* Main plate */}
                    <div
                      className="absolute inset-0 rounded-full flex flex-col items-center justify-center"
                      style={{
                        background: s.main,
                        border: `1.5px solid ${s.border}`,
                        zIndex: 1,
                      }}
                    >
                      <span
                        style={{
                          fontFamily: SERIF,
                          fontSize: 16,
                          fontWeight: 400,
                          color: s.text,
                          lineHeight: 1,
                        }}
                        className="lg:text-[23px]"
                      >
                        {s.num}
                      </span>
                      <Icon
                        size={11}
                        color={s.text}
                        aria-hidden="true"
                        className="lg:w-[14px] lg:h-[14px] mt-[1px]"
                      />
                    </div>
                  </div>

                  {/* Text content */}
                  <div>
                    <p
                      className="text-[11.5px] lg:text-[12px] font-[700] uppercase mb-1"
                      style={{ fontFamily: SANS, letterSpacing: "0.07em", color: s.text }}
                    >
                      {s.taxonomy}
                    </p>
                    <p
                      className="text-[14.5px] lg:text-[15.5px] mb-1"
                      style={{ fontFamily: SANS, fontWeight: 650, color: "#172033", lineHeight: 1.35 }}
                    >
                      {s.heading}
                    </p>
                    <p
                      className="text-[13px] lg:text-[13.5px]"
                      style={{ fontFamily: SANS, color: "#64748B", lineHeight: 1.47 }}
                    >
                      {s.descriptor}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
          </div>
        </div>

        {/* ── C. Terminology rail ── */}
        <div
          className="mt-[22px] sm:mt-[34px] rounded-[14px] px-5 sm:px-6 py-4"
          style={{
            background: "linear-gradient(90deg, rgba(124,58,237,.075), rgba(37,99,235,.035))",
            border: "1px solid rgba(124,58,237,.13)",
            borderLeft: "3px solid #7C3AED",
          }}
        >
          <div className="flex flex-col lg:flex-row lg:gap-6 lg:items-start">
            {/* Label zone */}
            <div className="flex items-center gap-2 mb-2 lg:mb-0 flex-shrink-0 lg:w-[300px]">
              <BookOpenCheck size={17} color="#6D28D9" aria-hidden="true" />
              <span
                className="text-[11.5px] font-[700] uppercase tracking-[0.08em]"
                style={{ fontFamily: SANS, color: "#6D28D9" }}
              >
                TAX TERMINOLOGY · FROM 1 APRIL 2026
              </span>
            </div>
            {/* Body */}
            <p
              className="text-[13px] lg:text-[13.5px] flex-1"
              style={{ fontFamily: SANS, color: "#475569", lineHeight: 1.45 }}
            >
              For payments to a non-resident landlord, the earlier Section 195 framework under the
              Income-tax Act, 1961 maps to Section 393(2) of the Income-tax Act, 2025. The
              lower-deduction application earlier made in Form 13 is now Form 128 under Section 395.
              Earlier transactions remain under the earlier framework.
            </p>
          </div>
        </div>

        {/* ── D. Consequence rail ── */}
        <div
          className="mt-[18px] rounded-[14px] overflow-hidden"
          style={{
            background: "linear-gradient(90deg, rgba(249,115,22,.035), rgba(20,184,166,.035))",
            border: "1px solid rgba(15,23,42,.08)",
          }}
        >
          <div className="lg:grid lg:grid-cols-2">
            {/* Tenant */}
            <div className="flex items-start gap-3 px-5 sm:px-6 py-5">
              <div
                className="flex-shrink-0 w-[42px] h-[42px] rounded-full flex items-center justify-center"
                style={{ background: "rgba(194,65,12,.10)", border: "1px solid rgba(194,65,12,.18)" }}
              >
                <UserRound size={18} color="#C2410C" aria-hidden="true" />
              </div>
              <div>
                <p className="text-[11px] font-[700] uppercase tracking-[0.07em] mb-1" style={{ fontFamily: SANS, color: "#C2410C" }}>TENANT</p>
                <p className="text-[15px] font-[700] mb-1" style={{ fontFamily: SANS, color: "#172033" }}>Carries the withholding obligation</p>
                <p className="text-[13.5px]" style={{ fontFamily: SANS, color: "#64748B", lineHeight: 1.5 }}>
                  Deduction, deposit, quarterly reporting and tenant-side records remain the tenant's responsibility.
                </p>
              </div>
            </div>
            <div className="lg:hidden h-px bg-[rgba(15,23,42,.08)]" aria-hidden="true" />
            {/* Landlord */}
            <div className="flex items-start gap-3 px-5 sm:px-6 py-5 lg:border-l lg:border-[rgba(15,23,42,.08)]">
              <div
                className="flex-shrink-0 w-[42px] h-[42px] rounded-full flex items-center justify-center"
                style={{ background: "rgba(15,118,110,.10)", border: "1px solid rgba(15,118,110,.18)" }}
              >
                <House size={18} color="#0F766E" aria-hidden="true" />
              </div>
              <div>
                <p className="text-[11px] font-[700] uppercase tracking-[0.07em] mb-1" style={{ fontFamily: SANS, color: "#0F766E" }}>LANDLORD</p>
                <p className="text-[15px] font-[700] mb-1" style={{ fontFamily: SANS, color: "#172033" }}>Feels the practical consequence</p>
                <p className="text-[13.5px]" style={{ fontFamily: SANS, color: "#64748B", lineHeight: 1.5 }}>
                  Missing or inconsistent records can create tax-credit, reconciliation, refund and clean-up friction later.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── E. Historic-years branch ── */}
        <section
          id="tds-not-deducted-on-rent"
          aria-labelledby="historic-tds-heading"
          className="mt-[28px] sm:mt-[40px] relative"
        >
          {/* Depth plate */}
          <div
            aria-hidden="true"
            className="absolute inset-0 rounded-[18px] lg:rounded-[24px] translate-x-[3px] translate-y-[4px] lg:translate-x-[4px] lg:translate-y-[5px] pointer-events-none"
            style={{
              background: "linear-gradient(135deg, rgba(249,115,22,.18), rgba(251,113,133,.13))",
              zIndex: 0,
            }}
          />
          {/* Main surface */}
          <div
            className="relative rounded-[18px] lg:rounded-[24px] overflow-hidden"
            style={{
              background: "linear-gradient(135deg,#FFF9F2 0%,#FFF4EE 58%,#FFF8F5 100%)",
              border: "1px solid rgba(249,115,22,.20)",
              boxShadow: "0 24px 60px rgba(124,45,18,.09), 0 6px 18px rgba(249,115,22,.055)",
              zIndex: 1,
            }}
          >
            {/* Upper content */}
            <div className="px-5 sm:px-8 lg:px-10 pt-8 lg:pt-10 pb-6 lg:pb-8 flex flex-col lg:flex-row lg:gap-8 lg:items-stretch">
              {/* Left — intro */}
              <div className="lg:w-[38%] flex-shrink-0 lg:pr-8 lg:border-r lg:border-[rgba(249,115,22,.18)]">
                <div
                  className="w-[42px] h-[42px] rounded-[12px] flex items-center justify-center mb-4"
                  style={{ background: "rgba(249,115,22,.10)", border: "1px solid rgba(249,115,22,.22)" }}
                >
                  <CalendarDays size={20} color="#C2410C" aria-hidden="true" />
                </div>
                <p
                  className="text-[11.5px] font-[700] uppercase tracking-[0.10em] mb-2"
                  style={{ fontFamily: SANS, color: "#C2410C" }}
                >
                  PAST YEARS
                </p>
                <h3
                  id="historic-tds-heading"
                  className="text-[27px] sm:text-[29px] lg:text-[34px] mb-3"
                  style={{ fontFamily: SERIF, fontWeight: 400, color: "#0F172A", lineHeight: 1.1 }}
                >
                  What if no TDS has been deducted from the rent so far?
                </h3>
                <p
                  className="text-[15px]"
                  style={{ fontFamily: SANS, color: "#5B6472", lineHeight: 1.5 }}
                >
                  Start by reconstructing what actually happened. Don&#8217;t assume every year needs the same fix.
                </p>
              </div>

              {/* Right — cleanup mini-flow */}
              <div className="mt-6 lg:mt-0 lg:self-stretch lg:flex lg:flex-col lg:justify-center lg:flex-1">
                {/* Desktop: 3-col grid. Phone: vertical */}
                <div className="relative flex flex-col gap-6 lg:grid lg:grid-cols-3 lg:gap-4 lg:w-full">
                  {/* Desktop horizontal connector — centred in grid, behind dots */}
                  <div
                    aria-hidden="true"
                    className="hidden lg:block absolute pointer-events-none"
                    style={{ top: 9, left: "calc(100%/6)", right: "calc(100%/6)", height: 1, background: "rgba(234,88,12,.30)", zIndex: 0 }}
                  />

                  {CLEANUP_STEPS.map((step, stepIdx) => (
                    <div key={step.num} className="relative flex gap-3 lg:flex-col lg:items-center lg:text-center lg:gap-1" style={{ zIndex: 1 }}>
                      {/* Phone per-step connector — only between steps, never after last */}
                      {stepIdx < CLEANUP_STEPS.length - 1 && (
                        <div
                          aria-hidden="true"
                          className="lg:hidden absolute pointer-events-none"
                          style={{ top: 11, left: 8.5, width: 1, height: "calc(100% + 24px)", background: "rgba(234,88,12,.30)", zIndex: 0 }}
                        />
                      )}
                      {/* Dot */}
                      <div
                        aria-hidden="true"
                        className="flex-shrink-0 w-[18px] h-[18px] rounded-full border-2 border-[rgba(234,88,12,.40)] bg-[rgba(249,115,22,.12)] lg:mb-1"
                        style={{ marginTop: 2 }}
                      />
                      <div>
                        <p
                          className="text-[10.5px] font-[700] uppercase tracking-[0.07em] mb-0.5"
                          style={{ fontFamily: SANS, color: "#C2410C" }}
                        >
                          {step.num} · {step.label}
                        </p>
                        <p
                          className="text-[12.5px] lg:text-[13px]"
                          style={{ fontFamily: SANS, color: "#475569", lineHeight: 1.45 }}
                        >
                          {step.question}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div
              className="px-5 sm:px-8 lg:px-10 pt-5 pb-7 lg:pb-8 flex flex-col sm:flex-row sm:items-center sm:gap-6"
              style={{ borderTop: "1px solid rgba(249,115,22,.18)" }}
            >
              <p
                className="text-[14px] flex-1 mb-4 sm:mb-0"
                style={{ fontFamily: SANS, color: "#475569", lineHeight: 1.5 }}
              >
                Reeve can coordinate the landlord, tenant, records and professional work needed to clean up past years.
              </p>
              <a
                href="#enquiry"
                className="inline-flex items-center justify-center w-full sm:w-auto rounded-[12px] px-6 font-[650] text-white bg-[#2563EB] hover:bg-[#1D4ED8] active:bg-[#1E40AF] transition-colors duration-[160ms] motion-reduce:transition-none min-h-[48px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2 whitespace-nowrap"
                style={{ fontFamily: SANS, fontSize: 14 }}
              >
                Talk to Reeve about past years
              </a>
            </div>
          </div>
        </section>

      </div>
    </section>
  );
}

// ── Band 4: Lower Deduction Certificate ──────────────────────────────────────

const FORM128_STEPS = [
  { num: "01", taxonomy: "ASSESS",  heading: "Is an application actually worthwhile?",   descriptor: "Reeve coordinates the facts with the CA." },
  { num: "02", taxonomy: "PREPARE", heading: "CA prepares and files Form 128",            descriptor: "Supporting material is assembled." },
  { num: "03", taxonomy: "DECIDE",  heading: "The tax department reviews the application", descriptor: "Queries, if any, are handled with the CA." },
  { num: "04", taxonomy: "APPLY",   heading: "Certificate goes to landlord and tenant",   descriptor: "The tenant follows the authorised rate." },
] as const;

function NriRentTdsLowerDeductionSection() {
  return (
    <>
      <style>{BAND4_STYLE}</style>
      <section
        id="lower-deduction-certificate-nri"
        aria-labelledby="lower-deduction-heading"
        style={{
          background: `
            radial-gradient(circle at 12% 24%, rgba(124,58,237,.18), transparent 30%),
            radial-gradient(circle at 86% 64%, rgba(20,184,166,.12), transparent 31%),
            radial-gradient(circle at 70% 5%, rgba(37,99,235,.08), transparent 26%),
            linear-gradient(135deg,#081129 0%,#10163A 52%,#191945 100%)
          `,
        }}
      >
        <div className="max-w-[1140px] mx-auto px-5 sm:px-8 lg:px-12 pt-[56px] pb-[58px] lg:pt-[88px] lg:pb-[92px]">

          {/* ── Intro ── */}
          <p
            className="text-[12px] font-bold uppercase tracking-[0.10em] mb-3"
            style={{ fontFamily: SANS, color: "#C4B5FD" }}
          >
            Lower Deduction Certificate
          </p>
          <h2
            id="lower-deduction-heading"
            className="text-[32px] sm:text-[34px] lg:text-[clamp(40px,3.6vw,50px)] leading-[1.07] lg:leading-[1.03] max-w-[720px] font-normal mt-0 mb-4"
            style={{ fontFamily: SERIF, color: "#F8FAFC" }}
          >
            Can an NRI landlord get a lower deduction certificate?
          </h2>
          <p
            className="text-[17px] lg:text-[19px] max-w-[700px] mb-3"
            style={{ fontFamily: SANS, fontWeight: 650, color: "#E8EAF8", lineHeight: 1.38 }}
          >
            Yes, in the right situation. The default withholding doesn't always have to be the final answer.
          </p>
          <p
            className="text-[15px] lg:text-[16px] max-w-[700px]"
            style={{ fontFamily: SANS, color: "#B9C5D8", lineHeight: 1.55 }}
          >
            Where withholding from the rent would be materially higher than the owner's likely eventual Indian tax liability, it may be worth assessing whether a lower deduction certificate makes sense.
          </p>

          {/* ── Authorised Rate Bridge artifact ── */}
          <div className="mt-[28px] lg:mt-[38px] max-w-[1040px]">
            <div className="flex flex-col gap-0 lg:grid lg:gap-0 lg:items-stretch" style={{ gridTemplateColumns: "minmax(0,34fr) minmax(190px,32fr) minmax(0,34fr)" }}>

              {/* Left — Default slab */}
              <div className="relative overflow-visible">
                {/* depth plate */}
                <div
                  aria-hidden="true"
                  className="absolute inset-0 rounded-[18px] lg:rounded-[22px] translate-x-[3px] translate-y-[4px] lg:translate-x-[4px] lg:translate-y-[5px] pointer-events-none"
                  style={{ background: "linear-gradient(135deg,rgba(249,115,22,.18),rgba(245,158,11,.08))" }}
                />
                {/* main surface */}
                <div
                  className="relative rounded-[18px] lg:rounded-[22px] px-5 py-6 sm:px-6 h-full"
                  style={{
                    background: "linear-gradient(135deg,rgba(249,115,22,.14),rgba(249,115,22,.055))",
                    border: "1px solid rgba(249,115,22,.25)",
                  }}
                >
                  {/* icon well */}
                  <div
                    className="w-11 h-11 rounded-[10px] flex items-center justify-center mb-3"
                    style={{ background: "rgba(249,115,22,.14)", border: "1px solid rgba(249,115,22,.25)" }}
                  >
                    <ReceiptText aria-hidden="true" size={20} color="#FB923C" />
                  </div>
                  <p
                    className="text-[11px] font-bold uppercase tracking-[0.08em] mb-2"
                    style={{ fontFamily: SANS, color: "#FDBA74" }}
                  >
                    Default Position
                  </p>
                  <p
                    className="text-[26px] lg:text-[30px] font-normal mb-3 leading-[1.1]"
                    style={{ fontFamily: SERIF, color: "#FFF7ED" }}
                  >
                    Roughly a third of gross rent can be withheld
                  </p>
                  <p
                    className="text-[13px] lg:text-[14px]"
                    style={{ fontFamily: SANS, color: "#D9C8BF", lineHeight: 1.48 }}
                  >
                    That may be more than the owner ultimately owes after income and deductions are considered.
                  </p>
                </div>
              </div>

              {/* Centre — shared gate + connector tracks */}
              <div className="relative flex flex-col items-center justify-center">

                {/* Desktop horizontal connector track */}
                <div
                  aria-hidden="true"
                  className="hidden lg:block absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[32px] overflow-hidden pointer-events-none"
                >
                  <div
                    className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[2px]"
                    style={{ background: "linear-gradient(90deg,#F97316 0%,#7C3AED 48%,#14B8A6 100%)" }}
                  />
                  <div
                    className="absolute left-0 inset-y-0 w-1/3 nri-band4-glow-h"
                    style={{ background: "radial-gradient(ellipse,rgba(167,139,250,.55),transparent 70%)" }}
                  />
                </div>

                {/* Phone top connector segment (orange→violet) */}
                <div
                  aria-hidden="true"
                  className="lg:hidden relative mx-auto h-[28px] w-[18px] overflow-hidden"
                >
                  <div
                    className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-[2px]"
                    style={{ background: "linear-gradient(180deg,#F97316,#7C3AED)" }}
                  />
                  <div
                    className="absolute top-0 left-0 w-full h-1/3 nri-band4-glow-v"
                    style={{ background: "radial-gradient(ellipse,rgba(167,139,250,.55),transparent 70%)" }}
                  />
                </div>

                {/* Certificate gate + question (shared, single DOM) */}
                <div className="flex flex-col items-center justify-center text-center relative z-10 px-2 py-3 lg:py-4">
                  <div
                    className="w-12 h-12 lg:w-14 lg:h-14 rounded-full lg:rounded-[14px] flex items-center justify-center mb-2"
                    style={{ background: "rgba(91,33,182,.40)", border: "1px solid rgba(167,139,250,.30)" }}
                  >
                    <FileCheck2 aria-hidden="true" size={20} color="#DDD6FE" />
                  </div>
                  <p
                    className="text-[12px] lg:text-[13px] max-w-[180px]"
                    style={{ fontFamily: SANS, fontWeight: 650, color: "#DDD6FE", lineHeight: 1.35 }}
                  >
                    Could a lower authorised rate make sense?
                  </p>
                </div>

                {/* Phone bottom connector segment (violet→teal) */}
                <div
                  aria-hidden="true"
                  className="lg:hidden relative mx-auto h-[28px] w-[18px] overflow-hidden"
                >
                  <div
                    className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-[2px]"
                    style={{ background: "linear-gradient(180deg,#7C3AED,#14B8A6)" }}
                  />
                  <div
                    className="absolute top-0 left-0 w-full h-1/3 nri-band4-glow-v [animation-delay:2.75s]"
                    style={{ background: "radial-gradient(ellipse,rgba(167,139,250,.55),transparent 70%)" }}
                  />
                </div>

              </div>

              {/* Right — Authorised slab */}
              <div className="relative overflow-visible min-w-0">
                {/* depth plate */}
                <div
                  aria-hidden="true"
                  className="absolute inset-0 rounded-[18px] lg:rounded-[22px] translate-x-[3px] translate-y-[4px] lg:translate-x-[4px] lg:translate-y-[5px] pointer-events-none"
                  style={{ background: "linear-gradient(135deg,rgba(124,58,237,.18),rgba(20,184,166,.13))" }}
                />
                {/* main surface */}
                <div
                  className="relative rounded-[18px] lg:rounded-[22px] px-5 py-6 sm:px-6 h-full"
                  style={{
                    background: "linear-gradient(135deg,rgba(124,58,237,.13) 0%,rgba(20,184,166,.10) 100%)",
                    border: "1px solid rgba(167,243,208,.18)",
                  }}
                >
                  {/* icon well */}
                  <div
                    className="w-11 h-11 rounded-[10px] flex items-center justify-center mb-3"
                    style={{ background: "rgba(20,184,166,.12)", border: "1px solid rgba(20,184,166,.25)" }}
                  >
                    <FileCheck2 aria-hidden="true" size={20} color="#5EEAD4" />
                  </div>
                  <p
                    className="text-[11px] font-bold uppercase tracking-[0.08em] mb-2"
                    style={{ fontFamily: SANS, color: "#99F6E4" }}
                  >
                    Where a lower rate is approved
                  </p>
                  <p
                    className="text-[26px] lg:text-[30px] font-normal mb-3 leading-[1.1]"
                    style={{ fontFamily: SERIF, color: "#F0FDFA" }}
                  >
                    The tenant follows the rate authorised in the certificate
                  </p>
                  <p
                    className="text-[13px] lg:text-[14px]"
                    style={{ fontFamily: SANS, color: "#C5DDD8", lineHeight: 1.48 }}
                  >
                    Less of the rent may remain tied up in withholding during the year.
                  </p>
                </div>
              </div>

            </div>
          </div>

          {/* ── Trust / When section ── */}
          <div className="mt-[24px] lg:mt-[32px]">
            <h3
              className="text-[25px] lg:text-[30px] font-normal mb-3"
              style={{ fontFamily: SERIF, color: "#F8FAFC" }}
            >
              When is a lower deduction certificate worth considering?
            </h3>
            <div
              className="rounded-[12px] px-5 sm:px-6 py-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-4"
              style={{
                background: "linear-gradient(90deg,rgba(20,184,166,.08),rgba(124,58,237,.07))",
                borderTop: "1px solid rgba(255,255,255,.11)",
                borderBottom: "1px solid rgba(255,255,255,.11)",
              }}
            >
              {/* Scale icon well */}
              <div
                className="w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0"
                style={{ background: "rgba(124,58,237,.14)", border: "1px solid rgba(167,139,250,.20)" }}
              >
                <Scale aria-hidden="true" size={18} color="#A78BFA" />
              </div>
              <div className="min-w-0">
                <p
                  className="text-[16px] font-bold mb-1"
                  style={{ fontFamily: SANS, color: "#F8FAFC" }}
                >
                  Not every tenancy needs an application.
                </p>
                <p
                  className="text-[13.5px] lg:text-[14px] max-w-[900px]"
                  style={{ fontFamily: SANS, color: "#B9C5D8", lineHeight: 1.5 }}
                >
                  It is worth assessing when the amount being withheld is materially above the owner's eventual liability. It may make less sense when the rent is modest or the difference is small relative to the work involved.
                </p>
              </div>
            </div>
          </div>

          {/* ── Form 128 block ── */}
          <div className="mt-[26px] lg:mt-[36px]">
            <h3
              className="text-[25px] lg:text-[30px] font-normal mb-2"
              style={{ fontFamily: SERIF, color: "#F8FAFC" }}
            >
              What is Form 128?
            </h3>
            <p
              className="text-[14px] lg:text-[15px] mb-[20px] lg:mb-[24px]"
              style={{ fontFamily: SANS, color: "#B9C5D8", lineHeight: 1.5 }}
            >
              Form 128 is the application used for the lower-deduction request under the current framework.
            </p>

            {/* Four-step process */}
            <ol
              aria-label="Lower deduction certificate process"
              className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-6"
            >
              {FORM128_STEPS.map((step, i) => (
                <li
                  key={step.num}
                  className="min-w-0 border-t border-[rgba(255,255,255,.10)] pt-3"
                >
                  <p
                    className="text-[32px] lg:text-[48px] font-normal leading-none mb-1"
                    style={{ fontFamily: SERIF, color: "#A78BFA" }}
                  >
                    {step.num}
                  </p>
                  <p
                    className="text-[10.5px] font-bold uppercase tracking-[0.08em] mb-1.5"
                    style={{ fontFamily: SANS, color: "#C4B5FD" }}
                  >
                    {step.taxonomy}
                  </p>
                  {/* desktop connector after step, except last */}
                  {i < 3 && (
                    <div
                      aria-hidden="true"
                      className="hidden lg:block h-[1px] mb-2 mr-[-24px]"
                      style={{ background: "linear-gradient(90deg,rgba(167,139,250,.40),rgba(20,184,166,.30))" }}
                    />
                  )}
                  <p
                    className="text-[12.5px] lg:text-[14px] mb-1"
                    style={{ fontFamily: SANS, fontWeight: 650, color: "#F1F5F9", lineHeight: 1.35 }}
                  >
                    {step.heading}
                  </p>
                  <p
                    className="text-[12px] lg:text-[12.5px]"
                    style={{ fontFamily: SANS, color: "#9FB0C6", lineHeight: 1.45 }}
                  >
                    {step.descriptor}
                  </p>
                </li>
              ))}
            </ol>

            {/* Financial-year strip */}
            <div className="mt-[16px] lg:mt-[20px]">
              <div
                className="inline-flex max-w-full items-start gap-2 rounded-[10px] px-4 py-2.5"
                style={{
                  background: "rgba(124,58,237,.10)",
                  border: "1px solid rgba(196,181,253,.17)",
                }}
              >
                <CalendarDays
                  aria-hidden="true"
                  size={15}
                  color="#C4B5FD"
                  className="mt-[3px] shrink-0"
                />
                <div className="min-w-0 flex flex-col sm:flex-row sm:items-center sm:gap-2">
                  <span
                    className="text-[11px] font-bold uppercase tracking-[0.08em] shrink-0"
                    style={{ fontFamily: SANS, color: "#C4B5FD" }}
                  >
                    Financial-year specific
                  </span>
                  <span
                    className="text-[12.5px]"
                    style={{ fontFamily: SANS, color: "#B9C5D8" }}
                  >
                    Renewal may be needed for the next financial year.
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Responsibility line ── */}
          <div
            className="mt-[20px] lg:mt-[24px] pt-[16px] text-center"
            style={{ borderTop: "1px solid rgba(255,255,255,.10)" }}
          >
            <p
              className="text-[12.5px]"
              style={{ fontFamily: SANS, fontWeight: 600, color: "#9FB0C6" }}
            >
              Reeve coordinates · CA advises, prepares &amp; files · Department decides
            </p>
          </div>

        </div>
      </section>
    </>
  );
}

// ── Band 5: Reeve Coordination ────────────────────────────────────────────────

const COORD_SOURCES = [
  { id: "tenant",  label: "Tenant",           descriptor: "Withholding · reporting · certificates",                    mobileDescriptor: "Withholding · reporting · certificates",          icon: UserRound,  bg: "#ECFEFF", border: "#A5F3FC", iconColor: "#0891B2", connectorGradient: "linear-gradient(90deg,#22D3EE 0%,#F97316 42%,#2563EB 100%)", portColor: "#22D3EE" },
  { id: "ca",      label: "CA / Professional", descriptor: "Advice · computation · filings",                            mobileDescriptor: "Advice · computation · filings",                  icon: Scale,      bg: "#F5F3FF", border: "#DDD6FE", iconColor: "#7C3AED", connectorGradient: "linear-gradient(90deg,#7C3AED,#2563EB)",                     portColor: "#7C3AED" },
  { id: "records", label: "Records",           descriptor: "Agreement · rent history · certificates",                   mobileDescriptor: "Agreement · rent history · certificates",         icon: FileCheck2, bg: "#F0FDFA", border: "#99F6E4", iconColor: "#0F766E", connectorGradient: "linear-gradient(90deg,#14B8A6,#2563EB)",                     portColor: "#14B8A6" },
  { id: "dept",    label: "Department / Bank", descriptor: "Queries · official decisions · repatriation requirements", mobileDescriptor: "Queries · decisions · repatriation",              icon: Landmark,   bg: "#EFF6FF", border: "#BFDBFE", iconColor: "#2563EB", connectorGradient: "linear-gradient(90deg,#60A5FA,#2563EB)",                     portColor: "#60A5FA" },
] as const;

const SCOPE_ROWS = [
  { taxonomy: "SET UP",         taxonomyColor: "#2563EB", heading: "Get the arrangement structured correctly",        descriptor: "Tenant communication · records · CA coordination · lower-deduction assessment", khata: false },
  { taxonomy: "KEEP CURRENT",   taxonomyColor: "#0E7490", heading: "Keep tenant-side work from drifting",             descriptor: "Follow-up · reminders · certificates · renewals · professional queries",        khata: false },
  { taxonomy: "CLOSE THE YEAR", taxonomyColor: "#0F766E", heading: "Make rent, withholding and records reconcile",    descriptor: "Annual reconciliation · return coordination · refund · repatriation",            khata: false },
  { taxonomy: "EXCEPTIONS",     taxonomyColor: "#7C3AED", heading: "Handle situations that don't fit the clean path", descriptor: "Past years · notices · multiple properties · joint ownership",                   khata: true  },
] as const;

const RESP_ITEMS = [
  { taxonomy: "RENT",              main: "Tenant → owner directly",                  support: "Reeve never handles the rent." },
  { taxonomy: "WITHHOLDING",       main: "Tenant remains responsible",                support: "Reeve coordinates follow-up." },
  { taxonomy: "PROFESSIONAL WORK", main: "Handled by the appropriate professional",   support: "Reeve does not provide regulated tax advice." },
  { taxonomy: "OFFICIAL OUTCOMES", main: "Authorities decide",                        support: "No guarantee of certificates, refunds or processing times." },
] as const;

const PORT_TOPS = ["12.5%", "37.5%", "62.5%", "87.5%"] as const;

function NriRentTdsCoordinationSection() {
  const [hoveredSource, setHoveredSource] = useState<string | null>(null);

  const canHover = () =>
    typeof window !== "undefined" &&
    window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  return (
    <section
      id="nri-rent-tds-coordination"
      aria-labelledby="nri-rent-tds-coordination-heading"
      style={{
        background: `
          radial-gradient(circle at 8% 20%, rgba(34,211,238,.07), transparent 29%),
          radial-gradient(circle at 52% 42%, rgba(37,99,235,.055), transparent 32%),
          radial-gradient(circle at 92% 72%, rgba(124,58,237,.055), transparent 29%),
          linear-gradient(180deg,#F8FAFC 0%,#FFFDFC 46%,#F7FAFC 100%)
        `,
      }}
    >
      <div className="max-w-[1140px] mx-auto px-5 sm:px-8 lg:px-12 pt-[52px] pb-[58px] sm:pt-[68px] sm:pb-[72px] desk:pt-[88px] desk:pb-[90px]">

        {/* ── A. Intro ── */}
        <p
          className="uppercase"
          style={{ fontFamily: SANS, fontSize: 12, fontWeight: 700, letterSpacing: "0.10em", color: "#1D4ED8" }}
        >
          HOW REEVE HELPS
        </p>
        <h2
          id="nri-rent-tds-coordination-heading"
          className="text-[32px] sm:text-[36px] desk:text-[clamp(40px,3.5vw,50px)] leading-[1.06] font-normal tracking-[-0.015em] max-w-[720px] mt-3"
          style={{ fontFamily: SERIF, color: "#0F172A" }}
        >
          What can Reeve coordinate for an NRI landlord?
        </h2>
        <p
          className="mt-[14px] text-[17px] desk:text-[19px] max-w-[680px]"
          style={{ fontFamily: SANS, fontWeight: 650, color: "#1D4ED8", lineHeight: 1.4 }}
        >
          One coordination layer around the rent.
        </p>
        <p
          className="mt-[9px] text-[15px] desk:text-[16px] max-w-[700px]"
          style={{ fontFamily: SANS, color: "#526173", lineHeight: 1.55 }}
        >
          Instead of separately chasing the tenant, CA, records and annual follow-up from abroad, Reeve keeps the work moving through one coordination point.
        </p>

        {/* ── B. Coordination Switchboard ── */}
        <div className="mt-[28px] desk:mt-[36px] w-full max-w-[1040px] mx-auto">
          <div
            className="flex flex-col desk:grid"
            style={{ gridTemplateColumns: "minmax(0,31fr) minmax(0,8fr) minmax(0,25fr) minmax(0,9fr) minmax(0,27fr)" }}
          >

            {/* ── MOBILE layout (<1200px) ── */}
            {/* WHAT COMES IN label */}
            <p
              className="desk:hidden uppercase mb-2"
              style={{ fontFamily: SANS, fontSize: 11, fontWeight: 700, letterSpacing: "0.09em", color: "#64748B" }}
            >
              WHAT COMES IN
            </p>

            {/* Mobile source stack */}
            <div
              className="desk:hidden relative rounded-[18px] overflow-hidden"
              style={{
                background: "rgba(255,255,255,.52)",
                border: "1px solid rgba(15,23,42,.075)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,.55)",
              }}
            >
              {/* Collector rail — centred in 20px gutter at right:9px */}
              <div
                aria-hidden="true"
                className="absolute inset-y-0 w-[2px] bg-[#2563EB] right-[9px]"
              />

              {COORD_SOURCES.map((s, idx) => {
                const Icon = s.icon;
                return (
                  <div
                    key={s.id}
                    className={`flex items-center pl-[10px] pr-0 py-[9px] min-h-[48px]${idx < COORD_SOURCES.length - 1 ? " border-b border-[rgba(15,23,42,.065)]" : ""}`}
                  >
                    {/* Icon well */}
                    <div
                      className="w-[30px] h-[30px] rounded-[8px] flex items-center justify-center shrink-0 mr-[10px]"
                      style={{ background: s.bg, border: `1px solid ${s.border}` }}
                    >
                      <Icon size={14} color={s.iconColor} aria-hidden="true" />
                    </div>
                    {/* Label + descriptor */}
                    <div className="min-w-0 flex-1">
                      <p style={{ fontFamily: SANS, fontSize: 13.5, fontWeight: 650, color: "#172033", lineHeight: 1.3 }}>
                        {s.label}
                      </p>
                      <p style={{ fontFamily: SANS, fontSize: 12, color: "#64748B", lineHeight: 1.4 }}>
                        {s.mobileDescriptor}
                      </p>
                    </div>
                    {/* 20px port gutter with dot */}
                    <div className="w-[20px] shrink-0 flex items-center justify-center" aria-hidden="true">
                      <div
                        className="w-[8px] h-[8px] rounded-full"
                        style={{ backgroundColor: s.portColor }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Mobile bridge: horizontal + vertical + chevron */}
            <div className="desk:hidden flex flex-col" aria-hidden="true">
              {/* horizontal bridge — right edge at right:9px, left edge at centre */}
              <div className="h-[2px] w-[calc(50%_-_9px)] self-end mr-[9px] bg-[#2563EB]" />
              {/* 28px centred vertical connector */}
              <div className="mx-auto w-[2px] h-[28px] bg-[#2563EB]" />
              {/* chevron arrowhead */}
              <ChevronDown aria-hidden="true" size={14} color="#2563EB" className="mx-auto" />
            </div>

            {/* Mobile Reeve node */}
            <div className="desk:hidden relative overflow-visible">
              <div
                aria-hidden="true"
                className="absolute inset-0 rounded-[18px] desk:rounded-[20px] translate-x-[3px] translate-y-[4px] pointer-events-none"
                style={{ background: "linear-gradient(135deg,rgba(37,99,235,.22),rgba(20,184,166,.16))" }}
              />
              <div
                className="relative rounded-[18px] desk:rounded-[20px] py-5 px-[18px] flex flex-col justify-center"
                style={{
                  background: `
                    radial-gradient(circle at 18% 12%,rgba(255,255,255,.18),transparent 34%),
                    linear-gradient(145deg,#1E40AF 0%,#2563EB 52%,#0F67D7 78%,#0891B2 125%)
                  `,
                  border: "1px solid rgba(255,255,255,.24)",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,.16), 0 10px 26px rgba(37,99,235,.12)",
                }}
              >
                <p style={{ fontFamily: SANS, fontSize: 12, fontWeight: 800, letterSpacing: "0.12em", color: "#DBEAFE" }}>REEVE</p>
                <p className="mt-1" style={{ fontFamily: SERIF, fontSize: 28, fontWeight: 400, color: "#FFFFFF", lineHeight: 1.08 }}>
                  Coordinates the work
                </p>
                <p className="mt-2" style={{ fontFamily: SANS, fontSize: 12.5, fontWeight: 600, color: "#E0F2FE", lineHeight: 1.5 }}>
                  Communication · Documents · Follow-up · Sequencing
                </p>
              </div>
            </div>

            {/* Mobile Reeve→Owner connector */}
            <div
              aria-hidden="true"
              className="desk:hidden mx-auto w-[2px] h-[28px] bg-gradient-to-b from-[#2563EB] to-[#14B8A6]"
            />

            {/* Mobile Owner tile */}
            <div className="desk:hidden relative overflow-visible">
              <div
                aria-hidden="true"
                className="absolute inset-0 rounded-[18px] translate-x-[2px] translate-y-[3px] pointer-events-none"
                style={{ background: "rgba(20,184,166,.075)" }}
              />
              <div
                className="relative rounded-[18px] px-5 py-5 flex flex-col justify-center"
                style={{
                  background: "linear-gradient(135deg,#EFF6FF 0%,#ECFEFF 100%)",
                  border: "1px solid rgba(37,99,235,.12)",
                }}
              >
                <p style={{ fontFamily: SANS, fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "#0F766E" }}>NRI OWNER</p>
                <p className="mt-1" style={{ fontFamily: SERIF, fontSize: 26, fontWeight: 400, color: "#0F172A", lineHeight: 1.1 }}>
                  One coordinated view
                </p>
                <p className="mt-1" style={{ fontFamily: SANS, fontSize: 13.5, color: "#475569", lineHeight: 1.45 }}>
                  What needs attention and what happens next.
                </p>
              </div>
            </div>

            {/* ── DESKTOP layout (desk:) ── */}

            {/* Col 1: Input stack (desktop) */}
            <div
              className="hidden desk:grid desk:grid-rows-4 rounded-[18px] overflow-hidden"
              style={{
                background: "rgba(255,255,255,.52)",
                border: "1px solid rgba(15,23,42,.075)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,.55)",
              }}
            >
              {COORD_SOURCES.map((s, idx) => {
                const Icon = s.icon;
                const isHovered = hoveredSource === s.id;
                return (
                  <div
                    key={s.id}
                    className={`flex items-center gap-2.5 px-[13px] py-[10px] desk:min-h-[54px]${idx < COORD_SOURCES.length - 1 ? " border-b border-[rgba(15,23,42,.065)]" : ""}`}
                    onMouseEnter={() => canHover() && setHoveredSource(s.id)}
                    onMouseLeave={() => canHover() && setHoveredSource(null)}
                  >
                    {/* Icon well */}
                    <div
                      className="w-[32px] h-[32px] desk:w-[34px] desk:h-[34px] rounded-[8px] flex items-center justify-center shrink-0 transition-[filter] duration-[170ms] ease-out motion-reduce:transition-none"
                      style={{
                        background: s.bg,
                        border: `1px solid ${s.border}`,
                        filter: isHovered ? "saturate(1.08)" : "saturate(1)",
                      }}
                    >
                      <Icon size={15} color={s.iconColor} aria-hidden="true" />
                    </div>
                    {/* Label + descriptor */}
                    <div className="min-w-0 flex-1">
                      <p style={{ fontFamily: SANS, fontSize: 11, fontWeight: 700, letterSpacing: "0.07em", color: "#273548", textTransform: "uppercase" }}>
                        {s.label}
                      </p>
                      <p style={{ fontFamily: SANS, fontSize: 12.5, color: "#64748B", lineHeight: 1.35 }}>
                        <span className="desk:hidden">{s.mobileDescriptor}</span>
                        <span className="hidden desk:inline">{s.descriptor}</span>
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Col 2: Inbound connector channel (desktop) */}
            <div className="hidden desk:grid desk:grid-rows-4">
              {COORD_SOURCES.map((s) => {
                const isHovered = hoveredSource === s.id;
                return (
                  <div key={s.id} className="flex items-center">
                    <div
                      className="h-[1.5px] w-full transition-opacity duration-[160ms] ease-out motion-reduce:transition-none"
                      style={{
                        background: s.connectorGradient,
                        opacity: isHovered ? 1 : 0.52,
                      }}
                      aria-hidden="true"
                    />
                  </div>
                );
              })}
            </div>

            {/* Col 3: Reeve node (desktop) */}
            <div className="hidden desk:block relative overflow-visible">
              {/* Depth underlay */}
              <div
                aria-hidden="true"
                className="absolute inset-0 rounded-[20px] desk:rounded-[24px] translate-x-[3px] translate-y-[4px] desk:translate-x-[4px] desk:translate-y-[5px] pointer-events-none"
                style={{ background: "linear-gradient(135deg,rgba(37,99,235,.22),rgba(20,184,166,.16))" }}
              />
              {/* Main surface */}
              <div
                className="relative rounded-[20px] desk:rounded-[24px] px-4 py-5 desk:px-5 desk:py-6 h-full flex flex-col justify-center"
                style={{
                  background: `
                    radial-gradient(circle at 18% 12%,rgba(255,255,255,.18),transparent 34%),
                    linear-gradient(145deg,#1E40AF 0%,#2563EB 52%,#0F67D7 78%,#0891B2 125%)
                  `,
                  border: "1px solid rgba(255,255,255,.24)",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,.16), 0 10px 26px rgba(37,99,235,.12)",
                }}
              >
                {/* Reeve-side port dots — absolutely positioned on left edge */}
                {COORD_SOURCES.map((s, i) => (
                  <div
                    key={s.id}
                    aria-hidden="true"
                    className="transition-[box-shadow] duration-[160ms] ease-out motion-reduce:transition-none"
                    style={{
                      position: "absolute",
                      top: PORT_TOPS[i],
                      left: 0,
                      transform: "translate(-50%, -50%)",
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      backgroundColor: s.portColor,
                      boxShadow: hoveredSource === s.id
                        ? `0 0 0 4px ${s.portColor}2E`
                        : `0 0 0 2px ${s.portColor}33`,
                    }}
                  />
                ))}
                <p style={{ fontFamily: SANS, fontSize: 12, fontWeight: 800, letterSpacing: "0.12em", color: "#DBEAFE" }}>REEVE</p>
                <p className="mt-1" style={{ fontFamily: SERIF, fontSize: 28, fontWeight: 400, color: "#FFFFFF", lineHeight: 1.08 }}>
                  Coordinates<br />the work
                </p>
                <p className="mt-2" style={{ fontFamily: SANS, fontSize: 12.5, fontWeight: 600, color: "#E0F2FE", lineHeight: 1.5 }}>
                  Communication · Documents<br />Follow-up · Sequencing
                </p>
              </div>
            </div>

            {/* Col 4: Outbound connector (desktop) */}
            <div className="hidden desk:flex items-center relative">
              <div
                className="h-[2px] w-full"
                style={{ background: "linear-gradient(90deg,#2563EB,#14B8A6)" }}
                aria-hidden="true"
              />
              {/* Arrowhead */}
              <div
                aria-hidden="true"
                className="absolute right-0"
                style={{
                  width: 0,
                  height: 0,
                  borderTop: "5px solid transparent",
                  borderBottom: "5px solid transparent",
                  borderLeft: "8px solid #14B8A6",
                }}
              />
            </div>

            {/* Col 5: Owner tile (desktop) */}
            <div className="hidden desk:block relative overflow-visible">
              {/* Depth underlay */}
              <div
                aria-hidden="true"
                className="absolute inset-0 rounded-[18px] desk:rounded-[22px] translate-x-[2px] translate-y-[3px] pointer-events-none"
                style={{ background: "rgba(20,184,166,.075)" }}
              />
              {/* Main surface */}
              <div
                className="relative rounded-[18px] desk:rounded-[22px] px-4 py-5 desk:px-5 desk:py-6 h-full flex flex-col justify-center"
                style={{
                  background: "linear-gradient(135deg,#EFF6FF 0%,#ECFEFF 100%)",
                  border: "1px solid rgba(37,99,235,.12)",
                }}
              >
                <p style={{ fontFamily: SANS, fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "#0F766E", textTransform: "uppercase" }}>NRI OWNER</p>
                <p className="mt-1" style={{ fontFamily: SERIF, fontSize: 26, fontWeight: 400, color: "#0F172A", lineHeight: 1.1 }}>
                  One coordinated view
                </p>
                <p className="mt-2" style={{ fontFamily: SANS, fontSize: 13.5, color: "#475569", lineHeight: 1.45 }}>
                  What needs attention and what happens next.
                </p>
              </div>
            </div>

          </div>
        </div>

        {/* ── C. Service scope ── */}
        <div className="mt-[28px] desk:mt-[38px]">
          <h3
            className="text-[26px] desk:text-[31px] font-normal mb-4 desk:mb-6"
            style={{ fontFamily: SERIF, fontWeight: 400, color: "#0F172A" }}
          >
            What Reeve can coordinate
          </h3>

          {/* Desktop rows */}
          <div className="hidden desk:block">
            {SCOPE_ROWS.map((row, idx) => (
              <div
                key={row.taxonomy}
                className={`flex items-baseline gap-0 py-[12px]${idx < SCOPE_ROWS.length - 1 ? " border-b border-[rgba(15,23,42,.065)]" : ""}`}
              >
                <p
                  className="w-[112px] shrink-0 uppercase"
                  style={{ fontFamily: SANS, fontSize: 10.5, fontWeight: 700, letterSpacing: "0.08em", color: row.taxonomyColor }}
                >
                  {row.taxonomy}
                </p>
                <p
                  className="w-[275px] shrink-0 px-4"
                  style={{ fontFamily: SANS, fontSize: 15, fontWeight: 650, color: "#172033", lineHeight: 1.35 }}
                >
                  {row.heading}
                </p>
                <div className="min-w-0 flex-1">
                  <p style={{ fontFamily: SANS, fontSize: 13, color: "#667085", lineHeight: 1.45 }}>
                    {row.descriptor}
                  </p>
                  {row.khata && (
                    <p style={{ marginTop: 6, fontFamily: SANS, fontSize: 13, color: "#667085" }}>
                      Need ownership or municipal record work?{" "}
                      <a
                        href="/khata-transfer-bangalore"
                        className="font-semibold text-[#2563EB] hover:underline focus-visible:underline"
                      >
                        Khata &amp; Mutation →
                      </a>
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Mobile accordion */}
          <div className="desk:hidden">
            {SCOPE_ROWS.map((row) => (
              <details key={row.taxonomy} className="group">
                <summary
                  className="min-h-[52px] flex items-center justify-between border-b border-[rgba(15,23,42,.08)] py-3 cursor-pointer list-none [&::-webkit-details-marker]:hidden"
                >
                  <div className="min-w-0 pr-3">
                    <p className="uppercase" style={{ fontFamily: SANS, fontSize: 11, fontWeight: 700, letterSpacing: "0.07em", color: row.taxonomyColor }}>
                      {row.taxonomy}
                    </p>
                    <p style={{ fontFamily: SANS, fontSize: 14, fontWeight: 650, color: "#172033", lineHeight: 1.35 }}>
                      {row.heading}
                    </p>
                  </div>
                  <ChevronDown
                    aria-hidden="true"
                    size={16}
                    color="#64748B"
                    className="shrink-0 transition-transform duration-[160ms] ease group-open:rotate-180 motion-reduce:transition-none"
                  />
                </summary>
                <div className="pb-[14px] pt-2">
                  <p style={{ fontFamily: SANS, fontSize: 12.75, color: "#64748B", lineHeight: 1.45 }}>
                    {row.descriptor}
                  </p>
                  {row.khata && (
                    <p className="mt-2" style={{ fontFamily: SANS, fontSize: 12.75, color: "#64748B" }}>
                      Need ownership or municipal record work?{" "}
                      <a
                        href="/khata-transfer-bangalore"
                        className="font-semibold text-[#2563EB] hover:underline focus-visible:underline"
                      >
                        Khata &amp; Mutation →
                      </a>
                    </p>
                  )}
                </div>
              </details>
            ))}
          </div>
        </div>

        {/* ── D. Responsibility area ── */}
        <div className="mt-[24px] desk:mt-[32px]">
          <h3
            className="text-[25px] desk:text-[30px] font-normal mb-3"
            style={{ fontFamily: SERIF, fontWeight: 400, color: "#0F172A" }}
          >
            Who remains responsible for what?
          </h3>
          <div
            style={{
              background: "linear-gradient(90deg,rgba(15,23,42,.022),rgba(37,99,235,.034),rgba(20,184,166,.028))",
              border: "1px solid rgba(15,23,42,.075)",
              borderRadius: 14,
            }}
          >
            {/* Cells */}
            <div className="flex flex-col divide-y divide-[rgba(15,23,42,.065)] desk:grid desk:grid-cols-4 desk:divide-y-0 desk:divide-x desk:divide-[rgba(15,23,42,.065)]">
              {RESP_ITEMS.map((item) => (
                <div key={item.taxonomy} className="px-[14px] py-[13px] desk:px-[17px] desk:py-[16px]">
                  <p
                    className="uppercase"
                    style={{ fontFamily: SANS, fontSize: 10.5, fontWeight: 700, letterSpacing: "0.08em", color: "#64748B" }}
                  >
                    {item.taxonomy}
                  </p>
                  <p
                    className="mt-1"
                    style={{ fontFamily: SANS, fontSize: 14, fontWeight: 700, color: "#172033", lineHeight: 1.35 }}
                  >
                    {item.main}
                  </p>
                  <p
                    className="mt-1"
                    style={{ fontFamily: SANS, fontSize: 12.5, color: "#667085", lineHeight: 1.45 }}
                  >
                    {item.support}
                  </p>
                </div>
              ))}
            </div>
            {/* Quote line */}
            <div
              className="border-t border-[rgba(15,23,42,.065)] px-[14px] py-[13px] desk:px-[17px] desk:py-[15px]"
            >
              <p style={{ fontFamily: SANS, fontSize: 13, fontWeight: 600, color: "#475569", lineHeight: 1.45 }}>
                Reeve reviews the property, rental history and work required before confirming scope and quote.
              </p>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}

function NriRentTdsStickyCTA() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let rafId: number | null = null;

    const update = () => {
      const checkEl = document.getElementById("rent-tds-check");
      const enquiryEl = document.getElementById("enquiry");
      const checkBottom = checkEl?.getBoundingClientRect().bottom ?? 0;
      const enquiryTop = enquiryEl?.getBoundingClientRect().top ?? Infinity;
      setVisible(checkBottom < 0 && enquiryTop > window.innerHeight);
      rafId = null;
    };

    const handleScroll = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll, { passive: true });

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, []);

  return (
    <a
      href="#enquiry"
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      className={[
        "fixed",
        "left-[12px] right-[12px]",
        "bottom-[calc(12px+env(safe-area-inset-bottom,0px))]",
        "desk:left-auto desk:right-[24px] desk:bottom-[24px]",
        "desk:w-auto desk:max-w-[300px] desk:px-5",
        "z-40 px-4",
        "bg-[#2563EB] hover:bg-[#1D4ED8] active:bg-[#1E40AF]",
        "text-white font-semibold flex items-center justify-center",
        "transition-[opacity,background-color] duration-200 ease-out motion-reduce:transition-none",
        "focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#2563EB]",
        visible ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
      ].join(" ")}
      style={{
        boxShadow: "0 6px 22px rgba(37,99,235,.24)",
        borderRadius: 12,
        minHeight: 48,
      }}
    >
      Discuss my rent/TDS situation
    </a>
  );
}

// ── Enquiry section ───────────────────────────────────────────────────────────

function EnquirySection({
  tdsAnswers,
  onRemoveTdsCheck,
}: {
  tdsAnswers: RentTdsAnswers;
  onRemoveTdsCheck: () => void;
}) {
  return (
    <>
      <style>{BAND6_STYLE}</style>
      <section
        id="enquiry"
        aria-labelledby="enquiry-heading"
        className="scroll-mt-0"
        style={{
          background: `
            radial-gradient(circle at 84% 10%, rgba(34,211,238,.14), transparent 30%),
            radial-gradient(circle at 8% 82%, rgba(37,99,235,.11), transparent 31%),
            linear-gradient(135deg,#07182B 0%,#0A263B 52%,#073449 100%)
          `,
        }}
      >
        <div className="mx-auto max-w-[1240px] px-5 sm:px-8 lg:px-10 pt-16 pb-[72px] lg:pt-24 lg:pb-[104px]">
          <div className="lg:grid lg:grid-cols-[38fr_62fr] lg:grid-rows-[auto_1fr] lg:gap-x-[60px] lg:items-start">

            {/* Left copy — col 1, row 1 */}
            <div className="lg:pt-8 lg:col-start-1 lg:row-start-1">
              <p
                className="uppercase"
                style={{ fontFamily: SANS, fontSize: 12, fontWeight: 700, letterSpacing: "0.10em", color: "#67E8F9", marginBottom: 12 }}
              >
                ENQUIRY
              </p>
              <h2
                id="enquiry-heading"
                className="text-[30px] lg:text-[clamp(38px,3vw,42px)] font-normal leading-[1.06] tracking-[-0.015em] text-white max-w-[420px]"
                style={{ fontFamily: SERIF }}
              >
                Tell us what&#8217;s happening with the rent. We&#8217;ll work out what needs attention.
              </h2>
              <p
                className="mt-[15px] text-[15.5px] lg:text-[17px] font-[500] leading-[1.55] text-[#C8D3E3] max-w-[420px]"
                style={{ fontFamily: SANS }}
              >
                If you completed the Rent &amp; TDS Check, those answers will come through with your enquiry.
              </p>
              <ul className="mt-[24px] space-y-[14px]">
                {[
                  "You don’t need to identify the right professional yourself.",
                  "Unusual situations are still worth telling us about.",
                  "Reeve reviews the work before confirming scope and quote.",
                ].map((text) => (
                  <li key={text} className="flex items-start gap-[10px]">
                    <span
                      className="mt-[2px] w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center"
                      style={{ background: "rgba(185,242,39,.12)" }}
                    >
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                        <path
                          d="M2 5.5L4 7.5L8.5 3"
                          stroke="#B9F227"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                    <span
                      className="text-[14px] font-[500] leading-[1.45] text-[#E8EEF7]"
                      style={{ fontFamily: SANS }}
                    >
                      {text}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Right column — col 2, rows 1–2 */}
            <div className="mt-8 lg:mt-0 lg:col-start-2 lg:row-start-1 lg:row-span-2">
              {/* Form card */}
              <div
                className="rounded-[18px] lg:rounded-[22px] border border-[#E8E6E1] shadow-[0_26px_70px_rgba(0,0,0,.22)]"
                style={{ background: "#FFFDFC" }}
              >
                <div className="p-5 sm:p-7 lg:p-8">
                  <PropertyEnquiryForm
                    initialService="nri_rent_tds"
                    rentTdsCheck={toRentTdsCheckContext(tdsAnswers)}
                    onRemoveRentTdsCheck={onRemoveTdsCheck}
                  />
                </div>
              </div>

            </div>

            {/* Next-property decision — col 1, row 2 on desktop */}
            <div className="mt-[28px] lg:mt-0 lg:col-start-1 lg:row-start-2 lg:pt-[32px]">
              <h3
                className="text-[26px] lg:text-[30px] font-normal leading-[1.10] text-[#F8FAFC] mb-[14px]"
                style={{ fontFamily: SERIF }}
              >
                What happens with the property next?
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-[10px] sm:gap-[12px] lg:gap-[10px]">

                  {/* REEVE MANAGED (2.5D slab) */}
                  <div className="relative overflow-visible">
                    <div
                      aria-hidden="true"
                      className="absolute inset-0 rounded-[16px] translate-x-[2px] translate-y-[3px] pointer-events-none"
                      style={{ background: "linear-gradient(135deg,rgba(37,99,235,.24),rgba(20,184,166,.16))" }}
                    />
                    <div
                      className="nri-band6-decision relative rounded-[16px] p-[15px]"
                      style={{
                        background: "linear-gradient(135deg,rgba(37,99,235,.20),rgba(20,184,166,.08))",
                        border: "1px solid rgba(103,232,249,.22)",
                      }}
                    >
                      <div
                        className="w-[34px] h-[34px] rounded-[9px] flex items-center justify-center mb-[10px]"
                        style={{ background: "rgba(103,232,249,.10)", border: "1px solid rgba(103,232,249,.20)" }}
                      >
                        <House size={15} color="#67E8F9" aria-hidden="true" />
                      </div>
                      <p
                        className="uppercase mb-1"
                        style={{ fontFamily: SANS, fontSize: 10.5, fontWeight: 700, letterSpacing: "0.09em", color: "#67E8F9" }}
                      >
                        REEVE MANAGED
                      </p>
                      <p style={{ fontFamily: SANS, fontSize: 18, fontWeight: 650, color: "#FFFFFF", lineHeight: 1.3 }}>
                        Keeping the tenant?
                      </p>
                      <p className="mt-1" style={{ fontFamily: SANS, fontSize: 13.5, color: "#C8D3E3", lineHeight: 1.45 }}>
                        Have Reeve handle the ongoing property and tenant coordination.
                      </p>
                      <a
                        href="/property-management-bangalore"
                        className="nri-band6-link inline-flex items-center min-h-[44px] mt-[10px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#67E8F9] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A263B]"
                        style={{ fontFamily: SANS, fontSize: 13.5, fontWeight: 600, color: "#67E8F9" }}
                      >
                        See Reeve Managed
                        <span aria-hidden="true" className="nri-band6-arrow ml-1 inline-block">&rarr;</span>
                      </a>
                    </div>
                  </div>

                  {/* REEVE LET (quieter card) */}
                  <div
                    className="nri-band6-decision rounded-[16px] p-[15px]"
                    style={{
                      background: "linear-gradient(135deg,rgba(255,255,255,.065),rgba(20,184,166,.055))",
                      border: "1px solid rgba(255,255,255,.14)",
                    }}
                  >
                    <div
                      className="w-[34px] h-[34px] rounded-[9px] flex items-center justify-center mb-[10px]"
                      style={{ background: "rgba(20,184,166,.10)", border: "1px solid rgba(103,232,249,.17)" }}
                    >
                      <UserRound size={15} color="#5EEAD4" aria-hidden="true" />
                    </div>
                    <p
                      className="uppercase mb-1"
                      style={{ fontFamily: SANS, fontSize: 10.5, fontWeight: 700, letterSpacing: "0.09em", color: "#5EEAD4" }}
                    >
                      REEVE LET
                    </p>
                    <p style={{ fontFamily: SANS, fontSize: 18, fontWeight: 650, color: "#FFFFFF", lineHeight: 1.3 }}>
                      Tenant leaving?
                    </p>
                    <p className="mt-1" style={{ fontFamily: SANS, fontSize: 13.5, color: "#C8D3E3", lineHeight: 1.45 }}>
                      Find, screen and move in the next tenant.
                    </p>
                    <a
                      href="/find-tenant-bangalore"
                      className="nri-band6-link inline-flex items-center min-h-[44px] mt-[10px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5EEAD4] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A263B]"
                      style={{ fontFamily: SANS, fontSize: 13.5, fontWeight: 600, color: "#5EEAD4" }}
                    >
                      Find the next tenant
                      <span aria-hidden="true" className="nri-band6-arrow ml-1 inline-block">&rarr;</span>
                    </a>
                  </div>

                </div>

                {/* Contextual routes */}
                <div
                  className="mt-[18px] pt-[14px] flex flex-col gap-[6px]"
                  style={{ borderTop: "1px solid rgba(255,255,255,.10)" }}
                >
                  <p style={{ fontFamily: SANS, fontSize: 13.5, color: "#AFC0D4", lineHeight: 1.5 }}>
                    Thinking of selling instead?{" "}
                    <a
                      href="/nri-property-sale-india"
                      className="inline-flex min-h-[44px] items-center font-[600] text-[#67E8F9] hover:underline focus-visible:underline focus-visible:outline-none"
                      style={{ fontFamily: SANS }}
                    >
                      NRI Property Sale &rarr;
                    </a>
                  </p>
                  <a
                    href="/nri-property-services-india"
                    className="inline-flex min-h-[44px] items-center font-[600] text-[#67E8F9] hover:underline focus-visible:underline focus-visible:outline-none"
                    style={{ fontFamily: SANS, fontSize: 13.5 }}
                  >
                    Explore NRI Property Services &rarr;
                  </a>
                </div>
              </div>

          </div>
        </div>
      </section>
    </>
  );
}
