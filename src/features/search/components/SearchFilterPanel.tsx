import { useState, useEffect } from "react";
import { Check, ChevronDown, Building2, Car, ReceiptText, ShieldCheck, type LucideIcon } from "lucide-react";
import { Sheet, SheetContent, SheetClose, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useSearchState } from "@/features/search/state/useSearchState";
import { countActiveFilters } from "@/features/search/state/filterUtils";
import { FilterSection } from "./list/FilterSection";
import type { RentFilters, BuyFilters } from "../domain/searchTypes";
import {
  BHK_VALUES,
  FURNISHING_VALUES,
  PARKING_VALUES,
  POSSESSION_VALUES,
  PET_POLICY_VALUES,
  KHATA_VALUES,
  AMENITY_OPTIONS,
} from "../domain/searchConstants";

interface SearchFilterPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}


const BHK_LABELS: Record<string, string> = {
  "1BHK": "1 BHK",
  "2BHK": "2 BHK",
  "3BHK": "3 BHK",
  "4BHK": "4 BHK",
  "5BHK_plus": "5+ BHK",
  studio: "Studio",
};

const FURNISHING_LABELS: Record<string, string> = {
  unfurnished: "Unfurnished",
  semi_furnished: "Semi",
  fully_furnished: "Fully",
};

const POSSESSION_LABELS: Record<string, string> = {
  ready_to_move: "Ready to move",
  under_construction: "Under construction",
  new_launch: "New launch",
};

const PET_LABELS: Record<string, string> = {
  allowed: "Allowed",
  small_only: "Small only",
  case_by_case: "Case by case",
  not_allowed: "Not allowed",
};

const PARKING_LABELS: Record<string, string> = {
  none: "None",
  covered: "Covered",
  uncovered: "Uncovered",
  both: "Both",
};

const KHATA_LABELS: Record<string, string> = {
  A: "Khata A",
  B: "Khata B",
  not_applicable: "N/A",
};

const LISTED_WITHIN_OPTIONS = [
  { value: 7, label: "Last 7 days" },
  { value: 14, label: "Last 14 days" },
  { value: 30, label: "Last 30 days" },
  { value: 90, label: "Last 90 days" },
];

// Budget presets only populate the existing Min/Max fields — no new semantics.
const RENT_BUDGET_PRESETS: { label: string; min?: number; max?: number }[] = [
  { label: "< ₹15k", max: 15000 },
  { label: "₹15k–25k", min: 15000, max: 25000 },
  { label: "₹25k–40k", min: 25000, max: 40000 },
  { label: "₹40k+", min: 40000 },
];
const BUY_BUDGET_PRESETS: { label: string; min?: number; max?: number }[] = [
  { label: "< ₹50L", max: 5000000 },
  { label: "₹50L–1Cr", min: 5000000, max: 10000000 },
  { label: "₹1–2Cr", min: 10000000, max: 20000000 },
  { label: "₹2Cr+", min: 20000000 },
];

/** Collapsible filter group with a selected-count badge. */
function FilterGroup({
  title,
  count,
  icon: Icon,
  children,
}: {
  title: string;
  count: number;
  icon?: LucideIcon;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-2 first:mt-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between rounded-lg bg-muted/50 px-3 py-3 text-left font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        <span className="flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
          {title}
          {count > 0 && (
            <span className="rounded-full bg-primary/15 px-1.5 text-[11px] font-medium text-primary">{count}</span>
          )}
        </span>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && <div className="px-3 pb-1">{children}</div>}
    </div>
  );
}

function ToggleChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-background text-foreground",
      )}
    >
      {active && <Check className="h-3 w-3" />}
      {label}
    </button>
  );
}

function toggleArray<T>(arr: T[] | undefined, val: T): T[] {
  const cur = arr ?? [];
  return cur.includes(val) ? cur.filter((v) => v !== val) : [...cur, val];
}

