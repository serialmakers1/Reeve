import { useState, useEffect, useRef } from "react";
import type { LucideIcon } from "lucide-react";
import {
  CalendarCheck, Folder, CheckCircle,
  Search, ShieldCheck, FileText, Wrench,
  MessageCircle, PenLine, Users,
  Droplets, Wind, Mail,
  Landmark, Zap, MessageSquare,
  CheckCircle2, Check,
  House, Building2, ReceiptText,
  KeyRound, FileCheck2,
} from "lucide-react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";
import PropertyEnquiryForm from "@/components/property-services/PropertyEnquiryForm";

const SERIF = "'Instrument Serif', Georgia, serif";
const SANS = "'DM Sans', system-ui, sans-serif";

const proofItems = [
  { icon: CalendarCheck, text: "12 visits/year" },
  { icon: Folder, text: "Dated property record" },
  { icon: CheckCircle, text: "Free assessment before you commit" },
] as const;

type RiskId = "damp" | "water" | "pests" | "utilities" | "door";

interface RiskItem {
  readonly id: RiskId;
  readonly label: string;
  readonly description: string;
  readonly hotspot: { readonly left: number; readonly top: number };
  readonly connector: readonly [string, string, string];
}

const RISKS: readonly RiskItem[] = [
  {
    id: "damp", label: "Damp",
    description: "A small damp patch or seepage stain can spread for months before anyone sees the change.",
    hotspot: { left: 42, top: 14 },
    connector: ["42,14", "31,25", "22,70"],
  },
  {
    id: "water", label: "Water",
    description: "Unused taps, flushes and drains can develop leaks, blockages or dry traps while nobody is there.",
    hotspot: { left: 63, top: 35 },
    connector: ["63,35", "50,49", "24,70"],
  },
  {
    id: "pests", label: "Pests",
    description: "Pest activity can start in drains, cupboards or corners and remain unnoticed for weeks.",
    hotspot: { left: 74, top: 47 },
    connector: ["74,47", "58,59", "25,70"],
  },
  {
    id: "utilities", label: "Utilities",
    description: "A tripped switch, meter issue or utility notice can sit unresolved until someone checks.",
    hotspot: { left: 67, top: 76 },
    connector: ["67,76", "51,74", "26,70"],
  },
  {
    id: "door", label: "Door & notices",
    description: "A loose lock, tampering mark or society notice can go unseen while the home stays closed.",
    hotspot: { left: 49, top: 71 },
    connector: ["49,71", "38,71", "26,70"],
  },
];

type VisitMode = "inspect" | "prevent" | "admin" | "repairs" | "record";

interface VisitModeItem {
  readonly id: VisitMode;
  readonly label: string;
  readonly Icon: LucideIcon;
}

const VISIT_MODES: readonly VisitModeItem[] = [
  { id: "inspect",  label: "Inspect", Icon: Search },
  { id: "prevent",  label: "Prevent", Icon: ShieldCheck },
  { id: "admin",    label: "Admin",   Icon: FileText },
  { id: "repairs",  label: "Repairs", Icon: Wrench },
  { id: "record",   label: "Record",  Icon: CalendarCheck },
];

interface ClosingNode {
  readonly id: string;
  readonly label: string;
  readonly Icon: LucideIcon;
}

const CLOSING_NODES: readonly ClosingNode[] = [
  { id: "find",       label: "Find",       Icon: Search },
  { id: "tell",       label: "Tell",       Icon: MessageCircle },
  { id: "approve",    label: "Approve",    Icon: PenLine },
  { id: "coordinate", label: "Coordinate", Icon: Users },
  { id: "record",     label: "Record",     Icon: CalendarCheck },
];

type WatchPropertyType = "upTo3" | "large";

const WATCH_PRICING: Record<WatchPropertyType, {
  label: string;
  Icon: LucideIcon;
  monthly: number;
  sixMonths: number;
  sixMonthSaving: number;
  twelveMonths: number;
  twelveMonthSaving: number;
}> = {
  upTo3: {
    label: "Up to 3 BHK",
    Icon: House,
    monthly: 2000,
    sixMonths: 11000,
    sixMonthSaving: 1000,
    twelveMonths: 21000,
    twelveMonthSaving: 3000,
  },
  large: {
    label: "4 BHK+ / villa / independent home",
    Icon: Building2,
    monthly: 3000,
    sixMonths: 17000,
    sixMonthSaving: 1000,
    twelveMonths: 32000,
    twelveMonthSaving: 4000,
  },
};

const inr = (n: number) => "₹" + n.toLocaleString("en-IN");

// ── Section 1: Hero ───────────────────────────────────────────────────────

