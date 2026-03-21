import { Link } from "react-router-dom";
import logo from '@/assets/Logo.svg';

const Footer = () => {
  return (
    <footer className="border-t bg-muted/50 py-8">
      <div className="container mx-auto flex flex-col items-center gap-4 px-4 text-sm text-muted-foreground">
        <Link to="/">
          <img src={logo} alt="REEVE" className="h-6 w-auto opacity-70" />
        </Link>
        <div className="flex gap-6">
          <Link to="/privacy" className="transition-colors hover:text-primary">
            Privacy Policy
          </Link>
          <Link to="/terms" className="transition-colors hover:text-primary">
            Terms of Service
          </Link>
          <Link to="/refund" className="transition-colors hover:text-primary">
            Refund Policy
          </Link>
        </div>
        <p>&copy; {new Date().getFullYear()} Serial Makers Private Limited. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;
