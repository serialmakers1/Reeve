/**
 * SpecField — surface-agnostic renderer driven by PROPERTY_FIELDS (D-128, D-155).
 *
 * One component powers three surfaces:
 *   - owner_form   (ListProperty.tsx — Phase 1.5 Prompt 3, shipped)
 *   - admin_form   (admin/PropertyEdit.tsx — Phase 1.5 Prompt 4)
 *   - public_detail (PropertyDetail.tsx — Phase 1.5 Prompt 5)
 *
 * Design rules:
 *   - Label always resolves via `getFieldLabel(field, surface)`. No labelOverride prop.
 *     If a surface label is wrong, fix the spec, not the call site.
 *   - Caller owns state, transforms, and side effects. SpecField receives value +
 *     onChange as props; it never imports form hooks, save hooks, or updateField.
 *     This keeps it reusable across surfaces that own state differently.
 *   - readOnly renders a plain formatted value via `formatFieldValue()` instead of
 *     an input. Used for Tier-1-on-listed in owner form and for the public surface.
 *   - Handles scalar inputs only: text, textarea, number, select, switch.
 *     Compound inputs (deposit chips, date picker, dynamic-placeholder title),
 *     JSONB fields, and consent checkboxes stay bespoke at the call site.
 *
 * Do NOT extend to date/multiselect/json/radio/checkbox here — every extension
 * is a chance to fork. Prompts 4/5 must reuse this file; changes to the
 * component contract need to be agreed across all three consumers.
 */

import { useMemo, type ReactNode } from "react";
import { format } from "date-fns";
import {
  Armchair,
  Bike,
  Building2,
  CalendarDays,
  CalendarIcon,
  Car,
  Compass,
  Droplets,
  Home,
  KeyRound,
  Layers,
  Maximize2,
  PawPrint,
  Wind,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  PROPERTY_FIELDS,
  formatFieldValue,
  getFieldLabel,
  isFieldVisible,
  type PropertyFieldSpec,
  type PropertyFieldSurface,
} from "@/config/property-fields";

/**
 * Lucide icon registry for public_detail rows. Field spec references icons by
 * string (`displayIcon: 'home'`) to keep spec entries import-free; the registry
 * resolves to components here. Unknown or missing icon → no icon rendered
 * (safe fallback — row still emits label + value).
 *
 * When adding an icon: extend the registry with a Lucide import + entry, then
 * set `displayIcon` on the spec entry. No PropertyDetail changes required.
 */
const PUBLIC_ICON_REGISTRY: Record<string, ReactNode> = {
  home: <Home className="h-4 w-4" />,
  maximize: <Maximize2 className="h-4 w-4" />,
  building: <Building2 className="h-4 w-4" />,
  layers: <Layers className="h-4 w-4" />,
  droplets: <Droplets className="h-4 w-4" />,
  wind: <Wind className="h-4 w-4" />,
  compass: <Compass className="h-4 w-4" />,
  "calendar-days": <CalendarDays className="h-4 w-4" />,
  armchair: <Armchair className="h-4 w-4" />,
  car: <Car className="h-4 w-4" />,
  bike: <Bike className="h-4 w-4" />,
  "key-round": <KeyRound className="h-4 w-4" />,
  "paw-print": <PawPrint className="h-4 w-4" />,
};

export type SpecFieldOverrides = {
  helperOverride?: string;
  placeholderOverride?: string;
  /**
   * Owner-form character cap for text/textarea. Applied ONLY via this prop so the
   * shared `property-fields.ts` spec (used by admin) is never newly restricted.
   * Text inputs already honour `field.maxLength`; this override takes precedence.
   * The textarea branch has no spec-driven maxLength and relies solely on this.
   */
  maxLengthOverride?: number;
  /** Inline validation error rendered under the control (text/textarea only). */
  error?: string;
  /** Show a live `{len}/{max}` counter (text/textarea; needs an effective max). */
  showCounter?: boolean;
  /** Blur handler (text/textarea) — used for on-blur validation. */
  onBlur?: () => void;
  /** Sets `id` on the underlying `<input>` element (text only) for focus targeting and aria-describedby. */
  inputId?: string;
};

export type SpecFieldProps<T = unknown> = SpecFieldOverrides & {
  fieldKey: string;
  surface: PropertyFieldSurface;
  value: T;
  onChange?: (next: T) => void;
  /**
   * Renders as a formatted read-only value instead of an input. Used for:
   *   - Tier-1 fields on a listed property (owner surface)
   *   - Every field on the public surface (Prompt 5)
   *   - Admin fields the current admin can't edit (rare)
   */
  readOnly?: boolean;
  /** Optional trailing children rendered next to the input (e.g., deposit chips). */
  children?: React.ReactNode;
  className?: string;
  /**
   * Current form / row values map. Only consulted when the field's spec entry
   * defines `visibleWhen(values) => boolean`. If `visibleWhen` returns false,
   * SpecField renders null (D-161, Prompt 10a). Callers must pass this whenever
   * they render fields that have a `visibleWhen` predicate (owner form, admin
   * form, public detail with row data). Passing undefined when the field has
   * `visibleWhen` triggers a one-shot DEV warning and defaults to showing the
   * field (fail-safe).
   */
  formValues?: Record<string, unknown>;
};

