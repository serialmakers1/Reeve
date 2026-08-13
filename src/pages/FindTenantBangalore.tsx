import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";
import PropertyEnquiryForm from "@/components/property-services/PropertyEnquiryForm";

const SERIF = "'Instrument Serif', Georgia, serif";
const SANS  = "'DM Sans', system-ui, sans-serif";

// ── Section 1: Hero ───────────────────────────────────────────────────────────

function LetHero() {
  function handleEnquiryClick(e: React.MouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    const target = document.getElementById("enquiry");
    if (!target) return;
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ behavior: prefersReduced ? "auto" : "smooth" });
  }

  function handleLetJourneyClick(e: React.MouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    const target = document.getElementById("let-journey");
    if (!target) return;
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ behavior: prefersReduced ? "auto" : "smooth" });
  }

  return (
    <section
      id="hero"
      aria-labelledby="let-hero-h1"
      className="pt-9 pb-8 sm:pt-12 sm:pb-12 lg:py-20"
      style={{
        background: `
          radial-gradient(circle at 82% 18%, rgba(244,111,82,.07) 0%, rgba(244,111,82,.025) 26%, transparent 46%),
          radial-gradient(circle at 72% 88%, rgba(0,87,242,.035) 0%, transparent 34%),
          linear-gradient(180deg, #FBFAF7 0%, #FFF9F6 55%, #FBFAF7 100%)
        `,
        overflowX: "clip",
      }}
    >
      <div className="mx-auto max-w-[1240px] px-5 sm:px-8 lg:px-10">
        <div className="lg:grid lg:grid-cols-[46fr_54fr] lg:items-center lg:gap-8 xl:gap-12">

          {/* Left: copy column */}
          <div className="flex min-w-0 flex-col">

            {/* Eyebrow */}
            <p
              className="text-[11px] sm:text-[12px] font-[700] uppercase tracking-[0.10em]"
              style={{ fontFamily: SANS, color: "#B94735" }}
            >
              REEVE LET · BANGALORE
            </p>

            {/* H1 */}
            <h1
              id="let-hero-h1"
              className="mt-3 max-w-[570px] text-[38px] font-normal leading-[1.04] tracking-[-0.02em] text-[#0B1526] sm:text-[44px] lg:text-[clamp(48px,4.5vw,64px)]"
              style={{ fontFamily: SERIF }}
            >
              Find a Tenant for Your Bangalore Property
            </h1>

            {/* Supporting copy */}
            <p
              className="mt-5 max-w-[520px] text-[15.5px] lg:text-[17px] font-[500] leading-[1.55] text-[#536176]"
              style={{ fontFamily: SANS }}
            >
              Professional listing, Reeve-conducted viewings, negotiation, agreement and documented handover &#8212; whether you&#8217;re in Bangalore or abroad.
            </p>

            {/* Commercial proposition */}
            <p
              className="mt-[22px] text-[23px] sm:text-[26px] lg:text-[28px] font-[700] leading-[1.18]"
              style={{ fontFamily: SANS }}
            >
              <span style={{ color: "#F46F52" }}>Fixed</span>
              <span className="text-[#0B1526]">
                {" "}&#8377;20,000 placement fee &#8212; not linked to your property&#8217;s rent.
              </span>
            </p>

            {/* Payment line */}
            <p
              className="mt-[7px] text-[14px] lg:text-[15px] font-[600]"
              style={{ fontFamily: SANS, color: "#4E5D70" }}
            >
              <span style={{ color: "#F46F52" }}>&#8377;5,000</span>
              {" to start · "}
              <span style={{ color: "#F46F52" }}>&#8377;15,000</span>
              {" when the tenant gets placed"}
            </p>

            {/* CTA row */}
            <div className="mt-[26px] flex flex-col sm:flex-row sm:items-center gap-3">
              <a
                href="#enquiry"
                onClick={handleEnquiryClick}
                className="inline-flex w-full sm:w-auto items-center justify-center rounded-[13px] bg-[#0057F2] px-6 text-[15px] font-[700] text-white shadow-[0_4px_14px_rgba(0,87,242,0.25)] transition-all duration-[160ms] hover:-translate-y-px hover:bg-[#0047D0] hover:shadow-[0_6px_20px_rgba(0,87,242,0.35)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0057F2]"
                style={{ fontFamily: SANS, height: 52 }}
              >
                Tell us about your property &#8594;
              </a>
              <a
                href="#let-journey"
                onClick={handleLetJourneyClick}
                className="group flex items-center justify-center sm:justify-start min-h-[44px] text-[14px] font-[650] text-[#0B1526] transition-colors duration-[130ms] hover:text-[#0057F2] rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0057F2]"
                style={{ fontFamily: SANS }}
              >
                See how Reeve Let works
                <span className="ml-[3px] transition-transform duration-150 group-hover:translate-y-[3px]" aria-hidden="true">&#8595;</span>
              </a>
            </div>

            {/* Trust line */}
            <div className="mt-[17px] flex items-center gap-[9px]">
              <svg width="28" height="14" viewBox="0 0 28 14" fill="none" aria-hidden="true" className="flex-shrink-0">
                <circle cx="4" cy="7" r="3" stroke="#0057F2" strokeWidth="1.5"/>
                <line x1="7" y1="7" x2="21" y2="7" stroke="#0057F2" strokeWidth="1.5"/>
                <circle cx="24" cy="7" r="3" stroke="#0057F2" strokeWidth="1.5"/>
              </svg>
              <span
                className="text-[13px] lg:text-[13.5px] font-[500] text-[#536176]"
                style={{ fontFamily: SANS }}
              >
                Rent and security deposit move directly between tenant and owner. Reeve never holds either.
              </span>
            </div>

          </div>

          {/* Right: artwork */}
          <div className="mt-8 lg:mt-0 min-w-0">
            <div className="let-hero-art flex items-center justify-center lg:justify-end">
              <img
                src="/images/tenant_1.webp"
                alt=""
                role="presentation"
                width={1536}
                height={1024}
                className="h-auto w-full max-w-[330px] object-contain sm:max-w-[420px] lg:max-w-none lg:w-[104%] xl:w-[116%]"
                loading="eager"
                fetchPriority="high"
                decoding="async"
              />
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

// ── Section 2: The Reeve Let Journey ─────────────────────────────────────────

type StageId = "prep" | "list" | "show" | "agree" | "place";

const STAGES: { id: StageId; number: string; label: string; description: string; image: string }[] = [
  { id: "prep",  number: "01", label: "PREP",  description: "Professional property photography and video walkthrough.", image: "/images/let_prep.webp" },
  { id: "list",  number: "02", label: "LIST",  description: "Your property goes live with the commercial terms clearly structured.", image: "/images/let_list.webp" },
  { id: "show",  number: "03", label: "SHOW",  description: "Reeve conducts the viewing. You don't need to be there.", image: "/images/let_show.webp" },
  { id: "agree", number: "04", label: "AGREE", description: "Reeve coordinates the commercial terms and rental agreement.", image: "/images/let_agree.webp" },
  { id: "place", number: "05", label: "PLACE", description: "Placement finishes with a documented property handover.", image: "/images/let_place.webp" },
];

const STAGE_PROGRESS: Record<StageId, number> = { prep: 0, list: 25, show: 50, agree: 75, place: 100 };

function LetJourney() {
  const [activeStage, setActiveStage] = useState<StageId>("show");

  return (
    <section
      id="let-journey"
      aria-labelledby="let-journey-heading"
      className="pt-14 pb-[60px] lg:pt-[84px] lg:pb-[88px] scroll-mt-16"
      style={{
        background: `
          radial-gradient(circle at 9% 30%, rgba(244,111,82,.10) 0%, rgba(244,111,82,.035) 30%, transparent 48%),
          linear-gradient(180deg, #FFF7F3 0%, #FFF3ED 46%, #FBFAF7 100%)
        `,
      }}
    >
      <div className="mx-auto max-w-[1240px] px-5 sm:px-8 lg:px-10">

        {/* Header */}
        <p
          className="text-[11px] sm:text-[12px] font-[700] uppercase tracking-[0.10em]"
          style={{ fontFamily: SANS, color: "#B94735" }}
        >
          FROM LISTING TO PLACEMENT
        </p>
        <h2
          id="let-journey-heading"
          className="mt-3 max-w-[700px] text-[30px] font-normal leading-[1.06] tracking-[-0.015em] text-[#0B1526] lg:text-[clamp(36px,3vw,42px)]"
          style={{ fontFamily: SERIF }}
        >
          One Reeve contact. From listing to placement.
        </h2>
        <p
          className="mt-[14px] max-w-[720px] text-[15px] lg:text-[16.5px] font-[500] leading-[1.55] text-[#596677]"
          style={{ fontFamily: SANS }}
        >
          You don&#8217;t need to photograph the property, coordinate enquiries or attend the viewings yourself.
        </p>

        {/* Desktop interactive area */}
        <div className="hidden lg:grid lg:grid-cols-[34fr_66fr] lg:gap-[28px] xl:gap-8 lg:items-stretch mt-[34px]">

          {/* LEFT: stage rail */}
          <div className="relative flex flex-col h-full">

            {/* Connector track */}
            <div
              className="absolute z-0"
              style={{ left: 26, top: "10%", bottom: "10%", width: 1.5, background: "#E9D8D1" }}
            >
              <div
                className="absolute top-0 left-0 w-full let-journey-connector"
                style={{
                  height: `${STAGE_PROGRESS[activeStage]}%`,
                  background: "rgba(244,111,82,.65)",
                  transition: "height 160ms ease-out",
                }}
              />
            </div>

            {/* Stage rows */}
            {STAGES.map((stage) => {
              const isActive = activeStage === stage.id;
              return (
                <button
                  key={stage.id}
                  type="button"
                  aria-pressed={isActive}
                  className="relative z-10 flex-1 flex items-center gap-3 pl-[10px] pr-[10px] py-2 rounded-[14px] text-left
                    focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0057F2]"
                  style={{
                    background: "transparent",
                    border: "1px solid",
                    borderColor: isActive ? "rgba(244,111,82,.14)" : "transparent",
                    transition: "border-color 160ms ease-out",
                  }}
                  onPointerEnter={(e) => { if (e.pointerType === "mouse") setActiveStage(stage.id); }}
                  onFocus={() => setActiveStage(stage.id)}
                  onClick={() => setActiveStage(stage.id)}
                >
                  {/* Gradient overlay — z-0 keeps it behind all foreground content */}
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 z-0 rounded-[14px] pointer-events-none let-journey-row-bg"
                    style={{
                      background: "linear-gradient(90deg, rgba(244,111,82,.10) 0%, rgba(244,111,82,.035) 100%)",
                      opacity: isActive ? 1 : 0,
                      transition: "opacity 160ms ease-out",
                    }}
                  />

                  {/* Number node */}
                  <span
                    className="relative z-10 w-[34px] h-[34px] shrink-0 rounded-full flex items-center justify-center let-journey-node"
                    style={{
                      background: isActive ? "#F46F52" : "#FFFDFC",
                      border: "1px solid",
                      borderColor: isActive ? "transparent" : "#E9D5CD",
                      boxShadow: isActive ? "0 5px 14px rgba(185,71,53,.18)" : "none",
                      transition: "background-color 160ms ease-out, border-color 160ms ease-out, box-shadow 160ms ease-out",
                    }}
                  >
                    <span
                      className="text-[11px] font-[700] let-journey-text transition-colors duration-[160ms]"
                      style={{ fontFamily: SANS, color: isActive ? "white" : "#866D65" }}
                    >
                      {stage.number}
                    </span>
                  </span>

                  {/* Label + description */}
                  <span className="relative z-10 flex-1 min-w-0">
                    <span
                      className="block text-[14px] font-[700] uppercase leading-none let-journey-text transition-colors duration-[160ms]"
                      style={{ fontFamily: SANS, color: isActive ? "#B94735" : "#667181" }}
                    >
                      {stage.label}
                    </span>
                    <span
                      className="block mt-[5px] text-[13px] font-[500] leading-[1.4] let-journey-text transition-colors duration-[160ms]"
                      style={{ fontFamily: SANS, color: isActive ? "#526072" : "#788391" }}
                    >
                      {stage.description}
                    </span>
                  </span>

                  {/* Chevron — always rendered, transitions in/out */}
                  <span
                    className="relative z-10 flex-shrink-0 ml-1 let-journey-row-bg"
                    aria-hidden="true"
                    style={{
                      color: "rgba(244,111,82,.5)",
                      opacity: isActive ? 1 : 0,
                      transform: isActive ? "translateX(0)" : "translateX(-3px)",
                      transition: "opacity 160ms ease-out, transform 160ms ease-out",
                    }}
                  >
                    <svg width="7" height="12" viewBox="0 0 7 12" fill="none">
                      <path d="M1 1L6 6L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>

                </button>
              );
            })}
          </div>

          {/* RIGHT: image area */}
          <div>
            <div className="relative w-full aspect-[3/2] max-w-[740px] lg:ml-auto">
              {STAGES.map((stage) => (
                <img
                  key={stage.id}
                  src={stage.image}
                  alt=""
                  role="presentation"
                  width={1536}
                  height={1024}
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 h-full w-full object-contain let-journey-img"
                  style={{
                    opacity: activeStage === stage.id ? 1 : 0,
                    transform: activeStage === stage.id ? "translateY(0) scale(1)" : "translateY(4px) scale(.997)",
                    zIndex: activeStage === stage.id ? 1 : 0,
                    pointerEvents: "none",
                    transition: "opacity 180ms ease-out, transform 180ms ease-out",
                  }}
                />
              ))}
            </div>
          </div>

        </div>

        {/* Mobile layout */}
        <div className="lg:hidden mt-[24px]">

          {/* Segmented selector */}
          <div
            role="group"
            aria-label="Journey stages"
            className="grid grid-cols-5 w-full rounded-[14px] overflow-hidden border border-[#EADAD3]"
            style={{ background: "#FFFDFC" }}
          >
            {STAGES.map((stage, idx) => (
              <button
                key={stage.id}
                type="button"
                aria-pressed={activeStage === stage.id}
                onClick={() => setActiveStage(stage.id)}
                onFocus={() => setActiveStage(stage.id)}
                className="min-h-[44px] text-[10.5px] font-[700] uppercase tracking-[0.02em]
                  transition-colors duration-150 motion-reduce:transition-none
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0057F2]"
                style={{
                  fontFamily: SANS,
                  background: activeStage === stage.id ? "#F46F52" : "transparent",
                  color: activeStage === stage.id ? "white" : "#667181",
                  borderRight: idx < STAGES.length - 1 ? "1px solid #EADAD3" : "none",
                }}
              >
                {stage.label}
              </button>
            ))}
          </div>

          {/* Mobile 3:2 image stack */}
          <div className="relative w-full aspect-[3/2] mt-[15px]">
            {STAGES.map((stage) => (
              <img
                key={stage.id}
                src={stage.image}
                alt=""
                role="presentation"
                width={1536}
                height={1024}
                loading="lazy"
                decoding="async"
                className="absolute inset-0 h-full w-full object-contain let-journey-img"
                style={{
                  opacity: activeStage === stage.id ? 1 : 0,
                  transform: activeStage === stage.id ? "translateY(0) scale(1)" : "translateY(4px) scale(.997)",
                  zIndex: activeStage === stage.id ? 1 : 0,
                  pointerEvents: "none",
                  transition: "opacity 180ms ease-out, transform 180ms ease-out",
                }}
              />
            ))}
          </div>

          {/* Active stage copy */}
          <div className="mt-[14px]">
            <p
              className="text-[11px] font-[700] uppercase tracking-[0.08em]"
              style={{ fontFamily: SANS, color: "#B94735" }}
            >
              {STAGES.find(s => s.id === activeStage)?.label}
            </p>
            <p
              className="mt-[5px] text-[15px] font-[600] leading-[1.45] text-[#172235]"
              style={{ fontFamily: SANS }}
            >
              {STAGES.find(s => s.id === activeStage)?.description}
            </p>
          </div>

        </div>

      </div>
    </section>
  );
}

