import React, { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import posthog from "posthog-js";
import Layout from "@/components/Layout";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  KeyRound,
  Home,
  Handshake,
  Camera,
  Key,
  Zap,
  Wrench,
  Sofa,
  AlertTriangle,
  FileText,
  Check,
  Scale,
  FileCheck,
  MessageSquare,
  Award,
  Users,
} from "lucide-react";

// ── Constants ─────────────────────────────────────────────────────────────────

const FONT_SERIF = "'Instrument Serif', Georgia, serif";
const FONT_SANS  = "'DM Sans', system-ui, sans-serif";

const C = {
  white:            "#FFFFFF",
  mutedBg:          "#F8FAFC",
  brokerBg:         "#FEFCE8",
  neutralityBg:     "#334155",
  ctaBg:            "#0F1C2E",
  textPrimary:      "#0F172A",
  textBody:         "#475569",
  textMuted:        "#94A3B8",
  accent:           "#2563EB",
  accentLight:      "rgba(37,99,235,0.10)",
  navy:             "#0F1C2E",
  border:           "#E2E8F0",
  borderDark:       "#CBD5E1",
  tenantBadgeBg:    "#EFF6FF",
  tenantBadgeText:  "#1D4ED8",
  ownerBadgeBg:     "#F0FDF4",
  ownerBadgeText:   "#15803D",
  brokerBadgeBg:    "#FFFBEB",
  brokerBadgeText:  "#B45309",
} as const;

// ── Data ──────────────────────────────────────────────────────────────────────

const DOC_ITEMS = [
  { Icon: Home,          title: "Room-wise condition",     desc: "Walls, flooring, ceiling, doors, windows, electrical, and plumbing — room by room" },
  { Icon: Camera,        title: "Photo & video evidence",  desc: "Captured during the visit and shared via a secure link in the report" },
  { Icon: Key,           title: "Keys and locks",          desc: "Number of keys, lock type, brand, and condition documented at handover" },
  { Icon: Zap,           title: "Utilities and meters",    desc: "Electricity, water, gas — consumer IDs and meter readings where accessible" },
  { Icon: Wrench,        title: "Fixtures and fittings",   desc: "Light fixtures, fans, geysers, exhaust fans — brand, count, and condition" },
  { Icon: Sofa,          title: "Appliances and furniture", desc: "Inventory with brand, model, condition, and ownership; furniture condition notes" },
  { Icon: AlertTriangle, title: "Pre-existing damages",    desc: "Documented with location, type, and severity — recorded as pre-existing" },
  { Icon: FileText,      title: "PDF handover report",     desc: "A structured, branded PDF report generated and shared after the visit" },
];

const PROCESS_STEPS = [
  {
    n: 1,
    title: "Book the audit",
    desc: "Select your BHK type, share the property address, and choose a date. Anyone can pay — tenant, owner, broker, or split between parties.",
  },
  {
    n: 2,
    title: "Reeve visits the property",
    desc: "A Reeve representative walks through the property, documents visible condition room by room, and captures photo and video evidence.",
  },
  {
    n: 3,
    title: "Report is generated",
    desc: "A structured PDF report is created covering room-wise findings, pre-existing damages, key handover details, utility notes, and a secure evidence link.",
  },
  {
    n: 4,
    title: "Everyone has a baseline",
    desc: "The report is shared with the relevant parties. Tenant, owner, and broker all start the tenancy with the same documented record.",
  },
];

const NEUTRALITY_POINTS = [
  { Icon: Scale,         title: "Payer does not influence the report",  desc: "Whoever books does not shape what Reeve observes" },
  { Icon: FileCheck,     title: "Same report, both parties",            desc: "Owner and tenant receive the same document" },
  { Icon: MessageSquare, title: "Disagreements recorded as addendum",   desc: "Disputed observations are noted without altering original findings" },
];

