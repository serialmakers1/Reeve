import { ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { REPORT_TYPE_META, REPORT_TYPES } from "@/lib/inspection-report/types";
import type { InspectionRecord, InspectionType } from "@/types/inspection";

interface Props {
  inspection: InspectionRecord;
  updateInspectionField: (field: keyof InspectionRecord, value: unknown) => void;
  /** Fired when the BHK field loses focus, so the form can auto-generate default rooms. */
  onBhkBlur: () => void;
}

/** A labelled text/date/email/tel/url field bound to an inspection column. */
function TextField({
  id,
  label,
  value,
  onChange,
  onBlur,
  type = "text",
  inputMode,
  placeholder,
  className,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: (v: string) => void;
  type?: string;
  inputMode?: "text" | "numeric" | "tel" | "email" | "url";
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        inputMode={inputMode}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur ? (e) => onBlur(e.target.value) : undefined}
      />
    </div>
  );
}

export function InspectionDetailsCard({ inspection, updateInspectionField, onBhkBlur }: Props) {
  // Integer-only, non-negative normalization for smallint columns.
  const setIntField = (field: keyof InspectionRecord, raw: string) => {
    if (raw.trim() === "") {
      updateInspectionField(field, null);
      return;
    }
    const n = Number(raw);
    if (Number.isInteger(n) && n >= 0) {
      updateInspectionField(field, n);
    }
    // Non-integer / negative / NaN: do not persist a bad value.
  };

  const mapsUrl = inspection.google_maps_url ?? "";
  const showMapLink = /^https?:\/\//i.test(mapsUrl.trim());

  return (
    <Card className="inspection-card">
      <CardHeader>
        <CardTitle>Inspection Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* ── Inspection ── */}
        <section className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground">Inspection</h3>
          <div className="space-y-3">
            <Label>Inspection Type</Label>
            <RadioGroup
              value={inspection.inspection_type ?? undefined}
              onValueChange={(v) => updateInspectionField("inspection_type", v as InspectionType)}
              className="grid grid-cols-1 gap-2 sm:grid-cols-2"
            >
              {REPORT_TYPES.map((type) => {
                const meta = REPORT_TYPE_META[type];
                const selected = inspection.inspection_type === type;
                return (
                  <label
                    key={type}
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm",
                      selected
                        ? "border-primary bg-accent text-accent-foreground"
                        : "border-border bg-background hover:bg-accent/40",
                    )}
                  >
                    <RadioGroupItem value={type} className="mt-0.5 shrink-0" />
                    <span className="min-w-0">
                      <span className="font-semibold">
                        <span className="text-primary">{type}</span> — {meta.title}
                      </span>
                    </span>
                  </label>
                );
              })}
            </RadioGroup>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <TextField
              id="inspection_date"
              label="Inspection Date"
              type="date"
              value={inspection.inspection_date ?? ""}
              onChange={(v) => updateInspectionField("inspection_date", v || null)}
              onBlur={(v) => updateInspectionField("inspection_date", v || null)}
            />
          </div>
        </section>

        {/* ── Property ── */}
        <section className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground">Property</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <TextField
              id="building_name"
              label="Building / Property Name"
              value={inspection.building_name ?? ""}
              onChange={(v) => updateInspectionField("building_name", v)}
              onBlur={(v) => updateInspectionField("building_name", v)}
            />
            <TextField
              id="flat_number"
              label="Flat / Unit Number"
              value={inspection.flat_number ?? ""}
              onChange={(v) => updateInspectionField("flat_number", v)}
              onBlur={(v) => updateInspectionField("flat_number", v)}
            />
            <TextField
              id="full_address"
              label="Full Address"
              className="sm:col-span-2 xl:col-span-3"
              value={inspection.full_address ?? ""}
              onChange={(v) => updateInspectionField("full_address", v)}
              onBlur={(v) => updateInspectionField("full_address", v)}
            />
            <TextField
              id="locality"
              label="Locality / Area"
              value={inspection.locality ?? ""}
              onChange={(v) => updateInspectionField("locality", v)}
              onBlur={(v) => updateInspectionField("locality", v)}
            />
            <TextField
              id="city"
              label="City"
              value={inspection.city ?? ""}
              onChange={(v) => updateInspectionField("city", v)}
              onBlur={(v) => updateInspectionField("city", v)}
            />
            <TextField
              id="pincode"
              label="Pincode"
              inputMode="numeric"
              value={inspection.pincode ?? ""}
              onChange={(v) => updateInspectionField("pincode", v)}
              onBlur={(v) => updateInspectionField("pincode", v)}
            />
            <TextField
              id="floor"
              label="Floor"
              value={inspection.floor ?? ""}
              onChange={(v) => updateInspectionField("floor", v)}
              onBlur={(v) => updateInspectionField("floor", v)}
            />
            <div className="space-y-1.5">
              <Label htmlFor="bhk">BHK</Label>
              <Input
                id="bhk"
                value={inspection.bhk ?? ""}
                placeholder="e.g. 2BHK"
                onChange={(e) => updateInspectionField("bhk", e.target.value)}
                onBlur={(e) => {
                  updateInspectionField("bhk", e.target.value);
                  onBhkBlur();
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bathrooms">Bathrooms</Label>
              <Input
                id="bathrooms"
                type="number"
                min={0}
                step={1}
                value={inspection.bathrooms ?? ""}
                onChange={(e) => setIntField("bathrooms", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="balconies">Balconies</Label>
              <Input
                id="balconies"
                type="number"
                min={0}
                step={1}
                value={inspection.balconies ?? ""}
                onChange={(e) => setIntField("balconies", e.target.value)}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2 xl:col-span-3">
              <Label htmlFor="google_maps_url">Google Maps URL</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="google_maps_url"
                  type="url"
                  inputMode="url"
                  placeholder="https://maps.google.com/..."
                  value={mapsUrl}
                  onChange={(e) => updateInspectionField("google_maps_url", e.target.value)}
                  onBlur={(e) => updateInspectionField("google_maps_url", e.target.value)}
                />
                {showMapLink && (
                  <a
                    href={mapsUrl.trim()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open
                  </a>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ── Owner (admin only) ── */}
        <section className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground">Owner</h3>
            <p className="text-xs text-muted-foreground">
              Admin only. Owner name may appear in reports; contact details never do.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <TextField
              id="owner_name"
              label="Owner Name"
              value={inspection.owner_name ?? ""}
              onChange={(v) => updateInspectionField("owner_name", v)}
              onBlur={(v) => updateInspectionField("owner_name", v)}
            />
            <TextField
              id="owner_phone"
              label="Phone"
              type="tel"
              inputMode="tel"
              value={inspection.owner_phone ?? ""}
              onChange={(v) => updateInspectionField("owner_phone", v)}
              onBlur={(v) => updateInspectionField("owner_phone", v)}
            />
            <TextField
              id="owner_alternate_phone"
              label="Alternate Phone"
              type="tel"
              inputMode="tel"
              value={inspection.owner_alternate_phone ?? ""}
              onChange={(v) => updateInspectionField("owner_alternate_phone", v)}
              onBlur={(v) => updateInspectionField("owner_alternate_phone", v)}
            />
            <TextField
              id="owner_email"
              label="Email"
              type="email"
              inputMode="email"
              value={inspection.owner_email ?? ""}
              onChange={(v) => updateInspectionField("owner_email", v)}
              onBlur={(v) => updateInspectionField("owner_email", v)}
            />
          </div>
        </section>

        {/* ── Tenant (admin only) ── */}
        <section className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground">Tenant</h3>
            <p className="text-xs text-muted-foreground">
              Admin only. Tenant details are never shown in reports.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <TextField
              id="tenant_name"
              label="Tenant Name"
              value={inspection.tenant_name ?? ""}
              onChange={(v) => updateInspectionField("tenant_name", v)}
              onBlur={(v) => updateInspectionField("tenant_name", v)}
            />
            <TextField
              id="tenant_phone"
              label="Phone"
              type="tel"
              inputMode="tel"
              value={inspection.tenant_phone ?? ""}
              onChange={(v) => updateInspectionField("tenant_phone", v)}
              onBlur={(v) => updateInspectionField("tenant_phone", v)}
            />
            <TextField
              id="tenant_alternate_phone"
              label="Alternate Phone"
              type="tel"
              inputMode="tel"
              value={inspection.tenant_alternate_phone ?? ""}
              onChange={(v) => updateInspectionField("tenant_alternate_phone", v)}
              onBlur={(v) => updateInspectionField("tenant_alternate_phone", v)}
            />
            <TextField
              id="tenant_email"
              label="Email"
              type="email"
              inputMode="email"
              value={inspection.tenant_email ?? ""}
              onChange={(v) => updateInspectionField("tenant_email", v)}
              onBlur={(v) => updateInspectionField("tenant_email", v)}
            />
          </div>
        </section>
      </CardContent>
    </Card>
  );
}
