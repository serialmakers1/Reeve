import { Link } from "react-router-dom";

const Header = () => {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex flex-col items-center gap-1 px-4 py-4 sm:flex-row sm:justify-between sm:gap-0">
        <Link to="/" className="text-2xl font-bold tracking-tight text-primary">
          REEVE
        </Link>
        <p className="text-center text-xs text-muted-foreground sm:text-sm">
          Zero Brokerage. One Month Deposit. Hassle-Free Renting.
        </p>
      </div>
    </header>
  );
};

export default Header;
