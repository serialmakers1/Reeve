import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";
import PropertyEnquiryForm from "@/components/property-services/PropertyEnquiryForm";

const SERIF = "'Instrument Serif', Georgia, serif";
const SANS = "'DM Sans', system-ui, sans-serif";

const SERVICES = [
  {
    id: "vacant",
    state: "My property is empty",
    service: "Vacant Property Care",
    price: { from: true, amount: "₹2,000", period: "/month" },
    displayPrice: "From ₹2,000/month",
    cta: "View Vacant Property Care →",
    href: "/vacant-property-care-bangalore",
    desktopImg: "/images/pms_a.webp",
    mobileImg: "/images/pms_d.webp",
    base: "#EFFBF8",
    border: "#CFE9E4",
    ctaColor: "#0B756B",
    dot: "#0F9F8F",
    chevron: "#0B756B",
  },
  {
    id: "managed",
    state: "My property is rented",
    service: "Property Management",
    price: { from: true, amount: "₹3,000", period: "/month" },
    displayPrice: "From ₹3,000/month",
    cta: "View Property Management →",
    href: "/property-management-bangalore",
    desktopImg: "/images/pms_b.webp",
    mobileImg: "/images/pms_e.webp",
    base: "#F0F5FF",
    border: "#D2DEFB",
    ctaColor: "#1D4ED8",
    dot: "#2563EB",
    chevron: "#1D4ED8",
  },
  {
    id: "tenant",
    state: "I need a tenant",
    service: "Find a Tenant",
    price: { from: false, amount: "₹20,000", period: "once" },
    displayPrice: "₹20,000 once",
    cta: "View Find a Tenant →",
    href: "/find-tenant-bangalore",
    desktopImg: "/images/pms_c.webp",
    mobileImg: "/images/pms_f.webp",
    base: "#FFF2ED",
    border: "#F5D4CA",
    ctaColor: "#B94735",
    dot: "#F46F52",
    chevron: "#B94735",
  },
] as const;

type Service = typeof SERVICES[number];

type ProofMode = "money" | "visits" | "repairs";

const PROOF_MODES = [
  {
    id: "money" as const,
    label: "Money",
    title: "Your money never passes through us.",
    support: "Rent and security deposit move directly between you and your tenant.",
    image: "/images/pms_2.webp",
    alt: "Diagram showing rent and security deposit moving directly from tenant to owner, while Reeve is connected separately to the property for operations.",
  },
  {
    id: "visits" as const,
    label: "Visits",
    title: "Every visit leaves dated proof.",
    support: "Photos and updates are dated and kept in your property record.",
    image: "/images/pms_3.webp",
    alt: "Sample Reeve property record showing a leaking tap before repair and the repaired condition after, with dated entries for 12 Mar property visit, 17 Mar issue recorded, 19 Mar work completed and 31 Mar monthly record.",
  },
  {
    id: "repairs" as const,
    label: "Repairs",
    title: "Repairs come with the paper trail.",
    support: "You see the vendor bill at actuals. Work above ₹3,000 requires written owner approval.",
    image: "/images/pms_4.webp",
    alt: "Sample repair record showing a ₹4,600 vendor bill, Reeve markup ₹0, owner approval required above ₹3,000, written approval received and before-and-after repair photos.",
  },
] as const;

function DesktopCard({ svc }: { svc: Service }) {
  return (
    <article
      className="relative overflow-hidden rounded-[23px] border aspect-[1576/998] shadow-[0_5px_18px_rgba(11,21,38,0.035)] group motion-safe:hover:-translate-y-[4px] motion-safe:hover:shadow-[0_16px_38px_rgba(11,21,38,0.10)] transition-[transform,box-shadow] duration-200 ease-[cubic-bezier(.22,.8,.3,1)]"
      style={{ background: svc.base, borderColor: svc.border }}
    >
      {/* p-[18px] compact (1180–1279px) → xl:p-[22px] full (≥1280px) */}
      <a
        href={svc.href}
        className="absolute inset-0 flex flex-col p-[18px] xl:p-[22px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px]"
        style={{ outlineColor: svc.ctaColor }}
      >
        {/* Desktop background artwork */}
        <img
          src={svc.desktopImg}
          alt=""
          aria-hidden="true"
          width={1576}
          height={998}
          className="absolute inset-0 w-full h-full object-cover motion-safe:group-hover:scale-[1.005] transition-transform duration-200"
          loading="lazy"
          decoding="async"
        />

        {/* Readability veil — full card width; fades at 65% */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `linear-gradient(to right, ${svc.base} 0%, ${svc.base} 44%, ${svc.base}CC 55%, transparent 65%)`,
          }}
          aria-hidden="true"
        />

        {/* Text — full-height column; state near top, CTA at bottom
            54% compact (1180–1279px) → xl:52% full */}
        <div
          className="relative z-10 flex h-full max-w-[54%] xl:max-w-[52%] flex-col"
          style={{ fontFamily: SANS }}
        >
          {/* State: 17px compact → xl:19px full */}
          <span className="text-[17px] xl:text-[19px] font-bold leading-[1.2] text-[#0B1526]">
            {svc.state}
          </span>

          {/* Service name: 13px / mt-6px compact → xl:14px / xl:mt-8px full */}
          <h3
            className="mt-[6px] xl:mt-[8px] flex items-center gap-[5px] text-[13px] xl:text-[14px] font-semibold text-[#526173]"
          >
            <span
              className="inline-block h-[5px] w-[5px] flex-shrink-0 rounded-full"
              style={{ background: svc.dot }}
              aria-hidden="true"
            />
            {svc.service}
          </h3>

          {/* Price: mt-14px / 22px compact → xl:mt-18px / xl:25px full */}
          <div className="mt-[14px] xl:mt-[18px]">
            {svc.price.from && (
              <span className="text-[12px] font-semibold text-[#68768A]">From </span>
            )}
            <span className="text-[22px] xl:text-[25px] font-bold text-[#0B1526]">
              {svc.price.amount}
            </span>
            {/* Real whitespace so "₹20,000 once" copies correctly */}
            <span className="ml-[2px] text-[13px] font-semibold text-[#68768A]">
              {svc.price.from ? svc.price.period : ` ${svc.price.period}`}
            </span>
          </div>

          {/* CTA: 12.5px compact → xl:13.5px full; mt-auto anchors to bottom */}
          <span
            className="mt-auto flex items-center text-[12.5px] xl:text-[13.5px] font-[650]"
            style={{ color: svc.ctaColor }}
          >
            {svc.cta.replace(" →", "")}
            <span className="ml-[3px] transition-transform duration-150 motion-safe:group-hover:translate-x-[4px]">
              {" →"}
            </span>
          </span>
        </div>
      </a>
    </article>
  );
}

