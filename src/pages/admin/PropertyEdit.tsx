import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import AdminLayout from "@/components/admin/AdminLayout";
import { SpecField } from "@/components/property/SpecField";
import { ensurePrimaryPhoto } from "@/lib/property-images";
import { supabase } from "@/integrations/supabase/client";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ArrowLeft, ExternalLink, RefreshCw } from "lucide-react";
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import { AdminLocationPanel } from '@/components/property-address/AdminLocationPanel';
import { updateBuildingName, LOCATION_ERROR_COPY } from '@/lib/location/confirmLocationClient';
import { useAuth } from '@/hooks/useAuth';
import { Separator } from '@/components/ui/separator';

// D-170: FurnishingDetailItem type + FURNISHING_ITEM_OPTIONS moved to shared modules.
import { type FurnishingDetailItem, buildAmenitiesJson } from "@/types/property";
import { WATER_SOURCE_OPTIONS } from "@/config/property-form";
import { computeDepositMonths } from "@/utils/property/financialConversions";
import { FurnishingEditor } from "@/components/property/FurnishingEditor";
import { AmenitiesEditor } from "@/components/property/AmenitiesEditor";
import { extractPendingConflictKeys } from "@/lib/pendingEditConflicts";
import { deriveConflictFieldResets } from "@/lib/adminConflictReset";

// D-170: FURNISHING_ITEMS + BUILDING_AMENITIES admin-local copies removed —
// shared editors import from @/config/property-form directly.

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  draft: { label: "Draft", variant: "outline" },
  pending_review: { label: "Pending Review", variant: "secondary" },
  changes_requested: { label: "Changes Requested", variant: "destructive" },
  listed: { label: "Listed", variant: "default" },
  edit_pending_review: { label: "Edit Pending Review", variant: "secondary" },
  unlisted: { label: "Unlisted", variant: "outline" },
  archived: { label: "Archived", variant: "outline" },
};

type PropertyData = Record<string, unknown>;

/** Amber note shown on a field/editor that has a pending owner-reviewed change (Prompt 3). */
function ConflictNote({ editId }: { editId: string | null }) {
  return (
    <p className="mt-1 text-xs text-amber-700 flex flex-wrap items-center gap-1">
      Owner change pending for this field — resolve the edit first.
      {editId && (
        <Link to={`/admin/listing-reviews/edit/${editId}`} className="underline text-amber-800">
          Review edit →
        </Link>
      )}
    </p>
  );
}

interface PropertyImage {
  id: string;
  url: string;
  caption: string | null;
  is_primary: boolean;
  is_floor_plan: boolean;
  sort_order: number;
  section: string | null;
}

