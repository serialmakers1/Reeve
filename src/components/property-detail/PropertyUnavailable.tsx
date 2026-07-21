/**
 * P4 blocked-page for /property/:id when the listing is archived, unlisted,
 * or not found. Copy is deliberately generic — we don't reveal owner state.
 */
import { useNavigate } from "react-router-dom";
import { Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PropertyUnavailable() {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <Home className="mb-4 h-12 w-12 text-muted-foreground/50" strokeWidth={1.5} />
      <h1 className="mb-2 text-xl font-semibold text-foreground">
        This listing is no longer available
      </h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        The owner may have taken it off the market.
      </p>
      <Button
        onClick={() => navigate("/search")}
        className="mt-6 h-11 rounded-full px-6 text-sm font-medium"
      >
        Browse properties →
      </Button>
    </div>
  );
}
