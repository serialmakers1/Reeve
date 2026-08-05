/**
 * P4b sticky CTA bar for /property/:id — 7 states.
 *
 * State machine (evaluation order):
 *   1. owner              → "Dashboard →"
 *   2. !isAuthenticated   → "Sign in to Request"
 *   3. status=approved    → "Sent via Email ✓"
 *   4. status=pending     → "Pending ⏳"
 *   5. attemptCount ≥ 3   → "Limit Reached" (disabled)
 *   6. attemptCount 1..2  → "Request Again"
 *   7. default            → "Request Contact"
 *
 * The bar reads its own `cr` row via useContactRequestStatus (see hook
 * header for why it's separate from RequestContactPanel). Loading renders a
 * skeleton button so the layout doesn't shift when auth resolves.
 */
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { useContactRequestStatus } from "@/hooks/useContactRequestStatus";
import { formatSalePrice } from "@/utils/property/formatSalePrice";

interface PropertyCTABarProps {
  // propertyId is read from useParams — the bar renders inside /property/:id
  // and passing it as a prop would require editing PropertyDetail (out of
  // scope for this file). See P4b notes.
  isOwner: boolean;
  isAuthenticated: boolean;
  listingType: string | null | undefined;
  listedRent: number | null | undefined;
  salePrice: number | null | undefined;
}

function formatINR(v: number): string {
  return v.toLocaleString("en-IN");
}

function priceLabel(
  listingType: string | null | undefined,
  listedRent: number | null | undefined,
  salePrice: number | null | undefined,
): { primary: string; suffix?: string } | null {
  if (listingType === "sale") {
    const formatted = formatSalePrice(salePrice);
    return formatted ? { primary: formatted } : null;
  }
  if (typeof listedRent === "number" && listedRent > 0) {
    return { primary: `₹${formatINR(listedRent)}`, suffix: "/mo" };
  }
  return null;
}

function scrollToPanel() {
  const el = document.getElementById("contact-panel");
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

// Shared shell so every branch renders identically-positioned bar → no layout shift.
function BarShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur-sm lg:hidden">
      <div
        className="flex items-center justify-between gap-3 px-4 py-3"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        {children}
      </div>
    </div>
  );
}

function PriceLeft({
  price,
}: {
  price: { primary: string; suffix?: string } | null;
}) {
  if (!price) return <span className="text-sm text-muted-foreground">Contact owner</span>;
  return (
    <div className="min-w-0 truncate">
      <span className="text-base font-semibold text-foreground">{price.primary}</span>
      {price.suffix ? (
        <span className="text-sm text-muted-foreground">{price.suffix}</span>
      ) : null}
    </div>
  );
}

export default function PropertyCTABar({
  isOwner,
  isAuthenticated,
  listingType,
  listedRent,
  salePrice,
}: PropertyCTABarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { id: propertyId } = useParams<{ id: string }>();
  const price = priceLabel(listingType, listedRent, salePrice);

  // Hook returns { status:null, attemptCount:0, isLoading:false } when disabled.
  const { status, attemptCount, isLoading } = useContactRequestStatus(
    propertyId,
    isAuthenticated && !isOwner,
  );

  // 1 — Owner
  if (isOwner) {
    return (
      <BarShell>
        <span className="text-sm text-muted-foreground">Your listing</span>
        <Button
          onClick={() => navigate("/owner-dashboard")}
          className="h-11 rounded-full px-5 text-sm font-medium"
        >
          Dashboard →
        </Button>
      </BarShell>
    );
  }

  // Loading — render skeleton button so layout is stable.
  if (isLoading) {
    return (
      <BarShell>
        <PriceLeft price={price} />
        <Skeleton className="h-11 w-32 shrink-0 rounded-full" />
      </BarShell>
    );
  }

  // 2 — Not authenticated
  if (!isAuthenticated) {
    return (
      <BarShell>
        <PriceLeft price={price} />
        <Button
          onClick={() =>
            navigate(`/login?returnTo=${encodeURIComponent(location.pathname)}`)
          }
          className="h-11 shrink-0 rounded-full px-5 text-sm font-medium"
        >
          Sign in to Request
        </Button>
      </BarShell>
    );
  }

  // 3-7 — status/attempt driven
  let label: string;
  let disabled = false;
  if (status === "approved") {
    label = "Sent via Email ✓";
  } else if (status === "pending") {
    label = "Pending ⏳";
  } else if (attemptCount >= 3) {
    label = "Limit Reached";
    disabled = true;
  } else if (attemptCount >= 1) {
    label = "Request Again";
  } else {
    label = "Request Contact";
  }

  return (
    <BarShell>
      <PriceLeft price={price} />
      <Button
        onClick={disabled ? undefined : scrollToPanel}
        disabled={disabled}
        variant={disabled ? "secondary" : "default"}
        className="h-11 shrink-0 rounded-full px-5 text-sm font-medium"
      >
        {label}
      </Button>
    </BarShell>
  );
}