const FAQ_ITEMS = [
  {
    q: "Is this a structural inspection?",
    a: "No. A Reeve Move-in Audit documents what is visibly observable during the handover visit. It does not cover hidden defects, structural integrity, electrical compliance, plumbing pressure, pest presence, or property valuation. It is a documentation service, not a technical inspection.",
  },
  {
    q: "Who should pay for it?",
    a: "Anyone — the tenant, the owner, or the broker. Many tenants book it to protect their deposit. Some owners book it to have a clean record from day one. Brokers sometimes include it as part of a premium handover. The report remains neutral regardless of who pays.",
  },
  {
    q: "Will this guarantee my deposit is returned?",
    a: "No. A Move-in Audit creates a documented baseline — a neutral record of the property's condition on the day of possession. It does not guarantee any outcome. What it does is replace guesswork with evidence, so that any deposit discussion is based on a shared, dated record rather than conflicting memories.",
  },
  {
    q: "Do both owner and tenant get the report?",
    a: "Yes. The same report is shared with both parties. Neither the owner nor the tenant receives a version that differs from the other.",
  },
  {
    q: "Can brokers book this for their clients?",
    a: "Yes. Brokers can book a Move-in Audit for any rental handover they are facilitating. The booking process is the same — you select the BHK size, share the property address, and choose a date. An optional co-branded report mention is available for brokers who complete multiple handovers through Reeve.",
  },
  {
    q: "Do you inspect fully furnished homes?",
    a: "Yes. Fully furnished homes are covered, with an additional fee of ₹500 to ₹750 depending on scope. This applies when the flat has extensive furniture, multiple appliances, or requires item-level documentation beyond standard scope.",
  },
  {
    q: "When should I book it?",
    a: "Ideally, after the rental agreement is finalised but before physical possession is taken — specifically before keys are handed over, before the tenant moves furniture in, and before the first night in the flat. This ensures the condition is documented before the tenant occupies the space. A Move-in Audit can also be conducted at move-out to compare exit condition against the move-in baseline.",
  },
  {
    q: "What if the owner or tenant disagrees with an observation?",
    a: "Any party who disagrees with a specific observation in the report can raise it formally. The disagreement is recorded as a signed addendum attached to the original report. The original report is not changed — the addendum becomes part of the record alongside it.",
  },
];

// ── Page component ────────────────────────────────────────────────────────────

