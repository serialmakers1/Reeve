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

import { X } from "lucide-react";
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
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
  images: PreviewImage[];
  youtube_walkthrough_url: string;
  // Prompt 9 additions
  listing_type: string;
  lister_role?: string;
  landmark?: string;
  floor_number?: string;
  total_floors?: string;
  super_built_up_area?: string;
  building_age_years?: string;
  lock_in_months?: string;
  notice_period_days?: string;
  notice_period_months?: string;
  annual_rent_increase_pct?: string;
  move_in_charges_amount?: string;
  rent_brokerage_fixed_amount?: string;
  sale_price?: string;
  price_negotiable?: boolean;
  expected_price_per_sqft?: string;
  possession_status?: string;
  possession_date?: string;
  rera_registration_number?: string;
  sale_brokerage_pct?: string;
  khata_type?: string;
  parking_2w_count?: string;
  parking_4w_count?: string;
  parking_notes?: string;
  water_storage?: string;
  water_source?: string[];
  main_door_lock_type?: string;
  pet_policy_text?: string;
  formatted_address?: string;
  lister_flat_number?: string;
  location_verified_by_owner?: boolean;
  streetview_show_in_listing?: boolean;
  property_tax_paid_upto?: string;
}

const labelForValue = (opts: readonly { value: string; label: string }[], value: string) =>
  opts.find((o) => o.value === value)?.label ?? value;

function formatRupees(n: string): string {
  const num = Number(n);
  if (!num || Number.isNaN(num)) return "—";
  return "₹" + num.toLocaleString("en-IN");
}

type Dot = "green" | "amber" | "red";
const DOT_CLASS: Record<Dot, string> = {
  green: "bg-green-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
};
function noticeGrade(days: number): Dot {
  if (days > 60) return "red";
  if (days > 30) return "amber";
  return "green";
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: PropertyPreviewData;
  isFirstSubmit?: boolean;
}

