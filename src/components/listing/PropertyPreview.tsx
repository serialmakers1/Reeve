/**
 * PropertyPreview — lightweight tenant-view modal for the owner listing form.
 *
 * Renders the current in-memory form state as it would appear on the public
 * property page. Not a wrapper around PropertyDetail — that page has too many
 * DB dependencies and CTAs the preview must strip. Instead we render a plain
 * layout with the same information hierarchy.
 *
 * Per D-112: reads from PROPS (current form state), never from the DB.
 */

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  FURNISHING_OPTIONS,
  BHK_OPTIONS,
  PROPERTY_TYPE_OPTIONS,
  BUILDING_AMENITIES,
  FURNISHING_ITEM_OPTIONS,
  type FurnishingDetailItem,
} from "@/config/property-form";

export interface PreviewImage {
  id: string;
  url: string;
  is_primary: boolean;
  section: string | null;
}

export interface PropertyPreviewData {
  building_name: string;
  locality: string;
  city: string;
  state: string;
  pincode: string;
  bhk: string;
  property_type: string;
  square_footage: string;
  furnishing: string;
  bathrooms: string;
  balconies: string;
  facing: string;
  listed_rent: string;
  security_deposit_amount: string;
  society_maintenance_approx: string;
  maintenance_included: boolean;
  available_from: string;
  furnishing_detail: FurnishingDetailItem[];
  building_amenities: string[];
  custom_amenities: string[];
  parking_2w: string;
  parking_4w: string;
  water_included: boolean;
  gas_included: boolean;
  gas_type: string;
  electricity_included: boolean;
  pet_policy: string;
  house_rules: string;
  building_notes: string;
  title: string;
  description: string;
  images: PreviewImage[];
  youtube_walkthrough_url: string;
  google_maps_url: string;
}

const labelForValue = (opts: readonly { value: string; label: string }[], value: string) =>
  opts.find((o) => o.value === value)?.label ?? value;

function formatRupees(n: string): string {
  const num = Number(n);
  if (!num || Number.isNaN(num)) return "—";
  return "₹" + num.toLocaleString("en-IN");
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: PropertyPreviewData;
}

