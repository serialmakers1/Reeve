/**
 * P5 "No Surprises" card. Renders coloured-dot rows for the terms the owner
 * set upfront. Null rows are omitted; zero is a valid explicit input and
 * renders with a green dot.
 */
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { computeDepositMonths } from "@/utils/property/financialConversions";
import { isFieldSet } from "@/utils/property/isFieldSet";
import { formatEnumLabel } from "@/utils/property/formatEnumLabel";

type Dot = "green" | "amber" | "red";

interface Property {
  listing_type: string | null;
  listed_rent: number | null;
  security_deposit_amount: number | null;
  security_deposit_months: number | null;
  // F2-C3: brokerage collapsed to a flat amount; type + months no longer surfaced.
  rent_brokerage_fixed_amount: number | null;
  // F2-C1: move-in charges relocated from MonthlyCosts.
  move_in_charges_amount: number | null;
  lock_in_months: number | null;
  notice_period_days: number | null;
  annual_rent_increase_pct: number | null;
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
}

function fmtINR(v: number): string {
  return `₹${v.toLocaleString("en-IN")}`;
}

function buildRentRows(p: Property): Row[] {
  const rows: Row[] = [];

  // Security Deposit — prefer amount; fall back to months × rent when amount
  // is null but months + rent are known (F1-B3a).
  const explicitAmt = p.security_deposit_amount;
  const rent = p.listed_rent;
  let depositAmt: number | null = null;
  let approx = false;
  if (explicitAmt === 0) {
    rows.push({ label: "Security Deposit", value: "No deposit", dot: "green" });
  } else {
    if (isFieldSet("security_deposit_amount", explicitAmt)) {
      depositAmt = explicitAmt;
    } else if (
      typeof p.security_deposit_months === "number" &&
      p.security_deposit_months > 0 &&
      typeof rent === "number" &&
      rent > 0
    ) {
      depositAmt = p.security_deposit_months * rent;
      approx = true;
    }
    if (depositAmt !== null) {
      const months = computeDepositMonths(depositAmt, rent);
      let dot: Dot = "green";
      if (months !== null) {
        if (months > 5) dot = "red";
        else if (months > 3) dot = "amber";
      }
      rows.push({
        label: "Security Deposit",
        value: `${approx ? "~" : ""}${fmtINR(depositAmt)}`,
        dot,
      });
    }
  }

  // F2-C2: Move-in Charges (one-time). null / 0 → skip.
  const movein = p.move_in_charges_amount;
  if (movein !== null && movein !== undefined && movein > 0) {
    let mDot: Dot = "green";
    if (movein > 4000) mDot = "red";
    else if (movein >= 2000) mDot = "amber";
    rows.push({
      label: "Move-in Charges (one-time)",
      value: `₹${movein.toLocaleString("en-IN")}`,
      dot: mDot,
    });
  }

  // F2-C3: Brokerage — flat amount only. null → skip, 0 → "Zero brokerage" green,
  // >0 → colour by amount ÷ listed_rent equivalent months.
  const brokerageAmt = p.rent_brokerage_fixed_amount;
  if (brokerageAmt === 0) {
    rows.push({ label: "Brokerage", value: "Zero brokerage", dot: "green" });
  } else if (brokerageAmt !== null && brokerageAmt !== undefined && brokerageAmt > 0) {
    let bDot: Dot = "green";
    if (typeof p.listed_rent === "number" && p.listed_rent > 0) {
      const equivMonths = brokerageAmt / p.listed_rent;
      if (equivMonths > 1) bDot = "red";
      else if (equivMonths > 0) bDot = "amber";
    }
    rows.push({
      label: "Brokerage",
      value: `₹${brokerageAmt.toLocaleString("en-IN")}`,
      dot: bDot,
    });
  }

  // Lock-in
  const lock = p.lock_in_months;
  if (lock === 0) {
    rows.push({ label: "Lock-in", value: "No lock-in", dot: "green" });
  } else if (isFieldSet("lock_in_months", lock)) {
    let dot: Dot = "green";
    if (lock! > 8) dot = "red";
    else if (lock! > 4) dot = "amber";
    rows.push({ label: "Lock-in", value: `${lock} months`, dot });
  }

  // Notice period
  const notice = p.notice_period_days;
  if (notice === 0) {
    rows.push({ label: "Notice Period", value: "No notice required", dot: "green" });
  } else if (isFieldSet("notice_period_days", notice)) {
    let dot: Dot = "green";
    if (notice! > 60) dot = "red";
    else if (notice! > 30) dot = "amber";
    rows.push({ label: "Notice Period", value: `${notice} days`, dot });
  }

  // Annual rent increase
  const hike = p.annual_rent_increase_pct;
  if (hike === 0) {
    rows.push({ label: "Annual Rent Increase", value: "No annual increase", dot: "green" });
  } else if (isFieldSet("annual_rent_increase_pct", hike)) {
    let dot: Dot = "green";
    if (hike! > 10) dot = "red";
    else if (hike! > 5) dot = "amber";
    rows.push({ label: "Annual Rent Increase", value: `${hike}%`, dot });
  }

  return rows;
}

function buildSaleRows(p: Property): Row[] {
  const rows: Row[] = [];

  if (p.price_negotiable !== null && p.price_negotiable !== undefined) {
    rows.push({
      label: "Price Negotiable",
      value: p.price_negotiable ? "Yes" : "No",
      dot: p.price_negotiable ? "green" : "amber",
    });
  }

  if (isFieldSet("sale_brokerage_pct", p.sale_brokerage_pct)) {
    const pct = p.sale_brokerage_pct!;
    let dot: Dot = "green";
    if (pct > 2) dot = "red";
    else if (pct > 0) dot = "amber";
    rows.push({ label: "Brokerage", value: `${pct}%`, dot });
  }

  if (isFieldSet("rera_registration_number", p.rera_registration_number)) {
    rows.push({
      label: "RERA Registered",
      value: p.rera_registration_number!,
      dot: "green",
    });
  }

  if (isFieldSet("possession_status", p.possession_status)) {
    const label = formatEnumLabel("possession_status", p.possession_status);
    const withDate = p.possession_date ? `${label} · ${p.possession_date}` : label;
    rows.push({
      label: "Possession",
      value: withDate,
      dot: p.possession_status === "ready_to_move" ? "green" : "amber",
    });
  }

  return rows;
}

const DOT_CLASS: Record<Dot, string> = {
  green: "bg-green-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
};

export default function NoSurprisesCard({ property }: { property: Property }) {
  const rows =
    property.listing_type === "sale" ? buildSaleRows(property) : buildRentRows(property);

  if (rows.length === 0) return null;

  return (
    <section className="mx-4 rounded-2xl border border-primary/20 bg-primary/5 px-5 py-4 lg:mx-0">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-primary" />
          <h2 className="text-base font-semibold text-foreground">No Surprises</h2>
        </div>
        <span className="text-xs text-muted-foreground">
          All terms set by the owner
        </span>
      </div>
      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center gap-3 text-sm">
            <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", DOT_CLASS[r.dot])} />
            <span className="min-w-0 flex-1 text-muted-foreground">{r.label}</span>
            <span className="text-right font-medium text-foreground">{r.value}</span>
          </li>
        ))}
      </ul>
      {/* F1-B3f: "Why do these terms matter?" accordion removed — copy lives elsewhere. */}
    </section>
  );
}
