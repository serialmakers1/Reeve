import { Globe, MapPin, Home, Shield, Users, BookOpen, Sparkles, Building2, FileText, Search, ChevronDown, FolderOpen, AlertTriangle, Percent, ScrollText, UserRound, Scale, Landmark } from "lucide-react";
import Layout from "@/components/Layout";
import PropertyEnquiryForm from "@/components/property-services/PropertyEnquiryForm";

const SERIF = "'Instrument Serif', Georgia, serif";
const SANS = "'DM Sans', system-ui, sans-serif";

// ── Band 1: Hero ──────────────────────────────────────────────────────────────

function NriHeroSection() {
  return (
    <section
      id="hero"
      aria-labelledby="nri-property-services-title"
      style={{
        background: `
          radial-gradient(58% 68% at 96% 4%, rgba(124,58,237,.34) 0%, rgba(124,58,237,.13) 40%, transparent 72%),
          radial-gradient(48% 58% at 92% 94%, rgba(34,211,238,.20) 0%, rgba(34,211,238,.07) 42%, transparent 74%),
          linear-gradient(125deg, #080E1D 0%, #0B1020 42%, #101735 72%, #121A3A 100%)
        `,
      }}
    >
      <div className="mx-auto max-w-[1320px] px-5 sm:px-8 lg:px-12">

        {/* Desktop: two-column grid. Mobile: single column. */}
        <div className="lg:grid lg:grid-cols-[minmax(0,1.12fr)_minmax(420px,.88fr)] lg:gap-9 lg:items-start">

          {/* ── Left copy column ── */}
          <div className="pt-12 sm:pt-16 lg:pt-[80px] lg:pb-[64px] max-w-[670px]">

            {/* Eyebrow */}
            <p
              className="text-[13px] font-[600] uppercase tracking-[0.11em] text-[#67E8F9]"
              style={{ fontFamily: SANS }}
            >
              NRI PROPERTY SERVICES · INDIA
            </p>

            {/* H1 — no animation (LCP rule) */}
            <h1
              id="nri-property-services-title"
              className="mt-4 text-[clamp(38px,10vw,46px)] lg:text-[clamp(48px,4.2vw,68px)] text-[#F8FAFC]"
              style={{ fontFamily: SERIF, fontWeight: 400, lineHeight: 1.03 }}
            >
              NRI Property Services in India
            </h1>

            {/* Positioning line */}
            <p
              className="mt-[18px] text-[20px] lg:text-[26px] font-[600] text-[#F8FAFC]"
              style={{ fontFamily: SANS, lineHeight: 1.2 }}
            >
              One point of contact in India for your property.
            </p>

            {/* Capability statement */}
            <p
              className="mt-[18px] text-[16px] lg:text-[17px] text-[#D7E2F2]"
              style={{ fontFamily: SANS, fontWeight: 475, lineHeight: 1.55 }}
            >
              Reeve helps NRI owners manage rented or vacant properties, find tenants, coordinate property sales, coordinate rent and sale tax matters through licensed professionals, and sort out property documents and records.
            </p>

            {/* Supporting paragraph */}
            <p
              className="mt-[10px] text-[15px] lg:text-[16px] font-[400] text-[#A7B5C9]"
              style={{ fontFamily: SANS, lineHeight: 1.55 }}
            >
              Instead of coordinating relatives, brokers, CAs, advocates, contractors and government offices separately, you work through one Reeve relationship.
            </p>

            {/* Scope panel */}
            <div
              role="group"
              aria-label="Where Reeve can help"
              className="mt-[32px] rounded-2xl border border-[rgba(255,255,255,.10)] bg-[rgba(255,255,255,.045)] p-[17px]"
            >
              {/* Row 1: Remote / India */}
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-[rgba(255,255,255,.06)]">
                  <Globe size={18} color="#67E8F9" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-[14px] lg:text-[15px] leading-[1.3]" style={{ fontFamily: SANS }}>
                    <span className="text-[#A7B5C9] font-[500]">Coordinated remotely · </span>
                    <span className="text-[#F8FAFC] font-[650]">Anywhere in India</span>
                  </p>
                  <p
                    className="mt-[5px] text-[13.5px] lg:text-[14px] leading-[1.45] text-[#D7E2F2] font-[450]"
                    style={{ fontFamily: SANS }}
                  >
                    Sale documentation &amp; tax · Rent/TDS · Legal &amp; professional work · Property documentation
                  </p>
                </div>
              </div>

              <div className="my-[14px] border-t border-[rgba(255,255,255,.08)]" />

              {/* Row 2: On-ground / Bangalore */}
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-[rgba(255,255,255,.06)]">
                  <MapPin size={18} color="#67E8F9" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-[14px] lg:text-[15px] leading-[1.3]" style={{ fontFamily: SANS }}>
                    <span className="text-[#A7B5C9] font-[500]">We come to the property · </span>
                    <span className="text-[#F8FAFC] font-[650]">Bangalore</span>
                  </p>
                  <p
                    className="mt-[5px] text-[13.5px] lg:text-[14px] leading-[1.45] text-[#D7E2F2] font-[450]"
                    style={{ fontFamily: SANS }}
                  >
                    Property management · Vacant care · Tenant placement · Khata · Sale execution
                  </p>
                </div>
              </div>
            </div>

            {/* CTA row */}
            <div className="mt-[30px] flex flex-col gap-3 sm:flex-row sm:items-center">

              {/* Primary CTA */}
              <a
                href="#enquiry"
                className="group inline-flex w-full items-center justify-center rounded-[12px] bg-[#2563EB] px-6 min-h-[52px] py-3 font-semibold text-white transition-all duration-[160ms] hover:bg-[#1D4ED8] hover:shadow-[0_6px_18px_rgba(37,99,235,.35)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB] motion-reduce:transition-none sm:w-auto"
                style={{ fontFamily: SANS }}
              >
                Tell us what you&#8217;re dealing with{" "}
                <span className="ml-1 transition-transform duration-150 group-hover:translate-x-[3px] motion-reduce:transform-none">→</span>
              </a>

              {/* Secondary CTA */}
              <a
                href="#situations"
                className="group inline-flex items-center justify-center px-2 font-medium text-[#93C5FD] transition-colors duration-[160ms] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB] motion-reduce:transition-none"
                style={{ height: 52, fontFamily: SANS }}
              >
                Find the right kind of help{" "}
                <span className="ml-1 transition-transform duration-150 group-hover:translate-y-[3px] motion-reduce:transform-none">↓</span>
              </a>
            </div>

            {/* Information shortcuts */}
            <div className="mt-[32px]">
              <p
                className="mb-[10px] text-[13px] text-[#A7B5C9]"
                style={{ fontFamily: SANS }}
              >
                Looking for information?
              </p>

              {/* Horizontally scrollable chips */}
              <div
                className="flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" } as React.CSSProperties}
              >
                {[
                  { href: "#manage-property-india-from-abroad", label: "Managing from abroad" },
                  { href: "#sell-property-india-from-abroad", label: "Selling or renting" },
                  { href: "#khata-mutation-registration", label: "Ownership & documents" },
                ].map(({ href, label }) => (
                  <a
                    key={href}
                    href={href}
                    className="flex-shrink-0 inline-flex items-center rounded-full border border-[rgba(255,255,255,.10)] bg-[rgba(255,255,255,.04)] px-4 text-[13.5px] text-[#D7E2F2] font-[500] transition-all duration-[150ms] whitespace-nowrap hover:bg-[rgba(34,211,238,.08)] hover:border-[rgba(103,232,249,.35)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2563EB] motion-reduce:transition-none"
                    style={{ height: 34, fontFamily: SANS }}
                  >
                    {label}
                  </a>
                ))}
              </div>
            </div>

          </div>{/* end left copy column */}

          {/* ── Right column: desktop artwork ── */}
          <div className="hidden lg:flex items-start justify-center pt-[60px] relative min-w-0">
            {/* Faint dot grid behind the image */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              style={{
                backgroundImage: "radial-gradient(circle, rgba(255,255,255,.045) 1px, transparent 1px)",
                backgroundSize: "28px 28px",
                opacity: 0.9,
                zIndex: 0,
              }}
            />
            <img
              src="/images/nrihub_1.webp"
              alt="Reeve coordinating your property, CA, advocate, tenant or buyer, documents and authorities."
              width={1254}
              height={1254}
              loading="eager"
              fetchPriority="high"
              decoding="async"
              className="h-auto w-full object-contain"
              style={{ maxWidth: 560, position: "relative", zIndex: 1 }}
            />
          </div>

        </div>{/* end desktop grid */}

        {/* ── Mobile / tablet artwork — comes after all copy ── */}
        <div className="lg:hidden flex justify-center pt-8 pb-10 sm:pb-12">
          <img
            src="/images/nrihub_1.webp"
            alt="Reeve coordinating your property, CA, advocate, tenant or buyer, documents and authorities."
            width={1254}
            height={1254}
            loading="eager"
            decoding="async"
            className="h-auto w-[min(78vw,300px)] md:w-[min(55vw,420px)] object-contain"
          />
        </div>

      </div>
    </section>
  );
}

// ── Band 2: Situation Router ──────────────────────────────────────────────────

// Composed icon artifacts for the four primary situation tiles
function RentedIcon() {
  return (
    <span className="relative flex items-center justify-center" aria-hidden="true">
      <Home size={16} />
      <Users size={9} className="absolute bottom-[-2px] right-[-3px]" />
    </span>
  );
}

function EmptyIcon() {
  return (
    <span className="relative flex items-center justify-center" aria-hidden="true">
      <Home size={16} />
      <Shield size={9} className="absolute bottom-[-2px] right-[-3px]" />
    </span>
  );
}

function SaleIcon() {
  return (
    <span className="relative flex items-end gap-[2px]" aria-hidden="true">
      <Building2 size={15} />
      <FileText size={10} className="mb-[-1px]" />
    </span>
  );
}

function TenantIcon() {
  return (
    <span className="relative flex items-center justify-center" aria-hidden="true">
      <Users size={16} />
      <Search size={8} className="absolute bottom-[-2px] right-[-3px]" />
    </span>
  );
}

const PRIMARY_SITUATIONS = [
  {
    title: "My property is rented and I live abroad",
    line: "Tenant coordination and ongoing property management.",
    href: "/property-management-bangalore",
    accent: "#0EA5B7",
    plateBg: "#E8FAFD",
    cornerTint: "rgba(34,211,238,.08)",
    icon: <RentedIcon />,
  },
  {
    title: "My property is empty and nobody is looking after it",
    line: "Inspections, upkeep and vacant-property care.",
    href: "/vacant-property-care-bangalore",
    accent: "#7C3AED",
    plateBg: "#F2EDFF",
    cornerTint: "rgba(124,58,237,.07)",
    icon: <EmptyIcon />,
  },
  {
    title: "I want to sell my Indian property",
    line: "Sale readiness, marketing where available, documentation and tax coordination.",
    href: "/nri-property-sale-india",
    accent: "#2563EB",
    plateBg: "#EDF4FF",
    cornerTint: "rgba(37,99,235,.075)",
    icon: <SaleIcon />,
  },
  {
    title: "I need a tenant",
    line: "Tenant placement and move-in coordination.",
    href: "/find-tenant-bangalore",
    accent: "#0F9F8F",
    plateBg: "#E9FAF6",
    cornerTint: "rgba(15,159,143,.07)",
    icon: <TenantIcon />,
  },
];

const OTHER_SITUATIONS = [
  { label: "Tax is being deducted from my Indian rent", href: "/nri-rent-tds-india" },
  { label: "I need khata, mutation or document work", href: "#khata-mutation-registration" },
  { label: "I inherited or received a property", href: "#inherited-property-nri" },
  { label: "I have several properties to coordinate", href: "#enquiry" },
];

const BANGALORE_ROWS = [
  { title: "Reeve Managed", desc: "Property management", href: "/property-management-bangalore" },
  { title: "Reeve Watch", desc: "Vacant property care", href: "/vacant-property-care-bangalore" },
  { title: "Reeve Let", desc: "Find a tenant", href: "/find-tenant-bangalore" },
  { title: "Khata & Mutation", desc: null, href: "/khata-transfer-bangalore" },
  {
    title: "NRI Sale Support · On-ground execution",
    desc: "Photography · viewings · local registration coordination",
    href: "/nri-property-sale-india",
  },
];

const INDIA_ROWS = [
  { title: "NRI Sale Support · Documentation & tax", href: "/nri-property-sale-india" },
  { title: "NRI Rent & TDS", href: "/nri-rent-tds-india" },
  { title: "Property & professional coordination", href: "#enquiry" },
];

