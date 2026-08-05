/**
 * F2-E2 sale-listing "Price & Terms" card. Mirrors NoSurprisesCard's accent
 * treatment. Rows are omitted when the source field is null (RERA/negotiable/
 * brokerage/pricePerSqft/possession). Asking price is the only always-shown
 * row for sale listings.
 */
import { parseISO, isValid, format } from "date-fns";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatEnumLabel } from "@/utils/property/formatEnumLabel";
import { isFieldSet } from "@/utils/property/isFieldSet";
import { formatSalePrice } from "@/utils/property/formatSalePrice";

type Dot = "green" | "amber" | "red" | "none";

interface Property {
  sale_price: number | null;
  expected_price_per_sqft: number | null;
  price_negotiable: boolean | null;
  sale_brokerage_pct: number | null;
  rera_registration_number: string | null;
  possession_status: string | null;
  possession_date: string | null;
}

interface Row {
  label: string;
  value: string;
  dot: Dot;
  /** Optional bigger amount style for the top "Asking price" row. */
  emphasise?: boolean;
  /** Optional second line rendered below value in smaller muted text. */
  valueLine2?: string;
}

const DOT_CLASS: Record<Dot, string> = {
  green: "bg-green-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
  none: "bg-transparent",
};

function formatPossessionDate(iso: string): string | null {
  const d = parseISO(iso);
  return isValid(d) ? format(d, "d MMM yyyy") : null;
}

function buildRows(p: Property): Row[] {
  const rows: Row[] = [];

  // Asking price — always shown for sale, no dot.
  if (isFieldSet("sale_price", p.sale_price)) {
    const formatted = formatSalePrice(p.sale_price);
    if (formatted) {
      rows.push({
        label: "Asking price",
        value: formatted,
        dot: "none",
        emphasise: true,
      });
    }
  }

  // Price per sqft — no dot.
  if (isFieldSet("expected_price_per_sqft", p.expected_price_per_sqft)) {
    rows.push({
      label: "Price per sq ft",
      value: `₹${p.expected_price_per_sqft!.toLocaleString("en-IN")}/sqft`,
      dot: "none",
    });
  }

  // Negotiation — show when non-null: true → "Open to offers" (green), false → "Firm price" (none).
  if (p.price_negotiable !== null && p.price_negotiable !== undefined) {
    rows.push({
      label: "Negotiation",
      value: p.price_negotiable ? "Open to offers" : "Firm price",
      dot: p.price_negotiable ? "green" : "none",
    });
  }

  // Brokerage — 0%=green "Zero"; ≤2%=amber; >2%=red; null=skip.
  if (isFieldSet("sale_brokerage_pct", p.sale_brokerage_pct)) {
    const pct = p.sale_brokerage_pct!;
    let dot: Dot = "green";
    if (pct > 2) dot = "red";
    else if (pct > 0) dot = "amber";
    rows.push({
      label: "Brokerage",
      value: pct === 0 ? "Zero" : `${pct}%`,
      dot,
    });
  }

  // RERA — only show when set. Null → skip.
  if (isFieldSet("rera_registration_number", p.rera_registration_number)) {
    rows.push({
      label: "RERA",
      value: p.rera_registration_number!,
      dot: "green",
    });
  }

  // Possession — ready_to_move green; else amber. Show date on second line when non-ready.
  if (isFieldSet("possession_status", p.possession_status)) {
    const status = p.possession_status!;
    const label = formatEnumLabel("possession_status", status);
    const row: Row = {
      label: "Possession",
      value: label,
      dot: status === "ready_to_move" ? "green" : "amber",
    };
    if (status !== "ready_to_move" && p.possession_date) {
      const formatted = formatPossessionDate(p.possession_date);
      if (formatted) row.valueLine2 = `Possession by ${formatted}`;
    }
    rows.push(row);
  }

  return rows;
}

export default function PriceAndTerms({ property }: { property: Property }) {
  const rows = buildRows(property);
  if (rows.length === 0) return null;

  return (
    <section className="mx-4 rounded-2xl border border-primary/20 bg-primary/5 px-5 py-4 lg:mx-0">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-primary" />
          <h2 className="text-base font-semibold text-foreground">Price &amp; Terms</h2>
        </div>
        <span className="text-xs text-muted-foreground">For sale</span>
      </div>
      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.label} className="min-w-0 flex flex-col gap-0.5 sm:flex-row sm:items-start sm:gap-3 text-sm">
            {/* Mobile: inline dot + label */}
            <span className="sm:hidden inline-flex items-center gap-1.5">
              <span className={cn("h-2 w-2 shrink-0 rounded-full", DOT_CLASS[r.dot])} />
              <span className="text-muted-foreground">{r.label}</span>
            </span>
            {/* Desktop: dot (sits beside label) */}
            <span className={cn(
              "hidden sm:inline-block mt-1 h-2.5 w-2.5 shrink-0 rounded-full",
              DOT_CLASS[r.dot]
            )} />
            {/* Desktop: label */}
            <span className="hidden sm:block min-w-0 flex-1 text-muted-foreground">{r.label}</span>
            {/* Value (both breakpoints) */}
            <span
              className={cn(
                "min-w-0 sm:max-w-[60%] text-foreground [overflow-wrap:anywhere]",
                r.emphasise ? "text-xl font-bold" : "font-medium",
                "sm:text-right"
              )}
            >
              {r.value}
              {r.valueLine2 && (
                <>
                  <br />
                  <span className="text-xs font-normal text-muted-foreground">{r.valueLine2}</span>
                </>
              )}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
