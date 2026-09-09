import { Link } from "react-router-dom";
import { Linkedin } from "lucide-react";

// Brand-accurate inline marks (Simple Icons paths); lucide lacks these. Monochrome
// marks inherit the link colour via currentColor; the Google "G" stays multicolor.
const iconClass = "h-5 w-5 shrink-0";

const XIcon = () => (
  <svg viewBox="0 0 24 24" className={iconClass} fill="currentColor" aria-hidden="true">
    <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
  </svg>
);

const RedditIcon = () => (
  <svg viewBox="0 0 24 24" className={iconClass} fill="currentColor" aria-hidden="true">
    <path d="M24 11.779c0-1.459-1.192-2.645-2.657-2.645-.715 0-1.363.286-1.84.746-1.81-1.191-4.259-1.949-6.971-2.046l1.483-4.669 4.016.941-.006.058c0 1.193.975 2.163 2.174 2.163 1.198 0 2.172-.97 2.172-2.163s-.975-2.164-2.172-2.164c-.92 0-1.704.574-2.021 1.379l-4.329-1.015c-.189-.046-.381.063-.44.249l-1.654 5.207c-2.744.076-5.229.834-7.059 2.034-.478-.442-1.114-.712-1.814-.712-1.465 0-2.657 1.186-2.657 2.645 0 .903.458 1.702 1.156 2.176-.03.198-.046.398-.046.6 0 3.034 3.792 5.502 8.456 5.502 4.665 0 8.457-2.468 8.457-5.502 0-.202-.016-.4-.045-.596.702-.473 1.163-1.274 1.163-2.18Zm-17.184 1.62c0-.757.618-1.375 1.375-1.375.756 0 1.374.618 1.374 1.375 0 .756-.618 1.374-1.374 1.374-.757 0-1.375-.618-1.375-1.374Zm9.181 4.243c-.94.938-2.734 1.01-3.263 1.01-.529 0-2.323-.072-3.262-1.01-.14-.14-.14-.365 0-.505.14-.14.366-.14.505 0 .593.592 1.86.802 2.757.802.897 0 2.165-.21 2.758-.802.139-.14.365-.14.504 0 .141.14.141.365.001.505Zm-.696-2.869c-.757 0-1.375-.618-1.375-1.374 0-.757.618-1.375 1.375-1.375.756 0 1.374.618 1.374 1.375 0 .756-.618 1.374-1.374 1.374Z" />
  </svg>
);

const TrustpilotIcon = () => (
  <svg viewBox="0 0 24 24" className={iconClass} fill="currentColor" aria-hidden="true">
    <path d="M24 9.306h-9.166L12.001.352 9.166 9.306H0l7.42 5.537-2.836 8.954 7.417-5.535 7.416 5.535-2.834-8.954L24 9.306z" />
  </svg>
);

const GoogleIcon = () => (
  <svg viewBox="0 0 48 48" className={iconClass} aria-hidden="true">
    <path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z" />
    <path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z" />
    <path fill="#FBBC05" d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24s.85 6.91 2.34 9.88l7.35-5.7z" />
    <path fill="#EA4335" d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z" />
  </svg>
);

