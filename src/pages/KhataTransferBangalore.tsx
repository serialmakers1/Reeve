import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  ShieldCheck, FileText, IdCard, FolderOpen, Info,
  BookOpen, RefreshCw, Key, Layers,
  FileX, Users, Search, Tag, GitFork, ChevronRight,
  Check, Plus, ClipboardList,
  type LucideIcon,
} from "lucide-react";
import Layout from "@/components/Layout";
import PropertyEnquiryForm from "@/components/property-services/PropertyEnquiryForm";

const SERIF = "'Instrument Serif', Georgia, serif";
const SANS = "'DM Sans', system-ui, sans-serif";

// ── Band 1: Hero ──────────────────────────────────────────────────────────────

const HERO_STYLES = `
  .khata-hero {
    background:
      radial-gradient(42% 52% at 78% 34%, rgba(34,211,238,.12) 0%, rgba(34,211,238,.04) 45%, transparent 74%),
      radial-gradient(38% 45% at 94% 77%, rgba(249,115,91,.085) 0%, rgba(249,115,91,.027) 48%, transparent 72%),
      radial-gradient(34% 42% at 60% 100%, rgba(37,99,235,.075), transparent 72%),
      linear-gradient(125deg, #07101F 0%, #0A1430 46%, #11183D 100%);
  }
  @media (min-width:1100px) {
    .khata-hero {
      background:
        radial-gradient(42% 52% at 78% 34%, rgba(34,211,238,.16) 0%, rgba(34,211,238,.055) 45%, transparent 74%),
        radial-gradient(38% 45% at 94% 77%, rgba(249,115,91,.11) 0%, rgba(249,115,91,.035) 48%, transparent 72%),
        radial-gradient(34% 42% at 60% 100%, rgba(37,99,235,.10), transparent 72%),
        linear-gradient(125deg, #07101F 0%, #0A1430 46%, #11183D 100%);
    }
  }

  /* CTA hover lift — pointer devices only */
  @media (hover: hover) and (pointer: fine) {
    .khata-hero-cta:hover { transform: translateY(-1px); }
  }
  /* Reduced motion: disable CTA transform */
  @media (prefers-reduced-motion: reduce) {
    .khata-hero-cta { transition: none; transform: none; }
    .khata-hero-cta:hover { transform: none; }
  }

  /* Connector flow animation */
  @keyframes khata-connector-flow {
    0%,15%   { stroke-dashoffset:1; opacity:0 }
    28%,50%  { stroke-dashoffset:0; opacity:.80 }
    65%,100% { stroke-dashoffset:1; opacity:0 }
  }
  .khata-conn-0   { animation: khata-connector-flow 5.5s 1.20s infinite ease-in-out; }
  .khata-conn-1   { animation: khata-connector-flow 5.5s 1.55s infinite ease-in-out; }
  .khata-conn-2   { animation: khata-connector-flow 5.5s 1.90s infinite ease-in-out; }
  .khata-conn-out { animation: khata-connector-flow 5.5s 2.40s infinite ease-in-out; }

  /* Destination row animations */
  @keyframes khata-match-glow {
    0%,35%   { box-shadow: none; }
    45%,62%  { box-shadow: 0 0 0 2px rgba(45,212,191,.32); }
    78%,100% { box-shadow: none; }
  }
  @keyframes khata-mis-shift {
    0%,60%   { transform: translateX(0); }
    72%,82%  { transform: translateX(3px); }
    92%,100% { transform: translateX(0); }
  }
  @keyframes khata-mis-accent {
    0%,58%   { box-shadow: none; border-color: rgba(249,115,91,.28); }
    70%,85%  { box-shadow: 0 0 6px rgba(249,115,91,.40); border-color: rgba(249,115,91,.55); }
    95%,100% { box-shadow: none; border-color: rgba(249,115,91,.28); }
  }
  .khata-match-glow { animation: khata-match-glow 5.5s 1.2s infinite ease-in-out; }
  .khata-mis-shift  { animation: khata-mis-shift  5.5s 1.2s infinite ease-in-out; }
  .khata-mis-accent { animation: khata-mis-accent 5.5s 1.2s infinite ease-in-out; }

  /* Reduced motion: disable all artifact animation, show connectors static */
  @media (prefers-reduced-motion: reduce) {
    .khata-conn-0, .khata-conn-1, .khata-conn-2, .khata-conn-out,
    .khata-match-glow, .khata-mis-shift, .khata-mis-accent {
      animation: none !important;
    }
    .khata-conn-0, .khata-conn-1, .khata-conn-2, .khata-conn-out {
      stroke-dashoffset: 0;
      opacity: .75;
    }
  }
`;

// Input plate data
const PLATES = [
  {
    icon: FileText,
    title: "DEED",
    fields: [
      { label: "Owner", value: "PRIYA SHARMA" },
      { label: "Property ID", value: "148 / 84" },
    ],
    rotate: "-1deg",
    connClass: "khata-conn-0",
    // approximate SVG path from plate right-edge to convergence
    pathD: "M 157 73 C 210 73 235 220 260 220",
  },
  {
    icon: IdCard,
    title: "IDENTITY",
    fields: [
      { label: "Name", value: "PRIYA SHARMA" },
    ],
    rotate: "0.5deg",
    connClass: "khata-conn-1",
    pathD: "M 157 210 C 210 210 235 220 260 220",
  },
  {
    icon: FolderOpen,
    title: "EXISTING RECORD",
    fields: [
      { label: "Owner", value: "PRIYA SHARMA" },
      { label: "Property ID", value: "148 / 48" },
    ],
    rotate: "1deg",
    connClass: "khata-conn-2",
    pathD: "M 157 351 C 210 351 235 220 260 220",
  },
];

