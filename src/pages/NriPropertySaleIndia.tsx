import { useRef, useState, useEffect } from "react";
import {
  Globe, MapPin, ShieldCheck,
  Check, X, CircleHelp, AlertTriangle, FileText, Users, PenLine, Scale,
  FileCheck, Camera, UserSearch, MessageSquare, Network, FileSignature, KeyRound, Landmark,
  UserRound, IndianRupee, ReceiptText, WalletCards,
  HandCoins, Clock4, ArrowRight,
} from "lucide-react";
import Layout from "@/components/Layout";
import PropertyEnquiryForm, {
  type SaleReadinessContext,
} from "@/components/property-services/PropertyEnquiryForm";

const SERIF = "'Instrument Serif', Georgia, serif";
const SANS  = "'DM Sans', system-ui, sans-serif";

// ── Band 3 stage data ──────────────────────────────────────────────────────────
const STAGES = [
  { num: "01", title: "Prepare",       purpose: "Property & document readiness",          description: "Identify what is available, what may need attention and which professionals need to be involved.",                                                                          accent: "#60A5FA", Icon: FileCheck     },
  { num: "02", title: "Present",       purpose: "Prepare the property for buyers",        description: "For Bangalore properties, coordinate professional photography/video and clear buyer-facing property information.",                                                          accent: "#22D3EE", Icon: Camera        },
  { num: "03", title: "Find & screen", purpose: "Manage buyer interest",                  description: "Coordinate enquiries, basic buyer screening and property viewings in Bangalore.",                                                                                            accent: "#38BDF8", Icon: UserSearch    },
  { num: "04", title: "Evaluate",      purpose: "Offers come back to you",                description: "For Bangalore properties, Reeve relays buyer offers and can provide reasonable market/comparable context.",                                                                 accent: "#FB923C", Icon: MessageSquare },
  { num: "05", title: "Coordinate",    purpose: "Keep every party connected",             description: "Coordinate information and document exchange among the buyer, advocate, CA, bank and other professionals involved.",                                                         accent: "#A78BFA", Icon: Network       },
  { num: "06", title: "Complete",      purpose: "Signing & registration coordination",    description: "Coordinate practical signing and registration steps, including remote-owner arrangements where applicable.",                                                                  accent: "#2DD4BF", Icon: FileSignature },
] as const;

// ── Band 4 constants ───────────────────────────────────────────────────────────
const TAX_MONEY_STYLE = `
  @media (hover: hover) and (prefers-reduced-motion: no-preference) {
    .group:hover .nri-money-tile {
      box-shadow:
        0 12px 28px rgba(15,23,42,.14),
        0 0 0 3px var(--money-accent-hover) !important;
    }
  }
`;

const MONEY_FLOW = [
  { num: "01", label: "BUYER",                descriptor: "Buyer-side payment and documents",           labelAccent: "#2563EB", connectorAccent: "#2563EB", Icon: UserRound   },
  { num: "02", label: "SALE CONSIDERATION",   descriptor: "Transaction amount + payment terms",         labelAccent: "#0369A1", connectorAccent: "#0284C7", Icon: IndianRupee },
  { num: "03", label: "TAX / WITHHOLDING",    descriptor: "Applicable process, where required",         labelAccent: "#C2410C", connectorAccent: "#F97316", Icon: ReceiptText },
  { num: "04", label: "SELLER",               descriptor: "Receives the amount payable",                labelAccent: "#0F766E", connectorAccent: "#14B8A6", Icon: WalletCards },
  { num: "05", label: "BANKING / REMITTANCE", descriptor: "Documentation coordination, where relevant", labelAccent: "#6D28D9", connectorAccent: "#7C3AED", Icon: Landmark    },
] as const;

const EXPLANATIONS = [
  { dt: "Sale consideration",   dd: "The agreed transaction amount and payment terms shape the money flow between buyer and seller." },
  { dt: "Tax coordination",     dd: "Where withholding or other tax steps apply, Reeve can coordinate the relevant CA for computation, documentation and filings." },
  { dt: "Buyer coordination",   dd: "Reeve can help keep the buyer side and relevant professionals aligned on required documents and transaction steps." },
  { dt: "Banking / remittance", dd: "Where relevant, Reeve can coordinate the documentation needed for banking or remittance after the sale." },
];

// ── Band 2 types ───────────────────────────────────────────────────────────────
type ReadinessAnswer = "yes" | "no" | "unsure";
type ReadinessKey = "titleDocuments" | "ownershipRecords" | "duesCurrent" | "ownersAligned" | "executionPlan";
type SaleReadinessAnswers = Partial<Record<ReadinessKey, ReadinessAnswer>>;

const QUESTIONS: { key: ReadinessKey; num: string; question: string; helper: string }[] = [
  {
    key: "titleDocuments",
    num: "01",
    question: "Do you have the main title/ownership documents for the property?",
    helper: "For example, the sale deed or other document through which the current owner acquired the property.",
  },
  {
    key: "ownershipRecords",
    num: "02",
    question: "Do the current property records reflect the owner who will be selling?",
    helper: "This may include Khata, mutation, municipal or revenue records, depending on the property and location.",
  },
  {
    key: "duesCurrent",
    num: "03",
    question: "Are property-related dues reasonably up to date?",
    helper: "For example, property tax or other applicable property dues.",
  },
  {
    key: "ownersAligned",
    num: "04",
    question: "Are all owners or relevant heirs aligned on the sale?",
    helper: "This can matter for jointly owned, inherited or succession-related properties.",
  },
  {
    key: "executionPlan",
    num: "05",
    question: "Do you know how the sale documents will be signed and registration handled?",
    helper: "For example, travelling to India or using an appropriately prepared Power of Attorney where appropriate.",
  },
];

const FLAGGED_LABELS: Record<ReadinessKey, string> = {
  titleDocuments: "Title documents",
  ownershipRecords: "Ownership records",
  duesCurrent: "Property dues",
  ownersAligned: "Owners / heirs",
  executionPlan: "Signing & registration plan",
};

const REVEAL_STYLE = `
  @keyframes nriSaleReveal {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .nri-sale-result-reveal {
    animation: nriSaleReveal 220ms ease-out both;
  }
  @media (prefers-reduced-motion: reduce) {
    .nri-sale-result-reveal {
      animation: none;
    }
  }
  @media (hover: hover) and (prefers-reduced-motion: no-preference) {
    .group:hover .nri-stage-plate {
      box-shadow:
        inset 0 1px 0 rgba(255,255,255,.22),
        0 14px 34px rgba(2,6,23,.50),
        0 0 0 4px rgba(255,255,255,.06) !important;
    }
  }
  @media (min-width: 1200px) {
    .nri-journey-callout-anchor {
      position: absolute;
      left: calc(58.333333% - 134px);
      bottom: 8px;
      width: 268px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
  }
`;