function findField(fieldKey: string): PropertyFieldSpec | undefined {
  return PROPERTY_FIELDS.find((f) => f.key === fieldKey);
}

/**
 * Small wrapper matching the FormField shape used elsewhere so the visual
 * treatment stays byte-identical to the current form.
 */
function Shell({
  label,
  helper,
  children,
  className,
}: {
  label: React.ReactNode;
  helper?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-sm font-medium">{label}</Label>
      {children}
      {helper && <p className="text-xs text-muted-foreground">{helper}</p>}
    </div>
  );
}

// One-shot DEV warning set so visibleWhen-without-formValues doesn't spam the console.
const missingFormValuesWarned = new Set<string>();

/**
 * Accepts Date | ISO string (`yyyy-MM-dd`) | full ISO | null | undefined and
 * returns a Date (or undefined). The `+ T00:00:00` suffix matches the existing
 * owner/admin bespoke parsers (avoids a UTC-shifted day-off-by-one).
 */
function coerceDate(v: unknown): Date | undefined {
  if (!v) return undefined;
  if (v instanceof Date) return v;
  if (typeof v === "string") {
    const iso = /^\d{4}-\d{2}-\d{2}$/.test(v) ? v + "T00:00:00" : v;
    const d = new Date(iso);
    return isNaN(d.getTime()) ? undefined : d;
  }
  return undefined;
}

function isPastDate(d: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const picked = new Date(d);
  picked.setHours(0, 0, 0, 0);
  return picked < today;
}