const Footer = () => {
  return (
    <footer className="bg-[#0A1628] py-12 pb-36 md:pb-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Zone 1: Navigation */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-x-6 gap-y-8 items-start text-left">

          {/* Column 1 — Brand */}
          <div className="col-span-2 md:col-span-3 xl:col-span-1">
            <span className="font-bold text-xl text-white tracking-wide">REEVE</span>
          </div>

          {/* Column 2 — Marketplace */}
          <div>
            <h3 className="text-white font-semibold text-sm mb-3">Marketplace</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-gray-400 text-sm hover:text-white transition-colors duration-150">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/search" className="text-gray-400 text-sm hover:text-white transition-colors duration-150">
                  Browse Properties
                </Link>
              </li>
              <li>
                <Link
                  to="/list"
                  className="text-gray-400 text-sm hover:text-white transition-colors duration-150"
                >
                  List Your Property
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3 — In Bangalore */}
          <div>
            <h3 className="text-white font-semibold text-sm mb-3">In Bangalore</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/property-services-bangalore" className="text-gray-400 text-sm hover:text-white transition-colors duration-150">
                  All Bangalore property services
                </Link>
              </li>
              <li>
                <Link to="/property-management-bangalore" className="text-gray-400 text-sm hover:text-white transition-colors duration-150">
                  Reeve Managed
                </Link>
              </li>
              <li>
                <Link to="/vacant-property-care-bangalore" className="text-gray-400 text-sm hover:text-white transition-colors duration-150">
                  Reeve Watch
                </Link>
              </li>
              <li>
                <Link to="/find-tenant-bangalore" className="text-gray-400 text-sm hover:text-white transition-colors duration-150">
                  Reeve Let
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4 — Anywhere in India */}
          <div>
            <h3 className="text-white font-semibold text-sm mb-3">Anywhere in India</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/nri-property-services-india" className="text-gray-400 text-sm hover:text-white transition-colors duration-150">
                  All NRI property services
                </Link>
              </li>
              <li>
                <Link to="/nri-property-sale-india" className="text-gray-400 text-sm hover:text-white transition-colors duration-150">
                  NRI Property Sale
                </Link>
              </li>
              <li>
                <Link to="/nri-rent-tds-india" className="text-gray-400 text-sm hover:text-white transition-colors duration-150">
                  NRI Rent &amp; TDS
                </Link>
              </li>
              <li>
                <Link to="/khata-transfer-bangalore" className="text-gray-400 text-sm hover:text-white transition-colors duration-150">
                  Khata &amp; Mutation
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 5 — Account */}
          <div>
            <h3 className="text-white font-semibold text-sm mb-3">Account</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/tenant-dashboard" className="text-gray-400 text-sm hover:text-white transition-colors duration-150">
                  My Dashboard
                </Link>
              </li>
              <li>
                <Link to="/owner-dashboard" className="text-gray-400 text-sm hover:text-white transition-colors duration-150">
                  Manage My Properties
                </Link>
              </li>
              <li>
                <Link to="/me" className="text-gray-400 text-sm hover:text-white transition-colors duration-150">
                  My Profile
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 6 — Company & Legal */}
          <div>
            <h3 className="text-white font-semibold text-sm mb-3">Company &amp; Legal</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/contact" className="text-gray-400 text-sm hover:text-white transition-colors duration-150">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="text-gray-400 text-sm hover:text-white transition-colors duration-150">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-gray-400 text-sm hover:text-white transition-colors duration-150">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/refund" className="text-gray-400 text-sm hover:text-white transition-colors duration-150">
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
          <div className="flex flex-wrap items-center justify-center md:justify-end gap-x-4 gap-y-2">
            <a href="https://www.linkedin.com/company/reeve-pm/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 text-gray-400 hover:text-white transition-colors duration-150">
              <Linkedin className="h-5 w-5 shrink-0" aria-hidden="true" />
              LinkedIn
            </a>
            <a href="https://x.com/reeve_pm" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 text-gray-400 hover:text-white transition-colors duration-150">
              <XIcon />
              X
            </a>
            <a href="https://www.reddit.com/r/ReeveIn" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 text-gray-400 hover:text-white transition-colors duration-150">
              <RedditIcon />
              Reddit Community
            </a>
            <a href="https://www.trustpilot.com/review/reeve.in" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 text-gray-400 hover:text-white transition-colors duration-150">
              <TrustpilotIcon />
              Trustpilot Reviews
            </a>
            <a href="https://share.google/a2Hm9cYDZuqqAWm00" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 text-gray-400 hover:text-white transition-colors duration-150">
              <GoogleIcon />
              Reeve on Google
            </a>
          </div>
        </div>

      </div>
    </footer>
  );
};

export default Footer;