export default function MoveInAudit(): React.ReactElement {
  const pageReadFired = useRef<boolean>(false);

  // 80% scroll depth — same pattern as OwnerClarityGuide
  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const pct = max > 0 ? (window.scrollY / max) * 100 : 0;
      if (pct >= 80 && !pageReadFired.current) {
        pageReadFired.current = true;
        posthog?.capture("move_in_audit_page_read");
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const trackCta = (source: string) => {
    posthog?.capture("move_in_audit_cta_clicked", { source });
  };

  return (
    <Layout>
      <style>{`
        .mia-faq .border-b { border-bottom: none; }
        .mia-faq [data-radix-collection-item] {
          border: 1px solid ${C.border};
          border-radius: 12px;
          margin-bottom: 8px;
          overflow: hidden;
          padding-left: 20px;
          padding-right: 20px;
        }
        .mia-faq [data-radix-collection-item]:last-child {
          margin-bottom: 0;
        }
        .mia-step-line { width: 2px; flex: 1; background: ${C.border}; min-height: 28px; margin: 4px 0; }
      `}</style>
      <div style={{ fontFamily: FONT_SANS, color: C.textPrimary }}>

        {/* ══ SECTION 1 — HERO ═════════════════════════════════════════════════ */}
        <section
          style={{ background: C.white, borderBottom: `1px solid ${C.border}` }}
          className="py-10 sm:py-16 lg:py-24"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2">

              {/* Left — copy */}
              <div>
                <p
                  className="mb-4 text-xs font-semibold uppercase tracking-widest"
                  style={{ color: C.accent }}
                >
                  For tenants, owners, and brokers in Bengaluru
                </p>
                {/* No animate-fade-up on h1 (LCP rule) */}
                <h1
                  className="mb-5"
                  style={{
                    fontFamily: FONT_SERIF,
                    fontWeight: 400,
                    fontSize: "clamp(2.2rem, 4vw, 3.25rem)",
                    lineHeight: 1.1,
                    letterSpacing: "-0.02em",
                    color: C.textPrimary,
                  }}
                >
                  Move in with clarity,
                  <br />
                  not confusion.
                </h1>
                <p
                  className="mb-7 text-base leading-relaxed"
                  style={{ color: C.textBody, maxWidth: 500 }}
                >
                  Reeve documents the visible condition of a rented flat before possession — room by room, with photos, videos, and a neutral PDF report shared with all parties.
                </p>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Link
                    to="/contact?service=move-in-audit"
                    onClick={() => trackCta("hero")}
                    className="inline-flex items-center justify-center rounded-xl px-6 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5"
                    style={{ background: C.accent, minHeight: 44 }}
                  >
                    Book a Move-in Audit
                  </Link>
                  <a
                    href="#what-we-document"
                    className="inline-flex items-center justify-center rounded-xl border px-6 py-3 text-sm font-semibold transition hover:-translate-y-0.5"
                    style={{ borderColor: C.borderDark, color: C.textPrimary, background: C.white, minHeight: 44 }}
                  >
                    See what we document
                  </a>
                </div>
              </div>

              {/* Right — report card mockup */}
              <div className="flex justify-center lg:justify-end">
                <div
                  className="w-full max-w-sm rounded-2xl p-7"
                  style={{
                    background: C.white,
                    border: `1px solid ${C.border}`,
                    boxShadow: "0 8px 40px rgba(15,28,46,0.11)",
                  }}
                >
                  <div
                    className="mb-5 flex items-center gap-3 pb-4"
                    style={{ borderBottom: `1px solid ${C.border}` }}
                  >
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                      style={{ background: C.accentLight }}
                    >
                      <FileText size={16} color={C.accent} aria-hidden="true" />
                    </div>
                    <div>
                      <div className="text-sm font-bold" style={{ color: C.textPrimary }}>Reeve Move-in Audit</div>
                      <div className="text-xs" style={{ color: C.textMuted }}>Handover documentation report</div>
                    </div>
                  </div>
                  {[
                    "Room-wise condition",
                    "Photo & video evidence",
                    "Keys and locks",
                    "Utilities and meters",
                    "Pre-existing damages",
                    "Neutral PDF report",
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-3 py-2">
                      <div
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                        style={{ background: C.ownerBadgeBg }}
                      >
                        <Check size={11} color={C.ownerBadgeText} aria-hidden="true" />
                      </div>
                      <span className="text-sm" style={{ color: C.textBody }}>{item}</span>
                    </div>
                  ))}
                  <div
                    className="mt-4 pt-4 text-xs"
                    style={{ borderTop: `1px solid ${C.border}`, color: C.textMuted }}
                  >
                    Shared with tenant and owner after the visit
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ══ SECTION 2 — PROBLEM + AUDIENCE ══════════════════════════════════ */}
        <section
          style={{ background: C.mutedBg, borderBottom: `1px solid ${C.border}` }}
          className="py-10 sm:py-16 lg:py-24"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mb-12 text-center">
              <h2
                className="mb-3"
                style={{
                  fontFamily: FONT_SERIF,
                  fontWeight: 400,
                  fontSize: "clamp(1.75rem, 3vw, 2.25rem)",
                  color: C.textPrimary,
                }}
              >
                Most deposit disputes start because nobody documented move-in.
              </h2>
              <p className="text-base" style={{ color: C.textBody }}>
                The flat's condition on Day 1 becomes everyone's word against everyone else's.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">

              {/* Tenant */}
              <div
                className="flex flex-col rounded-2xl p-7"
                style={{ background: C.white, border: `1px solid ${C.border}`, boxShadow: "0 2px 8px rgba(15,28,46,0.05)" }}
              >
                <div className="mb-4 flex items-center justify-between">
                  <span
                    className="rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide"
                    style={{ background: C.tenantBadgeBg, color: C.tenantBadgeText }}
                  >
                    For Tenants
                  </span>
                  <KeyRound size={20} color={C.tenantBadgeText} aria-hidden="true" />
                </div>
                <p className="mb-5 text-sm leading-relaxed" style={{ color: C.textBody }}>
                  You paid two months' deposit. At move-out, the owner deducts for a stain that was already there. You have no record it existed before you moved in.
                </p>
                <div className="mb-6 space-y-2.5">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide" style={{ color: C.textMuted }}>Right for you if</p>
                  {["Fresh move-in", "Flat has visible wear or pre-existing marks", "Deposit is ₹50,000+", "Semi-furnished or has appliances"].map((item) => (
                    <div key={item} className="flex items-start gap-2 text-sm" style={{ color: C.textBody }}>
                      <Check size={14} className="mt-0.5 shrink-0" color={C.tenantBadgeText} aria-hidden="true" />
                      {item}
                    </div>
                  ))}
                </div>
                <Link
                  to="/contact?service=move-in-audit"
                  onClick={() => trackCta("audience_tenant")}
                  className="mt-auto inline-flex items-center justify-center rounded-lg border px-4 py-2.5 text-sm font-semibold transition hover:bg-blue-50"
                  style={{ borderColor: C.tenantBadgeText, color: C.tenantBadgeText, minHeight: 44 }}
                >
                  Book for my move-in
                </Link>
              </div>

              {/* Owner */}
              <div
                className="flex flex-col rounded-2xl p-7"
                style={{ background: C.white, border: `1px solid ${C.border}`, boxShadow: "0 2px 8px rgba(15,28,46,0.05)" }}
              >
                <div className="mb-4 flex items-center justify-between">
                  <span
                    className="rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide"
                    style={{ background: C.ownerBadgeBg, color: C.ownerBadgeText }}
                  >
                    For Owners
                  </span>
                  <Home size={20} color={C.ownerBadgeText} aria-hidden="true" />
                </div>
                <p className="mb-5 text-sm leading-relaxed" style={{ color: C.textBody }}>
                  You handed over a well-maintained flat. The tenant disputes every deduction at exit. You have no neutral record of the property's condition.
                </p>
                <div className="mb-6 space-y-2.5">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide" style={{ color: C.textMuted }}>Right for you if</p>
                  {["Outstation or NRI owner", "Managing remotely", "Semi-furnished with appliances", "Want a cleaner exit settlement"].map((item) => (
                    <div key={item} className="flex items-start gap-2 text-sm" style={{ color: C.textBody }}>
                      <Check size={14} className="mt-0.5 shrink-0" color={C.ownerBadgeText} aria-hidden="true" />
                      {item}
                    </div>
                  ))}
                </div>
                <Link
                  to="/contact?service=move-in-audit"
                  onClick={() => trackCta("audience_owner")}
                  className="mt-auto inline-flex items-center justify-center rounded-lg border px-4 py-2.5 text-sm font-semibold transition hover:bg-green-50"
                  style={{ borderColor: C.ownerBadgeText, color: C.ownerBadgeText, minHeight: 44 }}
                >
                  Document my property
                </Link>
              </div>

              {/* Broker */}
              <div
                className="flex flex-col rounded-2xl p-7 sm:col-span-2 lg:col-span-1"
                style={{ background: C.white, border: `1px solid ${C.border}`, boxShadow: "0 2px 8px rgba(15,28,46,0.05)" }}
              >
                <div className="mb-4 flex items-center justify-between">
                  <span
                    className="rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide"
                    style={{ background: C.brokerBadgeBg, color: C.brokerBadgeText }}
                  >
                    For Brokers
                  </span>
                  <Handshake size={20} color={C.brokerBadgeText} aria-hidden="true" />
                </div>
                <p className="mb-5 text-sm leading-relaxed" style={{ color: C.textBody }}>
                  You closed the deal. Three months later, both parties call you to take sides in a dispute you have no documentation for.
                </p>
                <div className="mb-6 space-y-2.5">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide" style={{ color: C.textMuted }}>Right for you if</p>
                  {["Handle mid-to-premium Bengaluru rentals", "Work with NRI or outstation owners", "Want fewer disputes coming back to you", "Want to offer more than just deal closure"].map((item) => (
                    <div key={item} className="flex items-start gap-2 text-sm" style={{ color: C.textBody }}>
                      <Check size={14} className="mt-0.5 shrink-0" color={C.brokerBadgeText} aria-hidden="true" />
                      {item}
                    </div>
                  ))}
                </div>
                <Link
                  to="/contact?service=broker-partner"
                  onClick={() => trackCta("audience_broker")}
                  className="mt-auto inline-flex items-center justify-center rounded-lg border px-4 py-2.5 text-sm font-semibold transition hover:bg-amber-50"
                  style={{ borderColor: C.brokerBadgeText, color: C.brokerBadgeText, minHeight: 44 }}
                >
                  Offer documented handovers
                </Link>
              </div>

            </div>
          </div>
        </section>

        {/* ══ SECTION 3 — WHAT WE DOCUMENT ════════════════════════════════════ */}
        <section
          id="what-we-document"
          style={{ background: C.white, borderBottom: `1px solid ${C.border}` }}
          className="py-10 sm:py-16 lg:py-24"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mb-10">
              <h2
                className="mb-3"
                style={{
                  fontFamily: FONT_SERIF,
                  fontWeight: 400,
                  fontSize: "clamp(1.75rem, 3vw, 2.25rem)",
                  color: C.textPrimary,
                }}
              >
                What Reeve captures during a Move-in Audit
              </h2>
              <p className="text-base" style={{ color: C.textBody, maxWidth: 560 }}>
                Every audit covers the following. Scope may vary by property type and furnishing level.
              </p>
            </div>

            <div className="mb-10 grid grid-cols-1 gap-x-10 gap-y-7 sm:grid-cols-2">
              {DOC_ITEMS.map(({ Icon, title, desc }) => (
                <div key={title} className="flex items-start gap-4">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                    style={{ background: C.mutedBg }}
                  >
                    <Icon size={18} color={C.accent} aria-hidden="true" />
                  </div>
                  <div>
                    <div className="mb-1 text-sm font-bold" style={{ color: C.textPrimary }}>{title}</div>
                    <div className="text-sm leading-relaxed" style={{ color: C.textBody }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Callout — Documentation ≠ structural inspection */}
            <div
              className="rounded-xl p-6"
              style={{ borderLeft: `4px solid ${C.navy}`, background: C.mutedBg }}
            >
              <p className="mb-1 text-sm font-bold" style={{ color: C.textPrimary }}>
                Documentation. Not structural inspection.
              </p>
              <p className="text-sm leading-relaxed" style={{ color: C.textBody }}>
                Reeve records what is visible at the time of the handover visit. This does not cover hidden defects, structural integrity, electrical compliance, plumbing pressure, pest presence, or property valuation.
              </p>
            </div>
          </div>
        </section>

        {/* ══ SECTION 4 — HOW IT WORKS ═════════════════════════════════════════ */}
        <section
          style={{ background: C.white, borderBottom: `1px solid ${C.border}` }}
          className="py-10 sm:py-16 lg:py-24"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mb-12 text-center">
              <h2
                style={{
                  fontFamily: FONT_SERIF,
                  fontWeight: 400,
                  fontSize: "clamp(1.75rem, 3vw, 2.25rem)",
                  color: C.textPrimary,
                }}
              >
                Four steps. One neutral record.
              </h2>
            </div>

            {/* Desktop: horizontal stepper */}
            <div className="relative hidden grid-cols-4 gap-6 lg:grid">
              <div
                aria-hidden="true"
                style={{
                  position: "absolute",
                  top: 22,
                  left: "12.5%",
                  right: "12.5%",
                  height: 2,
                  background: C.border,
                  zIndex: 0,
                }}
              />
              {PROCESS_STEPS.map(({ n, title, desc }) => (
                <div key={n} className="relative flex flex-col items-center text-center" style={{ zIndex: 1 }}>
                  <div
                    className="mb-5 flex h-11 w-11 items-center justify-center rounded-full text-base font-bold text-white"
                    style={{ background: C.accent, boxShadow: "0 0 0 4px #fff, 0 0 0 5px " + C.border }}
                  >
                    {n}
                  </div>
                  <div className="mb-2 text-sm font-bold" style={{ color: C.textPrimary }}>{title}</div>
                  <div className="text-sm leading-relaxed" style={{ color: C.textBody }}>{desc}</div>
                </div>
              ))}
            </div>

            {/* Mobile: vertical stepper */}
            <div className="flex flex-col lg:hidden">
              {PROCESS_STEPS.map(({ n, title, desc }, idx) => (
                <div key={n} className="flex gap-5">
                  <div className="flex flex-col items-center">
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                      style={{ background: C.accent }}
                    >
                      {n}
                    </div>
                    {idx < PROCESS_STEPS.length - 1 && (
                      <div className="mia-step-line" />
                    )}
                  </div>
                  <div className="pb-8">
                    <div className="mt-2 text-sm font-bold" style={{ color: C.textPrimary }}>{title}</div>
                    <div className="mt-1 text-sm leading-relaxed" style={{ color: C.textBody }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══ SECTION 5 — PRICING ══════════════════════════════════════════════ */}
        <section
          style={{ background: C.mutedBg, borderBottom: `1px solid ${C.border}` }}
          className="py-10 sm:py-16 lg:py-24"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mb-12 text-center">
              <h2
                className="mb-3"
                style={{
                  fontFamily: FONT_SERIF,
                  fontWeight: 400,
                  fontSize: "clamp(1.75rem, 3vw, 2.25rem)",
                  color: C.textPrimary,
                }}
              >
                Simple pricing. No hidden costs.
              </h2>
              <p className="text-base" style={{ color: C.textBody }}>
                One flat fee based on BHK size.
              </p>
            </div>

            {/* Pricing cards */}
            <div className="mx-auto mb-8 grid max-w-3xl grid-cols-1 gap-6 sm:grid-cols-3">

              {/* 1 BHK */}
              <div
                className="rounded-2xl p-7 text-center"
                style={{ background: C.white, border: `1px solid ${C.borderDark}`, boxShadow: "0 2px 8px rgba(15,28,46,0.05)" }}
              >
                <div className="mb-4 text-sm font-bold" style={{ color: C.textBody }}>1 BHK</div>
                <div className="tabular-nums" style={{ fontSize: "2rem", fontWeight: 700, color: C.textPrimary }}>₹1,199</div>
              </div>

              {/* 2 BHK — highlighted */}
              <div
                className="relative rounded-2xl p-7 text-center"
                style={{ background: C.white, border: `2px solid ${C.navy}`, boxShadow: "0 8px 24px rgba(15,28,46,0.13)" }}
              >
                <div
                  className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-xs font-bold"
                  style={{ background: C.navy, color: "#FFFFFF" }}
                >
                  Most common
                </div>
                <div className="mb-4 mt-2 text-sm font-bold" style={{ color: C.textBody }}>2 BHK</div>
                <div className="tabular-nums" style={{ fontSize: "2rem", fontWeight: 700, color: C.textPrimary }}>₹2,199</div>
              </div>

              {/* 3 BHK+ */}
              <div
                className="rounded-2xl p-7 text-center"
                style={{ background: C.white, border: `1px solid ${C.borderDark}`, boxShadow: "0 2px 8px rgba(15,28,46,0.05)" }}
              >
                <div className="mb-4 text-sm font-bold" style={{ color: C.textBody }}>3 BHK+</div>
                <div className="tabular-nums" style={{ fontSize: "2rem", fontWeight: 700, color: C.textPrimary }}>₹2,999</div>
              </div>

            </div>

            {/* Notes */}
            <div className="mx-auto max-w-3xl space-y-4">
              <div
                className="rounded-xl p-5"
                style={{ background: C.white, border: `1px solid ${C.border}` }}
              >
                <p className="text-sm leading-relaxed" style={{ color: C.textBody }}>
                  <strong style={{ color: C.textPrimary }}>Fully furnished or heavy inventory:</strong>{" "}
                  +₹500 to ₹750 depending on scope. Applies when the flat has extensive furniture, multiple appliances, or requires item-level documentation.
                </p>
              </div>

              <div
                className="flex items-start gap-4 rounded-xl p-5"
                style={{ background: C.white, border: `1px solid ${C.border}` }}
              >
                <Users size={20} color={C.accent} className="mt-0.5 shrink-0" aria-hidden="true" />
                <p className="text-sm leading-relaxed" style={{ color: C.textBody }}>
                  <strong style={{ color: C.textPrimary }}>Anyone can pay</strong> — tenant, owner, broker, or split between parties. The report remains neutral regardless of who pays.
                </p>
              </div>
            </div>

            <div className="mt-8 text-center">
              <Link
                to="/contact?service=move-in-audit"
                onClick={() => trackCta("pricing")}
                className="inline-flex items-center justify-center rounded-xl px-8 py-3.5 text-sm font-semibold text-white transition hover:-translate-y-0.5"
                style={{ background: C.accent, minHeight: 44 }}
              >
                Book a Move-in Audit
              </Link>
            </div>
          </div>
        </section>

        {/* ══ SECTION 6 — NEUTRALITY ═══════════════════════════════════════════ */}
        <section
          className="py-10 sm:py-16 lg:py-24"
          style={{ background: C.neutralityBg }}
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mb-10 text-center">
              <h2
                className="mb-5"
                style={{
                  fontFamily: FONT_SERIF,
                  fontWeight: 400,
                  fontSize: "clamp(1.75rem, 3vw, 2.25rem)",
                  color: "#FFFFFF",
                }}
              >
                Paid by anyone. Shared fairly.
              </h2>
              <p
                className="mx-auto text-base leading-relaxed"
                style={{ color: "rgba(255,255,255,0.75)", maxWidth: 620 }}
              >
                The Move-in Audit is not written in favour of whoever pays. Reeve documents what is visibly observed during the visit. The same report is available to both owner and tenant so everyone starts with the same baseline. If any party disagrees with a specific observation, that disagreement is recorded as a formal addendum without changing the original report.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
              {NEUTRALITY_POINTS.map(({ Icon, title, desc }) => (
                <div key={title} className="flex flex-col items-center gap-3 text-center">
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-xl"
                    style={{ background: "rgba(255,255,255,0.10)" }}
                  >
                    <Icon size={20} color="#FFFFFF" aria-hidden="true" />
                  </div>
                  <div>
                    <div className="mb-1 text-sm font-bold" style={{ color: "#FFFFFF" }}>{title}</div>
                    <div className="text-sm" style={{ color: "rgba(255,255,255,0.65)" }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══ SECTION 7 — BROKER PARTNER ═══════════════════════════════════════ */}
        <section
          style={{ background: C.brokerBg, borderBottom: `1px solid ${C.border}` }}
          className="py-10 sm:py-16 lg:py-24"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-2">

              {/* Left — copy */}
              <div>
                <h2
                  className="mb-3"
                  style={{
                    fontFamily: FONT_SERIF,
                    fontWeight: 400,
                    fontSize: "clamp(1.75rem, 3vw, 2.25rem)",
                    color: C.textPrimary,
                  }}
                >
                  For brokers: make every rental handover professional.
                </h2>
                <p className="mb-4 text-base" style={{ color: C.textBody }}>
                  Most brokers close the deal and move on. Reeve helps you offer something more.
                </p>
                <p className="mb-6 text-sm leading-relaxed" style={{ color: C.textBody }}>
                  A documented handover builds trust with clients — especially NRI and outstation owners who cannot be present. It reduces post-move-in calls that drag you back into disputes. And it gives you a concrete differentiator: you are the broker who does handovers properly.
                </p>
                <div className="mb-8 space-y-3">
                  {[
                    "Better trust with owners and tenants at handover",
                    "Fewer post-move-in blame calls without evidence",
                    "More premium positioning for your rental practice",
                    "Particularly useful for NRI and outstation owner clients",
                    "Optional co-branded report mention: “Handover facilitated by [Broker/Agency]”",
                    "Path to Reeve Founding Handover Partner status",
                  ].map((item) => (
                    <div key={item} className="flex items-start gap-3 text-sm" style={{ color: C.textBody }}>
                      <Check size={15} className="mt-0.5 shrink-0" color={C.navy} aria-hidden="true" />
                      {item}
                    </div>
                  ))}
                </div>
                <Link
                  to="/contact?service=broker-partner"
                  onClick={() => trackCta("broker_partner")}
                  className="inline-flex items-center justify-center rounded-xl px-7 py-3.5 text-sm font-semibold text-white transition hover:-translate-y-0.5"
                  style={{ background: C.navy, minHeight: 44 }}
                >
                  Partner with Reeve
                </Link>
              </div>

              {/* Right — badge card */}
              <div className="flex flex-col gap-5">
                <div
                  className="rounded-2xl p-7"
                  style={{ background: C.navy, border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  <div className="mb-4 flex items-center gap-3">
                    <Award size={24} color="#FFFFFF" aria-hidden="true" />
                    <div className="text-base font-bold" style={{ color: "#FFFFFF" }}>
                      Reeve Founding Handover Partner
                    </div>
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.72)" }}>
                    Brokers who complete multiple documented handovers through Reeve during the launch phase will be recognised as Founding Handover Partners.
                  </p>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: C.textMuted }}>
                  This badge indicates the broker uses documented rental handovers through Reeve. It does not imply legal or regulatory certification of any kind.
                </p>
              </div>

            </div>
          </div>
        </section>

        {/* ══ SECTION 8 — FAQ ══════════════════════════════════════════════════ */}
        <section
          style={{ background: C.white, borderBottom: `1px solid ${C.border}` }}
          className="py-10 sm:py-16 lg:py-24"
        >
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <h2
              className="mb-8"
              style={{
                fontFamily: FONT_SERIF,
                fontWeight: 400,
                fontSize: "clamp(1.75rem, 3vw, 2.25rem)",
                color: C.textPrimary,
              }}
            >
              Common questions
            </h2>
            <div className="mia-faq">
              <Accordion type="single" collapsible>
                {FAQ_ITEMS.map((item) => (
                  <AccordionItem key={item.q} value={item.q}>
                    <AccordionTrigger
                      className="text-left text-sm font-semibold"
                      style={{ color: C.textPrimary }}
                    >
                      {item.q}
                    </AccordionTrigger>
                    <AccordionContent style={{ color: C.textBody }}>
                      {item.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        </section>

        {/* ══ SECTION 9 — FINAL CTA ════════════════════════════════════════════ */}
        <section
          className="py-16 sm:py-24"
          style={{ background: C.ctaBg }}
        >
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
            <h2
              className="mb-4"
              style={{
                fontFamily: FONT_SERIF,
                fontWeight: 400,
                fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)",
                lineHeight: 1.15,
                color: "#FFFFFF",
              }}
            >
              Moving in soon? Document it before you take the keys.
            </h2>
            <p
              className="mb-8 text-base leading-relaxed"
              style={{ color: "rgba(255,255,255,0.65)" }}
            >
              Book a Reeve Move-in Audit and start your tenancy with a neutral handover record. Shared with all parties.
            </p>
            <div className="flex flex-col justify-center gap-4 sm:flex-row">
              <Link
                to="/contact?service=move-in-audit"
                onClick={() => trackCta("final_cta")}
                className="inline-flex items-center justify-center rounded-xl px-8 py-4 text-sm font-semibold transition hover:-translate-y-0.5"
                style={{ background: "#FFFFFF", color: C.navy, minHeight: 52 }}
              >
                Book a Move-in Audit
              </Link>
              <Link
                to="/contact"
                onClick={() => trackCta("final_cta")}
                className="inline-flex items-center justify-center rounded-xl border-2 px-8 py-4 text-sm font-semibold text-white transition hover:bg-white/10"
                style={{ borderColor: "rgba(255,255,255,0.40)", minHeight: 52 }}
              >
                Talk to Reeve
              </Link>
            </div>
          </div>
        </section>

      </div>
    </Layout>
  );
}
