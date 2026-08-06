/**
 * RequestFilterControls — Sort select + Filter panel for the owner Requests tab.
 * Desktop: Popover (applies live). Mobile: bottom Sheet editing a draft that is
 * committed only on Apply (discarded on close). Mode-aware (rent vs buy),
 * active-filter count badge, Clear all.
 */

import { useEffect, useState } from "react";
import { Filter, SlidersHorizontal } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from "@/components/ui/sheet";
import {
  OCCUPATION_OPTIONS, GENDER_OPTIONS, DIET_OPTIONS, MARITAL_STATUS_OPTIONS,
  STAY_OPTIONS, PET_TYPE_OPTIONS, BUYING_PURPOSE_OPTIONS,
  PURCHASE_TIMELINE_OPTIONS, FUNDING_STAGE_OPTIONS,
} from "@/lib/preferenceHelpers";
import {
  type RequestFilters, type SortKey, type SnapshotMode, type TriState,
  STATUS_OPTIONS, DATE_RANGE_OPTIONS, availableSorts, countActiveFilters,
  sanitizeFilters,
} from "./requestFilters";

interface Props {
  mode: SnapshotMode;
  filters: RequestFilters;
  sortKey: SortKey;
  onFiltersChange: (next: RequestFilters) => void;
  onSortChange: (next: SortKey) => void;
  onClearAll: () => void;
}