function NriSituationsSection() {
  return (
    <section
      id="situations"
      aria-labelledby="situations-heading"
      className="scroll-mt-16"
      style={{
        background: `
          radial-gradient(45% 35% at 92% 8%, rgba(124,58,237,.035), transparent 72%),
          radial-gradient(38% 28% at 6% 48%, rgba(34,211,238,.03), transparent 72%),
          linear-gradient(180deg, #FFFDF9 0%, #FBF7F0 52%, #FFFDFC 100%)
        `,
      }}
    >
      <div className="mx-auto max-w-[1240px] px-5 sm:px-8 lg:px-10 pt-16 sm:pt-[72px] lg:pt-[96px] pb-[72px] sm:pb-[80px] lg:pb-[96px]">

        {/* ── Section intro ── */}
        <h2
          id="situations-heading"
          className="text-[clamp(32px,9vw,36px)] lg:text-[clamp(42px,3.2vw,46px)] text-[#0B1526]"
          style={{ fontFamily: SERIF, fontWeight: 400, lineHeight: 1.05, letterSpacing: "-0.015em" }}
        >
          What are you dealing with?
        </h2>
        <p
          className="mt-3 text-[15.5px] lg:text-[17px] font-[600] text-[#536176]"
          style={{ fontFamily: SANS, lineHeight: 1.5 }}
        >
          You don&#8217;t need to know which service you need.
        </p>

        {/* ── Four primary situation tiles — 2×2 grid ── */}
        <div className="mt-8 lg:mt-[36px] grid grid-cols-2 gap-[10px] sm:gap-[14px] lg:gap-[22px]">
          {PRIMARY_SITUATIONS.map((tile) => (
            <a
              key={tile.href}
              href={tile.href}
              className="group relative min-w-0 flex flex-col lg:grid lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center lg:gap-5 rounded-2xl lg:rounded-[20px] border border-[#E6E0D7] bg-[#FFFDF9] p-4 lg:p-5 shadow-[0_5px_18px_rgba(11,21,38,.045)] transition-all duration-[190ms] hover:border-[var(--accent)] hover:shadow-[0_12px_28px_rgba(11,21,38,.09)] hover:-translate-y-[3px] motion-reduce:hover:translate-y-0 motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB]"
              style={{ "--accent": tile.accent } as React.CSSProperties}
            >
              {/* Corner radial tint — behind content, transitions opacity on hover */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute top-0 right-0 w-24 h-24 rounded-tr-[20px] opacity-70 transition-opacity duration-[190ms] group-hover:opacity-100 motion-reduce:transition-none"
                style={{ background: `radial-gradient(circle at 100% 0%, ${tile.cornerTint} 0%, transparent 65%)`, zIndex: 0 }}
              />

              {/* Child 1: Icon plate — backing plate permanently displaced */}
              <div className="relative flex-shrink-0 w-[38px] h-[38px] lg:w-11 lg:h-11">
                <span
                  aria-hidden="true"
                  className="absolute inset-0 rounded-xl opacity-50"
                  style={{ background: tile.plateBg, transform: "translate(3px, 3px)" }}
                />
                <span
                  className="relative z-[1] flex h-full w-full items-center justify-center rounded-xl transition-transform duration-[190ms] group-hover:-translate-y-[1px] motion-reduce:transform-none"
                  style={{ background: tile.plateBg, color: tile.accent }}
                >
                  {tile.icon}
                </span>
              </div>

              {/* Child 2: Copy block */}
              <div className="min-w-0 relative z-[1]">
                <h3
                  className="mt-3 lg:mt-0 text-[14.5px] sm:text-[16px] lg:text-[19px] text-[#172235]"
                  style={{ fontFamily: SANS, fontWeight: 650, lineHeight: 1.25 }}
                >
                  {tile.title}
                </h3>
                <p
                  className="mt-[6px] lg:mt-1.5 text-[12.5px] sm:text-[13.5px] lg:text-[14px] text-[#5D6878]"
                  style={{ fontFamily: SANS, fontWeight: 450, lineHeight: 1.42 }}
                >
                  {tile.line}
                </p>
              </div>

              {/* Child 3: Arrow */}
              <div
                className="mt-auto pt-4 lg:mt-0 lg:pt-0 flex-shrink-0 relative z-[1] flex items-center gap-1 text-[13px] font-[600]"
                style={{ color: tile.accent, fontFamily: SANS }}
              >
                <span className="transition-transform duration-[150ms] group-hover:translate-x-[3px] motion-reduce:transform-none">→</span>
              </div>
            </a>
          ))}
        </div>

        {/* ── Other common situations — 2×2 compact routes ── */}
        <div className="mt-[36px] lg:mt-[42px]">
          <h3
            className="text-[16px] lg:text-[17px] text-[#172235]"
            style={{ fontFamily: SANS, fontWeight: 650 }}
          >
            Other common situations
          </h3>

          <div className="mt-[14px] lg:mt-[16px] grid grid-cols-2 gap-[8px] sm:gap-[10px] lg:gap-[12px]">
            {OTHER_SITUATIONS.map(({ label, href }) => (
              <a
                key={href}
                href={href}
                className="group relative flex min-w-0 items-start justify-between gap-2 rounded-[13px] border border-[#DED9D0] bg-[#FFFDF9] px-3 py-3 min-h-[48px] text-[#334155] transition-all duration-[160ms] hover:bg-[#F7FAFF] hover:border-[#C3D4F5] hover:text-[#1D4ED8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB] motion-reduce:transition-none"
              >
                <span
                  className="min-w-0 text-[12.5px] lg:text-[13.5px] font-[500] leading-[1.4] self-center"
                  style={{ fontFamily: SANS }}
                >
                  {label}
                </span>
                <span className="flex-shrink-0 text-[#64748B] group-hover:text-[#1D4ED8] transition-transform duration-[160ms] group-hover:translate-x-[2px] motion-reduce:transform-none self-center">
                  →
                </span>
              </a>
            ))}
          </div>
        </div>

        {/* ── Guide route banner ── */}
        <div
          className="mt-[28px] lg:mt-[32px] rounded-[18px] border border-[#E2D7FA] p-4 lg:p-5 flex items-start gap-4"
          style={{ background: "#F6F1FF" }}
        >
          {/* 2.5D book artifact */}
          <div className="relative flex-shrink-0 w-10 h-10 lg:w-11 lg:h-11">
            <span
              aria-hidden="true"
              className="absolute inset-0 rounded-xl opacity-40"
              style={{ background: "#DDD0FA", transform: "translate(3px, 3px)" }}
            />
            <span
              className="relative z-[1] flex h-full w-full items-center justify-center rounded-xl"
              style={{ background: "#EDE5FF", color: "#7C3AED" }}
            >
              <BookOpen size={18} aria-hidden="true" />
            </span>
          </div>

          {/* Copy */}
          <div>
            <h3
              className="text-[16px] lg:text-[17px] text-[#29233A]"
              style={{ fontFamily: SANS, fontWeight: 650 }}
            >
              Still working out what you&#8217;re dealing with?
            </h3>
            <a
              href="#nri-property-guide"
              className="group mt-[6px] inline-flex items-center gap-1 text-[15px] font-[600] text-[#5B3BC4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C3AED]"
              style={{ fontFamily: SANS }}
            >
              Read the common NRI property questions
              <span className="transition-transform duration-[150ms] group-hover:translate-y-[2px] motion-reduce:transform-none">↓</span>
            </a>
          </div>
        </div>

        {/* ── Something Else strip ── */}
        <div
          className="mt-[20px] lg:mt-[24px] rounded-[20px] border border-[rgba(249,115,91,.20)] p-5 lg:p-6"
          style={{
            background: `
              radial-gradient(45% 120% at 0% 0%, rgba(249,115,91,.11), transparent 70%),
              radial-gradient(45% 120% at 100% 100%, rgba(34,211,238,.09), transparent 72%),
              linear-gradient(105deg, #FFF0EB 0%, #F7EEFF 52%, #ECF9FC 100%)
            `,
          }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Left: decorative spark + copy */}
            <div className="flex items-start gap-3">
              <Sparkles size={20} color="#F9735B" aria-hidden="true" className="flex-shrink-0 mt-[3px]" />
              <div>
                <h3
                  className="text-[21px] lg:text-[24px] leading-[1.2] text-[#172235]"
                  style={{ fontFamily: SERIF, fontWeight: 400 }}
                >
                  Something else entirely?
                </h3>
                <p
                  className="mt-[6px] text-[14px] lg:text-[15px] font-[450] leading-[1.5] text-[#536176]"
                  style={{ fontFamily: SANS }}
                >
                  Your situation doesn&#8217;t need to fit one of these labels. Tell us what&#8217;s happening.
                </p>
              </div>
            </div>

            {/* Right: white/blue CTA */}
            <a
              href="#enquiry"
              className="flex-shrink-0 group inline-flex items-center justify-center gap-2 rounded-[11px] bg-[#FFFDFC] border border-[rgba(37,99,235,.18)] px-5 min-h-[44px] py-2.5 font-[650] text-[#2563EB] text-[14.5px] shadow-[0_2px_8px_rgba(37,99,235,.10)] transition-all duration-[160ms] hover:bg-white hover:shadow-[0_4px_14px_rgba(37,99,235,.18)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB] motion-reduce:transition-none whitespace-nowrap"
              style={{ fontFamily: SANS }}
            >
              Tell Reeve
              <span className="transition-transform duration-[150ms] group-hover:translate-x-[3px] motion-reduce:transform-none">→</span>
            </a>
          </div>
        </div>

        {/* ── Service Navigator ── */}
        <div className="mt-[48px] lg:mt-[56px]">
          <h3
            className="text-[clamp(25px,7vw,27px)] lg:text-[clamp(28px,2.5vw,30px)] text-[#0B1526]"
            style={{ fontFamily: SERIF, fontWeight: 400, lineHeight: 1.1 }}
          >
            Prefer to browse by service?
          </h3>

          {/* Navigator shell */}
          <div
            className="mt-[20px] lg:mt-[24px] rounded-[22px] border border-[#E3DED5] shadow-[0_8px_30px_rgba(11,21,38,.045)] lg:grid lg:grid-cols-[52fr_48fr]"
            style={{ background: "#FFFEFC" }}
          >

            {/* ── Bangalore group ── */}
            <div className="p-5 lg:p-7">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "#2563EB" }} aria-hidden="true" />
                <h4 className="text-[13px] font-[600]" style={{ fontFamily: SANS }}>
                  <span className="text-[#64748B]">We come to the property · </span>
                  <span className="text-[#1D4ED8]">Bangalore</span>
                </h4>
              </div>

              <div>
                {BANGALORE_ROWS.map((row, i) => (
                  <div key={row.href + i} className="border-t border-[#ECE8E1]">
                    <a
                      href={row.href}
                      className="group flex items-center justify-between gap-3 py-[14px] lg:py-[15px] min-h-[54px] transition-all duration-[160ms] hover:bg-[#F5F8FF] -mx-2 px-2 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB] motion-reduce:transition-none"
                    >
                      <div className="min-w-0">
                        <p
                          className="text-[14.5px] lg:text-[15px] font-[600] text-[#243244] group-hover:text-[#1D4ED8] transition-colors duration-[160ms]"
                          style={{ fontFamily: SANS }}
                        >
                          {row.title}
                        </p>
                        {row.desc && (
                          <p
                            className="mt-[2px] text-[12.5px] lg:text-[13px] text-[#6B7280]"
                            style={{ fontFamily: SANS }}
                          >
                            {row.desc}
                          </p>
                        )}
                      </div>
                      <span className="flex-shrink-0 text-[#64748B] group-hover:text-[#1D4ED8] transition-transform duration-[160ms] group-hover:translate-x-[3px] motion-reduce:transform-none">
                        →
                      </span>
                    </a>
                  </div>
                ))}
              </div>
            </div>

            {/* ── India-wide group — border handles both mobile (top) and desktop (left) ── */}
            <div className="border-t border-[#ECE8E1] lg:border-t-0 lg:border-l lg:border-[#ECE8E1] p-5 lg:p-7">
              <div className="flex items-center gap-2 mb-4">
                <Globe size={14} color="#0EA5B7" aria-hidden="true" />
                <h4 className="text-[13px] font-[600]" style={{ fontFamily: SANS }}>
                  <span className="text-[#64748B]">Coordinated remotely · </span>
                  <span style={{ color: "#0E7490" }}>Anywhere in India</span>
                </h4>
              </div>

              <div>
                {INDIA_ROWS.map((row, i) => (
                  <div key={row.href + i} className="border-t border-[#ECE8E1]">
                    <a
                      href={row.href}
                      className="group flex items-center justify-between gap-3 py-[14px] lg:py-[15px] min-h-[54px] transition-all duration-[160ms] hover:bg-[#F5F8FF] -mx-2 px-2 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB] motion-reduce:transition-none"
                    >
                      <p
                        className="min-w-0 text-[14.5px] lg:text-[15px] font-[600] text-[#243244] group-hover:text-[#1D4ED8] transition-colors duration-[160ms]"
                        style={{ fontFamily: SANS }}
                      >
                        {row.title}
                      </p>
                      <span className="flex-shrink-0 text-[#64748B] group-hover:text-[#1D4ED8] transition-transform duration-[160ms] group-hover:translate-x-[3px] motion-reduce:transform-none">
                        →
                      </span>
                    </a>
                  </div>
                ))}
              </div>

              {/* Quieter bottom catchall */}
              <div className="border-t border-[#ECE8E1]">
                <a
                  href="#enquiry"
                  className="group flex items-center py-[12px] min-h-[48px] -mx-2 px-2 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB] motion-reduce:transition-none"
                >
                  <span
                    className="text-[13px] font-[500] text-[#6B7280] group-hover:text-[#1D4ED8] transition-colors duration-[160ms]"
                    style={{ fontFamily: SANS }}
                  >
                    Not sure where your situation fits? Tell us what&#8217;s happening →
                  </span>
                </a>
              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}

