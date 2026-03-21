import { Link } from "react-router-dom";
import { Linkedin, Instagram, Twitter } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-[#0A1628] py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-3 gap-8 text-center md:text-left">

          {/* Left — Brand */}
          <div>
            <span className="font-bold text-xl text-white tracking-wide">REEVE</span>
            <p className="text-gray-400 text-sm mt-2">
              Zero brokerage. One month deposit.
              <br />
              Fully managed for free.
            </p>
          </div>

          {/* Centre — Links */}
          <div className="grid grid-cols-2 gap-8">
            <div>
              <h4 className="text-white font-semibold text-sm mb-3">For Tenants</h4>
              <ul className="space-y-2">
                <li>
                  <Link to="/search" className="text-gray-400 text-sm hover:text-white transition-colors">
                    Search Properties
                  </Link>
                </li>
                <li>
                  <Link to="/savings/tenant" className="text-gray-400 text-sm hover:text-white transition-colors">
                    Tenant Savings Calculator
                  </Link>
                </li>
                <li>
                  <Link to="/dashboard" className="text-gray-400 text-sm hover:text-white transition-colors">
                    My Dashboard
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold text-sm mb-3">For Owners</h4>
              <ul className="space-y-2">
                <li>
                  <Link to="/my-properties/new" className="text-gray-400 text-sm hover:text-white transition-colors">
                    List Your Property
                  </Link>
                </li>
                <li>
                  <Link to="/savings/owner" className="text-gray-400 text-sm hover:text-white transition-colors">
                    Owner Savings Calculator
                  </Link>
                </li>
                <li>
                  <Link to="/my-properties" className="text-gray-400 text-sm hover:text-white transition-colors">
                    My Properties
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Right — Social */}
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

        {/* Bottom bar */}
        <div className="border-t border-white/10 mt-8 pt-6 flex flex-col md:flex-row justify-between items-center text-xs text-gray-500 gap-4">
          <div className="flex gap-4">
            <Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
            <Link to="/refund" className="hover:text-white transition-colors">Refund Policy</Link>
          </div>
          <div>© {new Date().getFullYear()} Reeve</div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
