import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import logo from "@/assets/Logo.svg"
import {
  Menu,
  X,
  LogOut,
  Monitor,
  PhoneOff,
  ShieldCheck,
  Banknote,
  Linkedin,
  Instagram,
  Twitter,
} from "lucide-react"

export default function Index() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<"tenants" | "owners">("tenants")

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <div className="min-h-screen bg-white">
      {/* Section 1 — Navbar */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? "bg-white/90 backdrop-blur-sm shadow-sm border-b border-gray-100"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center">
              <img src={logo} alt="Reeve" className="h-7 w-auto" />
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              <Link
                to="/savings/tenant"
                className="text-sm text-gray-600 hover:text-[#0A1628] transition-colors"
              >
                For Tenants
              </Link>
              <Link
                to="/savings/owner"
                className="text-sm text-gray-600 hover:text-[#0A1628] transition-colors"
              >
                For Owners
              </Link>
              <Link
                to="/search"
                className="text-sm text-gray-600 hover:text-[#0A1628] transition-colors"
              >
                Search Properties
              </Link>
            </div>

            {/* Desktop CTAs */}
            <div className="hidden md:flex items-center gap-3">
              <Link
                to="/login"
                className="text-sm text-gray-600 hover:text-[#0A1628] transition-colors px-4 py-2"
              >
                Login
              </Link>
              <Link
                to="/my-properties/new"
                className="bg-[#2563EB] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition-all duration-200 hover:-translate-y-0.5"
              >
                List Your Property
              </Link>
            </div>

            {/* Mobile CTAs + Hamburger */}
            <div className="flex md:hidden items-center gap-3">
              <Link
                to="/my-properties/new"
                className="bg-[#2563EB] text-white text-sm font-medium px-4 py-2 rounded-lg"
              >
                List Your Property
              </Link>
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 text-[#0A1628]"
                aria-label="Toggle menu"
              >
                {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 shadow-lg">
            <div className="px-4 py-4 space-y-4">
              <Link
                to="/savings/tenant"
                className="block text-sm text-gray-600 hover:text-[#0A1628] transition-colors py-2"
              >
                For Tenants
              </Link>
              <Link
                to="/savings/owner"
                className="block text-sm text-gray-600 hover:text-[#0A1628] transition-colors py-2"
              >
                For Owners
              </Link>
              <Link
                to="/search"
                className="block text-sm text-gray-600 hover:text-[#0A1628] transition-colors py-2"
              >
                Search Properties
              </Link>
              <div className="pt-4 border-t border-gray-100 space-y-3">
                <Link
                  to="/login"
                  className="block w-full text-center text-sm text-gray-600 border border-gray-300 rounded-lg py-3"
                >
                  Login
                </Link>
                <Link
                  to="/my-properties/new"
                  className="block w-full text-center bg-[#2563EB] text-white text-sm font-medium rounded-lg py-3"
                >
                  List Your Property
                </Link>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Section 2 — Hero */}
      <section
        className="min-h-screen lg:h-screen pt-20 lg:pt-24 relative"
        style={{
          backgroundImage: "radial-gradient(circle, #e5e7eb 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
          <div className="flex flex-col lg:flex-row items-center h-full py-12 lg:py-0 gap-8 lg:gap-12">
            {/* Left Column */}
            <div className="w-full lg:w-[55%] flex flex-col justify-center">
              <span className="inline-block text-xs font-medium text-[#2563EB] bg-blue-50 px-3 py-1 rounded-full w-fit">
                Now live in Bangalore
              </span>

              <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold text-[#0A1628] leading-[1.1] mt-6">
                Zero brokerage.
                <br />
                One month deposit.
                <br />
                <span className="text-[#2563EB]">Free property management.</span>
              </h1>

              <p className="text-lg text-gray-500 max-w-md mt-4 leading-relaxed">
                Reeve manages everything between owners and tenants — at no cost to owners. No
                brokers. No hidden fees. Just a great home and a stress-free tenancy.
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-4 mt-8">
                <Link
                  to="/search"
                  className="bg-[#2563EB] text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-all duration-200 hover:-translate-y-0.5 shadow-sm text-center min-h-[48px] flex items-center justify-center"
                >
                  Search Properties →
                </Link>
                <Link
                  to="/my-properties/new"
                  className="border border-gray-300 text-[#0A1628] px-6 py-3 rounded-lg font-medium hover:border-[#2563EB] hover:text-[#2563EB] transition-all duration-200 text-center min-h-[48px] flex items-center justify-center"
                >
                  List Your Property
                </Link>
              </div>

              {/* Trust Strip */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-6 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <span className="text-[#2563EB]">✓</span> ₹0 Brokerage
                </span>
                <span className="hidden sm:inline">·</span>
                <span className="flex items-center gap-1">
                  <span className="text-[#2563EB]">✓</span> 1 Month Deposit
                </span>
                <span className="hidden sm:inline">·</span>
                <span className="flex items-center gap-1">
                  <span className="text-[#2563EB]">✓</span> Fully Managed for Free
                </span>
              </div>
            </div>

            {/* Right Column - Image */}
            <div className="w-full lg:w-[45%] h-[300px] sm:h-[400px] lg:h-[calc(100vh-8rem)] relative">
              <img
                src="https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800"
                alt="Modern living room interior"
                className="absolute inset-0 w-full h-full object-cover rounded-2xl lg:rounded-2xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Section 3 — Social Proof Bar */}
      <section className="bg-[#E8EAED] border-y border-gray-200 py-6 mt-4">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-0 md:divide-x divide-gray-200">
            {[
              { stat: "₹0", label: "Brokerage — Always" },
              { stat: "1 Month", label: "Security Deposit" },
              { stat: "₹0", label: "Owner Management Fee" },
              { stat: "100%", label: "Verified Properties" },
            ].map((item, index) => (
              <div key={index} className="text-center px-4">
                <div className="text-2xl font-bold text-[#0A1628]">{item.stat}</div>
                <div className="text-sm text-gray-500 mt-1">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 4 — The Problem */}
      <section className="bg-[#0A1628] py-16 lg:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <span className="text-xs font-semibold tracking-widest text-blue-400 uppercase">
              Why We Built Reeve
            </span>
            <h2 className="text-3xl lg:text-5xl font-bold text-white mt-3 text-balance">
              Everyone leaves after
              <br />
              the deal is done.
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto text-center mt-4 leading-relaxed">
              Brokers vanish after collecting their fee. Listing platforms disappear after the
              agreement is signed. Once you move in, you&apos;re on your own — chasing repairs,
              resolving disputes, and managing rent with zero support from anyone.
            </p>
          </div>

          {/* Problem Cards */}
          <div className="grid md:grid-cols-3 gap-6 mt-12">
            {[
              {
                icon: LogOut,
                title: "Brokers disappear after the fee",
                body: "You pay 1–2 months rent upfront. The moment the agreement is signed, they're gone. No support. No accountability. No refund.",
              },
              {
                icon: Monitor,
                title: "Listing platforms end at move-in",
                body: "Property portals connect you once. After that, you're managing everything yourself — maintenance, disputes, renewals — completely alone.",
              },
              {
                icon: PhoneOff,
                title: "Nobody manages what happens next",
                body: "Rent defaults, damage disputes, maintenance delays, lease renewals — once the deal closes, both owners and tenants are left to figure it out without any help.",
              },
            ].map((card, index) => (
              <div
                key={index}
                className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all duration-200"
              >
                <card.icon className="text-blue-400 h-8 w-8" />
                <h3 className="text-lg font-semibold text-white mt-3">{card.title}</h3>
                <p className="text-sm text-gray-400 mt-2 leading-relaxed">{card.body}</p>
              </div>
            ))}
          </div>

          {/* Closing Statement */}
          <div className="text-center mt-12">
            <p className="text-blue-400 font-semibold text-xl max-w-lg mx-auto">
              Reeve stays. We manage the entire tenancy — for both sides — from listing to move-out.
            </p>
            <div className="w-24 h-0.5 bg-blue-400/50 mx-auto mt-4" />
          </div>
        </div>
      </section>

      {/* Section 5 — How It Works */}
      <section className="bg-white py-16 lg:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl lg:text-5xl font-bold text-[#0A1628] text-balance">
              One platform.
              <br />
              Two happy parties.
            </h2>
            <p className="text-gray-500 text-center mt-3 text-lg max-w-xl mx-auto">
              Every property on Reeve is physically verified and exclusively managed by us — from
              listing to move-out.
            </p>

            {/* Tab Switcher */}
            <div className="flex justify-center gap-4 mt-8">
              <button
                onClick={() => setActiveTab("tenants")}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  activeTab === "tenants"
                    ? "bg-[#2563EB] text-white"
                    : "border border-gray-300 text-gray-600 hover:border-[#2563EB] hover:text-[#2563EB]"
                }`}
              >
                For Tenants
              </button>
              <button
                onClick={() => setActiveTab("owners")}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  activeTab === "owners"
                    ? "bg-[#2563EB] text-white"
                    : "border border-gray-300 text-gray-600 hover:border-[#2563EB] hover:text-[#2563EB]"
                }`}
              >
                For Owners
              </button>
            </div>
          </div>

          {/* Steps - Tenants */}
          <div
            className={`transition-opacity duration-300 ${activeTab === "tenants" ? "opacity-100" : "opacity-0 hidden"}`}
          >
            <div className="mt-12">
              {/* Desktop View */}
              <div className="hidden lg:block">
                <div className="relative">
                  {/* Dotted line */}
                  <div className="absolute top-4 left-[12.5%] right-[12.5%] h-0.5 border-t-2 border-dashed border-gray-200" />
                  <div className="grid grid-cols-4 gap-8">
                    {[
                      {
                        step: 1,
                        title: "Browse & Shortlist",
                        desc: "Search verified properties — every listing is physically inspected and exclusively managed by Reeve. Favourite the ones you like.",
                      },
                      {
                        step: 2,
                        title: "Visit the Property",
                        desc: "Schedule a visit at your convenience. Our team will be there. See the home before you decide anything.",
                      },
                      {
                        step: 3,
                        title: "Apply Online",
                        desc: "Submit your application with income proof and ID documents. One simple form. Our team reviews and coordinates with the owner.",
                      },
                      {
                        step: 4,
                        title: "Move In, Stay Supported",
                        desc: "Once approved, pay first month's rent and one month security deposit. Keys handed over. Reeve handles all maintenance, rent collection, and disputes throughout your stay.",
                      },
                    ].map((item) => (
                      <div key={item.step} className="text-center relative">
                        <div className="bg-[#2563EB] text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mx-auto relative z-10">
                          {item.step}
                        </div>
                        <h3 className="font-semibold text-[#0A1628] mt-4">{item.title}</h3>
                        <p className="text-sm text-gray-500 mt-2 leading-relaxed text-left">{item.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Mobile View */}
              <div className="lg:hidden space-y-6">
                {[
                  {
                    step: 1,
                    title: "Browse & Shortlist",
                    desc: "Search verified properties — every listing is physically inspected and exclusively managed by Reeve. Favourite the ones you like.",
                  },
                  {
                    step: 2,
                    title: "Visit the Property",
                    desc: "Schedule a visit at your convenience. Our team will be there. See the home before you decide anything.",
                  },
                  {
                    step: 3,
                    title: "Apply Online",
                    desc: "Submit your application with income proof and ID documents. One simple form. Our team reviews and coordinates with the owner.",
                  },
                  {
                    step: 4,
                    title: "Move In, Stay Supported",
                    desc: "Once approved, pay first month's rent and one month security deposit. Keys handed over. Reeve handles all maintenance, rent collection, and disputes throughout your stay.",
                  },
                ].map((item) => (
                  <div key={item.step} className="flex gap-4">
                    <div className="bg-[#2563EB] text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold shrink-0">
                      {item.step}
                    </div>
                    <div>
                      <h3 className="font-semibold text-[#0A1628]">{item.title}</h3>
                      <p className="text-sm text-gray-500 mt-1 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-xs text-gray-400 text-center mt-8">
                * A platform service fee applies to tenants. See pricing for details.
              </p>

              <div className="text-center mt-8">
                <Link
                  to="/search"
                  className="inline-block bg-[#2563EB] text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-700 transition-all duration-200 hover:-translate-y-0.5 shadow-sm"
                >
                  Search Properties →
                </Link>
              </div>
            </div>
          </div>

          {/* Steps - Owners */}
          <div
            className={`transition-opacity duration-300 ${activeTab === "owners" ? "opacity-100" : "opacity-0 hidden"}`}
          >
            <div className="mt-12">
              {/* Desktop View */}
              <div className="hidden lg:block">
                <div className="relative">
                  {/* Dotted line */}
                  <div className="absolute top-4 left-[12.5%] right-[12.5%] h-0.5 border-t-2 border-dashed border-gray-200" />
                  <div className="grid grid-cols-4 gap-8">
                    {[
                      {
                        step: 1,
                        title: "Submit Your Property",
                        desc: "Fill a quick form or give us a call. No photos, documents, or preparation needed at this stage.",
                      },
                      {
                        step: 2,
                        title: "We Inspect & List",
                        desc: "Our team visits, photographs, documents, and lists your property. We handle everything — tenant screening, applications, and owner communication.",
                      },
                      {
                        step: 3,
                        title: "Tenant Moves In",
                        desc: "You review and approve the tenant. We manage the agreement, key handover, and move-in condition report.",
                      },
                      {
                        step: 4,
                        title: "We Manage Everything",
                        desc: "Rent collected and transferred to you monthly. Maintenance coordinated. Disputes handled. Lease renewals managed. Zero effort from you — and zero cost to you, ever.",
                      },
                    ].map((item) => (
                      <div key={item.step} className="text-center relative">
                        <div className="bg-[#2563EB] text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mx-auto relative z-10">
                          {item.step}
                        </div>
                        <h3 className="font-semibold text-[#0A1628] mt-4">{item.title}</h3>
                        <p className="text-sm text-gray-500 mt-2 leading-relaxed text-left">{item.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Mobile View */}
              <div className="lg:hidden space-y-6">
                {[
                  {
                    step: 1,
                    title: "Submit Your Property",
                    desc: "Fill a quick form or give us a call. No photos, documents, or preparation needed at this stage.",
                  },
                  {
                    step: 2,
                    title: "We Inspect & List",
                    desc: "Our team visits, photographs, documents, and lists your property. We handle everything — tenant screening, applications, and owner communication.",
                  },
                  {
                    step: 3,
                    title: "Tenant Moves In",
                    desc: "You review and approve the tenant. We manage the agreement, key handover, and move-in condition report.",
                  },
                  {
                    step: 4,
                    title: "We Manage Everything",
                    desc: "Rent collected and transferred to you monthly. Maintenance coordinated. Disputes handled. Lease renewals managed. Zero effort from you — and zero cost to you, ever.",
                  },
                ].map((item) => (
                  <div key={item.step} className="flex gap-4">
                    <div className="bg-[#2563EB] text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold shrink-0">
                      {item.step}
                    </div>
                    <div>
                      <h3 className="font-semibold text-[#0A1628]">{item.title}</h3>
                      <p className="text-sm text-gray-500 mt-1 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="text-center mt-8">
                <span className="bg-green-50 text-green-700 text-xs font-medium px-3 py-1 rounded-full inline-block">
                  Free for owners — always
                </span>
              </div>

              <div className="text-center mt-6">
                <Link
                  to="/my-properties/new"
                  className="inline-block bg-[#2563EB] text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-700 transition-all duration-200 hover:-translate-y-0.5 shadow-sm"
                >
                  List Your Property →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 6 — The Savings */}
      <section className="bg-[#E8EAED] py-16 lg:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl lg:text-5xl font-bold text-[#0A1628] text-balance">
              Real money. Real savings.
            </h2>
            <p className="text-gray-500 text-center mt-3">
              See exactly how much you save by switching to Reeve.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mt-12">
            {/* Tenant Savings Card */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
              <span className="text-xs font-semibold tracking-widest text-[#2563EB]">
                FOR TENANTS
              </span>

              <div className="mt-6 space-y-4">
                <div>
                  <div className="text-4xl font-bold text-[#0A1628]">₹1.5L+</div>
                  <div className="text-gray-500 text-sm mt-1">saved on security deposit</div>
                </div>
                <div>
                  <div className="text-4xl font-bold text-[#0A1628]">₹50K+</div>
                  <div className="text-gray-500 text-sm mt-1">saved on broker fees</div>
                </div>
              </div>

              <p className="text-xs text-gray-400 mt-4">
                On a ₹50,000/month apartment vs traditional renting in Bangalore
              </p>

              <div className="border-t border-gray-100 mt-6 pt-4">
                <p className="text-sm text-gray-600">
                  Enter your rent and see your exact savings →
                </p>
              </div>

              <Link
                to="/savings/tenant"
                className="mt-4 block w-full bg-[#2563EB] text-white text-center py-3 rounded-lg font-medium hover:bg-blue-700 transition-all duration-200"
              >
                Calculate My Savings →
              </Link>
            </div>

            {/* Owner Savings Card */}
            <div className="bg-[#0A1628] rounded-2xl p-8">
              <span className="text-xs font-semibold tracking-widest text-blue-400">
                FOR OWNERS
              </span>

              <div className="mt-6 space-y-4">
                <div>
                  <div className="text-4xl font-bold text-white">₹1L+</div>
                  <div className="text-blue-200 text-sm mt-1">
                    saved in broker fees over 3 years
                  </div>
                </div>
                <div>
                  <div className="text-4xl font-bold text-white">40hrs</div>
                  <div className="text-blue-200 text-sm mt-1">saved per year on management</div>
                </div>
              </div>

              <p className="text-xs text-blue-300 mt-4">
                Estimated over 3 years with 2 tenant cycles
              </p>

              <div className="border-t border-white/10 mt-6 pt-4">
                <p className="text-sm text-blue-200">See your full savings breakdown →</p>
              </div>

              <Link
                to="/savings/owner"
                className="mt-4 block w-full bg-white text-[#2563EB] text-center py-3 rounded-lg font-medium hover:bg-blue-50 transition-all duration-200"
              >
                Calculate Owner Savings →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Section 7 — Why Trust Reeve */}
      <section className="bg-white py-16 lg:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl lg:text-5xl font-bold text-[#0A1628] text-balance">
              Built for trust.
              <br />
              Managed end to end.
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mt-12 max-w-4xl mx-auto">
            {/* Pillar 1 */}
            <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm text-center md:text-left">
              <ShieldCheck className="text-[#2563EB] h-8 w-8 mx-auto md:mx-0" />
              <h3 className="text-xl font-semibold text-[#0A1628] mt-4">
                Every property personally verified
              </h3>
              <p className="text-gray-500 text-sm mt-2 leading-relaxed">
                Our team physically inspects every property before it goes live on Reeve. No fake
                listings. No misleading photos. What you see is what you get.
              </p>
            </div>

            {/* Pillar 2 */}
            <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm text-center md:text-left">
              <Banknote className="text-[#2563EB] h-8 w-8 mx-auto md:mx-0" />
              <h3 className="text-xl font-semibold text-[#0A1628] mt-4">
                Your deposit is protected
              </h3>
              <p className="text-gray-500 text-sm mt-2 leading-relaxed">
                Security deposit held securely by Reeve — not by the owner. Refunded within 7 days
                of move-out, no chasing required.
              </p>
            </div>
          </div>

          {/* Highlight Box */}
          <div className="bg-blue-50 rounded-2xl p-6 mt-12 text-center max-w-4xl mx-auto">
            <span className="text-sm font-semibold text-[#2563EB] tracking-widest uppercase">
              Our Commitment
            </span>
            <h3 className="text-xl font-bold text-[#0A1628] mt-2">
              We don&apos;t disappear after move-in.
            </h3>
            <p className="text-gray-500 text-sm mt-2 max-w-2xl mx-auto">
              Reeve actively manages your tenancy for its entire duration — maintenance requests,
              rent defaults, disputes, renewals. You always have someone on your side.
            </p>
          </div>
        </div>
      </section>

      {/* Section 8 — Service Fee Transparency */}
      <section className="bg-[#E8EAED] py-16">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="text-xs font-semibold tracking-widest text-gray-400 uppercase">
            Pricing
          </span>
          <h2 className="text-2xl font-bold text-[#0A1628] mt-2">
            Simple. Transparent. No surprises.
          </h2>

          <div className="grid md:grid-cols-2 gap-6 mt-8">
            {/* Owner Card */}
            <div className="bg-white rounded-xl p-6 border border-gray-100 text-center">
              <div className="text-3xl font-bold text-[#0A1628]">₹0</div>
              <div className="text-sm text-gray-500 mt-1">Owner management fee</div>
              <p className="text-xs text-gray-400 mt-3">
                Listing, tenant screening, agreements, maintenance coordination, rent collection —
                all at no cost to the owner. Always.
              </p>
            </div>

            {/* Tenant Card */}
            <div className="bg-white rounded-xl p-6 border border-gray-100 text-center">
              <div className="text-3xl font-bold text-[#0A1628]">7%*</div>
              <div className="text-sm text-gray-500 mt-1">Platform service fee on monthly rent</div>
              <p className="text-xs text-gray-400 mt-3">
                Charged to tenants on the monthly rent amount. Reduces to 4%* on renewal. GST
                applicable.
              </p>
            </div>
          </div>

          <p className="text-xs text-gray-400 text-center mt-6 max-w-lg mx-auto">
            * Service fee percentages are indicative and may be revised. The applicable rate will be
            clearly confirmed before any payment is made.
          </p>
        </div>
      </section>

      {/* Section 9 — Final CTA */}
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

      {/* Section 10 — Footer */}
      <footer className="bg-[#0A1628] py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8 text-center md:text-left">
            {/* Left Column */}
            <div>
              <div>
                <span className="font-bold text-xl text-white tracking-wide">REEVE</span>
              </div>
              <p className="text-gray-400 text-sm mt-2">
                Zero brokerage. One month deposit.
                <br />
                Fully managed for free.
              </p>
            </div>

            {/* Center - Links */}
            <div className="grid grid-cols-2 gap-8">
              <div>
                <h4 className="text-white font-semibold text-sm mb-3">For Tenants</h4>
                <ul className="space-y-2">
                  <li>
                    <Link
                      to="/search"
                      className="text-gray-400 text-sm hover:text-white transition-colors"
                    >
                      Search Properties
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/savings/tenant"
                      className="text-gray-400 text-sm hover:text-white transition-colors"
                    >
                      Tenant Savings Calculator
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="#how-it-works"
                      className="text-gray-400 text-sm hover:text-white transition-colors"
                    >
                      How It Works
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="text-white font-semibold text-sm mb-3">For Owners</h4>
                <ul className="space-y-2">
                  <li>
                    <Link
                      to="/my-properties/new"
                      className="text-gray-400 text-sm hover:text-white transition-colors"
                    >
                      List Your Property
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/savings/owner"
                      className="text-gray-400 text-sm hover:text-white transition-colors"
                    >
                      Owner Savings Calculator
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="#how-it-works"
                      className="text-gray-400 text-sm hover:text-white transition-colors"
                    >
                      How It Works
                    </Link>
                  </li>
                </ul>
              </div>
            </div>

            {/* Right - Social */}
            <div className="flex flex-col items-center md:items-end">
              <p className="text-gray-400 text-sm mb-3">Follow us</p>
              <div className="flex gap-4">
                <Link to="#" className="text-gray-500 hover:text-white transition-colors">
                  <Linkedin className="h-5 w-5" />
                  <span className="sr-only">LinkedIn</span>
                </Link>
                <Link to="#" className="text-gray-500 hover:text-white transition-colors">
                  <Instagram className="h-5 w-5" />
                  <span className="sr-only">Instagram</span>
                </Link>
                <Link to="#" className="text-gray-500 hover:text-white transition-colors">
                  <Twitter className="h-5 w-5" />
                  <span className="sr-only">Twitter</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-white/10 mt-8 pt-6 flex flex-col md:flex-row justify-between items-center text-xs text-gray-500 gap-4">
            <div className="flex gap-4">
              <Link to="/privacy" className="hover:text-white transition-colors">
                Privacy Policy
              </Link>
              <Link to="/terms" className="hover:text-white transition-colors">
                Terms of Service
              </Link>
              <Link to="/refund" className="hover:text-white transition-colors">
                Refund Policy
              </Link>
            </div>
            <div>© 2026 Reeve</div>
          </div>
        </div>
      </footer>
    </div>
  )
}