// ── Section 3: Pricing & Money Flow ──────────────────────────────────────────

function LetPricing() {
  const sectionRef = useRef<HTMLElement>(null);
  const [pricingRevealed, setPricingRevealed] = useState(false);

  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) { setPricingRevealed(true); return; }
    const section = sectionRef.current;
    if (!section) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setPricingRevealed(true); obs.disconnect(); }
    }, { threshold: 0.18 });
    obs.observe(section);
    return () => obs.disconnect();
  }, []);

  const lineReveal = pricingRevealed
    ? "transform 480ms cubic-bezier(.22,.8,.3,1)"
    : "none";
  const coralGrad = "linear-gradient(180deg,#F46F52 0%,#FF8E73 55%,#F46F52 100%)";

  return (
    <section
      ref={sectionRef}
      id="pricing"
      aria-labelledby="pricing-heading"
      className="pt-14 pb-[60px] lg:pt-[88px] lg:pb-[92px] scroll-mt-16 overflow-x-clip"
      style={{
        background: `
          radial-gradient(circle at 22% 24%, rgba(244,111,82,.14) 0%, rgba(244,111,82,.045) 30%, transparent 52%),
          radial-gradient(circle at 86% 78%, rgba(0,87,242,.09) 0%, transparent 38%),
          linear-gradient(135deg, #071426 0%, #081A30 56%, #091D35 100%)
        `,
      }}
    >
      <div className="mx-auto max-w-[1240px] px-5 sm:px-8 lg:px-10">

        {/* Header */}
        <p
          className="text-[11px] sm:text-[12px] font-[700] uppercase tracking-[0.10em] lg:text-center"
          style={{ fontFamily: SANS, color: "#FF9A83" }}
        >
          ONE-TIME PRICING
        </p>
        <h2
          id="pricing-heading"
          className="mt-3 text-[30px] font-normal leading-[1.05] tracking-[-0.015em] text-[#FFF9F6] lg:text-center lg:text-[clamp(38px,3.2vw,44px)] mx-auto max-w-[820px]"
          style={{ fontFamily: SERIF }}
        >
          ₹20,000 once. Most of it after the tenant gets placed.
        </h2>

        {/* ── Desktop: Horizontal pricing path ── */}
        <div className="hidden lg:block mt-[42px]">
          <div className="relative mx-auto max-w-[1100px]">

            {/* Faint base line */}
            <div
              className="absolute z-0 h-[2px]"
              style={{ left: 80, right: 80, top: 66, background: "rgba(244,111,82,.28)" }}
            />

            {/* Animated coral progress line */}
            <div
              className="absolute let-pricing-line z-0 h-[2px]"
              style={{
                left: 80,
                right: 80,
                top: 66,
                background: "linear-gradient(90deg,#F46F52 0%,#FF8E73 55%,#F46F52 100%)",
                transformOrigin: "left center",
                transform: `scaleX(${pricingRevealed ? 1 : 0})`,
                transition: lineReveal,
              }}
            />

            {/* Content grid: amounts hang below the line */}
            <div className="grid grid-cols-[1fr_auto_1fr] items-start relative">

              {/* LEFT: TO START / ₹5,000 */}
              <div
                className="flex flex-col items-start text-left pl-[80px] pr-8 let-pricing-anchor z-20 pt-[94px]"
                style={{
                  opacity: pricingRevealed ? 1 : 0.92,
                  transform: pricingRevealed ? "translateY(0)" : "translateY(4px)",
                  transition: pricingRevealed
                    ? "opacity 250ms 40ms ease-out, transform 250ms 40ms ease-out"
                    : "none",
                }}
              >
                <p
                  className="text-[11px] font-[700] uppercase tracking-[0.08em]"
                  style={{ fontFamily: SANS, color: "#FF9A83" }}
                >
                  TO START
                </p>
                <p
                  className="mt-1 font-[700] leading-none tracking-[-0.025em]"
                  style={{
                    fontFamily: SANS,
                    color: "#FFF9F6",
                    fontVariantNumeric: "tabular-nums",
                    fontSize: "clamp(48px, 4vw, 52px)",
                  }}
                >
                  ₹5,000
                </p>
                <p
                  className="mt-[10px] text-[13.5px] font-[500] leading-[1.45] max-w-[280px]"
                  style={{ fontFamily: SANS, color: "#C9D4E2" }}
                >
                  Photography, listing and placement work begins.
                </p>
                <div className="mt-[12px] flex items-start gap-[8px] max-w-[340px]">
                  <svg
                    aria-hidden="true"
                    width="18"
                    height="18"
                    viewBox="0 0 18 18"
                    fill="none"
                    className="flex-shrink-0 mt-[1px]"
                  >
                    <circle cx="9" cy="9" r="8" stroke="#F46F52" strokeWidth="1.5" />
                    <path d="M9 8v4" stroke="#F46F52" strokeWidth="1.5" strokeLinecap="round" />
                    <circle cx="9" cy="6" r="0.75" fill="#F46F52" />
                  </svg>
                  <p
                    className="text-[12px] font-[500] leading-[1.45]"
                    style={{ fontFamily: SANS, color: "#9EADBF" }}
                  >
                    The ₹5,000 becomes non-refundable once the photography and listing have been delivered.
                  </p>
                </div>
              </div>

              {/* CENTER: Placement marker — pt-[34px] centres 64px circle at line level 66px */}
              <div className="flex flex-col items-center pt-[34px] z-20">
                <div
                  className="relative let-pricing-marker flex items-center justify-center"
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: "50%",
                    background: "#0D2441",
                    border: "1px solid rgba(255,255,255,.12)",
                    boxShadow: "0 0 0 8px rgba(244,111,82,.12), 0 14px 30px rgba(0,0,0,.28)",
                    opacity: pricingRevealed ? 1 : 0,
                    transform: pricingRevealed ? "scale(1)" : "scale(0.97)",
                    transition: pricingRevealed
                      ? "opacity 220ms 80ms ease-out, transform 220ms 80ms ease-out"
                      : "none",
                  }}
                >
                  <svg
                    aria-hidden="true"
                    width="22"
                    height="22"
                    viewBox="0 0 22 22"
                    fill="none"
                  >
                    <path
                      d="M2 10L11 2L20 10V20H14V14H8V20H2V10Z"
                      stroke="#ffffff"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M8 12L10 14L14 10"
                      stroke="#ffffff"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <div
                    className="absolute"
                    style={{
                      bottom: 0,
                      right: 0,
                      width: 14,
                      height: 14,
                      borderRadius: "50%",
                      background: "#B9F227",
                      border: "2.5px solid #081A30",
                    }}
                  />
                </div>
                <p
                  className="mt-[10px] text-[10.5px] font-[700] uppercase tracking-[0.07em]"
                  style={{ fontFamily: SANS, color: "#B9F227" }}
                >
                  TENANT PLACED
                </p>
              </div>

              {/* RIGHT: WHEN THE TENANT GETS PLACED / ₹15,000 */}
              <div
                className="flex flex-col items-end text-right pl-8 pr-[80px] let-pricing-anchor z-20 pt-[94px]"
                style={{
                  opacity: pricingRevealed ? 1 : 0.92,
                  transform: pricingRevealed ? "translateY(0)" : "translateY(4px)",
                  transition: pricingRevealed
                    ? "opacity 250ms 40ms ease-out, transform 250ms 40ms ease-out"
                    : "none",
                }}
              >
                <p
                  className="text-[11px] font-[700] uppercase tracking-[0.08em]"
                  style={{ fontFamily: SANS, color: "#FF9A83" }}
                >
                  WHEN THE TENANT GETS PLACED
                </p>
                <p
                  className="mt-1 font-[700] leading-none tracking-[-0.025em]"
                  style={{
                    fontFamily: SANS,
                    color: "#FFF9F6",
                    fontVariantNumeric: "tabular-nums",
                    fontSize: "clamp(48px, 4vw, 52px)",
                  }}
                >
                  ₹15,000
                </p>
              </div>

            </div>

            {/* Endpoint dots — centre at top:60 + 6 = 66px (on the line) */}
            <div
              className="absolute z-10 rounded-full"
              style={{
                left: 73,
                top: 60,
                width: 12,
                height: 12,
                background: "#F46F52",
                boxShadow: "0 0 0 6px rgba(244,111,82,.10)",
              }}
            />
            <div
              className="absolute z-10 rounded-full"
              style={{
                right: 73,
                top: 60,
                width: 12,
                height: 12,
                background: "#F46F52",
                boxShadow: "0 0 0 6px rgba(244,111,82,.10)",
              }}
            />

          </div>
        </div>

        {/* ── Mobile: Vertical timeline grid ── */}
        <div className="lg:hidden mt-[30px]">
          <div className="grid grid-cols-[54px_1fr] gap-x-4">

            {/* Row 1, Col 1: Start dot + flex-1 line downward */}
            <div className="flex flex-col items-center pt-[5px] z-10">
              <div
                className="rounded-full flex-shrink-0"
                style={{
                  width: 10,
                  height: 10,
                  background: "#F46F52",
                  boxShadow: "0 0 0 4px rgba(244,111,82,.10)",
                }}
              />
              <div
                className="mt-[2px] flex-1 w-[2px] let-pricing-line"
                style={{
                  background: coralGrad,
                  transformOrigin: "top center",
                  transform: `scaleY(${pricingRevealed ? 1 : 0})`,
                  transition: lineReveal,
                }}
              />
            </div>

            {/* Row 1, Col 2: TO START content */}
            <div className="pb-[28px]">
              <p
                className="text-[11px] font-[700] uppercase tracking-[0.08em]"
                style={{ fontFamily: SANS, color: "#FF9A83" }}
              >
                TO START
              </p>
              <p
                className="mt-1 text-[38px] sm:text-[42px] font-[700] leading-none tracking-[-0.025em]"
                style={{ fontFamily: SANS, color: "#FFF9F6", fontVariantNumeric: "tabular-nums" }}
              >
                ₹5,000
              </p>
              <p
                className="mt-2 text-[13.5px] font-[500] leading-[1.45]"
                style={{ fontFamily: SANS, color: "#C9D4E2" }}
              >
                Photography, listing and placement work begins.
              </p>
              <div className="mt-3 flex items-start gap-2 max-w-[320px]">
                <svg
                  aria-hidden="true"
                  width="16"
                  height="16"
                  viewBox="0 0 18 18"
                  fill="none"
                  className="flex-shrink-0 mt-[1px]"
                >
                  <circle cx="9" cy="9" r="8" stroke="#F46F52" strokeWidth="1.5" />
                  <path d="M9 8v4" stroke="#F46F52" strokeWidth="1.5" strokeLinecap="round" />
                  <circle cx="9" cy="6" r="0.75" fill="#F46F52" />
                </svg>
                <p
                  className="text-[12px] font-[500] leading-[1.45]"
                  style={{ fontFamily: SANS, color: "#9EADBF" }}
                >
                  The ₹5,000 becomes non-refundable once the photography and listing have been delivered.
                </p>
              </div>
            </div>

            {/* Row 2, Col 1: Fixed-height line + 54px marker + fixed-height line */}
            <div className="flex flex-col items-center z-20">
              <div
                className="w-[2px] let-pricing-line"
                style={{
                  height: 12,
                  background: coralGrad,
                  transformOrigin: "top center",
                  transform: `scaleY(${pricingRevealed ? 1 : 0})`,
                  transition: lineReveal,
                }}
              />
              <div
                className="relative let-pricing-marker flex-shrink-0 flex items-center justify-center"
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: "50%",
                  background: "#0D2441",
                  border: "1px solid rgba(255,255,255,.12)",
                  boxShadow: "0 0 0 6px rgba(244,111,82,.12), 0 10px 24px rgba(0,0,0,.28)",
                  opacity: pricingRevealed ? 1 : 0,
                  transform: pricingRevealed ? "scale(1)" : "scale(0.97)",
                  transition: pricingRevealed
                    ? "opacity 220ms 80ms ease-out, transform 220ms 80ms ease-out"
                    : "none",
                }}
              >
                <svg aria-hidden="true" width="20" height="20" viewBox="0 0 22 22" fill="none">
                  <path
                    d="M2 10L11 2L20 10V20H14V14H8V20H2V10Z"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M8 12L10 14L14 10"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <div
                  className="absolute"
                  style={{
                    bottom: 0,
                    right: 0,
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    background: "#B9F227",
                    border: "2px solid #081A30",
                  }}
                />
              </div>
              <div
                className="w-[2px] let-pricing-line"
                style={{
                  height: 12,
                  background: coralGrad,
                  transformOrigin: "top center",
                  transform: `scaleY(${pricingRevealed ? 1 : 0})`,
                  transition: lineReveal,
                }}
              />
            </div>

            {/* Row 2, Col 2: TENANT PLACED label — vertically centred by flex items-center */}
            <div className="flex items-center">
              <p
                className="text-[10.5px] font-[700] uppercase tracking-[0.07em]"
                style={{ fontFamily: SANS, color: "#B9F227" }}
              >
                TENANT PLACED
              </p>
            </div>

            {/* Row 3, Col 1: h-[5px] line ending at dot-centre + end dot */}
            <div className="flex flex-col items-center z-10">
              <div
                className="w-[2px] let-pricing-line"
                style={{
                  height: 5,
                  background: coralGrad,
                  transformOrigin: "top center",
                  transform: `scaleY(${pricingRevealed ? 1 : 0})`,
                  transition: lineReveal,
                }}
              />
              <div
                className="rounded-full flex-shrink-0 relative z-10 -mt-[5px]"
                style={{
                  width: 10,
                  height: 10,
                  background: "#F46F52",
                  boxShadow: "0 0 0 4px rgba(244,111,82,.10)",
                }}
              />
            </div>

            {/* Row 3, Col 2: WHEN THE TENANT GETS PLACED content */}
            <div className="pb-4">
              <p
                className="text-[11px] font-[700] uppercase tracking-[0.08em]"
                style={{ fontFamily: SANS, color: "#FF9A83" }}
              >
                WHEN THE TENANT GETS PLACED
              </p>
              <p
                className="mt-1 text-[38px] sm:text-[42px] font-[700] leading-none tracking-[-0.025em]"
                style={{ fontFamily: SANS, color: "#FFF9F6", fontVariantNumeric: "tabular-nums" }}
              >
                ₹15,000
              </p>
            </div>

          </div>
        </div>

        {/* ── Separator ── */}
        <div
          className="mt-[42px] lg:mt-[46px]"
          style={{ borderTop: "1px solid rgba(255,255,255,.09)" }}
        />

        {/* ── Money flow diagram ── */}
        <div className="mt-[30px] lg:mt-[32px] max-w-[520px] mx-auto lg:max-w-[860px]">

          {/* Top row: TENANT ⇄ OWNER */}
          <div className="flex items-center">

            {/* TENANT node */}
            <div
              className="w-[92px] min-[390px]:w-[104px] lg:w-[140px] shrink-0 rounded-[12px] flex items-center justify-center"
              style={{
                height: 52,
                background: "rgba(255,255,255,.045)",
                border: "1px solid rgba(255,255,255,.11)",
                boxShadow: "0 8px 22px rgba(0,0,0,.14)",
              }}
            >
              <span className="text-[13px] font-[700]" style={{ fontFamily: SANS, color: "#F5F8FC" }}>
                TENANT
              </span>
            </div>

            {/* Blue connector */}
            <div className="flex-1 min-w-0 relative" style={{ height: 52 }}>
              <div
                className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[1.5px]"
                style={{ background: "rgba(80,145,255,.68)" }}
              />
              <svg
                aria-hidden="true"
                className="absolute left-[3px] top-1/2 -translate-y-1/2"
                width="6"
                height="10"
                viewBox="0 0 6 10"
                fill="none"
              >
                <path d="M5 1L1 5L5 9" stroke="rgba(80,145,255,.68)" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <svg
                aria-hidden="true"
                className="absolute right-[3px] top-1/2 -translate-y-1/2"
                width="6"
                height="10"
                viewBox="0 0 6 10"
                fill="none"
              >
                <path d="M1 1L5 5L1 9" stroke="rgba(80,145,255,.68)" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              {/* Label above the line */}
              <div
                className="absolute left-0 right-0 text-center"
                style={{ bottom: "calc(50% + 6px)" }}
              >
                <span className="text-[12px] font-[500]" style={{ fontFamily: SANS, color: "#BDD0EC" }}>
                  rent · security deposit
                </span>
              </div>
            </div>

            {/* OWNER node */}
            <div
              className="w-[92px] min-[390px]:w-[104px] lg:w-[140px] shrink-0 rounded-[12px] flex items-center justify-center"
              style={{
                height: 52,
                background: "rgba(255,255,255,.045)",
                border: "1px solid rgba(255,255,255,.11)",
                boxShadow: "0 8px 22px rgba(0,0,0,.14)",
              }}
            >
              <span className="text-[13px] font-[700]" style={{ fontFamily: SANS, color: "#F5F8FC" }}>
                OWNER
              </span>
            </div>

          </div>

          {/* SR-only summary */}
          <p className="sr-only">
            Tenant pays rent and security deposit directly to the owner. The owner pays the Reeve Let service fee to Reeve.
          </p>

          {/* OWNER → REEVE connector + REEVE node */}
          <div className="flex justify-end">
            <div
              className="flex flex-col items-center relative w-[92px] min-[390px]:w-[104px] lg:w-[140px]"
            >
              {/* Connector block: continuous coral line + arrowhead at bottom + fee label beside */}
              <div className="relative flex flex-col items-center" style={{ height: 56 }}>
                {/* Coral vertical line — full connector height */}
                <div
                  className="absolute left-1/2 -translate-x-1/2 top-0"
                  style={{ width: 1.5, height: "100%", background: "rgba(244,111,82,.72)" }}
                />
                {/* Downward arrowhead — at bottom, pointing directly into REEVE */}
                <svg
                  aria-hidden="true"
                  className="absolute bottom-0 left-1/2 -translate-x-1/2"
                  width="10"
                  height="6"
                  viewBox="0 0 10 6"
                  fill="none"
                >
                  <path
                    d="M1 1L5 5L9 1"
                    stroke="rgba(244,111,82,.72)"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
                {/* Service fee label — to the LEFT of the line, never between arrowhead and REEVE */}
                <span
                  className="absolute top-[14px] text-[11.5px] font-[500] leading-[1.35] whitespace-nowrap"
                  style={{
                    fontFamily: SANS,
                    color: "#F6A08C",
                    right: "calc(50% + 10px)",
                    left: "auto",
                    textAlign: "right",
                  }}
                >
                  Reeve Let service fee
                </span>
              </div>

              {/* REEVE node */}
              <div
                className="rounded-[12px] w-full flex items-center justify-center"
                style={{
                  height: 52,
                  background: "rgba(0,87,242,.11)",
                  border: "1px solid rgba(78,139,255,.32)",
                  boxShadow: "0 8px 22px rgba(0,0,0,.14)",
                }}
              >
                <span className="text-[13px] font-[700]" style={{ fontFamily: SANS, color: "#F5F8FC" }}>
                  REEVE
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* ── Tenant fee disclosure ── */}
        <div className="mt-[30px] lg:mt-[32px] lg:flex lg:items-start lg:gap-[48px]">
          <div className="flex-shrink-0">
            <div style={{ width: 28, height: 2, background: "#F46F52", marginBottom: 12 }} />
            <h3
              className="text-[16px] lg:text-[17px] font-[700] text-[#FFF9F6]"
              style={{ fontFamily: SANS }}
            >
              No surprise tenant fees.
            </h3>
          </div>
          <div className="mt-[8px] lg:mt-0">
            <p
              className="text-[13.5px] lg:text-[14px] font-[500] leading-[1.55] max-w-[620px]"
              style={{ fontFamily: SANS, color: "#B9C6D6" }}
            >
              If the owner expects the tenant to pay any amount, that amount appears on the listing before the tenant requests contact. No fee is introduced later.
            </p>
          </div>
        </div>

        {/* ── Included signal ── */}
        <div className="mt-[22px] lg:mt-[24px] flex items-start gap-[8px]">
          <svg
            aria-hidden="true"
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            className="flex-shrink-0 mt-[1px]"
          >
            <circle cx="8" cy="8" r="7" stroke="#B9F227" strokeWidth="1.5" />
            <path
              d="M5.5 8.5L7 10L10.5 6"
              stroke="#B9F227"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span
            className="text-[13.5px] lg:text-[14px] font-[600] leading-[1.45]"
            style={{ fontFamily: SANS, color: "#E8F1DB" }}
          >
            Rental agreement + e-stamping included in the Reeve Let fee
          </span>
        </div>

      </div>
    </section>
  );
}