function KhataHeroSection() {
  return (
    <section
      id="hero"
      aria-labelledby="khata-transfer-title"
      className="khata-hero"
    >
      <style>{HERO_STYLES}</style>

      <div className="max-w-[1320px] mx-auto px-5 sm:px-7 min-[1100px]:px-12">
        <div className="min-[1100px]:grid min-[1100px]:grid-cols-[58fr_42fr] min-[1100px]:gap-12 min-[1100px]:items-center">

          {/* ── LEFT COPY ── */}
          <div className="pt-12 pb-5 sm:pt-14 sm:pb-6 min-[1100px]:py-20">

            {/* Eyebrow */}
            <p
              className="text-[11.5px] min-[1100px]:text-[13px] font-[700] uppercase tracking-[.11em] leading-[1.2] text-[#67E8F9]"
              style={{ fontFamily: SANS }}
            >
              KHATA · EKHATA · MUTATION · BANGALORE
            </p>

            {/* H1 */}
            <h1
              id="khata-transfer-title"
              className="mt-3 text-[clamp(41px,11vw,47px)] min-[1100px]:text-[clamp(52px,4.5vw,68px)] font-normal leading-[1.01] min-[1100px]:leading-[1.02] tracking-[-0.018em] text-[#F8FAFC] max-w-[650px]"
              style={{ fontFamily: SERIF }}
            >
              Khata Transfer in Bangalore
            </h1>

            {/* Proposition */}
            <p
              className="mt-[14px] min-[1100px]:mt-5 text-[18px] min-[1100px]:text-[23px] font-[600] leading-[1.28] min-[1100px]:leading-[1.26] text-[#F1F5F9] max-w-[610px]"
              style={{ fontFamily: SANS }}
            >
              When the property record doesn&#8217;t match, the simple Khata process stops being simple.
            </p>

            {/* Supporting paragraph */}
            <p
              className="mt-3 min-[1100px]:mt-4 text-[15px] min-[1100px]:text-[16.5px] font-[450] leading-[1.52] min-[1100px]:leading-[1.57] text-[#C5D1E3] max-w-[620px]"
              style={{ fontFamily: SANS }}
            >
              Reeve helps when the recorded owner is wrong, an application has come back, ownership changed through inheritance, or the existing property record cannot be found or matched cleanly.
            </p>

            {/* Trust line */}
            <div className="mt-3 min-[1100px]:mt-5 flex items-start gap-[8px]">
              <ShieldCheck
                size={17}
                className="flex-shrink-0 mt-[1px]"
                style={{ color: "#5EEAD4" }}
                aria-hidden="true"
              />
              <p
                className="text-[13px] min-[1100px]:text-[13.5px] font-[500] leading-[1.45] text-[#C9D7E8]"
                style={{ fontFamily: SANS }}
              >
                If the records already line up, you may be able to use the official route without us.
              </p>
            </div>

            {/* CTAs */}
            <div className="mt-5 min-[1100px]:mt-7 flex flex-col gap-2 min-[1100px]:gap-3 min-[1100px]:flex-row">
              <a
                href="#khata-situation-heading"
                className="khata-hero-cta inline-flex items-center justify-center min-h-[52px] px-[22px] rounded-[12px] bg-[#2563EB] text-white text-[15px] font-[600] transition-[background-color,color,border-color,box-shadow,transform] duration-200 ease-out hover:bg-[#1D4ED8] active:bg-[#1E40AF] hover:shadow-[0_8px_22px_rgba(37,99,235,.30)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#67E8F9]"
                style={{ fontFamily: SANS }}
              >
                Find your situation ↓
              </a>
              <a
                href="#enquiry"
                className="khata-hero-cta inline-flex items-center justify-center min-h-[52px] px-[22px] rounded-[12px] bg-transparent border border-[rgba(147,197,253,.24)] text-[#BFDBFE] text-[15px] font-[600] transition-[background-color,color,border-color,box-shadow,transform] duration-200 ease-out hover:bg-[rgba(255,255,255,.055)] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#67E8F9]"
                style={{ fontFamily: SANS }}
              >
                Tell us what happened →
              </a>
            </div>

          </div>

          {/* ── FULL RECORD ALIGNMENT ARTIFACT — 1100px+ only ── */}
          <figure aria-hidden="true" className="hidden min-[1100px]:block py-10">
            {/* Relative container with fixed aspect ratio to keep positions stable */}
            <div className="relative w-full overflow-hidden" style={{ aspectRatio: "560 / 470" }}>

              {/* Dot matrix ambient background */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  backgroundImage: "radial-gradient(circle, rgba(255,255,255,.045) 1px, transparent 1px)",
                  backgroundSize: "24px 24px",
                  maskImage: "linear-gradient(to right, transparent 0%, rgba(0,0,0,.6) 30%, rgba(0,0,0,.6) 100%)",
                  WebkitMaskImage: "linear-gradient(to right, transparent 0%, rgba(0,0,0,.6) 30%, rgba(0,0,0,.6) 100%)",
                }}
              />

              {/* SVG connectors: 3 incoming + 1 outgoing, base + animated overlays */}
              <svg
                className="absolute inset-0 pointer-events-none"
                width="100%"
                height="100%"
                viewBox="0 0 560 470"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* 3 faint base incoming paths */}
                {PLATES.map((p) => (
                  <path key={p.title + "-base"} d={p.pathD} stroke="rgba(34,211,238,.18)" strokeWidth="1.5" fill="none" />
                ))}
                {/* 1 faint base outgoing path */}
                <path d="M 262 220 C 300 220 330 220 358 220" stroke="rgba(34,211,238,.18)" strokeWidth="1.5" fill="none" />

                {/* 3 animated incoming overlays */}
                {PLATES.map((p) => (
                  <path
                    key={p.title + "-anim"}
                    d={p.pathD}
                    stroke="#22D3EE"
                    strokeWidth="2"
                    fill="none"
                    className={p.connClass}
                    pathLength={1}
                    strokeDasharray={1}
                    strokeDashoffset={1}
                    opacity={0}
                  />
                ))}
                {/* 1 animated outgoing overlay */}
                <path
                  d="M 262 220 C 300 220 330 220 358 220"
                  stroke="#22D3EE"
                  strokeWidth="2"
                  fill="none"
                  className="khata-conn-out"
                  pathLength={1}
                  strokeDasharray={1}
                  strokeDashoffset={1}
                  opacity={0}
                />

                {/* Convergence node */}
                <circle cx="260" cy="220" r="5" fill="rgba(34,211,238,.35)" />
                <circle cx="260" cy="220" r="3" fill="#22D3EE" />
              </svg>

              {/* ── INPUT PLATES ── */}
              {PLATES.map((plate, idx) => {
                const Icon = plate.icon;
                const tops = ["6%", "38%", "65%"];
                return (
                  <div
                    key={plate.title}
                    className="absolute pointer-events-none"
                    style={{
                      top: tops[idx],
                      left: "2%",
                      width: "26%",
                      transform: `rotate(${plate.rotate})`,
                    }}
                  >
                    {/* Depth backing */}
                    <div
                      className="absolute inset-0 rounded-[14px]"
                      style={{
                        transform: "translate(5px, 5px)",
                        background: "rgba(11,24,66,.65)",
                        zIndex: 0,
                      }}
                    />
                    {/* Plate surface */}
                    <div
                      className="relative rounded-[14px] px-3 py-2.5"
                      style={{
                        background: "linear-gradient(145deg, rgba(255,255,255,.095), rgba(255,255,255,.045))",
                        border: "1px solid rgba(255,255,255,.14)",
                        boxShadow: "0 14px 28px rgba(2,6,23,.28)",
                        zIndex: 1,
                      }}
                    >
                      {/* Inset highlight */}
                      <div className="absolute inset-x-0 top-0 h-px rounded-t-[14px]" style={{ background: "rgba(255,255,255,.18)" }} />

                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Icon size={14} style={{ color: "#67E8F9" }} aria-hidden="true" />
                        <span
                          className="text-[9px] font-[700] uppercase tracking-[.09em] text-[#67E8F9]"
                          style={{ fontFamily: SANS }}
                        >
                          {plate.title}
                        </span>
                      </div>

                      {plate.fields.map((f) => (
                        <div key={f.label} className="flex flex-col leading-tight mb-1 last:mb-0">
                          <span className="text-[8px] font-[500] text-[#6B7FA3]" style={{ fontFamily: SANS }}>{f.label}</span>
                          <span className="text-[10px] font-[600] text-[#E2EAF7]" style={{ fontFamily: SANS }}>{f.value}</span>
                        </div>
                      ))}

                      {/* Right-edge connection node */}
                      <div
                        className="absolute rounded-full"
                        style={{
                          width: 8,
                          height: 8,
                          background: "#22D3EE",
                          right: -4,
                          top: "50%",
                          transform: "translateY(-50%)",
                          boxShadow: "0 0 4px rgba(34,211,238,.5)",
                        }}
                      />
                    </div>
                  </div>
                );
              })}

              {/* ── PROPERTY RECORD DESTINATION PANEL ── */}
              <div
                className="absolute pointer-events-none"
                style={{ top: "12%", right: "2%", width: "38%" }}
              >
                {/* Depth backing */}
                <div
                  className="absolute inset-0 rounded-[20px]"
                  style={{
                    transform: "translate(8px, 8px)",
                    background: "rgba(6,16,50,.80)",
                  }}
                />
                {/* Panel surface */}
                <div
                  className="relative rounded-[20px] px-4 py-4"
                  style={{
                    background: "linear-gradient(145deg, rgba(255,255,255,.115), rgba(255,255,255,.055))",
                    border: "1px solid rgba(103,232,249,.18)",
                    boxShadow: "0 22px 46px rgba(2,6,23,.34), inset 0 1px 0 rgba(255,255,255,.16)",
                  }}
                >
                  {/* Inset highlight */}
                  <div className="absolute inset-x-0 top-0 h-px rounded-t-[20px]" style={{ background: "rgba(255,255,255,.22)" }} />

                  <p className="text-[9px] font-[700] uppercase tracking-[.10em] text-[#94A3B8] mb-3" style={{ fontFamily: SANS }}>
                    PROPERTY RECORD
                  </p>

                  {/* Row 1 — OWNER MATCH */}
                  <div
                    className="khata-match-glow flex items-center justify-between gap-2 rounded-[8px] px-2.5 py-2 mb-2"
                    style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)" }}
                  >
                    <div>
                      <p className="text-[8px] font-[500] text-[#6B7FA3] leading-tight" style={{ fontFamily: SANS }}>OWNER</p>
                      <p className="text-[10.5px] font-[600] text-[#E2EAF7]" style={{ fontFamily: SANS }}>PRIYA SHARMA</p>
                    </div>
                    <span
                      className="flex-shrink-0 text-[8px] font-[700] px-2 py-0.5 rounded-full"
                      style={{
                        background: "rgba(20,184,166,.13)",
                        border: "1px solid rgba(45,212,191,.26)",
                        color: "#5EEAD4",
                        fontFamily: SANS,
                      }}
                    >
                      ✓ MATCH
                    </span>
                  </div>

                  {/* Row 2 — PROPERTY ID MISMATCH */}
                  <div
                    className="khata-mis-shift flex items-center justify-between gap-2 rounded-[8px] px-2.5 py-2"
                    style={{ background: "rgba(249,115,91,.06)", border: "1px solid rgba(249,115,91,.18)" }}
                  >
                    <div>
                      <p className="text-[8px] font-[500] text-[#6B7FA3] leading-tight" style={{ fontFamily: SANS }}>PROPERTY ID</p>
                      <p className="text-[9px] font-[500] text-[#94A3B8] leading-tight" style={{ fontFamily: SANS }}>DEED 148 / 84</p>
                      <p className="text-[9px] font-[500] text-[#94A3B8] leading-tight" style={{ fontFamily: SANS }}>RECORD 148 / 48</p>
                    </div>
                    <span
                      className="khata-mis-accent flex-shrink-0 text-[7.5px] font-[700] px-1.5 py-0.5 rounded-full text-center leading-tight"
                      style={{
                        background: "rgba(249,115,91,.12)",
                        border: "1px solid rgba(249,115,91,.28)",
                        color: "#FDB4A8",
                        fontFamily: SANS,
                        maxWidth: 56,
                      }}
                    >
                      ! DOESN&#8217;T MATCH
                    </span>
                  </div>

                  {/* Outcome rail */}
                  <div
                    className="mt-3 flex items-center"
                    style={{ borderTop: "1px solid rgba(255,255,255,.08)", paddingTop: 10 }}
                  >
                    <div className="flex-1 flex flex-col items-center gap-0.5">
                      <span className="text-[8px] font-[700] text-[#5EEAD4]" style={{ fontFamily: SANS }}>✓ MATCH</span>
                      <span className="text-[7.5px] font-[500] text-[#5EEAD4] opacity-70" style={{ fontFamily: SANS }}>ONLINE PATH</span>
                    </div>
                    <div style={{ width: 1, height: 28, background: "rgba(255,255,255,.10)" }} />
                    <div className="flex-1 flex flex-col items-center gap-0.5">
                      <span className="text-[8px] font-[700] text-[#F9735B]" style={{ fontFamily: SANS }}>! MISMATCH</span>
                      <span className="text-[7.5px] font-[500] text-[#F9735B] opacity-70" style={{ fontFamily: SANS }}>REVIEW FIRST</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </figure>

        </div>

        {/* ── COMPACT ARTIFACT — below 1100px ── */}
        <div className="min-[1100px]:hidden pb-5" aria-hidden="true">
          <div className="relative w-full max-w-[420px] mx-auto">
            {/* Depth backing */}
            <div
              className="absolute inset-0 rounded-[16px]"
              style={{ transform: "translate(4px, 4px)", background: "rgba(6,16,50,.65)" }}
            />
            {/* Card surface */}
            <div
              className="relative rounded-[16px] overflow-hidden min-h-[104px]"
              style={{
                background: "linear-gradient(135deg, rgba(255,255,255,.065), rgba(255,255,255,.035))",
                border: "1px solid rgba(255,255,255,.10)",
              }}
            >
              <div className="flex min-h-[104px]">
                {/* Left: match */}
                <div className="flex-1 flex flex-col items-center justify-center text-center gap-1 px-4 py-5">
                  <span className="text-[13px] font-[700] text-[#5EEAD4]" style={{ fontFamily: SANS }}>✓ RECORDS MATCH</span>
                  <span className="text-[11.5px] font-[500] text-[#5EEAD4] opacity-70" style={{ fontFamily: SANS }}>Official route</span>
                </div>
                {/* Divider */}
                <div style={{ width: 1, background: "rgba(255,255,255,.10)", alignSelf: "stretch", margin: "12px 0" }} />
                {/* Right: mismatch */}
                <div className="flex-1 flex flex-col items-center justify-center text-center gap-1 px-4 py-5">
                  <span className="text-[13px] font-[700] text-[#F9735B]" style={{ fontFamily: SANS }}>! SOMETHING DIFFERS</span>
                  <span className="text-[11.5px] font-[500] text-[#F9735B] opacity-70" style={{ fontFamily: SANS }}>Clarify first</span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Accessible description — covers both artifacts at all screen sizes */}
      <p className="sr-only">
        Illustration showing deed, identity and an existing property record being
        compared; matching records follow the online path while conflicting property
        details need review first.
      </p>

      {/* ── TERMINOLOGY STRIP ── */}
      <div
        className="border-t"
        style={{
          borderColor: "rgba(255,255,255,.08)",
          background: "rgba(255,255,255,.025)",
        }}
      >
        <div className="mx-auto max-w-[1320px] px-5 sm:px-7 min-[1100px]:px-12 py-3 min-[1100px]:py-0 min-[1100px]:min-h-[54px] min-[1100px]:flex min-[1100px]:items-center min-[1100px]:gap-3">
          <Info size={14} className="flex-shrink-0 hidden min-[1100px]:block" style={{ color: "#67E8F9" }} aria-hidden="true" />
          <span
            className="text-[12.5px] font-[600] text-[#BFDBFE] block min-[1100px]:inline"
            style={{ fontFamily: SANS }}
          >
            BBMP terminology · Updated for GBA
          </span>
          <span className="hidden min-[1100px]:block" style={{ color: "rgba(255,255,255,.18)", fontSize: 14 }}>·</span>
          <span
            className="text-[12.5px] font-[400] text-[#98A8BC] block mt-0.5 min-[1100px]:mt-0 min-[1100px]:inline"
            style={{ fontFamily: SANS }}
          >
            Following the September 2025 reorganisation, official terminology may reference GBA; &#8220;BBMP Khata&#8221; remains commonly used terminology.
          </span>
        </div>
      </div>

    </section>
  );
}

// ── Band 4: Resolve with Reeve ────────────────────────────────────────────────

const BAND4_STYLES = `
.khata-b4 {
  background:
    radial-gradient(42% 30% at 94% 12%, rgba(34,211,238,.075) 0%, rgba(34,211,238,.022) 48%, transparent 76%),
    radial-gradient(34% 28% at 7% 72%, rgba(20,184,166,.055) 0%, rgba(20,184,166,.016) 52%, transparent 78%),
    linear-gradient(180deg, #FFFFFF 0%, #FBFDFF 48%, #F4F8FF 100%);
}
.khata-b4-chip-coral {
  color: #E85D48;
  border-color: rgba(249,115,91,.24);
  background: rgba(249,115,91,.035);
}
.khata-b4-rail-h { transform: scaleX(0); transform-origin: left; }
.khata-b4-rail-v { transform: scaleY(0); transform-origin: top; }
.khata-b4-animated .khata-b4-rail-h {
  transform: scaleX(1);
  transition: transform 450ms 380ms cubic-bezier(.4,0,.2,1);
}
.khata-b4-animated .khata-b4-rail-v {
  transform: scaleY(1);
  transition: transform 420ms 150ms cubic-bezier(.4,0,.2,1);
}
.khata-b4-in-path { stroke-dasharray: 1; stroke-dashoffset: 1; }
.khata-b4-animated .khata-b4-in-path {
  stroke-dashoffset: 0;
  transition: stroke-dashoffset 400ms cubic-bezier(.4,0,.2,1);
}
.khata-b4-faq > summary { list-style: none; cursor: pointer; }
.khata-b4-faq > summary::-webkit-details-marker { display: none; }
.khata-b4-faq-wash { transition: opacity 180ms cubic-bezier(.2,.8,.2,1); }
@media (hover:hover) and (pointer:fine) {
  .khata-b4-faq > summary:hover .khata-b4-faq-wash { opacity: 1; }
}
.khata-b4-faq > summary:focus-visible { outline: 2px solid #2563EB; outline-offset: -2px; }
.khata-b4-faq > summary:focus-visible .khata-b4-faq-wash { opacity: 1; }
.khata-b4-faq-toggle { transition: transform 180ms cubic-bezier(.2,.8,.2,1), color 180ms; }
.khata-b4-faq[open] > summary .khata-b4-faq-toggle { transform: rotate(45deg); color: #0F766E; }
.khata-b4-faq[open] > summary .khata-b4-faq-wash { opacity: 1; }
@keyframes khata-b4-answer-open { from { opacity:0; transform:translateY(-3px); } to { opacity:1; transform:translateY(0); } }
.khata-b4-faq[open] .khata-b4-faq-answer { animation: khata-b4-answer-open 160ms ease-out forwards; }
.khata-b4-nri-arrow { display: inline-block; transition: transform 180ms cubic-bezier(.2,.8,.2,1); }
@media (hover:hover) and (pointer:fine) {
  a:hover .khata-b4-nri-arrow { transform: translateX(2px); }
}
@media (prefers-reduced-motion:reduce) {
  .khata-b4-rail-h { transition: none; transform: scaleX(1); }
  .khata-b4-rail-v { transition: none; transform: scaleY(1); }
  .khata-b4-in-path { transition: none; stroke-dashoffset: 0; }
  .khata-b4-faq-wash, .khata-b4-faq-toggle, .khata-b4-nri-arrow { transition: none; }
  .khata-b4-faq[open] .khata-b4-faq-answer { animation: none; }
}
`;

