/**
 * F2-E2 sale-listing "Price & Terms" card. Mirrors NoSurprisesCard's accent
 * treatment. Rows are omitted when the source field is null (RERA/negotiable/
 * brokerage/pricePerSqft/possession). Asking price is the only always-shown
 * row for sale listings.
 */
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatEnumLabel } from "@/utils/property/formatEnumLabel";
import { isFieldSet } from "@/utils/property/isFieldSet";

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
}

const DOT_CLASS: Record<Dot, string> = {
  green: "bg-green-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
  none: "bg-transparent",
};

function buildRows(p: Property): Row[] {
  const rows: Row[] = [];

  // Asking price — always shown for sale, no dot.
  if (isFieldSet("sale_price", p.sale_price)) {
    rows.push({
      label: "Asking price",
      value: `₹${p.sale_price!.toLocaleString("en-IN")}`,
      dot: "none",
      emphasise: true,
    });
  }

  // Price per sqft — no dot.
  if (isFieldSet("expected_price_per_sqft", p.expected_price_per_sqft)) {
    rows.push({
      label: "Price per sq ft",
      value: `₹${p.expected_price_per_sqft!.toLocaleString("en-IN")}/sqft`,
      dot: "none",
    });
  }

  // Negotiable — show only when true.
  if (p.price_negotiable === true) {
    rows.push({
      label: "Negotiable",
      value: "Open to negotiation",
      dot: "green",
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

  // Possession — ready_to_move green; else amber. Include date when non-ready.
  if (isFieldSet("possession_status", p.possession_status)) {
    const status = p.possession_status!;
    const label = formatEnumLabel("possession_status", status);
    const value =
      status !== "ready_to_move" && p.possession_date
        ? `${label} · ${p.possession_date}`
        : label;
    rows.push({
      label: "Possession",
      value,
      dot: status === "ready_to_move" ? "green" : "amber",
    });
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
          <li key={r.label} className="flex items-center gap-3 text-sm">
            <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", DOT_CLASS[r.dot])} />
            <span className="min-w-0 flex-1 text-muted-foreground">{r.label}</span>
            <span
              className={cn(
                "text-right text-foreground",
                r.emphasise ? "text-xl font-bold" : "font-medium",
              )}
            >
              {r.value}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