// ── Band 3: Coordinator (Concierge + Process) ────────────────────────────────

const CONCIERGE_PANELS = [
  {
    id: "docs",
    heading: "Documents & records",
    visible: "Power of Attorney · Encumbrance Certificate (EC) · certified copies · khata/mutation · municipal records",
    items: [
      "Property tax records",
      "Association/society documentation",
      "NOCs where applicable",
      "Document collection",
      "Certified copies",
      "Other property records",
    ],
    accent: "#7C3AED",
    plateFg: "#EEE9FF",
    plateBg: "#DDD3FA",
    overlayTint: "rgba(124,58,237,.06)",
    moreColor: "#7C3AED",
    badge: null as string | null,
    qualifier: null as { text: string } | null,
    iconType: "docs" as const,
  },
  {
    id: "inheritance",
    heading: "Inheritance & ownership",
    visible: "Inherited property · succession coordination · co-owner matters · record updates",
    items: [
      "Missing ownership documents",
      "Heir/co-heir coordination",
      "Legal review",
      "Record updates",
      "Preparing inherited property for management or sale",
    ],
    accent: "#5B5BD6",
    plateFg: "#ECEEFF",
    plateBg: "#DDE0FA",
    overlayTint: "rgba(91,91,214,.06)",
    moreColor: "#5B5BD6",
    badge: null as string | null,
    qualifier: null as { text: string } | null,
    iconType: "inheritance" as const,
  },
  {
    id: "sale",
    heading: "Sale, tax & professional work",
    visible: "Title review · CA coordination · advocate coordination · sale documents · tax coordination",
    items: [
      "Buyer documentation",
      "Withholding/TDS matters",
      "Lower-deduction work where applicable",
      "Remittance-related professional coordination",
      "Registration preparation",
      "Other professional documentation",
    ],
    accent: "#2563EB",
    plateFg: "#EAF2FF",
    plateBg: "#C7DEFF",
    overlayTint: "rgba(37,99,235,.055)",
    moreColor: "#2563EB",
    badge: null as string | null,
    qualifier: {
      text: "Remote professional and document coordination is available across India. Photography, viewings and physical sale execution are currently Bangalore-only.",
    } as { text: string } | null,
    iconType: "sale" as const,
  },
  {
    id: "onground",
    heading: "On-ground property work",
    visible: "Inspections · repairs · possession · handover · tenant/property issues",
    items: [
      "Photography",
      "Property viewings",
      "Local sale coordination",
      "Vacant-property visits",
      "Document pickup",
      "Builder/society interactions",
    ],
    accent: "#0F9F8F",
    plateFg: "#E7F8F5",
    plateBg: "#D4F0EA",
    overlayTint: "rgba(15,159,143,.06)",
    moreColor: "#0F9F8F",
    badge: "BANGALORE" as string | null,
    qualifier: null as { text: string } | null,
    iconType: "onground" as const,
  },
];

const PROCESS_STEPS = [
  {
    num: "01",
    title: "Tell us what's happening",
    body: "Share the situation and whatever information or documents you already have.",
    fill: "#2563EB",
    backing: "#E7F0FF",
  },
  {
    num: "02",
    title: "We work out what's involved",
    body: "Reeve determines the work, documents and professionals involved and explains the scope before you decide whether to proceed.",
    fill: "#7C3AED",
    backing: "#EFE8FF",
  },
  {
    num: "03",
    title: "The work gets done — and we stay on it",
    body: "Reeve handles eligible direct work, coordinates licensed professionals where required and keeps the follow-ups and documentation moving through one point of contact.",
    fill: "#0F9F8F",
    backing: "#E6F8F5",
  },
];

function ConciergeIcon({ type, plateFg, plateBg, accent }: { type: typeof CONCIERGE_PANELS[number]["iconType"]; plateFg: string; plateBg: string; accent: string }) {
  const plateBase = "absolute inset-0 rounded-xl opacity-50";
  const plateMain = "relative z-[1] flex h-full w-full items-center justify-center rounded-xl";
  const wrapper = "relative flex-shrink-0 w-[38px] h-[38px] lg:w-11 lg:h-11";

  if (type === "docs") {
    return (
      <span className={wrapper} style={{ display: "block" }}>
        <span aria-hidden="true" className={plateBase} style={{ background: plateBg, transform: "translate(3px, 3px)" }} />
        <span className={`${plateMain} group-open:-translate-y-[1px] transition-transform duration-[160ms] motion-reduce:transform-none`} style={{ background: plateFg, color: accent }}>
          <span className="relative flex items-center justify-center" aria-hidden="true">
            <FileText size={16} />
            <FolderOpen size={9} className="absolute bottom-[-2px] right-[-3px]" />
          </span>
        </span>
      </span>
    );
  }
  if (type === "inheritance") {
    return (
      <span className={wrapper} style={{ display: "block" }}>
        <span aria-hidden="true" className={plateBase} style={{ background: plateBg, transform: "translate(3px, 3px)" }} />
        <span className={`${plateMain} group-open:-translate-y-[1px] transition-transform duration-[160ms] motion-reduce:transform-none`} style={{ background: plateFg, color: accent }}>
          <span className="relative flex items-center justify-center" aria-hidden="true">
            <Users size={16} />
            <Home size={9} className="absolute bottom-[-2px] right-[-3px]" />
          </span>
        </span>
      </span>
    );
  }
  if (type === "sale") {
    return (
      <span className={wrapper} style={{ display: "block" }}>
        <span aria-hidden="true" className={plateBase} style={{ background: plateBg, transform: "translate(3px, 3px)" }} />
        <span className={`${plateMain} group-open:-translate-y-[1px] transition-transform duration-[160ms] motion-reduce:transform-none`} style={{ background: plateFg }}>
          <span className="relative flex items-end gap-[2px]" aria-hidden="true">
            <Building2 size={15} color="#2563EB" />
            <FileText size={9} color="#7C3AED" className="mb-[-1px]" />
          </span>
        </span>
      </span>
    );
  }
  // onground
  return (
    <span className={wrapper} style={{ display: "block" }}>
      <span aria-hidden="true" className={plateBase} style={{ background: plateBg, transform: "translate(3px, 3px)" }} />
      <span className={`${plateMain} group-open:-translate-y-[1px] transition-transform duration-[160ms] motion-reduce:transform-none`} style={{ background: plateFg, color: accent }}>
        <span className="relative flex items-center justify-center" aria-hidden="true">
          <Home size={16} />
          <MapPin size={9} className="absolute bottom-[-2px] right-[-3px]" />
        </span>
      </span>
    </span>
  );
}