// ── Section 4: Practical Questions ──

function LetQuestionsContent() {
  const chevron = (
    <svg
      width="17"
      height="17"
      viewBox="0 0 16 16"
      fill="none"
      className="flex-shrink-0 transition-transform duration-[150ms] group-open:rotate-180 text-[#69758B] group-open:text-[#F46F52]"
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
    <div>
      <h2
        id="faq-heading"
        className="text-center text-[30px] font-normal leading-[1.06] tracking-[-0.015em] text-[#0B1526] lg:text-[clamp(38px,3vw,42px)]"
        style={{ fontFamily: SERIF }}
      >
        A few practical questions
      </h2>

      <div className="mt-6 lg:mt-8">

        {/* FAQ 1 */}
        <div className="border-t border-[#DADCF0]">
          <details className="group">
            <summary
              className="list-none [&::-webkit-details-marker]:hidden flex items-center justify-between gap-4 min-h-[60px] lg:min-h-[68px] py-[17px] lg:py-5 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 rounded-sm"
              style={{ outlineColor: "#8FB7FF" }}
            >
              <span
                className="min-w-0 text-[15px] lg:text-[16.5px] font-[650] leading-[1.35] text-[#172235] group-open:text-[#B94735]"
                style={{ fontFamily: SANS }}
              >
                Do I need to be in Bangalore for the viewings?
              </span>
              {chevron}
            </summary>
            <div className="pb-[18px] lg:pb-5 pr-[34px] lg:pr-11 max-w-[720px]">
              <p
                className="text-[14px] lg:text-[15px] font-[500] leading-[1.55] lg:leading-[1.6] text-[#536074]"
                style={{ fontFamily: SANS }}
              >
                No. Reeve schedules and conducts the viewings, so you do not need to attend. Reeve Let can work for owners in Bangalore, elsewhere in India or overseas.
              </p>
            </div>
          </details>
        </div>

        {/* FAQ 2 */}
        <div className="border-t border-[#DADCF0]">
          <details className="group">
            <summary
              className="list-none [&::-webkit-details-marker]:hidden flex items-center justify-between gap-4 min-h-[60px] lg:min-h-[68px] py-[17px] lg:py-5 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 rounded-sm"
              style={{ outlineColor: "#8FB7FF" }}
            >
              <span
                className="min-w-0 text-[15px] lg:text-[16.5px] font-[650] leading-[1.35] text-[#172235] group-open:text-[#B94735]"
                style={{ fontFamily: SANS }}
              >
                Do you handle cleaning or repairs before the property is listed?
              </span>
              {chevron}
            </summary>
            <div className="pb-[18px] lg:pb-5 pr-[34px] lg:pr-11 max-w-[720px]">
              <p
                className="text-[14px] lg:text-[15px] font-[500] leading-[1.55] lg:leading-[1.6] text-[#536074]"
                style={{ fontFamily: SANS }}
              >
                No. Reeve Let covers tenant placement. Cleaning, repairs and other property preparation are not included in the service.
              </p>
            </div>
          </details>
        </div>

        {/* FAQ 3 */}
        <div className="border-t border-[#DADCF0]">
          <details className="group">
            <summary
              className="list-none [&::-webkit-details-marker]:hidden flex items-center justify-between gap-4 min-h-[60px] lg:min-h-[68px] py-[17px] lg:py-5 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 rounded-sm"
              style={{ outlineColor: "#8FB7FF" }}
            >
              <span
                className="min-w-0 text-[15px] lg:text-[16.5px] font-[650] leading-[1.35] text-[#172235] group-open:text-[#B94735]"
                style={{ fontFamily: SANS }}
              >
                Do you cover my area in Bangalore?
              </span>
              {chevron}
            </summary>
            <div className="pb-[18px] lg:pb-5 pr-[34px] lg:pr-11 max-w-[720px]">
              <p
                className="text-[14px] lg:text-[15px] font-[500] leading-[1.55] lg:leading-[1.6] text-[#536074]"
                style={{ fontFamily: SANS }}
              >
                Reeve operates across Bangalore. We serve some areas directly and assess others individually &#8212; tell us where your property is and we&#8217;ll confirm within a day.
              </p>
            </div>
          </details>
        </div>

        {/* FAQ 4 */}
        <div className="border-t border-[#DADCF0]">
          <details className="group">
            <summary
              className="list-none [&::-webkit-details-marker]:hidden flex items-center justify-between gap-4 min-h-[60px] lg:min-h-[68px] py-[17px] lg:py-5 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 rounded-sm"
              style={{ outlineColor: "#8FB7FF" }}
            >
              <span
                className="min-w-0 text-[15px] lg:text-[16.5px] font-[650] leading-[1.35] text-[#172235] group-open:text-[#B94735]"
                style={{ fontFamily: SANS }}
              >
                What if I want Reeve to manage the property after the tenant is placed?
              </span>
              {chevron}
            </summary>
            <div className="pb-[18px] lg:pb-5 pr-[34px] lg:pr-11 max-w-[720px]">
              <p
                className="text-[14px] lg:text-[15px] font-[500] leading-[1.55] lg:leading-[1.6] text-[#536074]"
                style={{ fontFamily: SANS }}
              >
                Then Property Management is the better fit. Reeve Managed continues after move-in with tenant communication, property visits, repairs and records.
              </p>
              <Link
                to="/property-management-bangalore"
                className="inline-block mt-[10px] text-[14px] lg:text-[15px] font-[600] text-[#1D4ED8] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 rounded-sm"
                style={{ fontFamily: SANS, outlineColor: "#8FB7FF" }}
              >
                See Property Management &#8594;
              </Link>
            </div>
          </details>
        </div>

        {/* Bottom separator */}
        <div className="border-t border-[#DADCF0]" />

      </div>
    </div>
  );
}