const B4_INPUTS = [
  { label: "DEED",              Icon: FileText,      coral: false },
  { label: "OLD KHATA",         Icon: FolderOpen,    coral: false },
  { label: "TAX RECORD",        Icon: ClipboardList, coral: false },
  { label: "IDENTITY",          Icon: IdCard,        coral: false },
  { label: "QUERY / REJECTION", Icon: FileX,         coral: true  },
] as const;

const B4_STAGES = [
  { num: "01", label: "REVIEW",         body: "Understand what record exists and what does not line up.",                                    accent: "#F9735B" },
  { num: "02", label: "RESOLVE",        body: "Identify what needs correcting, establishing or obtaining.",                                  accent: "#2563EB" },
  { num: "03", label: "COORDINATE",     body: "Connect the owner, records and appropriate professionals where needed.",                      accent: "#7C3AED" },
  { num: "04", label: "FOLLOW THROUGH", body: "Track official queries, responses, corrections and the next legitimate step.",                accent: "#14B8A6" },
] as const;

const B4_BOUNDARIES = [
  { label: "APPROVAL",    value: "Authority decides" },
  { label: "PROCESSING",  value: "Authority controls the timeline" },
  { label: "TITLE",       value: "Khata is not legal title" },
  { label: "LEGAL WORK",  value: "Appropriate advocate where required" },
] as const;

const B4_FAQS = [
  {
    q: "Do I need to visit a government office for Khata work?",
    a: "Many Khata-related steps are designed to be handled through the current online or faceless route, so a routine case may not require a government-office visit. Non-standard cases can still require legitimate document retrieval, authorised actions, professional input or an official follow-up or escalation route. Reeve coordinates those steps where relevant; its role is to clarify and follow the correct process, not to provide special access to an office.",
    nriLink: false,
  },
  {
    q: "Can Reeve help if I live outside India?",
    a: "Yes. Reeve can coordinate remotely with owners outside India, review available records, identify what is missing and organise India-side follow-up where appropriate. Some steps may still depend on valid authentication, original or India-side documents, authorised representation or professional input. If the Khata issue is part of a broader property matter, ",
    nriLink: true,
  },
  {
    q: "How does Reeve price Khata-related work?",
    a: "Reeve first reviews the property, records and issue involved. Once the work required is clear, we explain the scope and provide a quote before you decide whether to proceed.",
    nriLink: false,
  },
] as const;