function MobileRow({ svc }: { svc: Service }) {
  return (
    <article
      className="overflow-hidden rounded-[17px] border"
      style={{ background: svc.base, borderColor: svc.border }}
    >
      <a
        href={svc.href}
        className="flex min-h-[92px] flex-row items-center gap-[10px] px-[14px] py-[12px] sm:min-h-[104px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px]"
        style={{ outlineColor: svc.ctaColor }}
      >
        {/* Visual slot: 64px mobile → 72px tablet
            Image rendered larger (76/84px) so transparent padding fills the slot */}
        <div className="flex h-[64px] w-[64px] flex-shrink-0 items-center justify-center overflow-hidden sm:h-[72px] sm:w-[72px]">
          <img
            src={svc.mobileImg}
            alt=""
            aria-hidden="true"
            width={1024}
            height={1024}
            className="h-[76px] w-[76px] sm:h-[84px] sm:w-[84px]"
            loading="lazy"
            decoding="async"
          />
        </div>

        {/* Text */}
        <div className="min-w-0 flex-1" style={{ fontFamily: SANS }}>
          <p className="text-[15px] font-bold leading-[1.18] text-[#0B1526]">{svc.state}</p>
          <h3 className="mt-[2px] text-[12.5px] font-semibold text-[#637182]">{svc.service}</h3>
          <p className="mt-[6px] text-[14px] font-bold text-[#0B1526]">{svc.displayPrice}</p>
        </div>

        {/* Chevron */}
        <svg
          width="18"
          height="18"
          viewBox="0 0 18 18"
          fill="none"
          className="flex-shrink-0"
          aria-hidden="true"
        >
          <path
            d="M7 4.5L11.5 9L7 13.5"
            stroke={svc.chevron}
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </a>
    </article>
  );
}

