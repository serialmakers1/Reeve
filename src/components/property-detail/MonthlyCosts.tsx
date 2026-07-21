/**
 * P5 monthly-cost summary. Rent variant: rent + maintenance + move-in + brokerage
 * rows + utilities chips. Sale variant: sale price + per-sqft + brokerage.
 */
import { IndianRupee, Droplets, Zap, Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import PageSection from "./PageSection";
import { computeBrokerageMonths } from "@/utils/property/financialConversions";
import { formatEnumLabel } from "@/utils/property/formatEnumLabel";
import { isFieldSet } from "@/utils/property/isFieldSet";

interface Property {
  listing_type: string | null;
  listed_rent: number | null;
  society_maintenance_approx: number | null;
  maintenance_included_in_rent: boolean | null;
  move_in_charges_amount: number | null;
  rent_brokerage_type: string | null;
  rent_brokerage_fixed_amount: number | null;
  rent_brokerage_months: number | null;
  sale_price: number | null;
  expected_price_per_sqft: number | null;
  sale_brokerage_pct: number | null;
  utility_water_included: boolean | null;
  utility_electricity_included: boolean | null;
  utility_gas_included: boolean | null;
  gas_type: string | null;
}

function fmtINR(v: number): string {
  return `₹${v.toLocaleString("en-IN")}`;
}

function Row({
  amount,
  label,
  emphasise,
  suffix,
}: {
  amount: string;
  label: string;
  emphasise?: boolean;
  suffix?: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span
        className={cn(
          "font-semibold text-foreground",
          emphasise ? "text-xl" : "text-sm",
        )}
      >
        {amount}
      </span>
      <span className="flex items-center gap-2 text-sm text-muted-foreground">
        {label}
        {suffix}
      </span>
    </div>
  );
}

function IncludedChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-green-100 bg-green-50 px-3 py-1 text-sm text-green-800">
      {children}
    </span>
  );
}

export default function MonthlyCosts({ property }: { property: Property }) {
  const isSale = property.listing_type === "sale";

  if (isSale) {
    const salePriceRow = isFieldSet("sale_price", property.sale_price) ? (
      <Row amount={fmtINR(property.sale_price!)} label="Sale price" emphasise />
    ) : null;
    const perSqft = isFieldSet("expected_price_per_sqft", property.expected_price_per_sqft) ? (
      <Row amount={fmtINR(property.expected_price_per_sqft!)} label="Expected / sq ft" />
    ) : null;
    const brok = isFieldSet("sale_brokerage_pct", property.sale_brokerage_pct) ? (
      <Row amount={`${property.sale_brokerage_pct}%`} label="Brokerage" />
    ) : null;
    if (!salePriceRow && !perSqft && !brok) return null;
    return (
      <PageSection title="Price" icon={IndianRupee} background="muted">
        <div className="space-y-2">
          {salePriceRow}
          {perSqft}
          {brok}
        </div>
      </PageSection>
    );
  }

  // Rent variant
  const rows: React.ReactNode[] = [];

  // Rent row always shown (listed_rent is NOT NULL per schema).
  if (isFieldSet("listed_rent", property.listed_rent)) {
    rows.push(
      <Row
        key="rent"
        amount={fmtINR(property.listed_rent!)}
        label="Rent / month"
        emphasise
      />,
    );
  }

  // Maintenance row (with green/amber chip).
  if (isFieldSet("society_maintenance_approx", property.society_maintenance_approx)) {
    const included = !!property.maintenance_included_in_rent;
    rows.push(
      <Row
        key="maint"
        amount={fmtINR(property.society_maintenance_approx!)}
        label="Society maintenance"
        suffix={
          included ? (
            <IncludedChip>included in rent</IncludedChip>
          ) : (
            <span className="rounded-full border border-amber-100 bg-amber-50 px-3 py-1 text-sm text-amber-800">
              + extra
            </span>
          )
        }
      />,
    );
  }

  // Move-in row (only if > 0).
  if (
    isFieldSet("move_in_charges_amount", property.move_in_charges_amount) &&
    (property.move_in_charges_amount ?? 0) > 0
  ) {
    rows.push(
      <Row
        key="movein"
        amount={fmtINR(property.move_in_charges_amount!)}
        label="Move-in charge (one-time)"
      />,
    );
  }

  // Brokerage row.
  const brok = computeBrokerageMonths(
    property.rent_brokerage_type,
    property.rent_brokerage_fixed_amount,
    property.rent_brokerage_months,
    property.listed_rent,
  );
  if (brok.display) {
    rows.push(<Row key="brok" amount={brok.display} label="Brokerage" />);
  }

  const utilityChips: React.ReactNode[] = [];
  if (property.utility_water_included) {
    utilityChips.push(
      <span key="w" className="inline-flex items-center gap-1.5 rounded-full border border-green-100 bg-green-50 px-3 py-1 text-sm text-green-800">
        <Droplets className="h-3.5 w-3.5" /> Water
      </span>,
    );
  }
  if (property.utility_electricity_included) {
    utilityChips.push(
      <span key="e" className="inline-flex items-center gap-1.5 rounded-full border border-green-100 bg-green-50 px-3 py-1 text-sm text-green-800">
        <Zap className="h-3.5 w-3.5" /> Electricity
      </span>,
    );
  }
  if (property.utility_gas_included) {
    const gasLabel = property.gas_type
      ? `Gas (${formatEnumLabel("gas_type", property.gas_type)})`
      : "Gas";
    utilityChips.push(
      <span key="g" className="inline-flex items-center gap-1.5 rounded-full border border-green-100 bg-green-50 px-3 py-1 text-sm text-green-800">
        <Flame className="h-3.5 w-3.5" /> {gasLabel}
      </span>,
    );
  }

  if (rows.length === 0 && utilityChips.length === 0) return null;

  return (
    <PageSection title="Monthly Costs" icon={IndianRupee} background="muted">
      {rows.length > 0 ? <div className="space-y-2">{rows}</div> : null}
      {utilityChips.length > 0 ? (
        <>
          {rows.length > 0 ? <hr className="my-3 border-muted" /> : null}
          <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
            Utilities included
          </p>
          <div className="flex flex-wrap gap-2">{utilityChips}</div>
        </>
      ) : null}
    </PageSection>
  );
}