function HeroSection() {
  function handleEnquiryClick(e: React.MouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    const target = document.getElementById("enquiry");
    if (!target) return;
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ behavior: prefersReduced ? "auto" : "smooth" });
  }

  function handleMonthlyVisitClick(e: React.MouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    const target = document.getElementById("monthly-visit");
    if (!target) return;
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ behavior: prefersReduced ? "auto" : "smooth" });
  }

  return (
    <section
      id="hero"
      aria-labelledby="watch-hero-h1"
      className="bg-[#FCF9F3] pt-9 pb-8 sm:pt-12 sm:pb-12 lg:py-20"
    >
      <div className="mx-auto max-w-[1240px] px-5 sm:px-8 lg:px-10">
        <div className="lg:grid lg:grid-cols-[46fr_54fr] lg:items-center lg:gap-12">

          {/* Left: copy column */}
          <div className="flex min-w-0 flex-col">

            {/* Display statement — editorial, not the semantic h1 */}
            <p
              className="text-[38px] sm:text-[42px] lg:text-[clamp(54px,4.5vw,64px)] font-normal leading-[1.00] tracking-[-0.025em] text-[#0B1526]"
              style={{ fontFamily: SERIF }}
            >
              Your property may be empty.
            </p>
            <p
              className="text-[38px] sm:text-[42px] lg:text-[clamp(54px,4.5vw,64px)] font-normal leading-[1.00] tracking-[-0.025em] text-[#0B756B]"
              style={{ fontFamily: SERIF }}
            >
              It shouldn&#8217;t be unattended.
            </p>

            {/* Semantic H1 with teal dot */}
            <div className="mt-4 lg:mt-5 flex items-center gap-2">
              <span
                className="w-[6px] h-[6px] rounded-full flex-shrink-0 bg-[#0F9F8F]"
                aria-hidden="true"
              />
              <h1
                id="watch-hero-h1"
                className="text-[16px] sm:text-[17px] lg:text-[18px] font-[700] leading-[1.3] text-[#526173]"
                style={{ fontFamily: SANS }}
              >
                Vacant Property Care in Bangalore
              </h1>
            </div>

            {/* Supporting copy */}
            <p
              className="mt-4 lg:mt-5 max-w-[490px] text-[15.5px] lg:text-[17px] font-[500] leading-[1.5] text-[#46566B]"
              style={{ fontFamily: SANS }}
            >
              We visit every month, run preventive checks and coordinate anything that needs attention.
            </p>

            {/* Price */}
            <div className="mt-[22px] flex items-baseline gap-[5px]" style={{ fontFamily: SANS }}>
              <span className="text-[14px] font-[600] text-[#596778]">From</span>
              <span
                className="text-[27px] sm:text-[30px] lg:text-[32px] font-[700] leading-none text-[#0057F2]"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                &#8377;2,000
              </span>
              <span className="text-[15px] font-[600] text-[#596778]">/month</span>
            </div>

            {/* CTAs */}
            <div className="mt-[22px]">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <a
                  href="#enquiry"
                  onClick={handleEnquiryClick}
                  className="inline-flex w-full sm:w-auto items-center justify-center rounded-[13px] bg-[#0057F2] px-6 text-[16px] font-[700] text-white shadow-[0_8px_22px_rgba(0,87,242,.18)] transition-all duration-[160ms] hover:-translate-y-px hover:bg-[#0047D0] active:bg-[#003FB8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0057F2]"
                  style={{ fontFamily: SANS, height: 52 }}
                >
                  Tell us about your property →
                </a>
                <a
                  href="#monthly-visit"
                  onClick={handleMonthlyVisitClick}
                  className="flex items-center justify-center sm:justify-start min-h-[44px] sm:min-h-[48px] text-[15px] font-[650] transition-colors duration-[130ms] rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0057F2]"
                  style={{ fontFamily: SANS, color: "#1F334F" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#0057F2")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#1F334F")}
                >
                  See what happens every month ↓
                </a>
              </div>
            </div>

            {/* Proof strip — desktop only */}
            <div className="mt-[22px] hidden lg:flex items-center gap-6 flex-wrap">
              {proofItems.map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-[7px]">
                  <Icon size={14} className="flex-shrink-0 text-[#0F9F8F]" strokeWidth={2.2} aria-hidden="true" />
                  <span
                    className="text-[13.5px] font-[600] text-[#536176]"
                    style={{ fontFamily: SANS }}
                  >
                    {text}
                  </span>
                </div>
              ))}
            </div>

          </div>

          {/* Right: artwork + mobile proof */}
          <div className="mt-8 lg:mt-0">
            <div className="vpc-hero-art flex items-center justify-center lg:justify-end">
              <img
                src="/images/vacant_1.webp"
                alt="Empty apartment with a dated monthly visit record, room check and meter reading."
                width={1402}
                height={1122}
                className="h-auto w-full max-w-[360px] object-contain sm:max-w-[420px] lg:max-w-none lg:w-full xl:max-w-[680px]"
                loading="eager"
                fetchPriority="high"
                decoding="async"
              />
            </div>

            {/* Proof strip — mobile only, 3-column after artwork */}
            <div className="mt-6 grid grid-cols-3 gap-3 lg:hidden">
              {proofItems.map(({ icon: Icon, text }) => (
                <div key={text} className="flex flex-col items-center gap-1.5 text-center">
                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-full"
                    style={{ background: "#E6F7F5" }}
                    aria-hidden="true"
                  >
                    <Icon size={15} className="text-[#0F9F8F]" strokeWidth={2} />
                  </span>
                  <span
                    className="text-[12px] font-[600] leading-[1.35] text-[#536176]"
                    style={{ fontFamily: SANS }}
                  >
                    {text}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

// ── Section 2: Quiet Risks ────────────────────────────────────────────────

function QuietRisksSection() {
  const [selectedRisk, setSelectedRisk] = useState<RiskId>("damp");
  const [hoveredRisk, setHoveredRisk] = useState<RiskId | null>(null);
  const effectiveId = hoveredRisk ?? selectedRisk;

  return (
    <section
      id="quiet-risks"
      aria-labelledby="watch-risk-heading"
      style={{
        background: `
          radial-gradient(circle at 77% 34%, rgba(9,145,176,.14) 0%, rgba(9,145,176,.05) 29%, transparent 56%),
          radial-gradient(circle at 12% 82%, rgba(0,87,242,.07) 0%, transparent 36%),
          linear-gradient(180deg, #010713 0%, #03111F 48%, #010814 100%)
        `,
      }}
    >
      <div className="mx-auto max-w-[1240px] px-5 sm:px-8 lg:px-10 pt-[60px] pb-[60px] lg:pt-[84px] lg:pb-[80px]">

        {/* Intro copy */}
        <div className="lg:text-center">
          <h2
            id="watch-risk-heading"
            className="mx-auto font-normal leading-[1.02] tracking-[-0.02em] text-[#FFFDFC] text-[clamp(36px,9.8vw,40px)] lg:text-[clamp(46px,4vw,54px)] max-w-[720px] text-left lg:text-center"
            style={{ fontFamily: SERIF }}
          >
            A locked property changes quietly.
          </h2>
          <p
            className="mt-[14px] font-[500] leading-[1.5] text-left lg:text-center mx-auto max-w-[610px] text-[15.5px] text-[#B5C4D1] lg:text-[17px] lg:text-[#B8C7D5]"
            style={{ fontFamily: SANS }}
          >
            Small problems can sit unnoticed for months when nobody is there to see them.
          </p>
        </div>

        {/* Desktop interactive stage */}
        <div className="hidden lg:block mt-[38px]">
          <div className="relative mx-auto max-w-[1080px]">

            <img
              src="/images/vacant_2.webp"
              alt="Cutaway illustration of an empty apartment showing areas where damp, water, pests, utilities and entry issues may develop unnoticed."
              width={1586}
              height={992}
              className="vpc-risk-art w-full h-auto object-contain"
              loading="lazy"
              decoding="async"
            />

            {RISKS.map((risk) => {
              const isActive = effectiveId === risk.id;
              return (
                <button
                  key={risk.id}
                  type="button"
                  className="absolute z-10 flex items-center gap-[7px] cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFFDFC] motion-reduce:transition-none"
                  style={{
                    left: `${risk.hotspot.left}%`,
                    top: `${risk.hotspot.top}%`,
                    transform: "translate(-14px, -50%)",
                    minHeight: 44,
                    padding: "4px 0",
                  }}
                  aria-pressed={selectedRisk === risk.id}
                  aria-controls="vpc-risk-detail-desktop"
                  onMouseEnter={() => setHoveredRisk(risk.id)}
                  onMouseLeave={() => setHoveredRisk(null)}
                  onFocus={() => setHoveredRisk(risk.id)}
                  onBlur={() => setHoveredRisk(null)}
                  onClick={() => setSelectedRisk(risk.id)}
                >
                  {/* Signal marker */}
                  <span className="relative flex-shrink-0" style={{ width: 28, height: 28 }}>
                    {/* Halo — always rendered, opacity+scale transition */}
                    <span
                      className="absolute inset-0 rounded-full transition-[opacity,transform] duration-[200ms] motion-reduce:transition-none"
                      style={{
                        background: "radial-gradient(circle, rgba(244,111,82,.28) 0%, rgba(244,111,82,.10) 48%, transparent 72%)",
                        opacity: isActive ? 1 : 0,
                        transform: `scale(${isActive ? 1 : 0.7})`,
                      }}
                    />
                    {/* Outer ring */}
                    <span
                      className="absolute inset-0 rounded-full transition-all duration-[170ms] motion-reduce:transition-none"
                      style={{
                        background: isActive ? "rgba(244,111,82,.20)" : "rgba(244,111,82,.15)",
                        border: `1px solid ${isActive ? "rgba(244,111,82,.55)" : "rgba(244,111,82,.38)"}`,
                      }}
                    />
                    {/* Core dot — vpc-marker-pop keyframe on activation */}
                    <span
                      className={`absolute rounded-full transition-colors duration-[170ms] motion-reduce:transition-none${isActive ? " vpc-marker-pop" : ""}`}
                      style={{
                        width: 10, height: 10,
                        top: "50%", left: "50%",
                        transform: "translate(-50%,-50%)",
                        background: isActive ? "#FF6845" : "#F46F52",
                      }}
                    />
                  </span>

                  {/* Label capsule — gradient overlay fades in/out */}
                  <span
                    className="relative overflow-hidden rounded-[10px] whitespace-nowrap transition-[box-shadow] duration-[170ms] motion-reduce:transition-none"
                    style={{
                      fontFamily: SANS,
                      background: "rgba(7,20,38,.90)",
                      border: "1px solid rgba(255,255,255,.15)",
                      boxShadow: isActive ? "0 8px 22px rgba(244,111,82,.18)" : "0 8px 24px rgba(0,0,0,.18)",
                    }}
                  >
                    <span
                      className="absolute inset-0 transition-opacity duration-[170ms] motion-reduce:transition-none"
                      style={{
                        background: "linear-gradient(135deg, #FF806A 0%, #F46F52 100%)",
                        opacity: isActive ? 1 : 0,
                      }}
                    />
                    <span
                      className="relative z-10 inline-block px-[11px] py-[8px] text-[13px] font-[650] transition-[color,transform] duration-[170ms] motion-reduce:transition-none"
                      style={{
                        color: isActive ? "#071426" : "#EEF4F7",
                        transform: isActive ? "translateY(-1px)" : "translateY(0)",
                      }}
                    >
                      {risk.label}
                    </span>
                  </span>
                </button>
              );
            })}

            {/* Explanation card — lower-left, stacked content crossfades */}
            <div
              id="vpc-risk-detail-desktop"
              aria-live="polite"
              className="absolute z-20 w-[345px] rounded-[16px] p-[20px]"
              style={{
                bottom: "4%", left: "1%",
                background: "linear-gradient(135deg, #FFFDF8 0%, #FFF7EA 100%)",
                border: "1px solid rgba(255,255,255,.70)",
                boxShadow: "0 18px 44px rgba(0,0,0,.24)",
              }}
            >
              <div className="grid">
                {RISKS.map((risk) => {
                  const isActiveCard = effectiveId === risk.id;
                  return (
                    <div
                      key={risk.id}
                      className="[grid-area:1/1] transition-[opacity,transform] duration-[180ms] motion-reduce:transition-none"
                      style={{
                        opacity: isActiveCard ? 1 : 0,
                        transform: isActiveCard ? "translateY(0)" : "translateY(4px)",
                        pointerEvents: isActiveCard ? "auto" : "none",
                      }}
                      aria-hidden={isActiveCard ? undefined : true}
                    >
                      <div className="flex items-center gap-[8px]">
                        <span
                          className="flex-shrink-0 rounded-full"
                          style={{ width: 10, height: 10, background: "#F46F52" }}
                        />
                        <p
                          className="text-[29px] font-normal leading-none text-[#172235]"
                          style={{ fontFamily: SERIF }}
                        >
                          {risk.label}
                        </p>
                      </div>
                      <p
                        className="mt-[9px] text-[14.5px] font-[500] leading-[1.5] text-[#46566B]"
                        style={{ fontFamily: SANS }}
                      >
                        {risk.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Connectors — single SVG, all 5 lines crossfade */}
            <svg
              aria-hidden="true"
              className="absolute inset-0 w-full h-full"
              style={{ pointerEvents: "none" }}
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              {RISKS.map((risk) => (
                <polyline
                  key={risk.id}
                  vectorEffect="non-scaling-stroke"
                  points={risk.connector.join(" ")}
                  fill="none"
                  stroke="rgba(244,111,82,.55)"
                  strokeWidth="1.1"
                  strokeDasharray="4 4"
                  strokeLinecap="round"
                  className="transition-opacity duration-[170ms] motion-reduce:transition-none"
                  style={{ opacity: effectiveId === risk.id ? 1 : 0 }}
                />
              ))}
            </svg>

          </div>
        </div>

        {/* Mobile layout */}
        <div className="lg:hidden mt-[26px]">

          {/* Artwork with decorative markers */}
          <div className="relative mx-auto max-w-[360px]">
            <img
              src="/images/vacant_2.webp"
              alt="Cutaway illustration of an empty apartment showing areas where damp, water, pests, utilities and entry issues may develop unnoticed."
              width={1586}
              height={992}
              className="w-full h-auto object-contain"
              loading="lazy"
              decoding="async"
            />
            {RISKS.map((risk) => {
              const isActive = selectedRisk === risk.id;
              return (
                <span
                  key={risk.id}
                  aria-hidden="true"
                  className="absolute h-3 w-3 rounded-full transition-[transform,opacity,background-color,box-shadow] duration-[160ms] motion-reduce:transition-none"
                  style={{
                    left: `${risk.hotspot.left}%`,
                    top: `${risk.hotspot.top}%`,
                    transform: `translate(-50%, -50%) scale(${isActive ? 1 : 0.67})`,
                    background: isActive ? "#FF6845" : "rgba(244,111,82,.55)",
                    boxShadow: isActive ? "0 0 8px rgba(244,111,82,.55)" : "none",
                    opacity: isActive ? 1 : 0.7,
                  }}
                />
              );
            })}
          </div>

          {/* Horizontal risk rail */}
          <div
            className="mt-4 flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            style={{ scrollSnapType: "x proximity" }}
          >
            {RISKS.map((risk) => {
              const isActive = selectedRisk === risk.id;
              return (
                <button
                  key={risk.id}
                  type="button"
                  className="relative inline-flex items-center justify-center flex-shrink-0 overflow-hidden rounded-[11px] transition-[border-color,box-shadow] duration-[160ms] motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFFDFC]"
                  style={{
                    fontFamily: SANS,
                    height: 44,
                    scrollSnapAlign: "start",
                    background: "rgba(255,255,255,.07)",
                    border: `1px solid ${isActive ? "#F46F52" : "rgba(255,255,255,.13)"}`,
                    boxShadow: isActive ? "0 4px 14px rgba(244,111,82,.22)" : "none",
                  }}
                  aria-pressed={selectedRisk === risk.id}
                  aria-controls="vpc-risk-detail-mobile"
                  onClick={() => setSelectedRisk(risk.id)}
                >
                  <span
                    className="absolute inset-0 transition-opacity duration-[160ms] motion-reduce:transition-none"
                    style={{
                      background: "linear-gradient(135deg, #FF806A 0%, #F46F52 100%)",
                      opacity: isActive ? 1 : 0,
                    }}
                  />
                  <span
                    className="relative z-10 px-[14px] text-[13.5px] font-[650] transition-[color,transform] duration-[160ms] motion-reduce:transition-none"
                    style={{
                      color: isActive ? "#071426" : "#DCE6ED",
                      transform: isActive ? "translateY(-1px)" : "translateY(0)",
                    }}
                  >
                    {risk.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Mobile explanation card — stacked content crossfades */}
          <div
            id="vpc-risk-detail-mobile"
            aria-live="polite"
            className="mt-[14px] w-full rounded-[14px] p-[17px]"
            style={{
              minHeight: 100,
              background: "linear-gradient(135deg, #FFFDF8 0%, #FFF7EA 100%)",
              border: "1px solid rgba(255,255,255,.70)",
              boxShadow: "0 18px 44px rgba(0,0,0,.24)",
            }}
          >
            <div className="grid">
              {RISKS.map((risk) => {
                const isActiveCard = selectedRisk === risk.id;
                return (
                  <div
                    key={risk.id}
                    className="[grid-area:1/1] transition-[opacity,transform] duration-[170ms] motion-reduce:transition-none"
                    style={{
                      opacity: isActiveCard ? 1 : 0,
                      transform: isActiveCard ? "translateY(0)" : "translateY(4px)",
                      pointerEvents: isActiveCard ? "auto" : "none",
                    }}
                    aria-hidden={isActiveCard ? undefined : true}
                  >
                    <div className="flex items-center gap-[7px]">
                      <span
                        className="flex-shrink-0 rounded-full"
                        style={{ width: 8, height: 8, background: "#F46F52" }}
                      />
                      <p
                        className="text-[24px] font-normal leading-none text-[#172235]"
                        style={{ fontFamily: SERIF }}
                      >
                        {risk.label}
                      </p>
                    </div>
                    <p
                      className="mt-[8px] text-[14px] font-[500] leading-[1.5] text-[#46566B]"
                      style={{ fontFamily: SANS }}
                    >
                      {risk.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Audience cue */}
        <div className="mt-6 lg:mt-[24px]">
          <div style={{ borderTop: "1px solid rgba(255,255,255,.10)" }} />
          <p
            className="mt-[20px] lg:mt-[24px] text-left lg:text-center font-[550] leading-[1.5] text-[12.5px] text-[#9FB2C0] lg:text-[13.5px]"
            style={{ fontFamily: SANS }}
          >
            Useful when you&#8217;re abroad · holding an inherited home · keeping it for family · investing long-term · between uses
          </p>
        </div>

      </div>
    </section>
  );
}

// ── Section 3: Monthly Visit Console ─────────────────────────────────────

function MonthlyVisitSection() {
  const [selectedMode, setSelectedMode] = useState<VisitMode>("repairs");
  const [hoveredMode, setHoveredMode] = useState<VisitMode | null>(null);
  const effectiveMode = hoveredMode ?? selectedMode;

  const sectionRef = useRef<HTMLElement>(null);
  const [sectionVisible, setSectionVisible] = useState(false);
  const loopRef = useRef<HTMLDivElement>(null);
  const [loopReady, setLoopReady] = useState(false);
  const [loopVisible, setLoopVisible] = useState(false);

  useEffect(() => {
    const secObs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setSectionVisible(true); secObs.unobserve(e.target); } },
      { threshold: 0.08 }
    );
    const loopObs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setLoopVisible(true); loopObs.unobserve(e.target); } },
      { threshold: 0.2 }
    );
    if (sectionRef.current) secObs.observe(sectionRef.current);
    if (loopRef.current) {
      setLoopReady(true);
      loopObs.observe(loopRef.current);
    }
    return () => { secObs.disconnect(); loopObs.disconnect(); };
  }, []);

  const INSPECT_ITEMS = [
    "Locks, doors & windows",
    "Damp & seepage",
    "Pests & drainage",
    "Meters & visible damage",
    "Balcony / ingress points",
    "Front-door condition",
  ] as const;

  const PREVENT_ACTIONS: { label: string; Icon: LucideIcon }[] = [
    { label: "Run taps and flushes",           Icon: Droplets },
    { label: "Ventilate where safe",            Icon: Wind },
    { label: "Collect and photograph notices",  Icon: Mail },
  ];

  const ADMIN_ITEMS: { label: string; Icon: LucideIcon }[] = [
    { label: "Tax / society reminders",  Icon: Landmark },
    { label: "Utility tracking",          Icon: Zap },
    { label: "Society communication",     Icon: MessageSquare },
    { label: "Property documents",        Icon: Folder },
  ];

  const REPAIR_STEPS: { label: string; detail: string; isFinal: boolean }[] = [
    { label: "Found",    detail: "Leaking tap",               isFinal: false },
    { label: "Estimate", detail: "₹4,600",                    isFinal: false },
    { label: "Approval", detail: "Written approval received", isFinal: false },
    { label: "Complete", detail: "Before / after attached",   isFinal: true },
  ];

  const RECORD_OUTPUTS = [
    "Monthly dated history",
    "Annual condition record",
    "Monthly statement",
    "Before / after records",
  ] as const;

  return (
    <section
      ref={sectionRef}
      id="monthly-visit"
      aria-labelledby="watch-monthly-heading"
      className={sectionVisible ? "vpc-section-visible" : ""}
      style={{
        background: `
          radial-gradient(ellipse at 50% 0%, rgba(15,159,143,.14) 0%, rgba(15,159,143,.05) 28%, transparent 58%),
          radial-gradient(circle at 13% 25%, rgba(15,159,143,.11) 0%, rgba(15,159,143,.035) 31%, transparent 52%),
          radial-gradient(circle at 86% 31%, rgba(0,87,242,.075) 0%, transparent 38%),
          linear-gradient(180deg, #F1FCF9 0%, #EAF8F5 52%, #F4FBFA 100%)
        `,
      }}
    >
      <div className="mx-auto max-w-[1240px] px-5 sm:px-8 lg:px-10 pt-16 pb-[68px] lg:pt-[92px] lg:pb-[92px]">

        {/* Intro */}
        <div className="vpc-monthly-intro lg:text-center">
          <h2
            id="watch-monthly-heading"
            className="mx-auto font-normal leading-[1.02] tracking-[-0.02em] text-[#0B1526]
                       text-[clamp(36px,9.8vw,40px)] lg:text-[clamp(46px,4.2vw,56px)]
                       max-w-[760px] text-left lg:text-center"
            style={{ fontFamily: SERIF }}
          >
            Every month ends with evidence.
          </h2>
          <p
            className="mt-[14px] font-[500] leading-[1.5] text-[#536676] mx-auto
                       text-[15.5px] lg:text-[17px] max-w-[630px] text-left lg:text-center"
            style={{ fontFamily: SANS }}
          >
            A dated record of what was checked, what changed and what happened next.
          </p>
        </div>

        {/* Console outer wrapper — no overflow clip; backing sheets must remain visible */}
        <div className="vpc-monthly-console relative mx-auto max-w-[1120px] mt-[28px] lg:mt-[40px]">

          {/* Backing layer 2 */}
          <div
            aria-hidden="true"
            className="absolute inset-0 rounded-[22px]"
            style={{
              transform: "translate(14px, 13px)",
              background: "rgba(15,159,143,.07)",
              border: "1px solid rgba(15,159,143,.10)",
              zIndex: 0,
            }}
          />
          {/* Backing layer 1 */}
          <div
            aria-hidden="true"
            className="absolute inset-0 rounded-[22px]"
            style={{
              transform: "translate(8px, 7px)",
              background: "#DDF2ED",
              border: "1px solid rgba(15,159,143,.14)",
              zIndex: 1,
            }}
          />

          {/* Main console card — overflow-hidden only here, not on the outer wrapper */}
          <div
            className="relative rounded-[22px] overflow-hidden"
            style={{
              background: "#FFFDFC",
              border: "1px solid rgba(15,159,143,.16)",
              boxShadow: "0 28px 70px rgba(7,20,38,.12), 0 8px 24px rgba(15,159,143,.07)",
              zIndex: 2,
            }}
          >
            {/* Header */}
            <div
              className="px-5 pt-[22px] pb-[18px] sm:px-7 sm:pt-[24px] lg:px-[32px] lg:pt-[28px] lg:pb-[22px]"
              style={{ borderBottom: "1px solid #E5EFEC" }}
            >
              <div className="flex flex-col gap-[4px] sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                <span
                  className="text-[10.5px] lg:text-[12px] font-[700] tracking-[0.08em] uppercase text-[#0B756B]"
                  style={{ fontFamily: SANS }}
                >
                  REEVE WATCH · APRIL PROPERTY VISIT
                </span>
                <span
                  className="text-[9.5px] lg:text-[10.5px] font-[620] tracking-[0.07em] uppercase text-[#6B7E83]"
                  style={{ fontFamily: SANS }}
                >
                  SAMPLE VISIT RECORD
                </span>
              </div>
              <div className="flex items-center gap-3 mt-[10px]">
                <span
                  className="text-[27px] sm:text-[32px] lg:text-[38px] leading-none text-[#172235]"
                  style={{ fontFamily: SERIF }}
                >
                  14 APR 2026
                </span>
                <span
                  className="inline-flex items-center gap-[5px] rounded-[8px] px-[9px] py-[5px]
                             text-[10px] lg:text-[11.5px] font-[700] tracking-[0.04em] text-[#526D12]"
                  style={{
                    fontFamily: SANS,
                    background: "#F0FBD7",
                    border: "1px solid rgba(126,168,29,.25)",
                  }}
                >
                  <span className="w-[6px] h-[6px] rounded-full bg-[#B9F227] flex-shrink-0" aria-hidden="true" />
                  COMPLETE
                </span>
              </div>
            </div>

            {/* Progress rail */}
            <div
              className="px-5 pt-[20px] pb-[20px] sm:px-7 lg:px-[32px] lg:pt-[24px] lg:pb-[22px]"
              style={{ borderBottom: "1px solid #E5EFEC" }}
            >
              <div
                role="group"
                aria-label="Monthly visit stages"
                className="relative flex items-start justify-between"
              >
                {/* Single connector — top is set via .vpc-monthly-connector CSS class */}
                <div
                  aria-hidden="true"
                  className="vpc-monthly-connector absolute h-[2px] bg-[#D5E8E3]"
                  style={{ left: "10%", right: "10%" }}
                />

                {VISIT_MODES.map((mode) => {
                  const isEffective = effectiveMode === mode.id;
                  const isSelected = selectedMode === mode.id;
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      aria-pressed={isSelected}
                      aria-controls={`watch-panel-${mode.id}`}
                      className="flex flex-col items-center gap-[8px] lg:gap-[10px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0F9F8F] rounded-sm"
                      style={{ width: "20%" }}
                      onPointerEnter={(e) => { if (e.pointerType === "mouse") setHoveredMode(mode.id); }}
                      onPointerLeave={(e) => { if (e.pointerType === "mouse") setHoveredMode(null); }}
                      onClick={() => setSelectedMode(mode.id)}
                    >
                      {/* Circle — responsive via Tailwind w-8/lg:w-12, NOT inline width */}
                      <span
                        className="relative flex items-center justify-center rounded-full
                                   w-8 h-8 lg:w-12 lg:h-12
                                   transition-[transform,box-shadow,border-color,background-color]
                                   duration-[190ms] motion-reduce:transition-none"
                        style={{
                          transform: isEffective ? "scale(1.09)" : "scale(1)",
                          /* Pale base always present — gradient fades over it; prevents hollow flash */
                          background: hoveredMode === mode.id && !isEffective ? "#E7F7F3" : "#F6FBFA",
                          border: `1px solid ${isEffective ? "transparent" : hoveredMode === mode.id ? "rgba(15,159,143,.35)" : "#CFE3DE"}`,
                          boxShadow: isEffective ? "0 0 0 4px rgba(15,159,143,.13)" : "none",
                        }}
                      >
                        {/* Teal gradient overlay — fades in/out */}
                        <span
                          className="absolute inset-0 rounded-full transition-opacity duration-[190ms] motion-reduce:transition-none"
                          style={{
                            background: "linear-gradient(135deg, #16AE9D 0%, #0F9F8F 100%)",
                            opacity: isEffective ? 1 : 0,
                          }}
                        />
                        {/* Lime accent dot — always mounted, follows effectiveMode */}
                        <span
                          className="absolute -top-[3px] -right-[3px] w-[8px] h-[8px] rounded-full bg-[#B9F227] border border-[#FFFDFC] transition-[opacity,transform] duration-[180ms] motion-reduce:transition-none"
                          aria-hidden="true"
                          style={{
                            opacity: isEffective ? 1 : 0,
                            transform: isEffective ? "scale(1)" : "scale(0.5)",
                          }}
                        />
                        {/* Single icon, responsive size via Tailwind className */}
                        <mode.Icon
                          strokeWidth={1.85}
                          aria-hidden="true"
                          className="relative z-10 w-[14px] h-[14px] lg:w-[20px] lg:h-[20px] transition-colors duration-[190ms] motion-reduce:transition-none"
                          style={{ color: isEffective ? "#FFFFFF" : hoveredMode === mode.id ? "#0B756B" : "#61777A" }}
                        />
                      </span>
                      {/* Label */}
                      <span
                        className="text-center transition-[color] duration-[190ms] motion-reduce:transition-none text-[10.5px] lg:text-[13px]"
                        style={{
                          fontFamily: SANS,
                          fontWeight: isEffective ? 700 : 600,
                          color: isEffective ? "#0B756B" : "#536676",
                          lineHeight: 1.2,
                        }}
                      >
                        {mode.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Content body */}
            <div className="px-5 py-[24px] sm:px-7 lg:px-[32px] lg:py-[30px]">
              {/* CSS-grid stack — all 5 panels mounted simultaneously, crossfade via opacity */}
              <div className="grid min-h-[260px] lg:min-h-[330px]">

                {/* ── INSPECT panel ── */}
                {(() => {
                  const isActive = effectiveMode === "inspect";
                  return (
                    <div
                      id="watch-panel-inspect"
                      className="[grid-area:1/1] transition-[opacity,transform] duration-[190ms] motion-reduce:transition-none"
                      style={{
                        opacity: isActive ? 1 : 0,
                        transform: isActive ? "translateY(0)" : "translateY(4px)",
                        pointerEvents: isActive ? "auto" : "none",
                      }}
                      aria-hidden={isActive ? undefined : true}
                    >
                      <div className="lg:flex lg:items-start lg:gap-[28px]">
                        <div className="min-w-0 lg:w-[52%]">
                          <h3
                            className="font-normal leading-[1.08] text-[#172235] text-[24px] sm:text-[26px] lg:text-[32px]"
                            style={{ fontFamily: SERIF }}
                          >
                            What gets checked
                          </h3>
                          <div className="mt-[18px] grid grid-cols-1 min-[360px]:grid-cols-2 gap-x-4 gap-y-0">
                            {INSPECT_ITEMS.map((item) => (
                              <div
                                key={item}
                                className="flex items-center gap-[8px] py-[9px]"
                                style={{ borderBottom: "1px solid #EBF3F0" }}
                              >
                                <span
                                  className="flex-shrink-0 w-4 h-4 rounded-full border border-[#0F9F8F] flex items-center justify-center"
                                  aria-hidden="true"
                                >
                                  <Check size={9} color="#0F9F8F" strokeWidth={2.5} aria-hidden="true" />
                                </span>
                                <span
                                  className="text-[13.5px] lg:text-[14px] font-[500] text-[#263B3F] leading-[1.3]"
                                  style={{ fontFamily: SANS }}
                                >
                                  {item}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="lg:w-[48%] mt-6 lg:mt-0">
                          <figure>
                            <img
                              src="/images/vacant_31.webp"
                              alt=""
                              aria-hidden="true"
                              width={1666}
                              height={944}
                              className="w-full h-auto object-contain rounded-[12px]"
                              loading="lazy"
                              decoding="async"
                            />
                            <figcaption className="sr-only">
                              Sample inspection evidence: Bathroom — Clear; Kitchen — Checked; Front door — Checked.
                            </figcaption>
                          </figure>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* ── PREVENT panel ── */}
                {(() => {
                  const isActive = effectiveMode === "prevent";
                  return (
                    <div
                      id="watch-panel-prevent"
                      className="[grid-area:1/1] transition-[opacity,transform] duration-[190ms] motion-reduce:transition-none"
                      style={{
                        opacity: isActive ? 1 : 0,
                        transform: isActive ? "translateY(0)" : "translateY(4px)",
                        pointerEvents: isActive ? "auto" : "none",
                      }}
                      aria-hidden={isActive ? undefined : true}
                    >
                      <div className="lg:flex lg:items-start lg:gap-[28px]">
                        <div className="min-w-0 lg:w-[52%]">
                          <h3
                            className="font-normal leading-[1.08] text-[#172235] text-[24px] sm:text-[26px] lg:text-[32px]"
                            style={{ fontFamily: SERIF }}
                          >
                            Small actions that prevent avoidable problems
                          </h3>
                          <div className="mt-[18px]">
                            {PREVENT_ACTIONS.map(({ label, Icon }) => (
                              <div
                                key={label}
                                className="flex items-center gap-[12px] py-[12px]"
                                style={{ borderBottom: "1px solid #EBF3F0" }}
                              >
                                <span
                                  className="flex-shrink-0 w-7 h-7 rounded-full bg-[#E6F7F4] flex items-center justify-center"
                                  aria-hidden="true"
                                >
                                  <Icon size={14} color="#0B756B" strokeWidth={1.8} aria-hidden="true" />
                                </span>
                                <span
                                  className="flex-1 text-[14px] font-[500] text-[#263B3F] leading-[1.3]"
                                  style={{ fontFamily: SANS }}
                                >
                                  {label}
                                </span>
                                <span
                                  className="flex-shrink-0 w-5 h-5 rounded-full bg-[#EFF9D5] flex items-center justify-center"
                                  aria-hidden="true"
                                  style={{ border: "1px solid rgba(126,168,29,.22)" }}
                                >
                                  <Check size={10} color="#526D12" strokeWidth={2.5} aria-hidden="true" />
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="lg:w-[48%] mt-6 lg:mt-0">
                          <div
                            className="rounded-[16px] p-[20px] lg:p-[22px]"
                            style={{ background: "#F7FBFA", border: "1px solid #DCECE8" }}
                          >
                            <div className="flex items-center gap-[10px]">
                              <span
                                className="flex-shrink-0 w-8 h-8 rounded-full bg-[#E6F7F4] flex items-center justify-center"
                                aria-hidden="true"
                              >
                                <Droplets size={15} color="#0B756B" strokeWidth={1.8} aria-hidden="true" />
                              </span>
                              <p
                                className="text-[20px] lg:text-[22px] font-normal leading-[1.1] text-[#172235]"
                                style={{ fontFamily: SERIF }}
                              >
                                Want it cleaned too?
                              </p>
                            </div>
                            <p
                              className="mt-[10px] text-[13.5px] font-[500] leading-[1.5] text-[#536676]"
                              style={{ fontFamily: SANS }}
                            >
                              Cleaning can be arranged during the visit at actual cost.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* ── ADMIN panel ── */}
                {(() => {
                  const isActive = effectiveMode === "admin";
                  return (
                    <div
                      id="watch-panel-admin"
                      className="[grid-area:1/1] transition-[opacity,transform] duration-[190ms] motion-reduce:transition-none"
                      style={{
                        opacity: isActive ? 1 : 0,
                        transform: isActive ? "translateY(0)" : "translateY(4px)",
                        pointerEvents: isActive ? "auto" : "none",
                      }}
                      aria-hidden={isActive ? undefined : true}
                    >
                      <div className="lg:flex lg:items-start lg:gap-[28px]">
                        <div className="min-w-0 lg:w-[52%]">
                          <h3
                            className="font-normal leading-[1.08] text-[#172235] text-[24px] sm:text-[26px] lg:text-[32px]"
                            style={{ fontFamily: SERIF }}
                          >
                            The things that are easy to miss from another city
                          </h3>
                        </div>
                        <div className="lg:w-[48%] mt-6 lg:mt-0">
                          <div
                            className="rounded-[14px] p-[18px]"
                            style={{ background: "rgba(15,159,143,.04)" }}
                          >
                            {ADMIN_ITEMS.map(({ label, Icon }, idx) => (
                              <div key={label} className="flex gap-[12px] items-start">
                                <div className="relative flex-shrink-0 flex flex-col items-center">
                                  <span
                                    className="w-7 h-7 rounded-full bg-[#E6F7F4] flex items-center justify-center relative z-10"
                                    style={{ border: "1px solid rgba(15,159,143,.25)" }}
                                    aria-hidden="true"
                                  >
                                    <Icon size={13} color="#0B756B" strokeWidth={1.8} aria-hidden="true" />
                                  </span>
                                  {idx < ADMIN_ITEMS.length - 1 && (
                                    <span
                                      className="w-[2px] bg-[#D5E8E3] mt-[4px]"
                                      style={{ height: 28 }}
                                      aria-hidden="true"
                                    />
                                  )}
                                </div>
                                <div style={{ paddingBottom: idx < ADMIN_ITEMS.length - 1 ? 18 : 0 }}>
                                  <p
                                    className="text-[13.5px] font-[600] text-[#263B3F] leading-[1.3] pt-[6px]"
                                    style={{ fontFamily: SANS }}
                                  >
                                    {label}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* ── REPAIRS panel (default) ── */}
                {(() => {
                  const isActive = effectiveMode === "repairs";
                  return (
                    <div
                      id="watch-panel-repairs"
                      className="[grid-area:1/1] transition-[opacity,transform] duration-[190ms] motion-reduce:transition-none"
                      style={{
                        opacity: isActive ? 1 : 0,
                        transform: isActive ? "translateY(0)" : "translateY(4px)",
                        pointerEvents: isActive ? "auto" : "none",
                      }}
                      aria-hidden={isActive ? undefined : true}
                    >
                      <div className="lg:flex lg:items-start lg:gap-[28px]">
                        {/* Left — label + heading + timeline (timeline hidden on mobile) */}
                        <div className="min-w-0 lg:w-[52%]">
                          <p
                            className="text-[11px] font-[700] tracking-[0.08em] uppercase text-[#6D7E82]"
                            style={{ fontFamily: SANS }}
                          >
                            ISSUE FOUND
                          </p>
                          <h3
                            className="mt-[4px] font-normal leading-[1.06] text-[#172235] text-[26px] sm:text-[29px] lg:text-[34px]"
                            style={{ fontFamily: SERIF }}
                          >
                            Leaking tap
                          </h3>
                          {/* 4-step timeline — desktop only */}
                          <div className="hidden lg:block mt-[20px]">
                            {REPAIR_STEPS.map((step, idx) => (
                              <div key={step.label} className="flex gap-[12px] items-start">
                                <div className="relative flex-shrink-0 flex flex-col items-center">
                                  <span
                                    className="w-7 h-7 rounded-full flex items-center justify-center"
                                    style={{
                                      background: step.isFinal ? "#EFF9D5" : "#0F9F8F",
                                      border: step.isFinal ? "1px solid rgba(126,168,29,.30)" : "none",
                                    }}
                                    aria-hidden="true"
                                  >
                                    <Check
                                      size={11}
                                      strokeWidth={2.5}
                                      aria-hidden="true"
                                      style={{ color: step.isFinal ? "#526D12" : "white" }}
                                    />
                                  </span>
                                  {idx < REPAIR_STEPS.length - 1 && (
                                    <span
                                      className="w-[2px] bg-[#D5E8E3] mt-[4px]"
                                      style={{ height: 24 }}
                                      aria-hidden="true"
                                    />
                                  )}
                                </div>
                                <div className="pb-[6px]">
                                  <p
                                    className="text-[11px] font-[600] text-[#6D7E82] uppercase tracking-[0.06em] leading-none"
                                    style={{ fontFamily: SANS }}
                                  >
                                    {step.label}
                                  </p>
                                  <p
                                    className="mt-[3px] text-[14px] font-[600] text-[#263B3F]"
                                    style={{ fontFamily: SANS }}
                                  >
                                    {step.detail}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        {/* Right — proof inset (full-width on mobile) */}
                        <div className="lg:w-[48%] mt-5 lg:mt-0">
                          <div
                            className="rounded-[16px] p-[16px] lg:p-[20px]"
                            style={{ background: "#F4FAF8", border: "1px solid #D7EAE5" }}
                          >
                            {/* 3-col cost row */}
                            <div className="grid grid-cols-3 gap-[8px]">
                              <div>
                                <p
                                  className="text-[10px] font-[600] text-[#6D7E82] uppercase tracking-[0.05em] leading-none"
                                  style={{ fontFamily: SANS }}
                                >
                                  Estimate
                                </p>
                                <p
                                  className="mt-[4px] text-[18px] lg:text-[20px] font-[700] text-[#172235] leading-none"
                                  style={{ fontFamily: SANS }}
                                >
                                  &#8377;4,600
                                </p>
                              </div>
                              <div>
                                <p
                                  className="text-[10px] font-[600] text-[#6D7E82] uppercase tracking-[0.05em] leading-none"
                                  style={{ fontFamily: SANS }}
                                >
                                  Vendor bill
                                </p>
                                <p
                                  className="mt-[4px] text-[18px] lg:text-[20px] font-[700] text-[#172235] leading-none"
                                  style={{ fontFamily: SANS }}
                                >
                                  &#8377;4,600
                                </p>
                              </div>
                              <div>
                                <p
                                  className="text-[10px] font-[600] text-[#6D7E82] uppercase tracking-[0.05em] leading-none"
                                  style={{ fontFamily: SANS }}
                                >
                                  REEVE MARKUP
                                </p>
                                <p
                                  className="mt-[4px] text-[28px] lg:text-[34px] font-[700] text-[#0B756B] leading-none"
                                  style={{ fontFamily: SERIF }}
                                >
                                  &#8377;0
                                </p>
                              </div>
                            </div>
                            {/* No-markup badge */}
                            <div
                              className="mt-[10px] inline-flex items-center gap-[5px] rounded-[8px] px-[8px] py-[4px]"
                              style={{ background: "#EFF9D5", border: "1px solid rgba(126,168,29,.22)" }}
                            >
                              <CheckCircle2 size={12} color="#526D12" strokeWidth={2} aria-hidden="true" />
                              <span
                                className="text-[11px] font-[700] text-[#526D12]"
                                style={{ fontFamily: SANS }}
                              >
                                No markup
                              </span>
                            </div>
                            {/* Approval rows */}
                            <div className="mt-[12px] space-y-[8px]">
                              {["Written approval received", "Before / after attached"].map((text) => (
                                <div key={text} className="flex items-center gap-[8px]">
                                  <Check size={13} color="#0B756B" strokeWidth={2.2} aria-hidden="true" />
                                  <span
                                    className="text-[13px] font-[500] text-[#263B3F]"
                                    style={{ fontFamily: SANS }}
                                  >
                                    {text}
                                  </span>
                                </div>
                              ))}
                            </div>
                            {/* Before/after image — inside the proof inset */}
                            <figure className="mt-[14px]">
                              <img
                                src="/images/vacant_32.webp"
                                alt=""
                                aria-hidden="true"
                                width={1840}
                                height={854}
                                className="w-full h-auto object-contain rounded-[8px]"
                                loading="lazy"
                                decoding="async"
                              />
                              <figcaption className="sr-only">
                                Sample repair evidence. Before, 14 Apr: leaking tap. After, 14 Apr: tap repaired.
                              </figcaption>
                            </figure>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* ── RECORD panel ── */}
                {(() => {
                  const isActive = effectiveMode === "record";
                  return (
                    <div
                      id="watch-panel-record"
                      className="[grid-area:1/1] transition-[opacity,transform] duration-[190ms] motion-reduce:transition-none"
                      style={{
                        opacity: isActive ? 1 : 0,
                        transform: isActive ? "translateY(0)" : "translateY(4px)",
                        pointerEvents: isActive ? "auto" : "none",
                      }}
                      aria-hidden={isActive ? undefined : true}
                    >
                      <div className="lg:flex lg:items-start lg:gap-[28px]">
                        <div className="min-w-0 lg:w-[52%]">
                          <h3
                            className="font-normal leading-[1.06] text-[#172235] text-[27px] sm:text-[32px] lg:text-[36px]"
                            style={{ fontFamily: SERIF }}
                          >
                            12 visits/year
                          </h3>
                          <div className="mt-[18px]">
                            {RECORD_OUTPUTS.map((text) => (
                              <div
                                key={text}
                                className="flex items-center gap-[10px] py-[9px]"
                                style={{ borderBottom: "1px solid #EBF3F0" }}
                              >
                                <span
                                  className="flex-shrink-0 w-5 h-5 rounded-full bg-[#EFF9D5] flex items-center justify-center"
                                  aria-hidden="true"
                                  style={{ border: "1px solid rgba(126,168,29,.22)" }}
                                >
                                  <Check size={10} color="#526D12" strokeWidth={2.5} aria-hidden="true" />
                                </span>
                                <span
                                  className="text-[14px] font-[500] text-[#263B3F]"
                                  style={{ fontFamily: SANS }}
                                >
                                  {text}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="lg:w-[48%] mt-6 lg:mt-0">
                          {/* 12 visit nodes — grid-cols-6 always (2 rows × 6); no chronological meaning */}
                          <div className="grid grid-cols-6 gap-[4px] sm:gap-[6px]">
                            {Array.from({ length: 12 }, (_, i) => {
                              const isSample = i === 7;
                              return (
                                <div key={i} className="flex flex-col items-center gap-[4px]">
                                  <span
                                    className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-[700]"
                                    style={{
                                      fontFamily: SANS,
                                      background: isSample ? "#0F9F8F" : "#F6FBFA",
                                      border: isSample ? "none" : "1px solid #CFE3DE",
                                      color: isSample ? "white" : "#8FA5A8",
                                    }}
                                  >
                                    {String(i + 1).padStart(2, "0")}
                                  </span>
                                  {isSample && (
                                    <span
                                      className="w-[6px] h-[6px] rounded-full bg-[#B9F227]"
                                      aria-hidden="true"
                                    />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

              </div>
            </div>
          </div>
        </div>

        {/* Closing evidence loop */}
        <div
          ref={loopRef}
          className={`mt-[34px] lg:mt-[44px]${loopReady ? " vpc-loop-ready" : ""}${loopVisible ? " vpc-loop-visible" : ""}`}
        >
          <div className="relative flex items-start justify-between mx-auto max-w-[600px]">
            {/* Connector line */}
            <div
              aria-hidden="true"
              className="absolute h-[2px] top-[20px] left-[10%] right-[10%] overflow-hidden"
            >
              <div
                className="vpc-loop-line h-full w-full"
                style={{
                  background: "linear-gradient(90deg, #0F9F8F 0%, #14AA99 55%, #B9F227 100%)",
                  transformOrigin: "left center",
                }}
              />
            </div>

            {CLOSING_NODES.map((node, i) => (
              <div
                key={node.id}
                className="vpc-loop-node flex flex-col items-center gap-[6px] lg:gap-[8px]"
                style={{ animationDelay: `${i * 50}ms`, width: "20%" }}
              >
                <span
                  className="w-10 h-10 rounded-full bg-[#FFFDFC] flex items-center justify-center flex-shrink-0"
                  style={{
                    border: "1px solid #CFE4DF",
                    boxShadow: "0 2px 8px rgba(7,20,38,.07)",
                  }}
                >
                  <node.Icon size={16} color="#172235" strokeWidth={1.8} aria-hidden="true" />
                </span>
                <span
                  className="text-center text-[10.5px] lg:text-[13px] font-[700] text-[#172235] leading-[1.25]"
                  style={{ fontFamily: SANS }}
                >
                  {node.label}
                </span>
              </div>
            ))}
          </div>
          <p
            className="mt-[18px] text-center text-[14px] lg:text-[16px] font-[550] leading-[1.5] text-[#455C60] mx-auto max-w-[680px]"
            style={{ fontFamily: SANS }}
          >
            We find it, tell you, get your approval, coordinate the fix and record what happened.
          </p>
        </div>

      </div>
    </section>
  );
}

// ── Section 4: Watch Pricing ──────────────────────────────────────────────

function WatchPricingSection() {
  const [selectedType, setSelectedType] = useState<WatchPropertyType>("upTo3");
  const [hoveredType, setHoveredType] = useState<WatchPropertyType | null>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const [sectionVisible, setSectionVisible] = useState(false);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setSectionVisible(true); obs.unobserve(e.target); } },
      { threshold: 0.08 }
    );
    if (sectionRef.current) obs.observe(sectionRef.current);
    return () => obs.disconnect();
  }, []);

  const pricing = WATCH_PRICING[selectedType];
  const TYPES: WatchPropertyType[] = ["upTo3", "large"];

  return (
    <section
      ref={sectionRef}
      id="pricing"
      aria-labelledby="watch-pricing-heading"
      className={sectionVisible ? "vpc-pricing-visible" : ""}
      style={{
        borderTop: "1px solid rgba(15,159,143,.24)",
        background: `
          radial-gradient(ellipse at 18% 0%, rgba(15,159,143,.24) 0%, rgba(15,159,143,.07) 26%, transparent 52%),
          radial-gradient(circle at 86% 28%, rgba(0,87,242,.20) 0%, rgba(0,87,242,.055) 31%, transparent 52%),
          radial-gradient(circle at 48% 100%, rgba(15,159,143,.08) 0%, transparent 43%),
          linear-gradient(180deg, #071426 0%, #081A30 52%, #06121F 100%)
        `,
      }}
    >
      {/* Single section container — relative so dot field can be positioned inside */}
      <div className="relative mx-auto max-w-[1240px] px-5 sm:px-8 lg:px-10 pt-16 pb-[68px] lg:pt-[92px] lg:pb-[92px]">

        {/* Dot field — first child, section-level upper-right ambient detail, behind all content */}
        <div
          aria-hidden="true"
          className="absolute top-0 right-0 w-[45%] h-[55%] pointer-events-none overflow-hidden z-0"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(15,159,143,.18) 1px, transparent 1px)",
            backgroundSize: "20px 20px",
            opacity: 0.45,
          }}
        />

        {/* Intro */}
        <div className="vpc-pricing-intro relative z-[1] lg:text-center">
          <div className="inline-flex items-center gap-[7px] lg:justify-center">
            <span
              className="w-[6px] h-[6px] rounded-full flex-shrink-0"
              style={{ background: "#0F9F8F" }}
              aria-hidden="true"
            />
            <span
              className="text-[11px] lg:text-[12px] font-[700] tracking-[0.12em] uppercase text-[#78D9CE]"
              style={{ fontFamily: SANS }}
            >
              SIMPLE PRICING
            </span>
          </div>
          <h2
            id="watch-pricing-heading"
            className="mt-[16px] font-normal leading-[1.02] tracking-[-0.02em] text-[#FFFDFC]
                       text-[clamp(36px,9.5vw,40px)] lg:text-[clamp(46px,4.1vw,54px)]
                       max-w-[760px] mx-auto text-left lg:text-center"
            style={{ fontFamily: SERIF }}
          >
            Choose the property. Choose the term. That's it.
          </h2>
          <p
            className="mt-[14px] font-[500] leading-[1.5] text-[#B5C3D2]
                       text-[15.5px] lg:text-[17px] max-w-[620px] mx-auto text-left lg:text-center"
            style={{ fontFamily: SANS }}
          >
            The fee is based on property size, not property value.
          </p>
        </div>

        {/* Pricing deck — relative z-[1] to sit above dot field */}
        <div className="vpc-pricing-deck relative z-[1] mx-auto max-w-[1080px] mt-[28px] lg:mt-[40px]">

          {/* Teal bloom — ambient glow around/behind the deck card */}
          <div
            aria-hidden="true"
            className="absolute inset-x-[10%] top-[10%] bottom-[-5%] rounded-full pointer-events-none"
            style={{
              background: "radial-gradient(ellipse at center, rgba(15,159,143,.09) 0%, transparent 65%)",
            }}
          />

          {/* Main deck card */}
          <div
            className="relative rounded-[24px] overflow-hidden"
            style={{
              background: "linear-gradient(180deg, rgba(18,43,72,.96) 0%, rgba(10,29,51,.97) 100%)",
              border: "1px solid rgba(139,218,208,.18)",
              boxShadow: "8px 10px 0 rgba(15,159,143,.055), 0 32px 80px rgba(0,0,0,.30), 0 10px 30px rgba(0,87,242,.08), inset 0 1px 0 rgba(255,255,255,.045)",
              zIndex: 1,
            }}
          >
            <div className="px-[16px] py-[18px] sm:px-[22px] sm:py-[24px] lg:px-[32px] lg:py-[30px]">

              {/* PROPERTY SIZE label */}
              <div className="lg:text-center">
                <span
                  className="text-[11px] font-[700] tracking-[0.09em] uppercase text-[#8FAAB7]"
                  style={{ fontFamily: SANS }}
                >
                  PROPERTY SIZE
                </span>
              </div>

              {/* Selector — vertical on mobile, horizontal connected track on desktop */}
              <div
                className="mt-[10px] flex flex-col lg:flex-row gap-[8px] lg:gap-0
                           lg:bg-[rgba(255,255,255,.045)] lg:border lg:border-[rgba(255,255,255,.10)]
                           lg:rounded-[14px] lg:p-[4px]"
              >
                {TYPES.map((type) => {
                  const p = WATCH_PRICING[type];
                  const isSelected = selectedType === type;
                  const isHovered = hoveredType === type && !isSelected;
                  return (
                    <button
                      key={type}
                      type="button"
                      aria-pressed={isSelected}
                      aria-controls="watch-pricing-values"
                      className="relative flex items-center gap-[10px] min-h-[48px] lg:flex-1 lg:min-h-[52px]
                                 rounded-[12px] px-[14px] lg:px-[18px] text-left min-w-0
                                 transition-colors duration-[150ms] motion-reduce:transition-none
                                 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F9F8F]"
                      style={{
                        backgroundColor: isHovered ? "rgba(255,255,255,.055)" : "rgba(255,255,255,.032)",
                      }}
                      onPointerEnter={(e) => { if (e.pointerType === "mouse") setHoveredType(type); }}
                      onPointerLeave={(e) => { if (e.pointerType === "mouse") setHoveredType(null); }}
                      onClick={() => setSelectedType(type)}
                    >
                      {/* Selected gradient overlay — darker teal for WCAG-AA white text contrast */}
                      <span
                        className="absolute inset-0 rounded-[12px] transition-opacity duration-[180ms] motion-reduce:transition-none"
                        style={{
                          background: "linear-gradient(135deg, #0D8277 0%, #0B756B 100%)",
                          opacity: isSelected ? 1 : 0,
                          boxShadow: isSelected ? "0 5px 18px rgba(15,159,143,.24)" : "none",
                        }}
                      />
                      <p.Icon
                        size={17}
                        aria-hidden="true"
                        className="relative z-10 flex-shrink-0 transition-colors duration-[180ms] motion-reduce:transition-none"
                        style={{ color: isSelected ? "#FFFFFF" : isHovered ? "#E9F1F5" : "#93A9B8" }}
                      />
                      <span
                        className="relative z-10 text-[13.5px] lg:text-[14.5px] font-[600] leading-[1.3] min-w-0 transition-colors duration-[180ms] motion-reduce:transition-none"
                        style={{
                          fontFamily: SANS,
                          color: isSelected ? "#FFFFFF" : isHovered ? "#E9F1F5" : "#AAB9C8",
                        }}
                      >
                        {p.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Stable live region — aria-controls target stays mounted across property switches */}
              <div
                id="watch-pricing-values"
                aria-live="polite"
                className="mt-[20px] lg:mt-[24px]"
              >
                {/* Keyed inner content drives the 160ms enter animation on switch */}
                <div
                  key={selectedType}
                  className="vpc-pricing-value-enter lg:flex lg:items-start lg:gap-[24px]"
                >
                  {/* Monthly reference slab — left 35% on desktop */}
                  <div
                    className="lg:w-[35%] rounded-[18px] px-[20px] py-[20px] sm:px-[24px] sm:py-[22px] lg:px-[28px] lg:py-[28px] relative overflow-hidden"
                    style={{
                      background: "rgba(5,20,35,.38)",
                      border: "1px solid rgba(140,220,209,.13)",
                    }}
                  >
                    {/* Concentric circle artifact — 56px phone, 80px desktop */}
                    <div
                      aria-hidden="true"
                      className="absolute right-[-14px] lg:right-[-16px] top-1/2 -translate-y-1/2
                                 flex items-center justify-center pointer-events-none
                                 w-[56px] h-[56px] lg:w-[80px] lg:h-[80px]"
                    >
                      <span
                        className="absolute rounded-full"
                        style={{ inset: 0, border: "1px solid rgba(15,159,143,.12)" }}
                      />
                      <span
                        className="absolute rounded-full inset-[11px] lg:inset-[16px]"
                        style={{ border: "1px solid rgba(15,159,143,.19)" }}
                      />
                      <pricing.Icon
                        aria-hidden="true"
                        className="w-[16px] h-[16px] lg:w-[20px] lg:h-[20px]"
                        style={{ color: "rgba(143,221,211,.38)" }}
                      />
                    </div>

                    <span
                      className="text-[10.5px] lg:text-[11px] font-[700] tracking-[0.08em] uppercase text-[#86CFC6]"
                      style={{ fontFamily: SANS }}
                    >
                      MONTHLY REFERENCE
                    </span>

                    {/* Property label — min-h reserves 2-line space to prevent layout jump on type switch */}
                    <p
                      className="mt-[6px] text-[13px] font-[600] text-[#AEBFCD] leading-[1.35] min-h-[36px]"
                      style={{ fontFamily: SANS }}
                    >
                      {pricing.label}
                    </p>

                    <div className="mt-[10px] flex items-end gap-[6px]">
                      <span
                        className="font-normal text-[#FFFDFC] leading-none text-[48px] sm:text-[52px] lg:text-[58px]"
                        style={{ fontFamily: SERIF }}
                      >
                        {inr(pricing.monthly)}
                      </span>
                      <span
                        className="text-[13px] lg:text-[14px] font-[500] text-[#9FB0C0] pb-[6px] lg:pb-[8px]"
                        style={{ fontFamily: SANS }}
                      >
                        / month
                      </span>
                    </div>
                  </div>

                  {/* Term area — right 65% on desktop */}
                  <div className="mt-[16px] lg:mt-0 lg:w-[65%]">

                    {/* 6 → 12 connector — desktop only */}
                    <div
                      className="hidden lg:block relative h-[42px] mb-[6px]"
                      aria-hidden="true"
                    >
                      {/* card center = 25% minus one quarter of the 18px gap (4.5px) */}
                      <div
                        className="absolute top-1/2 h-[1px]"
                        style={{ left: "calc(25% - 4.5px)", right: "calc(25% - 4.5px)", background: "rgba(130,201,193,.18)" }}
                      />
                      <div
                        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-[10px] h-[10px] rounded-full"
                        style={{ left: "calc(25% - 4.5px)", background: "#0F9F8F" }}
                      />
                      <span
                        className="absolute text-[10px] font-[700] -translate-x-1/2 text-[#78D9CE]"
                        style={{ left: "calc(25% - 4.5px)", top: "calc(50% + 9px)", fontFamily: SANS }}
                      >
                        6
                      </span>
                      <div
                        className="absolute top-1/2 -translate-y-1/2 translate-x-1/2 w-[10px] h-[10px] rounded-full"
                        style={{ right: "calc(25% - 4.5px)", background: "#0D223A", border: "1.5px solid rgba(185,242,39,.38)" }}
                      />
                      <span
                        className="absolute text-[10px] font-[700] translate-x-1/2 text-[#B9F227]/60"
                        style={{ right: "calc(25% - 4.5px)", top: "calc(50% + 9px)", fontFamily: SANS }}
                      >
                        12
                      </span>
                    </div>

                    {/* Term cards — 2-col from 360px, 1-col below */}
                    <div className="grid grid-cols-1 min-[360px]:grid-cols-2 gap-[8px] lg:gap-[18px]">

                      {/* 6-month card */}
                      <div
                        className="rounded-[18px] px-[14px] py-[16px] sm:px-[18px] lg:px-[24px] lg:py-[24px]"
                        style={{
                          background: "#0D223A",
                          border: "1px solid rgba(255,255,255,.085)",
                          boxShadow: "0 12px 28px rgba(0,0,0,.16), inset 0 1px 0 rgba(255,255,255,.035)",
                        }}
                      >
                        <span
                          className="text-[10px] lg:text-[11px] font-[700] tracking-[0.09em] uppercase text-[#90A7B7]"
                          style={{ fontFamily: SANS }}
                        >
                          6 MONTHS
                        </span>
                        <p
                          className="mt-[8px] font-normal leading-none text-[#FFFDFC] text-[28px] min-[360px]:text-[30px] lg:text-[40px]"
                          style={{ fontFamily: SERIF }}
                        >
                          {inr(pricing.sixMonths)}
                        </p>
                        <span
                          className="mt-[10px] inline-flex items-center gap-[4px] rounded-[7px] px-[7px] py-[3px] text-[10px] lg:text-[11px] font-[700] text-[#D7F982]"
                          style={{ fontFamily: SANS, background: "rgba(185,242,39,.11)", border: "1px solid rgba(185,242,39,.22)" }}
                        >
                          SAVE {inr(pricing.sixMonthSaving)}
                        </span>
                      </div>

                      {/* 12-month card — subtle lime emphasis, no recommended label */}
                      <div
                        className="rounded-[18px] px-[14px] py-[16px] sm:px-[18px] lg:px-[24px] lg:py-[24px]"
                        style={{
                          background: "#0D223A",
                          border: "1px solid rgba(185,242,39,.22)",
                          boxShadow: "0 12px 28px rgba(0,0,0,.16), inset 0 2px 0 rgba(185,242,39,.18), inset 0 1px 0 rgba(255,255,255,.025)",
                        }}
                      >
                        <span
                          className="text-[10px] lg:text-[11px] font-[700] tracking-[0.09em] uppercase text-[#90A7B7]"
                          style={{ fontFamily: SANS }}
                        >
                          12 MONTHS
                        </span>
                        <p
                          className="mt-[8px] font-normal leading-none text-[#FFFDFC] text-[28px] min-[360px]:text-[30px] lg:text-[40px]"
                          style={{ fontFamily: SERIF }}
                        >
                          {inr(pricing.twelveMonths)}
                        </p>
                        <span
                          className="mt-[10px] inline-flex items-center gap-[4px] rounded-[7px] px-[7px] py-[3px] text-[10px] lg:text-[11px] font-[700] text-[#D7F982]"
                          style={{ fontFamily: SANS, background: "rgba(185,242,39,.15)", border: "1px solid rgba(185,242,39,.28)" }}
                        >
                          SAVE {inr(pricing.twelveMonthSaving)}
                        </span>
                      </div>

                    </div>
                  </div>
                </div>
              </div>

              {/* Minimum term strip */}
              <div className="mt-[24px] lg:mt-[28px] flex items-start gap-[9px]">
                <CalendarCheck
                  size={15}
                  className="flex-shrink-0 mt-[1px]"
                  style={{ color: "#66CFC2" }}
                  aria-hidden="true"
                />
                <p
                  className="text-[13px] lg:text-[13.5px] font-[600] text-[#AEBCC9] leading-[1.5]"
                  style={{ fontFamily: SANS }}
                >
                  Minimum term: 6 months · Watch begins after the first six-month payment.
                </p>
              </div>

            </div>
          </div>
        </div>

        {/* Zero-markup note — relative z-[1] to sit above dot field */}
        <div className="relative z-[1] mt-[22px] lg:mt-[28px] lg:flex lg:justify-center">
          <div className="flex items-start gap-[9px] lg:max-w-[760px]">
            <ReceiptText
              size={15}
              className="flex-shrink-0 mt-[1px] lg:mt-[2px]"
              style={{ color: "#6B8FA0" }}
              aria-hidden="true"
            />
            <p
              className="text-[12.5px] lg:text-[13px] font-[500] leading-[1.5] text-[#8FA2B3]"
              style={{ fontFamily: SANS }}
            >
              Repairs, cleaning and vendor labour are separate and billed at actual cost.{" "}
              <span className="font-[700] text-[#D7F982]">Reeve markup: &#8377;0.</span>
            </p>
          </div>
        </div>

      </div>
    </section>
  );
}

// ── Section 5: Continuity + Starting Watch ───────────────────────────────

function WatchContinuitySection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [partAReady, setPartAReady] = useState(false);
  const [partAVisible, setPartAVisible] = useState(false);

  const partBRef = useRef<HTMLDivElement>(null);
  const [partBReady, setPartBReady] = useState(false);
  const [partBVisible, setPartBVisible] = useState(false);

  useEffect(() => {
    const aObs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setPartAVisible(true); aObs.unobserve(e.target); } },
      { threshold: 0.08 }
    );
    const bObs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setPartBVisible(true); bObs.unobserve(e.target); } },
      { threshold: 0.2 }
    );
    if (sectionRef.current) { setPartAReady(true); aObs.observe(sectionRef.current); }
    if (partBRef.current) { setPartBReady(true); bObs.observe(partBRef.current); }
    return () => { aObs.disconnect(); bObs.disconnect(); };
  }, []);

  const sectionCls = [
    partAReady ? "vpc-continuity-ready" : "",
    partAVisible ? "vpc-continuity-visible" : "",
  ].filter(Boolean).join(" ");

  return (
    <section
      ref={sectionRef}
      id="continuity"
      aria-labelledby="watch-continuity-heading"
      className={sectionCls || undefined}
      style={{
        borderTop: "1px solid rgba(15,159,143,.16)",
        background: `
          radial-gradient(ellipse at 50% 0%, rgba(15,159,143,.11) 0%, rgba(15,159,143,.035) 25%, transparent 48%),
          radial-gradient(circle at 92% 20%, rgba(0,87,242,.045) 0%, transparent 32%),
          linear-gradient(180deg, #F6FBF8 0%, #FBFAF7 22%, #FBFAF7 100%)
        `,
      }}
    >
      <div className="mx-auto max-w-[1240px] px-5 sm:px-8 lg:px-10 pt-16 pb-[68px] lg:pt-[92px] lg:pb-[84px]">

        {/* ── PART A: Watch → Managed continuity ───────────────────────────── */}
        <div className="mx-auto max-w-[1080px]">

          {/* Eyebrow + H2 */}
          <div className="vpc-continuity-heading-group">
            <div className="inline-flex items-center gap-[7px]">
              <span
                className="w-[6px] h-[6px] rounded-full flex-shrink-0"
                style={{ background: "#0F9F8F" }}
                aria-hidden="true"
              />
              <span
                className="text-[11px] lg:text-[11.5px] font-[700] tracking-[0.12em] uppercase text-[#0B756B]"
                style={{ fontFamily: SANS }}
              >
                WHEN PLANS CHANGE
              </span>
            </div>
            <h2
              id="watch-continuity-heading"
              className="mt-[14px] font-normal leading-[1.02] tracking-[-0.02em] text-[#0B1526]
                         text-[clamp(36px,9.4vw,40px)] lg:text-[clamp(46px,4.1vw,54px)]
                         max-w-[760px]"
              style={{ fontFamily: SERIF }}
            >
              Empty today doesn't have to mean empty forever.
            </h2>
          </div>

          {/* Watch → Managed artifact */}
          <div
            className="mt-[30px] lg:mt-[38px]
                       flex flex-col gap-0
                       lg:grid lg:grid-cols-[.9fr_.7fr_1.25fr] lg:gap-x-6 lg:items-center"
          >
            {/* ── Watch card ── */}
            <div
              className="vpc-continuity-watch relative rounded-[20px] px-[16px] py-[16px]
                         lg:px-[26px] lg:py-[26px] lg:min-h-[175px] overflow-hidden"
              style={{
                background: "linear-gradient(145deg, #F2FBF8 0%, #E8F7F3 100%)",
                border: "1px solid rgba(15,159,143,.20)",
                boxShadow: "0 18px 40px rgba(7,20,38,.07), 6px 7px 0 rgba(15,159,143,.06)",
              }}
            >
              {/* Decorative House icon — upper right, anchored to this card */}
              <div
                className="absolute top-[12px] right-[12px] lg:top-[14px] lg:right-[14px]
                           flex items-center justify-center pointer-events-none z-0"
                style={{
                  width: "40px", height: "40px",
                  background: "rgba(15,159,143,.09)",
                  borderRadius: "50%",
                  border: "1px solid rgba(15,159,143,.16)",
                }}
                aria-hidden="true"
              >
                <House size={18} style={{ color: "#0F9F8F" }} aria-hidden="true" />
              </div>

              {/* Content */}
              <div className="relative z-[1]">
                <span
                  className="text-[10.5px] font-[700] tracking-[0.10em] uppercase text-[#0B756B]"
                  style={{ fontFamily: SANS }}
                >
                  NOW
                </span>
                <p
                  className="mt-[6px] text-[20px] lg:text-[22px] font-[700] text-[#0B1526] leading-[1.15]"
                  style={{ fontFamily: SANS }}
                >
                  REEVE WATCH
                </p>
                <p
                  className="mt-[6px] text-[14px] font-[500] text-[#536176]"
                  style={{ fontFamily: SANS }}
                >
                  Property kept vacant
                </p>
              </div>
            </div>

            {/* ── Desktop transition connector (hidden on phone) ── */}
            <div className="hidden lg:flex items-center justify-center relative h-full">
              {/* Horizontal line */}
              <div
                className="vpc-continuity-line-x absolute h-[2px] z-0"
                style={{
                  top: "calc(50% - 1px)",
                  left: "-24px",
                  right: "-24px",
                  background: "linear-gradient(90deg, #0F9F8F 0%, #14A99A 40%, #0057F2 100%)",
                  transformOrigin: "left center",
                }}
                aria-hidden="true"
              />
              {/* Blue arrowhead — overlaps Managed card edge */}
              <div
                className="vpc-continuity-arrow absolute z-[2]"
                style={{
                  top: "calc(50% - 5px)",
                  right: "-30px",
                  width: 0,
                  height: 0,
                  borderTop: "5px solid transparent",
                  borderBottom: "5px solid transparent",
                  borderLeft: "8px solid #0057F2",
                }}
                aria-hidden="true"
              />
              {/* Decision text above center */}
              <div
                className="vpc-continuity-decision-text absolute left-0 right-0 flex justify-center z-10"
                style={{ bottom: "calc(50% + 22px)" }}
              >
                <span
                  className="text-[12.5px] font-[600] text-[#536176] px-[6px] py-[2px] rounded"
                  style={{ fontFamily: SANS, background: "rgba(251,250,247,.94)" }}
                >
                  You decide to rent it
                </span>
              </div>
              {/* Key node */}
              <div
                className="vpc-continuity-key-node relative z-10 flex items-center justify-center
                           w-[36px] h-[36px] rounded-full"
                style={{
                  background: "#FFFDFC",
                  border: "1px solid #D9E8E4",
                  boxShadow: "0 5px 14px rgba(7,20,38,.08)",
                }}
                aria-hidden="true"
              >
                <KeyRound size={14} style={{ color: "#0F9F8F" }} aria-hidden="true" />
              </div>
            </div>

            {/* ── Phone vertical connector (hidden on desktop) ── */}
            <div className="block lg:hidden relative" style={{ height: "72px" }}>
              {/* Vertical line — no transform on element, scaleY animation owns transform */}
              <div
                className="vpc-continuity-line-y absolute top-0 bottom-0 w-[2px] z-0"
                style={{
                  left: "calc(50% - 1px)",
                  background: "linear-gradient(180deg, #0F9F8F 0%, #0057F2 100%)",
                  transformOrigin: "top center",
                }}
                aria-hidden="true"
              />
              {/* Downward arrowhead */}
              <div
                className="vpc-continuity-arrow absolute bottom-0 left-1/2 -translate-x-1/2 z-10"
                style={{
                  width: 0,
                  height: 0,
                  borderLeft: "5px solid transparent",
                  borderRight: "5px solid transparent",
                  borderTop: "6px solid #0057F2",
                }}
                aria-hidden="true"
              />
              {/* Decision text above node */}
              <div
                className="vpc-continuity-decision-text absolute top-[3px] left-0 right-0 flex justify-center z-10"
              >
                <span
                  className="text-[12px] font-[600] text-[#536176]"
                  style={{ fontFamily: SANS }}
                >
                  You decide to rent it
                </span>
              </div>
              {/* Key node — inline positioning avoids transform conflict with animation */}
              <div
                className="vpc-continuity-key-node absolute flex items-center justify-center
                           w-[34px] h-[34px] rounded-full z-10"
                style={{
                  left: "50%",
                  marginLeft: "-17px",
                  top: "46px",
                  marginTop: "-17px",
                  background: "#FFFDFC",
                  border: "1px solid #D9E8E4",
                  boxShadow: "0 4px 10px rgba(7,20,38,.07)",
                }}
                aria-hidden="true"
              >
                <KeyRound size={13} style={{ color: "#0F9F8F" }} aria-hidden="true" />
              </div>
            </div>

            {/* ── Managed card ── */}
            <div
              className="vpc-continuity-managed relative rounded-[22px] px-[18px] py-[20px]
                         lg:px-[30px] lg:py-[30px] lg:min-h-[210px] overflow-hidden"
              style={{
                background: "linear-gradient(145deg, #0B1C33 0%, #0D2946 62%, #0B3550 100%)",
                border: "1px solid rgba(0,87,242,.16)",
                boxShadow: "0 24px 55px rgba(7,20,38,.16), 7px 8px 0 rgba(0,87,242,.055), inset 0 1px 0 rgba(255,255,255,.045)",
              }}
            >
              {/* Decorative artifact — first in DOM, anchored to this card */}
              <div
                className="absolute top-[12px] right-[12px] lg:top-[16px] lg:right-[16px] z-0 pointer-events-none"
                style={{ opacity: 0.12 }}
                aria-hidden="true"
              >
                <div
                  className="relative flex items-center justify-center"
                  style={{
                    width: "80px", height: "80px",
                    border: "1px solid rgba(100,180,255,.6)",
                    borderRadius: "50%",
                  }}
                >
                  <div
                    className="absolute rounded-full"
                    style={{
                      inset: "16px",
                      border: "1px solid rgba(100,180,255,.6)",
                    }}
                  />
                  <House size={20} style={{ color: "rgba(150,200,255,.8)" }} aria-hidden="true" />
                  <FileText
                    size={13}
                    style={{
                      color: "rgba(150,200,255,.8)",
                      position: "absolute",
                      bottom: "10px",
                      right: "4px",
                    }}
                    aria-hidden="true"
                  />
                </div>
              </div>

              {/* Content */}
              <div className="relative z-[1]">
                <span
                  className="text-[10.5px] font-[700] tracking-[0.10em] uppercase text-[#CFEA79]"
                  style={{ fontFamily: SANS }}
                >
                  NEXT
                </span>
                <p
                  className="mt-[6px] text-[23px] lg:text-[25px] font-[700] text-[#FFFDFC] leading-[1.15]"
                  style={{ fontFamily: SANS }}
                >
                  REEVE MANAGED
                </p>
                <ul className="mt-[14px] flex flex-col gap-[12px]">
                  {/* Row 1 */}
                  <li className="flex items-center gap-[9px]">
                    <CheckCircle2
                      size={14}
                      className="flex-shrink-0"
                      style={{ color: "#67CFC2" }}
                      aria-hidden="true"
                    />
                    <span
                      className="text-[13px] font-[600] text-[#DDE7EE]"
                      style={{ fontFamily: SANS }}
                    >
                      No new onboarding
                    </span>
                  </li>
                  {/* Row 2 */}
                  <li className="flex items-center gap-[9px]">
                    <CheckCircle2
                      size={14}
                      className="flex-shrink-0"
                      style={{ color: "#67CFC2" }}
                      aria-hidden="true"
                    />
                    <span
                      className="text-[13px] font-[600] text-[#DDE7EE]"
                      style={{ fontFamily: SANS }}
                    >
                      No new baseline
                    </span>
                  </li>
                  {/* Row 3 */}
                  <li className="flex items-center gap-[9px]">
                    <CheckCircle2
                      size={14}
                      className="flex-shrink-0"
                      style={{ color: "#B9F227" }}
                      aria-hidden="true"
                    />
                    <span
                      className="text-[13px] font-[600] text-[#DDE7EE]"
                      style={{ fontFamily: SANS }}
                    >
                      Tenant placement ₹15,000 ·{" "}
                      <span style={{ color: "#D7F982" }}>₹0 upfront</span>
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Reeve Let secondary link */}
          <div className="mt-[20px] lg:mt-[24px]">
            <p style={{ fontFamily: SANS }}>
              <span className="text-[13px] font-[600] text-[#526176]">
                Only want us to find the tenant?{" "}
              </span>
              <Link
                to="/find-tenant-bangalore"
                className="vpc-continuity-let-link inline-flex items-baseline gap-[3px]
                           text-[13px] font-[600] text-[#0057F2]
                           transition-colors duration-[150ms] motion-reduce:transition-none
                           focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2
                           focus-visible:outline-[#0057F2]"
              >
                Reeve Let is ₹20,000 standalone
                <span className="vpc-continuity-let-arrow inline-block transition-transform duration-[150ms] motion-reduce:transition-none">
                  →
                </span>
              </Link>
            </p>
          </div>

        </div>{/* end Part A max-w-[1080px] */}

        {/* Part A / Part B divider */}
        <div
          className="mx-auto max-w-[1080px] mt-[24px] lg:mt-[32px] mb-[20px] lg:mb-[32px]"
          style={{ borderTop: "1px solid #E3E9E5" }}
        />

        {/* ── PART B: Starting Watch ────────────────────────────────────────── */}
        <div
          ref={partBRef}
          className={[
            "mx-auto max-w-[1080px]",
            partBReady ? "vpc-start-ready" : "",
            partBVisible ? "vpc-start-visible" : "",
          ].filter(Boolean).join(" ")}
        >
          {/* Eyebrow */}
          <span
            className="text-[10.5px] lg:text-[11px] font-[700] tracking-[0.11em] uppercase text-[#0B756B]"
            style={{ fontFamily: SANS }}
          >
            STARTING WATCH
          </span>

          {/* H3 */}
          <h3
            className="mt-[10px] font-normal text-[#0B1526] leading-[1.06]
                       text-[clamp(29px,7.5vw,32px)] lg:text-[clamp(32px,2.8vw,36px)]"
            style={{ fontFamily: SERIF }}
          >
            Starting is simple.
          </h3>

          {/* Process rail — one <ol>, responsive */}
          <div className="relative mt-[28px] lg:mt-[32px]">
            {/* Desktop horizontal connector line */}
            <div
              className="vpc-start-line-x hidden lg:block absolute h-[2px] z-0"
              style={{
                top: "20px",
                left: "10%",
                right: "10%",
                background: "linear-gradient(90deg, rgba(0,87,242,.58) 0%, rgba(15,159,143,.58) 58%, rgba(185,242,39,.66) 100%)",
                transformOrigin: "left center",
              }}
              aria-hidden="true"
            />
            {/* Phone vertical connector line */}
            <div
              className="vpc-start-line-y block lg:hidden absolute w-[2px] z-0"
              style={{
                left: "16px",
                top: "22px",
                bottom: "22px",
                background: "linear-gradient(180deg, rgba(0,87,242,.58) 0%, rgba(15,159,143,.58) 58%, rgba(185,242,39,.66) 100%)",
                transformOrigin: "top center",
              }}
              aria-hidden="true"
            />

            {/* One semantic <ol> — vertical on phone, 5-col grid on desktop */}
            <ol className="relative z-10 flex flex-col lg:grid lg:grid-cols-5">

              {/* Step 1 — Tell us */}
              <li className="relative flex min-h-[44px] items-center gap-[12px] lg:min-h-0 lg:flex-col lg:gap-[12px]">
                <div
                  className="vpc-start-node flex-shrink-0 w-[34px] h-[34px] lg:w-[40px] lg:h-[40px]
                             rounded-full flex items-center justify-center relative z-10"
                  style={{
                    background: "#EAF1FF",
                    border: "1px solid rgba(0,87,242,.2)",
                    animationDelay: "0ms",
                  }}
                >
                  <MessageCircle className="w-[14px] h-[14px] lg:w-[16px] lg:h-[16px]" style={{ color: "#0057F2" }} aria-hidden="true" />
                </div>
                <span className="text-[13px] font-[600] text-[#334458] lg:text-center" style={{ fontFamily: SANS }}>
                  Tell us
                </span>
              </li>

              {/* Step 2 — Free assessment */}
              <li className="relative flex min-h-[44px] items-center gap-[12px] lg:min-h-0 lg:flex-col lg:gap-[12px]">
                <div
                  className="vpc-start-node flex-shrink-0 w-[34px] h-[34px] lg:w-[40px] lg:h-[40px]
                             rounded-full flex items-center justify-center relative z-10"
                  style={{
                    background: "#E8F8F4",
                    border: "1px solid rgba(15,159,143,.2)",
                    animationDelay: "40ms",
                  }}
                >
                  <Search className="w-[14px] h-[14px] lg:w-[16px] lg:h-[16px]" style={{ color: "#0F9F8F" }} aria-hidden="true" />
                </div>
                <span className="text-[13px] font-[600] text-[#334458] lg:text-center" style={{ fontFamily: SANS }}>
                  Free assessment
                </span>
              </li>

              {/* Step 3 — Choose term */}
              <li className="relative flex min-h-[44px] items-center gap-[12px] lg:min-h-0 lg:flex-col lg:gap-[12px]">
                <div
                  className="vpc-start-node flex-shrink-0 w-[34px] h-[34px] lg:w-[40px] lg:h-[40px]
                             rounded-full flex items-center justify-center relative z-10"
                  style={{
                    background: "#E8F8F4",
                    border: "1px solid rgba(15,159,143,.2)",
                    animationDelay: "80ms",
                  }}
                >
                  <CalendarCheck className="w-[14px] h-[14px] lg:w-[16px] lg:h-[16px]" style={{ color: "#0F9F8F" }} aria-hidden="true" />
                </div>
                <span className="text-[13px] font-[600] text-[#334458] lg:text-center" style={{ fontFamily: SANS }}>
                  Choose term
                </span>
              </li>

              {/* Step 4 — Baseline & handover */}
              <li className="relative flex min-h-[44px] items-center gap-[12px] lg:min-h-0 lg:flex-col lg:gap-[12px]">
                <div
                  className="vpc-start-node flex-shrink-0 w-[34px] h-[34px] lg:w-[40px] lg:h-[40px]
                             rounded-full flex items-center justify-center relative z-10"
                  style={{
                    background: "#E8F8F4",
                    border: "1px solid rgba(15,159,143,.2)",
                    animationDelay: "120ms",
                  }}
                >
                  <KeyRound className="w-[14px] h-[14px] lg:w-[16px] lg:h-[16px]" style={{ color: "#0F9F8F" }} aria-hidden="true" />
                </div>
                <span className="text-[13px] font-[600] text-[#334458] lg:text-center" style={{ fontFamily: SANS }}>
                  Baseline &amp; handover
                </span>
              </li>

              {/* Step 5 — Watch begins */}
              <li className="relative flex min-h-[44px] items-center gap-[12px] lg:min-h-0 lg:flex-col lg:gap-[12px]">
                {/* Final record decoration — desktop only, behind node */}
                <div
                  className="vpc-start-decor hidden lg:block absolute top-[-6px] z-0 pointer-events-none"
                  style={{ left: "calc(50% - 12px)" }}
                  aria-hidden="true"
                >
                  <div
                    className="rounded-[8px] overflow-hidden"
                    style={{ width: "44px", height: "50px", background: "#FFFDFC", border: "1px solid #D5E7E2" }}
                  >
                    <div style={{ height: "4px", background: "#0F9F8F" }} />
                    <div className="px-[6px] py-[5px] flex flex-col gap-[3px]">
                      <div style={{ height: "2px", background: "#B8CBD8", borderRadius: "1px", width: "75%" }} />
                      <div style={{ height: "2px", background: "#B8CBD8", borderRadius: "1px", width: "55%" }} />
                      <div className="flex justify-end mt-[2px]">
                        <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#B9F227" }} />
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  className="vpc-start-node flex-shrink-0 w-[34px] h-[34px] lg:w-[40px] lg:h-[40px]
                             rounded-full flex items-center justify-center relative z-10"
                  style={{
                    background: "rgba(185,242,39,.20)",
                    border: "1px solid rgba(185,242,39,.45)",
                    animationDelay: "160ms",
                  }}
                >
                  <FileCheck2 className="w-[14px] h-[14px] lg:w-[16px] lg:h-[16px]" style={{ color: "#607D0F" }} aria-hidden="true" />
                </div>
                <span className="text-[13px] font-[600] text-[#334458] lg:text-center" style={{ fontFamily: SANS }}>
                  Watch begins
                </span>
              </li>

            </ol>
          </div>

          {/* Supporting band */}
          <div
            className="mt-[22px] lg:mt-[26px] rounded-[13px] px-[16px] py-[10px] sm:py-[12px] lg:text-center"
            style={{ background: "#EFFBF8", border: "1px solid #D6EAE5" }}
          >
            <p
              className="text-[12.5px] lg:text-[13px] font-[600] text-[#48625F]"
              style={{ fontFamily: SANS }}
            >
              Baseline photos/video · documents · keys · society access
            </p>
          </div>

          {/* Final reassurance */}
          <div className="mt-[14px] lg:mt-[16px] flex items-center gap-[8px] lg:justify-center">
            <ShieldCheck
              size={15}
              className="flex-shrink-0"
              style={{ color: "#0F9F8F" }}
              aria-hidden="true"
            />
            <p
              className="text-[13.5px] font-[700] text-[#0B756B]"
              style={{ fontFamily: SANS }}
            >
              Your assessment happens before you commit.
            </p>
          </div>

        </div>{/* end partBRef */}
      </div>{/* end section container */}
    </section>
  );
}

// ── Section 6: FAQ ────────────────────────────────────────────────────────

function QuestionsSection() {
  const chevron = (
    <svg
      width="17"
      height="17"
      viewBox="0 0 16 16"
      fill="none"
      className="flex-shrink-0 transition-transform duration-[150ms] group-open:rotate-180 text-[#69758B] group-open:text-[#2563EB]"
      aria-hidden="true"
    >
      <path
        d="M3 6L8 10.5L13 6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  return (
    <section
      id="questions"
      aria-labelledby="questions-heading"
      className="bg-[#F4F4FF] scroll-mt-16 pt-16 pb-16 lg:pt-[84px] lg:pb-[84px]"
    >
      <div className="mx-auto max-w-[1240px] px-5 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-[880px]">

          <h2
            id="questions-heading"
            className="text-center text-[30px] font-normal leading-[1.06] tracking-[-0.015em] text-[#0B1526] lg:text-[clamp(38px,3vw,42px)]"
            style={{ fontFamily: SERIF }}
          >
            Questions people usually have
          </h2>

          <div className="mt-6 lg:mt-8">

            <div className="border-t border-[#DADCF0]">
              <details className="group">
                <summary
                  className="list-none [&::-webkit-details-marker]:hidden flex items-center justify-between gap-4 min-h-[60px] lg:min-h-[68px] py-[17px] lg:py-5 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 rounded-sm"
                  style={{ outlineColor: "#8FB7FF" }}
                >
                  <span className="min-w-0 text-[15px] lg:text-[16.5px] font-[650] leading-[1.35] text-[#172235] group-open:text-[#1D4ED8]" style={{ fontFamily: SANS }}>
                    How often do you visit?
                  </span>
                  {chevron}
                </summary>
                <div className="pb-[18px] lg:pb-5 pr-[34px] lg:pr-11 max-w-[720px]">
                  <p className="text-[14px] lg:text-[15px] font-[500] leading-[1.55] lg:leading-[1.6] text-[#536074]" style={{ fontFamily: SANS }}>
                    Once every month — 12 scheduled visits a year, each added to your dated property record.
                  </p>
                </div>
              </details>
            </div>

            <div className="border-t border-[#DADCF0]">
              <details className="group">
                <summary
                  className="list-none [&::-webkit-details-marker]:hidden flex items-center justify-between gap-4 min-h-[60px] lg:min-h-[68px] py-[17px] lg:py-5 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 rounded-sm"
                  style={{ outlineColor: "#8FB7FF" }}
                >
                  <span className="min-w-0 text-[15px] lg:text-[16.5px] font-[650] leading-[1.35] text-[#172235] group-open:text-[#1D4ED8]" style={{ fontFamily: SANS }}>
                    What happens if you find a problem?
                  </span>
                  {chevron}
                </summary>
                <div className="pb-[18px] lg:pb-5 pr-[34px] lg:pr-11 max-w-[720px]">
                  <p className="text-[14px] lg:text-[15px] font-[500] leading-[1.55] lg:leading-[1.6] text-[#536074]" style={{ fontFamily: SANS }}>
                    We tell you what we found and what needs attention. If work is needed, we can coordinate the next step with your approval.
                  </p>
                </div>
              </details>
            </div>

            <div className="border-t border-[#DADCF0]">
              <details className="group">
                <summary
                  className="list-none [&::-webkit-details-marker]:hidden flex items-center justify-between gap-4 min-h-[60px] lg:min-h-[68px] py-[17px] lg:py-5 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 rounded-sm"
                  style={{ outlineColor: "#8FB7FF" }}
                >
                  <span className="min-w-0 text-[15px] lg:text-[16.5px] font-[650] leading-[1.35] text-[#172235] group-open:text-[#1D4ED8]" style={{ fontFamily: SANS }}>
                    Can you arrange cleaning?
                  </span>
                  {chevron}
                </summary>
                <div className="pb-[18px] lg:pb-5 pr-[34px] lg:pr-11 max-w-[720px]">
                  <p className="text-[14px] lg:text-[15px] font-[500] leading-[1.55] lg:leading-[1.6] text-[#536074]" style={{ fontFamily: SANS }}>
                    Yes. Cleaning can be arranged during a monthly visit if requested. Cleaner and material costs are billed at actuals.
                  </p>
                </div>
              </details>
            </div>

            <div className="border-t border-[#DADCF0]">
              <details className="group">
                <summary
                  className="list-none [&::-webkit-details-marker]:hidden flex items-center justify-between gap-4 min-h-[60px] lg:min-h-[68px] py-[17px] lg:py-5 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 rounded-sm"
                  style={{ outlineColor: "#8FB7FF" }}
                >
                  <span className="min-w-0 text-[15px] lg:text-[16.5px] font-[650] leading-[1.35] text-[#172235] group-open:text-[#1D4ED8]" style={{ fontFamily: SANS }}>
                    How do repair approvals work?
                  </span>
                  {chevron}
                </summary>
                <div className="pb-[18px] lg:pb-5 pr-[34px] lg:pr-11 max-w-[720px]">
                  <p className="text-[14px] lg:text-[15px] font-[500] leading-[1.55] lg:leading-[1.6] text-[#536074]" style={{ fontFamily: SANS }}>
                    Nothing above &#8377;3,000 is spent without your written approval. Vendor bills are passed through at actual cost, with no Reeve markup.
                  </p>
                </div>
              </details>
            </div>

            <div className="border-t border-[#DADCF0]">
              <details className="group">
                <summary
                  className="list-none [&::-webkit-details-marker]:hidden flex items-center justify-between gap-4 min-h-[60px] lg:min-h-[68px] py-[17px] lg:py-5 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 rounded-sm"
                  style={{ outlineColor: "#8FB7FF" }}
                >
                  <span className="min-w-0 text-[15px] lg:text-[16.5px] font-[650] leading-[1.35] text-[#172235] group-open:text-[#1D4ED8]" style={{ fontFamily: SANS }}>
                    Why is the minimum six months?
                  </span>
                  {chevron}
                </summary>
                <div className="pb-[18px] lg:pb-5 pr-[34px] lg:pr-11 max-w-[720px]">
                  <p className="text-[14px] lg:text-[15px] font-[500] leading-[1.55] lg:leading-[1.6] text-[#536074]" style={{ fontFamily: SANS }}>
                    One visit shows what the property looks like today. A continuous dated record shows what is changing over time.
                  </p>
                </div>
              </details>
            </div>

            <div className="border-t border-[#DADCF0]">
              <details className="group">
                <summary
                  className="list-none [&::-webkit-details-marker]:hidden flex items-center justify-between gap-4 min-h-[60px] lg:min-h-[68px] py-[17px] lg:py-5 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 rounded-sm"
                  style={{ outlineColor: "#8FB7FF" }}
                >
                  <span className="min-w-0 text-[15px] lg:text-[16.5px] font-[650] leading-[1.35] text-[#172235] group-open:text-[#1D4ED8]" style={{ fontFamily: SANS }}>
                    What if I decide to rent the property?
                  </span>
                  {chevron}
                </summary>
                <div className="pb-[18px] lg:pb-5 pr-[34px] lg:pr-11 max-w-[720px]">
                  <p className="text-[14px] lg:text-[15px] font-[500] leading-[1.55] lg:leading-[1.6] text-[#536074]" style={{ fontFamily: SANS }}>
                    You can move from Vacant Property Care to Reeve Managed without starting the property setup again. Tenant placement inside Managed is &#8377;15,000 with &#8377;0 upfront.
                  </p>
                </div>
              </details>
            </div>

            <div className="border-t border-[#DADCF0]">
              <details className="group">
                <summary
                  className="list-none [&::-webkit-details-marker]:hidden flex items-center justify-between gap-4 min-h-[60px] lg:min-h-[68px] py-[17px] lg:py-5 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 rounded-sm"
                  style={{ outlineColor: "#8FB7FF" }}
                >
                  <span className="min-w-0 text-[15px] lg:text-[16.5px] font-[650] leading-[1.35] text-[#172235] group-open:text-[#1D4ED8]" style={{ fontFamily: SANS }}>
                    Is Reeve Watch a security service?
                  </span>
                  {chevron}
                </summary>
                <div className="pb-[18px] lg:pb-5 pr-[34px] lg:pr-11 max-w-[720px]">
                  <p className="text-[14px] lg:text-[15px] font-[500] leading-[1.55] lg:leading-[1.6] text-[#536074]" style={{ fontFamily: SANS }}>
                    No. This is scheduled property care and monitoring, not guarding or an alarm service, and it does not guarantee against break-in, encroachment, damage or loss.
                  </p>
                </div>
              </details>
            </div>

            <div className="border-t border-[#DADCF0]" />

          </div>
        </div>
      </div>
    </section>
  );
}

// ── Section 7: Enquiry ────────────────────────────────────────────────────

function EnquirySection() {
  return (
    <section
      id="enquiry"
      aria-labelledby="enquiry-heading"
      className="scroll-mt-0"
      style={{
        background: `
          radial-gradient(circle at 82% 12%, rgba(0,87,242,.30) 0%, rgba(0,87,242,.12) 26%, rgba(0,87,242,0) 52%),
          linear-gradient(135deg, #071426 0%, #0A1730 52%, #0B2857 100%)
        `,
      }}
    >
      <div className="mx-auto max-w-[1240px] px-5 sm:px-8 lg:px-10 pt-16 pb-[72px] lg:pt-24 lg:pb-[104px]">
        <div className="lg:grid lg:grid-cols-[38fr_62fr] lg:gap-[60px] lg:items-start">

          <div className="lg:pt-8">
            <h2
              id="enquiry-heading"
              className="text-[30px] lg:text-[clamp(38px,3vw,42px)] font-normal leading-[1.06] tracking-[-0.015em] text-white max-w-[390px]"
              style={{ fontFamily: SERIF }}
            >
              Tell us about your property.
            </h2>
            <p
              className="mt-[15px] text-[15.5px] lg:text-[17px] font-[500] leading-[1.55] text-[#C8D3E3] max-w-[420px]"
              style={{ fontFamily: SANS }}
            >
              Share a few details. We&#8217;ll work out which service fits and get back to you within a day.
            </p>
            <ul className="mt-[30px] space-y-[14px]">
              {[
                "Response within a day.",
                "No spam calls. If you choose a phone call, we'll coordinate a time first.",
              ].map((text) => (
                <li key={text} className="flex items-start gap-[10px]">
                  <span
                    className="mt-[2px] w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center"
                    style={{ background: "rgba(185,242,39,.12)" }}
                  >
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                      <path d="M2 5.5L4 7.5L8.5 3" stroke="#B9F227" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <span className="text-[14.5px] font-[500] leading-[1.45] text-[#E8EEF7]" style={{ fontFamily: SANS }}>
                    {text}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-8 lg:mt-0">
            <div
              className="rounded-[18px] lg:rounded-[22px] border border-[#E8E6E1] shadow-[0_26px_70px_rgba(0,0,0,.22)]"
              style={{ background: "#FFFDFC" }}
            >
              <div className="p-5 sm:p-7 lg:p-8">
                <PropertyEnquiryForm initialService="vacant_property_care" />
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

// ── Mobile sticky CTA ─────────────────────────────────────────────────────

function StickyEnquiryCTA() {
  const [show, setShow] = useState(false);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const heroSection = document.getElementById("hero");
    const enquirySection = document.getElementById("enquiry");
    if (!heroSection || !enquirySection) return;

    let heroVisible = true;
    let enquiryReached = false;
    const update = () => setShow(!heroVisible && !enquiryReached);

    const heroObs = new IntersectionObserver(([e]) => {
      heroVisible = e.isIntersecting;
      update();
    });
    const enquiryObs = new IntersectionObserver(
      ([e]) => {
        const alreadyPassed = !e.isIntersecting && e.boundingClientRect.top < 0;
        enquiryReached = e.isIntersecting || alreadyPassed;
        update();
      },
      { threshold: 0 }
    );

    heroObs.observe(heroSection);
    enquiryObs.observe(enquirySection);
    return () => {
      heroObs.disconnect();
      enquiryObs.disconnect();
    };
  }, []);

  if (!show) return null;

  const bottomStyle = isAuthenticated
    ? "calc(4rem + env(safe-area-inset-bottom, 0px))"
    : "max(1rem, env(safe-area-inset-bottom, 0px))";

  function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    const target = document.getElementById("enquiry");
    if (!target) return;
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ behavior: prefersReduced ? "auto" : "smooth" });
  }

  return (
    <a
      href="#enquiry"
      onClick={handleClick}
      className="fixed left-3 right-3 z-40 lg:hidden flex items-center justify-center rounded-[14px] h-[52px] bg-[#0057F2] text-[15px] font-[700] text-white shadow-[0_10px_30px_rgba(0,40,110,.24)] transition-opacity duration-[150ms]"
      style={{ fontFamily: SANS, bottom: bottomStyle }}
      aria-label="Tell us about your property"
    >
      Tell us about your property
    </a>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function VacantPropertyCareBangalore() {
  return (
    <Layout>
      <style>{`
        @keyframes vpcHeroFadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes vpcRiskArtEnter {
          from { opacity: .96; transform: translateY(5px); }
          to   { opacity: 1;   transform: translateY(0); }
        }
        @keyframes vpcMarkerPop {
          0%   { transform: translate(-50%,-50%) scale(.96); }
          60%  { transform: translate(-50%,-50%) scale(1.06); }
          100% { transform: translate(-50%,-50%) scale(1); }
        }
        @keyframes vpcMonthlyIntroEnter {
          from { opacity: .97; transform: translateY(5px); }
          to   { opacity: 1;   transform: translateY(0); }
        }
        @keyframes vpcMonthlyConsoleEnter {
          from { opacity: .96; transform: translateY(8px); }
          to   { opacity: 1;   transform: translateY(0); }
        }
        @keyframes vpcLoopLineReveal {
          from { transform: scaleX(0); }
          to   { transform: scaleX(1); }
        }
        @keyframes vpcLoopNodeIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        /* Progress rail connector — single element, top responsive via CSS class */
        .vpc-monthly-connector { top: 16px; }
        @media (min-width: 1024px) {
          .vpc-monthly-connector { top: 24px; }
        }
        @keyframes vpcPricingIntroEnter {
          from { opacity: .97; transform: translateY(5px); }
          to   { opacity: 1;   transform: translateY(0); }
        }
        @keyframes vpcPricingDeckEnter {
          from { opacity: .96; transform: translateY(8px); }
          to   { opacity: 1;   transform: translateY(0); }
        }
        @keyframes vpcPricingValueEnter {
          from { opacity: .88; transform: translateY(3px); }
          to   { opacity: 1;   transform: translateY(0); }
        }
        /* Section 5 keyframes */
        @keyframes vpcContinuityIntroEnter {
          from { opacity: .97; transform: translateY(5px); }
          to   { opacity: 1;   transform: translateY(0); }
        }
        @keyframes vpcContinuityWatchEnter {
          from { opacity: .96; transform: translateY(6px); }
          to   { opacity: 1;   transform: translateY(0); }
        }
        @keyframes vpcContinuityManagedEnter {
          from { opacity: .96; transform: translateY(7px); }
          to   { opacity: 1;   transform: translateY(0); }
        }
        @keyframes vpcContinuityLineRevealX {
          from { transform: scaleX(0); }
          to   { transform: scaleX(1); }
        }
        @keyframes vpcContinuityLineRevealY {
          from { transform: scaleY(0); }
          to   { transform: scaleY(1); }
        }
        @keyframes vpcContinuityKeyNodeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes vpcContinuityDecisionIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes vpcStartLineRevealX {
          from { transform: scaleX(0); }
          to   { transform: scaleX(1); }
        }
        @keyframes vpcStartLineRevealY {
          from { transform: scaleY(0); }
          to   { transform: scaleY(1); }
        }
        @keyframes vpcStartNodeIn {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes vpcStartDecorIn {
          from { opacity: 0; transform: translateY(3px); }
          to   { opacity: .42; transform: translateY(0); }
        }
        /* Let link hover */
        .vpc-continuity-let-link:hover { color: #0041C8; }
        .vpc-continuity-let-link:hover .vpc-continuity-let-arrow { transform: translateX(2px); }
        /* Record decoration base opacity — outside motion query so no-JS and reduced-motion preserve it */
        .vpc-start-decor { opacity: .42; }
        @media (prefers-reduced-motion: no-preference) {
          .vpc-hero-art   { animation: vpcHeroFadeIn 480ms ease-out both; }
          .vpc-risk-art   { animation: vpcRiskArtEnter 420ms ease-out both; }
          .vpc-marker-pop { animation: vpcMarkerPop 220ms ease-out both; }
          /* Section 3 entrance */
          .vpc-section-visible .vpc-monthly-intro   { animation: vpcMonthlyIntroEnter 350ms ease-out both; }
          .vpc-section-visible .vpc-monthly-console { animation: vpcMonthlyConsoleEnter 420ms ease-out 60ms both; }
          /* Loop: vpc-loop-ready is added by React state when observer initialises.
             Without JS the class never exists — content stays fully visible (graceful fallback).
             vpc-loop-visible triggers reveal when the threshold is reached. */
          .vpc-loop-ready .vpc-loop-line   { transform: scaleX(0); transform-origin: left center; }
          .vpc-loop-ready .vpc-loop-node   { opacity: 0; transform: translateY(6px); }
          .vpc-loop-ready.vpc-loop-visible .vpc-loop-line { animation: vpcLoopLineReveal 500ms ease-out both; }
          .vpc-loop-ready.vpc-loop-visible .vpc-loop-node { animation: vpcLoopNodeIn 200ms ease-out both; }
          /* Section 4 entrance */
          .vpc-pricing-visible .vpc-pricing-intro { animation: vpcPricingIntroEnter 320ms ease-out both; }
          .vpc-pricing-visible .vpc-pricing-deck  { animation: vpcPricingDeckEnter 400ms ease-out 40ms both; }
          /* Pricing value enter — runs on key remount when property type changes */
          .vpc-pricing-value-enter { animation: vpcPricingValueEnter 160ms ease-out both; }
          /* Section 5 Part A entrance */
          .vpc-continuity-visible .vpc-continuity-heading-group { animation: vpcContinuityIntroEnter 320ms ease-out both; }
          .vpc-continuity-visible .vpc-continuity-watch   { animation: vpcContinuityWatchEnter 360ms ease-out both; }
          .vpc-continuity-visible .vpc-continuity-managed { animation: vpcContinuityManagedEnter 400ms ease-out 60ms both; }
          /* Part A connector draw — pre-hidden only when JS has armed the ready class */
          .vpc-continuity-ready .vpc-continuity-line-x    { transform: scaleX(0); transform-origin: left center; }
          .vpc-continuity-ready .vpc-continuity-line-y    { transform: scaleY(0); transform-origin: top center; }
          .vpc-continuity-ready .vpc-continuity-key-node  { opacity: 0; }
          .vpc-continuity-ready .vpc-continuity-decision-text { opacity: 0; }
          .vpc-continuity-ready .vpc-continuity-arrow     { opacity: 0; }
          .vpc-continuity-ready.vpc-continuity-visible .vpc-continuity-line-x    { animation: vpcContinuityLineRevealX 500ms ease-out 100ms both; }
          .vpc-continuity-ready.vpc-continuity-visible .vpc-continuity-line-y    { animation: vpcContinuityLineRevealY 500ms ease-out 100ms both; }
          .vpc-continuity-ready.vpc-continuity-visible .vpc-continuity-key-node  { animation: vpcContinuityKeyNodeIn 200ms ease-out 350ms both; }
          .vpc-continuity-ready.vpc-continuity-visible .vpc-continuity-decision-text { animation: vpcContinuityDecisionIn 160ms ease-out 380ms both; }
          .vpc-continuity-ready.vpc-continuity-visible .vpc-continuity-arrow     { animation: vpcContinuityDecisionIn 160ms ease-out 350ms both; }
          /* Section 5 Part B — pre-hidden only when JS has armed the ready class */
          .vpc-start-ready .vpc-start-line-x  { transform: scaleX(0); transform-origin: left center; }
          .vpc-start-ready .vpc-start-line-y  { transform: scaleY(0); transform-origin: top center; }
          .vpc-start-ready .vpc-start-node    { opacity: 0; transform: translateY(4px); }
          .vpc-start-ready .vpc-start-decor   { opacity: 0; transform: translateY(3px); }
          .vpc-start-ready.vpc-start-visible .vpc-start-line-x  { animation: vpcStartLineRevealX 500ms ease-out both; }
          .vpc-start-ready.vpc-start-visible .vpc-start-line-y  { animation: vpcStartLineRevealY 500ms ease-out both; }
          .vpc-start-ready.vpc-start-visible .vpc-start-node    { animation: vpcStartNodeIn 160ms ease-out both; }
          .vpc-start-ready.vpc-start-visible .vpc-start-decor   { animation: vpcStartDecorIn 180ms ease-out 600ms both; }
        }
      `}</style>

      <HeroSection />
      <QuietRisksSection />
      <MonthlyVisitSection />

      <WatchPricingSection />

      <WatchContinuitySection />

      <QuestionsSection />
      <EnquirySection />
      <StickyEnquiryCTA />
    </Layout>
  );
}