// ── Section 4: FAQ ──

function LetQuestionsSection() {
  return (
    <section
      id="faq"
      aria-labelledby="faq-heading"
      className="bg-[#F4F4FF] scroll-mt-16 pt-16 pb-16 lg:pt-[84px] lg:pb-[84px]"
    >
      <div className="mx-auto max-w-[1240px] px-5 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-[880px]">
          <LetQuestionsContent />
        </div>
      </div>
    </section>
  );
}

// ── Section 5: Enquiry ────────────────────────────────────────────────────────

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
                <PropertyEnquiryForm initialService="find_tenant" />
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

// ── Mobile sticky CTA ─────────────────────────────────────────────────────────

function StickyEnquiryCTA() {
  const [show, setShow] = useState(false);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const heroSection    = document.getElementById("hero");
    const enquirySection = document.getElementById("enquiry");
    if (!heroSection || !enquirySection) return;

    let heroVisible    = true;
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

// ── Page ──────────────────────────────────────────────────────────────────────

export default function FindTenantBangalore() {
  return (
    <Layout>
      <style>{`
        @keyframes letHeroFadeIn {
          from { opacity: .96; transform: translateY(6px) scale(.995); }
          to   { opacity: 1;   transform: translateY(0)   scale(1);    }
        }
        @media (prefers-reduced-motion: no-preference) {
          .let-hero-art { animation: letHeroFadeIn 480ms cubic-bezier(.22,.8,.3,1) both; }
        }
        @media (prefers-reduced-motion: reduce) {
          .let-journey-img       { transition: none !important; }
          .let-journey-connector { transition: none !important; }
          .let-journey-node      { transition: none !important; }
          .let-journey-row-bg    { transition: none !important; }
          .let-journey-text      { transition: none !important; }
          .let-pricing-line      { transition: none !important; transform: none !important; }
          .let-pricing-marker    { transition: none !important; opacity: 1 !important; transform: none !important; }
          .let-pricing-anchor    { transition: none !important; opacity: 1 !important; transform: none !important; }
        }
      `}</style>
      <LetHero />
      <LetJourney />
      <LetPricing />
      <LetQuestionsSection />
      <EnquirySection />
      <StickyEnquiryCTA />
    </Layout>
  );
}