// ── Band 1 ─────────────────────────────────────────────────────────────────────
function NriSaleHeroSection() {
  return (
    <section
      id="hero"
      aria-labelledby="nri-property-sale-title"
      style={{
        background: `
          radial-gradient(38% 48% at 61% 46%, rgba(37,99,235,.10), transparent 70%),
          radial-gradient(42% 55% at 93% 88%, rgba(34,211,238,.16) 0%, rgba(34,211,238,.05) 44%, transparent 74%),
          radial-gradient(52% 72% at 94% 5%, rgba(124,58,237,.30) 0%, rgba(124,58,237,.11) 42%, transparent 72%),
          linear-gradient(125deg, #07101F 0%, #0A1430 46%, #12183D 74%, #171843 100%)
        `,
      }}
    >
      <div className="max-w-[1320px] mx-auto px-5 sm:px-8 lg:px-12">
        <div className="lg:grid lg:grid-cols-[minmax(0,1.15fr)_minmax(400px,.85fr)] lg:gap-10 lg:items-start">

          {/* ── Left copy column ── */}
          <div className="pt-[44px] sm:pt-[52px] lg:pt-[80px] lg:pb-[68px]">

            <p
              className="text-[12px] lg:text-[13px] font-[600] uppercase tracking-[0.11em] text-[#67E8F9]"
              style={{ fontFamily: SANS }}
            >
              NRI PROPERTY SALE · INDIA
            </p>

            <h1
              id="nri-property-sale-title"
              className="mt-[14px] text-[clamp(39px,10.8vw,47px)] lg:text-[clamp(50px,4.3vw,68px)] text-[#F8FAFC] max-w-[690px]"
              style={{ fontFamily: SERIF, fontWeight: 400, lineHeight: 1.02, letterSpacing: "-0.018em" }}
            >
              Sell your property in India, even when you live abroad.
            </h1>

            <p
              className="mt-[18px] lg:mt-[20px] text-[18px] sm:text-[20px] lg:text-[clamp(22px,1.7vw,25px)] text-[#EDF3FC] max-w-[625px]"
              style={{ fontFamily: SANS, fontWeight: 600, lineHeight: 1.26 }}
            >
              One point of coordination for sale readiness, documents, professionals, buyers and execution.
            </p>

            <p
              className="mt-[14px] lg:mt-[16px] text-[15px] lg:text-[clamp(16px,1.1vw,17px)] text-[#C5D1E3] max-w-[650px]"
              style={{ fontFamily: SANS, fontWeight: 450, lineHeight: 1.57 }}
            >
              Across India, Reeve helps NRI owners prepare a property for sale, identify issues that could delay the transaction, and coordinate the people and documents involved. In Bangalore, we can also handle photography, buyer enquiries, viewings and on-ground execution.
            </p>

            {/* Geographic scope rail */}
            <div
              role="group"
              aria-label="Service coverage"
              className="mt-[24px] rounded-2xl border border-[rgba(255,255,255,.105)] bg-[rgba(255,255,255,.045)] p-[15px] lg:p-[17px]"
            >
              <div className="flex flex-col sm:grid sm:grid-cols-2">
                <div className="flex items-start gap-3 pb-[13px] sm:pb-0 sm:pr-[17px] border-b border-[rgba(255,255,255,.08)] sm:border-b-0 sm:border-r sm:border-[rgba(255,255,255,.08)]">
                  <span className="shrink-0 rounded-xl bg-[rgba(255,255,255,.06)] p-[7px]">
                    <Globe size={18} color="#67E8F9" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-[14px] text-[#F8FAFC]" style={{ fontFamily: SANS, fontWeight: 650 }}>Anywhere in India</p>
                    <p className="mt-[2px] text-[13px] text-[#BCC9DA]" style={{ fontFamily: SANS }}>Sale readiness · documents · tax coordination · advocate coordination</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 pt-[13px] sm:pt-0 sm:pl-[17px]">
                  <span className="shrink-0 rounded-xl bg-[rgba(255,255,255,.06)] p-[7px]">
                    <MapPin size={18} color="#C4B5FD" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-[14px] text-[#F8FAFC]" style={{ fontFamily: SANS, fontWeight: 650 }}>Bangalore</p>
                    <p className="mt-[2px] text-[13px] text-[#BCC9DA]" style={{ fontFamily: SANS }}>Everything above + photography · buyer enquiries · viewings · on-ground execution</p>
                  </div>
                </div>
              </div>
            </div>

            {/* CTA row */}
            <div className="mt-[22px] lg:mt-[24px] flex flex-col sm:flex-row gap-3">
              <a
                href="#sale-readiness"
                className="group inline-flex min-h-[52px] items-center justify-center gap-2 w-full sm:w-auto rounded-xl px-[22px] bg-[#2563EB] text-white hover:bg-[#1D4ED8] active:bg-[#1E40AF] transition-[background-color,border-color,color,box-shadow] duration-[160ms] hover:shadow-[0_7px_20px_rgba(37,99,235,.28)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#67E8F9] motion-reduce:transition-none"
                style={{ fontFamily: SANS, fontWeight: 600, fontSize: 15 }}
              >
                Check if your property is sale-ready{" "}
                <span className="transition-transform duration-[160ms] group-hover:translate-y-0.5 motion-reduce:transform-none motion-reduce:transition-none" aria-hidden="true">↓</span>
              </a>
              <a
                href="#enquiry"
                className="group inline-flex min-h-[52px] items-center justify-center gap-2 w-full sm:w-auto rounded-xl px-[22px] border border-[rgba(147,197,253,.25)] text-[#BFDBFE] hover:bg-[rgba(255,255,255,.055)] transition-[background-color,border-color,color,box-shadow] duration-[160ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#67E8F9] motion-reduce:transition-none"
                style={{ fontFamily: SANS, fontWeight: 500, fontSize: 15 }}
              >
                Start a sale enquiry{" "}
                <span className="transition-transform duration-[160ms] group-hover:translate-x-0.5 motion-reduce:transform-none motion-reduce:transition-none" aria-hidden="true">→</span>
              </a>
            </div>

            {/* Trust line */}
            <div className="mt-[12px] lg:mt-[14px] flex items-center gap-[7px]">
              <ShieldCheck size={14} color="#AAB8CB" aria-hidden="true" className="shrink-0" />
              <p className="text-[13.5px] text-[#AAB8CB]" style={{ fontFamily: SANS, fontWeight: 500 }}>
                You decide whether to sell, the asking price and which offers to accept.
              </p>
            </div>

          </div>

          {/* ── Right column: dot grid + image ── */}
          <div className="relative flex items-start justify-center pt-[40px] lg:pt-[60px] pb-[44px] lg:pb-[68px]">
            <div
              className="absolute inset-0 hidden lg:block pointer-events-none"
              aria-hidden="true"
              style={{
                backgroundImage: "radial-gradient(circle, rgba(255,255,255,.035) 1px, transparent 1px)",
                backgroundSize: "28px 28px",
                maskImage: "linear-gradient(to right, transparent 0%, black 35%)",
                WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 35%)",
                zIndex: 0,
              }}
            />
            <img
              src="/images/nrisale_1.webp"
              alt="Reeve coordinating an NRI property sale from abroad across property readiness, professionals and the buyer process."
              width={1122}
              height={1402}
              loading="eager"
              fetchPriority="high"
              decoding="async"
              className="h-auto w-[min(86vw,320px)] md:w-[min(55vw,380px)] lg:w-full object-contain"
              style={{ maxWidth: 520, position: "relative", zIndex: 1 }}
            />
          </div>

        </div>
      </div>
    </section>
  );
}

// ── Band 2 ─────────────────────────────────────────────────────────────────────
interface ReadinessSectionProps {
  answers: SaleReadinessAnswers;
  onAnswer: (key: ReadinessKey, value: ReadinessAnswer) => void;
}

function NriSaleReadinessSection({ answers, onAnswer }: ReadinessSectionProps) {
  const answeredCount = QUESTIONS.filter(q => answers[q.key] !== undefined).length;
  const allComplete = answeredCount === 5;
  const allYes = allComplete && QUESTIONS.every(q => answers[q.key] === "yes");
  const flaggedKeys = QUESTIONS.filter(q => answers[q.key] === "no" || answers[q.key] === "unsure").map(q => q.key);
  const resultKey = QUESTIONS.map(q => answers[q.key] ?? "").join("|");

  return (
    <section
      id="sale-readiness"
      aria-labelledby="sale-readiness-title"
      className="scroll-mt-16 pb-[64px] lg:pb-[96px]"
      style={{
        background: `
          radial-gradient(42% 35% at 50% 46%, rgba(37,99,235,.055), transparent 75%),
          radial-gradient(42% 46% at 4% 12%, rgba(34,211,238,.10) 0%, rgba(34,211,238,.035) 46%, transparent 72%),
          radial-gradient(40% 48% at 96% 8%, rgba(124,58,237,.10) 0%, rgba(124,58,237,.03) 48%, transparent 72%),
          linear-gradient(180deg, #F4F7FF 0%, #FBFCFF 38%, #FFFFFF 72%, #FAFBFF 100%)
        `,
      }}
    >
      <style>{REVEAL_STYLE}</style>

      <div className="max-w-[1320px] mx-auto px-5 sm:px-8 lg:px-12">

        {/* ── Intro ── */}
        <div className="pt-[58px] sm:pt-[68px] lg:pt-[96px] md:text-center">
          <p
            className="text-[12px] lg:text-[13px] font-[700] uppercase tracking-[0.11em] text-[#2563EB]"
            style={{ fontFamily: SANS }}
          >
            SALE READINESS
          </p>
          <h2
            id="sale-readiness-title"
            className="mt-[12px] text-[clamp(34px,9vw,41px)] lg:text-[clamp(44px,3.7vw,58px)] text-[#101828] max-w-[900px] md:mx-auto"
            style={{ fontFamily: SERIF, fontWeight: 400, lineHeight: 1.04, letterSpacing: "-0.015em" }}
          >
            Before you find a buyer, find what could stop the sale.
          </h2>
          <p
            className="mt-[14px] text-[15.5px] lg:text-[18px] text-[#526174] max-w-[680px] md:mx-auto"
            style={{ fontFamily: SANS, fontWeight: 450, lineHeight: 1.55 }}
          >
            A buyer can be interested and the transaction can still stall later. Check five basics that commonly matter before an NRI property sale moves forward.
          </p>
        </div>

        {/* ── Assessment Console ── */}
        <div className="relative max-w-[1120px] mx-auto mt-[28px] lg:mt-[40px]">

          {/* 2.5D depth layer */}
          <div
            className="absolute inset-0 translate-x-[6px] translate-y-[8px] rounded-[26px] pointer-events-none z-0"
            aria-hidden="true"
            style={{ background: "linear-gradient(135deg, rgba(34,211,238,.28), rgba(37,99,235,.18) 48%, rgba(124,58,237,.22))" }}
          />

          {/* Console surface */}
          <div
            className="relative z-[1] bg-white border border-[#DFE6F1] rounded-[20px] lg:rounded-[24px]"
            style={{ boxShadow: "0 24px 70px rgba(15,23,42,.09), 0 4px 12px rgba(15,23,42,.045)" }}
          >

            {/* Console header */}
            <div className="px-[20px] sm:px-[26px] lg:px-[30px] py-[16px] lg:py-[18px] border-b border-[#E8EDF4]">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-[10px]">

                {/* Left: label + reassurance */}
                <div>
                  <p
                    className="text-[12px] lg:text-[13px] font-[700] tracking-[0.08em] text-[#4F46E5]"
                    style={{ fontFamily: SANS }}
                  >
                    30-SECOND SALE READINESS CHECK
                  </p>
                  <p
                    className="mt-[3px] text-[13px] lg:text-[13.5px] text-[#64748B]"
                    style={{ fontFamily: SANS }}
                  >
                    5 questions · No login or email · &ldquo;Not sure&rdquo; is a valid answer
                  </p>
                </div>

                {/* Right: count + segments */}
                <div className="flex flex-col items-stretch gap-[6px] sm:flex-row sm:items-center sm:gap-[12px] sm:shrink-0">
                  <p
                    className="text-[13px] text-[#64748B] sm:whitespace-nowrap"
                    style={{ fontFamily: SANS }}
                    aria-live="polite"
                  >
                    {answeredCount} of 5 answered
                  </p>
                  <div className="flex gap-[5px] w-full sm:w-[160px]" aria-hidden="true">
                    {QUESTIONS.map((q, i) => {
                      const answered = answers[q.key] !== undefined;
                      return (
                        <div key={i} className="flex-1 h-[4px] rounded-full bg-[#E7ECF4] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-[#2563EB] to-[#6366F1] origin-left transition-transform duration-[180ms] motion-reduce:transition-none"
                            style={{ transform: answered ? "scaleX(1)" : "scaleX(0)" }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            </div>

            {/* Questions */}
            {QUESTIONS.map((q, idx) => {
              const isAnswered = answers[q.key] !== undefined;
              const isLast = idx === QUESTIONS.length - 1;
              return (
                <fieldset key={q.key} aria-describedby={`help-${q.key}`} className="border-0 p-0 m-0">
                  <legend className="sr-only">{q.question}</legend>

                  <div className={`flex flex-col lg:grid lg:grid-cols-[42px_minmax(0,1fr)_minmax(280px,310px)] lg:items-center lg:gap-4 px-4 lg:px-[30px] py-[18px] lg:py-[22px]${isLast ? "" : " border-b border-[#E8EDF4]"}`}>

                    {/* Number circle */}
                    <div className="shrink-0 mb-[10px] lg:mb-0 w-8 h-8 rounded-full relative overflow-hidden flex items-center justify-center border transition-[border-color] duration-[160ms] motion-reduce:transition-none"
                      style={{ borderColor: isAnswered ? "transparent" : "#DDE3FF", backgroundColor: "#EEF2FF" }}>
                      <div
                        className="absolute inset-0 rounded-full bg-gradient-to-br from-[#2563EB] to-[#6366F1] transition-opacity duration-[160ms] motion-reduce:transition-none"
                        style={{ opacity: isAnswered ? 1 : 0 }}
                      />
                      <span
                        className="relative z-[1] text-[11px] font-[700] transition-colors duration-[160ms] motion-reduce:transition-none"
                        style={{ fontFamily: SANS, color: isAnswered ? "#FFFFFF" : "#4F46E5" }}
                      >
                        {q.num}
                      </span>
                    </div>

                    {/* Question + helper */}
                    <div className="min-w-0 mb-[12px] lg:mb-0">
                      <p
                        className="text-[16px] lg:text-[17px] text-[#172033]"
                        style={{ fontFamily: SANS, fontWeight: 650 }}
                        aria-hidden="true"
                      >
                        {q.question}
                      </p>
                      <p
                        id={`help-${q.key}`}
                        className="mt-[5px] text-[13px] lg:text-[13.5px] text-[#64748B]"
                        style={{ fontFamily: SANS, lineHeight: 1.45 }}
                      >
                        {q.helper}
                      </p>
                    </div>

                    {/* Answer controls */}
                    <div className="grid grid-cols-3 gap-[6px] lg:gap-[8px]">
                      {(["yes", "no", "unsure"] as ReadinessAnswer[]).map((val) => {
                        const selected = answers[q.key] === val;
                        const labelMap = { yes: "Yes", no: "No", unsure: "Not sure" };

                        let bgColor = "#FFFFFF";
                        let borderColor = "#D7DFEA";
                        let textColor = "#475569";
                        if (selected) {
                          if (val === "yes")    { bgColor = "#ECFDF5"; borderColor = "#14B8A6"; textColor = "#0F766E"; }
                          if (val === "no")     { bgColor = "#FFF3EC"; borderColor = "#F97316"; textColor = "#B93815"; }
                          if (val === "unsure") { bgColor = "#F5F3FF"; borderColor = "#8B5CF6"; textColor = "#6D28D9"; }
                        }

                        return (
                          <label
                            key={val}
                            className="cursor-pointer min-h-[44px] lg:min-h-[46px] rounded-[10px] border flex items-center justify-center gap-[4px] text-[12.5px] sm:text-[13px] select-none transition-[background-color,border-color,color,box-shadow] duration-[160ms] motion-reduce:transition-none focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#2563EB] hover:brightness-[.97]"
                            style={{
                              fontFamily: SANS,
                              fontWeight: selected ? 600 : 500,
                              backgroundColor: bgColor,
                              borderColor,
                              color: textColor,
                            }}
                          >
                            <input
                              type="radio"
                              className="sr-only"
                              name={`q-${q.key}`}
                              value={val}
                              checked={selected}
                              onChange={() => onAnswer(q.key, val)}
                            />
                            <span
                              className="transition-[opacity,transform] duration-[160ms] motion-reduce:transition-none"
                              style={{ opacity: selected ? 1 : 0, transform: selected ? "scale(1)" : "scale(0.92)", display: "flex" }}
                              aria-hidden="true"
                            >
                              {val === "yes"    && <Check size={13} />}
                              {val === "no"     && <X size={13} />}
                              {val === "unsure" && <CircleHelp size={13} />}
                            </span>
                            {labelMap[val]}
                          </label>
                        );
                      })}
                    </div>

                  </div>
                </fieldset>
              );
            })}

            {/* Result panel */}
            <div aria-live="polite" aria-atomic="true">
              {allComplete && (
                <div
                  key={resultKey}
                  className="nri-sale-result-reveal border-t border-[#E8EDF4] rounded-b-[20px] lg:rounded-b-[24px] overflow-hidden"
                >
                  {allYes ? (
                    /* ── All-Yes ── */
                    <div
                      className="flex flex-col lg:grid lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,.9fr)] lg:gap-8 p-[20px] lg:p-[28px]"
                      style={{ background: "linear-gradient(135deg, #ECFDF5 0%, #F0FDFA 100%)", borderLeft: "4px solid #14B8A6" }}
                    >
                      <div>
                        <div className="flex items-center gap-[8px] mb-[8px]">
                          <ShieldCheck size={18} color="#14B8A6" aria-hidden="true" />
                          <p className="text-[18px] lg:text-[20px] text-[#101828]" style={{ fontFamily: SERIF, fontWeight: 400 }}>
                            You have the main basics covered.
                          </p>
                        </div>
                        <p className="text-[14px] text-[#475569]" style={{ fontFamily: SANS, lineHeight: 1.55 }}>
                          That is a good starting point. The property and documents would still need to be reviewed before the transaction progresses.
                        </p>
                      </div>
                      <div className="mt-[16px] lg:mt-0 flex items-start lg:items-center lg:justify-end">
                        <ResultCta />
                      </div>
                    </div>
                  ) : (
                    /* ── Flagged ── */
                    <div
                      className="p-[20px] lg:p-[28px]"
                      style={{ background: "linear-gradient(135deg, #FFF7ED 0%, #FFF9F5 100%)", borderLeft: "4px solid #F97316" }}
                    >
                      <div className="flex flex-col lg:grid lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,.9fr)] lg:gap-8">

                        {/* Left: heading + flagged items */}
                        <div>
                          <div className="flex items-center gap-[8px] mb-[10px]">
                            <AlertTriangle size={18} color="#F97316" aria-hidden="true" />
                            <p className="text-[18px] lg:text-[20px] text-[#101828]" style={{ fontFamily: SERIF, fontWeight: 400 }}>
                              A few things are worth checking before the sale progresses.
                            </p>
                          </div>
                          <p className="text-[12px] font-[700] uppercase tracking-[0.07em] text-[#F97316] mb-[8px]" style={{ fontFamily: SANS }}>
                            Worth checking
                          </p>
                          <div className="flex flex-col divide-y divide-[#FED7AA]">
                            {flaggedKeys.map((key, i) => (
                              <div key={i} className="flex items-center justify-between py-[7px] gap-4">
                                <p className="text-[13.5px] text-[#475569]" style={{ fontFamily: SANS }}>{FLAGGED_LABELS[key]}</p>
                                <p className="text-[12.5px] font-[600] shrink-0" style={{ fontFamily: SANS, color: answers[key] === "no" ? "#B93815" : "#6D28D9" }}>
                                  {answers[key] === "no" ? "No" : "Not sure"}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Right: reassurance + CTA */}
                        <div className="mt-[16px] lg:mt-0 flex flex-col justify-between gap-[12px]">
                          <div>
                            <p className="text-[14px] text-[#475569]" style={{ fontFamily: SANS, lineHeight: 1.55 }}>
                              A flagged item does not mean the property cannot be sold. It means it is worth clarifying early.
                            </p>
                            <p className="mt-[8px] text-[14px] text-[#475569]" style={{ fontFamily: SANS, lineHeight: 1.55 }}>
                              Reeve can help coordinate these items before or alongside the sale process.
                            </p>
                          </div>
                          <ResultCta />
                        </div>

                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>
          {/* End console surface */}
        </div>
        {/* End console wrapper */}

        {/* ── Explainer panel ── */}
        <div
          className="mt-[22px] max-w-[1120px] mx-auto rounded-[20px] border border-[#DCE5F2] p-[22px] lg:p-[30px]"
          style={{ background: "linear-gradient(135deg, #EEF4FF 0%, #F6F4FF 54%, #F0FDFA 100%)" }}
        >
          <p
            className="text-[clamp(23px,5vw,25px)] lg:text-[clamp(25px,2vw,28px)] text-[#172033]"
            style={{ fontFamily: SERIF, fontWeight: 400 }}
          >
            The five questions are only a first screen.
          </p>
          <p
            className="mt-[10px] text-[14px] lg:text-[15px] text-[#526174]"
            style={{ fontFamily: SANS, lineHeight: 1.55 }}
          >
            A fuller sale-readiness review depends on the property, ownership history and location. It may involve:
          </p>

          {/* Three groups */}
          <div className="mt-[20px] flex flex-col lg:grid lg:grid-cols-3 lg:gap-0">

            {/* Group 1 */}
            <div className="pb-[16px] lg:pb-0 lg:pr-[24px] border-b border-[#DCE5F2] lg:border-b-0 lg:border-r lg:border-[#DCE5F2]">
              <div className="flex items-center gap-[8px] mb-[8px]">
                <span className="rounded-[8px] p-[6px]" style={{ background: "rgba(37,99,235,.07)" }}>
                  <FileText size={16} color="#2563EB" aria-hidden="true" />
                </span>
                <p className="text-[11.5px] font-[700] uppercase tracking-[0.08em] text-[#2563EB]" style={{ fontFamily: SANS }}>DOCUMENTS &amp; RECORDS</p>
              </div>
              <p className="text-[13.5px] lg:text-[14px] text-[#475569]" style={{ fontFamily: SANS, lineHeight: 1.55 }}>
                Title document availability · ownership chain · Encumbrance Certificate where applicable · Khata, mutation, municipal or revenue records · approved plans · occupancy/completion documents where relevant
              </p>
            </div>

            {/* Group 2 */}
            <div className="pt-[16px] pb-[16px] lg:py-0 lg:px-[24px] border-b border-[#DCE5F2] lg:border-b-0 lg:border-r lg:border-[#DCE5F2]">
              <div className="flex items-center gap-[8px] mb-[8px]">
                <span className="rounded-[8px] p-[6px]" style={{ background: "rgba(124,58,237,.07)" }}>
                  <Users size={16} color="#7C3AED" aria-hidden="true" />
                </span>
                <p className="text-[11.5px] font-[700] uppercase tracking-[0.08em] text-[#7C3AED]" style={{ fontFamily: SANS }}>OWNERSHIP &amp; DUES</p>
              </div>
              <p className="text-[13.5px] lg:text-[14px] text-[#475569]" style={{ fontFamily: SANS, lineHeight: 1.55 }}>
                Property-tax status · inheritance/succession documentation · co-owner alignment · society/association documentation where relevant
              </p>
            </div>

            {/* Group 3 */}
            <div className="pt-[16px] lg:pt-0 lg:pl-[24px]">
              <div className="flex items-center gap-[8px] mb-[8px]">
                <span className="rounded-[8px] p-[6px]" style={{ background: "rgba(15,118,110,.07)" }}>
                  <PenLine size={16} color="#0F766E" aria-hidden="true" />
                </span>
                <p className="text-[11.5px] font-[700] uppercase tracking-[0.08em] text-[#0F766E]" style={{ fontFamily: SANS }}>SIGNING &amp; EXECUTION</p>
              </div>
              <p className="text-[13.5px] lg:text-[14px] text-[#475569]" style={{ fontFamily: SANS, lineHeight: 1.55 }}>
                Power of Attorney, signing and travel arrangements where appropriate
              </p>
            </div>

          </div>

          {/* Professional boundary */}
          <div className="border-t border-[#DCE5F2] mt-[20px] pt-[16px] flex items-start gap-[10px]">
            <Scale size={16} color="#94A3B8" aria-hidden="true" className="shrink-0 mt-[1px]" />
            <p className="text-[13px] lg:text-[13.5px] text-[#475569]" style={{ fontFamily: SANS, lineHeight: 1.55 }}>
              Reeve can help collect, organize and coordinate document review. Legal conclusions on title or ownership are provided by the appropriate advocate.
            </p>
          </div>

        </div>
        {/* End explainer */}

      </div>
    </section>
  );
}

function ResultCta() {
  return (
    <a
      href="#sale-journey"
      className="group inline-flex min-h-[48px] items-center justify-center gap-[6px] w-full sm:w-auto rounded-[11px] px-[20px] bg-[#2563EB] text-white hover:bg-[#1D4ED8] active:bg-[#1E40AF] transition-[background-color,border-color,color,box-shadow] duration-[160ms] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB] motion-reduce:transition-none"
      style={{ fontFamily: SANS, fontWeight: 600, fontSize: 14.5 }}
    >
      Continue to the sale process{" "}
      <span className="transition-transform duration-[160ms] group-hover:translate-y-0.5 motion-reduce:transform-none motion-reduce:transition-none" aria-hidden="true">↓</span>
    </a>
  );
}

// ── Band 3 components ──────────────────────────────────────────────────────────
function StageMarker({
  accent, Icon, journeyActive, animating, staggerIdx, desktop = false,
}: {
  accent: string; Icon: React.ElementType; journeyActive: boolean;
  animating: boolean; staggerIdx: number; desktop?: boolean;
}) {
  const delay = `${staggerIdx * 55}ms`;
  const wrapSize  = desktop ? "w-[56px] h-[56px]" : "w-[46px] h-[46px]";
  const plateSize = desktop ? "w-[46px] h-[46px]" : "w-[40px] h-[40px]";
  const diamBase  = desktop ? "w-[34px] h-[34px]" : "w-[28px] h-[28px]";
  const diamDepth = desktop ? "w-[32px] h-[32px]" : "w-[26px] h-[26px]";
  const iconSize  = desktop ? 18 : 16;
  return (
    <div className={`relative ${wrapSize} flex items-center justify-center`}>
      <div aria-hidden="true"
        className={`absolute ${diamDepth} rotate-45 rounded-[6px] translate-x-[3px] translate-y-[3px] z-0`}
        style={{ background: `${accent}18` }} />
      <div aria-hidden="true"
        className={`absolute ${diamBase} rotate-45 rounded-[7px] z-[1]`}
        style={{
          background: "linear-gradient(145deg,rgba(255,255,255,.12),rgba(255,255,255,.035))",
          border: `1px solid ${accent}50`,
        }} />
      <div
        className={`nri-stage-plate relative z-[2] ${plateSize} rounded-full flex items-center justify-center`}
        style={{
          background: "linear-gradient(145deg,rgba(255,255,255,.14),rgba(255,255,255,.055))",
          border: journeyActive ? `1px solid ${accent}60` : "1px solid rgba(147,197,253,.28)",
          boxShadow: journeyActive
            ? `inset 0 1px 0 rgba(255,255,255,.16), 0 8px 22px rgba(2,6,23,.35), 0 0 0 3px ${accent}22`
            : "inset 0 1px 0 rgba(255,255,255,.10), 0 4px 12px rgba(2,6,23,.25)",
          transition: animating
            ? `border-color 160ms ease ${delay}, box-shadow 160ms ease`
            : "none",
        }}
      >
        <Icon size={iconSize} color={accent} aria-hidden="true" />
      </div>
    </div>
  );
}

function OwnerCallout() {
  return (
    <aside
      aria-label="Owner decision"
      className="rounded-[14px] p-[14px] border flex items-start gap-[10px]"
      style={{
        background: "linear-gradient(90deg, rgba(249,115,22,.10), rgba(124,58,237,.08))",
        borderColor: "rgba(251,146,60,.22)",
      }}
    >
      <KeyRound size={15} color="#FDBA74" aria-hidden="true" className="shrink-0 mt-[1px]" />
      <div>
        <p style={{ fontFamily: SANS, fontWeight: 700, fontSize: 11, letterSpacing: "0.08em", color: "#FDBA74", textTransform: "uppercase" }}>
          YOU STAY IN CONTROL
        </p>
        <p style={{ fontFamily: SANS, fontWeight: 450, fontSize: 13, lineHeight: 1.50, color: "#E8EDF6", marginTop: 4 }}>
          You decide the asking price and whether an offer is accepted or rejected.
        </p>
      </div>
    </aside>
  );
}

function NriSaleJourneySection() {
  const journeyRef = useRef<HTMLDivElement>(null);
  const [journeyActive, setJourneyActive] = useState(false);

  const reducedMotion =
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false;

  useEffect(() => {
    if (reducedMotion) { setJourneyActive(true); return; }
    const el = journeyRef.current;
    if (!el || !("IntersectionObserver" in window)) { setJourneyActive(true); return; }
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setJourneyActive(true); obs.disconnect(); } },
      { threshold: 0.08 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const animating = journeyActive && !reducedMotion;

  return (
    <section
      id="sale-journey"
      aria-labelledby="sale-journey-title"
      className="relative scroll-mt-16 overflow-hidden"
      style={{
        background: `
          radial-gradient(44% 55% at 7% 8%,  rgba(37,99,235,.18) 0%, rgba(37,99,235,.055) 48%, transparent 74%),
          radial-gradient(40% 52% at 94% 10%, rgba(124,58,237,.18) 0%, rgba(124,58,237,.05)  48%, transparent 74%),
          radial-gradient(48% 44% at 55% 100%,rgba(20,184,166,.10) 0%, rgba(20,184,166,.025) 48%, transparent 74%),
          linear-gradient(180deg, #0B1220 0%, #0D1529 48%, #09121F 100%)
        `,
        backgroundColor: "#0B1220",
        borderTop: "1px solid rgba(148,163,184,.12)",
      }}
    >
      {/* Dot field */}
      <div
        aria-hidden="true"
        className="absolute inset-0 z-0 pointer-events-none hidden min-[1200px]:block"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(96,165,250,.10) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          maskImage: "radial-gradient(ellipse 80% 60% at 50% 30%, black 40%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(ellipse 80% 60% at 50% 30%, black 40%, transparent 100%)",
        }}
      />

      <div className="relative z-[1] max-w-[1320px] mx-auto px-5 sm:px-8 lg:px-12">

        {/* Intro */}
        <div className="pt-[60px] sm:pt-[72px] lg:pt-[96px] max-w-[760px]">
          <p
            className="text-[12px] lg:text-[13px] font-[700] uppercase tracking-[0.11em] text-[#67E8F9]"
            style={{ fontFamily: SANS }}
          >
            SALE JOURNEY
          </p>
          <h2
            id="sale-journey-title"
            className="mt-[12px] text-[clamp(35px,9vw,42px)] lg:text-[clamp(44px,3.8vw,58px)] text-[#F8FAFC]"
            style={{ fontFamily: SERIF, fontWeight: 400, lineHeight: 1.03, letterSpacing: "-0.015em" }}
          >
            One sale. One coordinated journey.
          </h2>
          <p
            className="mt-[14px] text-[15.5px] lg:text-[18px] text-[#C4CFDF] max-w-[700px]"
            style={{ fontFamily: SANS, fontWeight: 450, lineHeight: 1.55 }}
          >
            From readiness to signing and registration, Reeve keeps the people, documents and next steps connected — with on-ground buyer execution in Bangalore.
          </p>
        </div>

        {/* Journey container */}
        <div ref={journeyRef} className="relative mt-[28px] min-[1200px]:mt-[38px]">
          <div className="relative max-w-[1180px] mx-auto min-[1200px]:pb-[140px]">

            {/* Desktop SVG route — absolute, behind markers */}
            <svg
              viewBox="0 0 1200 80"
              preserveAspectRatio="none"
              aria-hidden="true"
              className="absolute left-0 w-full pointer-events-none hidden min-[1200px]:block"
              style={{ top: 24, height: 80, zIndex: 0 }}
            >
              <defs>
                <linearGradient id="nri-route-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%"   stopColor="#3B82F6" />
                  <stop offset="28%"  stopColor="#22D3EE" />
                  <stop offset="62%"  stopColor="#8B5CF6" />
                  <stop offset="100%" stopColor="#2DD4BF" />
                </linearGradient>
                <filter id="nri-route-glow">
                  <feDropShadow dx="0" dy="0" stdDeviation="3.5" floodColor="rgba(59,130,246,.18)" />
                </filter>
              </defs>
              <path
                d="M 100 40 C 150 36 250 44 300 40 C 350 36 450 44 500 40 C 550 36 650 44 700 40 C 750 36 850 44 900 40 C 950 36 1050 44 1100 40"
                fill="none" stroke="rgba(148,163,184,.20)" strokeWidth="2"
              />
              <path
                d="M 100 40 C 150 36 250 44 300 40 C 350 36 450 44 500 40 C 550 36 650 44 700 40 C 750 36 850 44 900 40 C 950 36 1050 44 1100 40"
                fill="none" stroke="url(#nri-route-grad)" strokeWidth="2.5"
                pathLength="1" strokeDasharray="1"
                strokeDashoffset={journeyActive ? "0" : "1"}
                filter="url(#nri-route-glow)"
                style={{ transition: animating ? "stroke-dashoffset 550ms cubic-bezier(.22,.61,.36,1)" : "none" }}
              />
            </svg>

            {/* One semantic <ol> — vertical on mobile, 6-col grid on desktop */}
            <ol className="flex flex-col min-[1200px]:grid min-[1200px]:grid-cols-6 min-[1200px]:items-start">
              {STAGES.map((stage, idx) => (
                <li
                  key={stage.num}
                  className="group flex flex-row items-stretch gap-[14px] min-[1200px]:flex-col min-[1200px]:items-center min-[1200px]:gap-0"
                >
                  {/* Mobile-only: connector column */}
                  <div className="min-[1200px]:hidden flex flex-col items-center w-[46px] shrink-0">
                    {/* Top connector segment */}
                    {idx > 0 && (
                      <div className="w-[2px] h-[14px] relative">
                        <div className="absolute inset-0 bg-[rgba(148,163,184,.18)]" />
                        <div className="absolute inset-0" style={{
                          background: stage.accent,
                          transform: journeyActive ? "scaleY(1)" : "scaleY(0)",
                          transformOrigin: "top",
                          transition: animating ? `transform 260ms cubic-bezier(.22,.61,.36,1) ${idx * 55}ms` : "none",
                        }} />
                        {(stage.num === "03" || stage.num === "04") && (
                          <div className="absolute w-[2px] inset-0 translate-x-[4px]" style={{
                            background: "linear-gradient(180deg,#FB7185,#F97316)",
                            opacity: journeyActive ? 1 : 0,
                            transition: animating ? `opacity 200ms ease ${idx * 55}ms` : "none",
                          }} />
                        )}
                      </div>
                    )}
                    {/* Mobile marker */}
                    <StageMarker
                      accent={stage.accent} Icon={stage.Icon}
                      journeyActive={journeyActive} animating={animating}
                      staggerIdx={idx} desktop={false}
                    />
                    {/* Bottom connector segment */}
                    {idx < 5 && (
                      <div className="w-[2px] flex-1 min-h-[28px] relative">
                        <div className="absolute inset-0 bg-[rgba(148,163,184,.18)]" />
                        <div className="absolute inset-0" style={{
                          background: `linear-gradient(180deg,${stage.accent},${STAGES[idx + 1].accent})`,
                          transform: journeyActive ? "scaleY(1)" : "scaleY(0)",
                          transformOrigin: "top",
                          transition: animating ? `transform 280ms cubic-bezier(.22,.61,.36,1) ${(idx + 0.5) * 55}ms` : "none",
                        }} />
                        {(stage.num === "02" || stage.num === "03") && (
                          <div className="absolute w-[2px] inset-0 translate-x-[4px]" style={{
                            background: "linear-gradient(180deg,#FB7185,#F97316)",
                            opacity: journeyActive ? 1 : 0,
                            transition: animating ? `opacity 200ms ease ${(idx + 0.5) * 55}ms` : "none",
                          }} />
                        )}
                      </div>
                    )}
                  </div>

                  {/* Desktop-only: number above marker, fixed 24px height */}
                  <p
                    className="hidden min-[1200px]:flex min-[1200px]:items-center min-[1200px]:justify-center min-[1200px]:h-[24px] text-[11px] font-[700] tracking-[0.10em]"
                    style={{ fontFamily: SANS, color: stage.accent }}
                  >
                    {stage.num}
                  </p>

                  {/* Desktop-only: marker in h-[80px] block — relative z-[1] to sit above SVG */}
                  <div className="relative z-[1] hidden min-[1200px]:flex min-[1200px]:items-center min-[1200px]:justify-center min-[1200px]:h-[80px]">
                    <StageMarker
                      accent={stage.accent} Icon={stage.Icon}
                      journeyActive={journeyActive} animating={animating}
                      staggerIdx={idx} desktop={true}
                    />
                  </div>

                  {/* Right/below content — all viewports */}
                  <div className="flex-1 min-w-0 sm:max-w-[650px] pb-[24px] min-[1200px]:max-w-none min-[1200px]:w-full min-[1200px]:flex-none min-[1200px]:text-center min-[1200px]:px-2 min-[1200px]:pb-0 min-[1200px]:mt-[10px]">
                    {/* Mobile-only number */}
                    <p
                      className="min-[1200px]:hidden text-[11px] font-[700] tracking-[0.10em]"
                      style={{ fontFamily: SANS, color: stage.accent }}
                    >
                      {stage.num}
                    </p>
                    {/* Title */}
                    <h3
                      className="text-[17.5px] min-[1200px]:text-[18.5px] text-[#F8FAFC] [@media(hover:hover)]:group-hover:text-white transition-colors duration-[160ms] motion-reduce:transition-none mt-1"
                      style={{ fontFamily: SANS, fontWeight: 650 }}
                    >
                      {stage.title}
                    </h3>
                    {/* Purpose */}
                    <p style={{ fontFamily: SANS, fontWeight: 650, fontSize: 13.5, color: stage.accent, marginTop: 4 }}>
                      {stage.purpose}
                    </p>
                    {/* Description */}
                    <p style={{ fontFamily: SANS, fontWeight: 425, fontSize: 13.5, lineHeight: 1.52, color: "#AEBBCF", marginTop: 6 }}>
                      {stage.description}
                    </p>
                    {/* Bangalore label — mobile only, after stage 02 */}
                    {stage.num === "02" && (
                      <p
                        className="min-[1200px]:hidden mt-[8px] text-[10.5px] font-[700] uppercase tracking-[0.08em] text-[#FDBA74]"
                        style={{ fontFamily: SANS }}
                      >
                        BANGALORE ON-GROUND · 02–04
                      </p>
                    )}
                    {/* Owner callout — one DOM node; mobile: normal flow; desktop: CSS repositions */}
                    {stage.num === "04" && (
                      <div className="mt-[10px] min-[1200px]:m-0 nri-journey-callout-anchor">
                        <div
                          aria-hidden="true"
                          className="hidden min-[1200px]:block w-[1.5px] h-[14px] pointer-events-none shrink-0"
                          style={{ background: "linear-gradient(180deg, rgba(251,146,60,.45), rgba(251,146,60,.12))" }}
                        />
                        <OwnerCallout />
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ol>

            {/* Desktop Bangalore bracket */}
            <div
              aria-hidden="true"
              className="pointer-events-none hidden min-[1200px]:grid min-[1200px]:grid-cols-6 mt-[14px]"
            >
              <div />
              <div className="col-span-3 flex flex-col items-center gap-[6px]">
                <svg viewBox="0 0 100 22" className="w-full" style={{ height: 22 }} aria-hidden="true">
                  <defs>
                    <linearGradient id="blr-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%"   stopColor="#FB7185" />
                      <stop offset="100%" stopColor="#F97316" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M 16.67 5 L 16.67 17 L 83.33 17 L 83.33 5"
                    fill="none" stroke="rgba(251,113,133,.22)" strokeWidth="1.5"
                    strokeDasharray="3 2" strokeLinecap="round" strokeLinejoin="round"
                  />
                  <path
                    d="M 16.67 5 L 16.67 17 L 83.33 17 L 83.33 5"
                    fill="none" stroke="url(#blr-grad)" strokeWidth="1.5"
                    strokeLinecap="round" strokeLinejoin="round"
                    style={{ opacity: journeyActive ? 1 : 0, transition: animating ? "opacity 450ms ease 200ms" : "none" }}
                  />
                  <circle cx="16.67" cy="5" r="2.5" fill="#FB7185"
                    style={{ opacity: journeyActive ? 1 : 0, transition: animating ? "opacity 450ms ease 200ms" : "none" }} />
                  <circle cx="83.33" cy="5" r="2.5" fill="#F97316"
                    style={{ opacity: journeyActive ? 1 : 0, transition: animating ? "opacity 450ms ease 200ms" : "none" }} />
                </svg>
                <p style={{ fontFamily: SANS, fontWeight: 700, fontSize: 11, letterSpacing: "0.08em", color: "#FDBA74", textTransform: "uppercase" }}>
                  BANGALORE ON-GROUND · STAGES 02–04
                </p>
              </div>
              <div className="col-span-2" />
            </div>

          </div>
        </div>

        {/* Authority boundary */}
        <div
          className="max-w-[1180px] mx-auto flex items-start gap-[10px] mt-[32px] lg:mt-[40px] pt-[18px] pb-[64px] lg:pb-[92px]"
          style={{ borderTop: "1px solid rgba(148,163,184,.10)" }}
        >
          <Landmark size={15} color="#8FA0B7" aria-hidden="true" className="shrink-0 mt-[1px]" />
          <p style={{ fontFamily: SANS, fontWeight: 450, fontSize: 13, lineHeight: 1.52, color: "#8FA0B7" }}>
            Registration and government timelines depend on the relevant authorities and cannot be guaranteed.
          </p>
        </div>

      </div>
    </section>
  );
}

// ── Band 4 components ──────────────────────────────────────────────────────────
function MoneyStation({
  connectorAccent, Icon, moneyActive, animating, staggerIdx, desktop = false,
}: {
  connectorAccent: string; Icon: React.ElementType;
  moneyActive: boolean; animating: boolean; staggerIdx: number; desktop?: boolean;
}) {
  const delay  = `${staggerIdx * 50}ms`;
  const wrap   = desktop ? "w-[60px] h-[60px]" : "w-[52px] h-[52px]";
  const tile   = desktop ? "w-[52px] h-[52px]" : "w-[44px] h-[44px]";
  const depth  = desktop ? "w-[52px] h-[52px]" : "w-[44px] h-[44px]";
  const radius = desktop ? "rounded-[14px]"     : "rounded-[12px]";
  const iSize  = desktop ? 20 : 18;
  return (
    <div className={`relative ${wrap} flex items-center justify-center`}>
      <div aria-hidden="true"
        className={`absolute ${depth} ${radius} translate-x-[4px] translate-y-[4px] z-0 pointer-events-none`}
        style={{ background: `linear-gradient(135deg, ${connectorAccent}28, ${connectorAccent}18)` }} />
      <div
        className={`nri-money-tile relative z-[1] ${tile} ${radius} flex items-center justify-center`}
        style={{
          "--money-accent-hover": `${connectorAccent}30`,
          background: "linear-gradient(145deg, rgba(255,255,255,.98), rgba(248,250,252,.92))",
          border: moneyActive ? `1px solid ${connectorAccent}40` : "1px solid rgba(148,163,184,.28)",
          boxShadow: moneyActive
            ? `0 8px 20px rgba(15,23,42,.10), 0 0 0 2px ${connectorAccent}22`
            : "0 4px 10px rgba(15,23,42,.06)",
          transition: animating
            ? `border-color 160ms ease ${delay}, box-shadow 160ms ease`
            : "none",
        } as React.CSSProperties}
      >
        <div style={{ color: moneyActive ? connectorAccent : "#94A3B8",
          transition: animating ? `color 160ms ease ${delay}` : "none" }}>
          <Icon size={iSize} aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}

function NriSaleTaxMoneySection() {
  const moneyRef = useRef<HTMLDivElement>(null);
  const [moneyActive, setMoneyActive] = useState(false);

  const reducedMotion = typeof window !== "undefined"
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;

  useEffect(() => {
    if (reducedMotion) { setMoneyActive(true); return; }
    const el = moneyRef.current;
    if (!el || !("IntersectionObserver" in window)) { setMoneyActive(true); return; }
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setMoneyActive(true); obs.disconnect(); } },
      { threshold: 0.08 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const animating = moneyActive && !reducedMotion;

  return (
    <section
      id="tax-money"
      aria-labelledby="tax-money-title"
      className="relative scroll-mt-16"
      style={{
        background: `
          radial-gradient(46% 55% at 6% 14%, rgba(16,185,129,.12) 0%, rgba(16,185,129,.035) 48%, transparent 74%),
          radial-gradient(40% 50% at 95% 18%, rgba(37,99,235,.11) 0%, rgba(37,99,235,.03) 50%, transparent 76%),
          radial-gradient(34% 42% at 70% 100%, rgba(124,58,237,.075) 0%, rgba(124,58,237,.02) 50%, transparent 76%),
          linear-gradient(180deg, #F2FBF8 0%, #FAFCFB 46%, #F7F9FF 100%)
        `,
        backgroundColor: "#FAFCFB",
      }}
    >
      <style>{TAX_MONEY_STYLE}</style>

      <div className="max-w-[1320px] mx-auto px-5 sm:px-8 lg:px-12 pb-[64px] lg:pb-[92px]">

        {/* Intro */}
        <div className="pt-[60px] sm:pt-[72px] lg:pt-[92px]">
          <p
            className="text-[12px] lg:text-[13px] font-[700] uppercase tracking-[0.11em] text-[#0F766E]"
            style={{ fontFamily: SANS }}
          >
            TAX &amp; MONEY
          </p>
          <h2
            id="tax-money-title"
            className="mt-[12px] text-[clamp(35px,9vw,42px)] lg:text-[clamp(44px,3.8vw,58px)] text-[#101828] max-w-[1100px]"
            style={{ fontFamily: SERIF, fontWeight: 400, lineHeight: 1.03, letterSpacing: "-0.015em" }}
          >
            The sale is only one part of the transaction.
          </h2>
          <p
            className="mt-[14px] text-[15.5px] lg:text-[18px] text-[#526174] max-w-[740px]"
            style={{ fontFamily: SANS, fontWeight: 450, lineHeight: 1.55 }}
          >
            An NRI property sale can also involve buyer-side withholding, tax documentation, banking and — where relevant — remittance work. Reeve coordinates the workflow; the relevant CA or other licensed professional handles regulated tax advice, calculations and filings.
          </p>
        </div>

        {/* 2.5D Settlement Ledger */}
        <div ref={moneyRef} className="relative max-w-[1180px] mx-auto mt-[28px] min-[1200px]:mt-[34px]">

          {/* Depth plane */}
          <div
            aria-hidden="true"
            className="absolute inset-0 translate-x-[6px] translate-y-[8px] rounded-[22px] min-[1200px]:rounded-[26px] pointer-events-none z-0"
            style={{ background: "linear-gradient(135deg, rgba(37,99,235,.22), rgba(20,184,166,.24) 46%, rgba(124,58,237,.18) 100%)" }}
          />

          {/* Ledger surface */}
          <div
            className="relative z-[1] border border-[#DCE7E4] rounded-[20px] min-[1200px]:rounded-[24px]"
            style={{
              background: "linear-gradient(145deg, #FFFFFF 0%, #FBFEFD 56%, #F8FAFF 100%)",
              boxShadow: "0 24px 70px rgba(15,23,42,.08), 0 5px 16px rgba(15,23,42,.04)",
            }}
          >

            {/* Ledger header */}
            <div className="px-[18px] sm:px-[24px] lg:px-[28px] py-[14px] lg:py-[18px] border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-[8px]">
              <p style={{ fontFamily: SANS, fontWeight: 700, fontSize: 11.5, letterSpacing: "0.09em", color: "#0F766E", textTransform: "uppercase" }}>
                CONCEPTUAL TRANSACTION FLOW
              </p>
              <div className="rounded-[6px] border border-[#E2E8F0] bg-[#F1F5F9] px-[8px] py-[3px]">
                <p style={{ fontFamily: SANS, fontWeight: 600, fontSize: 10.5, color: "#64748B", lineHeight: 1.3 }}>
                  ACTUAL REQUIREMENTS VARY
                </p>
              </div>
            </div>

            {/* Money flow track */}
            <div className="px-[18px] sm:px-[24px] lg:px-[28px] pt-[24px] lg:pt-[30px] pb-[24px] lg:pb-[28px]">
              <div className="relative">

                {/* Desktop SVG route
                    top: 82 = icon-block(72) + stem(10); height: 18 = node-dot-block; route y=9
                    Active path M 100 9 H 900 = Buyer→Banking column centers in 1000-unit viewBox
                    gradientUnits="userSpaceOnUse" avoids bounding-box gradient failure on horizontal path */}
                <svg
                  viewBox="0 0 1000 18"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                  className="absolute left-0 w-full pointer-events-none hidden min-[1200px]:block"
                  style={{ top: 82, height: 18, zIndex: 0 }}
                >
                  <defs>
                    <linearGradient id="nri-money-route-grad" gradientUnits="userSpaceOnUse" x1="100" y1="9" x2="900" y2="9">
                      <stop offset="0%"   stopColor="#2563EB" />
                      <stop offset="25%"  stopColor="#0284C7" />
                      <stop offset="49%"  stopColor="#F97316" />
                      <stop offset="72%"  stopColor="#14B8A6" />
                      <stop offset="100%" stopColor="#7C3AED" />
                    </linearGradient>
                  </defs>
                  <path d="M 50 9 H 950" fill="none" stroke="rgba(148,163,184,.28)" strokeWidth="2" strokeLinecap="round" />
                  <path
                    d="M 100 9 H 900"
                    fill="none" stroke="url(#nri-money-route-grad)" strokeWidth="2.5" strokeLinecap="round"
                    pathLength="1" strokeDasharray="1"
                    strokeDashoffset={moneyActive ? "0" : "1"}
                    style={{ transition: animating ? "stroke-dashoffset 520ms cubic-bezier(.22,.61,.36,1)" : "none" }}
                  />
                </svg>

                {/* One semantic <ol> */}
                <ol className="flex flex-col min-[1200px]:grid min-[1200px]:grid-cols-5 min-[1200px]:items-start">
                  {MONEY_FLOW.map((flow, idx) => (
                    <li
                      key={flow.num}
                      className="group flex flex-row items-stretch gap-[14px] min-[1200px]:flex-col min-[1200px]:items-center min-[1200px]:gap-0"
                    >
                      {/* Mobile: connector column */}
                      <div className="min-[1200px]:hidden flex flex-col items-center w-[46px] shrink-0">
                        {idx > 0 && (
                          <div className="w-[2px] h-[14px] relative">
                            <div className="absolute inset-0 bg-[rgba(148,163,184,.28)]" />
                            <div className="absolute inset-0" style={{
                              background: flow.connectorAccent,
                              transform: moneyActive ? "scaleY(1)" : "scaleY(0)",
                              transformOrigin: "top",
                              transition: animating ? `transform 260ms cubic-bezier(.22,.61,.36,1) ${idx * 50}ms` : "none",
                            }} />
                          </div>
                        )}
                        <MoneyStation
                          connectorAccent={flow.connectorAccent} Icon={flow.Icon}
                          moneyActive={moneyActive} animating={animating}
                          staggerIdx={idx} desktop={false}
                        />
                        {idx < 4 && (
                          <div className="w-[2px] flex-1 min-h-[28px] relative">
                            <div className="absolute inset-0 bg-[rgba(148,163,184,.28)]" />
                            <div className="absolute inset-0" style={{
                              background: `linear-gradient(180deg,${flow.connectorAccent},${MONEY_FLOW[idx + 1].connectorAccent})`,
                              transform: moneyActive ? "scaleY(1)" : "scaleY(0)",
                              transformOrigin: "top",
                              transition: animating ? `transform 280ms cubic-bezier(.22,.61,.36,1) ${(idx + 0.5) * 50}ms` : "none",
                            }} />
                          </div>
                        )}
                      </div>

                      {/* Desktop: icon block — h-[72px] */}
                      <div className="relative z-[1] hidden min-[1200px]:flex min-[1200px]:items-center min-[1200px]:justify-center min-[1200px]:h-[72px]">
                        <MoneyStation
                          connectorAccent={flow.connectorAccent} Icon={flow.Icon}
                          moneyActive={moneyActive} animating={animating}
                          staggerIdx={idx} desktop={true}
                        />
                      </div>

                      {/* Desktop: stem — 1px × 10px connecting tile to node dot */}
                      <div
                        aria-hidden="true"
                        className="pointer-events-none hidden min-[1200px]:block min-[1200px]:h-[10px] min-[1200px]:w-[1px]"
                        style={{ background: moneyActive ? `${flow.connectorAccent}55` : "rgba(148,163,184,.28)" }}
                      />

                      {/* Desktop: node dot block — h-[18px] */}
                      <div className="relative z-[1] hidden min-[1200px]:flex min-[1200px]:items-center min-[1200px]:justify-center min-[1200px]:h-[18px]">
                        <div
                          className="w-[14px] h-[14px] rounded-full"
                          style={{
                            border: moneyActive ? `2px solid ${flow.connectorAccent}` : "2px solid rgba(148,163,184,.4)",
                            background: "#FFFFFF",
                            transition: animating ? `border-color 160ms ease ${idx * 50}ms` : "none",
                          }}
                        />
                      </div>

                      {/* Text content — right on mobile, below on desktop */}
                      <div className="flex-1 min-w-0 sm:max-w-[650px] pb-[20px] min-[1200px]:max-w-none min-[1200px]:w-full min-[1200px]:flex-none min-[1200px]:text-center min-[1200px]:pb-0 min-[1200px]:mt-[10px] min-[1200px]:px-1">
                        <p style={{ fontFamily: SANS, fontWeight: 700, fontSize: 11, letterSpacing: "0.075em", color: flow.labelAccent, textTransform: "uppercase" }}>
                          {flow.label}
                        </p>
                        <p style={{ fontFamily: SANS, fontWeight: 500, fontSize: 13.5, lineHeight: 1.45, color: "#475569", marginTop: 4 }}>
                          {flow.descriptor}
                        </p>
                      </div>

                    </li>
                  ))}
                </ol>
              </div>
            </div>

            {/* Horizontal divider */}
            <div className="mx-[18px] sm:mx-[24px] lg:mx-[28px] border-t border-[#E2E8F0]" />

            {/* Explanation dl */}
            <div className="px-[18px] sm:px-[24px] lg:px-[28px] pt-[22px] lg:pt-[28px] pb-[24px] lg:pb-[28px]">
              <dl className="flex flex-col min-[1200px]:grid min-[1200px]:grid-cols-4 min-[1200px]:gap-0">
                {EXPLANATIONS.map((exp, i) => (
                  <div
                    key={exp.dt}
                    className={[
                      i > 0 ? "border-t min-[1200px]:border-t-0" : "",
                      i < 3 ? "min-[1200px]:border-r" : "",
                      i === 0 ? "min-[1200px]:pr-[20px]" : i === 3 ? "min-[1200px]:pl-[20px]" : "min-[1200px]:px-[20px]",
                      "border-[#E2E8F0] py-[14px] min-[1200px]:py-0",
                    ].join(" ")}
                  >
                    <dt style={{ fontFamily: SANS, fontWeight: 650, fontSize: 14.5, color: "#172033" }}>
                      {exp.dt}
                    </dt>
                    <dd
                      className="max-w-[720px] min-[1200px]:max-w-none"
                      style={{ fontFamily: SANS, fontWeight: 440, fontSize: 13.5, lineHeight: 1.53, color: "#526174", marginTop: 6 }}
                    >
                      {exp.dd}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

          </div>
        </div>

        {/* Professional boundary */}
        <aside
          aria-label="Tax and professional responsibility"
          className="max-w-[1180px] mx-auto flex items-start gap-[10px] mt-[26px] lg:mt-[30px]"
        >
          <Scale size={16} color="#64748B" aria-hidden="true" className="shrink-0 mt-[1px]" />
          <p style={{ fontFamily: SANS, fontWeight: 450, fontSize: 13, lineHeight: 1.5, color: "#475569" }}>
            Tax treatment, withholding, filings and remittance requirements depend on the transaction and applicable rules. Reeve does not provide tax advice; the relevant CA, bank or other licensed professional determines the applicable requirements.
          </p>
        </aside>

      </div>
    </section>
  );
}

// ── Band 5 constants ───────────────────────────────────────────────────────────
const DECISION_STYLE = `
  /* Visual state — always active for hover/focus, no motion required */
  @media (hover: hover) {
    .nri-decision-lane:hover,
    .nri-decision-lane:focus-within {
      background-color: var(--decision-lane-hover-bg) !important;
    }
    .nri-decision-lane:hover .nri-decision-tile,
    .nri-decision-lane:focus-within .nri-decision-tile {
      box-shadow: inset 0 1px 0 rgba(255,255,255,.20), 0 12px 30px rgba(2,6,23,.45) !important;
      border-color: var(--decision-tile-hover-border) !important;
    }
    .nri-decision-lane:hover .nri-decision-action,
    .nri-decision-lane:focus-within .nri-decision-action {
      background: var(--decision-action-hover-bg) !important;
      border-color: var(--decision-action-hover-border) !important;
    }
  }
  /* focus-within visual state on non-hover (touch/keyboard) devices */
  .nri-decision-lane:focus-within {
    background-color: var(--decision-lane-hover-bg) !important;
  }
  .nri-decision-lane:focus-within .nri-decision-tile {
    box-shadow: inset 0 1px 0 rgba(255,255,255,.20), 0 12px 30px rgba(2,6,23,.45) !important;
    border-color: var(--decision-tile-hover-border) !important;
  }
  .nri-decision-lane:focus-within .nri-decision-action {
    background: var(--decision-action-hover-bg) !important;
    border-color: var(--decision-action-hover-border) !important;
  }
  /* Transitions — only when motion is okay */
  @media (hover: hover) and (prefers-reduced-motion: no-preference) {
    .nri-decision-lane {
      transition: background-color 160ms ease;
    }
    .nri-decision-tile {
      transition: box-shadow 160ms ease, border-color 160ms ease;
    }
    .nri-decision-action {
      transition:
        background-color 160ms ease,
        border-color 160ms ease;
    }
    .nri-decision-action-arrow {
      transition: transform 160ms ease;
    }
    .nri-decision-lane:hover .nri-decision-action-arrow {
      transform: translateX(2px);
    }
  }
`;

const DECISION_OPTIONS = [
  {
    label: "SELL",
    title: "Exit the property",
    meaning: "Pursue a sale and free up the capital for another use.",
    signals: [
      "Managing it remotely no longer makes sense.",
      "You have another intended use for the capital.",
    ],
    action: "Start a sale enquiry",
    href: "#enquiry",
    accent: "#FB923C",
    brightText: "#FDBA74",
    Icon: HandCoins,
  },
  {
    label: "RENT",
    title: "Keep the property working",
    meaning: "Retain ownership while putting the property to use through a tenant.",
    signals: [
      "Renting is practical for the property and location.",
      "You prefer ongoing income to an immediate sale.",
    ],
    action: "Explore Find a Tenant",
    href: "/find-tenant-bangalore",
    accent: "#14B8A6",
    brightText: "#5EEAD4",
    Icon: KeyRound,
  },
  {
    label: "WAIT",
    title: "Get ready before deciding",
    meaning: "Pause the decision while you resolve what would make the next move clearer.",
    signals: [
      "Documents, ownership or alignment still need attention.",
      "You have not decided what outcome you want.",
    ],
    action: "Talk through the situation",
    href: "#enquiry",
    accent: "#8B5CF6",
    brightText: "#C4B5FD",
    Icon: Clock4,
  },
] as const;

function DecisionMarker({ accent, Icon }: { accent: string; Icon: React.ElementType }) {
  return (
    <div className="relative w-[48px] h-[48px] min-[1200px]:w-[56px] min-[1200px]:h-[56px] flex items-center justify-center shrink-0">
      <div
        aria-hidden="true"
        className="absolute w-[44px] h-[44px] min-[1200px]:w-[52px] min-[1200px]:h-[52px] translate-x-[3px] translate-y-[4px] rounded-[13px] min-[1200px]:rounded-[15px] z-0 pointer-events-none"
        style={{ background: `${accent}30` }}
      />
      <div
        className="nri-decision-tile relative z-[1] w-[44px] h-[44px] min-[1200px]:w-[52px] min-[1200px]:h-[52px] rounded-[13px] min-[1200px]:rounded-[15px] flex items-center justify-center"
        style={{
          background: "linear-gradient(145deg, rgba(255,255,255,.13), rgba(255,255,255,.055))",
          border: `1px solid ${accent}4D`,
          boxShadow: "inset 0 1px 0 rgba(255,255,255,.14), 0 8px 22px rgba(2,6,23,.30)",
        }}
      >
        <Icon size={19} aria-hidden="true" className="min-[1200px]:hidden" style={{ color: accent }} />
        <Icon size={22} aria-hidden="true" className="hidden min-[1200px]:block" style={{ color: accent }} />
      </div>
    </div>
  );
}

function NriSaleDecisionSection() {
  return (
    <section
      id="sell-rent-wait"
      aria-labelledby="sell-rent-wait-title"
      className="relative scroll-mt-16"
      style={{
        background: `
          radial-gradient(44% 56% at 6% 8%, rgba(249,115,22,.17) 0%, rgba(249,115,22,.045) 48%, transparent 74%),
          radial-gradient(40% 52% at 94% 12%, rgba(34,211,238,.14) 0%, rgba(34,211,238,.035) 48%, transparent 74%),
          radial-gradient(48% 46% at 52% 100%, rgba(139,92,246,.15) 0%, rgba(139,92,246,.035) 50%, transparent 76%),
          linear-gradient(180deg, #111426 0%, #17182F 50%, #101322 100%)
        `,
        backgroundColor: "#121526",
      }}
    >
      <style>{DECISION_STYLE}</style>
      <div className="max-w-[1320px] mx-auto px-5 sm:px-8 lg:px-12 pb-[64px] lg:pb-[92px]">

        {/* Intro */}
        <div className="pt-[60px] sm:pt-[72px] lg:pt-[92px] md:text-center">
          <p
            className="text-[12px] lg:text-[13px] font-[700] uppercase tracking-[0.11em] text-[#C4B5FD]"
            style={{ fontFamily: SANS }}
          >
            SELL / RENT / WAIT
          </p>
          <h2
            id="sell-rent-wait-title"
            className="mt-[12px] text-[clamp(35px,9vw,42px)] lg:text-[clamp(44px,3.8vw,58px)] text-[#F8FAFC]"
            style={{ fontFamily: SERIF, fontWeight: 400, lineHeight: 1.03, letterSpacing: "-0.015em" }}
          >
            Not sure whether to sell yet?
          </h2>
          <p
            className="mt-[14px] text-[15.5px] lg:text-[18px] text-[#C5D0E0] max-w-[740px] md:mx-auto"
            style={{ fontFamily: SANS, fontWeight: 450, lineHeight: 1.55 }}
          >
            Sometimes the real question is not how to sell the property, but what you want from it next. Selling, renting or waiting can each make sense depending on your goals, the property's readiness and how much ongoing ownership you want.
          </p>
        </div>

        {/* Decision Deck */}
        <div className="relative max-w-[1180px] mx-auto mt-[28px] min-[1200px]:mt-[36px]">

          {/* Depth plane */}
          <div
            aria-hidden="true"
            className="absolute inset-0 translate-x-[6px] translate-y-[8px] rounded-[22px] min-[1200px]:rounded-[26px] pointer-events-none z-0"
            style={{ background: "linear-gradient(135deg, rgba(249,115,22,.28), rgba(20,184,166,.23) 50%, rgba(139,92,246,.28))" }}
          />

          {/* Shell surface */}
          <div
            className="relative z-[1] overflow-hidden border border-[rgba(255,255,255,.12)] rounded-[20px] min-[1200px]:rounded-[24px]"
            style={{
              background: "linear-gradient(145deg, rgba(255,255,255,.075), rgba(255,255,255,.040))",
              boxShadow: "0 26px 70px rgba(2,6,23,.30), 0 5px 18px rgba(2,6,23,.18)",
            }}
          >

            {/* Deck header */}
            <div className="px-[18px] sm:px-[24px] lg:px-[28px] py-[14px] lg:py-[18px] border-b border-[rgba(255,255,255,.09)] flex flex-wrap items-center justify-between gap-[8px]">
              <p style={{ fontFamily: SANS, fontWeight: 700, fontSize: 11.5, letterSpacing: "0.09em", color: "#C4B5FD", textTransform: "uppercase" }}>
                COMPARE YOUR OPTIONS
              </p>
              <div className="rounded-[6px] border border-[rgba(255,255,255,.11)] bg-[rgba(255,255,255,.06)] px-[8px] py-[3px]">
                <p style={{ fontFamily: SANS, fontWeight: 600, fontSize: 10.5, color: "#AEBBCF", lineHeight: 1.3 }}>
                  NO DEFAULT ANSWER
                </p>
              </div>
            </div>

            {/* Desktop fork SVG */}
            <svg
              viewBox="0 0 900 52"
              preserveAspectRatio="none"
              aria-hidden="true"
              className="hidden min-[1200px]:block w-full pointer-events-none h-[52px]"
            >
              <defs>
                <linearGradient id="nri-decision-sell-grad" gradientUnits="userSpaceOnUse" x1="450" y1="6" x2="150" y2="48">
                  <stop offset="0%" stopColor="rgba(148,163,184,.25)" />
                  <stop offset="100%" stopColor="#FB923C" stopOpacity="0.55" />
                </linearGradient>
                <linearGradient id="nri-decision-rent-grad" gradientUnits="userSpaceOnUse" x1="450" y1="6" x2="450" y2="48">
                  <stop offset="0%" stopColor="rgba(148,163,184,.25)" />
                  <stop offset="100%" stopColor="#14B8A6" stopOpacity="0.55" />
                </linearGradient>
                <linearGradient id="nri-decision-wait-grad" gradientUnits="userSpaceOnUse" x1="450" y1="6" x2="750" y2="48">
                  <stop offset="0%" stopColor="rgba(148,163,184,.25)" />
                  <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.55" />
                </linearGradient>
              </defs>
              <path d="M 450 6 C 450 28 150 28 150 48" fill="none" stroke="rgba(148,163,184,.15)" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M 450 6 L 450 48"               fill="none" stroke="rgba(148,163,184,.15)" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M 450 6 C 450 28 750 28 750 48" fill="none" stroke="rgba(148,163,184,.15)" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M 450 6 C 450 28 150 28 150 48" fill="none" stroke="url(#nri-decision-sell-grad)" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M 450 6 L 450 48"               fill="none" stroke="url(#nri-decision-rent-grad)" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M 450 6 C 450 28 750 28 750 48" fill="none" stroke="url(#nri-decision-wait-grad)" strokeWidth="1.5" strokeLinecap="round" />
              <circle cx="450" cy="6" r="3.5" fill="rgba(148,163,184,.35)" />
            </svg>

            {/* Decision options */}
            <ul aria-label="Options for the property" className="flex flex-col min-[1200px]:grid min-[1200px]:grid-cols-3">
              {DECISION_OPTIONS.map((opt, idx) => (
                <li
                  key={opt.label}
                  className={[
                    "nri-decision-lane border-[rgba(255,255,255,.09)]",
                    idx > 0 ? "border-t min-[1200px]:border-t-0" : "",
                    idx === 1 ? "min-[1200px]:border-l min-[1200px]:border-r" : "",
                  ].join(" ")}
                  style={{
                    "--decision-lane-hover-bg":       `${opt.accent}0D`,
                    "--decision-tile-hover-border":   `${opt.accent}80`,
                    "--decision-action-hover-bg":     `${opt.accent}26`,
                    "--decision-action-hover-border": `${opt.accent}59`,
                  } as React.CSSProperties}
                >
                  <div className="flex flex-col min-[360px]:flex-row items-start gap-[12px] min-[360px]:gap-[14px] sm:gap-[16px] min-[1200px]:flex-col min-[1200px]:items-center min-[1200px]:h-full min-[1200px]:gap-0 px-[18px] sm:px-[24px] min-[1200px]:px-[28px] py-[18px] sm:py-[22px] min-[1200px]:pt-[12px] min-[1200px]:pb-[28px]">

                    <DecisionMarker accent={opt.accent} Icon={opt.Icon} />

                    <div className="flex-1 min-w-0 sm:max-w-[650px] min-[1200px]:max-w-none min-[1200px]:w-full min-[1200px]:mt-[14px] min-[1200px]:text-center min-[1200px]:flex min-[1200px]:flex-col min-[1200px]:flex-1">

                      <p style={{ fontFamily: SANS, fontWeight: 700, fontSize: 11, letterSpacing: "0.09em", color: opt.brightText, textTransform: "uppercase" }}>
                        {opt.label}
                      </p>

                      <h3
                        className="mt-[4px] text-[17.5px] min-[1200px]:text-[19px] text-[#F8FAFC]"
                        style={{ fontFamily: SANS, fontWeight: 650 }}
                      >
                        {opt.title}
                      </h3>

                      <p
                        className="mt-[5px]"
                        style={{ fontFamily: SANS, fontWeight: 450, fontSize: 14, lineHeight: 1.5, color: "#D5DDEA" }}
                      >
                        {opt.meaning}
                      </p>

                      <p
                        className="mt-[12px] min-[1200px]:mt-[14px]"
                        style={{ fontFamily: SANS, fontWeight: 700, fontSize: 11, letterSpacing: "0.08em", color: "#8FA0B7", textTransform: "uppercase" }}
                      >
                        MAY FIT WHEN
                      </p>

                      <ul className="mt-[7px] flex flex-col gap-[5px] min-[1200px]:text-left">
                        {opt.signals.map((signal, i) => (
                          <li key={i} className="flex items-start gap-[7px]">
                            <div aria-hidden="true" className="shrink-0 mt-[6.5px] w-[4px] h-[4px] rounded-full" style={{ background: opt.accent }} />
                            <span style={{ fontFamily: SANS, fontWeight: 450, fontSize: 13.5, lineHeight: 1.50, color: "#AEBBCF" }}>
                              {signal}
                            </span>
                          </li>
                        ))}
                      </ul>

                      <div className="mt-[14px] min-[1200px]:mt-auto min-[1200px]:pt-[18px]">
                        <a
                          href={opt.href}
                          className="nri-decision-action inline-flex min-h-[44px] w-full items-center justify-between gap-[6px] rounded-[10px] border px-[14px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgba(255,255,255,.55)]"
                          style={{
                            fontFamily: SANS, fontWeight: 600, fontSize: 13.5,
                            background: `${opt.accent}1A`,
                            borderColor: `${opt.accent}3A`,
                            color: opt.brightText,
                          }}
                        >
                          {opt.action}
                          <ArrowRight size={14} aria-hidden="true" className="nri-decision-action-arrow shrink-0" />
                        </a>
                      </div>

                    </div>
                  </div>
                </li>
              ))}
            </ul>

            {/* Boundary row */}
            <div className="border-t border-[rgba(255,255,255,.09)] px-[18px] sm:px-[24px] lg:px-[28px] py-[16px] lg:py-[20px] flex items-start gap-[10px]">
              <ShieldCheck size={16} color="#8FA0B7" aria-hidden="true" className="shrink-0 mt-[1px]" />
              <p style={{ fontFamily: SANS, fontWeight: 450, fontSize: 13.5, lineHeight: 1.50, color: "#AEBBCF" }}>
                There is no automatically &#x201C;best&#x201D; option. Reeve can help you understand the practical next steps; you decide whether to sell, rent or wait.
              </p>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}

// ── Band 6 constants ───────────────────────────────────────────────────────────

const ENQUIRY_STYLE = `
  @keyframes nri-sr-in {
    from { opacity: 0; transform: translateY(4px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .nri-sr-summary { animation: nri-sr-in 170ms ease-out both; }

  @media (hover: hover) and (prefers-reduced-motion: no-preference) {
    .nri-resp-lane:hover .nri-resp-overlay { opacity: 1; }
    .nri-resp-lane:hover .nri-resp-icon-tile {
      box-shadow: inset 0 1px 0 rgba(255,255,255,.18), 0 8px 22px rgba(0,0,0,.14);
      border-color: var(--resp-icon-hover-border);
    }
    .nri-resp-overlay { transition: opacity 160ms ease; }
    .nri-resp-icon-tile {
      transition: box-shadow 160ms ease, border-color 160ms ease;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .nri-sr-summary { animation: none; }
    html { scroll-behavior: auto; }
  }
`;

const RESPONSIBILITY_ROLES = [
  {
    role:        "You decide",
    railColor:   "#2563EB",
    headingColor:"#1D4ED8",
    overlay:     "rgba(37,99,235,.025)",
    Icon:        UserRound,
    items: [
      "Whether to sell and the asking price",
      "Whether to accept or reject an offer",
      "Other important commercial decisions",
    ],
  },
  {
    role:        "Reeve coordinates",
    railColor:   "#14B8A6",
    headingColor:"#0F766E",
    overlay:     "rgba(20,184,166,.025)",
    Icon:        Network,
    items: [
      "Sale readiness and document collection",
      "Relevant professionals and the buyer process",
      "Viewings where available and transaction coordination",
    ],
  },
  {
    role:        "Licensed professionals advise",
    railColor:   "#7C3AED",
    headingColor:"#6D28D9",
    overlay:     "rgba(124,58,237,.025)",
    Icon:        Scale,
    items: [
      "Title and legal conclusions",
      "Tax advice, computation and filings",
      "Other regulated professional matters",
    ],
  },
  {
    role:        "Authorities decide",
    railColor:   "#F97316",
    headingColor:"#C2410C",
    overlay:     "rgba(249,115,22,.025)",
    Icon:        Landmark,
    items: [
      "Registration and record changes",
      "Approvals and government processing",
    ],
  },
] as const;

function toSaleReadinessContext(answers: SaleReadinessAnswers): SaleReadinessContext | null {
  const keys: ReadinessKey[] = [
    "titleDocuments", "ownershipRecords", "duesCurrent", "ownersAligned", "executionPlan",
  ];
  if (!keys.every(k => answers[k] !== undefined)) return null;
  return answers as unknown as SaleReadinessContext;
}

// ── Band 6 section ─────────────────────────────────────────────────────────────

function NriSaleEnquirySection({
  answers,
  onRemoveSaleReadiness,
}: {
  answers: SaleReadinessAnswers;
  onRemoveSaleReadiness: () => void;
}) {
  return (
    <section
      aria-labelledby="sale-enquiry-title"
      style={{
        background: `
          radial-gradient(42% 46% at 5% 10%, rgba(37,99,235,.11) 0%, rgba(37,99,235,.025) 52%, transparent 76%),
          radial-gradient(38% 44% at 96% 12%, rgba(20,184,166,.10) 0%, rgba(20,184,166,.02) 52%, transparent 76%),
          radial-gradient(42% 38% at 72% 100%, rgba(124,58,237,.08) 0%, rgba(124,58,237,.015) 54%, transparent 78%),
          linear-gradient(180deg, #F5F9FF 0%, #FCFDFE 48%, #F8FBFA 100%)
        `,
        backgroundColor: "#FAFCFD",
      }}
    >
      <style>{ENQUIRY_STYLE}</style>
      <div className="max-w-[1320px] mx-auto px-5 sm:px-8 lg:px-12 pt-[64px] lg:pt-[94px] pb-[72px] lg:pb-[94px]">

        {/* Intro */}
        <div>
          <p className="text-[12px] lg:text-[13px] font-[700] uppercase tracking-[0.11em] text-[#2563EB]"
             style={{ fontFamily: SANS }}>
            WHO DOES WHAT
          </p>
          <h2
            id="sale-enquiry-title"
            className="mt-[12px] text-[clamp(35px,9vw,42px)] lg:text-[clamp(44px,3.8vw,58px)] text-[#101828] max-w-[880px]"
            style={{ fontFamily: SERIF, fontWeight: 400, lineHeight: 1.03, letterSpacing: "-0.015em" }}
          >
            Tell us about the property. We&rsquo;ll work out the next step.
          </h2>
          <p
            className="mt-[14px] text-[15.5px] lg:text-[17.5px] max-w-[760px]"
            style={{ fontFamily: SANS, fontWeight: 450, lineHeight: 1.55, color: "#526174" }}
          >
            An NRI property sale involves decisions, coordination, professional advice and government
            processes. Here&rsquo;s what Reeve coordinates &mdash; and what remains with you, licensed
            professionals or the relevant authorities.
          </p>
        </div>

        {/* Responsibility Board */}
        <div className="relative max-w-[1180px] mx-auto overflow-visible mt-[28px] min-[1200px]:mt-[36px]">

          {/* 2.5D depth plane */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 translate-x-[4px] translate-y-[6px] min-[1200px]:translate-x-[6px] min-[1200px]:translate-y-[8px] rounded-[20px] min-[1200px]:rounded-[24px]"
            style={{
              background: "linear-gradient(135deg, rgba(37,99,235,.24), rgba(20,184,166,.22) 38%, rgba(124,58,237,.18) 68%, rgba(249,115,22,.20))",
            }}
          />

          {/* Main board surface */}
          <div
            className="relative z-[1] overflow-hidden rounded-[20px] min-[1200px]:rounded-[24px]"
            style={{
              background: "linear-gradient(145deg, #FFFFFF 0%, #FBFDFD 56%, #FAFBFF 100%)",
              border: "1px solid #DCE6EE",
              boxShadow: "0 24px 70px rgba(15,23,42,.08), 0 5px 16px rgba(15,23,42,.04)",
            }}
          >
            {/* 4-colour rail */}
            <div className="flex h-[3px]">
              {RESPONSIBILITY_ROLES.map(r => (
                <div key={r.role} className="flex-1" style={{ background: r.railColor }} />
              ))}
            </div>

            {/* Role lanes */}
            <ul
              aria-label="Responsibility breakdown"
              className="flex flex-col min-[1200px]:grid min-[1200px]:grid-cols-4"
            >
              {RESPONSIBILITY_ROLES.map((r, idx) => (
                <li
                  key={r.role}
                  className={[
                    "nri-resp-lane relative",
                    idx < 3 ? "border-b border-[#E2E8F0] min-[1200px]:border-b-0 min-[1200px]:border-r" : "",
                  ].join(" ")}
                  style={{ "--resp-icon-hover-border": `${r.railColor}80` } as React.CSSProperties}
                >
                  {/* Hover overlay */}
                  <div
                    aria-hidden="true"
                    className="nri-resp-overlay absolute inset-0 pointer-events-none"
                    style={{ background: r.overlay, opacity: 0 }}
                  />

                  {/* Content — 2-col grid mobile, block desktop */}
                  <div className="grid grid-cols-[44px_minmax(0,1fr)] gap-[13px] px-[18px] py-[19px] min-[1200px]:block min-[1200px]:px-[28px] min-[1200px]:py-[30px]">

                    {/* Icon */}
                    <div className="relative w-[44px] h-[44px] min-[1200px]:w-[48px] min-[1200px]:h-[48px] flex items-center justify-center shrink-0">
                      <div
                        aria-hidden="true"
                        className="absolute inset-0 translate-x-[3px] translate-y-[4px] rounded-[11px] pointer-events-none"
                        style={{ background: `${r.railColor}30` }}
                      />
                      <div
                        className="nri-resp-icon-tile relative z-[1] w-[44px] h-[44px] min-[1200px]:w-[48px] min-[1200px]:h-[48px] rounded-[11px] flex items-center justify-center"
                        style={{
                          background: `linear-gradient(145deg, #FFFFFF 0%, ${r.railColor}0A 100%)`,
                          border: `1px solid ${r.railColor}38`,
                          boxShadow: "inset 0 1px 0 rgba(255,255,255,.80), 0 4px 14px rgba(0,0,0,.07)",
                        }}
                      >
                        <r.Icon size={18} aria-hidden="true" style={{ color: r.railColor }} />
                      </div>
                    </div>

                    {/* Heading + bullets */}
                    <div className="min-w-0 min-[1200px]:mt-[16px]">
                      <h3
                        className="text-[16.5px] leading-[1.28] min-[1200px]:text-[19px] min-[1200px]:leading-[1.25]"
                        style={{ fontFamily: SANS, fontWeight: 650, color: r.headingColor }}
                      >
                        {r.role}
                      </h3>
                      <ul className="mt-[14px] min-[1200px]:mt-[18px] flex flex-col gap-[10px] min-[1200px]:gap-[11px]">
                        {r.items.map(item => (
                          <li key={item} className="flex items-start gap-[8px]">
                            <div
                              aria-hidden="true"
                              className="shrink-0 mt-[6px] w-[5px] h-[5px] rounded-full"
                              style={{ background: r.railColor }}
                            />
                            <span
                              className="text-[13.5px] min-[1200px]:text-[14px]"
                              style={{ fontFamily: SANS, fontWeight: 500, lineHeight: 1.5, color: "#475569" }}
                            >
                              {item}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>

                  </div>
                </li>
              ))}
            </ul>

            {/* No-promises boundary */}
            <aside
              className="border-t border-[#E2E8F0] flex items-start gap-[10px]"
              style={{
                padding: "14px 20px",
                background: "linear-gradient(90deg, #FFF7ED 0%, #FFFBF5 48%, #F8FAFC 100%)",
              }}
            >
              <ShieldCheck size={16} aria-hidden="true" className="shrink-0 mt-[1px]" style={{ color: "#F97316" }} />
              <p
                className="text-[13.5px] min-[1200px]:text-[14px]"
                style={{ fontFamily: SANS, fontWeight: 500, lineHeight: 1.5, color: "#475569" }}
              >
                We don&apos;t promise a buyer, sale price, sale date, legal or tax outcome, or government timeline.
              </p>
            </aside>

          </div>
        </div>

        {/* Enquiry form */}
        <div
          id="enquiry"
          className="mt-[40px] min-[1200px]:mt-[54px] max-w-[640px] scroll-mt-16"
        >
          <p
            className="text-[12px] min-[1200px]:text-[13px] font-[700] uppercase tracking-[0.11em] mb-[20px]"
            style={{ fontFamily: SANS, color: "#7C3AED" }}
          >
            ENQUIRY
          </p>
          <div
            className="rounded-[18px] lg:rounded-[22px] border border-[#E8E6E1] shadow-[0_18px_55px_rgba(15,23,42,.08)]"
            style={{ background: "#FFFDFC" }}
          >
            <div className="p-5 sm:p-7 lg:p-8">
              <PropertyEnquiryForm
                initialService="nri_property_sale"
                saleReadiness={toSaleReadinessContext(answers)}
                onRemoveSaleReadiness={onRemoveSaleReadiness}
              />
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function NriPropertySaleIndia() {
  const [answers, setAnswers] = useState<SaleReadinessAnswers>({});

  return (
    <Layout>
      <NriSaleHeroSection />
      <NriSaleReadinessSection
        answers={answers}
        onAnswer={(key, value) => setAnswers(prev => ({ ...prev, [key]: value }))}
      />
      <NriSaleJourneySection />
      <NriSaleTaxMoneySection />
      <NriSaleDecisionSection />
      <NriSaleEnquirySection
        answers={answers}
        onRemoveSaleReadiness={() => setAnswers({})}
      />
    </Layout>
  );
}
