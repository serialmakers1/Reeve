import { Link } from "react-router-dom";
import { Linkedin, Twitter } from "lucide-react";

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