function MultiCheck({
  legend, options, selected, onToggle,
}: {
  legend: string;
  options: { value: string; label: string }[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <fieldset className="space-y-1.5">
      <legend className="text-xs font-semibold text-muted-foreground">{legend}</legend>
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {options.map((o) => (
          <label key={o.value} className="flex min-h-[32px] items-center gap-2 cursor-pointer text-sm">
            <Checkbox checked={selected.includes(o.value)} onCheckedChange={() => onToggle(o.value)} />
            <span className="[overflow-wrap:anywhere]">{o.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function TriSelect({
  label, value, onChange,
}: { label: string; value: TriState; onChange: (v: TriState) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-muted-foreground">{label}</Label>
      <Select value={value} onValueChange={(v) => onChange(v as TriState)}>
        <SelectTrigger className="min-h-[40px]"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="any">Any</SelectItem>
          <SelectItem value="yes">Yes</SelectItem>
          <SelectItem value="no">No</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

/** The editable filter body. `value`/`onChange` are the working filters. */
function FilterForm({
  mode, value, onChange,
}: { mode: SnapshotMode; value: RequestFilters; onChange: (next: RequestFilters) => void }) {
  // Any change re-sanitizes so dependent rules (petTypes when pets!=="yes") hold.
  const set = (patch: Partial<RequestFilters>) => onChange(sanitizeFilters({ ...value, ...patch }, mode));
  const toggle = (key: keyof RequestFilters, v: string) => {
    const cur = (value[key] as string[]) ?? [];
    set({ [key]: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] } as Partial<RequestFilters>);
  };

  return (
    <div className="space-y-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Common</p>
      <MultiCheck legend="Request status" options={STATUS_OPTIONS} selected={value.status} onToggle={(v) => toggle("status", v)} />
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold text-muted-foreground">Request date</Label>
        <Select value={value.dateRange} onValueChange={(v) => set({ dateRange: v as RequestFilters["dateRange"] })}>
          <SelectTrigger className="min-h-[40px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {DATE_RANGE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold text-muted-foreground">Age</Label>
        <div className="flex items-center gap-2">
          <Input type="number" inputMode="numeric" min={0} placeholder="Min" className="min-h-[40px]"
            value={value.ageMin ?? ""} onChange={(e) => set({ ageMin: e.target.value === "" ? null : Number(e.target.value) })} />
          <span className="text-muted-foreground">–</span>
          <Input type="number" inputMode="numeric" min={0} placeholder="Max" className="min-h-[40px]"
            value={value.ageMax ?? ""} onChange={(e) => set({ ageMax: e.target.value === "" ? null : Number(e.target.value) })} />
        </div>
      </div>
      <MultiCheck legend="Occupation" options={OCCUPATION_OPTIONS} selected={value.occupation} onToggle={(v) => toggle("occupation", v)} />
      <TriSelect label="Foreign national" value={value.foreignNational} onChange={(v) => set({ foreignNational: v })} />

      {mode === "rent" ? (
        <>
          <p className="pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Rental</p>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">Move-in on or before</Label>
            <Input type="date" className="min-h-[40px]" value={value.moveInBefore ?? ""}
              onChange={(e) => set({ moveInBefore: e.target.value || null })} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">Minimum residents</Label>
            <Input type="number" inputMode="numeric" min={1} placeholder="Any" className="min-h-[40px]"
              value={value.residentsMin ?? ""} onChange={(e) => set({ residentsMin: e.target.value === "" ? null : Number(e.target.value) })} />
          </div>
          <TriSelect label="Pets" value={value.pets} onChange={(v) => set({ pets: v })} />
          {value.pets === "yes" && (
            <MultiCheck legend="Pet types" options={PET_TYPE_OPTIONS} selected={value.petTypes} onToggle={(v) => toggle("petTypes", v)} />
          )}
          <MultiCheck legend="Expected stay" options={STAY_OPTIONS} selected={value.expectedStay} onToggle={(v) => toggle("expectedStay", v)} />
          <MultiCheck legend="Gender" options={GENDER_OPTIONS} selected={value.gender} onToggle={(v) => toggle("gender", v)} />
          <MultiCheck legend="Diet" options={DIET_OPTIONS} selected={value.diet} onToggle={(v) => toggle("diet", v)} />
          <MultiCheck legend="Marital status" options={MARITAL_STATUS_OPTIONS} selected={value.maritalStatus} onToggle={(v) => toggle("maritalStatus", v)} />
        </>
      ) : (
        <>
          <p className="pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Buying</p>
          <MultiCheck legend="Buying purpose" options={BUYING_PURPOSE_OPTIONS} selected={value.buyingPurpose} onToggle={(v) => toggle("buyingPurpose", v)} />
          <MultiCheck legend="Purchase timeline" options={PURCHASE_TIMELINE_OPTIONS} selected={value.purchaseTimeline} onToggle={(v) => toggle("purchaseTimeline", v)} />
          <MultiCheck legend="Funding stage" options={FUNDING_STAGE_OPTIONS} selected={value.fundingStage} onToggle={(v) => toggle("fundingStage", v)} />
        </>
      )}
    </div>
  );
}

export default function RequestFilterControls({
  mode, filters, sortKey, onFiltersChange, onSortChange, onClearAll,
}: Props) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<RequestFilters>(filters);
  const activeCount = countActiveFilters(filters, mode);
  const sorts = availableSorts(mode);

  // Seed the mobile draft from committed filters each time the sheet opens.
  useEffect(() => {
    if (isMobile && open) setDraft(filters);
  }, [isMobile, open, filters]);

  const filterTrigger = (
    <Button variant="outline" size="sm" className="min-h-[40px] gap-1.5">
      <Filter className="h-4 w-4" />
      Filters
      {activeCount > 0 && (
        <Badge className="ml-0.5 h-5 min-w-[20px] rounded-full px-1.5 text-[10px]">{activeCount}</Badge>
      )}
    </Button>
  );

  const sortControl = (
    <Select value={sortKey} onValueChange={(v) => onSortChange(v as SortKey)}>
      <SelectTrigger className="min-h-[40px] w-[170px]" aria-label="Sort requests">
        <SlidersHorizontal className="h-4 w-4 mr-1.5 shrink-0" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {sorts.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      {isMobile ? (
        <>
          <div onClick={() => setOpen(true)}>{filterTrigger}</div>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetContent side="bottom" className="max-h-[90dvh] overflow-y-auto">
              <SheetHeader className="text-left">
                <SheetTitle>Filter requests</SheetTitle>
              </SheetHeader>
              <div className="mt-3">
                <FilterForm mode={mode} value={draft} onChange={setDraft} />
              </div>
              <SheetFooter className="mt-4 flex-row gap-2">
                <Button variant="ghost" className="flex-1 min-h-[44px]" onClick={() => { onClearAll(); setOpen(false); }}>
                  Clear all
                </Button>
                <Button className="flex-1 min-h-[44px]" onClick={() => { onFiltersChange(sanitizeFilters(draft, mode)); setOpen(false); }}>
                  Apply
                </Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </>
      ) : (
        <Popover>
          <PopoverTrigger asChild>{filterTrigger}</PopoverTrigger>
          <PopoverContent align="start" className="w-[360px] max-w-[calc(100vw-2rem)] max-h-[70vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold">Filters</p>
              {activeCount > 0 && (
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onClearAll}>Clear all</Button>
              )}
            </div>
            {/* Desktop applies live. */}
            <FilterForm mode={mode} value={filters} onChange={onFiltersChange} />
          </PopoverContent>
        </Popover>
      )}
      {sortControl}
    </div>
  );
}