export function SearchFilterPanel({ open, onOpenChange }: SearchFilterPanelProps) {
  const { state, applyFilters } = useSearchState();
  const mode = state.context.mode ?? "rent";

  const [draft, setDraft] = useState<RentFilters | BuyFilters>({});
  const [showAllAmenities, setShowAllAmenities] = useState(false);
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(min-width: 1200px)").matches,
  );
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1200px)");
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  const cityTitle = state.context.city
    ? state.context.city.charAt(0).toUpperCase() + state.context.city.slice(1)
    : null;

  useEffect(() => {
    if (!open) return;
    setDraft(state.filters);
    setShowAllAmenities(false);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const draftFilterCount = countActiveFilters(draft, mode);
  const AMENITY_SUBSET_COUNT = 6;
  const visibleAmenities = showAllAmenities
    ? AMENITY_OPTIONS
    : AMENITY_OPTIONS.slice(0, AMENITY_SUBSET_COUNT);

  function handleApply() {
    // Single atomic write — replaces filters, preserves the externally-selected sort.
    applyFilters(draft);
    onOpenChange(false);
  }

  function handleReset() {
    setDraft({});
  }

  const rf = draft as RentFilters;
  const bf = draft as BuyFilters;

  function setRf(patch: Partial<RentFilters>) {
    setDraft((prev) => ({ ...prev, ...patch }));
  }

  function setBf(patch: Partial<BuyFilters>) {
    setDraft((prev) => ({ ...prev, ...patch }));
  }

  function setShared(patch: Partial<RentFilters & BuyFilters>) {
    setDraft((prev) => ({ ...prev, ...patch }));
  }

  const g = draft as RentFilters & BuyFilters;
  const groupCounts = {
    propAvail:
      mode === "rent"
        ? [rf.availableBy, rf.listedWithin, rf.availabilityConfirmedWithin].filter(Boolean).length
        : [
            bf.minCarpetArea || bf.maxCarpetArea || bf.minSuperBuiltUp || bf.maxSuperBuiltUp,
            bf.possessionStatus?.length || bf.possessionBefore,
            bf.listedWithin,
          ].filter(Boolean).length,
    parkAmen: [g.amenities?.length, g.parking4w?.length || g.parking2w?.length].filter(Boolean).length,
    deal:
      mode === "rent"
        ? [
            rf.zeroRentBrokerage || rf.maxBrokerage,
            rf.maxDeposit || rf.maxLockIn || rf.maxNotice || rf.maxAnnualIncrease || rf.maxMoveInCharges,
            rf.petPolicy?.length,
          ].filter(Boolean).length
        : [bf.maxBrokerage, bf.negotiable].filter(Boolean).length,
    lister: [
      g.hasVideoWalkthrough,
      mode === "buy" && (bf.reraDisclosed || bf.khataType?.length || bf.propertyTaxPaid),
    ].filter(Boolean).length,
  };

  const budgetPresets = mode === "rent" ? RENT_BUDGET_PRESETS : BUY_BUDGET_PRESETS;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isDesktop ? "right" : "bottom"}
        className={cn(
          "flex flex-col p-0 gap-0",
          isDesktop ? "w-[520px] sm:max-w-[560px] h-full" : "h-[90dvh]",
        )}
      >
        {/* Header — single close is the built-in SheetContent X (top-right) */}
        <div className="px-4 py-3 border-b shrink-0 pr-12">
          <div className="flex items-center justify-between gap-3">
            <SheetTitle className="text-base font-semibold">Filters</SheetTitle>
            <button
              type="button"
              onClick={handleReset}
              className="text-xs font-medium text-primary hover:underline underline-offset-2"
            >
              Clear all
            </button>
          </div>
          <SheetDescription className="mt-0.5 text-xs text-muted-foreground">
            {cityTitle ? `Showing properties in ${cityTitle}` : "Refine your search results"}
          </SheetDescription>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto px-4">
          {/* Budget */}
          <FilterSection title={mode === "rent" ? "Total monthly budget (₹)" : "Sale price (₹)"}>
            <div className="mb-2 flex flex-wrap gap-2">
              {budgetPresets.map((p) => {
                const active =
                  (g.minPrice ?? undefined) === p.min && (g.maxPrice ?? undefined) === p.max;
                return (
                  <ToggleChip
                    key={p.label}
                    label={p.label}
                    active={active}
                    onClick={() =>
                      setShared(
                        active
                          ? { minPrice: undefined, maxPrice: undefined }
                          : { minPrice: p.min, maxPrice: p.max },
                      )
                    }
                  />
                );
              })}
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                placeholder="Min"
                value={(draft as RentFilters & BuyFilters).minPrice ?? ""}
                onChange={(e) =>
                  setShared({ minPrice: e.target.value ? Number(e.target.value) : undefined })
                }
                className="h-8 text-sm"
              />
              <span className="text-muted-foreground">–</span>
              <Input
                type="number"
                placeholder="Max"
                value={(draft as RentFilters & BuyFilters).maxPrice ?? ""}
                onChange={(e) =>
                  setShared({ maxPrice: e.target.value ? Number(e.target.value) : undefined })
                }
                className="h-8 text-sm"
              />
            </div>
          </FilterSection>

          {/* BHK */}
          <FilterSection title="BHK">
            <div className="flex flex-wrap gap-2">
              {BHK_VALUES.map((v) => (
                <ToggleChip
                  key={v}
                  label={BHK_LABELS[v] ?? v}
                  active={!!((draft as RentFilters & BuyFilters).bhk ?? []).includes(v)}
                  onClick={() =>
                    setShared({
                      bhk: toggleArray((draft as RentFilters & BuyFilters).bhk, v),
                    })
                  }
                />
              ))}
            </div>
          </FilterSection>

          {/* Furnishing — both modes */}
          <FilterSection title="Furnishing">
            <div className="flex flex-wrap gap-2">
              {FURNISHING_VALUES.map((v) => (
                <ToggleChip
                  key={v}
                  label={FURNISHING_LABELS[v] ?? v}
                  active={!!((draft as RentFilters & BuyFilters).furnishing ?? []).includes(v)}
                  onClick={() =>
                    setShared({
                      furnishing: toggleArray(
                        (draft as RentFilters & BuyFilters).furnishing,
                        v,
                      ),
                    })
                  }
                />
              ))}
            </div>
          </FilterSection>

          {/* ── Grouped advanced filters (accordions) ── */}
          <FilterGroup title="Property & availability" icon={Building2} count={groupCounts.propAvail}>
          {mode === "rent" && (
            <>
              <FilterSection title="Available by">
                <Input
                  type="date"
                  value={rf.availableBy ?? ""}
                  onChange={(e) => setRf({ availableBy: e.target.value || undefined })}
                  className="h-8 text-sm w-full"
                />
              </FilterSection>

              <FilterSection title="Listed within">
                <div className="flex flex-wrap gap-2">
                  {LISTED_WITHIN_OPTIONS.map(({ value, label }) => (
                    <ToggleChip
                      key={value}
                      label={label}
                      active={rf.listedWithin === value}
                      onClick={() =>
                        setRf({ listedWithin: rf.listedWithin === value ? undefined : value })
                      }
                    />
                  ))}
                </div>
              </FilterSection>

              <FilterSection title="Availability Confirmed">
                <div className="flex flex-wrap gap-2">
                  {([3, 7, 14] as const).map((days) => (
                    <ToggleChip
                      key={days}
                      label={`Within ${days}d`}
                      active={rf.availabilityConfirmedWithin === days}
                      onClick={() =>
                        setRf({
                          availabilityConfirmedWithin:
                            rf.availabilityConfirmedWithin === days ? undefined : days,
                        })
                      }
                    />
                  ))}
                </div>
              </FilterSection>
            </>
          )}
          {mode === "buy" && (
            <>
              <FilterSection title="Area (sq.ft)">
                <div className="space-y-2">
                  <div>
                    <Label className="text-[11px] text-muted-foreground">Carpet area</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        type="number"
                        placeholder="Min"
                        value={bf.minCarpetArea ?? ""}
                        onChange={(e) =>
                          setBf({ minCarpetArea: e.target.value ? Number(e.target.value) : undefined })
                        }
                        className="h-8 text-sm"
                      />
                      <span className="text-muted-foreground">–</span>
                      <Input
                        type="number"
                        placeholder="Max"
                        value={bf.maxCarpetArea ?? ""}
                        onChange={(e) =>
                          setBf({ maxCarpetArea: e.target.value ? Number(e.target.value) : undefined })
                        }
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-[11px] text-muted-foreground">Super built-up area</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        type="number"
                        placeholder="Min"
                        value={bf.minSuperBuiltUp ?? ""}
                        onChange={(e) =>
                          setBf({ minSuperBuiltUp: e.target.value ? Number(e.target.value) : undefined })
                        }
                        className="h-8 text-sm"
                      />
                      <span className="text-muted-foreground">–</span>
                      <Input
                        type="number"
                        placeholder="Max"
                        value={bf.maxSuperBuiltUp ?? ""}
                        onChange={(e) =>
                          setBf({ maxSuperBuiltUp: e.target.value ? Number(e.target.value) : undefined })
                        }
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                </div>
              </FilterSection>

              <FilterSection title="Possession">
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {POSSESSION_VALUES.map((v) => (
                      <ToggleChip
                        key={v}
                        label={POSSESSION_LABELS[v] ?? v}
                        active={!!(bf.possessionStatus ?? []).includes(v)}
                        onClick={() =>
                          setBf({ possessionStatus: toggleArray(bf.possessionStatus, v) })
                        }
                      />
                    ))}
                  </div>
                  <div>
                    <Label className="text-[11px] text-muted-foreground">Possession before</Label>
                    <Input
                      type="date"
                      value={bf.possessionBefore ?? ""}
                      onChange={(e) => setBf({ possessionBefore: e.target.value || undefined })}
                      className="h-8 text-sm mt-1 w-full"
                    />
                  </div>
                </div>
              </FilterSection>

              <FilterSection title="Listed within">
                <div className="flex flex-wrap gap-2">
                  {LISTED_WITHIN_OPTIONS.map(({ value, label }) => (
                    <ToggleChip
                      key={value}
                      label={label}
                      active={bf.listedWithin === value}
                      onClick={() =>
                        setBf({ listedWithin: bf.listedWithin === value ? undefined : value })
                      }
                    />
                  ))}
                </div>
              </FilterSection>
            </>
          )}
          </FilterGroup>

          <FilterGroup title="Parking & amenities" icon={Car} count={groupCounts.parkAmen}>
            <FilterSection title="Amenities">
              <div className="flex flex-wrap gap-2">
                {visibleAmenities.map(({ value, label }) => (
                  <ToggleChip
                    key={value}
                    label={label}
                    active={!!((draft as RentFilters & BuyFilters).amenities ?? []).includes(value)}
                    onClick={() =>
                      setShared({
                        amenities: toggleArray((draft as RentFilters & BuyFilters).amenities, value),
                      })
                    }
                  />
                ))}
              </div>
              {AMENITY_OPTIONS.length > AMENITY_SUBSET_COUNT && (
                <button
                  type="button"
                  onClick={() => setShowAllAmenities((v) => !v)}
                  className="mt-2 text-xs font-medium text-primary underline underline-offset-2"
                >
                  {showAllAmenities ? "Show fewer" : "See all"}
                </button>
              )}
            </FilterSection>

            <FilterSection title="Parking">
              <div className="space-y-2">
                <div>
                  <Label className="text-[11px] text-muted-foreground">4-wheeler</Label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {PARKING_VALUES.map((v) => (
                      <ToggleChip
                        key={v}
                        label={PARKING_LABELS[v] ?? v}
                        active={!!((draft as RentFilters & BuyFilters).parking4w ?? []).includes(v)}
                        onClick={() =>
                          setShared({ parking4w: toggleArray((draft as RentFilters & BuyFilters).parking4w, v) })
                        }
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-[11px] text-muted-foreground">2-wheeler</Label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {PARKING_VALUES.map((v) => (
                      <ToggleChip
                        key={v}
                        label={PARKING_LABELS[v] ?? v}
                        active={!!((draft as RentFilters & BuyFilters).parking2w ?? []).includes(v)}
                        onClick={() =>
                          setShared({ parking2w: toggleArray((draft as RentFilters & BuyFilters).parking2w, v) })
                        }
                      />
                    ))}
                  </div>
                </div>
              </div>
            </FilterSection>
          </FilterGroup>

          <FilterGroup title="Deal terms" icon={ReceiptText} count={groupCounts.deal}>
          {mode === "rent" && (
            <>
              <FilterSection title="Brokerage">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="zero-brokerage"
                      checked={!!rf.zeroRentBrokerage}
                      onCheckedChange={(checked) =>
                        setRf({ zeroRentBrokerage: checked === true ? true : undefined })
                      }
                    />
                    <Label htmlFor="zero-brokerage" className="text-sm cursor-pointer">
                      Zero brokerage only
                    </Label>
                  </div>
                  <Input
                    type="number"
                    placeholder="Max brokerage (₹)"
                    value={rf.maxBrokerage ?? ""}
                    onChange={(e) =>
                      setRf({ maxBrokerage: e.target.value ? Number(e.target.value) : undefined })
                    }
                    disabled={!!rf.zeroRentBrokerage}
                    className="h-8 text-sm"
                  />
                </div>
              </FilterSection>

              <FilterSection title="Deposit & terms">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[11px] text-muted-foreground">Max deposit (₹)</Label>
                    <Input
                      type="number"
                      placeholder="e.g. 100000"
                      value={rf.maxDeposit ?? ""}
                      onChange={(e) =>
                        setRf({ maxDeposit: e.target.value ? Number(e.target.value) : undefined })
                      }
                      className="h-8 text-sm mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] text-muted-foreground">Max lock-in (months)</Label>
                    <Input
                      type="number"
                      placeholder="e.g. 11"
                      value={rf.maxLockIn ?? ""}
                      onChange={(e) =>
                        setRf({ maxLockIn: e.target.value ? Number(e.target.value) : undefined })
                      }
                      className="h-8 text-sm mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] text-muted-foreground">Max notice (days)</Label>
                    <Input
                      type="number"
                      placeholder="e.g. 30"
                      value={rf.maxNotice ?? ""}
                      onChange={(e) =>
                        setRf({ maxNotice: e.target.value ? Number(e.target.value) : undefined })
                      }
                      className="h-8 text-sm mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] text-muted-foreground">Max annual increase (%)</Label>
                    <Input
                      type="number"
                      placeholder="e.g. 5"
                      value={rf.maxAnnualIncrease ?? ""}
                      onChange={(e) =>
                        setRf({
                          maxAnnualIncrease: e.target.value ? Number(e.target.value) : undefined,
                        })
                      }
                      className="h-8 text-sm mt-1"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-[11px] text-muted-foreground">Max move-in charges (₹)</Label>
                    <Input
                      type="number"
                      placeholder="e.g. 5000"
                      value={rf.maxMoveInCharges ?? ""}
                      onChange={(e) =>
                        setRf({
                          maxMoveInCharges: e.target.value ? Number(e.target.value) : undefined,
                        })
                      }
                      className="h-8 text-sm mt-1"
                    />
                  </div>
                </div>
              </FilterSection>

              <FilterSection title="Pets">
                <div className="flex flex-wrap gap-2">
                  {PET_POLICY_VALUES.map((v) => (
                    <ToggleChip
                      key={v}
                      label={PET_LABELS[v] ?? v}
                      active={!!(rf.petPolicy ?? []).includes(v)}
                      onClick={() => setRf({ petPolicy: toggleArray(rf.petPolicy, v) })}
                    />
                  ))}
                </div>
              </FilterSection>
            </>
          )}
          {mode === "buy" && (
            <>
              <FilterSection title="Brokerage">
                <Input
                  type="number"
                  placeholder="Max brokerage (%)"
                  value={bf.maxBrokerage ?? ""}
                  onChange={(e) =>
                    setBf({ maxBrokerage: e.target.value ? Number(e.target.value) : undefined })
                  }
                  className="h-8 text-sm"
                />
              </FilterSection>

              <FilterSection title="Negotiable">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="negotiable"
                    checked={!!bf.negotiable}
                    onCheckedChange={(checked) =>
                      setBf({ negotiable: checked === true ? true : undefined })
                    }
                  />
                  <Label htmlFor="negotiable" className="text-sm cursor-pointer">
                    Price is negotiable
                  </Label>
                </div>
              </FilterSection>
            </>
          )}
          </FilterGroup>

          <FilterGroup title="Lister & transparency" icon={ShieldCheck} count={groupCounts.lister}>
            <FilterSection title="Lister">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="video"
                    checked={!!((draft as RentFilters & BuyFilters).hasVideoWalkthrough)}
                    onCheckedChange={(checked) =>
                      setShared({ hasVideoWalkthrough: checked === true ? true : undefined })
                    }
                  />
                  <Label htmlFor="video" className="text-sm cursor-pointer">
                    Video walkthrough available
                  </Label>
                </div>
              </div>
            </FilterSection>

            {mode === "buy" && (
              <FilterSection title="Legal & compliance">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="rera"
                      checked={!!bf.reraDisclosed}
                      onCheckedChange={(checked) =>
                        setBf({ reraDisclosed: checked === true ? true : undefined })
                      }
                    />
                    <Label htmlFor="rera" className="text-sm cursor-pointer">
                      RERA disclosed
                    </Label>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {KHATA_VALUES.map((v) => (
                      <ToggleChip
                        key={v}
                        label={KHATA_LABELS[v] ?? v}
                        active={!!(bf.khataType ?? []).includes(v)}
                        onClick={() => setBf({ khataType: toggleArray(bf.khataType, v) })}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="tax-paid"
                      checked={!!bf.propertyTaxPaid}
                      onCheckedChange={(checked) =>
                        setBf({ propertyTaxPaid: checked === true ? true : undefined })
                      }
                    />
                    <Label htmlFor="tax-paid" className="text-sm cursor-pointer">
                      Property tax paid
                    </Label>
                  </div>
                </div>
              </FilterSection>
            )}
          </FilterGroup>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 border-t px-4 py-3 shrink-0">
          <div className="flex-1 text-sm text-muted-foreground">
            {draftFilterCount > 0
              ? `${draftFilterCount} ${draftFilterCount === 1 ? "filter" : "filters"} applied`
              : "No filters applied"}
          </div>
          <Button onClick={handleApply}>Show properties</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