export default function PropertyPreview({ open, onOpenChange, data }: Props) {
  const primaryImage =
    data.images.find((i) => i.is_primary) ??
    data.images.find((i) => (i.section ?? "").toLowerCase() !== "floor plan") ??
    data.images[0];
  const gallery = data.images.filter((i) => i.id !== primaryImage?.id).slice(0, 5);
  const bhkLabel = labelForValue(BHK_OPTIONS as unknown as { value: string; label: string }[], data.bhk);
  const furnishingLabel = labelForValue(FURNISHING_OPTIONS as unknown as { value: string; label: string }[], data.furnishing);
  const propertyTypeLabel = labelForValue(PROPERTY_TYPE_OPTIONS as unknown as { value: string; label: string }[], data.property_type);
  const derivedTitle = data.title.trim() || `${bhkLabel} in ${data.locality || data.city || "your neighborhood"}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="sticky top-0 z-10 bg-background border-b px-6 py-3">
          <DialogTitle className="text-sm text-muted-foreground font-normal">
            Preview — how tenants will see your listing
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 space-y-6">
          {/* Photos */}
          {primaryImage ? (
            <div className="space-y-2">
              <img
                src={primaryImage.url}
                alt="Primary"
                className="w-full h-64 object-cover rounded-lg"
              />
              {gallery.length > 0 && (
                <div className="grid grid-cols-5 gap-2">
                  {gallery.map((img) => (
                    <img
                      key={img.id}
                      src={img.url}
                      alt=""
                      className="w-full h-16 object-cover rounded"
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="w-full h-64 bg-muted rounded-lg flex items-center justify-center text-sm text-muted-foreground">
              Photos will appear here
            </div>
          )}

          {/* Title + location */}
          <div>
            <h1 className="text-xl font-bold text-foreground">{derivedTitle}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {[data.locality, data.city, data.state].filter(Boolean).join(", ")}
              {data.pincode ? ` · ${data.pincode}` : ""}
            </p>
          </div>

          {/* Key stats */}
          <div className="flex flex-wrap gap-3 text-sm">
            {data.bhk && <StatChip label={bhkLabel} />}
            {data.property_type && <StatChip label={propertyTypeLabel} />}
            {data.square_footage && <StatChip label={`${data.square_footage} sqft`} />}
            {data.furnishing && <StatChip label={furnishingLabel} />}
            {data.bathrooms && <StatChip label={`${data.bathrooms} bath`} />}
            {data.balconies && <StatChip label={`${data.balconies} balcony`} />}
            {data.facing && <StatChip label={`${data.facing} facing`} />}
          </div>

          {/* Rent */}
          <div className="rounded-lg border p-4 space-y-1.5">
            <div className="flex items-baseline justify-between">
              <p className="text-2xl font-bold text-foreground">
                {formatRupees(data.listed_rent)}
                <span className="text-sm font-normal text-muted-foreground">/mo</span>
              </p>
              {data.available_from && (
                <p className="text-xs text-muted-foreground">
                  From {data.available_from}
                </p>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Security deposit: {formatRupees(data.security_deposit_amount)}
            </p>
            {data.society_maintenance_approx && (
              <p className="text-sm text-muted-foreground">
                Maintenance: {formatRupees(data.society_maintenance_approx)}
                {data.maintenance_included ? " (included)" : ""}
              </p>
            )}
          </div>

          {/* Amenities */}
          {(data.building_amenities.length > 0 || data.custom_amenities.length > 0) && (
            <div>
              <h2 className="text-sm font-semibold text-foreground mb-2">Amenities</h2>
              <div className="flex flex-wrap gap-2">
                {data.building_amenities.map((a) => (
                  <span key={a} className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs text-gray-700">
                    {labelForValue(BUILDING_AMENITIES as unknown as { value: string; label: string }[], a)}
                  </span>
                ))}
                {data.custom_amenities.map((a) => (
                  <span key={`c-${a}`} className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs text-gray-700">
                    {a}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Furnishing detail */}
          {data.furnishing_detail.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-foreground mb-2">Included furnishing</h2>
              <ul className="text-sm text-muted-foreground space-y-1">
                {data.furnishing_detail.map((f, i) => {
                  const label = f.custom
                    ? f.item
                    : labelForValue(FURNISHING_ITEM_OPTIONS as unknown as { value: string; label: string }[], f.item);
                  return (
                    <li key={`${f.item}-${i}`}>
                      {label}
                      {f.count && f.count > 1 ? ` × ${f.count}` : ""}
                      {f.size ? ` (${f.size})` : ""}
                      {f.rooms ? ` — ${f.rooms}` : ""}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Utilities & parking */}
          <div>
            <h2 className="text-sm font-semibold text-foreground mb-2">Utilities & parking</h2>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>Water: {data.water_included ? "Included" : "Extra"}</li>
              <li>
                Gas: {data.gas_included ? `Included${data.gas_type ? ` (${data.gas_type})` : ""}` : "Extra"}
              </li>
              <li>Electricity: {data.electricity_included ? "Included" : "Extra"}</li>
              <li>2-wheeler parking: {labelForValue(BUILDING_AMENITIES as unknown as { value: string; label: string }[], data.parking_2w) || data.parking_2w || "—"}</li>
              <li>4-wheeler parking: {data.parking_4w || "—"}</li>
            </ul>
          </div>

          {/* Rules */}
          {(data.pet_policy || data.house_rules) && (
            <div>
              <h2 className="text-sm font-semibold text-foreground mb-2">House rules</h2>
              {data.pet_policy && <p className="text-sm text-muted-foreground">Pets: {data.pet_policy}</p>}
              {data.house_rules && <p className="text-sm text-muted-foreground whitespace-pre-line mt-1">{data.house_rules}</p>}
            </div>
          )}

          {/* About the building */}
          {data.building_notes && (
            <div>
              <h2 className="text-sm font-semibold text-foreground mb-2">About the building</h2>
              <p className="text-sm text-muted-foreground whitespace-pre-line">{data.building_notes}</p>
            </div>
          )}

          {/* Description */}
          {data.description && (
            <div>
              <h2 className="text-sm font-semibold text-foreground mb-2">About this home</h2>
              <p className="text-sm text-muted-foreground whitespace-pre-line">{data.description}</p>
            </div>
          )}

          {/* Links */}
          {(data.youtube_walkthrough_url || data.google_maps_url) && (
            <div className="flex flex-wrap gap-3 text-sm">
              {data.youtube_walkthrough_url && (
                <a href={data.youtube_walkthrough_url} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                  Video walkthrough →
                </a>
              )}
              {data.google_maps_url && (
                <a href={data.google_maps_url} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                  Location on Google Maps →
                </a>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StatChip({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-700">
      {label}
    </span>
  );
}