function NriCoordinatorBand() {
  return (
    <div
      style={{
        background: `
          radial-gradient(52% 42% at 6% 8%, rgba(34,211,238,.075) 0%, rgba(34,211,238,.025) 45%, transparent 76%),
          radial-gradient(48% 44% at 94% 18%, rgba(124,58,237,.095) 0%, rgba(124,58,237,.035) 44%, transparent 76%),
          linear-gradient(180deg, #F5F7FF 0%, #EEF1FF 50%, #F4F5FF 100%)
        `,
      }}
    >
      <style>{`
        @keyframes nri-b3-flow-h {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }

        @keyframes nri-b3-flow-v-12 {
          0%   { background-position: center -200%; opacity: 0; }
          5%   { opacity: .42; }
          45%  { opacity: .42; }
          50%  { background-position: center 200%; opacity: 0; }
          100% { opacity: 0; }
        }

        @keyframes nri-b3-flow-v-23 {
          0%,
          50% { opacity: 0; }
          55% { background-position: center -200%; opacity: .42; }
          95% { opacity: .42; }
          100%{ background-position: center 200%; opacity: 0; }
        }

        @media (prefers-reduced-motion: no-preference) {
          .nri-b3-conn-h {
            animation: nri-b3-flow-h 6s linear infinite;
          }
          .nri-b3-conn-v-12 {
            animation: nri-b3-flow-v-12 6s linear infinite;
          }
          .nri-b3-conn-v-23 {
            animation: nri-b3-flow-v-23 6s linear infinite;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .nri-b3-conn-h,
          .nri-b3-conn-v-12,
          .nri-b3-conn-v-23 {
            display: none;
          }
        }
      `}</style>

      <div className="mx-auto max-w-[1240px] px-5 sm:px-8 lg:px-10">

        {/* ── 3A: Concierge ── */}
        <section id="concierge" aria-labelledby="concierge-heading" className="scroll-mt-16 pt-16 sm:pt-[76px] lg:pt-[96px]">

          <h2
            id="concierge-heading"
            className="text-[clamp(32px,8.5vw,35px)] sm:text-[40px] lg:text-[clamp(42px,3.2vw,46px)] max-w-[760px] text-[#0B1526]"
            style={{ fontFamily: SERIF, fontWeight: 400, lineHeight: 1.06, letterSpacing: "-0.015em" }}
          >
            Property work doesn&#8217;t always fit a service name
          </h2>

          <p
            className="mt-4 max-w-[760px] text-[15.5px] lg:text-[17px] text-[#536176]"
            style={{ fontFamily: SANS, fontWeight: 475, lineHeight: 1.6 }}
          >
            If something needs to happen around your property in India, tell us the situation.
            Reeve works out which people, documents and on-ground steps are involved, then
            coordinates the work through one point of contact.
          </p>

          {/* Disclosure grid — stacked phone, 2×2 desktop */}
          <div className="mt-8 lg:mt-10 flex flex-col gap-[12px] lg:grid lg:grid-cols-2 lg:gap-[18px] lg:items-start">
            {CONCIERGE_PANELS.map((panel) => (
              <details key={panel.id} className="group relative rounded-[18px] lg:rounded-[20px] border border-[#DCE1F3] shadow-[0_7px_24px_rgba(35,45,85,.055)] overflow-hidden" style={{ background: "rgba(255,255,255,.72)" }}>

                {/* Radial tint overlay — transitions on hover/open */}
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 opacity-[0.4] group-open:opacity-[0.65] group-hover:opacity-[0.55] transition-opacity duration-[160ms] motion-reduce:transition-none"
                  style={{
                    background: `radial-gradient(circle at 8% 8%, ${panel.overlayTint} 0%, transparent 55%)`,
                    zIndex: 0,
                  }}
                />

                {/* Summary — CSS grid layout, valid HTML phrasing + heading content only */}
                <summary
                  className="grid grid-cols-[38px_minmax(0,1fr)] lg:grid-cols-[44px_minmax(0,1fr)] gap-x-3 lg:gap-x-4 list-none [&::-webkit-details-marker]:hidden cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#5B5BD6] p-4 lg:p-5 relative z-[1]"
                >
                  {/* Icon plate — spans 2 rows */}
                  <span className="row-span-2 flex flex-col items-start">
                    <ConciergeIcon type={panel.iconType} plateFg={panel.plateFg} plateBg={panel.plateBg} accent={panel.accent} />
                  </span>

                  {/* Category heading */}
                  {panel.badge ? (
                    <h3
                      className="text-[15.5px] lg:text-[18.5px] font-[650] leading-[1.25] text-[#172235]"
                      style={{ fontFamily: SANS }}
                    >
                      {panel.heading}{" "}
                      <span
                        className="inline-flex items-center rounded-full px-[9px] text-[11px] font-[700] uppercase tracking-[0.07em] border border-[#C7D8FF] bg-[#E9F1FF] text-[#1D4ED8]"
                        style={{ height: 26 }}
                      >
                        {panel.badge}
                      </span>
                    </h3>
                  ) : (
                    <h3
                      className="text-[15.5px] lg:text-[18.5px] font-[650] leading-[1.25] text-[#172235]"
                      style={{ fontFamily: SANS }}
                    >
                      {panel.heading}
                    </h3>
                  )}

                  {/* Visible examples */}
                  <span
                    className="block mt-[6px] text-[12.5px] lg:text-[14px] font-[500] leading-[1.5] text-[#536176]"
                    style={{ fontFamily: SANS }}
                  >
                    {panel.visible}
                  </span>

                  {/* More examples row — full width */}
                  <span className="col-span-2 mt-[14px] pt-[12px] border-t border-[#E4E8F6] flex items-center justify-between">
                    <span
                      className="text-[13.5px] lg:text-[14px] font-[600]"
                      style={{ fontFamily: SANS, color: panel.moreColor }}
                    >
                      More examples
                    </span>
                    <ChevronDown
                      size={15}
                      aria-hidden="true"
                      className="flex-shrink-0 transition-transform duration-[150ms] group-open:rotate-180 motion-reduce:transform-none"
                      style={{ color: panel.moreColor }}
                    />
                  </span>
                </summary>

                {/* Expanded body */}
                <div className="px-4 lg:px-5 pb-4 lg:pb-5 relative z-[1]">
                  <ul className="space-y-[8px]">
                    {panel.items.map((item) => (
                      <li key={item} className="flex items-start gap-[9px]">
                        <span
                          className="mt-[6px] w-1.5 h-1.5 rounded-full flex-shrink-0"
                          style={{ background: panel.accent }}
                          aria-hidden="true"
                        />
                        <span
                          className="text-[13px] lg:text-[13.5px] font-[475] leading-[1.5] text-[#536176]"
                          style={{ fontFamily: SANS }}
                        >
                          {item}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {panel.qualifier && (
                    <div
                      className="mt-[14px] flex items-start gap-[9px] rounded-[9px] px-[12px] py-[10px] border-l-2"
                      style={{ background: "rgba(34,211,238,.055)", borderColor: "#22D3EE" }}
                    >
                      <Globe size={13} color="#0E7490" aria-hidden="true" className="flex-shrink-0 mt-[2px]" />
                      <p
                        className="text-[12.5px] lg:text-[13px] font-[475] leading-[1.5] text-[#526173]"
                        style={{ fontFamily: SANS }}
                      >
                        {panel.qualifier.text}
                      </p>
                    </div>
                  )}
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* 3A → 3B divider */}
        <div
          aria-hidden="true"
          className="mt-[36px] mb-[36px] sm:mt-[40px] sm:mb-[40px] lg:mt-[44px] lg:mb-[44px] h-px"
          style={{ background: "linear-gradient(90deg, transparent, rgba(91,91,214,.18) 18%, rgba(91,91,214,.18) 82%, transparent)" }}
        />

        {/* ── 3B: How it works ── */}
        <section id="how-it-works" aria-labelledby="how-it-works-heading" className="scroll-mt-16 pb-[72px] sm:pb-[80px] lg:pb-[96px]">

          <h2
            id="how-it-works-heading"
            className="text-[clamp(30px,8vw,34px)] lg:text-[clamp(40px,3.1vw,44px)] max-w-[700px] text-[#0B1526]"
            style={{ fontFamily: SERIF, fontWeight: 400, lineHeight: 1.07 }}
          >
            How property work gets done when you&#8217;re abroad
          </h2>

          {/* Desktop process — hidden on mobile */}
          <div className="hidden lg:block mt-[52px]">
            <div className="relative">
              {/* Base connector */}
              <div
                aria-hidden="true"
                className="absolute pointer-events-none"
                style={{
                  top: 24,
                  left: "16.6667%",
                  right: "16.6667%",
                  height: 2,
                  borderRadius: 9999,
                  background: "rgba(91,91,214,.18)",
                  zIndex: 0,
                }}
              />
              {/* Animated highlight */}
              <div
                aria-hidden="true"
                className="nri-b3-conn-h absolute pointer-events-none"
                style={{
                  top: 24,
                  left: "16.6667%",
                  right: "16.6667%",
                  height: 2,
                  borderRadius: 9999,
                  backgroundImage: "linear-gradient(90deg, transparent 0%, #2563EB 30%, #7C3AED 55%, #22D3EE 80%, transparent 100%)",
                  backgroundSize: "200% 100%",
                  opacity: 0.42,
                  zIndex: 0,
                }}
              />

              <ol className="grid grid-cols-3 list-none relative z-[1]">
                {PROCESS_STEPS.map((step) => (
                  <li key={step.num} className="flex flex-col items-center text-center px-3 xl:px-5">
                    {/* Node */}
                    <div className="relative flex-shrink-0 w-12 h-12">
                      <span
                        aria-hidden="true"
                        className="absolute inset-0 rounded-full opacity-60"
                        style={{ background: step.backing, transform: "translate(2px, 2px)" }}
                      />
                      <span
                        className="relative z-[1] flex h-full w-full items-center justify-center rounded-full"
                        style={{ background: step.fill }}
                      >
                        <span className="text-[13px] font-[700] text-white" style={{ fontFamily: SANS }}>{step.num}</span>
                      </span>
                    </div>
                    {/* Title */}
                    <h3
                      className="mt-5 text-[18px] lg:text-[19px] font-[650] leading-[1.3] text-[#172235]"
                      style={{ fontFamily: SANS }}
                    >
                      {step.title}
                    </h3>
                    {/* Body */}
                    <p
                      className="mt-[10px] text-[14.5px] lg:text-[15px] font-[475] leading-[1.55] text-[#536176] max-w-[300px] mx-auto"
                      style={{ fontFamily: SANS }}
                    >
                      {step.body}
                    </p>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          {/* Mobile/tablet process — hidden on desktop */}
          <div className="lg:hidden mt-10">
            <ol className="list-none flex flex-col">
              {PROCESS_STEPS.map((step, index) => {
                const isLast = index === PROCESS_STEPS.length - 1;
                const connClass = index === 0 ? "nri-b3-conn-v-12" : "nri-b3-conn-v-23";

                if (isLast) {
                  return (
                    <li key={step.num} className="grid grid-cols-[44px_minmax(0,1fr)] gap-4">
                      <div className="flex justify-center">
                        <div className="relative flex-shrink-0 w-11 h-11">
                          <span
                            aria-hidden="true"
                            className="absolute inset-0 rounded-full opacity-60"
                            style={{ background: step.backing, transform: "translate(2px, 2px)" }}
                          />
                          <span
                            className="relative z-[1] flex h-full w-full items-center justify-center rounded-full"
                            style={{ background: step.fill }}
                          >
                            <span className="text-[12px] font-[700] text-white" style={{ fontFamily: SANS }}>{step.num}</span>
                          </span>
                        </div>
                      </div>
                      <div>
                        <h3
                          className="text-[16px] sm:text-[17px] font-[650] leading-[1.3] text-[#172235]"
                          style={{ fontFamily: SANS }}
                        >
                          {step.title}
                        </h3>
                        <p
                          className="mt-2 text-[13.5px] sm:text-[14px] font-[475] leading-[1.5] text-[#536176]"
                          style={{ fontFamily: SANS }}
                        >
                          {step.body}
                        </p>
                      </div>
                    </li>
                  );
                }

                return (
                  <li key={step.num} className="grid grid-cols-[44px_minmax(0,1fr)] gap-4">
                    {/* LEFT: node column, self-stretch so connector follows text height */}
                    <div className="relative self-stretch flex flex-col items-center">
                      <div className="relative flex-shrink-0 w-11 h-11">
                        <span
                          aria-hidden="true"
                          className="absolute inset-0 rounded-full opacity-60"
                          style={{ background: step.backing, transform: "translate(2px, 2px)" }}
                        />
                        <span
                          className="relative z-[1] flex h-full w-full items-center justify-center rounded-full"
                          style={{ background: step.fill }}
                        >
                          <span className="text-[12px] font-[700] text-white" style={{ fontFamily: SANS }}>{step.num}</span>
                        </span>
                      </div>
                      {/* Connector — starts immediately below node, fills remaining column height */}
                      <div
                        className="relative flex-1 w-[2px] rounded-full overflow-hidden"
                        style={{ background: "rgba(91,91,214,.18)" }}
                      >
                        <div
                          aria-hidden="true"
                          className={`${connClass} absolute inset-0`}
                          style={{
                            backgroundImage: "linear-gradient(180deg, transparent 0%, #2563EB 25%, #7C3AED 60%, #22D3EE 90%, transparent 100%)",
                            backgroundSize: "100% 200%",
                            opacity: 0.42,
                          }}
                        />
                      </div>
                    </div>

                    {/* RIGHT: content, padding-bottom creates inter-step breathing room */}
                    <div className="pb-8">
                      <h3
                        className="text-[16px] sm:text-[17px] font-[650] leading-[1.3] text-[#172235]"
                        style={{ fontFamily: SANS }}
                      >
                        {step.title}
                      </h3>
                      <p
                        className="mt-2 text-[13.5px] sm:text-[14px] font-[475] leading-[1.5] text-[#536176]"
                        style={{ fontFamily: SANS }}
                      >
                        {step.body}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>

      </div>
    </div>
  );
}

// ── Band 4: NRI Property Guide ────────────────────────────────────────────────

const GUIDE_JUMPS = [
  { num: "01", label: "Managing property in India from abroad", href: "#manage-property-india-from-abroad" },
  { num: "02", label: "What to do with a vacant property", href: "#vacant-property-nri" },
  { num: "03", label: "Selling property in India from abroad", href: "#sell-property-india-from-abroad" },
  { num: "04", label: "What can delay or derail a property sale?", href: "#what-can-delay-property-sale" },
  { num: "05", label: "NRI rent and TDS", href: "#nri-rent-tds" },
  { num: "06", label: "Khata, mutation and registration records", href: "#khata-mutation-registration" },
  { num: "07", label: "Encumbrance Certificate and title documents", href: "#encumbrance-certificate-title" },
  { num: "08", label: "Inherited or co-owned property", href: "#inherited-property-nri" },
  { num: "09", label: "Power of Attorney for NRI property matters", href: "#power-of-attorney-nri-property" },
];

const SALE_STAGES = [
  { title: "Documents ready", body: "Collect and review the title and supporting property records needed for the transaction." },
  { title: "Market the property", body: "Prepare marketing, photography or viewings where available and coordinate buyer interest." },
  { title: "Agree the sale", body: "Coordinate commercial terms, buyer documentation and transaction readiness." },
  { title: "Handle tax / withholding", body: "Coordinate the applicable NRI tax and withholding work with the appropriate tax professional." },
  { title: "Complete registration", body: "Prepare for execution and coordinate registration-related requirements where applicable." },
  { title: "Coordinate proceeds / records", body: "Follow through on the professional and record-related steps that remain after execution." },
];

const SALE_RISK_CHECKS = [
  "Missing intermediate deeds",
  "Incomplete title/document chain",
  "Khata/mutation never updated where relevant",
  "Outstanding property or tax dues",
  "Encumbrance/title issues",
  "Inheritance or co-owner documentation gaps",
  "Association/society documentation",
  "Mismatch between different property records",
];

const RECORD_DEFS = [
  { term: "Registration / registered deed", def: "Records the legal property transaction." },
  { term: "Mutation", def: "Updates the relevant government/revenue ownership record." },
  { term: "Khata", def: "Bangalore municipal property-record context." },
];

const INHERITANCE_STEPS = [
  "Establish the ownership / succession position",
  "Review the documents",
  "Complete whatever professional or legal documentation the case requires",
  "Update relevant records",
  "Manage, rent or sell",
];

function GuideIconTile({
  primary: PrimaryIcon,
  secondary: SecondaryIcon,
  plateFg,
  plateBg,
  accent,
}: {
  primary: React.ComponentType<{ size?: number; color?: string; className?: string }>;
  secondary?: React.ComponentType<{ size?: number; color?: string; className?: string }>;
  plateFg: string;
  plateBg: string;
  accent: string;
}) {
  return (
    <span className="relative flex-shrink-0 w-[38px] h-[38px] lg:w-11 lg:h-11" style={{ display: "block" }}>
      <span
        aria-hidden="true"
        className="absolute inset-0 rounded-xl opacity-50"
        style={{ background: plateBg, transform: "translate(3px, 3px)" }}
      />
      <span
        className="relative z-[1] flex h-full w-full items-center justify-center rounded-xl"
        style={{ background: plateFg }}
      >
        <span className="relative flex items-center justify-center" aria-hidden="true">
          <PrimaryIcon size={16} color={accent} />
          {SecondaryIcon && (
            <SecondaryIcon size={9} color={accent} className="absolute bottom-[-2px] right-[-3px]" />
          )}
        </span>
      </span>
    </span>
  );
}

function GuideDetails({
  moreColor,
  heading,
  children,
}: {
  moreColor: string;
  heading?: string;
  children: React.ReactNode;
}) {
  return (
    <details className="group/detail mt-4 border-t border-[#E8EBF5]">
      <summary className="list-none [&::-webkit-details-marker]:hidden flex items-center justify-between gap-3 min-h-[44px] py-[10px] cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#5B5BD6]">
        <span className="text-[13.5px] lg:text-[14px] font-[650]" style={{ fontFamily: SANS, color: moreColor }}>
          Understand this in detail
        </span>
        <span
          className="flex-shrink-0 text-[17px] leading-none transition-transform duration-[150ms] group-open/detail:rotate-45 motion-reduce:transform-none"
          aria-hidden="true"
          style={{ color: moreColor }}
        >
          +
        </span>
      </summary>
      <div className="pt-[12px]">
        {heading && (
          <p className="mb-[10px] text-[13.5px] lg:text-[14px] font-[700] text-[#172235]" style={{ fontFamily: SANS }}>
            {heading}
          </p>
        )}
        {children}
      </div>
    </details>
  );
}

function GuideTextLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="group/link inline-flex items-center gap-1 text-[13.5px] lg:text-[14px] font-[600] text-[#2563EB] lg:hover:text-[#1D4ED8] transition-colors duration-[160ms] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB] motion-reduce:transition-none"
      style={{ fontFamily: SANS }}
    >
      {children}
      <span className="transition-transform duration-[150ms] lg:group-hover/link:translate-x-[2px] motion-reduce:transform-none">→</span>
    </a>
  );
}

function GuideBullets({ items, accent }: { items: string[]; accent: string }) {
  return (
    <ul className="flex flex-col gap-[7px]">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-[8px]">
          <span className="mt-[5px] w-[5px] h-[5px] rounded-full flex-shrink-0" aria-hidden="true" style={{ background: accent }} />
          <span className="text-[13.5px] lg:text-[14px] font-[460] leading-[1.52] text-[#536176]" style={{ fontFamily: SANS }}>
            {item}
          </span>
        </li>
      ))}
    </ul>
  );
}

function NriPropertyGuideSection() {
  const ARTICLE_BASE = "group/article relative overflow-hidden rounded-[18px] border border-[#E7EAF4] bg-white shadow-[0_8px_28px_rgba(30,41,75,.04)] p-[18px] sm:p-[22px] lg:p-[26px] transition-[border-color,box-shadow] duration-[160ms] lg:hover:border-[#D0D8F0] lg:hover:shadow-[0_10px_32px_rgba(30,41,75,.07)] motion-reduce:transition-none self-start scroll-mt-16";

  return (
    <section
      id="nri-property-guide"
      aria-labelledby="nri-property-guide-heading"
      className="scroll-mt-16"
      style={{
        background: `
          radial-gradient(36% 24% at 96% 4%, rgba(124,58,237,.045) 0%, transparent 68%),
          radial-gradient(34% 22% at 2% 18%, rgba(34,211,238,.04) 0%, transparent 70%),
          linear-gradient(180deg, #FFFFFF 0%, #FCFCFF 48%, #FFFEFC 100%)
        `,
      }}
    >
      <div className="mx-auto max-w-[1240px] px-5 sm:px-8 lg:px-10 pt-16 sm:pt-[76px] lg:pt-[92px] pb-[72px] sm:pb-[84px] lg:pb-[96px]">

        {/* ── Top intro ── */}
        <p className="text-[11.5px] lg:text-[12px] font-[700] uppercase tracking-[0.12em] text-[#5B5BD6]" style={{ fontFamily: SANS }}>
          NRI PROPERTY GUIDE
        </p>
        <h2
          id="nri-property-guide-heading"
          className="mt-3 text-[clamp(32px,8.5vw,35px)] sm:text-[40px] lg:text-[clamp(42px,3.2vw,46px)] max-w-[760px] text-[#0B1526]"
          style={{ fontFamily: SERIF, fontWeight: 400, lineHeight: 1.06, letterSpacing: "-0.015em" }}
        >
          Property questions, explained clearly
        </h2>
        <p
          className="mt-[14px] max-w-[800px] text-[15.5px] lg:text-[17px] text-[#536176]"
          style={{ fontFamily: SANS, fontWeight: 475, lineHeight: 1.6 }}
        >
          Clear first answers to questions NRI property owners commonly run into. Requirements vary by property, state and situation; regulated tax and legal advice comes from the appropriate licensed professional.
        </p>

        {/* ── Jump navigator ── */}
        <div className="mt-[28px] lg:mt-[32px]">
          <p className="text-[14px] font-[650] text-[#172235]" style={{ fontFamily: SANS }}>
            Jump to a topic
          </p>
          <div className="mt-[12px] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[8px] sm:gap-[10px] lg:gap-[10px]">
            {GUIDE_JUMPS.map(({ num, label, href }) => (
              <a
                key={href}
                href={href}
                className="group/jump flex items-center gap-[10px] rounded-[13px] border border-[#E4E8F6] bg-[#F8FAFF] px-[13px] py-[11px] min-h-[48px] transition-all duration-[160ms] lg:hover:bg-white lg:hover:border-[#CCD7F2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB] motion-reduce:transition-none"
              >
                <span className="flex-shrink-0 text-[11.5px] font-[700] text-[#5B5BD6]" style={{ fontFamily: SANS }}>{num}</span>
                <span className="flex-1 min-w-0 text-[12.5px] lg:text-[13px] font-[575] leading-[1.35] text-[#334155] transition-colors duration-[160ms] lg:group-hover/jump:text-[#172235] motion-reduce:transition-none" style={{ fontFamily: SANS }}>{label}</span>
                <span className="flex-shrink-0 text-[#64748B] transition-transform duration-[160ms] lg:group-hover/jump:translate-x-[2px] motion-reduce:transform-none" aria-hidden="true">→</span>
              </a>
            ))}
          </div>
        </div>

        {/* ── Article grid ── */}
        <div className="mt-[28px] lg:mt-[36px] mx-auto max-w-[1080px] grid grid-cols-1 lg:grid-cols-2 gap-[16px] lg:gap-[20px] lg:items-start">

          {/* 01 — MANAGEMENT */}
          <article id="manage-property-india-from-abroad" className={ARTICLE_BASE}>
            <span aria-hidden="true" className="pointer-events-none absolute top-0 right-0 w-28 h-28 opacity-[0.45] transition-opacity duration-[160ms] lg:group-hover/article:opacity-[0.7] motion-reduce:transition-none" style={{ background: "radial-gradient(circle at 100% 0%, rgba(34,211,238,.055) 0%, transparent 60%)", zIndex: 0 }} />
            <div className="relative z-[1]">
              <div className="flex items-start gap-3 lg:gap-3.5">
                <GuideIconTile primary={Home} secondary={Globe} plateFg="#E8FAFD" plateBg="#D4F1F5" accent="#0EA5B7" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-[6px]">
                    <span className="text-[12px] font-[700]" style={{ fontFamily: SANS, color: "#0E7490" }}>01</span>
                    <span className="inline-flex items-center rounded-full px-[8px] py-[2px] text-[10.5px] font-[700] uppercase tracking-[0.06em] border" style={{ fontFamily: SANS, background: "#EAFBFC", color: "#0E7490", borderColor: "rgba(14,165,183,.18)" }}>MANAGEMENT</span>
                  </div>
                  <h3 className="mt-[6px] text-[21px] sm:text-[22px] lg:text-[clamp(21px,1.8vw,25px)] font-[650] leading-[1.2] text-[#172235]" style={{ fontFamily: SANS }}>
                    How can I manage property in India while living abroad?
                  </h3>
                </div>
              </div>
              <p className="mt-[12px] text-[14px] lg:text-[14.5px] font-[460] leading-[1.6] text-[#536176]" style={{ fontFamily: SANS }}>
                The practical challenge is usually coordination: keeping track of the property, tenants or occupants, maintenance, inspections, documents and local follow-ups from a distance. A reliable point of contact in India can reduce the need to coordinate several people separately.
              </p>
              <GuideDetails moreColor="#0E7490" heading="What this usually involves">
                <GuideBullets accent="#0EA5B7" items={[
                  "Tenant and property coordination",
                  "Maintenance and repairs",
                  "Periodic inspections when needed",
                  "Property records and local documentation",
                  "CA, advocate or other professional coordination where required",
                  "One accountable coordination point",
                ]} />
                <div className="mt-[14px] flex flex-col gap-[6px]">
                  <GuideTextLink href="/property-management-bangalore">Reeve Managed</GuideTextLink>
                  <GuideTextLink href="/vacant-property-care-bangalore">Reeve Watch</GuideTextLink>
                  <GuideTextLink href="/find-tenant-bangalore">Reeve Let</GuideTextLink>
                </div>
              </GuideDetails>
            </div>
          </article>

          {/* 02 — VACANT PROPERTY */}
          <article id="vacant-property-nri" className={ARTICLE_BASE}>
            <span aria-hidden="true" className="pointer-events-none absolute top-0 right-0 w-28 h-28 opacity-[0.45] transition-opacity duration-[160ms] lg:group-hover/article:opacity-[0.7] motion-reduce:transition-none" style={{ background: "radial-gradient(circle at 100% 0%, rgba(34,211,238,.055) 0%, transparent 60%)", zIndex: 0 }} />
            <div className="relative z-[1]">
              <div className="flex items-start gap-3 lg:gap-3.5">
                <GuideIconTile primary={Home} secondary={Shield} plateFg="#E8FAFD" plateBg="#D4F1F5" accent="#0EA5B7" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-[6px]">
                    <span className="text-[12px] font-[700]" style={{ fontFamily: SANS, color: "#0E7490" }}>02</span>
                    <span className="inline-flex items-center rounded-full px-[8px] py-[2px] text-[10.5px] font-[700] uppercase tracking-[0.06em] border" style={{ fontFamily: SANS, background: "#EAFBFC", color: "#0E7490", borderColor: "rgba(14,165,183,.18)" }}>VACANT PROPERTY</span>
                  </div>
                  <h3 className="mt-[6px] text-[21px] sm:text-[22px] lg:text-[clamp(21px,1.8vw,25px)] font-[650] leading-[1.2] text-[#172235]" style={{ fontFamily: SANS }}>
                    What should I do if my Indian property is vacant?
                  </h3>
                </div>
              </div>
              <p className="mt-[12px] text-[14px] lg:text-[14.5px] font-[460] leading-[1.6] text-[#536176]" style={{ fontFamily: SANS }}>
                Start with the basics: confirm access, condition, utilities, records and who is actually responsible for checking the property. Regular physical inspection and documented follow-up are more reliable than depending entirely on informal caretaker arrangements.
              </p>
              <GuideDetails moreColor="#0E7490" heading="What this usually involves">
                <GuideBullets accent="#0EA5B7" items={[
                  "Physical inspection",
                  "Maintenance and repairs",
                  "Access and key coordination",
                  "Property records and local follow-ups",
                  "Tracking the property's condition",
                  "Reducing dependence on purely informal caretaker arrangements",
                ]} />
                <div className="mt-[14px]">
                  <GuideTextLink href="/vacant-property-care-bangalore">Vacant Property Care in Bangalore</GuideTextLink>
                </div>
              </GuideDetails>
            </div>
          </article>

          {/* 03 — SALE */}
          <article id="sell-property-india-from-abroad" className={`${ARTICLE_BASE} lg:col-span-2`}>
            <span aria-hidden="true" className="pointer-events-none absolute top-0 right-0 w-28 h-28 opacity-[0.45] transition-opacity duration-[160ms] lg:group-hover/article:opacity-[0.7] motion-reduce:transition-none" style={{ background: "radial-gradient(circle at 100% 0%, rgba(37,99,235,.05) 0%, transparent 60%)", zIndex: 0 }} />
            <div className="relative z-[1]">
              <div className="flex items-start gap-3 lg:gap-3.5">
                <GuideIconTile primary={Building2} secondary={FileText} plateFg="#EDF4FF" plateBg="#D8E7FF" accent="#2563EB" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-[6px]">
                    <span className="text-[12px] font-[700]" style={{ fontFamily: SANS, color: "#1D4ED8" }}>03</span>
                    <span className="inline-flex items-center rounded-full px-[8px] py-[2px] text-[10.5px] font-[700] uppercase tracking-[0.06em] border" style={{ fontFamily: SANS, background: "#EEF4FF", color: "#1D4ED8", borderColor: "rgba(37,99,235,.18)" }}>SALE</span>
                  </div>
                  <h3 className="mt-[6px] text-[21px] sm:text-[22px] lg:text-[clamp(21px,1.8vw,25px)] font-[650] leading-[1.2] text-[#172235]" style={{ fontFamily: SANS }}>
                    Can an NRI sell property in India while living abroad?
                  </h3>
                </div>
              </div>
              <p className="mt-[12px] text-[14px] lg:text-[14.5px] font-[460] leading-[1.6] text-[#536176]" style={{ fontFamily: SANS }}>
                Yes. Much of an Indian property sale can be coordinated while the owner is abroad, but the exact steps depend on the property, documents, buyer, state and transaction. The work usually combines document readiness, marketing or buyer coordination, tax or withholding work and registration-related execution.
              </p>
              <GuideDetails moreColor="#1D4ED8">
                {/* Desktop horizontal journey — xl+ */}
                <div className="hidden xl:block relative mt-[4px]">
                  <div
                    aria-hidden="true"
                    className="absolute pointer-events-none"
                    style={{ top: 20, left: "8.3333%", right: "8.3333%", height: 2, borderRadius: 9999, background: "linear-gradient(90deg, #2563EB 0%, #7C3AED 50%, #22D3EE 100%)", opacity: 0.22, zIndex: 0 }}
                  />
                  <ol className="relative z-[1] grid grid-cols-6 list-none">
                    {SALE_STAGES.map((stage, i) => (
                      <li key={i} className="flex flex-col items-center text-center px-1">
                        <span className="relative z-[1] w-10 h-10 rounded-full flex items-center justify-center text-[12px] font-[700] text-white flex-shrink-0" style={{ background: "#2563EB", fontFamily: SANS }}>
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <p className="mt-2 text-[12.5px] xl:text-[13px] font-[700] leading-[1.3] text-[#172235]" style={{ fontFamily: SANS }}>{stage.title}</p>
                        <p className="mt-[4px] text-[12.5px] xl:text-[13px] font-[450] leading-[1.45] text-[#536176]" style={{ fontFamily: SANS }}>{stage.body}</p>
                      </li>
                    ))}
                  </ol>
                </div>
                {/* Vertical journey — below xl */}
                <div className="xl:hidden mt-[4px]">
                  <ol className="list-none flex flex-col">
                    {SALE_STAGES.map((stage, i) => {
                      const isLast = i === SALE_STAGES.length - 1;
                      return (
                        <li key={i} className="grid grid-cols-[40px_minmax(0,1fr)] gap-3">
                          <div className="relative self-stretch flex flex-col items-center">
                            <span className="relative z-[1] flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-[12px] font-[700] text-white" style={{ background: "#2563EB", fontFamily: SANS }}>
                              {String(i + 1).padStart(2, "0")}
                            </span>
                            {!isLast && (
                              <div className="flex-1 w-[2px]" aria-hidden="true" style={{ background: "linear-gradient(180deg, #2563EB 0%, #7C3AED 50%, #22D3EE 100%)", opacity: 0.22 }} />
                            )}
                          </div>
                          <div className={isLast ? "pb-0" : "pb-[14px]"}>
                            <p className="text-[13px] font-[700] leading-[1.3] text-[#172235] pt-[10px]" style={{ fontFamily: SANS }}>{stage.title}</p>
                            <p className="mt-[4px] text-[13px] font-[450] leading-[1.5] text-[#536176]" style={{ fontFamily: SANS }}>{stage.body}</p>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </div>
                {/* Geo clarification */}
                <div className="mt-[16px] flex items-start gap-[10px] rounded-[10px] border border-[#BAE6FD] px-[12px] py-[10px]" style={{ background: "#F0FDFF" }}>
                  <Globe size={14} color="#0E7490" className="flex-shrink-0 mt-[2px]" aria-hidden="true" />
                  <p className="text-[13px] font-[460] leading-[1.5] text-[#0E7490]" style={{ fontFamily: SANS }}>
                    Reeve can coordinate sale documentation, tax and professional work across India. Photography, viewings and physical sale execution are currently available in Bangalore.
                  </p>
                </div>
                <div className="mt-[14px]">
                  <GuideTextLink href="/nri-property-sale-india">NRI Property Sale Support</GuideTextLink>
                </div>
              </GuideDetails>
            </div>
          </article>

          {/* 04 — SALE RISKS (no details, always visible) */}
          <article id="what-can-delay-property-sale" className={`${ARTICLE_BASE} lg:col-span-2`} style={{ borderColor: "#D7E1F7" }}>
            <span aria-hidden="true" className="pointer-events-none absolute top-0 right-0 w-28 h-28 opacity-[0.45] transition-opacity duration-[160ms] lg:group-hover/article:opacity-[0.7] motion-reduce:transition-none" style={{ background: "radial-gradient(circle at 100% 0%, rgba(37,99,235,.06) 0%, transparent 60%), radial-gradient(circle at 82% 14%, rgba(124,58,237,.03) 0%, transparent 58%)", zIndex: 0 }} />
            <div className="relative z-[1]">
              <div className="flex items-start gap-3 lg:gap-3.5">
                <GuideIconTile primary={FileText} secondary={AlertTriangle} plateFg="#EDF4FF" plateBg="#D8E7FF" accent="#2563EB" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-[6px]">
                    <span className="text-[12px] font-[700]" style={{ fontFamily: SANS, color: "#1D4ED8" }}>04</span>
                    <span className="inline-flex items-center rounded-full px-[8px] py-[2px] text-[10.5px] font-[700] uppercase tracking-[0.06em] border" style={{ fontFamily: SANS, background: "#EEF4FF", color: "#1D4ED8", borderColor: "rgba(37,99,235,.18)" }}>SALE RISKS</span>
                  </div>
                  <h3 className="mt-[6px] text-[21px] sm:text-[22px] lg:text-[clamp(21px,1.8vw,25px)] font-[650] leading-[1.2] text-[#172235]" style={{ fontFamily: SANS }}>
                    What can delay or derail an Indian property sale?
                  </h3>
                </div>
              </div>
              <p className="mt-[12px] text-[14px] lg:text-[14.5px] font-[460] leading-[1.6] text-[#536176]" style={{ fontFamily: SANS }}>
                A buyer often discovers property-document problems only after the transaction has started. Finding them earlier can prevent a sale from stalling after you've already found a buyer.
              </p>
              <p className="mt-[16px] text-[14px] font-[700] text-[#172235]" style={{ fontFamily: SANS }}>
                Potential issues to check early
              </p>
              <ul className="mt-[12px] grid grid-cols-1 sm:grid-cols-2 gap-y-[8px] gap-x-[16px]">
                {SALE_RISK_CHECKS.map((item) => (
                  <li key={item} className="flex items-start gap-[8px]">
                    <span className="mt-[3px] w-[14px] h-[14px] flex-shrink-0 flex items-center justify-center rounded-sm" style={{ background: "#EEF4FF" }}>
                      <AlertTriangle size={8} color="#2563EB" aria-hidden="true" />
                    </span>
                    <span className="text-[13px] lg:text-[13.5px] font-[475] leading-[1.5] text-[#536176]" style={{ fontFamily: SANS }}>{item}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-[14px] text-[12.5px] font-[450] leading-[1.5] text-[#64748B]" style={{ fontFamily: SANS }}>
                Which of these matters depends on the property, location, records and transaction.
              </p>
              <div className="mt-[16px] flex flex-col gap-[6px]">
                <GuideTextLink href="/nri-property-sale-india">Need help preparing an NRI property for sale?</GuideTextLink>
                <GuideTextLink href="/khata-transfer-bangalore">Khata Transfer in Bangalore</GuideTextLink>
              </div>
            </div>
          </article>

          {/* 05 — RENT / TAX */}
          <article id="nri-rent-tds" className={ARTICLE_BASE}>
            <span aria-hidden="true" className="pointer-events-none absolute top-0 right-0 w-28 h-28 opacity-[0.45] transition-opacity duration-[160ms] lg:group-hover/article:opacity-[0.7] motion-reduce:transition-none" style={{ background: "radial-gradient(circle at 100% 0%, rgba(37,99,235,.05) 0%, transparent 60%)", zIndex: 0 }} />
            <div className="relative z-[1]">
              <div className="flex items-start gap-3 lg:gap-3.5">
                <GuideIconTile primary={FileText} secondary={Percent} plateFg="#EDF4FF" plateBg="#D8E7FF" accent="#2563EB" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-[6px]">
                    <span className="text-[12px] font-[700]" style={{ fontFamily: SANS, color: "#1D4ED8" }}>05</span>
                    <span className="inline-flex items-center rounded-full px-[8px] py-[2px] text-[10.5px] font-[700] uppercase tracking-[0.06em] border" style={{ fontFamily: SANS, background: "#EEF4FF", color: "#1D4ED8", borderColor: "rgba(37,99,235,.18)" }}>RENT / TAX</span>
                  </div>
                  <h3 className="mt-[6px] text-[21px] sm:text-[22px] lg:text-[clamp(21px,1.8vw,25px)] font-[650] leading-[1.2] text-[#172235]" style={{ fontFamily: SANS }}>
                    What happens when rent is paid to an NRI landlord?
                  </h3>
                </div>
              </div>
              <p className="mt-[12px] text-[14px] lg:text-[14.5px] font-[460] leading-[1.6] text-[#536176]" style={{ fontFamily: SANS }}>
                Rent paid to a non-resident owner can involve specific withholding and compliance requirements. The tenant's withholding obligations and the owner's final tax liability are different issues, so the professional tax side should be coordinated with a qualified CA or other appropriate tax professional.
              </p>
              <GuideDetails moreColor="#1D4ED8" heading="What to understand">
                <GuideBullets accent="#2563EB" items={[
                  "Non-resident rental income can have specific withholding and compliance requirements",
                  "Tenant and owner obligations need coordination",
                  "Withholding and final tax liability are different concepts",
                  "Qualified tax professionals handle regulated tax work",
                ]} />
                <div className="mt-[14px]">
                  <GuideTextLink href="/nri-rent-tds-india">NRI Rent &amp; TDS</GuideTextLink>
                </div>
              </GuideDetails>
            </div>
          </article>

          {/* 06 — RECORDS */}
          <article id="khata-mutation-registration" className={ARTICLE_BASE}>
            <span aria-hidden="true" className="pointer-events-none absolute top-0 right-0 w-28 h-28 opacity-[0.45] transition-opacity duration-[160ms] lg:group-hover/article:opacity-[0.7] motion-reduce:transition-none" style={{ background: "radial-gradient(circle at 100% 0%, rgba(124,58,237,.05) 0%, transparent 60%)", zIndex: 0 }} />
            <div className="relative z-[1]">
              <div className="flex items-start gap-3 lg:gap-3.5">
                <GuideIconTile primary={FolderOpen} secondary={FileText} plateFg="#F1EDFF" plateBg="#E1D8FF" accent="#7C3AED" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-[6px]">
                    <span className="text-[12px] font-[700]" style={{ fontFamily: SANS, color: "#5B3BC4" }}>06</span>
                    <span className="inline-flex items-center rounded-full px-[8px] py-[2px] text-[10.5px] font-[700] uppercase tracking-[0.06em] border" style={{ fontFamily: SANS, background: "#F3EFFF", color: "#5B3BC4", borderColor: "rgba(124,58,237,.18)" }}>RECORDS</span>
                  </div>
                  <h3 className="mt-[6px] text-[21px] sm:text-[22px] lg:text-[clamp(21px,1.8vw,25px)] font-[650] leading-[1.2] text-[#172235]" style={{ fontFamily: SANS }}>
                    What is the difference between registration, mutation and khata?
                  </h3>
                </div>
              </div>
              <p className="mt-[12px] text-[14px] lg:text-[14.5px] font-[460] leading-[1.6] text-[#536176]" style={{ fontFamily: SANS }}>
                They refer to different parts of the property-record system. Registration records the legal property transaction, mutation updates the relevant government or revenue ownership record, and khata is a Bangalore municipal property-record concept.
              </p>
              <GuideDetails moreColor="#5B3BC4">
                <div className="rounded-[10px] border border-[#E4E8F6] overflow-hidden">
                  {RECORD_DEFS.map((r, i) => (
                    <div key={r.term} className={`flex items-start gap-3 p-[12px]${i > 0 ? " border-t border-[#E4E8F6]" : ""}`}>
                      <span className="mt-[5px] w-[6px] h-[6px] rounded-full flex-shrink-0" style={{ background: "#7C3AED" }} aria-hidden="true" />
                      <div>
                        <p className="text-[13px] font-[650] leading-[1.3] text-[#172235]" style={{ fontFamily: SANS }}>{r.term}</p>
                        <p className="mt-[3px] text-[13px] font-[450] leading-[1.5] text-[#536176]" style={{ fontFamily: SANS }}>{r.def}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-[14px]">
                  <GuideTextLink href="/khata-transfer-bangalore">Khata Transfer in Bangalore</GuideTextLink>
                </div>
              </GuideDetails>
            </div>
          </article>

          {/* 07 — TITLE / EC */}
          <article id="encumbrance-certificate-title" className={ARTICLE_BASE}>
            <span aria-hidden="true" className="pointer-events-none absolute top-0 right-0 w-28 h-28 opacity-[0.45] transition-opacity duration-[160ms] lg:group-hover/article:opacity-[0.7] motion-reduce:transition-none" style={{ background: "radial-gradient(circle at 100% 0%, rgba(124,58,237,.05) 0%, transparent 60%)", zIndex: 0 }} />
            <div className="relative z-[1]">
              <div className="flex items-start gap-3 lg:gap-3.5">
                <GuideIconTile primary={FileText} secondary={Search} plateFg="#F1EDFF" plateBg="#E1D8FF" accent="#7C3AED" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-[6px]">
                    <span className="text-[12px] font-[700]" style={{ fontFamily: SANS, color: "#5B3BC4" }}>07</span>
                    <span className="inline-flex items-center rounded-full px-[8px] py-[2px] text-[10.5px] font-[700] uppercase tracking-[0.06em] border" style={{ fontFamily: SANS, background: "#F3EFFF", color: "#5B3BC4", borderColor: "rgba(124,58,237,.18)" }}>TITLE / EC</span>
                  </div>
                  <h3 className="mt-[6px] text-[21px] sm:text-[22px] lg:text-[clamp(21px,1.8vw,25px)] font-[650] leading-[1.2] text-[#172235]" style={{ fontFamily: SANS }}>
                    What is an Encumbrance Certificate, and is it the same as title verification?
                  </h3>
                </div>
              </div>
              <p className="mt-[12px] text-[14px] lg:text-[14.5px] font-[460] leading-[1.6] text-[#536176]" style={{ fontFamily: SANS }}>
                <strong className="text-[18px] lg:text-[20px] font-[700] text-[#5B5BD6] block mb-[4px]">No.</strong>
                An Encumbrance Certificate is a record relating to registered property transactions or encumbrances for the relevant period. Professional title verification is broader and examines a wider set of ownership and legal records.
              </p>
              <GuideDetails moreColor="#5B3BC4" heading="Why the distinction matters">
                <GuideBullets accent="#7C3AED" items={[
                  "An EC relates to registered transactions or encumbrances for the relevant period.",
                  "Title verification looks more broadly at the ownership history and supporting legal records.",
                  "An EC should not be treated as a substitute for a broader professional title review.",
                ]} />
              </GuideDetails>
            </div>
          </article>

          {/* 08 — INHERITANCE */}
          <article id="inherited-property-nri" className={ARTICLE_BASE}>
            <span aria-hidden="true" className="pointer-events-none absolute top-0 right-0 w-28 h-28 opacity-[0.45] transition-opacity duration-[160ms] lg:group-hover/article:opacity-[0.7] motion-reduce:transition-none" style={{ background: "radial-gradient(circle at 100% 0%, rgba(124,58,237,.05) 0%, transparent 60%)", zIndex: 0 }} />
            <div className="relative z-[1]">
              <div className="flex items-start gap-3 lg:gap-3.5">
                <GuideIconTile primary={Users} secondary={Home} plateFg="#F1EDFF" plateBg="#E1D8FF" accent="#7C3AED" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-[6px]">
                    <span className="text-[12px] font-[700]" style={{ fontFamily: SANS, color: "#5B3BC4" }}>08</span>
                    <span className="inline-flex items-center rounded-full px-[8px] py-[2px] text-[10.5px] font-[700] uppercase tracking-[0.06em] border" style={{ fontFamily: SANS, background: "#F3EFFF", color: "#5B3BC4", borderColor: "rgba(124,58,237,.18)" }}>OWNERSHIP</span>
                  </div>
                  <h3 className="mt-[6px] text-[21px] sm:text-[22px] lg:text-[clamp(21px,1.8vw,25px)] font-[650] leading-[1.2] text-[#172235]" style={{ fontFamily: SANS }}>
                    I inherited property in India. What happens next?
                  </h3>
                </div>
              </div>
              <p className="mt-[12px] text-[14px] lg:text-[14.5px] font-[460] leading-[1.6] text-[#536176]" style={{ fontFamily: SANS }}>
                The first step is to establish the ownership or succession position and understand which documents the case requires. From there, the relevant legal or professional documentation and property records can be updated before the property is managed, rented or sold.
              </p>
              <GuideDetails moreColor="#5B3BC4">
                <ol className="list-none flex flex-col mt-[4px]">
                  {INHERITANCE_STEPS.map((step, i) => {
                    const isLast = i === INHERITANCE_STEPS.length - 1;
                    return (
                      <li key={i} className="grid grid-cols-[28px_minmax(0,1fr)] gap-3">
                        <div className="relative self-stretch flex flex-col items-center">
                          <span className="relative z-[1] flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-[700] text-white" style={{ background: "#7C3AED", fontFamily: SANS }}>
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          {!isLast && (
                            <div className="flex-1 w-[2px]" aria-hidden="true" style={{ background: "linear-gradient(180deg, #7C3AED 0%, #5B5BD6 100%)", opacity: 0.22 }} />
                          )}
                        </div>
                        <div className={isLast ? "" : "pb-[12px]"}>
                          <p className="text-[13px] lg:text-[13.5px] font-[475] leading-[1.5] text-[#536176] pt-[4px]" style={{ fontFamily: SANS }}>{step}</p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </GuideDetails>
            </div>
          </article>

          {/* 09 — POA */}
          <article id="power-of-attorney-nri-property" className={`${ARTICLE_BASE} lg:col-span-2`}>
            <span aria-hidden="true" className="pointer-events-none absolute top-0 right-0 w-28 h-28 opacity-[0.45] transition-opacity duration-[160ms] lg:group-hover/article:opacity-[0.7] motion-reduce:transition-none" style={{ background: "radial-gradient(circle at 100% 0%, rgba(124,58,237,.05) 0%, transparent 60%)", zIndex: 0 }} />
            <div className="relative z-[1]">
              <div className="flex items-start gap-3 lg:gap-3.5">
                <GuideIconTile primary={ScrollText} secondary={BookOpen} plateFg="#F1EDFF" plateBg="#E1D8FF" accent="#7C3AED" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-[6px]">
                    <span className="text-[12px] font-[700]" style={{ fontFamily: SANS, color: "#5B3BC4" }}>09</span>
                    <span className="inline-flex items-center rounded-full px-[8px] py-[2px] text-[10.5px] font-[700] uppercase tracking-[0.06em] border" style={{ fontFamily: SANS, background: "#F3EFFF", color: "#5B3BC4", borderColor: "rgba(124,58,237,.18)" }}>POA</span>
                  </div>
                  <h3 className="mt-[6px] text-[21px] sm:text-[22px] lg:text-[clamp(21px,1.8vw,25px)] font-[650] leading-[1.2] text-[#172235]" style={{ fontFamily: SANS }}>
                    What does a Power of Attorney allow someone to do?
                  </h3>
                </div>
              </div>
              <p className="mt-[12px] text-[14px] lg:text-[14.5px] font-[460] leading-[1.6] text-[#536176]" style={{ fontFamily: SANS }}>
                A Power of Attorney authorises another person to perform specified actions. It does not itself transfer ownership.
              </p>
              <p className="mt-[8px] text-[14px] lg:text-[14.5px] font-[460] leading-[1.6] text-[#536176]" style={{ fontFamily: SANS }}>
                What the attorney can do depends on the wording, purpose and requirements of the transaction or authority involved.
              </p>
              <GuideDetails moreColor="#5B3BC4" heading="What to keep in mind">
                <ul className="grid grid-cols-1 lg:grid-cols-2 gap-y-[8px] gap-x-[24px]">
                  {[
                    "Authority depends on the wording",
                    "The Power of Attorney should match the purpose",
                    "Management and sale authority may differ",
                    "Important property transactions warrant appropriate legal review",
                    "Remote handling does not automatically mean every process can occur without owner involvement",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-[8px]">
                      <span className="mt-[5px] w-[5px] h-[5px] rounded-full flex-shrink-0" aria-hidden="true" style={{ background: "#7C3AED" }} />
                      <span className="text-[13.5px] lg:text-[14px] font-[460] leading-[1.52] text-[#536176]" style={{ fontFamily: SANS }}>{item}</span>
                    </li>
                  ))}
                </ul>
              </GuideDetails>
            </div>
          </article>

        </div>
      </div>
    </section>
  );
}

// ── Band 5A: Who Does What ────────────────────────────────────────────────────

const ROLES = [
  {
    icon: UserRound,
    label: "REEVE",
    heading: "Coordinates and executes eligible work",
    accent: "#22D3EE",
    accentLabel: "#67E8F9",
    plateFg: "rgba(34,211,238,.13)",
    plateBg: "rgba(34,211,238,.065)",
    glow: "0 8px 22px rgba(34,211,238,.12)",
    bullets: [
      "One point of contact",
      "Communication and follow-up",
      "Document collection and coordination",
      "Bangalore on-ground property work, including physical sale execution where applicable",
    ],
  },
  {
    icon: Scale,
    label: "LICENSED PROFESSIONALS",
    heading: "Perform and sign professional work",
    accent: "#A78BFA",
    accentLabel: "#C4B5FD",
    plateFg: "rgba(167,139,250,.14)",
    plateBg: "rgba(124,58,237,.08)",
    glow: "0 8px 22px rgba(124,58,237,.14)",
    bullets: [
      "Tax work, certification and regulated filings",
      "Legal opinions",
      "Title and legal review",
      "Professional documentation",
    ],
  },
  {
    icon: Landmark,
    label: "AUTHORITIES / THIRD PARTIES",
    heading: "Control official actions",
    accent: "#60A5FA",
    accentLabel: "#93C5FD",
    plateFg: "rgba(96,165,250,.14)",
    plateBg: "rgba(37,99,235,.075)",
    glow: "0 8px 22px rgba(37,99,235,.13)",
    bullets: [
      "Approvals",
      "Registration and official records",
      "Government processing and statutory decisions",
      "Official timelines",
    ],
  },
];

const PROMISE_LIMITS = [
  "A guaranteed government timeline",
  "A guaranteed legal or administrative outcome",
  "A tax or legal opinion issued in Reeve's name",
  "A standard NRI-services price before understanding the work",
];

function WhoDoesWhatSection() {
  return (
    <section
      id="responsibilities"
      aria-labelledby="responsibilities-heading"
      className="scroll-mt-16"
      style={{
        background: `
          radial-gradient(48% 54% at 4% 4%, rgba(34,211,238,.14) 0%, rgba(34,211,238,.045) 42%, transparent 74%),
          radial-gradient(50% 58% at 96% 8%, rgba(124,58,237,.20) 0%, rgba(124,58,237,.06) 44%, transparent 76%),
          linear-gradient(135deg, #07101F 0%, #0A1430 48%, #12163A 100%)
        `,
      }}
    >
      <div className="mx-auto max-w-[1240px] px-5 sm:px-8 lg:px-10 pt-16 sm:pt-[76px] lg:pt-[94px] pb-[72px] sm:pb-[80px] lg:pb-[96px]">

        {/* ── Intro ── */}
        <p className="text-[11.5px] lg:text-[12px] font-[700] uppercase tracking-[0.12em]"
           style={{ fontFamily: SANS, color: "#67E8F9" }}>
          WHO DOES WHAT
        </p>
        <h2
          id="responsibilities-heading"
          className="mt-3 text-[clamp(32px,8.5vw,35px)] sm:text-[40px] lg:text-[clamp(42px,3.2vw,46px)] max-w-[760px]"
          style={{ fontFamily: SERIF, fontWeight: 400, lineHeight: 1.06, letterSpacing: "-0.015em", color: "#F8FAFC" }}
        >
          Clear responsibilities. No impossible promises.
        </h2>
        <p className="mt-[14px] max-w-[760px] text-[15.5px] lg:text-[17px]"
           style={{ fontFamily: SANS, fontWeight: 475, lineHeight: 1.6, color: "#C5D1E3" }}>
          Reeve coordinates the work, but some responsibilities sit with licensed professionals, authorities or other third parties. Here's who does what.
        </p>

        {/* ── Unified responsibility frame ── */}
        <div
          className="mt-[28px] lg:mt-[36px]"
          style={{
            background: "linear-gradient(180deg, rgba(255,255,255,.055) 0%, rgba(255,255,255,.028) 100%)",
            border: "1px solid rgba(255,255,255,.10)",
            borderRadius: 22,
            boxShadow: "0 18px 50px rgba(0,0,0,.14)",
          }}
        >
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1px_1fr_1px_1fr]">
            {ROLES.map((role, i) => {
              const Icon = role.icon;
              const isLast = i === ROLES.length - 1;
              return (
                <React.Fragment key={role.label}>
                  <article className="min-w-0 p-[18px] sm:p-[20px] lg:p-[26px]">
                    <span className="relative flex-shrink-0 w-10 h-10 lg:w-11 lg:h-11" style={{ display: "block" }}>
                      <span aria-hidden="true" className="absolute inset-0 rounded-xl opacity-60"
                            style={{ background: role.plateBg, transform: "translate(3px,3px)" }} />
                      <span className="relative z-[1] flex h-full w-full items-center justify-center rounded-xl"
                            style={{ background: role.plateFg, boxShadow: role.glow, border: `1px solid ${role.accent}66` }}>
                        <Icon size={18} color={role.accent} aria-hidden="true" />
                      </span>
                    </span>
                    <p className="mt-[10px] text-[11px] font-[700] uppercase tracking-[0.08em]"
                       style={{ fontFamily: SANS, color: role.accentLabel }}>
                      {role.label}
                    </p>
                    <h3 className="mt-[7px] text-[18px] lg:text-[20px] font-[650] leading-[1.25]"
                        style={{ fontFamily: SANS, color: "#F8FAFC" }}>
                      {role.heading}
                    </h3>
                    <ul className="mt-[12px] flex flex-col gap-[8px]">
                      {role.bullets.map((b) => (
                        <li key={b} className="flex items-start gap-[8px]">
                          <span className="mt-[7px] w-[5px] h-[5px] rounded-full flex-shrink-0" aria-hidden="true"
                                style={{ background: role.accent }} />
                          <span className="min-w-0 text-[14px] lg:text-[14.5px] font-[475] leading-[1.5]"
                                style={{ fontFamily: SANS, color: "#C5D1E3" }}>
                            {b}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </article>
                  {!isLast && (
                    <>
                      <div aria-hidden="true"
                           className="hidden lg:block w-px self-stretch"
                           style={{ background: "linear-gradient(180deg, transparent 0%, rgba(180,195,225,.17) 15%, rgba(180,195,225,.17) 85%, transparent 100%)" }} />
                      <div aria-hidden="true"
                           className="lg:hidden h-px mx-[18px] sm:mx-[20px]"
                           style={{ background: "linear-gradient(90deg, transparent, rgba(180,195,225,.16) 10%, rgba(180,195,225,.16) 90%, transparent)" }} />
                    </>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* ── Honesty strip ── */}
        <aside
          aria-labelledby="nri-promises-heading"
          className="mt-[16px] lg:mt-[22px] overflow-hidden relative"
          style={{
            background: `
              radial-gradient(70% 170% at 0% 0%, rgba(249,115,91,.18) 0%, transparent 66%),
              linear-gradient(105deg, rgba(249,115,91,.11) 0%, rgba(251,146,60,.065) 54%, rgba(124,58,237,.035) 100%)
            `,
            border: "1px solid rgba(249,115,91,.28)",
            borderRadius: 18,
          }}
        >
          <div aria-hidden="true"
               className="pointer-events-none absolute top-0 left-0 right-0 h-[2px]"
               style={{ background: "linear-gradient(90deg, #F9735B, #FB923C 68%, rgba(251,146,60,.18))" }} />
          <div className="p-[18px] sm:p-[20px] lg:p-[26px] pt-[20px] lg:pt-[28px]">
            <div className="flex flex-col lg:flex-row lg:gap-[24px]">
              <div className="flex-shrink-0">
                <span className="relative w-10 h-10 lg:w-11 lg:h-11" style={{ display: "block" }}>
                  <span aria-hidden="true" className="absolute inset-0 rounded-xl opacity-60"
                        style={{ background: "rgba(249,115,91,.075)", transform: "translate(3px,3px)" }} />
                  <span className="relative z-[1] flex h-full w-full items-center justify-center rounded-xl"
                        style={{ background: "rgba(249,115,91,.15)", boxShadow: "0 8px 22px rgba(249,115,91,.11)", border: "1px solid rgba(249,115,91,.4)" }}>
                    <Shield size={18} color="#FDBA9A" aria-hidden="true" />
                  </span>
                </span>
              </div>
              <div className="min-w-0 mt-[12px] lg:mt-0">
                <h3 id="nri-promises-heading"
                    className="text-[24px] lg:text-[28px]"
                    style={{ fontFamily: SERIF, fontWeight: 400, lineHeight: 1.1, color: "#FFF7F5" }}>
                  What we won't promise
                </h3>
                <ul className="mt-[14px] grid grid-cols-1 lg:grid-cols-2 gap-y-[10px] gap-x-[24px]">
                  {PROMISE_LIMITS.map((p) => (
                    <li key={p} className="flex items-start gap-[8px]">
                      <span className="mt-[5px] w-[5px] h-[5px] rounded-full flex-shrink-0" aria-hidden="true"
                            style={{ background: "#F9735B" }} />
                      <span className="min-w-0 text-[14px] lg:text-[15px] font-[600] leading-[1.4]"
                            style={{ fontFamily: SANS, color: "#F8E7E3" }}>
                        {p}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="mt-[14px] pt-[12px] border-t border-[rgba(249,115,91,.18)]">
                  <p className="text-[14px] lg:text-[14.5px] font-[525] leading-[1.5]"
                     style={{ fontFamily: SANS, color: "#FFD8CF" }}>
                    If something falls outside what we can responsibly coordinate, we'll tell you.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </aside>

      </div>
    </section>
  );
}

// ── Band 5 partial: NRI FAQ ───────────────────────────────────────────────────

function NriFaqSection() {
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
      id="faq"
      aria-labelledby="nri-faq-heading"
      className="bg-[#F4F4FF] scroll-mt-16 pt-16 pb-16 lg:pt-[84px] lg:pb-[84px]"
    >
      <div className="mx-auto max-w-[1240px] px-5 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-[880px]">

          <h2
            id="nri-faq-heading"
            className="text-center text-[30px] font-normal leading-[1.06] tracking-[-0.015em] text-[#0B1526] lg:text-[clamp(38px,3vw,42px)]"
            style={{ fontFamily: SERIF }}
          >
            NRI Property FAQs
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
                    className="min-w-0 text-[15px] lg:text-[16.5px] font-[650] leading-[1.35] text-[#172235] group-open:text-[#1D4ED8]"
                    style={{ fontFamily: SANS }}
                  >
                    Can Reeve help if my property is outside Bangalore?
                  </span>
                  {chevron}
                </summary>
                <div className="pb-[18px] lg:pb-5 pr-[34px] lg:pr-11 max-w-[720px]">
                  <p
                    className="text-[14px] lg:text-[15px] font-[500] leading-[1.55] lg:leading-[1.6] text-[#536074]"
                    style={{ fontFamily: SANS }}
                  >
                    <strong className="font-[650] text-[#243244]">Yes, depending on what needs to be done.</strong>{" "}
                    Reeve can coordinate sale documentation and tax work, rent/TDS, legal and professional work, and property-document matters across India through appropriate independent professionals. Direct property management, vacant care, tenant placement, khata work and physical sale execution are currently limited to Bangalore.
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
                    className="min-w-0 text-[15px] lg:text-[16.5px] font-[650] leading-[1.35] text-[#172235] group-open:text-[#1D4ED8]"
                    style={{ fontFamily: SANS }}
                  >
                    Do I need to travel to India?
                  </span>
                  {chevron}
                </summary>
                <div className="pb-[18px] lg:pb-5 pr-[34px] lg:pr-11 max-w-[720px]">
                  <p
                    className="text-[14px] lg:text-[15px] font-[500] leading-[1.55] lg:leading-[1.6] text-[#536074]"
                    style={{ fontFamily: SANS }}
                  >
                    <strong className="font-[650] text-[#243244]">Not necessarily.</strong>{" "}
                    Many property matters can be coordinated remotely, and an authorised representative or professional may be able to handle parts of some processes. Other transactions or authorities may require your involvement or presence. Reeve first reviews the situation and explains what is actually required.
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
                    className="min-w-0 text-[15px] lg:text-[16.5px] font-[650] leading-[1.35] text-[#172235] group-open:text-[#1D4ED8]"
                    style={{ fontFamily: SANS }}
                  >
                    What if I don&#8217;t know which service I need?
                  </span>
                  {chevron}
                </summary>
                <div className="pb-[18px] lg:pb-5 pr-[34px] lg:pr-11 max-w-[720px]">
                  <p
                    className="text-[14px] lg:text-[15px] font-[500] leading-[1.55] lg:leading-[1.6] text-[#536074]"
                    style={{ fontFamily: SANS }}
                  >
                    That&#8217;s completely fine.{" "}
                    <strong className="font-[650] text-[#243244]">You don&#8217;t need to diagnose the problem before contacting Reeve.</strong>{" "}
                    Tell us what&#8217;s happening, where the property is and what you&#8217;re trying to achieve. We&#8217;ll work out what kind of coordination is involved.
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
                    className="min-w-0 text-[15px] lg:text-[16.5px] font-[650] leading-[1.35] text-[#172235] group-open:text-[#1D4ED8]"
                    style={{ fontFamily: SANS }}
                  >
                    Can Reeve help with inherited or co-owned property?
                  </span>
                  {chevron}
                </summary>
                <div className="pb-[18px] lg:pb-5 pr-[34px] lg:pr-11 max-w-[720px]">
                  <p
                    className="text-[14px] lg:text-[15px] font-[500] leading-[1.55] lg:leading-[1.6] text-[#536074]"
                    style={{ fontFamily: SANS }}
                  >
                    <strong className="font-[650] text-[#243244]">Yes, we can coordinate these situations.</strong>{" "}
                    Depending on the circumstances, that may involve document review, succession or ownership documentation, professional legal work, record updates, ongoing management or eventual sale support. The exact steps depend on the property&#8217;s ownership and documentation.
                  </p>
                </div>
              </details>
            </div>

            {/* FAQ 5 */}
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
                    Can Reeve coordinate several properties or property matters at once?
                  </span>
                  {chevron}
                </summary>
                <div className="pb-[18px] lg:pb-5 pr-[34px] lg:pr-11 max-w-[720px]">
                  <p
                    className="text-[14px] lg:text-[15px] font-[500] leading-[1.55] lg:leading-[1.6] text-[#536074]"
                    style={{ fontFamily: SANS }}
                  >
                    <strong className="font-[650] text-[#243244]">Yes.</strong>{" "}
                    The coordination model is designed to give you one point of contact even when several professionals or tasks are involved. Physical property work is limited to Reeve&#8217;s Bangalore service area, while eligible professional and documentation coordination can extend across India.
                  </p>
                </div>
              </details>
            </div>

            {/* FAQ 6 */}
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
                    How does Reeve decide what the service will cost?
                  </span>
                  {chevron}
                </summary>
                <div className="pb-[18px] lg:pb-5 pr-[34px] lg:pr-11 max-w-[720px]">
                  <p
                    className="text-[14px] lg:text-[15px] font-[500] leading-[1.55] lg:leading-[1.6] text-[#536074]"
                    style={{ fontFamily: SANS }}
                  >
                    We first look at{" "}
                    <strong className="font-[650] text-[#243244]">the situation and the work actually required</strong>.
                    {" "}We then explain the scope and provide a quote before you decide whether to proceed. We don&#8217;t publish a fixed NRI-service price because the documents, professionals and processes involved vary substantially between properties.
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

// ── Band 6: Enquiry ───────────────────────────────────────────────────────────

function NriEnquirySection() {
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
                <PropertyEnquiryForm />
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function NriPropertyServicesIndia() {
  return (
    <Layout>
      {/* Band 1: Hero */}
      <NriHeroSection />

      {/* Band 2: Situation Router */}
      <NriSituationsSection />

      {/* Band 3: Coordinator — Concierge scope + Process */}
      <NriCoordinatorBand />
      <NriPropertyGuideSection />
      <WhoDoesWhatSection />
      <NriFaqSection />

      {/* Band 6: Enquiry */}
      <NriEnquirySection />
    </Layout>
  );
}
