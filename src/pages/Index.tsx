import { Link } from "react-router-dom"
import Layout from "@/components/Layout"

const FONT_SERIF = "'Instrument Serif', Georgia, serif";
const FONT_SANS  = "'DM Sans', system-ui, sans-serif";
const FONT_MONO  = "'DM Mono', monospace";

export default function Index() {
  return (
  <Layout>
    <div className="min-h-screen bg-white">

      {/* Section 1 — Hero */}
      <section
        className="lg:min-h-[calc(100vh-4rem)] pt-16 lg:pt-20 relative"
        style={{ background: '#0F1C2E' }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
          <div className="flex flex-col lg:flex-row items-start lg:items-center py-12 lg:py-0 gap-8 lg:gap-12">

            {/* Left Column */}
            <div className="w-full lg:w-[55%] flex flex-col justify-center lg:justify-start py-8 lg:py-16">
              <span
                className="animate-fade-up inline-block text-xs font-medium text-blue-400 bg-blue-500/20 px-3 py-1 rounded-full w-fit"
                style={{ animationDelay: '0ms' }}
              >
                Now live in Bangalore
              </span>

              <p
                className="animate-fade-up mt-4 text-[17px] leading-relaxed text-slate-300 max-w-lg"
                style={{ fontFamily: FONT_SANS, animationDelay: '60ms' }}
              >
                Reeve is Bangalore&apos;s fully managed rental platform — for tenants who want a fair deal, and owners who want their time back.
              </p>

              <h1
                className="animate-fade-up text-4xl sm:text-5xl lg:text-7xl font-bold text-white leading-[1.1] mt-6"
                style={{ fontFamily: FONT_SERIF, animationDelay: '120ms' }}
              >
                Zero brokerage.
                <br />
                One month deposit.
                <br />
                <span className="text-[#60A5FA]">Free property management.</span>
              </h1>

              <p
                className="animate-fade-up text-lg text-slate-300 max-w-md mt-4 leading-relaxed"
                style={{ fontFamily: FONT_SANS, animationDelay: '200ms' }}
              >
                Reeve manages everything between owners and tenants — at no cost to owners. No
                brokers. No hidden fees. Just a great home and a stress-free tenancy.
              </p>

              {/* CTAs */}
              <div
                className="animate-fade-up flex flex-col sm:flex-row gap-4 mt-8"
                style={{ animationDelay: '280ms' }}
              >
                <Link
                  to="/search"
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-all duration-200 hover:-translate-y-0.5 shadow-sm text-center min-h-[48px] flex items-center justify-center"
                  style={{ fontFamily: FONT_SANS }}
                >
                  Search Properties →
                </Link>
                <Link
                  to="/my-properties/new"
                  className="border border-slate-600 text-slate-300 px-6 py-3 rounded-lg font-medium hover:border-slate-400 hover:text-white transition-all duration-200 text-center min-h-[48px] flex items-center justify-center"
                  style={{ fontFamily: FONT_SANS }}
                >
                  List Your Property
                </Link>
              </div>
            </div>

            {/* Right Column - Image */}
            <div
              className="animate-fade-up w-full lg:w-[45%] flex items-center justify-center"
              style={{ animationDelay: '200ms' }}
            >
              <img
                src="/images/hero-home.png"
                alt="Reeve — modern rental management platform"
                className="w-full h-auto object-contain rounded-2xl lg:max-h-[80vh]"
                loading="eager"
              />
            </div>

          </div>
        </div>
      </section>

      {/* Section 2 — Audience Split Cards */}
      <section className="bg-[#FAFAF8] py-10 sm:py-16 lg:py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <p
            className="text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-600 text-center mb-8"
            style={{ fontFamily: FONT_SANS }}
          >
            Who is Reeve for?
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

            {/* Tenant Card */}
            <div className="bg-white border border-[#E8E4DC] rounded-3xl p-8 flex flex-col hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200">
              <p
                className="text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-600"
                style={{ fontFamily: FONT_SANS }}
              >
                For Tenants
              </p>
              <h2
                className="mt-4 text-[28px] font-normal leading-tight text-[#0F1C2E]"
                style={{ fontFamily: FONT_SERIF }}
              >
                Save ₹1L+ on day one.
              </h2>
              <p
                className="mt-2 text-sm text-slate-500 leading-relaxed"
                style={{ fontFamily: FONT_SANS }}
              >
                We charge a 7% platform fee on rent — instead of a broker&apos;s 1–2 months. You save significantly on day one.
              </p>
              <ul className="mt-5 space-y-2 flex-1">
                {[
                  '1 month deposit only — not 3',
                  'Zero brokerage, always',
                  'Platform-managed home, no middlemen',
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-2 text-sm text-slate-600"
                    style={{ fontFamily: FONT_SANS }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                to="/savings/tenant"
                className="mt-6 block w-full bg-[#2563EB] text-white text-center py-3 rounded-2xl font-semibold text-sm hover:bg-blue-700 transition-colors duration-200 min-h-[48px] flex items-center justify-center"
                style={{ fontFamily: FONT_SANS }}
              >
                Calculate My Savings →
              </Link>
            </div>

            {/* Owner Card */}
            <div className="bg-[#0F1C2E] rounded-3xl p-8 flex flex-col hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200">
              <p
                className="text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-400"
                style={{ fontFamily: FONT_SANS }}
              >
                For Owners
              </p>
              <h2
                className="mt-4 text-[28px] font-normal leading-tight text-white"
                style={{ fontFamily: FONT_SERIF }}
              >
                ₹0 in fees. Always.
              </h2>
              <p
                className="mt-2 text-sm text-slate-400 leading-relaxed"
                style={{ fontFamily: FONT_SANS }}
              >
                We charge tenants a platform fee of 7%. Your rent arrives in full, every month.
              </p>
              <ul className="mt-5 space-y-2 flex-1">
                {[
                  'Free listing, zero commission',
                  'We handle all tenants — you just get paid',
                  'No visits, no calls, no broker',
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-2 text-sm text-slate-300"
                    style={{ fontFamily: FONT_SANS }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                to="/savings/owner"
                className="mt-6 block w-full bg-white text-[#2563EB] text-center py-3 rounded-2xl font-semibold text-sm hover:bg-blue-50 transition-colors duration-200 min-h-[48px] flex items-center justify-center"
                style={{ fontFamily: FONT_SANS }}
              >
                See Owner Savings →
              </Link>
            </div>

          </div>
        </div>
      </section>

      {/* Section 3 — Final CTA */}
      <section className="bg-[#2563EB] py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-5xl font-bold text-white text-balance">
            Ready to rent smarter?
          </h2>
          <p className="text-white/80 text-lg mt-3">
            Join Bangalore&apos;s only zero-brokerage, fully managed rental platform.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4 mt-8">
            <Link
              to="/search"
              className="bg-white text-[#2563EB] px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-all duration-200 min-h-[48px] flex items-center justify-center"
            >
              Search Properties →
            </Link>
            <Link
              to="/my-properties/new"
              className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white/10 transition-all duration-200 min-h-[48px] flex items-center justify-center"
            >
              List Your Property
            </Link>
          </div>

          <p className="text-white/60 text-sm mt-6">
            ₹0 Brokerage · 1 Month Deposit · Fully Managed for Free
          </p>
        </div>
      </section>

    </div>
  </Layout>
  )
}