function ProofSection() {
  const [activeMode, setActiveMode] = useState<ProofMode>("money");
  const active = PROOF_MODES.find((m) => m.id === activeMode)!;

  return (
    <section
      id="proof"
      className="scroll-mt-16 pt-16 pb-[56px] lg:pt-[88px] lg:pb-[72px]"
      aria-labelledby="proof-heading"
      style={{
        background: [
          "radial-gradient(circle at 72% 30%, rgba(37,99,235,.16), transparent 34%)",
          "radial-gradient(circle at 82% 78%, rgba(15,159,143,.09), transparent 30%)",
          "#071426",
        ].join(", "),
      }}
    >
      <div className="mx-auto max-w-[1240px] px-5 sm:px-8 lg:px-10">

        {/* Eyebrow */}
        <p
          className="text-[11px] sm:text-[11.5px] font-bold uppercase tracking-[0.12em] text-[#8FB7FF]"
          style={{ fontFamily: SANS }}
        >
          BUILT FOR ACCOUNTABILITY
        </p>

        {/* H2 */}
        <h2
          id="proof-heading"
          className="mt-3 max-w-[620px] text-[30px] font-normal leading-[1.06] tracking-[-0.015em] text-[#F7FAFF] lg:text-[clamp(38px,3vw,42px)]"
          style={{ fontFamily: SERIF }}
        >
          Built so you can verify it.
        </h2>

        {/* Support */}
        <p
          className="mt-[10px] max-w-[650px] text-[14.5px] font-[500] leading-[1.48] text-[#A7B7CC] lg:text-[16.5px] lg:leading-[1.5]"
          style={{ fontFamily: SANS }}
        >
          The important promises aren’t hidden behind “trust us.” You can see the record.
        </p>

        {/* Segmented selector */}
        <div
          role="group"
          aria-label="Proof type"
          className="mt-[30px] flex items-center gap-[4px] rounded-[14px] border p-[4px] h-[44px] w-full max-w-[346px]"
          style={{ background: "#0C2038", borderColor: "#203A58" }}
        >
          {PROOF_MODES.map((mode) => {
            const isActive = activeMode === mode.id;
            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => setActiveMode(mode.id)}
                aria-pressed={isActive}
                className={`flex-1 h-full rounded-[10px] text-[12.5px] font-bold transition-[background,color] duration-[150ms] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
                  isActive
                    ? "text-[#0B1526]"
                    : "text-[#91A4BC] hover:text-[#D9E5F3]"
                }`}
                style={{
                  background: isActive ? "#EAF2FF" : "transparent",
                  outlineColor: "#8FB7FF",
                  fontFamily: SANS,
                }}
              >
                {mode.label}
              </button>
            );
          })}
        </div>

        {/* ── Desktop proof stage — ≥ 1024px ──────────────────────── */}
        <div
          className="mt-4 hidden lg:grid lg:grid-cols-[32fr_68fr] min-[1180px]:grid-cols-[34fr_66fr] min-h-[470px] min-[1180px]:min-h-[500px] rounded-[24px] overflow-hidden"
          style={{
            background: "#0B1C33",
            border: "1px solid rgba(143,178,216,0.14)",
            boxShadow: "0 24px 60px rgba(0,0,0,0.20)",
          }}
        >
          {/* Left: copy — right border is the vertical divider */}
          <div
            className="flex flex-col justify-center min-w-0 p-7 min-[1180px]:p-9"
            style={{ borderRight: "1px solid rgba(255,255,255,0.07)" }}
          >
            <h3
              className="text-[22px] min-[1180px]:text-[24px] font-bold leading-[1.15] text-[#F7FAFF] max-w-[310px]"
              style={{ fontFamily: SANS }}
            >
              {active.title}
            </h3>
            <p
              className="mt-2 text-[15.5px] min-[1180px]:text-[16px] font-[500] leading-[1.5] text-[#A7B7CC] max-w-[300px]"
              style={{ fontFamily: SANS }}
            >
              {active.support}
            </p>
          </div>

          {/* Right: image panel */}
          <div className="flex items-center justify-center min-w-0 p-5 min-[1180px]:p-7">
            <div
              className="relative w-full max-h-[420px] min-[1180px]:max-h-[450px] overflow-hidden rounded-[18px]"
              style={{ aspectRatio: "1448/1086" }}
            >
              {PROOF_MODES.map((mode) => {
                const isActive = mode.id === activeMode;
                return (
                  <img
                    key={mode.id}
                    src={mode.image}
                    alt={isActive ? mode.alt : ""}
                    aria-hidden={isActive ? undefined : true}
                    width={1448}
                    height={1086}
                    className="psv-proof-img absolute inset-0 w-full h-full object-contain"
                    style={{ opacity: isActive ? 1 : 0, transition: "opacity 180ms ease" }}
                    loading="lazy"
                    decoding="async"
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Mobile / tablet stacked — < 1024px ──────────────────── */}
        <div className="mt-6 lg:hidden" style={{ fontFamily: SANS }}>
          <h3
            className="text-[20px] font-bold leading-[1.18] text-[#F7FAFF]"
          >
            {active.title}
          </h3>
          <p
            className="mt-[8px] text-[14px] sm:text-[14.5px] font-[500] leading-[1.48] text-[#A7B7CC]"
          >
            {active.support}
          </p>
          <div
            className="relative mt-4 w-full sm:max-w-[520px] sm:mx-auto overflow-hidden rounded-[18px]"
            style={{ aspectRatio: "1448/1086" }}
          >
            {PROOF_MODES.map((mode) => {
              const isActive = mode.id === activeMode;
              return (
                <img
                  key={mode.id}
                  src={mode.image}
                  alt={isActive ? mode.alt : ""}
                  aria-hidden={isActive ? undefined : true}
                  width={1448}
                  height={1086}
                  className="psv-proof-img absolute inset-0 w-full h-full object-contain"
                  style={{ opacity: isActive ? 1 : 0, transition: "opacity 180ms ease" }}
                  loading="lazy"
                  decoding="async"
                />
              );
            })}
          </div>
        </div>

      </div>
    </section>
  );
}

// ── Section 4: Compare ─────────────────────────────────────────────────────

type CompareServiceId = "vacant" | "managed" | "tenant";

interface MobilePriceRow {
  label?: string;
  main: string;
  sub?: string;
}

interface CompareService {
  id: CompareServiceId;
  selectorLabel: string;
  name: string;
  headerBg: string;
  headerAccent: string;
  selectorSelectedBg: string;
  selectorSelectedText: string;
  panelBorder: string;
  bestFor: string;
  priceMain: string;
  priceQualifier?: string;
  priceSecondary?: string;
  mobilePrice: {
    rows: MobilePriceRow[];
    qualifier?: string;
  };
  minimum: string;
  visits: string;
  tenantFinding: string;
  afterwards: string;
  afterwardsEmphasis?: string;
}

const COMPARE_SERVICES: CompareService[] = [
  {
    id: "vacant",
    selectorLabel: "Vacant",
    name: "Vacant Property Care",
    headerBg: "#EFFBF8",
    headerAccent: "#0F9F8F",
    selectorSelectedBg: "#E5F7F3",
    selectorSelectedText: "#0B756B",
    panelBorder: "#D7ECE7",
    bestFor: "Empty property staying empty",
    priceMain: "₹2,000 / ₹3,000 per month",
    priceQualifier: "Up to 3 BHK / 4 BHK+ or villa",
    mobilePrice: {
      rows: [
        { main: "₹2,000/month", sub: "Up to 3 BHK" },
        { main: "₹3,000/month", sub: "4 BHK+ or villa" },
      ],
    },
    minimum: "6 months",
    visits: "Monthly",
    tenantFinding: "Not included",
    afterwards: "Continues while you need vacant-property care",
  },
  {
    id: "managed",
    selectorLabel: "Managed",
    name: "Property Management",
    headerBg: "#F0F5FF",
    headerAccent: "#2563EB",
    selectorSelectedBg: "#E7EFFF",
    selectorSelectedText: "#1D4ED8",
    panelBorder: "#D9E4FC",
    bestFor: "Rented or empty, with ongoing management",
    priceMain: "₹3,000 / ₹4,500 while rented",
    priceQualifier: "Up to 3 BHK / 4 BHK+ or villa",
    priceSecondary: "₹2,000 / ₹3,000 while empty",
    mobilePrice: {
      rows: [
        { label: "While rented", main: "₹3,000 / ₹4,500" },
        { label: "While empty", main: "₹2,000 / ₹3,000" },
      ],
      qualifier: "Up to 3 BHK / 4 BHK+ or villa",
    },
    minimum: "3 months",
    visits: "Quarterly + coordination",
    tenantFinding: "₹15,000 on success",
    afterwards: "Continues while you need management",
  },
  {
    id: "tenant",
    selectorLabel: "Tenant",
    name: "Find a Tenant",
    headerBg: "#FFF2ED",
    headerAccent: "#F46F52",
    selectorSelectedBg: "#FFF0EA",
    selectorSelectedText: "#B94735",
    panelBorder: "#F3DDD6",
    bestFor: "Find a tenant, then manage it yourself",
    priceMain: "₹20,000 once",
    mobilePrice: {
      rows: [{ main: "₹20,000 once" }],
    },
    minimum: "One-time service",
    visits: "Viewings as needed",
    tenantFinding: "Included",
    afterwards: "Handover complete — you manage from there.",
    afterwardsEmphasis: "Handover complete",
  },
];

function renderAfterwards(svc: CompareService) {
  if (!svc.afterwardsEmphasis) return <>{svc.afterwards}</>;
  const tail = svc.afterwards.slice(svc.afterwardsEmphasis.length);
  return (
    <>
      <span className="font-[650]">{svc.afterwardsEmphasis}</span>
      {tail}
    </>
  );
}

function CompareSection() {
  const [activeService, setActiveService] = useState<CompareServiceId>("vacant");
  const activeSvc = COMPARE_SERVICES.find((s) => s.id === activeService)!;

  return (
    <section
      id="compare"
      className="bg-[#FBFAF7] scroll-mt-16 pt-16 pb-[68px] lg:pt-[88px] lg:pb-[92px]"
      aria-labelledby="compare-heading"
    >
      <div className="mx-auto max-w-[1240px] px-5 sm:px-8 lg:px-10">

        {/* H2 */}
        <h2
          id="compare-heading"
          className="max-w-[700px] text-[30px] font-normal leading-[1.06] tracking-[-0.015em] text-[#0B1526] lg:text-[clamp(38px,3vw,42px)]"
          style={{ fontFamily: SERIF }}
        >
          Compare the three services
        </h2>

        {/* Support */}
        <p
          className="mt-[10px] max-w-[700px] text-[14.5px] font-[500] leading-[1.5] text-[#5D6B7A] lg:text-[16.5px]"
          style={{ fontFamily: SANS }}
        >
          Choose based on what is happening with your property today.
        </p>

        {/* ── Mobile selector + selected panel (lg:hidden) ── */}
        <div className="mt-6 lg:hidden">

          {/* Segmented selector */}
          <div
            role="group"
            aria-label="Service comparison"
            className="flex items-center gap-[4px] rounded-[14px] border p-[4px] h-[44px] w-full"
            style={{ background: "#F1F2F4", borderColor: "#E0E2E5" }}
          >
            {COMPARE_SERVICES.map((svc) => {
              const isActive = activeService === svc.id;
              return (
                <button
                  key={svc.id}
                  type="button"
                  onClick={() => setActiveService(svc.id)}
                  aria-pressed={isActive}
                  className={`flex-1 h-full rounded-[10px] text-[12.5px] font-bold transition-[background,color] duration-[150ms] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
                    isActive ? "" : "text-[#687386]"
                  }`}
                  style={{
                    background: isActive ? svc.selectorSelectedBg : "transparent",
                    color: isActive ? svc.selectorSelectedText : undefined,
                    outlineColor: "#8FB7FF",
                    fontFamily: SANS,
                  }}
                >
                  {svc.selectorLabel}
                </button>
              );
            })}
          </div>

          {/* Active service panel */}
          <div
            className="mt-[13px] rounded-[18px] border overflow-hidden bg-white"
            style={{ borderColor: activeSvc.panelBorder }}
          >
            {/* Service header strip */}
            <div
              className="flex items-center justify-center px-4"
              style={{ background: activeSvc.headerBg, height: 52 }}
            >
              <span className="text-[16px] font-bold text-[#0B1526]" style={{ fontFamily: SANS }}>
                {activeSvc.name}
              </span>
            </div>

            {/* Panel body */}
            <div className="px-4 pb-4">

              {/* BEST FOR */}
              <div className="pt-[15px]">
                <p
                  className="text-[11.5px] font-bold uppercase tracking-[0.06em] text-[#7A8593]"
                  style={{ fontFamily: SANS }}
                >
                  BEST FOR
                </p>
                <p
                  className="mt-[5px] text-[14.5px] font-[600] leading-[1.4] text-[#243244]"
                  style={{ fontFamily: SANS }}
                >
                  {activeSvc.bestFor}
                </p>
              </div>

              <div className="my-[12px] h-px bg-[#ECEBE7]" />

              {/* PRICE */}
              <div>
                <p
                  className="text-[11.5px] font-bold uppercase tracking-[0.06em] text-[#7A8593]"
                  style={{ fontFamily: SANS }}
                >
                  PRICE
                </p>
                <div className="mt-[5px]" style={{ fontFamily: SANS }}>
                  {activeSvc.mobilePrice.rows.map((row, i) => (
                    <div key={i} className={i > 0 ? "mt-[8px]" : ""}>
                      {row.label && (
                        <p className="text-[11.5px] font-[600] text-[#7A8593]">{row.label}</p>
                      )}
                      <p className="text-[15.5px] font-bold text-[#0B1526]">{row.main}</p>
                      {row.sub && (
                        <p className="text-[12px] font-[500] text-[#7A8593]">{row.sub}</p>
                      )}
                    </div>
                  ))}
                  {activeSvc.mobilePrice.qualifier && (
                    <p className="mt-[6px] text-[12px] font-[500] text-[#7A8593]">
                      {activeSvc.mobilePrice.qualifier}
                    </p>
                  )}
                </div>
              </div>

              <div className="my-[12px] h-px bg-[#ECEBE7]" />

              {/* 4 compact attribute rows */}
              {[
                { label: "Minimum term", value: activeSvc.minimum, isAfterwards: false },
                { label: "Visits", value: activeSvc.visits, isAfterwards: false },
                { label: "Tenant finding", value: activeSvc.tenantFinding, isAfterwards: false },
                { label: "Afterwards", value: activeSvc.afterwards, isAfterwards: true },
              ].map((row, i, arr) => (
                <div key={row.label}>
                  <div className="flex items-start justify-between gap-3 py-[10px]">
                    <span
                      className="text-[11.5px] font-[650] text-[#7A8593] flex-shrink-0"
                      style={{ fontFamily: SANS }}
                    >
                      {row.label}
                    </span>
                    <span
                      className="text-[13.5px] font-[600] text-[#243244] text-right"
                      style={{ fontFamily: SANS }}
                    >
                      {row.isAfterwards ? renderAfterwards(activeSvc) : row.value}
                    </span>
                  </div>
                  {i < arr.length - 1 && <div className="h-px bg-[#ECEBE7]" />}
                </div>
              ))}

              {/* Managed lifecycle inset */}
              {activeService === "managed" && (
                <div
                  className="mt-[14px] rounded-[13px] border"
                  style={{ background: "#F5F8FF", borderColor: "#DCE5F6", padding: "14px" }}
                >
                  <p className="text-[13px] font-bold text-[#243244]" style={{ fontFamily: SANS }}>
                    Your rate follows the property&#8217;s state
                  </p>
                  <p className="mt-[3px] text-[11.5px] font-[600] text-[#697789]" style={{ fontFamily: SANS }}>
                    Example · up to 3 BHK
                  </p>

                  {/* Grid at ≥390px; vertical stack below */}
                  <div
                    className="mt-[12px] flex flex-col items-center gap-[8px]
                               min-[390px]:grid min-[390px]:grid-cols-[auto_minmax(0,1fr)_auto_minmax(0,1fr)_auto]
                               min-[390px]:items-start min-[390px]:gap-0"
                  >
                    {/* Rented node */}
                    <div className="min-[390px]:grid min-[390px]:grid-rows-[48px_auto]">
                      <div
                        className="rounded-[10px] border px-3 py-[7px] text-center
                                   min-[390px]:h-full min-[390px]:py-0 min-[390px]:flex min-[390px]:flex-col
                                   min-[390px]:items-center min-[390px]:justify-center"
                        style={{ background: "#EDF3FF", borderColor: "#C6D7FF" }}
                      >
                        <p className="text-[12px] font-bold text-[#1D4ED8]" style={{ fontFamily: SANS }}>Rented</p>
                        <p className="text-[11.5px] font-[600] text-[#1D4ED8]" style={{ fontFamily: SANS }}>₹3,000</p>
                      </div>
                    </div>

                    {/* Connector 1 */}
                    <div className="min-w-0 flex flex-col items-center min-[390px]:grid min-[390px]:grid-rows-[48px_auto]">
                      <div className="hidden min-[390px]:flex items-center w-full">
                        <div className="flex-1 h-px" style={{ background: "#A9B4C3" }} />
                        <svg width="5" height="8" viewBox="0 0 5 8" fill="none" aria-hidden="true">
                          <path d="M0 0L5 4L0 8" stroke="#A9B4C3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                      <div className="min-[390px]:hidden flex flex-col items-center">
                        <div className="w-px h-3" style={{ background: "#A9B4C3" }} />
                        <svg width="8" height="5" viewBox="0 0 8 5" fill="none" aria-hidden="true">
                          <path d="M0 0L4 5L8 0" stroke="#A9B4C3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                      <span
                        className="text-[11px] font-[600] text-[#697789] text-center mt-[4px] leading-tight break-words min-w-0"
                        style={{ fontFamily: SANS }}
                      >
                        keys returned
                      </span>
                    </div>

                    {/* Empty node */}
                    <div className="min-[390px]:grid min-[390px]:grid-rows-[48px_auto]">
                      <div
                        className="rounded-[10px] border px-3 py-[7px] text-center
                                   min-[390px]:h-full min-[390px]:py-0 min-[390px]:flex min-[390px]:flex-col
                                   min-[390px]:items-center min-[390px]:justify-center"
                        style={{ background: "#EFFBF8", borderColor: "#CFE9E4" }}
                      >
                        <p className="text-[12px] font-bold text-[#0B8175]" style={{ fontFamily: SANS }}>Empty</p>
                        <p className="text-[11.5px] font-[600] text-[#0B8175]" style={{ fontFamily: SANS }}>₹2,000</p>
                      </div>
                    </div>

                    {/* Connector 2 */}
                    <div className="min-w-0 flex flex-col items-center min-[390px]:grid min-[390px]:grid-rows-[48px_auto]">
                      <div className="hidden min-[390px]:flex items-center w-full">
                        <div className="flex-1 h-px" style={{ background: "#A9B4C3" }} />
                        <svg width="5" height="8" viewBox="0 0 5 8" fill="none" aria-hidden="true">
                          <path d="M0 0L5 4L0 8" stroke="#A9B4C3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                      <div className="min-[390px]:hidden flex flex-col items-center">
                        <div className="w-px h-3" style={{ background: "#A9B4C3" }} />
                        <svg width="8" height="5" viewBox="0 0 8 5" fill="none" aria-hidden="true">
                          <path d="M0 0L4 5L8 0" stroke="#A9B4C3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                      <span
                        className="text-[11px] font-[600] text-[#697789] text-center mt-[4px] leading-tight break-words min-w-0"
                        style={{ fontFamily: SANS }}
                      >
                        new tenant
                      </span>
                    </div>

                    {/* Rented node (repeat) */}
                    <div className="min-[390px]:grid min-[390px]:grid-rows-[48px_auto]">
                      <div
                        className="rounded-[10px] border px-3 py-[7px] text-center
                                   min-[390px]:h-full min-[390px]:py-0 min-[390px]:flex min-[390px]:flex-col
                                   min-[390px]:items-center min-[390px]:justify-center"
                        style={{ background: "#EDF3FF", borderColor: "#C6D7FF" }}
                      >
                        <p className="text-[12px] font-bold text-[#1D4ED8]" style={{ fontFamily: SANS }}>Rented</p>
                        <p className="text-[11.5px] font-[600] text-[#1D4ED8]" style={{ fontFamily: SANS }}>₹3,000</p>
                      </div>
                    </div>
                  </div>

                  <p className="mt-[10px] text-[13px] font-[650] text-[#4A586B]" style={{ fontFamily: SANS }}>
                    Your rate changes automatically. No cancellation or re-signing.
                  </p>
                </div>
              )}

            </div>
          </div>
        </div>

        {/* ── Desktop semantic table (sr-only lg:not-sr-only) ── */}
        <div className="sr-only lg:not-sr-only">
          <div
            className="mt-9 rounded-[21px] overflow-hidden"
            style={{ border: "1px solid #E5E4DF", boxShadow: "0 8px 28px rgba(11,21,38,.045)" }}
          >
            <table className="w-full table-fixed border-collapse" style={{ background: "#FFFFFF" }}>

              <caption className="sr-only">Comparison of Reeve property services</caption>

              <colgroup>
                <col style={{ width: "17%" }} />
                <col style={{ width: "27.5%" }} />
                <col style={{ width: "27.5%" }} />
                <col style={{ width: "28%" }} />
              </colgroup>

              <thead>
                <tr>
                  <th scope="col" className="px-[22px] py-[18px] text-left" style={{ background: "#F6F5F1" }}>
                    <span className="text-[13px] font-bold text-[#596477]" style={{ fontFamily: SANS }}>
                      Attribute
                    </span>
                  </th>
                  {COMPARE_SERVICES.map((svc) => (
                    <th
                      key={svc.id}
                      scope="col"
                      className="px-[22px] py-[18px] text-left"
                      style={{ background: svc.headerBg, borderTop: `3px solid ${svc.headerAccent}` }}
                    >
                      <span className="text-[17px] font-bold text-[#0B1526]" style={{ fontFamily: SANS }}>
                        {svc.name}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>

                {/* Best for */}
                <tr>
                  <th
                    scope="row"
                    className="px-[22px] py-[19px] text-left align-top"
                    style={{ background: "#F8F7F4", borderTop: "1px solid #E9E8E4", borderRight: "1px solid #EFEDE8" }}
                  >
                    <span className="text-[12.5px] font-bold text-[#5E6877]" style={{ fontFamily: SANS }}>Best for</span>
                  </th>
                  {COMPARE_SERVICES.map((svc) => (
                    <td
                      key={svc.id}
                      className="px-[22px] py-[19px] text-left align-top"
                      style={{
                        borderTop: "1px solid #E9E8E4",
                        borderRight: svc.id !== "tenant" ? "1px solid #EFEDE8" : undefined,
                        fontFamily: SANS, fontSize: "14.5px", fontWeight: 500, lineHeight: 1.4, color: "#243244",
                      }}
                    >
                      {svc.bestFor}
                    </td>
                  ))}
                </tr>

                {/* Price */}
                <tr>
                  <th
                    scope="row"
                    className="px-[22px] py-[19px] text-left align-top"
                    style={{ background: "#F8F7F4", borderTop: "1px solid #E9E8E4", borderRight: "1px solid #EFEDE8" }}
                  >
                    <span className="text-[12.5px] font-bold text-[#5E6877]" style={{ fontFamily: SANS }}>Price</span>
                  </th>
                  {COMPARE_SERVICES.map((svc) => (
                    <td
                      key={svc.id}
                      className="px-[22px] py-[19px] text-left align-top"
                      style={{
                        borderTop: "1px solid #E9E8E4",
                        borderRight: svc.id !== "tenant" ? "1px solid #EFEDE8" : undefined,
                      }}
                    >
                      <p className="font-[600] text-[14.5px] text-[#243244]" style={{ fontFamily: SANS }}>{svc.priceMain}</p>
                      {svc.priceQualifier && (
                        <p className="mt-[3px] text-[12px] font-[500] text-[#7A8593]" style={{ fontFamily: SANS }}>{svc.priceQualifier}</p>
                      )}
                      {svc.priceSecondary && (
                        <p className="mt-[6px] text-[14px] font-[500] text-[#243244]" style={{ fontFamily: SANS }}>{svc.priceSecondary}</p>
                      )}
                    </td>
                  ))}
                </tr>

                {/* Minimum term / Visits / Tenant finding */}
                {(
                  [
                    { label: "Minimum term", key: "minimum" as const },
                    { label: "Visits", key: "visits" as const },
                    { label: "Tenant finding", key: "tenantFinding" as const },
                  ]
                ).map(({ label, key }) => (
                  <tr key={key}>
                    <th
                      scope="row"
                      className="px-[22px] py-[19px] text-left align-top"
                      style={{ background: "#F8F7F4", borderTop: "1px solid #E9E8E4", borderRight: "1px solid #EFEDE8" }}
                    >
                      <span className="text-[12.5px] font-bold text-[#5E6877]" style={{ fontFamily: SANS }}>{label}</span>
                    </th>
                    {COMPARE_SERVICES.map((svc) => (
                      <td
                        key={svc.id}
                        className="px-[22px] py-[19px] text-left align-top"
                        style={{
                          borderTop: "1px solid #E9E8E4",
                          borderRight: svc.id !== "tenant" ? "1px solid #EFEDE8" : undefined,
                          fontFamily: SANS, fontSize: "14.5px", fontWeight: 500, lineHeight: 1.4, color: "#243244",
                        }}
                      >
                        {svc[key]}
                      </td>
                    ))}
                  </tr>
                ))}

                {/* Afterwards */}
                <tr>
                  <th
                    scope="row"
                    className="px-[22px] py-[19px] text-left align-top"
                    style={{ background: "#F8F7F4", borderTop: "1px solid #E9E8E4", borderRight: "1px solid #EFEDE8" }}
                  >
                    <span className="text-[12.5px] font-bold text-[#5E6877]" style={{ fontFamily: SANS }}>Afterwards</span>
                  </th>
                  {COMPARE_SERVICES.map((svc) => (
                    <td
                      key={svc.id}
                      className="px-[22px] py-[19px] text-left align-top"
                      style={{
                        borderTop: "1px solid #E9E8E4",
                        borderRight: svc.id !== "tenant" ? "1px solid #EFEDE8" : undefined,
                        fontFamily: SANS, fontSize: "14.5px", fontWeight: 500, lineHeight: 1.4, color: "#243244",
                      }}
                    >
                      {renderAfterwards(svc)}
                    </td>
                  ))}
                </tr>

              </tbody>
            </table>
          </div>
        </div>

        {/* ── Desktop managed lifecycle (hidden lg:block) ── */}
        <div
          className="hidden lg:block mt-6 rounded-[16px] px-6 py-[19px]"
          style={{ background: "#F5F8FF", border: "1px solid #DCE5F6" }}
        >
          <div className="flex items-center gap-[6px] mb-[18px]">
            <span
              className="text-[11.5px] font-bold uppercase tracking-[0.06em] text-[#596B84]"
              style={{ fontFamily: SANS }}
            >
              PROPERTY MANAGEMENT
            </span>
            <span className="text-[#596B84]" aria-hidden="true">·</span>
            <span className="text-[13.5px] font-[650] text-[#0B1526]" style={{ fontFamily: SANS }}>
              Example: property up to 3 BHK
            </span>
          </div>

          {/* nodes row — items-start so arrow rows align exactly with node height */}
          <div className="flex items-start">

            {/* Rented node — 2-row grid: node (56px) + empty caption placeholder */}
            <div className="grid grid-rows-[56px_auto]">
              <div
                className="flex flex-col items-center justify-center rounded-[12px] border px-5 text-center"
                style={{ background: "#EDF3FF", borderColor: "#C6D7FF", minWidth: 120 }}
              >
                <span className="text-[12.5px] font-bold text-[#1D4ED8]" style={{ fontFamily: SANS }}>Rented</span>
                <span className="text-[12px] font-[600] text-[#1D4ED8]" style={{ fontFamily: SANS }}>₹3,000/month</span>
              </div>
            </div>

            {/* Connector 1 — 2-row grid: arrow row (56px, centered) + caption */}
            <div className="flex-1 grid grid-rows-[56px_auto]">
              <div className="flex items-center">
                <div className="flex-1 h-px" style={{ background: "#A9B4C3" }} />
                <svg width="6" height="10" viewBox="0 0 6 10" fill="none" aria-hidden="true">
                  <path d="M0 0L6 5L0 10" stroke="#A9B4C3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span className="mt-[5px] text-[11.5px] font-[600] text-[#697789] text-center" style={{ fontFamily: SANS }}>
                keys returned
              </span>
            </div>

            {/* Empty node */}
            <div className="grid grid-rows-[56px_auto]">
              <div
                className="flex flex-col items-center justify-center rounded-[12px] border px-5 text-center"
                style={{ background: "#EFFBF8", borderColor: "#CFE9E4", minWidth: 120 }}
              >
                <span className="text-[12.5px] font-bold text-[#0B8175]" style={{ fontFamily: SANS }}>Empty</span>
                <span className="text-[12px] font-[600] text-[#0B8175]" style={{ fontFamily: SANS }}>₹2,000/month</span>
              </div>
            </div>

            {/* Connector 2 */}
            <div className="flex-1 grid grid-rows-[56px_auto]">
              <div className="flex items-center">
                <div className="flex-1 h-px" style={{ background: "#A9B4C3" }} />
                <svg width="6" height="10" viewBox="0 0 6 10" fill="none" aria-hidden="true">
                  <path d="M0 0L6 5L0 10" stroke="#A9B4C3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span className="mt-[5px] text-[11.5px] font-[600] text-[#697789] text-center" style={{ fontFamily: SANS }}>
                new tenant moves in
              </span>
            </div>

            {/* Rented node (repeat) */}
            <div className="grid grid-rows-[56px_auto]">
              <div
                className="flex flex-col items-center justify-center rounded-[12px] border px-5 text-center"
                style={{ background: "#EDF3FF", borderColor: "#C6D7FF", minWidth: 120 }}
              >
                <span className="text-[12.5px] font-bold text-[#1D4ED8]" style={{ fontFamily: SANS }}>Rented</span>
                <span className="text-[12px] font-[600] text-[#1D4ED8]" style={{ fontFamily: SANS }}>₹3,000/month</span>
              </div>
            </div>

          </div>

          <p
            className="mt-[16px] text-center text-[14.5px] font-[650] text-[#243244]"
            style={{ fontFamily: SANS }}
          >
            Your rate changes automatically. No cancellation or re-signing.
          </p>
        </div>

      </div>
    </section>
  );
}

// ── Section 5: Questions ───────────────────────────────────────────────────

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
            A few things worth knowing
          </h2>

          <div className="mt-6 lg:mt-8">

            {/* FAQ 1: How long am I committing for? */}
            <div className="border-t border-[#DADCF0]">
              <details className="group">
                <summary
                  className="list-none [&::-webkit-details-marker]:hidden flex items-center justify-between gap-4 min-h-[60px] lg:min-h-[68px] py-[17px] lg:py-5 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 rounded-sm"
                  style={{ outlineColor: "#8FB7FF" }}
                >
                  <span
                    className="min-w-0 text-[15px] lg:text-[16.5px] font-[650] leading-[1.35] text-[#172235] group-open:text-[#1D4ED8]"
                    style={{ fontFamily: SANS }}
                  >
                    How long am I committing for?
                  </span>
                  {chevron}
                </summary>
                <div className="pb-[18px] lg:pb-5 pr-[34px] lg:pr-11">
                  <p style={{ fontFamily: SANS }}>
                    <span className="text-[14px] lg:text-[15px] font-[650] text-[#243244]">Property Management</span>
                    <span className="text-[14px] lg:text-[15px] font-[500] text-[#596677]">: 3-month minimum</span>
                  </p>
                  <p className="mt-[9px]" style={{ fontFamily: SANS }}>
                    <span className="text-[14px] lg:text-[15px] font-[650] text-[#243244]">Vacant Property Care</span>
                    <span className="text-[14px] lg:text-[15px] font-[500] text-[#596677]">: 6-month minimum</span>
                  </p>
                  <p className="mt-[9px]" style={{ fontFamily: SANS }}>
                    <span className="text-[14px] lg:text-[15px] font-[650] text-[#243244]">Find a Tenant</span>
                    <span className="text-[14px] lg:text-[15px] font-[500] text-[#596677]">: one-time service</span>
                  </p>
                </div>
              </details>
            </div>

            {/* FAQ 2: Can I switch services later? */}
            <div className="border-t border-[#DADCF0]">
              <details className="group">
                <summary
                  className="list-none [&::-webkit-details-marker]:hidden flex items-center justify-between gap-4 min-h-[60px] lg:min-h-[68px] py-[17px] lg:py-5 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 rounded-sm"
                  style={{ outlineColor: "#8FB7FF" }}
                >
                  <span
                    className="min-w-0 text-[15px] lg:text-[16.5px] font-[650] leading-[1.35] text-[#172235] group-open:text-[#1D4ED8]"
                    style={{ fontFamily: SANS }}
                  >
                    Can I switch services later?
                  </span>
                  {chevron}
                </summary>
                <div className="pb-[18px] lg:pb-5 pr-[34px] lg:pr-11 max-w-[720px]">
                  <p
                    className="text-[14px] lg:text-[15px] font-[500] leading-[1.55] lg:leading-[1.6] text-[#536074]"
                    style={{ fontFamily: SANS }}
                  >
                    Yes. As your property&#8217;s situation changes, you can move to the Reeve service that fits it. We&#8217;ll help you work out the right next step.
                  </p>
                </div>
              </details>
            </div>

            {/* FAQ 3: Do you serve my area? */}
            <div className="border-t border-[#DADCF0]">
              <details className="group">
                <summary
                  className="list-none [&::-webkit-details-marker]:hidden flex items-center justify-between gap-4 min-h-[60px] lg:min-h-[68px] py-[17px] lg:py-5 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 rounded-sm"
                  style={{ outlineColor: "#8FB7FF" }}
                >
                  <span
                    className="min-w-0 text-[15px] lg:text-[16.5px] font-[650] leading-[1.35] text-[#172235] group-open:text-[#1D4ED8]"
                    style={{ fontFamily: SANS }}
                  >
                    Do you serve my area?
                  </span>
                  {chevron}
                </summary>
                <div className="pb-[18px] lg:pb-5 pr-[34px] lg:pr-11 max-w-[720px]">
                  <p
                    className="text-[14px] lg:text-[15px] font-[500] leading-[1.55] lg:leading-[1.6] text-[#536074]"
                    style={{ fontFamily: SANS }}
                  >
                    Reeve serves most areas across Bangalore. We&#8217;ll confirm coverage based on your exact property location.
                  </p>
                </div>
              </details>
            </div>

            {/* FAQ 4: What happens after I enquire? */}
            <div className="border-t border-[#DADCF0]">
              <details className="group">
                <summary
                  className="list-none [&::-webkit-details-marker]:hidden flex items-center justify-between gap-4 min-h-[60px] lg:min-h-[68px] py-[17px] lg:py-5 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 rounded-sm"
                  style={{ outlineColor: "#8FB7FF" }}
                >
                  <span
                    className="min-w-0 text-[15px] lg:text-[16.5px] font-[650] leading-[1.35] text-[#172235] group-open:text-[#1D4ED8]"
                    style={{ fontFamily: SANS }}
                  >
                    What happens after I enquire?
                  </span>
                  {chevron}
                </summary>
                <div className="pb-[18px] lg:pb-5 pr-[34px] lg:pr-11 max-w-[720px]">
                  <p
                    className="text-[14px] lg:text-[15px] font-[500] leading-[1.55] lg:leading-[1.6] text-[#536074]"
                    style={{ fontFamily: SANS }}
                  >
                    We&#8217;ll review your property and location and get back to you within a day. For Property Management and Vacant Property Care, the next step can include a free property assessment before you commit.
                  </p>
                </div>
              </details>
            </div>

            {/* Bottom separator after final FAQ */}
            <div className="border-t border-[#DADCF0]" />

          </div>
        </div>
      </div>
    </section>
  );
}

const TrustMicrocopy = () => (
  <div
    className="flex items-center gap-2 text-[13px] text-[#3D5270]"
    style={{ fontFamily: SANS, fontWeight: 550 }}
  >
    <span
      className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500"
      aria-hidden="true"
    >
      <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
        <path
          d="M1 3L3 5L7 1"
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
    Rent and security deposit never pass through Reeve.
  </div>
);

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
              Share a few details. We'll work out which service fits and get back to you within a day.
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
                <PropertyEnquiryForm />
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

function StickyEnquiryCTA() {
  const [show, setShow] = useState(false);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const heroSection = document.querySelector('section[aria-label="Property services hero"]');
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

export default function PropertyServicesBangalore() {
  return (
    <Layout>
      <style>{`
        @keyframes psvHeroFadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: no-preference) {
          .psv-hero-art { animation: psvHeroFadeIn 480ms ease-out both; }
        }
        @media (prefers-reduced-motion: reduce) {
          .psv-proof-img { transition: none !important; }
        }
      `}</style>

      {/* ── Section 1: Hero ─────────────────────────────────────────── */}
      <section
        className="bg-[#FBFAF7] pt-8 pb-12 md:pt-12 md:pb-16 lg:py-20"
        aria-label="Property services hero"
      >
        <div className="mx-auto max-w-[1240px] px-5 sm:px-8 lg:px-10">
          <div className="lg:grid lg:grid-cols-[54fr_46fr] lg:items-center lg:gap-16">

            {/* Left column: copy */}
            <div className="flex flex-col gap-0">
              <p
                className="text-[11px] font-bold uppercase tracking-[0.10em] text-[#3B5B8C] sm:text-[12px]"
                style={{ fontFamily: SANS }}
              >
                PROPERTY SERVICES · BANGALORE
              </p>
              <h1
                className="mt-3 max-w-[590px] text-[38px] font-normal leading-[1.05] tracking-[-0.02em] text-[#0B1526] sm:text-[44px] lg:text-[clamp(48px,4.5vw,64px)]"
                style={{ fontFamily: SERIF }}
              >
                Property Services in Bangalore, wherever you are.
              </h1>
              <div className="mt-6" style={{ fontFamily: SANS }}>
                <p className="max-w-[520px] text-[16px] font-semibold leading-relaxed text-[#0B1526] lg:text-[19px]">
                  We manage rented properties, look after empty ones, and find tenants.
                </p>
                <p className="mt-1 text-[16px] font-medium leading-relaxed text-[#536176] lg:text-[17px]">
                  Ongoing services start at{" "}
                  <span className="font-[680] text-[#0057F2]">₹2,000/month</span>.
                </p>
              </div>
              <div
                className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center"
                style={{ fontFamily: SANS }}
              >
                <a
                  href="#services"
                  className="inline-flex w-full items-center justify-center rounded-[13px] bg-[#0057F2] px-6 font-semibold text-white shadow-[0_4px_14px_rgba(0,87,242,0.25)] transition-all duration-[160ms] hover:-translate-y-px hover:bg-[#0047D0] hover:shadow-[0_6px_20px_rgba(0,87,242,0.35)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0057F2] sm:w-auto"
                  style={{ height: 52 }}
                >
                  Find the right service ↓
                </a>
                <a
                  href="#enquiry"
                  className="group inline-flex items-center justify-center px-4 font-medium text-[#0B1526] transition-colors duration-[160ms] hover:text-[#0057F2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0057F2]"
                  style={{ height: 52 }}
                >
                  Tell us about your property{" "}
                  <span className="ml-1 transition-transform duration-150 group-hover:translate-x-[3px]">
                    →
                  </span>
                </a>
              </div>
              <div className="mt-5 hidden lg:block">
                <TrustMicrocopy />
              </div>
            </div>

            {/* Right column: artwork */}
            <div className="mt-10 lg:mt-0">
              <div className="psv-hero-art flex items-center justify-center lg:justify-end">
                <img
                  src="/images/pms_1.webp"
                  alt=""
                  role="presentation"
                  width={1448}
                  height={1086}
                  className="h-auto w-full max-w-[340px] object-contain sm:max-w-[400px] lg:max-w-none lg:w-[100%] xl:w-[104%]"
                  loading="eager"
                  fetchPriority="high"
                  decoding="async"
                />
              </div>
              <div className="mt-6 lg:hidden">
                <TrustMicrocopy />
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── Section 2: Choose ───────────────────────────────────────── */}
      <section
        id="services"
        className="bg-[#F7F9FC] scroll-mt-16 pt-[56px] pb-[60px] lg:pt-[80px] lg:pb-[88px]"
        aria-labelledby="psv-s2-heading"
      >
        <div className="mx-auto max-w-[1240px] px-5 sm:px-8 lg:px-10">

          {/* Heading */}
          <h2
            id="psv-s2-heading"
            className="text-[30px] font-normal leading-[1.06] tracking-[-0.015em] text-[#0B1526] lg:text-[clamp(36px,3vw,42px)]"
            style={{ fontFamily: SERIF }}
          >
            What's happening with your property?
          </h2>
          <p
            className="mt-3 text-[14.5px] leading-[1.45] text-[#5D6B7A] lg:text-[16px] lg:leading-[1.5]"
            style={{ fontFamily: SANS, fontWeight: 500 }}
          >
            Property Management and Vacant Property Care are{" "}
            <strong className="font-[650] text-[#0B1526]">ongoing services</strong>.{" "}
            Find a Tenant is a{" "}
            <strong className="font-[650] text-[#0B1526]">one-time service</strong>.
          </p>

          {/* Desktop cards — 3 columns at ≥1180px */}
          <div className="hidden min-[1180px]:grid min-[1180px]:grid-cols-3 gap-[22px] mt-9">
            {SERVICES.map((svc) => (
              <DesktopCard key={svc.id} svc={svc} />
            ))}
          </div>

          {/* Mobile/tablet rows — below 1180px, constrained width */}
          <div className="mt-6 flex w-full flex-col gap-[10px] sm:max-w-[760px] lg:max-w-[860px] min-[1180px]:hidden">
            {SERVICES.map((svc) => (
              <MobileRow key={svc.id} svc={svc} />
            ))}
          </div>

        </div>
      </section>

      <ProofSection />
      <CompareSection />
      <QuestionsSection />
      <EnquirySection />
      <StickyEnquiryCTA />
    </Layout>
  );
}