export function SpecField<T = unknown>(props: SpecFieldProps<T>) {
  const {
    fieldKey,
    surface,
    value,
    onChange,
    helperOverride,
    placeholderOverride,
    maxLengthOverride,
    error,
    showCounter,
    onBlur,
    inputId,
    readOnly,
    children,
    className,
    formValues,
  } = props;

  const field = useMemo(() => findField(fieldKey), [fieldKey]);

  if (!field) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.error(`[SpecField] unknown field key: ${fieldKey}`);
    }
    return null;
  }

  // Prompt 10a (D-161) — visibleWhen predicate. If defined and formValues passed,
  // gate rendering. If defined but formValues absent, warn once in DEV and fall
  // back to rendering (fail-safe — hiding by default would silently drop fields).
  if (field.visibleWhen) {
    if (formValues) {
      if (!isFieldVisible(field, formValues)) return null;
    } else if (import.meta.env.DEV && !missingFormValuesWarned.has(fieldKey)) {
      missingFormValuesWarned.add(fieldKey);
      // eslint-disable-next-line no-console
      console.warn(
        `[SpecField] field "${fieldKey}" has visibleWhen but no formValues prop was passed. ` +
          `Field will render by default. Pass formValues to gate visibility.`,
      );
    }
  }

  const baseLabel = getFieldLabel(field, surface);
  // A2 (D-158): red asterisk on required-owner fields, owner_form only. Admin +
  // public branches never render the mark. Emitted as a JSX node so the span
  // carries `text-destructive`; the plain-text `label` string stays untouched.
  const isRequiredHere = surface === "owner_form" && !!field.requiredOwner;
  const label: React.ReactNode = isRequiredHere ? (
    <>
      {baseLabel}
      <span className="text-destructive ml-0.5" aria-hidden="true">*</span>
    </>
  ) : baseLabel;
  const helper = helperOverride ?? field.helper;
  const placeholder = placeholderOverride ?? field.placeholder;

  // Read-only branch — used by Prompt 5 (public_detail) end-to-end and by
  // owner/admin surfaces for Tier-1 fields on listed properties.
  if (readOnly) {
    // Date fields (D-168): format as "dd MMM yyyy" for readable display,
    // overriding spec `display()` which stores raw ISO string. Falls back to
    // formatFieldValue's em-dash for null/empty.
    const dateFormatted =
      field.input === "date"
        ? (() => {
            const d = coerceDate(value);
            return d ? format(d, "dd MMM yyyy") : formatFieldValue(field, value);
          })()
        : null;
    const displayText = dateFormatted ?? formatFieldValue(field, value);
    if (surface === "public_detail") {
      // Public details grid row — DOM must match PropertyDetail's pre-refactor
      // scalar-row markup exactly (D-157 visual-parity requirement).
      const icon = field.displayIcon ? PUBLIC_ICON_REGISTRY[field.displayIcon] : null;
      // Use raw public label (no ' *' suffix — public surface has no required marks).
      const publicLabel = getFieldLabel(field, surface);
      return (
        <div className={cn("flex items-start gap-2.5 rounded-lg border border-border bg-card p-3", className)}>
          {icon && <span className="mt-0.5 text-muted-foreground">{icon}</span>}
          <div>
            <p className="text-[11px] text-muted-foreground">{publicLabel}</p>
            <p className="text-sm font-medium text-foreground">{displayText}</p>
          </div>
        </div>
      );
    }
    return (
      <Shell label={label} helper={helper} className={className}>
        <p className="min-h-[44px] rounded-md border border-input bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          {displayText}
        </p>
      </Shell>
    );
  }

  const emit = (next: unknown) => onChange?.(next as T);

  switch (field.input) {
    case "text": {
      // Text inputs already honour field.maxLength; override just adds owner caps.
      const effectiveMaxLength = maxLengthOverride ?? field.maxLength;
      const len = ((value as string | undefined) ?? "").length;
      return (
        <Shell label={label} helper={helper} className={className}>
          <Input
            id={inputId}
            value={(value as string | undefined) ?? ""}
            onChange={(e) => emit(e.target.value)}
            onBlur={onBlur}
            placeholder={placeholder}
            maxLength={effectiveMaxLength}
            aria-invalid={error ? true : undefined}
            aria-describedby={error && inputId ? `${inputId}-error` : undefined}
            className={cn("min-h-[44px]", error && "border-destructive focus-visible:ring-destructive/30")}
          />
          {showCounter && effectiveMaxLength != null && (
            <p className="text-xs text-muted-foreground text-right">{len} / {effectiveMaxLength}</p>
          )}
          {error && (
            <p id={inputId ? `${inputId}-error` : undefined} className="text-sm text-destructive">
              {error}
            </p>
          )}
          {children}
        </Shell>
      );
    }
    case "textarea": {
      // Textarea has NO spec-driven maxLength (would restrict admin) — cap comes
      // solely from maxLengthOverride.
      const effectiveMaxLength = maxLengthOverride;
      const len = ((value as string | undefined) ?? "").length;
      return (
        <Shell label={label} helper={helper} className={className}>
          <Textarea
            value={(value as string | undefined) ?? ""}
            onChange={(e) => emit(e.target.value)}
            onBlur={onBlur}
            placeholder={placeholder}
            maxLength={effectiveMaxLength}
            rows={3}
          />
          {showCounter && effectiveMaxLength != null && (
            <p className="text-xs text-muted-foreground text-right">{len} / {effectiveMaxLength}</p>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          {children}
        </Shell>
      );
    }
    case "number": {
      return (
        <Shell label={label} helper={helper} className={className}>
          <Input
            type="number"
            value={(value as string | number | undefined) ?? ""}
            onChange={(e) => emit(e.target.value)}
            placeholder={placeholder}
            min={field.min}
            max={field.max}
            className="min-h-[44px]"
          />
          {children}
        </Shell>
      );
    }
    case "select": {
      const options = field.options ?? [];
      return (
        <Shell label={label} helper={helper} className={className}>
          <Select value={(value as string | undefined) ?? ""} onValueChange={(v) => emit(v)}>
            <SelectTrigger className="min-h-[44px]">
              <SelectValue placeholder={placeholder ?? "Select"} />
            </SelectTrigger>
            <SelectContent>
              {options.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {children}
        </Shell>
      );
    }
    case "switch": {
      // Switch has its own inline layout (label left, switch right); Shell doesn't fit.
      return (
        <div className={cn("flex items-center justify-between rounded-lg border p-3", className)}>
          <div>
            <Label className="text-sm font-medium">{label}</Label>
            {helper && <p className="text-xs text-muted-foreground">{helper}</p>}
          </div>
          <Switch checked={!!value} onCheckedChange={(v) => emit(v)} />
        </div>
      );
    }
    case "date": {
      // D-168: shared Popover+Calendar. Options come from spec.datePickerOptions.
      // Emits ISO yyyy-MM-dd on selection; null on clear (Calendar doesn't currently
      // clear, but the type allows it). Callers coerce to their local Date state.
      const opts = field.datePickerOptions ?? {};
      const selected = coerceDate(value);
      const cap = typeof opts.maxDaysFromNow === "number" ? (() => {
        const c = new Date();
        c.setHours(0, 0, 0, 0);
        c.setDate(c.getDate() + opts.maxDaysFromNow!);
        return c;
      })() : null;
      const showWarn = !!opts.warnOnPast && !!selected && isPastDate(selected);
      return (
        <Shell label={label} helper={helper} className={className}>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full min-h-[44px] justify-start text-left font-normal",
                  !selected && "text-muted-foreground",
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selected ? format(selected, "PPP") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selected}
                onSelect={(d) => emit(d ? format(d, "yyyy-MM-dd") : null)}
                disabled={(date) => {
                  if (date < new Date("1900-01-01")) return true;
                  if (cap && date > cap) return true;
                  return false;
                }}
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
          {showWarn && (
            <p className="text-xs text-amber-600 mt-1">{opts.warnOnPast}</p>
          )}
          {children}
        </Shell>
      );
    }
    // multiselect / checkbox / radio / json — intentionally not handled.
    // Caller renders bespoke JSX for these; adding here fragments the contract.
    default:
      return null;
  }
}