export default function PropertyEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useRequireAuth({ requireAdmin: true });
  const { session } = useAuth();

  // Google Maps libraries — must be at top level (Rules of Hooks)
  const streetViewLib = useMapsLibrary('streetView');

  const [property, setProperty] = useState<PropertyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state — Section 1: Basic Details
  const [buildingName, setBuildingName] = useState("");
  const [bnSaving, setBnSaving] = useState(false);
  const [locality, setLocality] = useState("");
  const [bhk, setBhk] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [floorNumber, setFloorNumber] = useState<string>("");
  const [totalFloors, setTotalFloors] = useState<string>("");
  const [squareFootage, setSquareFootage] = useState<string>("");

  // Section 2: Listing Details
  const [listedRent, setListedRent] = useState<string>("");
  const [societyMaintenance, setSocietyMaintenance] = useState<string>("");
  const [availableFrom, setAvailableFrom] = useState<Date | undefined>();

  // Section 3: Furnishing
  const [furnishing, setFurnishing] = useState("");
  const [furnishingDetail, setFurnishingDetail] = useState<FurnishingDetailItem[]>([]);

  // Section 4: Building Amenities
  const [buildingAmenities, setBuildingAmenities] = useState<string[]>([]);

  // New property columns
  const [bathrooms, setBathrooms] = useState<string>('');
  const [balconies, setBalconies] = useState<string>('');
  const [facing, setFacing] = useState<string>('');
  const [buildingAgeYears, setBuildingAgeYears] = useState<string>('');

  const [youtubeWalkthroughUrl, setYoutubeWalkthroughUrl] = useState("");

  // Section 2: Listing Details extra
  const [maintenanceIncluded, setMaintenanceIncluded] = useState(false);

  // Section 5: Utilities & Policies
  const [waterIncluded, setWaterIncluded] = useState(false);
  const [gasIncluded, setGasIncluded] = useState(false);
  const [gasType, setGasType] = useState<string>("");
  const [electricityIncluded, setElectricityIncluded] = useState(false);
  const [parking2w, setParking2w] = useState("none");
  const [parking4w, setParking4w] = useState("none");
  const [petPolicy, setPetPolicy] = useState("");
  const [buildingRules, setBuildingRules] = useState("");

  // Publish toggle
  const [isActive, setIsActive] = useState(false);

  // Added in Prompt 4 — spec fields previously missing from admin form.
  const [buildingNotes, setBuildingNotes] = useState("");
  const [securityDepositAmount, setSecurityDepositAmount] = useState<string>("");

  // Prompt 8 — India fields (D-159).
  const [landmark, setLandmark] = useState<string>("");
  const [annualRentIncreasePct, setAnnualRentIncreasePct] = useState<string>("");
  const [waterStorage, setWaterStorage] = useState<string>("");
  // F3-C15: lister_role — admin always editable (no lock).
  const [listerRole, setListerRole] = useState<string>("owner");
  const [parking2wCount, setParking2wCount] = useState<string>("");
  const [parking4wCount, setParking4wCount] = useState<string>("");
  const [parkingNotes, setParkingNotes] = useState<string>("");

  // P3 — new property columns.
  const [lockInMonths, setLockInMonths] = useState<string>("");
  const [noticePeriodDays, setNoticePeriodDays] = useState<string>("");
  const [superBuiltUpArea, setSuperBuiltUpArea] = useState<string>("");
  const [waterSource, setWaterSource] = useState<string[]>([]);
  const [mainDoorLockType, setMainDoorLockType] = useState<string>("");

  // Prompt 10b — rent/sale (D-162). Admin can flip listing_type any time (no
  // Tier-1 lock on admin surface — D-111 bypass).
  const [listingType, setListingType] = useState<string>("rent");
  const [salePrice, setSalePrice] = useState<string>("");
  const [priceNegotiable, setPriceNegotiable] = useState<boolean>(false);
  const [expectedPricePerSqft, setExpectedPricePerSqft] = useState<string>("");
  const [possessionStatus, setPossessionStatus] = useState<string>("");
  const [possessionDate, setPossessionDate] = useState<Date | undefined>();
  const [reraRegistrationNumber, setReraRegistrationNumber] = useState<string>("");
  const [khataType, setKhataType] = useState<string>("");
  const [propertyTaxPaidUpto, setPropertyTaxPaidUpto] = useState<Date | undefined>();

  // Phase 1.5 addendum (D-166) — move-in charges + brokerage.
  const [moveInChargesAmount, setMoveInChargesAmount] = useState<string>("");
  // F2-D3: brokerage collapsed to a flat amount; type + months state removed.
  const [rentBrokerageFixedAmount, setRentBrokerageFixedAmount] = useState<string>("");
  const [saleBrokeragePct, setSaleBrokeragePct] = useState<string>("");


  // Google Maps Phase 1 — address fields
  const [placeId, setPlaceId] = useState<string | null>(null);
  const [formattedAddress, setFormattedAddress] = useState<string | null>(null);
  const [addressMode, setAddressMode] = useState<'google_place' | 'manual' | null>(null);
  const [streetNumber, setStreetNumber] = useState<string | null>(null);
  const [routeVal, setRouteVal] = useState<string | null>(null);
  const [sublocality1, setSublocality1] = useState<string | null>(null);
  const [sublocality2, setSublocality2] = useState<string | null>(null);
  const [neighborhood, setNeighborhood] = useState<string | null>(null);
  const [district, setDistrict] = useState<string | null>(null);
  const [country, setCountry] = useState<string | null>(null);
  const [plusCode, setPlusCode] = useState<string | null>(null);
  const [viewportNeLat, setViewportNeLat] = useState<number | null>(null);
  const [viewportNeLng, setViewportNeLng] = useState<number | null>(null);
  const [viewportSwLat, setViewportSwLat] = useState<number | null>(null);
  const [viewportSwLng, setViewportSwLng] = useState<number | null>(null);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [streetviewAvailable, setStreetviewAvailable] = useState<boolean | null>(null);
  const [streetviewPanoId, setStreetviewPanoId] = useState<string | null>(null);
  const [streetviewCheckedAt, setStreetviewCheckedAt] = useState<string | null>(null);
  const [streetviewShowInListing, setStreetviewShowInListing] = useState(false);
  const [locationVerifiedByOwner, setLocationVerifiedByOwner] = useState(false);
  const [locationVerifiedAt, setLocationVerifiedAt] = useState<string | null>(null);
  const [listerFlatNumber, setListerFlatNumber] = useState<string | null>(null);
  const [streetviewChecking, setStreetviewChecking] = useState(false);
  // Durable secondary-city mode (auto|admin) — deterministic init for the admin correction UI.

  // Photos
  const [images, setImages] = useState<PropertyImage[]>([]);
  const [imagesLoading, setImagesLoading] = useState(false);
  const [imagesError, setImagesError] = useState(false);
  const [newSectionName, setNewSectionName] = useState("");
  const [showSectionInput, setShowSectionInput] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<Record<string, boolean>>({});
  const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({});

  // Prompt 3 — pending owner-edit conflict safeguard. Admin stays UNRESTRICTED except
  // for the specific field(s)/editor(s) with a pending owner-reviewed change.
  const [pendingEditId, setPendingEditId] = useState<string | null>(null);
  const [conflictKeys, setConflictKeys] = useState<Set<string>>(new Set());
  const [conflictUnknown, setConflictUnknown] = useState(false); // true = conflict state couldn't be read → block Save

  useEffect(() => {
    if (!id || authLoading) return;
    const fetchProperty = async () => {
      setLoading(true);
      const { data: _propRows, error } = await supabase.rpc("get_admin_property", { p_property_id: id });
      const data = (_propRows ?? [])[0] ?? null;

      if (error || !data) {
        toast({ title: "Property not found", variant: "destructive" });
        navigate("/admin/properties", { replace: true });
        return;
      }

      setProperty(data as unknown as PropertyData);

      // Pre-fill form
      setBuildingName((data as unknown as Record<string, unknown>).building_name as string || "");
      setLocality((data as unknown as Record<string, unknown>).locality as string || "");
      setBhk((data as unknown as Record<string, unknown>).bhk as string || "");
      setPropertyType((data as unknown as Record<string, unknown>).property_type as string || "apartment");
      setFloorNumber((data as unknown as Record<string, unknown>).floor_number != null ? String((data as unknown as Record<string, unknown>).floor_number) : "");
      setTotalFloors((data as unknown as Record<string, unknown>).total_floors != null ? String((data as unknown as Record<string, unknown>).total_floors) : "");
      setSquareFootage((data as unknown as Record<string, unknown>).square_footage != null ? String((data as unknown as Record<string, unknown>).square_footage) : "");
      setListedRent((data as unknown as Record<string, unknown>).listed_rent != null ? String((data as unknown as Record<string, unknown>).listed_rent) : "");
      setSocietyMaintenance((data as unknown as Record<string, unknown>).society_maintenance_approx != null ? String((data as unknown as Record<string, unknown>).society_maintenance_approx) : "");
      if ((data as unknown as Record<string, unknown>).available_from) {
        setAvailableFrom(new Date(((data as unknown as Record<string, unknown>).available_from as string) + "T00:00:00"));
      }
      setFurnishing((data as unknown as Record<string, unknown>).furnishing as string || "");
      setMaintenanceIncluded(!!(data as unknown as Record<string, unknown>).maintenance_included_in_rent);
      setWaterIncluded(!!(data as unknown as Record<string, unknown>).utility_water_included);
      setGasIncluded(!!(data as unknown as Record<string, unknown>).utility_gas_included);
      setGasType((data as unknown as Record<string, unknown>).gas_type as string || "none");
      setElectricityIncluded(!!(data as unknown as Record<string, unknown>).utility_electricity_included);
      setParking2w((data as unknown as Record<string, unknown>).parking_2w as string || "none");
      setParking4w((data as unknown as Record<string, unknown>).parking_4w as string || "none");
      setPetPolicy((data as unknown as Record<string, unknown>).pet_policy as string || "");
      setBuildingRules((data as unknown as Record<string, unknown>).building_rules as string || "");
      setIsActive(!!(data as unknown as Record<string, unknown>).is_active);
      setYoutubeWalkthroughUrl((data as unknown as Record<string, unknown>).youtube_walkthrough_url as string || "");
      // Prompt 4 — hydrate spec fields previously missing from admin form.
      setBuildingNotes((data as unknown as Record<string, unknown>).building_notes as string || "");
      setSecurityDepositAmount((data as unknown as Record<string, unknown>).security_deposit_amount != null ? String((data as unknown as Record<string, unknown>).security_deposit_amount) : "");
      // Prompt 8 — India fields.
      setLandmark((data as unknown as Record<string, unknown>).landmark as string || "");
      setAnnualRentIncreasePct((data as unknown as Record<string, unknown>).annual_rent_increase_pct != null ? String((data as unknown as Record<string, unknown>).annual_rent_increase_pct) : "");
      setWaterStorage((data as unknown as Record<string, unknown>).water_storage as string || "");
      setListerRole((data as unknown as Record<string, unknown>).lister_role as string || "owner");
      setParking2wCount((data as unknown as Record<string, unknown>).parking_2w_count != null ? String((data as unknown as Record<string, unknown>).parking_2w_count) : "");
      setParking4wCount((data as unknown as Record<string, unknown>).parking_4w_count != null ? String((data as unknown as Record<string, unknown>).parking_4w_count) : "");
      setParkingNotes((data as unknown as Record<string, unknown>).parking_notes as string || "");
      // P3 — new columns.
      const row = data as unknown as Record<string, unknown>;
      setLockInMonths(row.lock_in_months != null ? String(row.lock_in_months) : "");
      setNoticePeriodDays(row.notice_period_days != null ? String(row.notice_period_days) : "");
      setSuperBuiltUpArea(row.super_built_up_area != null ? String(row.super_built_up_area) : "");
      setWaterSource(Array.isArray(row.water_source) ? (row.water_source as string[]) : []);
      setMainDoorLockType((row.main_door_lock_type as string) ?? "");
      // Prompt 10b — rent/sale.
      setListingType((data as unknown as Record<string, unknown>).listing_type as string || "rent");
      setSalePrice((data as unknown as Record<string, unknown>).sale_price != null ? String((data as unknown as Record<string, unknown>).sale_price) : "");
      setPriceNegotiable(!!(data as unknown as Record<string, unknown>).price_negotiable);
      setExpectedPricePerSqft((data as unknown as Record<string, unknown>).expected_price_per_sqft != null ? String((data as unknown as Record<string, unknown>).expected_price_per_sqft) : "");
      setPossessionStatus((data as unknown as Record<string, unknown>).possession_status as string || "");
      setPossessionDate((data as unknown as Record<string, unknown>).possession_date ? new Date(((data as unknown as Record<string, unknown>).possession_date as string) + "T00:00:00") : undefined);
      setReraRegistrationNumber((data as unknown as Record<string, unknown>).rera_registration_number as string || "");
      setKhataType((data as unknown as Record<string, unknown>).khata_type as string || "");
      setPropertyTaxPaidUpto((data as unknown as Record<string, unknown>).property_tax_paid_upto ? new Date(((data as unknown as Record<string, unknown>).property_tax_paid_upto as string) + "T00:00:00") : undefined);
      // Phase 1.5 addendum (D-166).
      setMoveInChargesAmount((data as unknown as Record<string, unknown>).move_in_charges_amount != null ? String((data as unknown as Record<string, unknown>).move_in_charges_amount) : "");
      setRentBrokerageFixedAmount((data as unknown as Record<string, unknown>).rent_brokerage_fixed_amount != null ? String((data as unknown as Record<string, unknown>).rent_brokerage_fixed_amount) : "");
      setSaleBrokeragePct((data as unknown as Record<string, unknown>).sale_brokerage_pct != null ? String((data as unknown as Record<string, unknown>).sale_brokerage_pct) : "");

      // Parse amenities
      // D-171: furnishingItems state removed (D-170 follow-up) — amenities.furnishing_items
      // is derived from furnishingDetail on save via buildAmenitiesJson; no need to track separately.
      const amenities = (data as unknown as Record<string, unknown>).amenities as Record<string, unknown> || {};
      setBuildingAmenities(Array.isArray(amenities.building) ? amenities.building as string[] : []);

      // New columns
      const d = data as Record<string, unknown>;
      setBathrooms(d.bathrooms != null ? String(d.bathrooms) : '');
      setBalconies(d.balconies != null ? String(d.balconies) : '');
      setFacing(d.facing as string || '');
      setBuildingAgeYears(d.building_age_years != null ? String(d.building_age_years) : '');
      if (Array.isArray(d.furnishing_detail)) {
        setFurnishingDetail(d.furnishing_detail as FurnishingDetailItem[]);
      }

      // Google Maps Phase 1 — hydrate address fields
      setPlaceId((row.place_id as string) ?? null);
      setFormattedAddress((row.formatted_address as string) ?? null);
      setAddressMode((row.address_mode as 'google_place' | 'manual' | null) ?? null);
      setStreetNumber((row.street_number as string) ?? null);
      setRouteVal((row.route as string) ?? null);
      setSublocality1((row.sublocality_1 as string) ?? null);
      setSublocality2((row.sublocality_2 as string) ?? null);
      setNeighborhood((row.neighborhood as string) ?? null);
      setDistrict((row.district as string) ?? null);
      setCountry((row.country as string) ?? null);
      setPlusCode((row.plus_code as string) ?? null);
      setViewportNeLat(row.viewport_ne_lat != null ? Number(row.viewport_ne_lat) : null);
      setViewportNeLng(row.viewport_ne_lng != null ? Number(row.viewport_ne_lng) : null);
      setViewportSwLat(row.viewport_sw_lat != null ? Number(row.viewport_sw_lat) : null);
      setViewportSwLng(row.viewport_sw_lng != null ? Number(row.viewport_sw_lng) : null);
      setLatitude(row.latitude != null ? Number(row.latitude) : null);
      setLongitude(row.longitude != null ? Number(row.longitude) : null);
      setStreetviewAvailable(row.streetview_available != null ? (row.streetview_available as boolean) : null);
      setStreetviewPanoId((row.streetview_pano_id as string) ?? null);
      setStreetviewCheckedAt((row.streetview_checked_at as string) ?? null);
      setStreetviewShowInListing((row.streetview_show_in_listing as boolean) ?? false);
      setLocationVerifiedByOwner((row.location_verified_by_owner as boolean) ?? false);
      setLocationVerifiedAt((row.location_verified_at as string) ?? null);
      setListerFlatNumber((row.lister_flat_number as string) ?? null);

      // Prompt 3 — read the property's pending owner edit request (if any) and derive the
      // conflicting DB columns. On a query FAILURE, mark conflict state unknown (which blocks
      // Save) rather than silently claiming there is no conflict.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: pe, error: peErr } = await (supabase as any)
        .from("property_edit_requests")
        .select("id, payload")
        .eq("property_id", id)
        .eq("status", "pending")
        .maybeSingle();
      if (peErr) {
        setConflictUnknown(true);
        toast({ title: "Couldn't check pending owner edits", description: peErr.message, variant: "destructive" });
      } else {
        setConflictUnknown(false);
        setPendingEditId(pe?.id ?? null);
        setConflictKeys(extractPendingConflictKeys(pe?.payload));
      }

      setLoading(false);
    };
    fetchProperty();
  }, [id, authLoading, navigate, toast]);

  // Single reusable image loader — called on mount and after every upload/delete
  // so the UI always reflects fresh server state (incl. server-side cover
  // promotion after a delete). Resets error state per call; on failure clears
  // stale server rows (keeps any transient "__placeholder__" section rows) so a
  // failed read never masquerades as a real empty gallery.
  const loadImages = useCallback(async () => {
    if (!id) return;
    setImagesLoading(true);
    setImagesError(false);
    const { data, error } = await supabase
      .from("property_images")
      .select("id, url, caption, is_primary, is_floor_plan, sort_order, section")
      .eq("property_id", id)
      .order("section", { ascending: true, nullsFirst: true })
      .order("sort_order", { ascending: true });
    if (error) {
      setImagesError(true);
      setImages((prev) => prev.filter((i) => i.id.startsWith("__placeholder__")));
      toast({ title: "Couldn't load photos", description: error.message, variant: "destructive" });
    } else {
      setImages((prev) => [
        ...prev.filter((i) => i.id.startsWith("__placeholder__")),
        ...((data ?? []) as unknown as PropertyImage[]),
      ]);
    }
    setImagesLoading(false);
  }, [id, toast]);

  useEffect(() => { void loadImages(); }, [loadImages]);

  // Admin building-name-only correction — trusted update_building_name path. Changes
  // ONLY building_name/source; never touches coords, place_id, associations, owner
  // verification, or Street View geography.
  const saveBuildingName = async () => {
    if (!id || !session?.access_token || bnSaving) return;
    setBnSaving(true);
    const res = await updateBuildingName(session.access_token, id, buildingName.trim() || null);
    setBnSaving(false);
    if (res.ok) {
      toast({ title: "Building name updated" });
    } else {
      toast({
        title: "Could not update building name",
        description: LOCATION_ERROR_COPY[res.error ?? "update_failed"],
        variant: "destructive",
      });
    }
  };

  const handleRecheckStreetView = () => {
    if (!latitude || !longitude || !streetViewLib) return;
    setStreetviewChecking(true);
    const svc = new streetViewLib.StreetViewService();
    svc.getPanorama(
      {
        location: { lat: latitude, lng: longitude },
        radius: 50,
        source: streetViewLib.StreetViewSource.OUTDOOR,
      },
      async (svData, status) => {
        const available = status === streetViewLib.StreetViewStatus.OK;
        const panoId = available ? (svData?.location?.pano ?? null) : null;
        const checkedAt = new Date().toISOString();
        setStreetviewAvailable(available);
        setStreetviewPanoId(panoId);
        setStreetviewCheckedAt(checkedAt);
        setStreetviewChecking(false);
        // Immediate partial save — only 3 SV columns
        await supabase.from('properties').update({
          streetview_available: available,
          streetview_pano_id: panoId,
          streetview_checked_at: checkedAt,
        }).eq('id', id!);
      }
    );
  };

  const handleSave = async () => {
    if (!id) return;
    // Prompt 3 — never save while the pending-conflict state is unknown (initial check failed).
    if (conflictUnknown) {
      toast({ title: "Can't save — pending-edit check failed", description: "Reload the page to re-check owner edits before saving.", variant: "destructive" });
      return;
    }
    setSaving(true);

    // Prompt 3 — re-check the pending owner edit immediately before writing (closes the
    // load→submit race). A failed pre-save check blocks Save; newly-appeared conflicts are
    // omitted from the write and surfaced. Unrelated fields still save.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: freshPe, error: freshErr } = await (supabase as any)
      .from("property_edit_requests")
      .select("id, payload")
      .eq("property_id", id)
      .eq("status", "pending")
      .maybeSingle();
    if (freshErr) {
      setSaving(false);
      toast({ title: "Can't save — couldn't re-check owner edits", description: freshErr.message, variant: "destructive" });
      return;
    }
    const freshConflicts = extractPendingConflictKeys(freshPe?.payload);
    setPendingEditId(freshPe?.id ?? null);
    // If a new conflict appeared since load, reflect it in the UI + tell the admin.
    const newlyAppearedKeys = [...freshConflicts].filter((k) => !conflictKeys.has(k));
    const newlyAppeared = newlyAppearedKeys.length > 0;
    if (newlyAppeared) {
      // Reset ONLY the newly-conflicting fields to their authoritative live DB values before
      // locking them read-only, so the lock never displays the admin's un-persisted typed value.
      // Unrelated unsaved admin edits are untouched. If this authoritative refetch fails, block
      // Save entirely — never continue while a conflicting field still shows an unsaved value.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: liveRow, error: liveErr } = await (supabase as any)
        .from("properties")
        .select(
          "bhk, property_type, rera_registration_number, youtube_walkthrough_url, parking_notes, building_rules, building_notes, amenities, furnishing_detail"
        )
        .eq("id", id)
        .maybeSingle();
      if (liveErr || !liveRow) {
        setSaving(false);
        toast({ title: "Can't save — couldn't refresh live field values", description: liveErr?.message ?? "Property not found.", variant: "destructive" });
        return;
      }
      const resets = deriveConflictFieldResets(newlyAppearedKeys, liveRow as unknown as Record<string, unknown>);
      if (resets.bhk !== undefined) setBhk(resets.bhk);
      if (resets.propertyType !== undefined) setPropertyType(resets.propertyType);
      if (resets.reraRegistrationNumber !== undefined) setReraRegistrationNumber(resets.reraRegistrationNumber);
      if (resets.youtubeWalkthroughUrl !== undefined) setYoutubeWalkthroughUrl(resets.youtubeWalkthroughUrl);
      if (resets.parkingNotes !== undefined) setParkingNotes(resets.parkingNotes);
      if (resets.buildingRules !== undefined) setBuildingRules(resets.buildingRules);
      if (resets.buildingNotes !== undefined) setBuildingNotes(resets.buildingNotes);
      if (resets.buildingAmenities !== undefined) setBuildingAmenities(resets.buildingAmenities);
      if (resets.furnishingDetail !== undefined) setFurnishingDetail(resets.furnishingDetail as FurnishingDetailItem[]);
      setConflictKeys(freshConflicts);
      toast({ title: "Owner change pending for this field — resolve the edit first.", description: "New pending owner changes were detected; those fields were reset to the live values and not saved.", variant: "destructive" });
    }

    // D-170: amenities JSONB derived via shared helper; furnishing_items key
    // is denormalized from furnishingDetail (kept for downstream readers).
    const amenities = buildAmenitiesJson(buildingAmenities, furnishingDetail);

    const updatePayload: Record<string, unknown> = {
        building_name: buildingName,
        locality: locality || null,
        bhk: bhk as "studio" | "1BHK" | "2BHK" | "3BHK" | "4BHK" | "5BHK_plus",
        property_type: propertyType || null,
        floor_number: floorNumber ? parseInt(floorNumber) : null,
        total_floors: totalFloors ? parseInt(totalFloors) : null,
        square_footage: squareFootage ? parseFloat(squareFootage) : null,
        listed_rent: listedRent ? parseFloat(listedRent) : 0,
        society_maintenance_approx: societyMaintenance ? parseFloat(societyMaintenance) : null,
        available_from: availableFrom ? format(availableFrom, "yyyy-MM-dd") : null,
        furnishing: furnishing as "unfurnished" | "semi_furnished" | "fully_furnished",
        amenities: amenities as unknown as typeof amenities & Record<string, never>,
        bathrooms: bathrooms ? Number(bathrooms) : null,
        balconies: balconies ? Number(balconies) : null,
        facing: facing || null,
        building_age_years: buildingAgeYears ? Number(buildingAgeYears) : null,
        furnishing_detail: furnishingDetail.length > 0 ? (furnishingDetail as any) : null,
        maintenance_included_in_rent: maintenanceIncluded,
        utility_water_included: waterIncluded,
        utility_gas_included: gasIncluded,
        gas_type: gasType === "none" ? null : gasType || null,
        utility_electricity_included: electricityIncluded,
        parking_2w: parking2w as "none" | "covered" | "uncovered" | "both",
        parking_4w: parking4w as "none" | "covered" | "uncovered" | "both",
        pet_policy: petPolicy || null,
        building_rules: buildingRules || null,
        is_active: isActive,
        youtube_walkthrough_url: youtubeWalkthroughUrl.trim() || null,
        // Prompt 4 — spec fields newly surfaced on admin form.
        building_notes: buildingNotes || null,
        security_deposit_amount: securityDepositAmount ? parseFloat(securityDepositAmount) : null,
        // Prompt 8 — India fields (D-159).
        landmark: landmark || null,
        annual_rent_increase_pct: annualRentIncreasePct ? parseFloat(annualRentIncreasePct) : null,
        water_storage: waterStorage || null,
        lister_role: listerRole || "owner",
        // P3 — new columns.
        lock_in_months: lockInMonths ? parseInt(lockInMonths) : null,
        notice_period_days: noticePeriodDays ? parseInt(noticePeriodDays) : null,
        super_built_up_area: superBuiltUpArea ? parseFloat(superBuiltUpArea) : null,
        water_source: waterSource.length ? waterSource : null,
        main_door_lock_type: mainDoorLockType || null,
        parking_2w_count: parking2wCount ? parseInt(parking2wCount) : 0,
        parking_4w_count: parking4wCount ? parseInt(parking4wCount) : 0,
        parking_notes: parkingNotes || null,
        // Prompt 10b — rent/sale. D-111 direct-write bypass; trigger validates listing_type-branched required fields (D-160).
        listing_type: listingType as "rent" | "sale",
        sale_price: salePrice ? parseFloat(salePrice) : null,
        price_negotiable: priceNegotiable,
        expected_price_per_sqft: expectedPricePerSqft ? parseFloat(expectedPricePerSqft) : null,
        possession_status: possessionStatus || null,
        possession_date: possessionDate ? format(possessionDate, "yyyy-MM-dd") : null,
        rera_registration_number: reraRegistrationNumber || null,
        khata_type: khataType || null,
        property_tax_paid_upto: propertyTaxPaidUpto ? format(propertyTaxPaidUpto, "yyyy-MM-dd") : null,
        // Phase 1.5 addendum (D-166). D-111 direct-write bypass.
        move_in_charges_amount: moveInChargesAmount ? parseFloat(moveInChargesAmount) : null,
        rent_brokerage_fixed_amount: rentBrokerageFixedAmount ? parseFloat(rentBrokerageFixedAmount) : null,
        sale_brokerage_pct: saleBrokeragePct ? parseFloat(saleBrokeragePct) : null,
        // Google Maps Phase 1 address fields
        place_id: placeId?.trim() || null,
        formatted_address: formattedAddress?.trim() || null,
        address_mode: addressMode || null,
        street_number: streetNumber?.trim() || null,
        route: routeVal?.trim() || null,
        sublocality_1: sublocality1?.trim() || null,
        sublocality_2: sublocality2?.trim() || null,
        neighborhood: neighborhood?.trim() || null,
        district: district?.trim() || null,
        country: country?.trim() || null,
        plus_code: plusCode?.trim() || null,
        viewport_ne_lat: viewportNeLat,
        viewport_ne_lng: viewportNeLng,
        viewport_sw_lat: viewportSwLat,
        viewport_sw_lng: viewportSwLng,
        latitude: latitude,
        longitude: longitude,
        streetview_available: streetviewAvailable,
        streetview_pano_id: streetviewPanoId?.trim() || null,
        streetview_checked_at: streetviewCheckedAt || null,
        streetview_show_in_listing: streetviewShowInListing,
        location_verified_by_owner: locationVerifiedByOwner,
        location_verified_at: locationVerifiedAt || null,
        lister_flat_number: listerFlatNumber?.trim() || null,
        updated_at: new Date().toISOString(),
    };

    // Omit any column with a pending owner-reviewed change so the admin can never
    // overwrite a field currently awaiting review (belt-and-suspenders behind the UI lock).
    for (const k of freshConflicts) delete updatePayload[k];

    // Prompt 2: canonical location columns are write-locked at the DB — they may be changed
    // ONLY through the trusted confirm-property-location flow (below). Strip them from the
    // direct admin save so unrelated field edits never trip the location-lock guard.
    const LOCKED_LOCATION_KEYS = [
      "building_name", "building_name_source", "street_address", "locality", "city", "state", "pincode",
      "place_id", "formatted_address", "address_mode", "street_number", "route", "sublocality_1",
      "sublocality_2", "neighborhood", "district", "plus_code", "viewport_ne_lat", "viewport_ne_lng",
      "viewport_sw_lat", "viewport_sw_lng", "latitude", "longitude", "location_verified_by_owner",
      "location_verified_at",
    ];
    for (const k of LOCKED_LOCATION_KEYS) delete updatePayload[k];

    const { error } = await supabase
      .from("properties")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update(updatePayload as any)
      .eq("id", id);

    setSaving(false);

    if (error) {
      toast({ title: "Failed to save changes", description: error.message, variant: "destructive" });
    } else if (newlyAppeared) {
      toast({ title: "Saved — except fields with pending owner edits", description: "Resolve the pending edit to change those fields.", variant: "destructive" });
    } else {
      toast({ title: "Property saved successfully" });
    }
  };

  const statusInfo = property ? STATUS_LABELS[(property.status as string) || "draft"] || { label: property.status as string, variant: "outline" as const } : null;

  const SECTION_SUGGESTIONS = [
    "Living Room", "Master Bedroom", "Bedroom 2", "Bedroom 3",
    "Kitchen", "Bathrooms", "Balcony", "Building Exterior",
    "Common Areas", "Floor Plan"
  ];

  const groupedImages = useMemo(() => {
    const groups = new Map<string, PropertyImage[]>();
    images.forEach(img => {
      const key = img.section || "Uncategorised";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(img);
    });
    return groups;
  }, [images]);

  const handleUpload = async (files: File[], section: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    for (const file of Array.from(files)) {
      const fileKey = `${section}-${file.name}-${Date.now()}`;
      setUploadingFiles(prev => ({ ...prev, [fileKey]: true }));
      setUploadErrors(prev => { const n = { ...prev }; delete n[fileKey]; return n; });

      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("property_id", id!);
        formData.append("section", section);
        formData.append("is_floor_plan", section.toLowerCase() === "floor plan" ? "true" : "false");

        const res = await fetch(
          "https://tfutuqqcxqqbirnsdpvz.supabase.co/functions/v1/upload-property-image",
          {
            method: "POST",
            headers: { Authorization: `Bearer ${session.access_token}` },
            body: formData,
          }
        );
        const json = await res.json();
        if (json.success) {
          const prevHadPrimary = images.some((i) => i.is_primary);
          setImages(prev => [...prev, {
            id: json.id,
            url: json.url,
            caption: null,
            is_primary: false,
            is_floor_plan: section.toLowerCase() === "floor plan",
            sort_order: 0,
            section: section,
          }]);
          // Sync Prompt 1 (D-167) — auto-select first upload as cover if property has no primary yet.
          if (id) {
            await ensurePrimaryPhoto(id, json.id);
            if (!prevHadPrimary) {
              setImages((prev) => prev.map((i) => (i.id === json.id ? { ...i, is_primary: true } : i)));
            }
          }
        } else {
          setUploadErrors(prev => ({ ...prev, [fileKey]: json.error || "Upload failed" }));
          toast({ title: "Photo upload failed", description: json.error || "Upload failed", variant: "destructive" });
        }
      } catch (e) {
        setUploadErrors(prev => ({ ...prev, [fileKey]: "Network error" }));
        toast({ title: "Photo upload failed", description: "Network error", variant: "destructive" });
      } finally {
        setUploadingFiles(prev => { const n = { ...prev }; delete n[fileKey]; return n; });
      }
    }
  };

  const handleDelete = async (imageId: string, propertyId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      const res = await fetch(
        "https://tfutuqqcxqqbirnsdpvz.supabase.co/functions/v1/delete-property-image",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ image_id: imageId, property_id: propertyId }),
        }
      );
      const json = await res.json();
      if (json.success) {
        // Optimistic removal, then refetch so any server-side cover promotion
        // (new is_primary on a remaining image) is reflected in DB + UI.
        setImages(prev => prev.filter(img => img.id !== imageId));
        await loadImages();
      } else {
        toast({ title: "Failed to delete photo", description: json.error || "Delete failed", variant: "destructive" });
      }
    } catch (e) {
      console.error("Delete failed", e);
      toast({ title: "Failed to delete photo", description: "Network error", variant: "destructive" });
    }
  };

  const handleSetPrimary = async (imageId: string) => {
    await supabase.from("property_images").update({ is_primary: false }).eq("property_id", id!);
    await supabase.from("property_images").update({ is_primary: true }).eq("id", imageId);
    setImages(prev => prev.map(img => ({ ...img, is_primary: img.id === imageId })));
  };

  const handleToggleFloorPlan = async (imageId: string, current: boolean) => {
    await supabase.from("property_images").update({ is_floor_plan: !current }).eq("id", imageId);
    setImages(prev => prev.map(img => img.id === imageId ? { ...img, is_floor_plan: !current } : img));
  };

  if (authLoading || loading) {
    return (
      <AdminLayout>
        <div className="space-y-4 max-w-4xl">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-[600px] w-full" />
        </div>
      </AdminLayout>
    );
  }

  if (!property) return null;

  return (
    <AdminLayout>
      <div className="max-w-4xl space-y-6">
        {/* Photos */}
        <div className="rounded-lg border bg-card p-4 md:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-medium text-foreground">Property Photos</h2>
            <button
              type="button"
              onClick={() => setShowSectionInput(true)}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              + Add Section
            </button>
          </div>
          {showSectionInput && (
            <div className="p-3 border border-border rounded-lg bg-muted/50">
              <input
                type="text"
                value={newSectionName}
                onChange={e => setNewSectionName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && newSectionName.trim()) {
                    e.preventDefault();
                    if (!groupedImages.has(newSectionName.trim())) {
                      setImages(prev => [...prev, {
                        id: "__placeholder__" + Date.now(),
                        url: "",
                        caption: null,
                        is_primary: false,
                        is_floor_plan: false,
                        sort_order: 0,
                        section: newSectionName.trim(),
                      }]);
                    }
                    setNewSectionName("");
                    setShowSectionInput(false);
                  }
                  if (e.key === "Escape") { setShowSectionInput(false); setNewSectionName(""); }
                }}
                placeholder="Section name, e.g. Living Room"
                className="w-full border border-border rounded px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                autoFocus
              />
              <div className="flex flex-wrap gap-1">
                {SECTION_SUGGESTIONS.map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      const trimmed = s.trim();
                      if (!groupedImages.has(trimmed)) {
                        setImages(prev => [...prev, {
                          id: "__placeholder__" + Date.now(),
                          url: "",
                          caption: null,
                          is_primary: false,
                          is_floor_plan: false,
                          sort_order: 0,
                          section: trimmed,
                        }]);
                      }
                      setNewSectionName("");
                      setShowSectionInput(false);
                    }}
                    className="text-xs px-2 py-1 bg-background border border-border rounded hover:bg-accent text-muted-foreground"
                  >
                    {s}
                  </button>
                ))}
              </div>
              <div className="flex justify-end mt-2">
                <button
                  type="button"
                  onClick={() => {
                    const trimmed = newSectionName.trim();
                    if (!trimmed) return;
                    if (!groupedImages.has(trimmed)) {
                      setImages(prev => [...prev, {
                        id: "__placeholder__" + Date.now(),
                        url: "",
                        caption: null,
                        is_primary: false,
                        is_floor_plan: false,
                        sort_order: 0,
                        section: trimmed,
                      }]);
                    }
                    setNewSectionName("");
                    setShowSectionInput(false);
                  }}
                  className="text-xs px-3 py-1.5 bg-primary text-primary-foreground rounded hover:bg-primary/90 font-medium"
                >
                  Add Section
                </button>
              </div>
            </div>
          )}
          {imagesLoading ? (
            <p className="text-sm text-muted-foreground">Loading photos...</p>
          ) : imagesError ? (
            <div className="border-2 border-dashed border-destructive/40 bg-destructive/5 rounded-lg p-8 text-center">
              <p className="text-destructive text-sm font-medium">Couldn&rsquo;t load photos.</p>
              <p className="text-muted-foreground text-xs mt-1">The read failed — this isn&rsquo;t the same as having no photos.</p>
              <button type="button" onClick={() => void loadImages()} className="text-sm text-blue-600 hover:text-blue-700 font-medium mt-2">
                Retry
              </button>
            </div>
          ) : groupedImages.size === 0 ? (
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
              <p className="text-muted-foreground text-sm">No photos yet. Click &ldquo;+ Add Section&rdquo; to get started.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Array.from(groupedImages.entries()).map(([sectionName, sectionImages]) => (
                <div key={sectionName} className="border border-border rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2 bg-muted border-b border-border">
                    <span className="text-sm font-medium text-foreground">{sectionName}</span>
                    <label className="text-xs text-blue-600 hover:text-blue-700 cursor-pointer font-medium">
                      Upload Photos
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        multiple
                        className="hidden"
                        onChange={async e => {
                          if (!e.target.files || e.target.files.length === 0) return;
                          const filesArray = Array.from(e.target.files);
                          e.target.value = "";
                          await handleUpload(filesArray, sectionName);
                        }}
                      />
                    </label>
                  </div>
                  <div className="p-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {sectionImages
                      .filter(img => !img.id.startsWith("__placeholder__"))
                      .map(img => (
                        <div key={img.id} className="relative group aspect-square rounded overflow-hidden bg-muted">
                          <img
                            src={img.url}
                            alt={img.caption || sectionName}
                            className="w-full h-full object-cover"
                          />
                          {img.is_primary && (
                            <span className="absolute top-1 left-1 bg-green-500 text-white text-xs px-1.5 py-0.5 rounded font-medium">
                              Cover
                            </span>
                          )}
                          {img.is_floor_plan && (
                            <span className="absolute top-1 right-1 bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded font-medium">
                              Plan
                            </span>
                          )}
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 flex-wrap p-1">
                            <button
                              type="button"
                              onClick={() => handleSetPrimary(img.id)}
                              className="text-xs bg-white text-gray-800 px-2 py-1 rounded hover:bg-yellow-100"
                              title="Set as cover photo"
                            >
                              ★ Cover
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleFloorPlan(img.id, img.is_floor_plan)}
                              className="text-xs bg-white text-gray-800 px-2 py-1 rounded hover:bg-blue-100"
                              title="Toggle floor plan"
                            >
                              {img.is_floor_plan ? "Unplan" : "Plan"}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(img.id, id!)}
                              className="text-xs bg-white text-red-600 px-2 py-1 rounded hover:bg-red-50"
                              title="Delete image"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}
                    {sectionImages.filter(img => !img.id.startsWith("__placeholder__")).length === 0 && (
                      <div className="col-span-full py-6 text-center">
                        <p className="text-xs text-muted-foreground">No photos yet. Click &ldquo;Upload Photos&rdquo; above to add images.</p>
                      </div>
                    )}
                    {Object.entries(uploadingFiles)
                      .filter(([key]) => key.startsWith(sectionName))
                      .map(([key]) => (
                        <div key={key} className="aspect-square rounded bg-muted flex items-center justify-center">
                          <span className="text-xs text-muted-foreground">Uploading...</span>
                        </div>
                      ))}
                  </div>
                  {Object.entries(uploadErrors)
                    .filter(([key]) => key.startsWith(sectionName))
                    .map(([key, err]) => (
                      <p key={key} className="text-xs text-red-500 px-4 pb-2">{err}</p>
                    ))}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="min-h-[44px] min-w-[44px]" onClick={() => navigate("/admin/properties")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-foreground">
                  {buildingName}{locality ? `, ${locality}` : ""}
                </h1>
                {statusInfo && <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>}
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">Property ID: {id}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="min-h-[44px]" onClick={() => window.open(`/property/${id}`, "_blank")}>
              <ExternalLink className="h-4 w-4 mr-1.5" /> Preview Listing
            </Button>
            <Button size="sm" className="min-h-[44px]" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save Changes"}
            </Button>
          </div>
        </div>

        {/* Publish toggle */}
        <div className="rounded-lg border bg-card p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">Visible to tenants</p>
            <p className="text-xs text-muted-foreground">When enabled, property appears in tenant search results</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", isActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
              {isActive ? "Live" : "Hidden"}
            </span>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
        </div>

        {/* Location card — Google Maps Phase 1 */}
        <Section title="Location">
          {/* Prompt 2: admin geographic changes go through the SAME trusted server flow
              (server derives actor=admin). Canonical location is write-locked at the DB. */}
          {id && <AdminLocationPanel propertyId={id} token={session?.access_token ?? null} />}

          {/* Admin building-name-only correction — trusted update_building_name path.
              Corrects only the building name (marked admin-edited); never changes the
              map pin, city/area associations, owner verification, or Street View. */}
          <div className="space-y-1">
            <Label htmlFor="admin-bn">Building / Society name</Label>
            <div className="flex flex-wrap items-end gap-2">
              <Input
                id="admin-bn"
                value={buildingName}
                onChange={(e) => setBuildingName(e.target.value)}
                placeholder="e.g. Prestige Lakeside"
                className="max-w-[280px] min-h-[44px]"
              />
              <Button
                type="button"
                variant="outline"
                disabled={bnSaving || !session?.access_token || !id}
                onClick={saveBuildingName}
                className="min-h-[44px]"
              >
                {bnSaving ? 'Saving…' : 'Save building name'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Corrects only the building name. Does not change the map pin, city, areas, or Street View.
            </p>
          </div>

          {/* Flat / unit number from owner (lister_flat_number) */}
          <div className="space-y-1">
            <Label htmlFor="lister_flat_number">Flat / Unit number (from owner)</Label>
            <Input
              id="lister_flat_number"
              value={listerFlatNumber ?? ''}
              onChange={(e) => {
                const v = e.target.value.replace(/[^A-Za-z0-9/-]/g, '').slice(0, 10);
                setListerFlatNumber(v || null);
              }}
              placeholder="e.g. B-402"
              maxLength={10}
              className="max-w-[180px] min-h-[44px]"
            />
            <p className="text-xs text-muted-foreground">
              Letters, numbers, hyphens, slashes only. Max 10 chars. Not visible to tenants.
            </p>
          </div>

          {/* Landmark (moved from Listing Details) */}
          <SpecField fieldKey="landmark" surface="admin_form" value={landmark} onChange={(v: string) => setLandmark(v)} />

          <Separator />

          {/* Street View */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Street View</h3>
            <div className="flex items-center gap-3 flex-wrap">
              {streetviewAvailable === null ? (
                <Badge variant="outline" className="text-muted-foreground">Not checked</Badge>
              ) : streetviewAvailable ? (
                <Badge variant="secondary" className="text-green-700 bg-green-50">✓ Available</Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground">Not available</Badge>
              )}
              {streetviewCheckedAt && (
                <span className="text-xs text-muted-foreground">
                  Last checked: {format(new Date(streetviewCheckedAt), 'PP')}
                </span>
              )}
            </div>
            {streetviewAvailable && streetviewPanoId && (
              <a
                href={`https://www.google.com/maps/@?api=1&map_action=pano&pano=${streetviewPanoId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm underline text-primary flex items-center gap-1"
              >
                <ExternalLink className="h-3 w-3" /> Preview Street View
              </a>
            )}
            <div className="flex items-center justify-between rounded-lg border p-3 max-w-sm">
              <Label htmlFor="sv-admin-toggle">Show Street View link in listing</Label>
              <Switch id="sv-admin-toggle" checked={streetviewShowInListing} onCheckedChange={setStreetviewShowInListing} />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!latitude || !longitude || streetviewChecking}
              onClick={handleRecheckStreetView}
            >
              <RefreshCw className={cn("h-3 w-3 mr-1.5", streetviewChecking && "animate-spin")} />
              {streetviewChecking ? 'Checking…' : 'Re-check Street View'}
            </Button>
          </div>
        </Section>

        {/* Section 1 — Basic Details — scalar rendering driven by PROPERTY_FIELDS (D-128, D-155, D-156). */}
        <Section title="Basic Details">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SpecField fieldKey="bhk" surface="admin_form" value={bhk} onChange={(v: string) => setBhk(v)} readOnly={conflictKeys.has("bhk")}>{conflictKeys.has("bhk") && <ConflictNote editId={pendingEditId} />}</SpecField>
            <SpecField fieldKey="property_type" surface="admin_form" value={propertyType} onChange={(v: string) => setPropertyType(v)} readOnly={conflictKeys.has("property_type")}>{conflictKeys.has("property_type") && <ConflictNote editId={pendingEditId} />}</SpecField>
            <SpecField fieldKey="floor_number" surface="admin_form" value={floorNumber} onChange={(v: string) => setFloorNumber(v)} />
            <SpecField fieldKey="total_floors" surface="admin_form" value={totalFloors} onChange={(v: string) => setTotalFloors(v)} />
            {/* TODO(spec): fold "Carpet Area (in sq ft)" admin label into PROPERTY_FIELDS.square_footage.adminLabel in Prompt 6 bundle */}
            <SpecField fieldKey="square_footage" surface="admin_form" value={squareFootage} onChange={(v: string) => setSquareFootage(v)} />
            {/* P3: super_built_up_area — companion to carpet area. */}
            <SpecField fieldKey="super_built_up_area" surface="admin_form" value={superBuiltUpArea} onChange={(v: string) => setSuperBuiltUpArea(v)} />
            <SpecField fieldKey="bathrooms" surface="admin_form" value={bathrooms} onChange={(v: string) => setBathrooms(v)} placeholderOverride="e.g. 2" />
            <SpecField fieldKey="balconies" surface="admin_form" value={balconies} onChange={(v: string) => setBalconies(v)} placeholderOverride="e.g. 1" />
            {/* TODO(spec): fold "Building Facing Direction" admin label into PROPERTY_FIELDS.facing.adminLabel in Prompt 6 bundle */}
            <SpecField fieldKey="facing" surface="admin_form" value={facing} onChange={(v: string) => setFacing(v)} placeholderOverride="Select direction" />
            <SpecField fieldKey="building_age_years" surface="admin_form" value={buildingAgeYears} onChange={(v: string) => setBuildingAgeYears(v)} placeholderOverride="e.g. 5" />
          </div>
        </Section>

        {/* Section 2 — Listing Details — scalar rendering driven by PROPERTY_FIELDS (D-128, D-155, D-156). */}
        <Section title="Listing Details">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Prompt 10b (D-162) — admin listing_type control. Unlike owner (Tier-1 locked
                post-draft), admin can flip listing_type at any time via D-111 bypass. */}
            <div className="sm:col-span-2">
              <SpecField fieldKey="listing_type" surface="admin_form" value={listingType} onChange={(v: string) => setListingType(v)} className="max-w-xs" />
            </div>
            {/* Prompt 10b — rent-only fields gated on listing_type !== 'sale' (fail-safe
                pattern per D-161: legacy rows with null listing_type render rent).
                Sale-only fields render below in the sale branch. */}
            {listingType !== "sale" && <>
            {/* TODO(spec): fold "Listed Rent (₹)" admin label into PROPERTY_FIELDS.listed_rent.adminLabel in Prompt 6 bundle */}
            <SpecField fieldKey="listed_rent" surface="admin_form" value={listedRent} onChange={(v: string) => setListedRent(v)} />
            {/* Added in Prompt 4 — security_deposit_amount surfaced on admin (was owner-only rendering before). */}
            <div className="space-y-1">
              <SpecField fieldKey="security_deposit_amount" surface="admin_form" value={securityDepositAmount} onChange={(v: string) => setSecurityDepositAmount(v)} />
              {(() => {
                const amt = securityDepositAmount ? parseFloat(securityDepositAmount) : null;
                const rent = listedRent ? parseFloat(listedRent) : null;
                const months = computeDepositMonths(amt, rent);
                if (months === null) return null;
                const rounded = Math.round(months * 10) / 10;
                return (
                  <>
                    <p className="text-xs text-muted-foreground">≈ {rounded} month{rounded === 1 ? "" : "s"} of rent</p>
                    {rounded > 5 ? (
                      <p className="text-xs text-amber-600">Deposits above 5 months of rent may discourage tenants.</p>
                    ) : null}
                  </>
                );
              })()}
            </div>
            <SpecField fieldKey="society_maintenance_approx" surface="admin_form" value={societyMaintenance} onChange={(v: string) => setSocietyMaintenance(v)} />
            <div className="sm:col-span-2">
              {/* TODO(spec): fold "Society Maintenance Included in Rent" admin label into PROPERTY_FIELDS.maintenance_included_in_rent.adminLabel in Prompt 6 bundle */}
              <SpecField
                fieldKey="maintenance_included_in_rent"
                surface="admin_form"
                value={maintenanceIncluded}
                onChange={(v: boolean) => setMaintenanceIncluded(v)}
                helperOverride='When on, tenants see "Included in Rent" instead of a separate maintenance amount'
              />
            </div>
            {/* D-168: spec-driven date field. Now shows amber past-date warning + 90-day future cap (parity with owner form). */}
            <SpecField
              fieldKey="available_from"
              surface="admin_form"
              value={availableFrom as unknown}
              onChange={((iso: string | null) => setAvailableFrom(iso ? new Date(iso + "T00:00:00") : undefined)) as (v: unknown) => void}
            />
            {/* Prompt 8 (D-159) — India rent fields. `visibleWhen: v.listing_type !== 'sale'`
                on both entries makes formValues gate them; passed here for defense in depth. */}
            <SpecField fieldKey="lock_in_months" surface="admin_form" value={lockInMonths} onChange={(v: string) => setLockInMonths(v)} formValues={{ listing_type: listingType }} />
            <SpecField fieldKey="notice_period_days" surface="admin_form" value={noticePeriodDays} onChange={(v: string) => setNoticePeriodDays(v)} formValues={{ listing_type: listingType }} />
            <SpecField fieldKey="annual_rent_increase_pct" surface="admin_form" value={annualRentIncreasePct} onChange={(v: string) => setAnnualRentIncreasePct(v)} formValues={{ listing_type: listingType }} />
            {/* Phase 1.5 addendum (D-166) — move-in charges + brokerage.
                Admin gets the static "Brokerage amount" label from spec (no dynamic
                overload on this surface — admins know what "amount" means in context). */}
            <SpecField fieldKey="move_in_charges_amount" surface="admin_form" value={moveInChargesAmount} onChange={(v: string) => setMoveInChargesAmount(v)} formValues={{ listing_type: listingType }} />
            {/* F2-D3: flat brokerage amount only. */}
            <SpecField fieldKey="rent_brokerage_fixed_amount" surface="admin_form" value={rentBrokerageFixedAmount} onChange={(v: string) => setRentBrokerageFixedAmount(v)} formValues={{ listing_type: listingType }} />
            </>}
            {/* Prompt 10b (D-162) — sale-only fields. */}
            {listingType === "sale" && <>
              <SpecField fieldKey="sale_price" surface="admin_form" value={salePrice} onChange={(v: string) => setSalePrice(v)} />
              <SpecField fieldKey="expected_price_per_sqft" surface="admin_form" value={expectedPricePerSqft} onChange={(v: string) => setExpectedPricePerSqft(v)} />
              <SpecField fieldKey="price_negotiable" surface="admin_form" value={priceNegotiable} onChange={(v: boolean) => setPriceNegotiable(v)} />
              <SpecField fieldKey="possession_status" surface="admin_form" value={possessionStatus} onChange={(v: string) => setPossessionStatus(v)} />
              {/* D-168: spec-driven date field, visibleWhen gates via formValues. */}
              <SpecField
                fieldKey="possession_date"
                surface="admin_form"
                value={possessionDate as unknown}
                onChange={((iso: string | null) => setPossessionDate(iso ? new Date(iso + "T00:00:00") : undefined)) as (v: unknown) => void}
                formValues={{ possession_status: possessionStatus }}
              />
              <SpecField fieldKey="rera_registration_number" surface="admin_form" value={reraRegistrationNumber} onChange={(v: string) => setReraRegistrationNumber(v)} readOnly={conflictKeys.has("rera_registration_number")}>{conflictKeys.has("rera_registration_number") && <ConflictNote editId={pendingEditId} />}</SpecField>
              <SpecField fieldKey="khata_type" surface="admin_form" value={khataType} onChange={(v: string) => setKhataType(v)} />
              {/* D-168: spec-driven date field. */}
              <SpecField
                fieldKey="property_tax_paid_upto"
                surface="admin_form"
                value={propertyTaxPaidUpto as unknown}
                onChange={((iso: string | null) => setPropertyTaxPaidUpto(iso ? new Date(iso + "T00:00:00") : undefined)) as (v: unknown) => void}
              />
              {/* Phase 1.5 addendum (D-166) — sale brokerage. */}
              <SpecField fieldKey="sale_brokerage_pct" surface="admin_form" value={saleBrokeragePct} onChange={(v: string) => setSaleBrokeragePct(v)} formValues={{ listing_type: listingType }} />
            </>}
            {/* TODO(spec): fold "YouTube Walkthrough URL" admin label into PROPERTY_FIELDS.youtube_walkthrough_url.adminLabel in Prompt 6 bundle */}
            <SpecField fieldKey="youtube_walkthrough_url" surface="admin_form" value={youtubeWalkthroughUrl} onChange={(v: string) => setYoutubeWalkthroughUrl(v)} readOnly={conflictKeys.has("youtube_walkthrough_url")}>{conflictKeys.has("youtube_walkthrough_url") && <ConflictNote editId={pendingEditId} />}</SpecField>
          </div>
        </Section>

        {/* Section 3 — Furnishing */}
        <Section title="Furnishing">
          <div className="space-y-4">
            {/* TODO(spec): fold "Furnishing Type" admin label into PROPERTY_FIELDS.furnishing.adminLabel in Prompt 6 bundle */}
            <SpecField fieldKey="furnishing" surface="admin_form" value={furnishing} onChange={(v: string) => setFurnishing(v)} placeholderOverride="Select furnishing" className="max-w-xs" />
            {/* D-170: shared JSONB editor (same component as owner form). */}
            {conflictKeys.has("furnishing_detail") ? (
              <div className="rounded-md border border-amber-300 bg-amber-50/40 p-3 opacity-70 pointer-events-none">
                <FurnishingEditor value={furnishingDetail} onChange={() => {}} />
              </div>
            ) : (
              <FurnishingEditor value={furnishingDetail} onChange={setFurnishingDetail} />
            )}
            {conflictKeys.has("furnishing_detail") && <ConflictNote editId={pendingEditId} />}
          </div>
        </Section>

        {/* Section 4 — Building Amenities. D-170: shared editor (same component as owner). */}
        <Section title="Building Amenities">
          {conflictKeys.has("amenities") ? (
            <>
              <div className="rounded-md border border-amber-300 bg-amber-50/40 p-3 opacity-70 pointer-events-none">
                <AmenitiesEditor value={buildingAmenities} onChange={() => {}} />
              </div>
              <ConflictNote editId={pendingEditId} />
            </>
          ) : (
            <AmenitiesEditor value={buildingAmenities} onChange={setBuildingAmenities} />
          )}
        </Section>

        {/* Section 5 — Utilities & Policies */}
        <Section title="Utilities & Policies">
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <Label className="text-sm">Water Included</Label>
                <Switch checked={waterIncluded} onCheckedChange={setWaterIncluded} />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <Label className="text-sm">Gas Included</Label>
                <Switch checked={gasIncluded} onCheckedChange={setGasIncluded} />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <Label className="text-sm">Electricity Included</Label>
                <Switch checked={electricityIncluded} onCheckedChange={setElectricityIncluded} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* D-169: gas_type spec-driven; 'none' option maps to NULL on save (handled in save payload L443). */}
              <SpecField fieldKey="gas_type" surface="admin_form" value={gasType || "none"} onChange={(v: string) => setGasType(v)} formValues={{ listing_type: listingType }} />
            </div>
            {/* Prompt 8 (D-159): parking enum + count laid out in a 4-col grid so
                each enum sits beside its count. Same visual grouping as owner S5. */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* TODO(spec): fold "Parking — 2 Wheeler" admin label into PROPERTY_FIELDS.parking_2w.adminLabel in Prompt 6 bundle */}
              <SpecField fieldKey="parking_2w" surface="admin_form" value={parking2w} onChange={(v: string) => setParking2w(v)} />
              <SpecField fieldKey="parking_2w_count" surface="admin_form" value={parking2wCount} onChange={(v: string) => setParking2wCount(v)} />
              {/* TODO(spec): fold "Parking — 4 Wheeler" admin label into PROPERTY_FIELDS.parking_4w.adminLabel in Prompt 6 bundle */}
              <SpecField fieldKey="parking_4w" surface="admin_form" value={parking4w} onChange={(v: string) => setParking4w(v)} />
              <SpecField fieldKey="parking_4w_count" surface="admin_form" value={parking4wCount} onChange={(v: string) => setParking4wCount(v)} />
            </div>
            <SpecField fieldKey="parking_notes" surface="admin_form" value={parkingNotes} onChange={(v: string) => setParkingNotes(v)} readOnly={conflictKeys.has("parking_notes")}>{conflictKeys.has("parking_notes") && <ConflictNote editId={pendingEditId} />}</SpecField>
            <SpecField fieldKey="water_storage" surface="admin_form" value={waterStorage} onChange={(v: string) => setWaterStorage(v)} className="max-w-xs" />
            {/* F3-C15: lister_role — always editable for admin (owner is locked in edit mode). */}
            <SpecField fieldKey="lister_role" surface="admin_form" value={listerRole} onChange={(v: string) => setListerRole(v)} className="max-w-xs" />
            {/* P3: water_source multi-select (text[]). */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Water source</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {WATER_SOURCE_OPTIONS.map((o) => {
                  const checked = waterSource.includes(o.value);
                  return (
                    <label key={o.value} className="flex items-center gap-2 min-h-[36px] cursor-pointer">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(v) => {
                          setWaterSource((prev) =>
                            v ? [...prev, o.value] : prev.filter((x) => x !== o.value)
                          );
                        }}
                      />
                      <span className="text-sm">{o.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
            {/* P3: main_door_lock_type — freetext -> enum select. */}
            <SpecField fieldKey="main_door_lock_type" surface="admin_form" value={mainDoorLockType} onChange={(v: string) => setMainDoorLockType(v)} className="max-w-xs" />
            {/* D-169: pet_policy migrated to spec-driven select. Legacy free-text values were normalized to canonical enum via MCP in Sync P1. */}
            <SpecField fieldKey="pet_policy" surface="admin_form" value={petPolicy} onChange={(v: string) => setPetPolicy(v)} />
            <SpecField fieldKey="building_rules" surface="admin_form" value={buildingRules} onChange={(v: string) => setBuildingRules(v)} readOnly={conflictKeys.has("building_rules")}>{conflictKeys.has("building_rules") && <ConflictNote editId={pendingEditId} />}</SpecField>
            {/* Added in Prompt 4 — building_notes surfaced on admin. */}
            <SpecField fieldKey="building_notes" surface="admin_form" value={buildingNotes} onChange={(v: string) => setBuildingNotes(v)} readOnly={conflictKeys.has("building_notes")}>{conflictKeys.has("building_notes") && <ConflictNote editId={pendingEditId} />}</SpecField>
          </div>
        </Section>

        {/* Added in Prompt 4 — read-only admin metadata (audit trail). */}
        {property && (
          <Section title="Metadata">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SpecField fieldKey="listed_at" surface="admin_form" value={(property as unknown as Record<string, unknown>).listed_at} readOnly />
              <SpecField fieldKey="created_at" surface="admin_form" value={(property as unknown as Record<string, unknown>).created_at} readOnly />
            </div>
          </Section>
        )}

        {/* Bottom save */}
        <div className="flex justify-end pb-8">
          <Button onClick={handleSave} disabled={saving} className="min-h-[44px]">
            {saving ? "Saving…" : "Save Changes"}
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-card p-4 md:p-6 space-y-4">
      <h2 className="text-base font-medium text-foreground">{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      {children}
    </div>
  );
}
