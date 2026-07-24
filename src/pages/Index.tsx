import { Link } from "react-router-dom";
import { Lock, ChevronRight } from "lucide-react";
import Layout from "@/components/Layout";

const FONT_SERIF = "'Instrument Serif', Georgia, serif";
const FONT_SANS  = "'DM Sans', system-ui, sans-serif";
const FONT_INTER = "'Inter', Arial, sans-serif";

export default function Index() {
  return (
    <Layout>
      <main>
        {/* Section 1 — Hero */}
        <section aria-label="Hero" className="bg-[#F7F5F1] pt-16 pb-12 sm:pt-20 sm:pb-16 lg:pt-28 lg:pb-24">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">

              {/* Left column — copy + CTAs */}
              <div className="flex flex-col">

                {/* Eyebrow */}
                <span
                  className="text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-600"
                  style={{ fontFamily: FONT_SANS }}
                >
                  Transparent property marketplace · India
                </span>

                {/* Headline */}
                <h1
                  className="mt-4 text-[2.5rem] sm:text-5xl lg:text-[3.5rem] font-normal leading-[1.1] text-[#0F1C2E]"
                  style={{ fontFamily: FONT_SERIF }}
                >
                  See more before
                  <br />
                  you contact.
                </h1>

                {/* Subheadline */}
                <p
                  className="mt-4 text-base sm:text-lg text-slate-500 leading-relaxed max-w-md"
                  style={{ fontFamily: FONT_SANS }}
                >
                  Reeve shows you who listed a property, how responsive they are, and what
                  has happened to the listing — before you reach out.
                </p>

                {/* CTA groups */}
                <div className="mt-8 flex flex-col sm:flex-row gap-6">

                  {/* Find a home */}
                  <div className="flex flex-col gap-2">
                    <p
                      className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400"
                      style={{ fontFamily: FONT_SANS }}
                    >
                      Find a home
                    </p>
                    <div className="flex gap-3">
                      <Link
                        to="/search?type=buy"
                        className="px-5 py-3 rounded-lg border border-[#0F1C2E] text-[#0F1C2E] text-sm font-medium hover:bg-[#0F1C2E] hover:text-white transition-all duration-200 min-h-[44px] flex items-center justify-center"
                        style={{ fontFamily: FONT_SANS }}
                      >
                        Buy
                      </Link>
                      <Link
                        to="/search?type=rent"
                        className="px-5 py-3 rounded-lg bg-[#2563EB] text-white text-sm font-medium hover:bg-blue-700 transition-all duration-200 min-h-[44px] flex items-center justify-center"
                        style={{ fontFamily: FONT_SANS }}
                      >
                        Rent
                      </Link>
                    </div>
                  </div>

                  {/* Offer a home */}
                  <div className="flex flex-col gap-2">
                    <p
                      className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400"
                      style={{ fontFamily: FONT_SANS }}
                    >
                      Offer a home
                    </p>
                    <div className="flex gap-3">
                      <Link
                        to="/list?listing_type=sale"
                        className="px-5 py-3 rounded-lg border border-[#0F1C2E] text-[#0F1C2E] text-sm font-medium hover:bg-[#0F1C2E] hover:text-white transition-all duration-200 min-h-[44px] flex items-center justify-center"
                        style={{ fontFamily: FONT_SANS }}
                      >
                        Sell
                      </Link>
                      <Link
                        to="/list"
                        className="px-5 py-3 rounded-lg bg-[#2563EB] text-white text-sm font-medium hover:bg-blue-700 transition-all duration-200 min-h-[44px] flex items-center justify-center"
                        style={{ fontFamily: FONT_SANS }}
                      >
                        Rent it out
                      </Link>
                    </div>
                  </div>

                </div>

                {/* Proof points */}
                <ul className="mt-8 flex flex-col gap-2.5">
                  {[
                    "See who is behind every listing — owner, broker, or manager",
                    "Check response rate before you send a request",
                    "Browse listing history and price changes while it is live",
                  ].map((point) => (
                    <li
                      key={point}
                      className="flex items-start gap-2.5 text-sm text-slate-500"
                      style={{ fontFamily: FONT_SANS }}
                    >
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                      {point}
                    </li>
                  ))}
                </ul>

              </div>

              {/* Right column — LCP image; no animation on this element or any ancestor */}
              <div>
                <img
                  src="/images/commons_image_S1.webp"
                  alt="Reeve transparent property marketplace — see lister details, response rate, and listing history before contacting"
                  className="w-full h-auto object-contain rounded-2xl"
                  width={600}
                  height={500}
                  loading="eager"
                  fetchPriority="high"
                  decoding="async"
                />
              </div>

            </div>
          </div>
        </section>

        {/* Section 2 — See What's Behind the Listing */}
        <section
          aria-label="See What's Behind the Listing"
          className="[background:linear-gradient(to_bottom,#F7F5F1_0px,#EFEBE4_100px,#EFEBE4_100%)] pt-16 pb-16 sm:pt-20 sm:pb-20 lg:pt-24 lg:pb-24"
        >
          <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12">
            <div className="[@media(min-width:900px)]:grid [@media(min-width:900px)]:grid-cols-[minmax(300px,1fr)_2fr] [@media(min-width:900px)]:gap-14 [@media(min-width:900px)]:items-center">

              {/* Left: editorial content — eyebrow, headline, paragraph only */}
              <div className="flex flex-col justify-center">

                {/* Eyebrow */}
                <p
                  className="text-[12px] font-semibold uppercase tracking-[0.10em] text-[#0F766E] leading-[1.4]"
                  style={{ fontFamily: FONT_INTER }}
                >
                  More than the advertisement
                </p>

                {/* Headline */}
                <h2
                  className="mt-6 text-[clamp(40px,4.3vw,60px)] font-normal leading-[1.05] tracking-[-0.015em] text-[#0F172A]"
                  style={{ fontFamily: FONT_SERIF }}
                >
                  See what's behind the listing.
                </h2>

                {/* Supporting paragraph */}
                <p
                  className="mt-7 text-[18px] leading-[1.65] text-[#475569] max-w-[420px]"
                  style={{ fontFamily: FONT_INTER }}
                >
                  A property ad is only one side of the story. Reeve brings the person behind it,
                  key terms, listing activity and public discussion into the same view—before you
                  decide to reach out.
                </p>

              </div>

              {/* Right: product image — no animation on this element or its parent */}
              <div className="mt-10 -mx-2 sm:mx-0 [@media(min-width:900px)]:mt-0">
                <img
                  src="/images/commons_image_S2.webp"
                  alt="Reeve property listing example showing a property, lister responsiveness, rental terms, public discussion, and listing history."
                  className="w-full h-auto object-contain block"
                  width={840}
                  height={1080}
                  loading="lazy"
                  decoding="async"
                />
              </div>

            </div>
          </div>
        </section>

        {/* Section 3 — Contact Without Losing Control */}
        <section
          aria-label="Contact Without Losing Control"
          className="[background:linear-gradient(to_bottom,#EFEBE4_0px,#F7F5F1_110px,#F7F5F1_100%)] pt-16 pb-16 sm:pt-20 sm:pb-20 lg:pt-24 lg:pb-24"
        >
          <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12">
            {/* Dark canvas */}
            <div className="bg-[#0F172A] rounded-[32px] p-8 sm:p-10 lg:p-16 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
              {/* Two-column at ≥1100px */}
              <div className="[@media(min-width:1100px)]:grid [@media(min-width:1100px)]:grid-cols-[minmax(280px,0.38fr)_0.62fr] [@media(min-width:1100px)]:gap-16 [@media(min-width:1100px)]:items-start">

                {/* LEFT — editorial */}
                <div className="flex flex-col mb-10 [@media(min-width:1100px)]:mb-0">
                  <p
                    className="text-[12px] font-semibold uppercase tracking-[0.10em] text-[#5EEAD4]"
                    style={{ fontFamily: FONT_INTER }}
                  >
                    Contact without losing control
                  </p>
                  <h2
                    className="mt-6 text-[clamp(36px,3.8vw,54px)] font-normal leading-[1.1] text-[#F8FAFC]"
                    style={{ fontFamily: FONT_SERIF }}
                  >
                    You clicked on one property. You&nbsp;shouldn't get ten phone calls.
                  </h2>
                  <p
                    className="mt-6 text-[17px] leading-[1.65] text-[#94A3B8] max-w-[380px]"
                    style={{ fontFamily: FONT_INTER }}
                  >
                    When Priya requests contact through Reeve, she stays private until the owner decides to connect. No number shared. No spam. One clear approval step — and a reputation signal that holds both sides accountable.
                  </p>
                </div>

                {/* RIGHT — cards + reputation */}
                <div>
                  {/* 3-card row */}
                  <div className="flex flex-col [@media(min-width:800px)]:flex-row [@media(min-width:800px)]:items-start gap-2">

                    {/* Card 1 — REQUEST PRIVATELY */}
                    <div className="flex-1 bg-white rounded-[18px] p-5 shadow-[0_8px_24px_rgba(15,23,42,0.06)] motion-safe:hover:-translate-y-0.5 transition-transform duration-200">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 mb-3" style={{ fontFamily: FONT_INTER }}>
                        01 · Request privately
                      </p>
                      {/* Person header */}
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-full bg-[#DBEAFE] text-[#1D4ED8] flex items-center justify-center text-[11px] font-bold shrink-0" style={{ fontFamily: FONT_INTER }}>
                          PM
                        </div>
                        <div>
                          <p className="text-[13px] font-medium text-[#0F172A] leading-none" style={{ fontFamily: FONT_INTER }}>Priya Mehta</p>
                          <p className="text-[10px] text-[#64748B] mt-0.5" style={{ fontFamily: FONT_INTER }}>Tenant</p>
                        </div>
                      </div>
                      {/* Verification badges */}
                      <div className="flex gap-1.5 flex-wrap mb-3">
                        {["📱 Phone verified", "🔗 Google verified"].map((badge) => (
                          <span
                            key={badge}
                            className="text-[10px] text-[#15803D] bg-[#F0FDF4] border border-[#BBF7D0] rounded-full px-2 py-0.5 leading-none"
                            style={{ fontFamily: FONT_INTER }}
                          >
                            {badge}
                          </span>
                        ))}
                      </div>
                      {/* Hidden contact indicator */}
                      <div className="flex items-center gap-1.5 mb-2">
                        <Lock size={12} className="text-slate-400 shrink-0" />
                        <span className="text-[11px] text-slate-400" style={{ fontFamily: FONT_INTER }}>Contact details hidden</span>
                      </div>
                      <div className="bg-slate-100 h-5 rounded w-3/4" />
                    </div>

                    {/* Connector */}
                    <ChevronRight className="hidden [@media(min-width:800px)]:block mt-10 shrink-0 text-[rgba(255,255,255,0.45)]" size={16} />
                    <div className="block [@media(min-width:800px)]:hidden text-center text-[rgba(255,255,255,0.35)] text-sm py-1">↓</div>

                    {/* Card 2 — REVIEW */}
                    <div className="flex-1 bg-white rounded-[18px] p-5 shadow-[0_8px_24px_rgba(15,23,42,0.06)] motion-safe:hover:-translate-y-0.5 transition-transform duration-200">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 mb-3" style={{ fontFamily: FONT_INTER }}>
                        02 · Review
                      </p>
                      {/* Person header */}
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-full bg-[#FEF3C7] text-[#92400E] flex items-center justify-center text-[11px] font-bold shrink-0" style={{ fontFamily: FONT_INTER }}>
                          RS
                        </div>
                        <div>
                          <p className="text-[13px] font-medium text-[#0F172A] leading-none" style={{ fontFamily: FONT_INTER }}>Rahul Sharma</p>
                          <p className="text-[10px] text-[#64748B] mt-0.5" style={{ fontFamily: FONT_INTER }}>Owner</p>
                        </div>
                      </div>
                      {/* Still private */}
                      <div className="flex items-center gap-1.5 mb-3">
                        <Lock size={12} className="text-slate-400 shrink-0" />
                        <span className="text-[11px] text-slate-400" style={{ fontFamily: FONT_INTER }}>Details still private</span>
                      </div>
                      {/* Action buttons (non-functional) */}
                      <button type="button" className="border border-slate-200 text-slate-500 text-[12px] rounded-lg px-3 py-1.5 w-full min-h-[36px]" style={{ fontFamily: FONT_INTER }}>
                        Decline
                      </button>
                      <button type="button" className="bg-[#2563EB] text-white text-[12px] rounded-lg px-3 py-1.5 w-full mt-1.5 font-medium min-h-[36px]" style={{ fontFamily: FONT_INTER }}>
                        Approve
                      </button>
                    </div>

                    {/* Connector */}
                    <ChevronRight className="hidden [@media(min-width:800px)]:block mt-10 shrink-0 text-[rgba(255,255,255,0.45)]" size={16} />
                    <div className="block [@media(min-width:800px)]:hidden text-center text-[rgba(255,255,255,0.35)] text-sm py-1">↓</div>

                    {/* Card 3 — CONNECT DIRECTLY */}
                    <div className="flex-1 bg-white rounded-[18px] p-5 shadow-[0_8px_24px_rgba(15,23,42,0.06)] motion-safe:hover:-translate-y-0.5 transition-transform duration-200">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 mb-3" style={{ fontFamily: FONT_INTER }}>
                        03 · Connect directly
                      </p>
                      {/* Approved badge */}
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-7 h-7 rounded-full bg-[#DCFCE7] flex items-center justify-center shrink-0">
                          <span className="text-[#16A34A] text-[13px] font-bold leading-none">✓</span>
                        </div>
                        <span className="text-[11px] font-medium text-[#16A34A]" style={{ fontFamily: FONT_INTER }}>Connection approved</span>
                      </div>
                      {/* The two parties */}
                      <div className="flex flex-col gap-1.5 mb-3">
                        {[
                          { initials: "PM", bg: "#DBEAFE", color: "#1D4ED8", name: "Priya Mehta" },
                          { initials: "RS", bg: "#FEF3C7", color: "#92400E", name: "Rahul Sharma" },
                        ].map(({ initials, bg, color, name }, i) => (
                          <div key={name}>
                            {i === 1 && <p className="text-[10px] text-slate-300 text-center my-1" style={{ fontFamily: FONT_INTER }}>↔</p>}
                            <div className="flex items-center gap-2">
                              <div
                                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                                style={{ background: bg, color, fontFamily: FONT_INTER }}
                              >
                                {initials}
                              </div>
                              <span className="text-[12px] text-[#0F172A] font-medium" style={{ fontFamily: FONT_INTER }}>{name}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      {/* Shared privately */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-[#16A34A] text-[11px] font-bold">✓</span>
                        <span className="text-[11px] text-slate-500" style={{ fontFamily: FONT_INTER }}>Shared privately</span>
                      </div>
                    </div>

                  </div>{/* end cards row */}

                  {/* Reputation panel */}
                  <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-[18px] p-5 mt-4">
                    {/* Top: label + metric */}
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400" style={{ fontFamily: FONT_INTER }}>After the connection</p>
                        <p className="mt-1 text-[15px] font-semibold text-[#0F172A] leading-snug" style={{ fontFamily: FONT_INTER }}>Real connections build reputation.</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[28px] font-bold text-[#0F172A] leading-none" style={{ fontFamily: FONT_INTER }}>92%</p>
                        <p className="text-[10px] text-slate-400 mt-0.5" style={{ fontFamily: FONT_INTER }}>would deal again · 12 ratings</p>
                      </div>
                    </div>
                    {/* Divider */}
                    <div className="my-4 border-t border-[#E2E8F0]" />
                    {/* 3 feedback items */}
                    <div className="grid grid-cols-1 [@media(min-width:600px)]:grid-cols-3 gap-3">
                      {[
                        { name: "Ananya S.", text: "Transparent and responsive. No games." },
                        { name: "Kiran M.", text: "Easy process. No middlemen involved." },
                        { name: "Rohan T.", text: "My details stayed private until I agreed." },
                      ].map(({ name, text }) => (
                        <div key={name} className="bg-white border border-[#E2E8F0] rounded-xl px-3 py-2.5">
                          <p className="text-[11px] font-semibold text-[#0F172A]" style={{ fontFamily: FONT_INTER }}>{name}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5 leading-[1.5]" style={{ fontFamily: FONT_INTER }}>{text}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>{/* end right column */}

              </div>
            </div>
          </div>
        </section>

        {/* Section 4 — Different by Design */}
        <section
          aria-label="Different by Design"
          className="bg-[#F7F5F1] pt-20 pb-20 sm:pt-24 sm:pb-24"
        >
          <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12">

            {/* Main two-column grid at ≥1000px */}
            <div className="[@media(min-width:1000px)]:grid [@media(min-width:1000px)]:grid-cols-[minmax(320px,0.36fr)_0.64fr] [@media(min-width:1000px)]:gap-x-16 [@media(min-width:1000px)]:items-start">

              {/* LEFT — editorial */}
              <div className="flex flex-col mb-12 [@media(min-width:1000px)]:mb-0">
                <p
                  className="text-[12px] font-semibold uppercase tracking-[0.10em] text-[#0F766E] leading-[1.4]"
                  style={{ fontFamily: FONT_INTER }}
                >
                  Different by Design
                </p>
                <h2
                  className="mt-6 text-[clamp(40px,4.3vw,58px)] font-normal leading-[1.04] tracking-[-0.015em] text-[#0F172A]"
                  style={{ fontFamily: FONT_SERIF }}
                >
                  The marketplace comes first. The business model follows.
                </h2>
                <p
                  className="mt-7 text-[17px] leading-[1.6] text-[#475569] max-w-[410px]"
                  style={{ fontFamily: FONT_INTER }}
                >
                  Reeve keeps core marketplace access separate from paid services, so basic participation and organic visibility don't depend on what you spend.
                </p>
              </div>

              {/* RIGHT — 2×2 editorial principle grid */}
              <div>
                {/* Row 1: 01 + 02 */}
                <div className="grid grid-cols-1 [@media(min-width:1000px)]:grid-cols-2">
                  {/* 01 */}
                  <div className="pb-7 [@media(min-width:1000px)]:pb-10">
                    <div className="grid grid-cols-[38px_1fr] gap-3 [@media(min-width:1000px)]:block">
                      <div className="[@media(min-width:1000px)]:mb-7">
                        <span
                          className="text-[28px] [@media(min-width:1000px)]:text-[44px] font-normal leading-none text-[#C6A76A]"
                          style={{ fontFamily: FONT_SERIF }}
                        >
                          01
                        </span>
                      </div>
                      <div>
                        <h3
                          className="text-[19px] [@media(min-width:1000px)]:text-[21px] font-semibold leading-[1.3] text-[#0F172A]"
                          style={{ fontFamily: FONT_INTER }}
                        >
                          The core marketplace is free.
                        </h3>
                        <p
                          className="mt-4 text-[15px] leading-[1.55] text-[#475569] max-w-[300px]"
                          style={{ fontFamily: FONT_INTER }}
                        >
                          Browse, list, request contact and connect with no marketplace access fee.
                        </p>
                      </div>
                    </div>
                  </div>
                  {/* 02 */}
                  <div className="pb-7 [@media(min-width:1000px)]:pb-10 border-t border-[#D8D5CF] pt-6 [@media(min-width:1000px)]:border-t-0 [@media(min-width:1000px)]:pt-0 [@media(min-width:1000px)]:border-l [@media(min-width:1000px)]:pl-12">
                    <div className="grid grid-cols-[38px_1fr] gap-3 [@media(min-width:1000px)]:block">
                      <div className="[@media(min-width:1000px)]:mb-7">
                        <span
                          className="text-[28px] [@media(min-width:1000px)]:text-[44px] font-normal leading-none text-[#C6A76A]"
                          style={{ fontFamily: FONT_SERIF }}
                        >
                          02
                        </span>
                      </div>
                      <div>
                        <h3
                          className="text-[19px] [@media(min-width:1000px)]:text-[21px] font-semibold leading-[1.3] text-[#0F172A]"
                          style={{ fontFamily: FONT_INTER }}
                        >
                          Organic ranking cannot be bought.
                        </h3>
                        <p
                          className="mt-4 text-[15px] leading-[1.55] text-[#475569] max-w-[300px]"
                          style={{ fontFamily: FONT_INTER }}
                        >
                          Payment does not improve a listing's position in organic results.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Horizontal divider between rows */}
                <div className="border-t border-[#D8D5CF] my-9" />

                {/* Row 2: 03 + 04 */}
                <div className="grid grid-cols-1 [@media(min-width:1000px)]:grid-cols-2">
                  {/* 03 */}
                  <div>
                    <div className="grid grid-cols-[38px_1fr] gap-3 [@media(min-width:1000px)]:block">
                      <div className="[@media(min-width:1000px)]:mb-7">
                        <span
                          className="text-[28px] [@media(min-width:1000px)]:text-[44px] font-normal leading-none text-[#C6A76A]"
                          style={{ fontFamily: FONT_SERIF }}
                        >
                          03
                        </span>
                      </div>
                      <div>
                        <h3
                          className="text-[19px] [@media(min-width:1000px)]:text-[21px] font-semibold leading-[1.3] text-[#0F172A]"
                          style={{ fontFamily: FONT_INTER }}
                        >
                          Participation is open. Disclosure is visible.
                        </h3>
                        <p
                          className="mt-4 text-[15px] leading-[1.55] text-[#475569] max-w-[300px]"
                          style={{ fontFamily: FONT_INTER }}
                        >
                          Owners, brokers, property managers and builders can all participate. The role declared on each listing is shown to users.
                        </p>
                      </div>
                    </div>
                  </div>
                  {/* 04 */}
                  <div className="border-t border-[#D8D5CF] pt-6 [@media(min-width:1000px)]:border-t-0 [@media(min-width:1000px)]:pt-0 [@media(min-width:1000px)]:border-l [@media(min-width:1000px)]:pl-12 mt-7 [@media(min-width:1000px)]:mt-0">
                    <div className="grid grid-cols-[38px_1fr] gap-3 [@media(min-width:1000px)]:block">
                      <div className="[@media(min-width:1000px)]:mb-7">
                        <span
                          className="text-[28px] [@media(min-width:1000px)]:text-[44px] font-normal leading-none text-[#C6A76A]"
                          style={{ fontFamily: FONT_SERIF }}
                        >
                          04
                        </span>
                      </div>
                      <div>
                        <h3
                          className="text-[19px] [@media(min-width:1000px)]:text-[21px] font-semibold leading-[1.3] text-[#0F172A]"
                          style={{ fontFamily: FONT_INTER }}
                        >
                          Paid services stay optional.
                        </h3>
                        <p
                          className="mt-4 text-[15px] leading-[1.55] text-[#475569] max-w-[300px]"
                          style={{ fontFamily: FONT_INTER }}
                        >
                          Using Property Management or Inspection is never required to use the core marketplace.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>{/* end right column */}

            </div>{/* end main grid */}

            {/* Business-model strip — full width */}
            <div className="mt-14 bg-[#EFEBE4] border border-[#D8D5CF] rounded-[16px] p-6 [@media(min-width:1000px)]:px-10 [@media(min-width:1000px)]:py-8 [@media(min-width:1000px)]:grid [@media(min-width:1000px)]:grid-cols-[1.4fr_1fr] [@media(min-width:1000px)]:items-end [@media(min-width:1000px)]:gap-8">
              {/* Left: label + statement */}
              <div>
                <p
                  className="text-[11px] font-semibold uppercase tracking-[0.10em] text-[#0F766E]"
                  style={{ fontFamily: FONT_INTER }}
                >
                  How Reeve makes money
                </p>
                <p
                  className="mt-4 text-[clamp(27px,2.4vw,34px)] font-normal leading-[1.1] text-[#0F172A]"
                  style={{ fontFamily: FONT_SERIF }}
                >
                  Optional services outside the core marketplace.
                </p>
              </div>
              {/* Right: service links */}
              <div className="flex flex-col [@media(min-width:1000px)]:flex-row [@media(min-width:1000px)]:justify-end gap-3 [@media(min-width:1000px)]:gap-12 mt-5 [@media(min-width:1000px)]:mt-0">
                {[
                  { label: "Property Management", to: "/pms" },
                  { label: "Property Inspection", to: "/move-in-audit" },
                ].map(({ label, to }) => (
                  <Link
                    key={to}
                    to={to}
                    className="group inline-flex items-center text-[15px] font-semibold text-[#0F766E] hover:text-[#115E59] transition-colors duration-200"
                    style={{ fontFamily: FONT_INTER }}
                  >
                    {label}
                    <span className="inline-block group-hover:translate-x-[3px] motion-reduce:group-hover:translate-x-0 transition-transform duration-200"> →</span>
                  </Link>
                ))}
              </div>
            </div>

          </div>
        </section>

        {/* Section 5 — Compact Closing Action */}
        <section
          aria-labelledby="closing-action-heading"
          className="bg-[#F7F5F1] pt-20 pb-20 sm:pt-24 sm:pb-24"
        >
          <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12">
            {/* Dark panel */}
            <div className="bg-[#0F172A] rounded-[28px] py-12 px-6 sm:py-14 sm:px-14 lg:px-16 shadow-[0_16px_48px_rgba(15,23,42,0.08)]">

              {/* Heading */}
              <h2
                id="closing-action-heading"
                className="text-[clamp(36px,3.5vw,46px)] font-normal leading-[1.05] tracking-[-0.01em] text-[#F8FAFC] text-center mb-11"
                style={{ fontFamily: FONT_SERIF }}
              >
                What are you here to do?
              </h2>

              {/* Journey groups */}
              <div className="grid grid-cols-1 [@media(min-width:800px)]:grid-cols-2">

                {/* Find a home */}
                <div className="text-center pb-6 [@media(min-width:800px)]:pb-0 [@media(min-width:800px)]:pr-14">
                  <h3
                    className="text-[11px] [@media(min-width:800px)]:text-[12px] font-semibold uppercase tracking-[0.10em] text-[#5EEAD4] mb-4 [@media(min-width:800px)]:mb-6"
                    style={{ fontFamily: FONT_INTER }}
                  >
                    Find a home
                  </h3>
                  <div className="flex justify-around [@media(min-width:800px)]:justify-center [@media(min-width:800px)]:gap-12">
                    {[
                      { label: "Buy", to: "/search?type=buy" },
                      { label: "Rent", to: "/search?type=rent" },
                    ].map(({ label, to }) => (
                      <Link
                        key={to}
                        to={to}
                        className="group inline-flex items-center text-[18px] [@media(min-width:800px)]:text-[24px] font-semibold text-[#F8FAFC] hover:text-[#CCFBF1] transition-colors duration-[160ms] py-2.5 px-3 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#5EEAD4] focus-visible:outline-offset-[6px]"
                        style={{ fontFamily: FONT_INTER }}
                      >
                        {label}
                        <span className="inline-block group-hover:translate-x-[3px] motion-reduce:group-hover:translate-x-0 transition-transform duration-[160ms]"> →</span>
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Mobile horizontal divider */}
                <div className="block [@media(min-width:800px)]:hidden border-t border-[rgba(255,255,255,0.14)] my-6" />

                {/* Offer a home */}
                <div className="text-center [@media(min-width:800px)]:pl-14 [@media(min-width:800px)]:border-l [@media(min-width:800px)]:border-[rgba(255,255,255,0.16)]">
                  <h3
                    className="text-[11px] [@media(min-width:800px)]:text-[12px] font-semibold uppercase tracking-[0.10em] text-[#5EEAD4] mb-4 [@media(min-width:800px)]:mb-6"
                    style={{ fontFamily: FONT_INTER }}
                  >
                    Offer a home
                  </h3>
                  <div className="flex justify-around [@media(min-width:800px)]:justify-center [@media(min-width:800px)]:gap-12">
                    {[
                      { label: "Sell", to: "/list?listing_type=sale" },
                      { label: "Rent it out", to: "/list" },
                    ].map(({ label, to }) => (
                      <Link
                        key={label}
                        to={to}
                        className="group inline-flex items-center text-[18px] [@media(min-width:800px)]:text-[24px] font-semibold text-[#F8FAFC] hover:text-[#CCFBF1] transition-colors duration-[160ms] py-2.5 px-3 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#5EEAD4] focus-visible:outline-offset-[6px]"
                        style={{ fontFamily: FONT_INTER }}
                      >
                        {label}
                        <span className="inline-block group-hover:translate-x-[3px] motion-reduce:group-hover:translate-x-0 transition-transform duration-[160ms]"> →</span>
                      </Link>
                    ))}
                  </div>
                </div>

              </div>{/* end journey groups */}

            </div>{/* end dark panel */}
          </div>
        </section>
      </main>
    </Layout>
  );
}