export default function PropertyPreview({ open, onOpenChange, data, isFirstSubmit }: Props) {
  const primaryImage =
    data.images.find((i) => i.is_primary) ??
    data.images.find((i) => (i.section ?? "").toLowerCase() !== "floor plan") ??
    data.images[0];
  const gallery = data.images.filter((i) => i.id !== primaryImage?.id).slice(0, 5);
  const bhkLabel = labelForValue(BHK_OPTIONS as unknown as { value: string; label: string }[], data.bhk);
  const furnishingLabel = labelForValue(FURNISHING_OPTIONS as unknown as { value: string; label: string }[], data.furnishing);
  const propertyTypeLabel = labelForValue(PROPERTY_TYPE_OPTIONS as unknown as { value: string; label: string }[], data.property_type);
  const derivedTitle = `${bhkLabel} in ${data.locality || data.city || "your neighborhood"}`;
  const isSale = data.listing_type === "sale";

  // Rent terms — coerce string form values to numbers for color logic
  const lockN = Number(data.lock_in_months);
  const noticeN = Number(data.notice_period_days);
  const hikeN = Number(data.annual_rent_increase_pct);
  const moveinN = Number(data.move_in_charges_amount);
  const brokerAmt = data.rent_brokerage_fixed_amount !== undefined && data.rent_brokerage_fixed_amount !== ""
    ? Number(data.rent_brokerage_fixed_amount)
    : null;
  const hasRentTerms = !isSale && (
    !!data.lock_in_months || !!data.notice_period_days || !!data.annual_rent_increase_pct ||
    (!!data.move_in_charges_amount && moveinN > 0) || brokerAmt !== null
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="sticky top-0 z-10 bg-background border-b px-6 py-3">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-sm text-muted-foreground font-normal">
              Preview — how tenants will see your listing
            </DialogTitle>
            <DialogClose asChild>
              <button className="rounded-sm opacity-70 hover:opacity-100 focus:outline-none" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </DialogClose>
          </div>
        </DialogHeader>

        {isFirstSubmit && (
          <div className="border-b bg-amber-50 px-6 py-2.5 text-sm text-amber-800">
            ⚠ After submission, address, BHK, and property type cannot be edited.
            Contact support to make changes later.
          </div>
        )}

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
            {data.landmark && (
              <p className="text-sm text-muted-foreground mt-0.5">Near: {data.landmark}</p>
            )}
            {data.formatted_address && (
              <p className="text-sm text-muted-foreground mt-0.5">{data.formatted_address}</p>
            )}
            {data.lister_flat_number && (
              <p className="text-sm text-muted-foreground mt-0.5">Unit: {data.lister_flat_number}</p>
            )}
            {(data.location_verified_by_owner || data.streetview_show_in_listing) && (
              <div className="flex flex-wrap gap-1.5 mt-1">
                {data.location_verified_by_owner && (
                  <span className="rounded-full bg-green-100 text-green-800 text-[10px] px-2 py-0.5 font-medium">Location verified</span>
                )}
                {data.streetview_show_in_listing && (
                  <span className="rounded-full bg-blue-100 text-blue-800 text-[10px] px-2 py-0.5 font-medium">Street View enabled</span>
                )}
              </div>
            )}
          </div>

          {/* Key stats */}
          <div className="flex flex-wrap gap-3 text-sm">
            {data.bhk && <StatChip label={bhkLabel} />}
            {data.property_type && <StatChip label={propertyTypeLabel} />}
            {data.square_footage && <StatChip label={`${data.square_footage} sqft`} />}
            {data.super_built_up_area && <StatChip label={`${data.super_built_up_area} sqft SBA`} />}
            {data.furnishing && <StatChip label={furnishingLabel} />}
            {data.bathrooms && <StatChip label={`${data.bathrooms} bath`} />}
            {data.balconies && <StatChip label={`${data.balconies} balcony`} />}
            {data.facing && <StatChip label={`${data.facing} facing`} />}
            {data.floor_number && (
              <StatChip label={`Floor ${data.floor_number}${data.total_floors ? `/${data.total_floors}` : ""}`} />
            )}
            {data.building_age_years && <StatChip label={`${data.building_age_years}yr old building`} />}
            {data.lister_role && (
              <StatChip
                label={
                  data.lister_role === "broker"
                    ? "Via broker"
                    : data.lister_role === "builder"
                    ? "Builder listing"
                    : data.lister_role === "property_manager"
                    ? "Property Manager"
                    : "Owner"
                }
              />
            )}
          </div>

          {/* Price block — listing_type aware */}
          {isSale ? (
            <div className="rounded-lg border p-4 space-y-1.5">
              <p className="text-2xl font-bold text-foreground">
                {data.sale_price ? formatRupees(data.sale_price) : "—"}
              </p>
              {data.expected_price_per_sqft && (
                <p className="text-sm text-muted-foreground">₹{data.expected_price_per_sqft}/sqft</p>
              )}
              {data.price_negotiable !== undefined && (
                <p className="text-sm text-muted-foreground">
                  Price {data.price_negotiable ? "negotiable" : "not negotiable"}
                </p>
              )}
            </div>
          ) : (
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
          )}

          {/* No Surprises — rent terms */}
          {hasRentTerms && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-2">
              <p className="text-sm font-semibold text-foreground">No Surprises</p>
              <ul className="space-y-1.5">
                {data.lock_in_months && (
                  <li className="flex items-center gap-3 text-sm">
                    <span className={cn("h-2.5 w-2.5 rounded-full shrink-0",
                      DOT_CLASS[lockN > 8 ? "red" : lockN > 4 ? "amber" : "green"])} />
                    <span className="flex-1 text-muted-foreground">Lock-in</span>
                    <span className="font-medium">{lockN === 0 ? "No lock-in" : `${lockN} months`}</span>
                  </li>
                )}
                {data.notice_period_days && (
                  <li className="flex items-center gap-3 text-sm">
                    <span className={cn("h-2.5 w-2.5 rounded-full shrink-0",
                      DOT_CLASS[noticeN === 0 ? "green" : noticeGrade(noticeN)])} />
                    <span className="flex-1 text-muted-foreground">Notice Period</span>
                    <span className="font-medium">{noticeN === 0 ? "No notice required" : `${noticeN} days`}</span>
                  </li>
                )}
                {data.annual_rent_increase_pct && (
                  <li className="flex items-center gap-3 text-sm">
                    <span className={cn("h-2.5 w-2.5 rounded-full shrink-0",
                      DOT_CLASS[hikeN > 10 ? "red" : hikeN > 5 ? "amber" : "green"])} />
                    <span className="flex-1 text-muted-foreground">Annual Rent Increase</span>
                    <span className="font-medium">{hikeN === 0 ? "No annual increase" : `${hikeN}%`}</span>
                  </li>
                )}
                {!!data.move_in_charges_amount && moveinN > 0 && (
                  <li className="flex items-center gap-3 text-sm">
                    <span className={cn("h-2.5 w-2.5 rounded-full shrink-0",
                      DOT_CLASS[moveinN > 4000 ? "red" : moveinN >= 2000 ? "amber" : "green"])} />
                    <span className="flex-1 text-muted-foreground">Move-in Charges</span>
                    <span className="font-medium">₹{moveinN.toLocaleString("en-IN")}</span>
                  </li>
                )}
                {brokerAmt !== null && (
                  <li className="flex items-center gap-3 text-sm">
                    <span className={cn("h-2.5 w-2.5 rounded-full shrink-0",
                      DOT_CLASS[brokerAmt === 0 ? "green"
                        : (Number(data.listed_rent) > 0 && brokerAmt / Number(data.listed_rent) > 1) ? "red"
                        : "amber"])} />
                    <span className="flex-1 text-muted-foreground">Brokerage</span>
                    <span className="font-medium">
                      {brokerAmt === 0 ? "Zero brokerage" : `₹${brokerAmt.toLocaleString("en-IN")}`}
                    </span>
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* Sale terms */}
          {isSale && (data.possession_status || data.rera_registration_number || data.sale_brokerage_pct || data.khata_type) && (
            <div className="rounded-lg border p-4 space-y-1.5">
              <p className="text-sm font-semibold text-foreground">Sale Details</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                {data.possession_status && (
                  <li>
                    Possession: {data.possession_status.replace(/_/g, " ")}
                    {data.possession_date ? ` · ${data.possession_date}` : ""}
                  </li>
                )}
                {data.rera_registration_number && <li>RERA: {data.rera_registration_number}</li>}
                {data.khata_type && <li>Khata type: {data.khata_type}</li>}
                {data.sale_brokerage_pct && <li>Brokerage: {data.sale_brokerage_pct}%</li>}
              </ul>
            </div>
          )}

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
              {data.parking_2w_count && <li>2-wheeler slots: {data.parking_2w_count}</li>}
              {data.parking_4w_count && <li>4-wheeler slots: {data.parking_4w_count}</li>}
              {data.parking_notes && <li>Parking notes: {data.parking_notes}</li>}
              {data.water_storage && <li>Water storage: {data.water_storage}</li>}
              {data.water_source && data.water_source.length > 0 && (
                <li>Water source: {data.water_source.join(", ")}</li>
              )}
              {data.main_door_lock_type && <li>Main door lock: {data.main_door_lock_type}</li>}
            </ul>
          </div>

          {/* Rules */}
          {(data.pet_policy || data.pet_policy_text || data.house_rules) && (
            <div>
              <h2 className="text-sm font-semibold text-foreground mb-2">House rules</h2>
              {data.pet_policy && <p className="text-sm text-muted-foreground">Pets: {data.pet_policy}</p>}
              {data.pet_policy_text && (
                <p className="text-sm text-muted-foreground mt-0.5">{data.pet_policy_text}</p>
              )}
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

          {/* Links */}
          {data.youtube_walkthrough_url && (
            <div className="flex flex-wrap gap-3 text-sm">
              <a href={data.youtube_walkthrough_url} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                Video walkthrough →
              </a>
            </div>
          )}

          {data.property_tax_paid_upto && (
            <div>
              <p className="text-xs text-muted-foreground">Property tax paid upto</p>
              <p className="text-sm">{data.property_tax_paid_upto}</p>
            </div>
          )}

          <div className="pt-2 border-t">
            <button
              onClick={() => onOpenChange(false)}
              className="text-sm text-muted-foreground hover:text-foreground underline"
            >
              ← Back to form
            </button>
          </div>
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
