import { Link } from "react-router-dom";
import { Linkedin, Twitter } from "lucide-react";
import posthog from "posthog-js";

const Footer = () => {
  return (
    <footer className="bg-[#0A1628] py-12 pb-36 md:pb-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Zone 1: Navigation */}
        <div className="grid md:grid-cols-5 gap-8 text-center md:text-left">

          {/* Column 1 — Brand */}
          <div>
            <span className="font-bold text-xl text-white tracking-wide">REEVE</span>
          </div>

          {/* Column 2 — Marketplace */}
          <div>
            <h3 className="text-white font-semibold text-sm mb-3">Marketplace</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-gray-400 text-sm hover:text-white transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/search" className="text-gray-400 text-sm hover:text-white transition-colors">
                  Browse Properties
                </Link>
              </li>
              <li>
                <Link to="/list" className="text-gray-400 text-sm hover:text-white transition-colors" onClick={() => posthog?.capture("list_property_cta_clicked", { source_page: "footer" })}>
                  List Your Property
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3 — Dashboards & Account */}
          <div>
            <h3 className="text-white font-semibold text-sm mb-3">Dashboards &amp; Account</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/tenant-dashboard" className="text-gray-400 text-sm hover:text-white transition-colors">
                  My Dashboard
                </Link>
              </li>
              <li>
                <Link to="/owner-dashboard" className="text-gray-400 text-sm hover:text-white transition-colors">
                  Manage My Properties
                </Link>
              </li>
              <li>
                <Link to="/me" className="text-gray-400 text-sm hover:text-white transition-colors">
                  My Profile
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4 — Services & Support */}
          <div>
            <h3 className="text-white font-semibold text-sm mb-3">Services &amp; Support</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/pms" className="text-gray-400 text-sm hover:text-white transition-colors">
                  Property Management
                </Link>
              </li>
              <li>
                <Link to="/move-in-audit" className="text-gray-400 text-sm hover:text-white transition-colors">
                  Property Inspection
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-gray-400 text-sm hover:text-white transition-colors">
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 5 — Legal */}
          <div>
            <h3 className="text-white font-semibold text-sm mb-3">Legal</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/privacy" className="text-gray-400 text-sm hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-gray-400 text-sm hover:text-white transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/refund" className="text-gray-400 text-sm hover:text-white transition-colors">
                  Refund Policy
                </Link>
              </li>
            </ul>
          </div>

        </div>

        {/* Zone 2: Business Identity */}
        <div className="border-t border-white/10 mt-8 pt-6">
          <p className="text-gray-400 text-xs">
            Reeve is a commercial brand owned and operated by Serial Makers Private Limited.
          </p>
          <p className="text-gray-400 text-xs leading-relaxed mt-2">
            Registered Office: Shubh Encl,
            HSR Layout, Bangalore South, Bangalore - 560102, Karnataka
          </p>
          <p className="text-gray-400 text-xs leading-relaxed mt-1">
            CIN: U62099KA2026PTC216343 &nbsp;·&nbsp;{" "}
            Email:{" "}
            <a href="mailto:support@reeve.in" className="hover:text-white transition-colors">
              support@reeve.in
            </a>
            {" "}&nbsp;·&nbsp;{" "}
            Phone:{" "}
            <a href="tel:+917899874281" className="hover:text-white transition-colors">
              +91 7899874281
            </a>
          </p>
        </div>

        {/* Zone 3: Bottom bar */}
        <div className="border-t border-white/10 mt-8 pt-6 flex flex-col md:flex-row justify-between items-center text-xs text-gray-400 gap-4">
          <div>© 2026 Reeve. All rights reserved.</div>
          <div className="flex gap-4">
            <a href="https://www.linkedin.com/company/reeve-pm/" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">
              <Linkedin className="h-5 w-5" />
              <span className="sr-only">LinkedIn</span>
            </a>
            <a href="https://x.com/reeve_pm" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">
              <Twitter className="h-5 w-5" />
              <span className="sr-only">Twitter</span>
            </a>
          </div>
        </div>

      </div>
    </footer>
  );
};

export default Footer;