function KhataResolveWithReeveSection() {
  const pipelineRef = useRef<HTMLDivElement>(null);
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const el = pipelineRef.current;
    if (!el) return;
    if (!window.IntersectionObserver) { setAnimated(true); return; }
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setAnimated(true); obs.disconnect(); } },
      { threshold: 0.15 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section id="how-reeve-helps" aria-labelledby="how-reeve-helps-heading" className="khata-b4">
      <style>{BAND4_STYLES}</style>
      <div className="max-w-[1320px] mx-auto px-5 min-[768px]:px-7 min-[1100px]:px-12 pt-[48px] min-[900px]:pt-[80px] pb-[48px] min-[900px]:pb-[84px]">
        <div className="max-w-[1160px]">

          {/* ── INTRO ── */}
          <p
            className="text-[11.5px] min-[900px]:text-[12.5px] font-[700] uppercase tracking-[.11em]"
            style={{ fontFamily: SANS, color: "#0F766E" }}
          >
            WHEN THE RECORD NEEDS WORK
          </p>
          <h2
            id="how-reeve-helps-heading"
            className="mt-[10px] max-w-[760px]"
            style={{ fontFamily: SERIF, fontWeight: 400, color: "#0B1733", fontSize: "clamp(31px,8.5vw,37px)", lineHeight: 1.06 }}
          >
            <span className="min-[900px]:hidden">
              Reeve helps turn a confusing record problem into a clear next step.
            </span>
            <span
              className="hidden min-[900px]:inline"
              style={{ fontSize: "clamp(40px,3.4vw,52px)", lineHeight: 1.04, letterSpacing: "-0.018em" }}
            >
              Reeve helps turn a confusing record problem into a clear next step.
            </span>
          </h2>
          <p
            className="mt-[14px] min-[900px]:mt-[16px] text-[15px] min-[900px]:text-[16.5px] font-[450] leading-[1.52] min-[900px]:leading-[1.55] max-w-[760px]"
            style={{ fontFamily: SANS, color: "#536176" }}
          >
            We review what exists, identify what needs correcting or establishing, coordinate the relevant records and professionals, and follow the case through the official process.
          </p>

          {/* ── PIPELINE ── */}
          <div
            ref={pipelineRef}
            className={`relative mt-[24px] min-[900px]:mt-[32px]${animated ? " khata-b4-animated" : ""}`}
          >
            {/* Rear depth sheet */}
            <div
              aria-hidden="true"
              className="absolute inset-0 rounded-[20px] min-[900px]:rounded-[22px] pointer-events-none"
              style={{
                transform: "translate(5px,6px)",
                background: "linear-gradient(135deg,rgba(37,99,235,.075),rgba(34,211,238,.055) 48%,rgba(20,184,166,.065))",
              }}
            />
            {/* Front surface */}
            <div
              className="relative rounded-[16px] min-[900px]:rounded-[20px] overflow-hidden"
              style={{
                background: "linear-gradient(135deg,rgba(255,255,255,.985),rgba(248,252,255,.97))",
                border: "1px solid #DCE8F3",
                boxShadow: "0 16px 42px rgba(33,65,100,.065), inset 0 1px 0 rgba(255,255,255,.95)",
              }}
            >
              <div className="p-5 min-[900px]:p-7 min-[1200px]:flex min-[1200px]:items-center min-[1200px]:gap-0">

                {/* Input chips */}
                <ul
                  aria-label="Records Reeve may review"
                  className="flex flex-wrap gap-2 min-[1200px]:grid min-[1200px]:grid-rows-5 min-[1200px]:gap-0 min-[1200px]:w-[22%] min-[1200px]:h-[220px] min-[1200px]:shrink-0"
                >
                  {B4_INPUTS.map((inp) => (
                    <li
                      key={inp.label}
                      className={`flex items-center gap-1.5 px-2.5 py-1 w-fit rounded-[8px] border text-[10.5px] font-[700] tracking-[.055em] whitespace-nowrap min-[1200px]:self-center min-[1200px]:justify-self-end${inp.coral ? " khata-b4-chip-coral" : ""}`}
                      style={{
                        fontFamily: SANS,
                        ...(inp.coral ? {} : { color: "#315D9A", borderColor: "#DCE6F2", background: "#FFFFFF" }),
                      }}
                    >
                      <inp.Icon size={12} aria-hidden="true" />
                      {inp.label}
                    </li>
                  ))}
                </ul>

                {/* Desktop SVG convergence — hidden below 1200px */}
                <div
                  aria-hidden="true"
                  className="hidden min-[1200px]:flex items-center w-[8%] shrink-0"
                  style={{ height: 220 }}
                >
                  <svg
                    className="w-full h-full pointer-events-none"
                    viewBox="0 0 80 220"
                    preserveAspectRatio="none"
                  >
                    {(["M 0 22 Q 50 22 80 110","M 0 66 Q 50 66 80 110","M 0 110 L 80 110","M 0 154 Q 50 154 80 110","M 0 198 Q 50 198 80 110"] as const).map((d, i) => (
                      <path key={i} d={d} stroke="#D9E3ED" strokeWidth="1.5" fill="none" vectorEffect="non-scaling-stroke" />
                    ))}
                    {(["M 0 22 Q 50 22 80 110","M 0 66 Q 50 66 80 110","M 0 110 L 80 110","M 0 154 Q 50 154 80 110","M 0 198 Q 50 198 80 110"] as const).map((d, i) => (
                      <path
                        key={`a${i}`} d={d} fill="none"
                        stroke={i === 4 ? "#F9735B" : "#22D3EE"}
                        strokeWidth="1.8"
                        vectorEffect="non-scaling-stroke"
                        className="khata-b4-in-path"
                        pathLength={1}
                        style={{ transitionDelay: `${i * 35}ms` }}
                      />
                    ))}
                    <circle cx="80" cy="110" r="5" fill="white" stroke="#2563EB" strokeWidth="2" />
                  </svg>
                </div>

                {/* Stages */}
                <div className="min-[1200px]:w-[70%] min-[1200px]:h-[220px] min-[1200px]:shrink-0 mt-5 min-[768px]:mt-6 min-[1200px]:mt-0 min-w-0">
                  <div className="relative h-full">

                    {/* Desktop horizontal rail */}
                    <div
                      aria-hidden="true"
                      className="absolute hidden min-[1200px]:block top-[110px] left-0 right-[12.5%]"
                      style={{ height: 2, background: "#D9E3ED" }}
                    />
                    <div
                      aria-hidden="true"
                      className="khata-b4-rail-h absolute hidden min-[1200px]:block top-[110px] left-0 right-[12.5%]"
                      style={{ height: 2, background: "linear-gradient(90deg,#F9735B 0%,#F9735B 14.3%,#2563EB 42.9%,#7C3AED 71.4%,#14B8A6 100%)" }}
                    />

                    {/* Tablet stepped SVG — 768–1199px only */}
                    <svg
                      aria-hidden="true"
                      className="absolute hidden min-[768px]:block min-[1200px]:hidden pointer-events-none inset-0 w-full h-full"
                      viewBox="0 0 100 240"
                      preserveAspectRatio="none"
                    >
                      <defs>
                        <linearGradient id="khata-b4-seg1" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#F9735B" />
                          <stop offset="100%" stopColor="#2563EB" />
                        </linearGradient>
                        <linearGradient id="khata-b4-seg2" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#2563EB" />
                          <stop offset="100%" stopColor="#7C3AED" />
                        </linearGradient>
                        <linearGradient id="khata-b4-seg3" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#7C3AED" />
                          <stop offset="100%" stopColor="#14B8A6" />
                        </linearGradient>
                      </defs>
                      <path
                        d="M25,0 L25,16 L75,16 L98,16 L98,120 L2,120 L2,148 L25,148 L75,148"
                        stroke="#D9E3ED" strokeWidth="1.5" fill="none"
                        vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round"
                      />
                      <path d="M25,0 L25,16 L75,16"
                        stroke="url(#khata-b4-seg1)" strokeWidth="1.8" fill="none"
                        vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round"
                        className="khata-b4-in-path" pathLength={1} />
                      <path d="M75,16 L98,16 L98,120 L2,120 L2,148 L25,148"
                        stroke="url(#khata-b4-seg2)" strokeWidth="1.8" fill="none"
                        vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round"
                        className="khata-b4-in-path" pathLength={1}
                        style={{ transitionDelay: "150ms" }} />
                      <path d="M25,148 L75,148"
                        stroke="url(#khata-b4-seg3)" strokeWidth="1.8" fill="none"
                        vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round"
                        className="khata-b4-in-path" pathLength={1}
                        style={{ transitionDelay: "300ms" }} />
                    </svg>

                    <ol
                      aria-label="How Reeve coordinates a Khata record issue"
                      className="relative z-10 grid grid-cols-1 gap-y-5 min-[768px]:grid-cols-2 min-[768px]:grid-rows-2 min-[768px]:h-[240px] min-[768px]:gap-x-6 min-[768px]:gap-y-6 min-[1200px]:grid-cols-4 min-[1200px]:grid-rows-none min-[1200px]:h-[220px] min-[1200px]:gap-0 min-[1200px]:pt-[94px] pb-1"
                    >
                      {B4_STAGES.map((s, i) => (
                        <li
                          key={s.num}
                          className="relative min-w-0 min-[1200px]:flex min-[1200px]:flex-col min-[1200px]:items-center"
                        >
                          {/* Phone per-segment connector */}
                          {i < B4_STAGES.length - 1 && (
                            <>
                              <span
                                aria-hidden="true"
                                className="absolute z-0 pointer-events-none min-[768px]:hidden left-[15px] top-[16px] w-[2px]"
                                style={{ bottom: "-36px", background: "#D9E3ED" }}
                              />
                              <span
                                aria-hidden="true"
                                className="khata-b4-rail-v absolute z-0 pointer-events-none min-[768px]:hidden left-[15px] top-[16px] w-[2px]"
                                style={{
                                  bottom: "-36px",
                                  background: `linear-gradient(180deg, ${s.accent}, ${B4_STAGES[i + 1].accent})`,
                                  transitionDelay: `${120 + i * 100}ms`,
                                }}
                              />
                            </>
                          )}
                          {/* Marker row */}
                          <div className="relative z-10 flex items-center gap-2.5 min-[768px]:flex-col min-[768px]:items-center min-[768px]:gap-1.5 min-[1200px]:gap-0">
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-white text-[11px] font-[700]"
                              style={{ border: `2px solid ${s.accent}`, fontFamily: SANS, color: s.accent }}
                            >
                              {s.num}
                            </div>
                            <p
                              className="text-[11px] min-[900px]:text-[11.5px] font-[700] uppercase tracking-[.07em] min-[768px]:mt-1 min-[768px]:text-center min-[1200px]:mt-2 shrink-0"
                              style={{ fontFamily: SANS, color: s.accent }}
                            >
                              {s.label}
                            </p>
                          </div>
                          {/* Description */}
                          <p
                            className={[
                              "mt-1.5 min-[1200px]:mt-2 text-[12.5px] min-[900px]:text-[13px] font-[450] leading-[1.43] min-w-0",
                              "pl-[42px] min-[768px]:pl-0 min-[768px]:text-center min-[1200px]:px-3 min-[1200px]:w-full",
                              i > 0 ? "min-[1200px]:border-l min-[1200px]:border-[#DDE5EF]" : "",
                            ].join(" ")}
                            style={{ fontFamily: SANS, color: "#596A82" }}
                          >
                            {s.body}
                          </p>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── INTEGRITY STRIP ── */}
          <aside
            aria-label="Reeve operating principle"
            className="mt-[16px] min-[900px]:mt-[22px] rounded-[12px] min-[900px]:rounded-[14px] overflow-hidden"
            style={{ background: "linear-gradient(135deg,#07101F 0%,#0A1730 55%,#0B2746 100%)" }}
          >
            <div style={{ height: 3, background: "linear-gradient(90deg,#F9735B,#2563EB 48%,#14B8A6)" }} />
            <div className="px-4 py-4 min-[900px]:px-[22px] min-[900px]:py-[18px]">
              <span className="text-[14.5px] min-[900px]:text-[15.5px] font-[650] text-white" style={{ fontFamily: SANS }}>
                No unofficial payments and no promises to &#8220;move&#8221; a file.
              </span>
              {" "}
              <span className="text-[14px] min-[900px]:text-[14.5px] font-[450] leading-[1.5]" style={{ fontFamily: SANS, color: "#C7D4E4" }}>
                If a case stalls, Reeve follows the available official follow-up or escalation path and keeps you informed about what is happening.
              </span>
            </div>
          </aside>

          {/* ── BOUNDARY FACT RAIL ── */}
          <dl className="mt-[24px] min-[900px]:mt-[32px] border-y border-[#D7E1EC]">
            <div className="grid grid-cols-2 min-[900px]:grid-cols-4">
              {B4_BOUNDARIES.map((b, i) => (
                <div
                  key={b.label}
                  className={[
                    "px-4 py-4 min-[900px]:px-5 min-[900px]:py-4",
                    i < 2 ? "border-b border-[#D7E1EC]" : "",
                    i % 2 === 0 ? "border-r border-[#DFE7F0]" : "",
                    i < 3 ? "min-[900px]:border-r min-[900px]:border-[#DFE7F0]" : "",
                    "min-[900px]:border-b-0",
                  ].join(" ")}
                >
                  <dt className="text-[10.5px] font-[700] uppercase tracking-[.09em]" style={{ fontFamily: SANS, color: "#65758C" }}>
                    {b.label}
                  </dt>
                  <dd className="mt-1 text-[14px] min-[900px]:text-[14.5px] font-[600]" style={{ fontFamily: SANS, color: "#17233D" }}>
                    {b.value}
                  </dd>
                </div>
              ))}
            </div>
          </dl>

          {/* ── QUALIFICATION ── */}
          <p
            className="mt-[10px] min-[900px]:mt-[12px] text-[13px] min-[900px]:text-[13.5px] font-[500] leading-[1.45] max-w-[720px]"
            style={{ fontFamily: SANS, color: "#657286" }}
          >
            Some properties or circumstances may not support the outcome the owner originally expects.
          </p>

          {/* ── FAQ ── */}
          <p
            className="mt-[34px] min-[900px]:mt-[44px] text-[11.5px] font-[700] uppercase tracking-[.10em]"
            style={{ fontFamily: SANS, color: "#4F46E5" }}
          >
            COMMON QUESTIONS
          </p>
          <div className="mt-3 border-y border-[#DDE5EF]">
            {B4_FAQS.map((faq, i) => (
              <details key={faq.q} className={`khata-b4-faq${i > 0 ? " border-t border-[#DDE5EF]" : ""}`}>
                <summary className="relative flex items-center justify-between min-h-[54px] min-[900px]:min-h-[60px] px-4 min-[900px]:px-5 py-3 gap-3">
                  <span
                    aria-hidden="true"
                    className="khata-b4-faq-wash absolute inset-0 z-0 pointer-events-none opacity-0"
                    style={{ background: "linear-gradient(90deg,rgba(37,99,235,.035),rgba(20,184,166,.025),transparent 82%)" }}
                  />
                  <h3
                    className="relative z-10 text-[14.5px] min-[900px]:text-[15.5px] font-[600] leading-[1.3]"
                    style={{ fontFamily: SANS, color: "#17233D" }}
                  >
                    {faq.q}
                  </h3>
                  <Plus size={17} aria-hidden="true" className="khata-b4-faq-toggle relative z-10 shrink-0" style={{ color: "#8291A7" }} />
                </summary>
                <div className="khata-b4-faq-answer border-t border-[#F0EEF8] px-4 min-[900px]:px-5 py-4">
                  <p className="text-[14px] font-[450] leading-[1.52]" style={{ fontFamily: SANS, color: "#536176" }}>
                    {faq.a}
                    {faq.nriLink && (
                      <a href="/nri-property-services-india" className="underline ml-0.5" style={{ color: "#0F766E" }}>
                        See NRI Property Services
                        <span aria-hidden="true" className="khata-b4-nri-arrow"> →</span>
                      </a>
                    )}
                  </p>
                </div>
              </details>
            ))}
          </div>

        </div>
      </div>
    </section>
  );
}

// ── Band 5: Enquiry ───────────────────────────────────────────────────────────
// Copied from NriEnquirySection in NriPropertyServicesIndia.tsx.
// Only difference: initialService="khata_mutation" preselects Khata & Mutation.

function KhataEnquirySection() {
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

          {/* Left copy */}
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
                    className="text-[14.5px] font-[500] leading-[1.45] text-[#E8EEF7]"
                    style={{ fontFamily: SANS }}
                  >
                    {text}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Form card */}
          <div className="mt-8 lg:mt-0">
            <div
              className="rounded-[18px] lg:rounded-[22px] border border-[#E8E6E1] shadow-[0_26px_70px_rgba(0,0,0,.22)]"
              style={{ background: "#FFFDFC" }}
            >
              <div className="p-5 sm:p-7 lg:p-8">
                <PropertyEnquiryForm initialService="khata_mutation" />
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

// ── Band 2: Understand + Route ────────────────────────────────────────────────

type KhataSituation =
  | "transfer_correction_rejection"
  | "inheritance"
  | "no_existing_record"
  | "b_khata_status"
  | "other";

const CONCEPTS = [
  {
    label: "KHATA / EKHATA",
    Icon: BookOpen, iconFg: "#0891B2", iconBg: "rgba(34,211,238,.10)",
    primary: "Municipal property record",
    supporting: "eKhata is the digital form of that municipal record.",
    boldSupporting: false,
  },
  {
    label: "MUTATION",
    Icon: RefreshCw, iconFg: "#2563EB", iconBg: "rgba(37,99,235,.09)",
    primary: "Updating the record",
    supporting: "The municipal record is updated after an ownership change.",
    boldSupporting: false,
  },
  {
    label: "TITLE",
    Icon: Key, iconFg: "#7C3AED", iconBg: "rgba(124,58,237,.08)",
    primary: "Legal ownership",
    supporting: "Khata is not proof of title.",
    boldSupporting: true,
  },
  {
    label: "A / B STATUS",
    Icon: Layers, iconFg: "#D97706", iconBg: "rgba(245,158,11,.10)",
    primary: "Separate property status",
    supporting: "eKhata does not turn B-Khata into A-Khata.",
    boldSupporting: true,
  },
] as const;

const ROUTES: Array<{
  key: KhataSituation;
  href: string;
  title: string;
  taxonomy: string;
  accentRail: string;
  accentIcon: string;
  iconBg: string;
  wash: string;
  Icon: LucideIcon;
  clarification?: string;
  examples?: string;
}> = [
  {
    key: "transfer_correction_rejection",
    href: "#khata-transfer-correction",
    title: "The record shows the wrong owner, details are wrong, or my application came back",
    taxonomy: "TRANSFER · CORRECTION · RESUBMISSION",
    accentRail: "linear-gradient(180deg,#F9735B 0%,#2563EB 100%)",
    accentIcon: "#F9735B",
    iconBg: "rgba(249,115,91,.09)",
    wash: "linear-gradient(90deg,rgba(249,115,91,.055),rgba(37,99,235,.020) 58%,transparent 84%)",
    Icon: FileX,
  },
  {
    key: "inheritance",
    href: "#khata-inheritance",
    title: "I inherited the property or the recorded owner has died",
    taxonomy: "INHERITANCE · SUCCESSION · MUTATION",
    accentRail: "#7C3AED",
    accentIcon: "#7C3AED",
    iconBg: "rgba(124,58,237,.09)",
    wash: "linear-gradient(90deg,rgba(124,58,237,.050),transparent 82%)",
    Icon: Users,
  },
  {
    key: "no_existing_record",
    href: "#new-khata",
    title: "I can't find an existing Khata or property record",
    clarification: "No existing record is not a transfer case.",
    taxonomy: "NEW / FIRST KHATA · DIFFERENT APPLICATION ROUTE",
    accentRail: "#0891B2",
    accentIcon: "#0891B2",
    iconBg: "rgba(34,211,238,.10)",
    wash: "linear-gradient(90deg,rgba(34,211,238,.060),transparent 82%)",
    Icon: Search,
  },
  {
    key: "b_khata_status",
    href: "#b-khata-a-khata",
    title: "I have a B-Khata or an A/B-status question",
    taxonomy: "PROPERTY STATUS · CONVERSION",
    accentRail: "#F59E0B",
    accentIcon: "#F59E0B",
    iconBg: "rgba(245,158,11,.10)",
    wash: "linear-gradient(90deg,rgba(245,158,11,.055),transparent 82%)",
    Icon: Tag,
  },
  {
    key: "other",
    href: "#other-khata-cases",
    title: "My situation is different",
    examples: "Bifurcation · amalgamation · multiple owners · owner abroad · something else",
    taxonomy: "OTHER RECORD / OWNERSHIP WORK",
    accentRail: "linear-gradient(180deg,#14B8A6,#4338CA)",
    accentIcon: "#14B8A6",
    iconBg: "rgba(20,184,166,.09)",
    wash: "linear-gradient(90deg,rgba(20,184,166,.045),rgba(67,56,202,.018) 60%,transparent 90%)",
    Icon: GitFork,
  },
];

const SITUATION_LABELS: Record<KhataSituation, string> = {
  transfer_correction_rejection: "Wrong owner, incorrect details, or rejected application",
  inheritance: "Inherited property or deceased owner",
  no_existing_record: "No existing Khata or property record found",
  b_khata_status: "B-Khata or A/B-status question",
  other: "Different situation",
};

// ── Band 3 data ───────────────────────────────────────────────────────────────

const MISMATCHES = [
  {
    num: "01",
    bg: "linear-gradient(135deg,#E85D48,#F9735B)",
    title: "Name mismatch",
    copy: "The name on the sale deed or older record is spelled differently from the identity/Aadhaar record.",
  },
  {
    num: "02",
    bg: "linear-gradient(135deg,#6D28D9,#7C3AED)",
    title: "Co-owner missing",
    copy: "One of the owners appears in the deed or ownership history but is missing or inconsistent in the municipal record.",
  },
  {
    num: "03",
    bg: "linear-gradient(135deg,#1D4ED8,#2563EB)",
    title: "Property particulars do not reconcile",
    copy: "Area, site/flat details, property identifiers or other recorded particulars differ across documents.",
  },
  {
    num: "04",
    bg: "linear-gradient(135deg,#0E7490,#0891B2)",
    title: "Identity / authentication cannot link correctly",
    copy: "The required identity or Aadhaar information is not linked, available or matching well enough for the digital process.",
  },
  {
    num: "05",
    bg: "linear-gradient(135deg,#B45309,#C2410C)",
    title: "Supporting records do not match",
    copy: "The deed, tax record, old Khata or other supporting records point to inconsistent information—or the application has been filed through the wrong route.",
  },
];

type CaseData = {
  key: KhataSituation;
  id: string;
  caseLabel: string;
  taxonomy: string;
  accent: string;
  accentRgba: string;
  wash: string;
  h3: string;
  insight: string;
};

const CASES: CaseData[] = [
  {
    key: "transfer_correction_rejection",
    id: "khata-transfer-correction",
    caseLabel: "CASE 01",
    taxonomy: "EXISTING RECORD NEEDS CORRECTION",
    accent: "#F9735B",
    accentRgba: "rgba(249,115,91,.28)",
    wash: "linear-gradient(90deg,rgba(249,115,91,.055),rgba(37,99,235,.018) 58%,transparent 88%)",
    h3: "Wrong owner, incorrect details or a rejected application",
    insight: "When an existing record is wrong, first identify what does not reconcile before submitting the same information again.",
  },
  {
    key: "inheritance",
    id: "khata-inheritance",
    caseLabel: "CASE 02",
    taxonomy: "OWNERSHIP CHANGED AFTER DEATH",
    accent: "#7C3AED",
    accentRgba: "rgba(124,58,237,.22)",
    wash: "linear-gradient(90deg,rgba(124,58,237,.05),transparent 86%)",
    h3: "Inherited property or deceased owner",
    insight: "The municipal record may not be ready to change until the underlying succession and ownership position is clear.",
  },
  {
    key: "no_existing_record",
    id: "new-khata",
    caseLabel: "CASE 03",
    taxonomy: "DIFFERENT APPLICATION ROUTE",
    accent: "#0891B2",
    accentRgba: "rgba(8,145,178,.22)",
    wash: "linear-gradient(90deg,rgba(34,211,238,.06),transparent 86%)",
    h3: "Property not found / first or new Khata",
    insight: "No existing Khata uses a different application route from transferring an existing record.",
  },
  {
    key: "b_khata_status",
    id: "b-khata-a-khata",
    caseLabel: "CASE 04",
    taxonomy: "PROPERTY STATUS",
    accent: "#B45309",
    accentRgba: "rgba(180,83,9,.20)",
    wash: "linear-gradient(90deg,rgba(245,158,11,.055),transparent 86%)",
    h3: "B-Khata / A-Khata",
    insight: "",
  },
  {
    key: "other",
    id: "other-khata-cases",
    caseLabel: "CASE 05",
    taxonomy: "OTHER RECORD WORK",
    accent: "#14B8A6",
    accentRgba: "rgba(20,184,166,.22)",
    wash: "linear-gradient(90deg,rgba(20,184,166,.045),rgba(67,56,202,.018) 60%,transparent 90%)",
    h3: "Bifurcation, amalgamation, multiple owners, owner abroad or something else",
    insight: "Some record problems do not fit an ordinary transfer at all; the correct path depends on what changed in the property or ownership.",
  },
];

const BAND3_STYLES = `
  .khata-b3 {
    background:
      radial-gradient(38% 28% at 8% 5%, rgba(245,158,11,.052) 0%, rgba(245,158,11,.014) 48%, transparent 74%),
      radial-gradient(38% 34% at 94% 76%, rgba(124,58,237,.048) 0%, rgba(124,58,237,.014) 50%, transparent 76%),
      linear-gradient(180deg, #FFF9F2 0%, #FFFDF9 42%, #F7F6FC 100%);
  }
  @media (min-width:900px) {
    .khata-b3 {
      background:
        radial-gradient(38% 28% at 8% 5%, rgba(245,158,11,.065) 0%, rgba(245,158,11,.018) 48%, transparent 74%),
        radial-gradient(38% 34% at 94% 76%, rgba(124,58,237,.060) 0%, rgba(124,58,237,.018) 50%, transparent 76%),
        linear-gradient(180deg, #FFF9F2 0%, #FFFDF9 42%, #F7F6FC 100%);
    }
  }
  details.khata-case > summary { list-style: none; cursor: pointer; }
  details.khata-case > summary::-webkit-details-marker { display: none; }
  .khata-case-wash { transition: opacity 180ms cubic-bezier(.2,.8,.2,1); }
  .khata-case { transition: box-shadow 180ms cubic-bezier(.2,.8,.2,1); }
  @media (hover:hover) and (pointer:fine) {
    details.khata-case > summary:hover .khata-case-wash { opacity: 1; }
    details.khata-case > summary:hover .khata-case-toggle { color: var(--khata-case-accent); }
  }
  details.khata-case > summary:focus-visible { outline: 2px solid #2563EB; outline-offset: -2px; }
  details.khata-case > summary:focus-visible .khata-case-wash { opacity: 1; }
  details.khata-case[open] > summary .khata-case-wash { opacity: 1; }
  details.khata-case[open] > summary .khata-case-toggle { transform: rotate(45deg); color: var(--khata-case-accent); }
  .khata-case-toggle { transition: transform 180ms cubic-bezier(.2,.8,.2,1), color 180ms; }
  .khata-case[data-selected="true"] { box-shadow: inset 0 0 0 1px var(--khata-case-accent-rgba); }
  .khata-case[data-selected="true"] > summary .khata-case-wash { opacity: 1; }
  @keyframes khata-case-open { from { opacity:0; transform:translateY(-4px); } to { opacity:1; transform:translateY(0); } }
  details.khata-case[open] .khata-case-body { animation: khata-case-open 180ms ease-out forwards; }
  @keyframes khata-conn-h-open { from { transform: scaleX(0); } to { transform: scaleX(1); } }
  @keyframes khata-conn-v-open { from { transform: scaleY(0); } to { transform: scaleY(1); } }
  .khata-conn-h { transform-origin: left; }
  .khata-conn-v { transform-origin: top; }
  details.khata-case[open] .khata-conn-h { animation: khata-conn-h-open 220ms ease-out both; }
  details.khata-case[open] .khata-conn-v { animation: khata-conn-v-open 220ms ease-out both; }
  .khata-official-cta-wash { transition: opacity 180ms cubic-bezier(.2,.8,.2,1); }
  .khata-official-ext { transition: transform 180ms cubic-bezier(.2,.8,.2,1); }
  @media (hover:hover) and (pointer:fine) {
    .khata-official-cta:hover .khata-official-cta-wash { opacity: 1; }
    .khata-official-cta:hover .khata-official-ext { transform: translateX(2px); }
  }
  .khata-official-cta:focus-visible { outline: 2px solid #0F766E; outline-offset: -2px; }
  details.khata-docs > summary::-webkit-details-marker { display: none; }
  .khata-docs-toggle { transition: transform 180ms cubic-bezier(.2,.8,.2,1); }
  details.khata-docs[open] .khata-docs-toggle { transform: rotate(45deg); }
  @media (prefers-reduced-motion:reduce) {
    .khata-case, .khata-case-wash, .khata-case-toggle,
    .khata-official-cta-wash, .khata-official-ext { transition: none; }
    details.khata-case[open] .khata-conn-h,
    details.khata-case[open] .khata-conn-v { animation: none; transform: scale(1); }
    details.khata-case[open] .khata-case-body { animation: none; }
    .khata-docs-toggle { transition: none; }
  }
`;

// ── Reeve Fits rail (shared between cases) ────────────────────────────────────
function ReeveRail({ text }: { text: string }) {
  return (
    <div className="mt-4 rounded-[10px] overflow-hidden border border-[#DDE8ED] relative">
      <div
        className="absolute left-0 inset-y-0 w-[3px]"
        style={{ background: "linear-gradient(180deg,#2563EB,#14B8A6)" }}
      />
      <div
        className="pl-5 pr-4 py-4"
        style={{ background: "linear-gradient(90deg,rgba(37,99,235,.045),rgba(20,184,166,.035))" }}
      >
        <p
          className="text-[10px] font-[700] uppercase tracking-[.08em] mb-1"
          style={{ fontFamily: SANS, color: "#526176" }}
        >
          WHERE REEVE FITS
        </p>
        <p
          className="text-[14px] font-[450] leading-[1.5]"
          style={{ fontFamily: SANS, color: "#536176" }}
        >
          {text}
        </p>
      </div>
    </div>
  );
}

// ── Nested disclosure (documents) ─────────────────────────────────────────────
function DocsDisclosure({ items }: { items: string[] }) {
  return (
    <details
      className="khata-docs mt-4 rounded-b-[8px] overflow-hidden border-t"
      style={{ borderColor: "#E9E7EF", background: "rgba(248,248,252,.9)" }}
    >
      <summary
        className="flex items-center justify-between min-h-[44px] px-4 py-3 cursor-pointer text-[13px] font-[500] select-none"
        style={{ fontFamily: SANS, color: "#536176", listStyle: "none" }}
      >
        <span>Documents we may ask to review</span>
        <Plus size={16} aria-hidden="true" className="khata-docs-toggle shrink-0" />
      </summary>
      <ul
        className="list-disc pl-8 pb-4 pr-4 space-y-1"
      >
        {items.map((item) => (
          <li key={item} className="text-[13px] font-[450] leading-[1.5]" style={{ fontFamily: SANS, color: "#536176" }}>
            {item}
          </li>
        ))}
      </ul>
    </details>
  );
}

// ── Process nodes (Cases 1 & 2) ───────────────────────────────────────────────
function ProcessNodes({ steps, accent }: { steps: string[]; accent: string }) {
  return (
    <>
      {/* Desktop >=1200px: horizontal */}
      <div className="hidden min-[1200px]:flex items-center">
        {steps.map((step, i) => (
          <div key={step} className="flex items-center min-w-0">
            <div
              className="shrink-0 px-2 py-1.5 rounded-[6px] text-[11px] font-[600] leading-tight text-center"
              style={{ fontFamily: SANS, color: accent, background: `rgba(${accent === "#F9735B" ? "249,115,91" : "124,58,237"},.08)`, minWidth: 80, maxWidth: 140 }}
            >
              {step}
            </div>
            {i < steps.length - 1 && (
              <div
                className="khata-conn-h h-[2px] flex-1 mx-1 shrink-0"
                style={{ background: "rgba(37,99,235,.28)", minWidth: 16 }}
              />
            )}
          </div>
        ))}
      </div>
      {/* Mobile/tablet <1200px: vertical */}
      <div className="flex flex-col min-[1200px]:hidden">
        {steps.map((step, i) => (
          <div key={step} className="flex flex-col items-start">
            <div
              className="px-2 py-1.5 rounded-[6px] text-[11px] font-[600] leading-tight"
              style={{ fontFamily: SANS, color: accent, background: `rgba(${accent === "#F9735B" ? "249,115,91" : "124,58,237"},.08)` }}
            >
              {step}
            </div>
            {i < steps.length - 1 && (
              <div
                className="khata-conn-v w-[2px] h-5 ml-[8px]"
                style={{ background: "rgba(37,99,235,.28)" }}
              />
            )}
          </div>
        ))}
      </div>
    </>
  );
}

// ── Band 3: Path + Case Desk ──────────────────────────────────────────────────

function KhataPathCaseDeskSection({
  selected,
  requestId,
}: {
  selected: KhataSituation | null;
  requestId: number;
}) {
  const detailsRefs = useRef<Partial<Record<KhataSituation, HTMLDetailsElement | null>>>({});

  // React to Band 2 selection — fires on every click including repeated same-route
  useEffect(() => {
    if (!selected) return;
    CASES.forEach((c) => {
      const el = detailsRefs.current[c.key];
      if (el) el.open = c.key === selected;
    });
    const target = detailsRefs.current[selected];
    target?.querySelector("summary")?.focus({ preventScroll: true });
  }, [selected, requestId]);

  // Direct hash on mount — SSR-safe
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash.slice(1);
    const match = CASES.find((c) => c.id === hash);
    if (match) {
      const el = detailsRefs.current[match.key];
      if (el) el.open = true;
    }
  }, []);

  return (
    <section id="khata-path" className="khata-b3" aria-labelledby="khata-path-heading">
      <style>{BAND3_STYLES}</style>

      <div className="max-w-[1320px] mx-auto px-5 min-[768px]:px-7 min-[1100px]:px-12 pt-[52px] min-[900px]:pt-[80px] pb-[56px] min-[900px]:pb-[84px]">

        {/* H2 */}
        <h2
          id="khata-path-heading"
          className="max-w-[720px]"
          style={{ fontFamily: SERIF, fontWeight: 400, color: "#111827", fontSize: "clamp(31px,8.5vw,37px)", lineHeight: 1.06 }}
        >
          <span className="min-[900px]:hidden">Start with the simplest route that fits your situation.</span>
          <span
            className="hidden min-[900px]:inline"
            style={{ fontSize: "clamp(40px,3.4vw,52px)", lineHeight: 1.04, letterSpacing: "-0.018em" }}
          >
            Start with the simplest route that fits your situation.
          </span>
        </h2>

        {/* Practical content wrapper */}
        <div className="max-w-[1160px]">

          {/* ── 3A: Official Ribbon ── */}
          <aside aria-label="Official self-service Khata route" className="relative mt-[22px] min-[900px]:mt-[28px]">
            {/* Rear plate */}
            <div
              className="absolute inset-0 rounded-[18px] pointer-events-none"
              style={{ transform: "translate(5px,6px)", background: "linear-gradient(135deg,rgba(20,184,166,.13),rgba(34,211,238,.055))" }}
            />
            {/* Front panel */}
            <div
              className="relative rounded-[18px] overflow-hidden"
              style={{ background: "rgba(240,253,250,.94)", border: "1px solid #A7E0D8", boxShadow: "0 14px 36px rgba(20,148,130,.09),inset 0 1px 0 rgba(255,255,255,.80)" }}
            >
              {/* 3px left accent rail */}
              <div className="absolute left-0 inset-y-0 w-[3px]" style={{ background: "linear-gradient(180deg,#14B8A6,#22D3EE)" }} />

              <div className="pl-5 pr-4 py-5 min-[900px]:pl-7 min-[900px]:pr-6 min-[900px]:py-6 min-[900px]:grid min-[900px]:grid-cols-[64fr_36fr]">

                {/* Left: label + title + checks */}
                <div className="min-[900px]:pr-6">
                  <p className="text-[11px] min-[900px]:text-[11.5px] font-[700] uppercase tracking-[.10em]" style={{ fontFamily: SANS, color: "#0E7490" }}>
                    OFFICIAL SELF-SERVICE PATH
                  </p>
                  <p className="mt-2 text-[17px] min-[900px]:text-[19px] font-[650] leading-[1.28]" style={{ fontFamily: SANS, color: "#18323A" }}>
                    Everything already matches? Start with the official route.
                  </p>
                  <ul className="mt-3 space-y-1.5">
                    {["Existing record is available", "Names and property details agree", "Required authentication can be completed"].map((check) => (
                      <li key={check} className="flex items-center gap-2">
                        <Check size={12} aria-hidden="true" style={{ color: "#0E7490", flexShrink: 0 }} />
                        <span className="text-[13px] min-[900px]:text-[13.5px] font-[500]" style={{ fontFamily: SANS, color: "#344A50" }}>{check}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Mobile separator */}
                <div className="min-[900px]:hidden mt-4 pt-4 border-t border-[#C5DED9]" />

                {/* Right: portal button + helpline */}
                <div className="min-[900px]:border-l min-[900px]:border-[#DCECE9] min-[900px]:pl-6 flex flex-col justify-center gap-3">
                  <a
                    href="https://bbmpeaasthi.karnataka.gov.in/citizen_core/"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Official e-Aasthi service — opens in a new tab"
                    className="khata-official-cta relative overflow-hidden min-h-[48px] flex items-center gap-2 rounded-[11px] border px-4"
                    style={{ borderColor: "#99D8D0", background: "rgba(240,253,250,.95)", fontFamily: SANS, fontSize: "14.5px", fontWeight: 650, color: "#0F766E" }}
                  >
                    <span
                      aria-hidden="true"
                      className="khata-official-cta-wash absolute inset-0 z-0 pointer-events-none opacity-0"
                      style={{ background: "linear-gradient(90deg,rgba(20,184,166,.10),rgba(34,211,238,.06))" }}
                    />
                    <span className="relative z-10">Official e-Aasthi service</span>
                    <span aria-hidden="true" className="khata-official-ext relative z-10 inline-block">↗</span>
                  </a>
                  <p className="text-[12.5px] min-[900px]:text-[13px] font-[500]" style={{ fontFamily: SANS, color: "#50666B" }}>
                    GBA eKhata helpline ·{" "}
                    <a href="tel:+919480683695" className="underline" style={{ color: "#0E7490" }}>9480683695</a>
                  </p>
                </div>

              </div>
            </div>
          </aside>

          {/* ── 3B: Mismatch Ledger ── */}
          <section aria-labelledby="khata-mismatch-heading" className="mt-[36px] min-[900px]:mt-[42px]">
            <h3
              id="khata-mismatch-heading"
              className="text-[20px] min-[900px]:text-[24px] font-[650] leading-[1.2]"
              style={{ fontFamily: SANS, color: "#182238" }}
            >
              What usually causes the mismatch?
            </h3>

            <div
              className="mt-[14px] min-[900px]:mt-[18px] rounded-[18px] overflow-hidden border border-[#E8E1DB]"
              style={{ background: "rgba(255,255,255,.82)", boxShadow: "0 12px 32px rgba(84,65,46,.05)" }}
            >
              {/* Top row — items 0 & 1 */}
              <div className="grid grid-cols-1 min-[900px]:grid-cols-2">
                {MISMATCHES.slice(0, 2).map((m, i) => (
                  <div
                    key={m.num}
                    className={[
                      "flex items-start gap-3 px-[14px] py-[12px] min-[900px]:px-[20px] min-[900px]:py-[18px]",
                      i === 0 ? "border-b min-[900px]:border-b-0 min-[900px]:border-r border-[#E8E1DB]" : "",
                    ].join(" ")}
                  >
                    <div
                      className="w-[34px] h-[34px] min-[900px]:w-10 min-[900px]:h-10 rounded-[9px] min-[900px]:rounded-[10px] flex items-center justify-center shrink-0 text-[17px] min-[900px]:text-[19px] font-[700] text-white"
                      style={{ fontFamily: SANS, background: m.bg }}
                    >
                      {m.num}
                    </div>
                    <div>
                      <p className="text-[14px] font-[650] leading-[1.3]" style={{ fontFamily: SANS, color: "#253248" }}>{m.title}</p>
                      <p className="mt-1 text-[12.5px] min-[900px]:text-[13.5px] font-[450] leading-[1.45]" style={{ fontFamily: SANS, color: "#657286" }}>{m.copy}</p>
                    </div>
                  </div>
                ))}
              </div>
              {/* Bottom row — items 2, 3, 4 */}
              <div className="grid grid-cols-1 min-[900px]:grid-cols-3 border-t border-[#E8E1DB]">
                {MISMATCHES.slice(2).map((m, i) => (
                  <div
                    key={m.num}
                    className={[
                      "flex items-start gap-3 px-[14px] py-[12px] min-[900px]:px-[20px] min-[900px]:py-[18px]",
                      i < 2 ? "border-b min-[900px]:border-b-0 min-[900px]:border-r border-[#E8E1DB]" : "",
                    ].join(" ")}
                  >
                    <div
                      className="w-[34px] h-[34px] min-[900px]:w-10 min-[900px]:h-10 rounded-[9px] min-[900px]:rounded-[10px] flex items-center justify-center shrink-0 text-[17px] min-[900px]:text-[19px] font-[700] text-white"
                      style={{ fontFamily: SANS, background: m.bg }}
                    >
                      {m.num}
                    </div>
                    <div>
                      <p className="text-[14px] font-[650] leading-[1.3]" style={{ fontFamily: SANS, color: "#253248" }}>{m.title}</p>
                      <p className="mt-1 text-[12.5px] min-[900px]:text-[13.5px] font-[450] leading-[1.45]" style={{ fontFamily: SANS, color: "#657286" }}>{m.copy}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── 3C: Case Desk ── */}
          <div className="mt-[32px] min-[900px]:mt-[38px]">
            <p
              className="text-[11.5px] min-[900px]:text-[12px] font-[700] uppercase tracking-[.11em]"
              style={{ fontFamily: SANS, color: "#4F46E5" }}
            >
              YOUR SITUATION
            </p>

            {/* 2.5D outer */}
            <div id="khata-cases" className="relative mt-[14px] min-[900px]:mt-[16px]">
              {/* Rear sheet */}
              <div
                className="absolute inset-0 rounded-[22px] pointer-events-none"
                style={{ transform: "translate(6px,7px)", background: "linear-gradient(135deg,rgba(124,58,237,.065),rgba(37,99,235,.04))" }}
              />
              {/* Main surface */}
              <div
                className="relative rounded-[20px] overflow-hidden border border-[#E5E4EA]"
                style={{ background: "#FFFFFF", boxShadow: "0 18px 46px rgba(37,30,68,.07),inset 0 1px 0 rgba(255,255,255,.90)" }}
              >
                {CASES.map((c) => (
                  <details
                    key={c.key}
                    className="khata-case border-b border-[#E5E4EA] last:border-b-0"
                    id={c.id}
                    data-selected={selected === c.key ? "true" : "false"}
                    style={{
                      "--khata-case-accent": c.accent,
                      "--khata-case-accent-rgba": c.accentRgba,
                      scrollMarginTop: "72px",
                    } as CSSProperties}
                    ref={(el) => { detailsRefs.current[c.key] = el; }}
                  >
                    <summary
                      className="khata-case-summary relative grid items-start gap-y-[6px] grid-cols-[minmax(0,1fr)_auto] min-[1100px]:grid-cols-[250px_minmax(280px,.9fr)_minmax(300px,1.15fr)_28px] min-[1100px]:items-center min-[1100px]:gap-y-0 min-[1100px]:gap-x-5 px-4 py-4 min-[900px]:px-5 min-[900px]:py-[18px]"
                    >
                      {/* Wash */}
                      <span
                        aria-hidden="true"
                        className="khata-case-wash absolute inset-0 z-0 pointer-events-none opacity-0"
                        style={{ background: c.wash }}
                      />
                      {/* Accent rail */}
                      <span
                        aria-hidden="true"
                        className="absolute left-0 inset-y-0 z-10 w-[3px]"
                        style={{ background: c.accent }}
                      />

                      {/* Meta — col 1, row 1 */}
                      <span className="relative z-10 col-start-1 row-start-1 min-[1100px]:col-start-1 min-[1100px]:row-start-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                        <span
                          className="text-[10px] font-[700] uppercase tracking-[.09em]"
                          style={{ fontFamily: SANS, color: c.accent }}
                        >
                          {c.caseLabel}
                        </span>
                        <span className="text-[#C5CDD9] text-[10px]" aria-hidden="true">·</span>
                        <span
                          className="text-[10px] font-[650] uppercase tracking-[.065em]"
                          style={{ fontFamily: SANS, color: "#65758C" }}
                        >
                          {c.taxonomy}
                        </span>
                        {selected === c.key && (
                          <span
                            className="ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-[700] uppercase tracking-[.08em]"
                            style={{ fontFamily: SANS, color: c.accent, background: `rgba(${c.key === "transfer_correction_rejection" ? "249,115,91" : c.key === "inheritance" ? "124,58,237" : c.key === "no_existing_record" ? "8,145,178" : c.key === "b_khata_status" ? "180,83,9" : "20,184,166"},.10)` }}
                          >
                            YOUR ROUTE
                          </span>
                        )}
                      </span>

                      {/* Plus toggle — col 2, row 1 */}
                      <Plus
                        size={18}
                        className="khata-case-toggle relative z-10 shrink-0 justify-self-end col-start-2 row-start-1 min-[1100px]:col-start-4 min-[1100px]:row-start-1"
                        style={{ color: "#8291A7" }}
                        aria-hidden="true"
                      />

                      {/* H3 — col-span-2, row 2 / col 2, row 1 desktop */}
                      <h3
                        className="relative z-10 col-span-2 row-start-2 min-[1100px]:col-span-1 min-[1100px]:col-start-2 min-[1100px]:row-start-1 text-[18px] min-[1100px]:text-[18px] font-[600] leading-[1.25]"
                        style={{ fontFamily: SANS, color: "#14213D" }}
                      >
                        {c.h3}
                      </h3>

                      {/* Insight / chips — col-span-2, row 3 / col 3, row 1 desktop */}
                      {c.key === "b_khata_status" ? (
                        <span className="relative z-10 col-span-2 row-start-3 min-[1100px]:col-span-1 min-[1100px]:col-start-3 min-[1100px]:row-start-1 flex flex-wrap gap-2">
                          {["eKhata ≠ A-Khata", "Khata transfer ≠ A/B-status conversion"].map((chip) => (
                            <span
                              key={chip}
                              className="px-2.5 py-1 rounded-full border text-[11.5px] font-[600]"
                              style={{ fontFamily: SANS, color: "#5A6A7E", borderColor: "#D4DCE8", background: "rgba(248,250,253,.9)" }}
                            >
                              {chip}
                            </span>
                          ))}
                        </span>
                      ) : (
                        <span
                          className="relative z-10 col-span-2 row-start-3 min-[1100px]:col-span-1 min-[1100px]:col-start-3 min-[1100px]:row-start-1 text-[13px] font-[500] leading-[1.45]"
                          style={{ fontFamily: SANS, color: "#596A82" }}
                        >
                          {c.insight}
                        </span>
                      )}
                    </summary>

                    {/* ── Case body ── */}
                    <div className="khata-case-body border-t border-[#F0EEF4] px-4 pb-5 min-[900px]:px-[26px] min-[900px]:pb-7 pt-4">
                      {c.key === "transfer_correction_rejection" && (
                        <>
                          <div className="min-[1200px]:grid min-[1200px]:grid-cols-[44fr_56fr] min-[1200px]:gap-8">
                            {/* Left: clarifying */}
                            <div>
                              <p className="text-[10.5px] font-[700] uppercase tracking-[.08em] mb-2" style={{ fontFamily: SANS, color: "#526176" }}>WHAT NEEDS CLARIFYING</p>
                              <ul className="space-y-1.5">
                                {[
                                  "Which owner should currently appear?",
                                  "Do deed and identity names match?",
                                  "Are all owners or co-owners reflected?",
                                  "Do the property particulars agree?",
                                  "What did the authority's query or rejection actually identify?",
                                ].map((q) => (
                                  <li key={q} className="text-[14px] font-[450] leading-[1.5]" style={{ fontFamily: SANS, color: "#536176" }}>— {q}</li>
                                ))}
                              </ul>
                            </div>
                            {/* Right: process */}
                            <div className="mt-5 min-[1200px]:mt-0">
                              <p className="text-[10.5px] font-[700] uppercase tracking-[.08em] mb-2" style={{ fontFamily: SANS, color: "#526176" }}>WHAT USUALLY HAPPENS NEXT</p>
                              <ProcessNodes
                                accent="#F9735B"
                                steps={["IDENTIFY MISMATCH", "CORRECT OR SUPPORT IT", "PROFESSIONAL INPUT (where required)", "RESPOND / RESUBMIT through the appropriate route"]}
                              />
                            </div>
                          </div>
                          <ReeveRail text="Reeve reviews the available record and query or rejection, helps identify the issue that needs correction, coordinates relevant documents or professionals, and follows the official response or resubmission process." />
                          <DocsDisclosure items={["Registered deed or ownership document", "Existing Khata/eKhata or older municipal record", "Current tax record or SAS property reference", "Identity details for the relevant owner(s)", "Query, rejection or endorsement, if one was issued"]} />
                        </>
                      )}

                      {c.key === "inheritance" && (
                        <>
                          <div className="min-[1200px]:grid min-[1200px]:grid-cols-[44fr_56fr] min-[1200px]:gap-8">
                            <div>
                              <p className="text-[10.5px] font-[700] uppercase tracking-[.08em] mb-2" style={{ fontFamily: SANS, color: "#526176" }}>WHAT NEEDS CLARIFYING</p>
                              <ul className="space-y-1.5">
                                {[
                                  "Who inherited or succeeded to the property?",
                                  "Are there multiple heirs or co-owners?",
                                  "What ownership or succession documentation already exists?",
                                  "Does the situation require legal determination or advocate input?",
                                ].map((q) => (
                                  <li key={q} className="text-[14px] font-[450] leading-[1.5]" style={{ fontFamily: SANS, color: "#536176" }}>— {q}</li>
                                ))}
                              </ul>
                            </div>
                            <div className="mt-5 min-[1200px]:mt-0">
                              <p className="text-[10.5px] font-[700] uppercase tracking-[.08em] mb-2" style={{ fontFamily: SANS, color: "#526176" }}>WHAT USUALLY HAPPENS NEXT</p>
                              <ProcessNodes
                                accent="#7C3AED"
                                steps={["ESTABLISH OWNERSHIP / SUCCESSION", "ALIGN HEIRS / CO-OWNERS", "ADVOCATE INPUT (where required)", "MUNICIPAL RECORD UPDATE"]}
                              />
                            </div>
                          </div>
                          <ReeveRail text="Reeve helps coordinate the available ownership records, communication between owners or heirs, relevant advocate work where required, and the subsequent municipal-record process." />
                          <p className="mt-3 text-[13px] font-[450] leading-[1.5]" style={{ fontFamily: SANS, color: "#536176" }}>
                            Planning to sell this property? Resolve the ownership and municipal-record position before buyer diligence begins.{" "}
                            <a href="/nri-property-sale-india#sale-readiness" className="underline" style={{ color: "#2563EB" }}>
                              Review NRI sale readiness →
                            </a>
                          </p>
                          <DocsDisclosure items={["Existing deed or ownership documents", "Death certificate, if relevant", "Succession or inheritance documents already available", "Identity details of relevant heirs/co-owners", "Existing Khata/eKhata or tax record"]} />
                        </>
                      )}

                      {c.key === "no_existing_record" && (
                        <>
                          {/* Path comparison artifact */}
                          <div className="min-[1100px]:grid min-[1100px]:grid-cols-[1fr_auto_1fr] min-[1100px]:gap-4 min-[1100px]:items-start flex flex-col gap-3">
                            <div className="rounded-[10px] border border-[#D8E4EE] p-3" style={{ background: "rgba(248,251,255,.9)" }}>
                              <p className="text-[10px] font-[700] uppercase tracking-[.08em] mb-1" style={{ fontFamily: SANS, color: "#2563EB" }}>EXISTING RECORD</p>
                              <span aria-hidden="true" className="block my-1 text-[13px]" style={{ color: "#2563EB" }}>↓</span>
                              <p className="text-[13px] font-[500] leading-[1.45]" style={{ fontFamily: SANS, color: "#384560" }}>Transfer / correction</p>
                            </div>
                            <div className="flex items-center justify-center min-[1100px]:pt-3">
                              <span className="text-[22px] font-[700]" style={{ color: "#7C3AED" }}>≠</span>
                            </div>
                            <div className="rounded-[10px] border border-[#E0D8EE] p-3" style={{ background: "rgba(251,248,255,.9)" }}>
                              <p className="text-[10px] font-[700] uppercase tracking-[.08em] mb-1" style={{ fontFamily: SANS, color: "#7C3AED" }}>NO USABLE EXISTING RECORD</p>
                              <span aria-hidden="true" className="block my-1 text-[13px]" style={{ color: "#7C3AED" }}>↓</span>
                              <p className="text-[13px] font-[500] leading-[1.45]" style={{ fontFamily: SANS, color: "#384560" }}>New / first-Khata or record-establishment route</p>
                            </div>
                          </div>
                          <p className="mt-4 text-[14.5px] font-[450] leading-[1.5]" style={{ fontFamily: SANS, color: "#536176" }}>
                            A transfer assumes that a usable record already exists and can be updated. When it does not, repeatedly submitting a transfer-style application addresses the wrong problem.
                          </p>
                          <ReeveRail text="Reeve first helps determine whether the property actually needs a transfer, a correction, new/first-Khata work, or another record-establishment route before the next application is pursued." />
                          <DocsDisclosure items={["Available registered deed/title document", "Tax or SAS property reference, if available", "Any old Khata, endorsement or property-ID reference", "Property identification/location details", "Any previous application, query or response"]} />
                        </>
                      )}

                      {c.key === "b_khata_status" && (
                        <>
                          {/* Relationship artifact */}
                          <div className="min-[1100px]:flex min-[1100px]:items-center min-[1100px]:gap-2 min-[1100px]:flex-nowrap flex flex-col gap-2">
                            {["DIGITISE RECORD", "TRANSFER RECORDED OWNER", "CHANGE A/B STATUS", "ADDRESS BUILDING / PLAN DEVIATIONS"].map((node, i, arr) => (
                              <div key={node} className="flex min-[1100px]:items-center min-[1100px]:flex-row flex-col items-start gap-2">
                                <div
                                  className="px-2.5 py-1.5 rounded-[6px] text-[11px] font-[600] shrink-0"
                                  style={{ fontFamily: SANS, color: "#8B6914", background: "rgba(245,158,11,.08)" }}
                                >
                                  {node}
                                </div>
                                {i < arr.length - 1 && (
                                  <span className="text-[18px] font-[700] shrink-0" style={{ color: "#B45309" }}>≠</span>
                                )}
                              </div>
                            ))}
                          </div>
                          <p className="mt-4 text-[14.5px] font-[450] leading-[1.5]" style={{ fontFamily: SANS, color: "#536176" }}>
                            Digitising a municipal record, updating the recorded owner, changing A/B status and addressing building or plan deviations are different questions. Resolving one does not automatically resolve the others.
                          </p>
                          {/* Boundary strip */}
                          <div
                            className="mt-4 rounded-[8px] px-4 py-3"
                            style={{ background: "rgba(245,158,11,.06)", border: "1px solid rgba(245,158,11,.18)" }}
                          >
                            <p className="text-[10.5px] font-[700] uppercase tracking-[.08em] mb-1" style={{ fontFamily: SANS, color: "#92600A" }}>PROPERTY STATUS IS A SEPARATE QUESTION</p>
                            <p className="text-[13px] font-[450] leading-[1.45]" style={{ fontFamily: SANS, color: "#6B4F10" }}>Property/layout or land-use status and construction/building-plan deviations may require separate review.</p>
                          </div>
                          <p className="mt-3 text-[13px] font-[450] leading-[1.5]" style={{ fontFamily: SANS, color: "#536176" }}>
                            Government charges and eligibility depend on the property's circumstances and the rules applicable when the case is reviewed. Temporary concessions can change, so the current position should be checked rather than hardcoded into the page.
                          </p>
                          <a
                            href="#enquiry"
                            className="mt-4 inline-flex items-center min-h-[44px] px-4 rounded-[10px] border text-[14px] font-[600]"
                            style={{ fontFamily: SANS, color: "#B45309", borderColor: "#D4924A", background: "rgba(245,158,11,.06)" }}
                          >
                            Tell us your B-Khata situation →
                          </a>
                          <DocsDisclosure items={["Existing Khata/eKhata or municipal property record", "Registered deed or ownership document", "Tax/SAS records", "Any available record or endorsement concerning A/B status", "Relevant layout/building records if the issue involves them"]} />
                        </>
                      )}

                      {c.key === "other" && (
                        <>
                          <div className="divide-y divide-[#F0EEF4]">
                            {[
                              { label: "BIFURCATION", copy: "One property or record needs to become separate records." },
                              { label: "AMALGAMATION", copy: "Multiple property or record units need to be combined." },
                              { label: "MULTIPLE / CO-OWNERS", copy: "The recorded position and actual ownership information need alignment." },
                              { label: "OWNER ABROAD", copy: "Authentication, missing India-side documents, co-owner coordination, old records or authorised action may complicate a process that is otherwise online." },
                            ].map((row) => (
                              <div key={row.label} className="py-3 first:pt-0">
                                <p className="text-[10.5px] font-[700] uppercase tracking-[.08em] mb-0.5" style={{ fontFamily: SANS, color: "#526176" }}>{row.label}</p>
                                <p className="text-[14px] font-[450] leading-[1.5]" style={{ fontFamily: SANS, color: "#536176" }}>{row.copy}</p>
                              </div>
                            ))}
                          </div>
                          <p className="mt-4 text-[14px] font-[450] leading-[1.5]" style={{ fontFamily: SANS, color: "#536176" }}>
                            Living overseas and dealing with more than the Khata?{" "}
                            <a href="/nri-property-services-india" className="underline" style={{ color: "#14B8A6" }}>See NRI Property Services →</a>
                          </p>
                          <p className="mt-3 text-[14px] font-[450] leading-[1.5]" style={{ fontFamily: SANS, color: "#536176" }}>
                            Something else? Tell us what happened rather than choosing a service name.
                          </p>
                          <DocsDisclosure items={["Available deed/ownership records", "Existing Khata/eKhata/property records", "Tax/SAS records", "Records relating to co-ownership, bifurcation or amalgamation where relevant", "Available identity/authorisation material where overseas coordination is involved"]} />
                        </>
                      )}
                    </div>
                  </details>
                ))}
              </div>
            </div>
          </div>

        </div>{/* /practical content wrapper */}
      </div>
    </section>
  );
}

const BAND2_STYLES = `
  .khata-b2 {
    background:
      radial-gradient(46% 38% at 10% 8%, rgba(34,211,238,.11) 0%, rgba(34,211,238,.036) 46%, transparent 74%),
      radial-gradient(40% 42% at 92% 72%, rgba(124,58,237,.08) 0%, rgba(124,58,237,.024) 48%, transparent 74%),
      linear-gradient(180deg, #F4F8FF 0%, #FBFDFF 48%, #F7F6FC 100%);
  }
  @media (min-width:900px) {
    .khata-b2 {
      background:
        radial-gradient(46% 38% at 10% 8%, rgba(34,211,238,.14) 0%, rgba(34,211,238,.045) 46%, transparent 74%),
        radial-gradient(40% 42% at 92% 72%, rgba(124,58,237,.10) 0%, rgba(124,58,237,.03) 48%, transparent 74%),
        linear-gradient(180deg, #F4F8FF 0%, #FBFDFF 48%, #F7F6FC 100%);
    }
  }
  .khata-route { transition: box-shadow 180ms cubic-bezier(.2,.8,.2,1); }
  .khata-route-wash { transition: opacity 180ms cubic-bezier(.2,.8,.2,1); }
  .khata-route-arrow { transition: transform 180ms cubic-bezier(.2,.8,.2,1), color 180ms; }
  @media (hover:hover) and (pointer:fine) {
    .khata-route:hover .khata-route-wash { opacity: 1; }
    .khata-route:hover .khata-route-arrow { transform: translateX(2px); color: var(--khata-route-accent); }
  }
  .khata-route:focus-visible { outline: 2px solid #2563EB; outline-offset: -2px; }
  .khata-route:focus-visible .khata-route-wash { opacity: 1; }
  .khata-route:focus-visible .khata-route-arrow { transform: translateX(2px); color: var(--khata-route-accent); }
  .khata-route[aria-current="location"] .khata-route-wash { opacity: 1; }
  .khata-route[aria-current="location"] .khata-route-arrow { transform: translateX(2px); color: var(--khata-route-accent); }
  .khata-route[aria-current="location"] { box-shadow: inset 0 0 0 1px rgba(37,99,235,.24); }
  @media (prefers-reduced-motion:reduce) {
    .khata-route, .khata-route-wash, .khata-route-arrow { transition: none; }
    .khata-route-arrow { transform: none !important; }
  }
`;

function KhataUnderstandRouteSection({
  selected,
  onSelect,
}: {
  selected: KhataSituation | null;
  onSelect: (s: KhataSituation) => void;
}) {
  // Board cell border classes by index (mobile 2×2 / desktop 4-col)
  const cellBorderClass = (i: number) => {
    const mobile =
      i === 0 ? "border-r border-b" :
      i === 1 ? "border-b" :
      i === 2 ? "border-r" : "";
    const desktop = [
      "min-[900px]:border-b-0",
      i < 3 ? "min-[900px]:border-r" : "min-[900px]:border-r-0",
    ].join(" ");
    return [mobile, desktop, "border-[#E2EAF4]"].filter(Boolean).join(" ");
  };

  // Route border classes by index (Routes 0–3 in 2×2 grid)
  const routeBorderClass = (i: number) => {
    if (i === 0) return "border-b min-[800px]:border-r min-[800px]:border-b border-[#DCE6F2]";
    if (i === 1) return "border-b min-[800px]:border-b border-[#DCE6F2]";
    if (i === 2) return "border-b min-[800px]:border-r min-[800px]:border-b-0 border-[#DCE6F2]";
    return "min-[800px]:border-b-0 border-[#DCE6F2]"; // index 3
  };

  const mainRoutes = ROUTES.slice(0, 4);
  const otherRoute = ROUTES[4];

  return (
    <section id="khata-ekhata-mutation-title" className="khata-b2">
      <style>{BAND2_STYLES}</style>

      {/* 2px top hand-off line */}
      <div style={{ height: 2, background: "linear-gradient(90deg,#22D3EE,#2563EB 48%,#7C3AED 100%)" }} />

      <div className="max-w-[1320px] mx-auto px-5 min-[768px]:px-7 min-[1100px]:px-12 pt-[52px] min-[900px]:pt-[80px] pb-[56px] min-[900px]:pb-[84px]">

        {/* ── PART A: Registry Board ── */}
        <article aria-labelledby="khata-terms-heading">
          {/* Eyebrow */}
          <p
            className="text-[11.5px] min-[900px]:text-[12.5px] font-[700] uppercase tracking-[.11em]"
            style={{ fontFamily: SANS, color: "#2563EB" }}
          >
            60-SECOND CLARITY
          </p>

          {/* H2 */}
          <h2
            id="khata-terms-heading"
            className="mt-[10px] max-w-[780px]"
            style={{
              fontFamily: SERIF,
              fontWeight: 400,
              color: "#0B1733",
              fontSize: "clamp(32px,9vw,38px)",
              lineHeight: 1.05,
            }}
          >
            <span className="min-[900px]:hidden">Khata, mutation, title and A/B status are different things.</span>
            <span
              className="hidden min-[900px]:inline"
              style={{ fontSize: "clamp(40px,3.5vw,52px)", lineHeight: 1.04, letterSpacing: "-0.018em" }}
            >
              Khata, mutation, title and A/B status are different things.
            </span>
          </h2>

          {/* 2.5D Board */}
          <div className="relative mt-[22px] min-[900px]:mt-[28px]">
            {/* Rear depth plate */}
            <div
              className="absolute inset-0 rounded-[22px]"
              style={{
                transform: "translate(6px,7px)",
                background: "linear-gradient(135deg,rgba(37,99,235,.11),rgba(124,58,237,.055))",
              }}
            />
            {/* Front board */}
            <div
              className="relative rounded-[20px] overflow-hidden"
              style={{
                background: "rgba(255,255,255,.94)",
                border: "1px solid #DCE7F4",
                boxShadow: "0 18px 46px rgba(37,65,120,.09),inset 0 1px 0 rgba(255,255,255,.90)",
              }}
            >
              {/* 3px top edge */}
              <div style={{ height: 3, background: "linear-gradient(90deg,#22D3EE,#2563EB 38%,#7C3AED 70%,#F59E0B 100%)" }} />

              {/* 4 cells */}
              <div className="grid grid-cols-2 min-[900px]:grid-cols-4">
                {CONCEPTS.map((cell, i) => (
                  <div
                    key={cell.label}
                    className={`px-4 py-[18px] min-[900px]:px-[22px] min-[900px]:py-6 ${cellBorderClass(i)}`}
                  >
                    {/* Icon */}
                    <div
                      aria-hidden="true"
                      className="w-8 h-8 min-[900px]:w-[34px] min-[900px]:h-[34px] rounded-[9px] flex items-center justify-center mb-3"
                      style={{ color: cell.iconFg, background: cell.iconBg }}
                    >
                      <cell.Icon size={16} />
                    </div>
                    {/* Label */}
                    <p
                      className="text-[11px] font-[700] uppercase tracking-[.09em] mb-[6px]"
                      style={{ fontFamily: SANS, color: cell.iconFg }}
                    >
                      {cell.label}
                    </p>
                    {/* Primary */}
                    <p
                      className="text-[15.5px] min-[900px]:text-[17px] font-[600] leading-[1.25] mb-[6px]"
                      style={{ fontFamily: SANS, color: "#14213D" }}
                    >
                      {cell.primary}
                    </p>
                    {/* Supporting */}
                    <p
                      className={`text-[13px] min-[900px]:text-[14px] leading-[1.45] ${cell.boldSupporting ? "font-[600]" : "font-[450]"}`}
                      style={{ fontFamily: SANS, color: cell.boldSupporting ? "#26334D" : "#5B6B82" }}
                    >
                      {cell.supporting}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </article>

        {/* ── Spacing between Part A and Part B ── */}
        <div className="mt-[38px] min-[900px]:mt-[42px]" />

        {/* ── PART B: Situation Router ── */}
        <nav aria-labelledby="khata-situation-heading">
          {/* Eyebrow */}
          <p
            className="text-[11.5px] min-[900px]:text-[12.5px] font-[700] uppercase tracking-[.11em]"
            style={{ fontFamily: SANS, color: "#4F46E5" }}
          >
            START WITH WHAT HAPPENED
          </p>

          {/* H2 — this is the anchor for Band 1's primary CTA */}
          <h2
            id="khata-situation-heading"
            className="mt-[10px] max-w-[780px]"
            style={{
              fontFamily: SERIF,
              fontWeight: 400,
              color: "#0B1733",
              fontSize: "clamp(32px,9vw,38px)",
              lineHeight: 1.05,
              scrollMarginTop: "72px",
            }}
          >
            <span className="min-[900px]:hidden">What's happening with your property record?</span>
            <span
              className="hidden min-[900px]:inline"
              style={{ fontSize: "clamp(40px,3.5vw,52px)", lineHeight: 1.04, letterSpacing: "-0.018em" }}
            >
              What's happening with your property record?
            </span>
          </h2>

          {/* Supporting */}
          <p
            className="mt-[10px] text-[15px] min-[900px]:text-[16.5px] font-[500]"
            style={{ fontFamily: SANS, color: "#596A82" }}
          >
            You don't need to know what the process is called.
          </p>

          {/* Outer router frame */}
          <div
            className="mt-5 min-[900px]:mt-6 rounded-[16px] min-[900px]:rounded-[20px] overflow-hidden border border-[#DCE6F2]"
            style={{ background: "rgba(255,255,255,.88)", boxShadow: "0 16px 42px rgba(33,56,96,.07)" }}
          >
            {/* Routes 1–4: 2×2 on desktop, stacked on mobile */}
            <div className="grid grid-cols-1 min-[800px]:grid-cols-2">
              {mainRoutes.map((route, i) => (
                <a
                  key={route.key}
                  href={route.href}
                  className={`khata-route relative flex items-center min-h-[68px] px-4 py-4 min-[900px]:px-5 min-[900px]:py-[22px] ${routeBorderClass(i)}`}
                  aria-current={selected === route.key ? "location" : undefined}
                  onClick={() => onSelect(route.key)}
                  style={{ "--khata-route-accent": route.accentIcon } as CSSProperties}
                >
                  {/* Semantic wash — behind everything */}
                  <div
                    aria-hidden="true"
                    className="khata-route-wash absolute inset-0 z-0 pointer-events-none opacity-0"
                    style={{ background: route.wash }}
                  />
                  {/* Accent rail */}
                  <div
                    aria-hidden="true"
                    className="absolute left-0 inset-y-0 z-10 w-[3px]"
                    style={{ background: route.accentRail }}
                  />
                  {/* Content */}
                  <div className="relative z-10 flex items-center gap-3 flex-1 min-w-0 pl-3">
                    {/* Icon */}
                    <div
                      aria-hidden="true"
                      className="shrink-0 w-8 h-8 min-[900px]:w-[34px] min-[900px]:h-[34px] rounded-[9px] flex items-center justify-center"
                      style={{ color: route.accentIcon, background: route.iconBg }}
                    >
                      <route.Icon size={16} />
                    </div>
                    {/* Text */}
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-[14.5px] min-[900px]:text-[16.5px] font-[600] leading-[1.3]"
                        style={{ fontFamily: SANS, color: "#14213D" }}
                      >
                        {route.title}
                      </p>
                      {route.clarification && (
                        <p
                          className="mt-[4px] text-[12px] font-[600] leading-[1.35]"
                          style={{ fontFamily: SANS, color: "#0E7490" }}
                        >
                          {route.clarification}
                        </p>
                      )}
                      <p
                        className="mt-[5px] text-[10px] font-[650] uppercase tracking-[.065em]"
                        style={{ fontFamily: SANS, color: "#65758C" }}
                      >
                        {route.taxonomy}
                      </p>
                    </div>
                  </div>
                  {/* Arrow */}
                  <ChevronRight
                    size={17}
                    className="khata-route-arrow relative z-10 ml-2 shrink-0 text-[#8291A7]"
                  />
                </a>
              ))}
            </div>

            {/* Route 5 — full width */}
            <a
              key={otherRoute.key}
              href={otherRoute.href}
              className="khata-route relative flex items-center min-h-[68px] px-4 py-4 min-[900px]:px-5 min-[900px]:py-[22px] border-t border-[#DCE6F2]"
              aria-current={selected === otherRoute.key ? "location" : undefined}
              onClick={() => onSelect(otherRoute.key)}
              style={{ "--khata-route-accent": otherRoute.accentIcon } as CSSProperties}
            >
              <div
                aria-hidden="true"
                className="khata-route-wash absolute inset-0 z-0 pointer-events-none opacity-0"
                style={{ background: otherRoute.wash }}
              />
              <div
                aria-hidden="true"
                className="absolute left-0 inset-y-0 z-10 w-[3px]"
                style={{ background: otherRoute.accentRail }}
              />
              <div className="relative z-10 flex items-center gap-3 flex-1 min-w-0 pl-3">
                <div
                  aria-hidden="true"
                  className="shrink-0 w-8 h-8 min-[900px]:w-[34px] min-[900px]:h-[34px] rounded-[9px] flex items-center justify-center"
                  style={{ color: otherRoute.accentIcon, background: otherRoute.iconBg }}
                >
                  <otherRoute.Icon size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className="text-[14.5px] min-[900px]:text-[16.5px] font-[600] leading-[1.3]"
                    style={{ fontFamily: SANS, color: "#14213D" }}
                  >
                    {otherRoute.title}
                  </p>
                  {otherRoute.examples && (
                    <p
                      className="mt-[4px] text-[12px] font-[500] leading-[1.35]"
                      style={{ fontFamily: SANS, color: "#66768B" }}
                    >
                      {otherRoute.examples}
                    </p>
                  )}
                  <p
                    className="mt-[5px] text-[10px] font-[650] uppercase tracking-[.065em]"
                    style={{ fontFamily: SANS, color: "#65758C" }}
                  >
                    {otherRoute.taxonomy}
                  </p>
                </div>
              </div>
              <ChevronRight
                size={17}
                className="khata-route-arrow relative z-10 ml-2 shrink-0 text-[#8291A7]"
              />
            </a>
          </div>

          {/* Accessible selection announcement */}
          <p aria-live="polite" className="sr-only">
            {selected ? `Selected: ${SITUATION_LABELS[selected]}.` : ""}
          </p>
        </nav>
      </div>
    </section>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function KhataTransferBangalore() {
  const [situation, setSituation] = useState<KhataSituation | null>(null);
  const [situationRequest, setSituationRequest] = useState(0);

  const handleSituationSelect = (next: KhataSituation) => {
    setSituation(next);
    setSituationRequest((n) => n + 1);
  };

  return (
    <Layout>
      <KhataHeroSection />
      <KhataUnderstandRouteSection selected={situation} onSelect={handleSituationSelect} />
      <KhataPathCaseDeskSection
        selected={situation}
        requestId={situationRequest}
      />
      <KhataResolveWithReeveSection />
      <KhataEnquirySection />
    </Layout>
  );
}
