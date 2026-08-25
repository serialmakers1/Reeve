/**
 * ListProperty — the owner-facing listing form. Route: /list (create), /list/:id (edit, Prompt 4).
 *
 * Nine vertical accordion sections; one open at a time.
 * Auto-save via useListingSave once a draft row exists.
 * Photos routed through processPhotoForUpload (HEIC + compression) → upload-property-image Edge Function.
 * Preview modal renders current form state as tenants will see it.
 * On submit: status transitions draft → pending_review via UPDATE; DB trigger enforces required fields.
 *
 * Prompt 3 covers create mode only. Edit mode (Prompt 4) will pre-fill from a propertyId param
 * and submit edits into property_edit_requests instead of directly updating properties.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import { CheckCircle2, Circle, AlertCircle, Eye, Lock } from "lucide-react";
import { getStatusDisplay } from "@/lib/propertyStatus";

import Layout from "@/components/Layout";
import VerificationGate from "@/components/VerificationGate";
import { SpecField } from "@/components/property/SpecField";
import { ensurePrimaryPhoto, setPrimaryPhotoViaRpc } from "@/lib/property-images";
import {
  getOwnerEditPolicy, getOwnerEditPolicyForPayload, OWNER_REVIEW_CLEAR_IS_LIVE,
} from "@/config/property-fields";
import { splitAmenitiesChange, splitFurnishingChange } from "@/lib/reviewAmenities";
import {
  normalizeReviewPayload, isReviewEmpty, reviewEquals, toSubmitArgs, hydratePersistedReviewPayload,
  type NormalizedReview, type ReviewLiveBaseline, type StagedPhoto,
} from "@/lib/ownerReviewPayload";
import RejectionPanel from "@/components/property-management/RejectionPanel";
import StatusGuidance from "@/components/property-management/StatusGuidance";
import { supabase } from "@/integrations/supabase/client";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useToast } from "@/hooks/use-toast";
import { useListingSave } from "@/hooks/useListingSave";
import { processPhotoForUpload } from "@/lib/photo";
import { PHOTO_CONFIG } from "@/config/photo";
import {
  BHK_OPTIONS, FURNISHING_OPTIONS,
  BUILDING_AMENITIES, PARKING_OPTIONS, WATER_SOURCE_OPTIONS,
  PET_POLICY_OPTIONS,
} from "@/config/property-form";
import { type FurnishingDetailItem, buildAmenitiesJson } from "@/types/property";
import { computeDepositMonths } from "@/utils/property/financialConversions";
import { FurnishingEditor } from "@/components/property/FurnishingEditor";
import { AmenitiesEditor } from "@/components/property/AmenitiesEditor";
import {
  OWNER_TEXT_MAX,
  validatePropertyFieldText,
  validateYoutubeUrl,
  YOUTUBE_MESSAGE,
  type ServerTextField,
} from "@/lib/ownerTextValidation";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import PropertyPreview, { type PropertyPreviewData, type PreviewImage } from "@/components/listing/PropertyPreview";
import { OwnerLocationPin, type ConfirmedLocationSummary, type BuildingSource } from '@/components/property-address/OwnerLocationPin';
import { validateFlatNumber } from "@/lib/validateFlatNumber";
import { isBuildingNameRequired } from '@/lib/location/isLocationReadyForSubmit';

/** Persisted-location readiness classification (mirrors the M1 FINAL_OK / LEGACY_OK contract). */
type LocationReadiness = {
  status: 'loading' | 'ready';
  kind: 'final' | 'legacy' | 'none';
  discoveryConfirmed: boolean;
  buildingSource: BuildingSource;
  needsDiscoveryRoot: boolean;
};

const SUPABASE_URL = "https://tfutuqqcxqqbirnsdpvz.supabase.co";
const DRAFT_LIMIT = 20;
const REQUIRED_SECTIONS: SectionNum[] = [1, 2, 3, 7, 9];

type SectionNum = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
type SectionStatus = "not_started" | "in_progress" | "complete" | "error";

// DB column name → owning accordion section. Used to map poisonedKeys from
// useListingSave into erroredSections so an auto-save failure highlights the
// right section, even if the user has moved past it.
// Columns unknown here (e.g. amenities JSONB) fall through to no highlight —
// still surfaces in the block toast + console.error.
const DB_COLUMN_TO_SECTION: Record<string, SectionNum> = {
  building_name: 1, street_address: 1, locality: 1, city: 1, state: 1, pincode: 1,
  landmark: 1,
  place_id: 1, formatted_address: 1, address_mode: 1, street_number: 1, route: 1,
  sublocality_1: 1, sublocality_2: 1, neighborhood: 1, district: 1, country: 1, plus_code: 1,
  viewport_ne_lat: 1, viewport_ne_lng: 1, viewport_sw_lat: 1, viewport_sw_lng: 1,
  latitude: 1, longitude: 1, streetview_available: 1, streetview_pano_id: 1,
  streetview_checked_at: 1, streetview_show_in_listing: 1,
  location_verified_by_owner: 1, location_verified_at: 1, lister_flat_number: 1,
  bhk: 2, property_type: 2, floor_number: 2, total_floors: 2, square_footage: 2, facing: 2, building_age_years: 2,
  listed_rent: 3, security_deposit_amount: 3, security_deposit_months: 3, society_maintenance_approx: 3,
  maintenance_included_in_rent: 3, available_from: 3,
  annual_rent_increase_pct: 3,
  // Prompt 10a (D-161) — sale fields share the Section-3 slot (Rent & Deposit ↔ Sale toggle).
  listing_type: 3, sale_price: 3, price_negotiable: 3, expected_price_per_sqft: 3,
  possession_status: 3, possession_date: 3, rera_registration_number: 3, khata_type: 3, property_tax_paid_upto: 3,
  // Phase 1.5 addendum (D-166).
  move_in_charges_amount: 3, rent_brokerage_fixed_amount: 3, sale_brokerage_pct: 3,
  furnishing: 4, furnishing_detail: 4, bathrooms: 4, balconies: 4,
  amenities: 5, parking_2w: 5, parking_4w: 5,
  parking_2w_count: 5, parking_4w_count: 5, parking_notes: 5, water_storage: 5,
  utility_water_included: 5, utility_gas_included: 5, utility_electricity_included: 5, gas_type: 5,
  pet_policy: 6, building_rules: 6, building_notes: 6,
  youtube_walkthrough_url: 7,
};

// D-170: CustomItem removed — customs now live inside furnishing_detail with `custom: true`.

interface FormState {
  // Prompt 10a (D-161) — listing_type at the top of the form; Rent vs Sale gate.
  listing_type: string; // 'rent' | 'sale'
  lister_role: string;  // 'owner' | 'broker' | 'property_manager' | 'builder'
  // Section 1
  building_name: string;
  street_address: string;
  locality: string;
  city: string;
  state: string;
  pincode: string;
  landmark: string;                           // Prompt 8 — India field
  // Google Maps Phase 1 — address enrichment fields
  place_id: string | null;
  formatted_address: string | null;
  address_mode: 'google_place' | 'manual' | null;
  street_number: string | null;
  route: string | null;
  sublocality_1: string | null;
  sublocality_2: string | null;
  neighborhood: string | null;
  district: string | null;
  country: string | null;
  plus_code: string | null;
  viewport_ne_lat: number | null;
  viewport_ne_lng: number | null;
  viewport_sw_lat: number | null;
  viewport_sw_lng: number | null;
  latitude: number | null;
  longitude: number | null;
  streetview_available: boolean | null;
  streetview_pano_id: string | null;
  streetview_checked_at: string | null;
  streetview_show_in_listing: boolean;
  location_verified_by_owner: boolean;
  location_verified_at: string | null;
  lister_flat_number: string | null;
  // Section 2
  bhk: string;
  property_type: string;
  floor_number: string;
  total_floors: string;
  square_footage: string;
  super_built_up_area: string;                // P3
  facing: string;
  building_age_years: string;
  // Section 3
  listed_rent: string;
  security_deposit_amount: string;
  security_deposit_months: string;
  society_maintenance_approx: string;
  maintenance_included_in_rent: boolean;
  available_from: Date | undefined;
  notice_period_days: string;                 // P3 — replaces months on owner form
  lock_in_months: string;                     // P3
  annual_rent_increase_pct: string;           // Prompt 8 — India field
  // Phase 1.5 addendum (D-166) — move-in charges + rent brokerage.
  move_in_charges_amount: string;
  rent_brokerage_fixed_amount: string;
  // Prompt 10a — Sale-only fields (rendered when listing_type === 'sale').
  sale_price: string;
  price_negotiable: boolean;
  expected_price_per_sqft: string;
  possession_status: string;
  possession_date: Date | undefined;
  rera_registration_number: string;
  khata_type: string;
  property_tax_paid_upto: Date | undefined;
  // Phase 1.5 addendum (D-166) — sale brokerage.
  sale_brokerage_pct: string;
  // Section 4 (D-170: canonicalized to JSONB shape)
  furnishing: string;
  furnishing_detail: FurnishingDetailItem[];
  bathrooms: string;
  balconies: string;
  // Section 5 (D-170: flat array; custom items mixed with canonical)
  building_amenities: string[];
  parking_2w: string;
  parking_4w: string;
  parking_2w_count: string;                   // Prompt 8 — India field
  parking_4w_count: string;                   // Prompt 8 — India field
  parking_notes: string;                      // Prompt 8 — India field
  water_storage: string;                      // Prompt 8 — India field
  water_source: string[];                     // P3 — multi-select array
  main_door_lock_type: string;                // P3 — enum select
  water_included: boolean;
  gas_included: boolean;
  gas_type: string;
  electricity_included: boolean;
  // Section 6
  pet_policy: string;
  pet_policy_text: string;
  building_rules: string;
  building_notes: string;
  // Section 7
  youtube_walkthrough_url: string;
  // Section 9
  consent: boolean;
  terms_privacy_consent: boolean;
}

const INITIAL_STATE: FormState = {
  listing_type: "rent",
  lister_role: "owner",
  sale_price: "", price_negotiable: false, expected_price_per_sqft: "",
  possession_status: "", possession_date: undefined,
  rera_registration_number: "", khata_type: "", property_tax_paid_upto: undefined,
  sale_brokerage_pct: "",
  building_name: "", street_address: "", locality: "", city: "", state: "Karnataka",
  pincode: "", landmark: "",
  place_id: null, formatted_address: null, address_mode: null,
  street_number: null, route: null, sublocality_1: null, sublocality_2: null,
  neighborhood: null, district: null, country: null, plus_code: null,
  viewport_ne_lat: null, viewport_ne_lng: null, viewport_sw_lat: null, viewport_sw_lng: null,
  latitude: null, longitude: null,
  streetview_available: null, streetview_pano_id: null, streetview_checked_at: null,
  streetview_show_in_listing: false, location_verified_by_owner: false, location_verified_at: null,
  lister_flat_number: null,
  bhk: "", property_type: "", floor_number: "", total_floors: "", square_footage: "",
  super_built_up_area: "",
  facing: "", building_age_years: "",
  listed_rent: "", security_deposit_amount: "", security_deposit_months: "", society_maintenance_approx: "",
  maintenance_included_in_rent: false, available_from: undefined,
  notice_period_days: "", lock_in_months: "",
  annual_rent_increase_pct: "",
  move_in_charges_amount: "", rent_brokerage_fixed_amount: "",
  furnishing: "", furnishing_detail: [], bathrooms: "", balconies: "",
  building_amenities: [],
  parking_2w: "none", parking_4w: "none",
  parking_2w_count: "", parking_4w_count: "", parking_notes: "", water_storage: "",
  water_source: [], main_door_lock_type: "",
  water_included: false, gas_included: false, gas_type: "", electricity_included: false,
  pet_policy: "", pet_policy_text: "", building_rules: "", building_notes: "",
  youtube_walkthrough_url: "",
  consent: false,
  terms_privacy_consent: false,
};

interface PropertyImageRow {
  id: string;
  url: string;
  is_primary: boolean;
  is_floor_plan: boolean;
  section: string | null;
  sort_order: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const parseNum = (s: string): number | null => {
  if (s === "" || s == null) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

// D-170: buildFurnishingDetail + old buildAmenitiesJson removed — owner state
// now holds furnishing_detail directly (JSONB shape). Amenities JSONB derived
// via the shared @/types/property helper.

function truncate(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max - 1) + "…";
}

// Prefill form state from a properties row (or a properties row merged with
// pending edit values). Used by draft-resume and edit-mode initial load.
function prefillFormFromRow(d: Record<string, unknown>, setForm: React.Dispatch<React.SetStateAction<FormState>>) {
  const amenities = (d.amenities as { building?: string[]; furnishing_items?: string[] } | null) ?? {};
  const furnDetail = (d.furnishing_detail as FurnishingDetailItem[] | null) ?? [];
  setForm({
    building_name: (d.building_name as string) ?? "",
    street_address: (d.street_address as string) ?? "",
    locality: (d.locality as string) ?? "",
    city: (d.city as string) ?? "",
    state: (d.state as string) ?? "Karnataka",
    pincode: (d.pincode as string) ?? "",
    landmark: (d.landmark as string) ?? "",
    place_id: (d.place_id as string) ?? null,
    formatted_address: (d.formatted_address as string) ?? null,
    address_mode: (d.address_mode as 'google_place' | 'manual' | null) ?? null,
    street_number: (d.street_number as string) ?? null,
    route: (d.route as string) ?? null,
    sublocality_1: (d.sublocality_1 as string) ?? null,
    sublocality_2: (d.sublocality_2 as string) ?? null,
    neighborhood: (d.neighborhood as string) ?? null,
    district: (d.district as string) ?? null,
    country: (d.country as string) ?? null,
    plus_code: (d.plus_code as string) ?? null,
    viewport_ne_lat: d.viewport_ne_lat != null ? Number(d.viewport_ne_lat) : null,
    viewport_ne_lng: d.viewport_ne_lng != null ? Number(d.viewport_ne_lng) : null,
    viewport_sw_lat: d.viewport_sw_lat != null ? Number(d.viewport_sw_lat) : null,
    viewport_sw_lng: d.viewport_sw_lng != null ? Number(d.viewport_sw_lng) : null,
    latitude: d.latitude != null ? Number(d.latitude) : null,
    longitude: d.longitude != null ? Number(d.longitude) : null,
    streetview_available: d.streetview_available != null ? (d.streetview_available as boolean) : null,
    streetview_pano_id: (d.streetview_pano_id as string) ?? null,
    streetview_checked_at: (d.streetview_checked_at as string) ?? null,
    streetview_show_in_listing: (d.streetview_show_in_listing as boolean) ?? false,
    location_verified_by_owner: (d.location_verified_by_owner as boolean) ?? false,
    location_verified_at: (d.location_verified_at as string) ?? null,
    lister_flat_number: (d.lister_flat_number as string) ?? null,
    bhk: (d.bhk as string) ?? "",
    property_type: (d.property_type as string) ?? "",
    floor_number: d.floor_number != null ? String(d.floor_number) : "",
    total_floors: d.total_floors != null ? String(d.total_floors) : "",
    square_footage: d.square_footage != null ? String(d.square_footage) : "",
    super_built_up_area: d.super_built_up_area != null ? String(d.super_built_up_area) : "",
    facing: (d.facing as string) ?? "",
    building_age_years: d.building_age_years ? String(d.building_age_years) : "",
    listed_rent: d.listed_rent != null ? String(d.listed_rent) : "",
    security_deposit_amount: d.security_deposit_amount != null ? String(d.security_deposit_amount) : "",
    security_deposit_months: d.security_deposit_months != null ? String(d.security_deposit_months) : "",
    society_maintenance_approx: d.society_maintenance_approx != null ? String(d.society_maintenance_approx) : "",
    maintenance_included_in_rent: !!d.maintenance_included_in_rent,
    available_from: d.available_from ? new Date((d.available_from as string) + "T00:00:00") : undefined,
    notice_period_days: d.notice_period_days != null ? String(d.notice_period_days) : "",
    lock_in_months: d.lock_in_months != null ? String(d.lock_in_months) : "",
    annual_rent_increase_pct: d.annual_rent_increase_pct != null ? String(d.annual_rent_increase_pct) : "",
    // Phase 1.5 addendum (D-166).
    move_in_charges_amount: d.move_in_charges_amount != null ? String(d.move_in_charges_amount) : "",
    rent_brokerage_fixed_amount: d.rent_brokerage_fixed_amount != null ? String(d.rent_brokerage_fixed_amount) : "",
    furnishing: (d.furnishing as string) ?? "",
    furnishing_detail: furnDetail,
    bathrooms: d.bathrooms != null ? String(d.bathrooms) : "",
    balconies: d.balconies != null ? String(d.balconies) : "",
    building_amenities: amenities.building ?? [],
    parking_2w: (d.parking_2w as string) ?? "none",
    parking_4w: (d.parking_4w as string) ?? "none",
    parking_2w_count: d.parking_2w_count != null ? String(d.parking_2w_count) : "",
    parking_4w_count: d.parking_4w_count != null ? String(d.parking_4w_count) : "",
    parking_notes: (d.parking_notes as string) ?? "",
    water_storage: (d.water_storage as string) ?? "",
    water_source: Array.isArray(d.water_source) ? (d.water_source as string[]) : [],
    main_door_lock_type: (d.main_door_lock_type as string) ?? "",
    water_included: !!d.utility_water_included,
    gas_included: !!d.utility_gas_included,
    gas_type: (d.gas_type as string) ?? "",
    electricity_included: !!d.utility_electricity_included,
    pet_policy: (d.pet_policy as string) ?? "",
    pet_policy_text: "",
    building_rules: (d.building_rules as string) ?? "",
    building_notes: (d.building_notes as string) ?? "",
    youtube_walkthrough_url: (d.youtube_walkthrough_url as string) ?? "",
    consent: false,
    terms_privacy_consent: false,
    // Prompt 10a — rent/sale.
    listing_type: (d.listing_type as string) ?? "rent",
    lister_role: (d.lister_role as string) ?? "owner",
    sale_price: d.sale_price != null ? String(d.sale_price) : "",
    price_negotiable: !!d.price_negotiable,
    expected_price_per_sqft: d.expected_price_per_sqft != null ? String(d.expected_price_per_sqft) : "",
    possession_status: (d.possession_status as string) ?? "",
    possession_date: d.possession_date ? new Date((d.possession_date as string) + "T00:00:00") : undefined,
    rera_registration_number: (d.rera_registration_number as string) ?? "",
    khata_type: (d.khata_type as string) ?? "",
    property_tax_paid_upto: d.property_tax_paid_upto ? new Date((d.property_tax_paid_upto as string) + "T00:00:00") : undefined,
    sale_brokerage_pct: d.sale_brokerage_pct != null ? String(d.sale_brokerage_pct) : "",
  });
}

// Section-status computations
function computeSectionStatus(
  section: SectionNum,
  f: FormState,
  imageCount: number,
  errored: Set<SectionNum>,
  openedSections: Set<SectionNum>,
  loc: LocationReadiness,
): SectionStatus {
  const isErrored = errored.has(section);
  const complete = isSectionComplete(section, f, imageCount, openedSections, loc);
  if (complete) return "complete";
  if (isErrored) return "error";
  if (isSectionTouched(section, f, imageCount)) return "in_progress";
  return "not_started";
}

/**
 * Sections 5/6/8 have zero required fields. Per D-144 they stay ⚪ until the
 * user has opened them at least once OR entered any field. `openedSections`
 * carries the "opened" signal; `isSectionTouched` covers the "has data" signal.
 * Sections 1/2/3/4/7/9 have required fields → completion still derived from data.
 */
function isSectionComplete(
  section: SectionNum,
  f: FormState,
  imageCount: number,
  openedSections: Set<SectionNum>,
  loc: LocationReadiness,
): boolean {
  switch (section) {
    case 1: {
      // Prompt 3 P2 fix: explicit FINAL_READY OR LEGACY_READY, mirroring the M1 submit invariant.
      // Not complete until the persisted-location classification has hydrated (avoids a false ✓).
      if (loc.status !== "ready") return false;
      const needBuilding = isBuildingNameRequired(f.property_type);
      const buildingOk = !needBuilding || f.building_name.trim().length >= 2;
      if (!buildingOk || !f.location_verified_by_owner || f.latitude == null || f.longitude == null) return false;
      const finalReady = loc.kind === "final" && loc.discoveryConfirmed;
      const legacyReady = loc.kind === "legacy" && !!f.place_id && f.address_mode === "google_place";
      return finalReady || legacyReady;
    }
    case 2: return !!(f.bhk && f.property_type);
    case 3: {
      // Prompt 10a (D-161): Section-3 slot flips between Rent & Deposit and
      // Sale Details based on listing_type. Required-field set differs.
      if (f.listing_type === "sale") {
        const needsPossessionDate = f.possession_status === "under_construction";
        return !!(parseNum(f.sale_price) && f.possession_status && (!needsPossessionDate || f.possession_date));
      }
      return !!(parseNum(f.listed_rent) && parseNum(f.security_deposit_amount) && f.available_from);
    }
    case 4: return !!f.furnishing;
    case 5: return openedSections.has(5) || isSectionTouched(5, f, imageCount);
    case 6: return openedSections.has(6) || isSectionTouched(6, f, imageCount);
    case 7: return imageCount >= PHOTO_CONFIG.upload.minCount;
    case 9: return f.consent && f.terms_privacy_consent;
  }
}

function isSectionTouched(section: SectionNum, f: FormState, imageCount: number): boolean {
  switch (section) {
    case 1: return !!(f.building_name || f.place_id || f.locality || f.city);
    case 2: return !!(f.bhk || f.property_type || f.floor_number || f.total_floors || f.square_footage || f.facing || f.building_age_years);
    case 3: {
      if (f.listing_type === "sale") {
        return !!(f.sale_price || f.possession_status || f.possession_date || f.expected_price_per_sqft || f.rera_registration_number || f.khata_type || f.property_tax_paid_upto || f.price_negotiable);
      }
      return !!(f.listed_rent || f.security_deposit_amount || f.society_maintenance_approx || f.maintenance_included_in_rent || f.available_from);
    }
    case 4: return !!(f.furnishing || f.furnishing_detail.length || f.bathrooms || f.balconies);
    case 5: return !!(f.building_amenities.length || f.parking_2w !== "none" || f.parking_4w !== "none" || f.water_included || f.gas_included || f.electricity_included);
    case 6: return !!(f.pet_policy || f.building_rules || f.building_notes);
    case 7: return imageCount > 0 || !!f.youtube_walkthrough_url;
    case 9: return f.consent || f.terms_privacy_consent;
  }
}

function sectionSummary(section: SectionNum, f: FormState, images: PropertyImageRow[]): string {
  const t = (s: string) => truncate(s, 40);
  switch (section) {
    case 1: {
      const parts = [f.locality, f.city].filter(Boolean).join(", ");
      return t(parts + (f.pincode ? ` · ${f.pincode}` : ""));
    }
    case 2: {
      const bhk = BHK_OPTIONS.find((o) => o.value === f.bhk)?.label ?? "";
      const parts = [bhk];
      if (f.square_footage) parts.push(`${f.square_footage} sqft`);
      return t(parts.filter(Boolean).join(" · "));
    }
    case 3: {
      if (f.listing_type === "sale") {
        const price = parseNum(f.sale_price);
        const parts: string[] = [];
        if (price) parts.push(`₹${price.toLocaleString("en-IN")}`);
        if (f.possession_status) parts.push(f.possession_status.replace(/_/g, " "));
        return t(parts.join(" · "));
      }
      const rent = parseNum(f.listed_rent);
      const dep = parseNum(f.security_deposit_amount);
      const parts: string[] = [];
      if (rent) parts.push(`₹${rent.toLocaleString("en-IN")}/mo`);
      if (dep) parts.push(`₹${dep.toLocaleString("en-IN")} deposit`);
      return t(parts.join(" · "));
    }
    case 4: {
      const type = FURNISHING_OPTIONS.find((o) => o.value === f.furnishing)?.label ?? "";
      const count = f.furnishing_detail.filter((it) => !it.custom || it.item.trim()).length;
      return t([type, count ? `${count} items` : ""].filter(Boolean).join(" · "));
    }
    case 5: {
      const top = f.building_amenities.slice(0, 3).map((v) => BUILDING_AMENITIES.find((a) => a.value === v)?.label ?? v);
      return t(top.join(", "));
    }
    case 6: return "";
    case 7: return images.length ? `${images.length} photo${images.length === 1 ? "" : "s"}` : "";
    case 9: return "";
  }
}

// ─── Per-field owner status chip (Prompt 2b) ───────────────────────────────
type OwnerFieldStatus = "save_failed" | "needs_review" | "under_review" | "locked" | "saved" | null;

function FieldStatusChip({ status }: { status: OwnerFieldStatus }) {
  if (!status) return null;
  const map: Record<Exclude<OwnerFieldStatus, null>, { text: string; cls: string }> = {
    save_failed:  { text: "Didn't save", cls: "text-red-600" },
    needs_review: { text: "Needs review", cls: "text-amber-600" },
    under_review: { text: "Under review", cls: "text-amber-600" },
    locked:       { text: "Locked", cls: "text-muted-foreground" },
    saved:        { text: "✓ Saved live", cls: "text-green-600" },
  };
  const s = map[status];
  return <p className={cn("text-xs mt-1", s.cls)}>{s.text}</p>;
}

// ─── Component ────────────────────────────────────────────────────────────────

type EntryStatus =
  | "loading" | "create" | "draft" | "changes_requested"
  | "listed" | "edit_pending_review" | "blocked";

interface PendingEditRow {
  id: string;
  payload: {
    field_changes?: Record<string, unknown>;
    photo_changes?: { add?: unknown[]; delete?: string[]; update?: unknown[] };
  };
  rejection_reason_text?: string | null;
  rejection_reason?: string | null;
}

interface EditRequestPayload {
  field_changes: Record<string, unknown>;
  photo_changes: { add: unknown[]; delete: string[]; update: unknown[] };
}

const EMPTY_EDIT_PAYLOAD: EditRequestPayload = {
  field_changes: {},
  photo_changes: { add: [], delete: [], update: [] },
};

const SESSION_STORAGE_KEY = (propertyId: string) => `edit_draft:${propertyId}`;

export default function ListProperty() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, session, loading: authLoading } = useRequireAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const { id: idParam } = useParams<{ id?: string }>();
  const isEditMode = !!idParam;

  const draftIdFromQuery = searchParams.get("draft");
  const [propertyId, setPropertyId] = useState<string | null>(idParam ?? draftIdFromQuery);
  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [images, setImages] = useState<PropertyImageRow[]>([]);
  const [imagesLoading, setImagesLoading] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<Record<string, boolean>>({});
  const [openAccordion, setOpenAccordion] = useState<string>("section-1");
  const [erroredSections, setErroredSections] = useState<Set<SectionNum>>(new Set());
  // A1 (D-144) — sections user has opened at least once. Optional-only sections
  // stay ⚪ until they appear in this set OR any of their fields become truthy.
  // Initial section (1) auto-counted since the accordion opens on section-1.
  const [openedSections, setOpenedSections] = useState<Set<SectionNum>>(new Set([1]));
  const [showPreview, setShowPreview] = useState(false);
  const [showDraftLimit, setShowDraftLimit] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // Owner-limited custom-item editors report a genuine invalid edit still on screen;
  // submission is blocked while either is true (the invalid draft is buffered locally
  // and never reaches saveNow/patch, so the pending-changes gate can't catch it).
  const [furnishingDraftInvalid, setFurnishingDraftInvalid] = useState(false);
  const [amenitiesDraftInvalid, setAmenitiesDraftInvalid] = useState(false);
  // Owner-only public-text validation errors, keyed by field. Never blocks autosave.
  const [textErrors, setTextErrors] = useState<Record<string, string | null>>({});
  // True after the first failed Submit — shows the near-Submit field-count summary.
  const [showSubmitFieldSummary, setShowSubmitFieldSummary] = useState(false);
  // Prompt 2: true while a location replacement is being searched/reviewed but not yet
  // re-confirmed. Blocks Submit so an unconfirmed candidate can never be submitted.
  const [locationDirty, setLocationDirty] = useState(false);
  const [locationState, setLocationState] = useState<LocationReadiness>({ status: 'loading', kind: 'none', discoveryConfirmed: false, buildingSource: null, needsDiscoveryRoot: false });
  const draftCheckedRef = useRef(false);
  // Live mirror of `form` so async blur-validation can compare against the current
  // value (a closed-over `form` would be stale and defeat the stale-response guard).
  const formRef = useRef(form);
  useEffect(() => { formRef.current = form; }, [form]);
  const sectionCompletionRef = useRef<Record<SectionNum, boolean>>({ 1: false, 2: false, 3: false, 4: false, 5: false, 6: false, 7: false, 8: false, 9: false });

  // ── Edit-mode state ─────────────────────────────────────────────────────
  const [entryStatus, setEntryStatus] = useState<EntryStatus>(isEditMode ? "loading" : "create");
  const [pendingEdit, setPendingEdit] = useState<PendingEditRow | null>(null);
  const [editRequestPayload, setEditRequestPayload] = useState<EditRequestPayload>(EMPTY_EDIT_PAYLOAD);
  // Prompt 11: rejection state removed — RejectionPanel owns fetch + ack (D-141).
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [pendingRestore, setPendingRestore] = useState<{ field_changes: Record<string, unknown>; staged: Array<StagedPhoto & { temp_id: string }> } | null>(null);
  // Prompt 2a — staged photos (live-listing uploads, not yet reviewed), the normalized
  // server pending baseline, and per-field "Saved live" tracking.
  const [stagedPhotos, setStagedPhotos] = useState<Array<StagedPhoto & { temp_id: string }>>([]);
  const [pendingBaseline, setPendingBaseline] = useState<NormalizedReview | null>(null);
  const [savedLiveKeys, setSavedLiveKeys] = useState<Set<string>>(new Set());
  // Authoritative safe-live JSON baseline for amenities/furnishing splits; advanced when a
  // safe patch is QUEUED (S1/R7), reset on a failed/poisoned JSON save.
  const safeLiveRef = useRef<{ amenities: unknown; furnishing_detail: FurnishingDetailItem[] }>({ amenities: null, furnishing_detail: [] });
  // Current-live values of review SCALAR columns (for no-op/retract detection).
  const reviewScalarLiveRef = useRef<Record<string, unknown>>({});

  // Path A: draft/changes_requested — direct patch via useListingSave.
  // Path B: listed/edit_pending_review — accumulate in editRequestPayload; Submit via RPC.
  const path: "A" | "B" | null =
    entryStatus === "draft" || entryStatus === "changes_requested" ? "A" :
    entryStatus === "listed" || entryStatus === "edit_pending_review" ? "B" :
    entryStatus === "create" ? "A" : null;

  // Prompt 2a — status helpers + policy-based per-field locking.
  const isLiveListing = entryStatus === "listed" || entryStatus === "edit_pending_review";
  const isInitialEditable = entryStatus === "create" || entryStatus === "draft" || entryStatus === "changes_requested";
  // Whole-form freeze REMOVED for edit_pending_review — live listings edit per-field by policy.
  // pending_review/unlisted/archived never reach the form (blocked at load).
  const tierOneLocked = !isInitialEditable; // identity/address/listing_type/lister_role stay locked post-draft
  const addressEditable = isInitialEditable;
  // Per-field owner lock: only admin_only DB columns are read-only on a live listing.
  // bhk/property_type are REVIEW (editable); draft/create → never locked.
  const ownerFieldReadOnly = useCallback(
    (dbKey: string) => isLiveListing && getOwnerEditPolicy(dbKey) === "admin_only",
    [isLiveListing],
  );

  const { saveState, patch, saveNow, lastError, failureTick, hasPendingChanges, poisonedKeys } =
    useListingSave(propertyId);

  // ─── Submit-summary count + reset ───────────────────────────────────────
  const submitErrorCount = Object.values(textErrors).filter(Boolean).length;
  useEffect(() => {
    if (submitErrorCount === 0) setShowSubmitFieldSummary(false);
  }, [submitErrorCount]);

  // ─── Surface save failures as a toast (D-127) ────────────────────────────
  // Fires on every failure via failureTick — re-toasts even when the same
  // column keeps 400ing with the same message across retries.
  // Session-expired case is handled separately by the sessionExpired modal.
  useEffect(() => {
    if (failureTick === 0) return; // skip initial mount
    if (saveState === "session_expired") return;
    if (!lastError) return;
    // Intercept the Flat / Unit CHECK violation — show a friendly inline error
    // instead of the raw PostgreSQL constraint name.
    if (lastError.includes("properties_lister_flat_number_check")) {
      setTextErrors((e) => ({
        ...e,
        lister_flat_number: "Use only letters, numbers, spaces, hyphens and slashes. Max 10 characters.",
      }));
      setOpenAccordion("section-1");
      return;
    }
    toast({
      variant: "destructive",
      title: "Save failed",
      description: lastError,
    });
    // Also mark the currently-open section as errored so the ✅ turns red —
    // reconciles UI/DB divergence without a full DB re-read (Part B).
    const openMatch = openAccordion.match(/^section-(\d+)$/);
    if (openMatch) {
      const sec = Number(openMatch[1]) as SectionNum;
      setErroredSections((prev) => {
        if (prev.has(sec)) return prev;
        const next = new Set(prev);
        next.add(sec);
        return next;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [failureTick]);

  // ─── Mark sections owning poisoned columns as errored ────────────────────
  // Runs whenever poisonedKeys changes — including when keys are cleared by a
  // successful re-save (the section stays errored until the section is truly
  // clean; the user's next successful edit removes the key here).
  useEffect(() => {
    if (poisonedKeys.length === 0) return;
    setErroredSections((prev) => {
      const next = new Set(prev);
      let changed = false;
      for (const key of poisonedKeys) {
        const sec = DB_COLUMN_TO_SECTION[key];
        if (sec !== undefined && !next.has(sec)) {
          next.add(sec);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [poisonedKeys]);

  // ─── Draft-limit check on mount ──────────────────────────────────────────
  useEffect(() => {
    if (authLoading || !user?.id || draftCheckedRef.current || propertyId) return;
    draftCheckedRef.current = true;
    (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count } = await (supabase as any)
        .from("properties")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", user.id)
        .eq("status", "draft");
      if ((count ?? 0) >= DRAFT_LIMIT) {
        setShowDraftLimit(true);
      }
    })();
  }, [authLoading, user?.id, propertyId]);

  // ─── Location readiness (FINAL/LEGACY classification, mirrors M1) ─────────
  // Source of truth for section-1 completeness + OwnerLocationPin hydration. Reads the association
  // shape so a legacy draft is never mistaken for a final-committed-not-confirmed one.
  const loadLocationReadiness = useCallback(async (pid: string, buildingNameSource: unknown, discoveryConfirmedAt: unknown, locationConfirmedAt: unknown) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: assoc, error } = await (supabase as any)
      .from("property_geo_associations")
      .select("relationship, is_primary, geo_places(kind)")
      .eq("property_id", pid);
    if (error) return; // keep prior/loading — never silently classify as 'none' on a query error
    const rows = (assoc ?? []) as Array<{ relationship: string | null; is_primary: boolean; geo_places: { kind?: string } | null }>;
    const finalPrimaries = rows.filter((r) => r.relationship == null && r.is_primary === true && ["settlement", "search_region"].includes(r.geo_places?.kind ?? ""));
    const legacyPrimaries = rows.filter((r) => r.relationship === "primary_city");
    const kind: LocationReadiness["kind"] = finalPrimaries.length === 1 ? "final" : legacyPrimaries.length === 1 ? "legacy" : "none";
    // Exact location is confirmed in DB but no canonical root settlement exists.
    const needsDiscoveryRoot =
      locationConfirmedAt != null &&
      finalPrimaries.length === 0 &&
      legacyPrimaries.length === 0;
    setLocationState({ status: "ready", kind, discoveryConfirmed: !!discoveryConfirmedAt, buildingSource: (buildingNameSource as BuildingSource) ?? null, needsDiscoveryRoot });
  }, []);

  // Fresh create with nothing persisted yet → ready/none immediately (no async classification needed).
  useEffect(() => {
    if (!isEditMode && !draftIdFromQuery && !propertyId) {
      setLocationState({ status: "ready", kind: "none", discoveryConfirmed: false, buildingSource: null, needsDiscoveryRoot: false });
    }
  }, [isEditMode, draftIdFromQuery, propertyId]);

  // ─── Load property in edit mode (URL /list/:id) ──────────────────────────
  useEffect(() => {
    if (!isEditMode || !idParam || !user?.id) return;
    (async () => {
      const { data: _propRows } = await supabase.rpc("get_owner_property", { p_property_id: idParam });
      const prop = (_propRows ?? [])[0] ?? null;
      if (!prop) {
        toast({ title: "Property not found", variant: "destructive" });
        navigate("/owner-dashboard", { replace: true });
        return;
      }
      if (prop.owner_id !== user.id) {
        toast({ title: "You can only edit your own properties.", variant: "destructive" });
        navigate("/owner-dashboard", { replace: true });
        return;
      }
      const status = prop.status as string;
      // Gate: only draft/changes_requested/listed/edit_pending_review are editable.
      if (!["draft", "changes_requested", "listed", "edit_pending_review"].includes(status)) {
        const msg: Record<string, string> = {
          pending_review: "Your listing is under review — withdraw it first to edit as draft.",
          unlisted: "Re-list this property before making changes.",
          archived: "Property archived. Contact support to restore.",
        };
        toast({ title: msg[status] ?? "This property cannot be edited right now.", variant: "destructive" });
        navigate("/owner-dashboard", { replace: true });
        setEntryStatus("blocked");
        return;
      }
      // Prompt 2a — capture the LIVE baseline (before merging any pending proposal) for
      // amenities/furnishing splits, scalar no-op detection, and dirty comparison.
      if (status === "listed" || status === "edit_pending_review") {
        reviewScalarLiveRef.current = {
          building_notes: prop.building_notes, building_rules: prop.building_rules,
          parking_notes: prop.parking_notes, rera_registration_number: prop.rera_registration_number,
          youtube_walkthrough_url: prop.youtube_walkthrough_url, bhk: prop.bhk, property_type: prop.property_type,
        };
        safeLiveRef.current = {
          amenities: (prop.amenities ?? null) as unknown,
          furnishing_detail: (prop.furnishing_detail as unknown as FurnishingDetailItem[]) ?? [],
        };
      }

      // Load + hydrate the pending review request (edit_pending_review only).
      let pending: PendingEditRow | null = null;
      const proposedScalars: Record<string, unknown> = {};
      let addAmenities: string[] = [];
      let addFurnishing: FurnishingDetailItem[] = [];
      if (status === "edit_pending_review") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: pendingRow } = await (supabase as any)
          .from("property_edit_requests")
          .select("id, payload")
          .eq("property_id", idParam)
          .eq("status", "pending")
          .maybeSingle();
        if (pendingRow) {
          pending = pendingRow as PendingEditRow;
          setPendingEdit(pending);
          const hydrated = hydratePersistedReviewPayload(pending.payload);
          const draftFc = hydrated.draftFc;
          addAmenities = hydrated.addAmenities;
          addFurnishing = hydrated.addFurnishing as FurnishingDetailItem[];
          Object.assign(proposedScalars, hydrated.proposedScalars);
          const staged = hydrated.staged;
          setEditRequestPayload({ field_changes: draftFc, photo_changes: { add: [], delete: [], update: [] } });
          setStagedPhotos(staged);
          const liveBaseline: ReviewLiveBaseline = {
            scalars: reviewScalarLiveRef.current,
            amenities: safeLiveRef.current.amenities as { building?: string[] } | null,
            furnishing_detail: safeLiveRef.current.furnishing_detail,
          };
          setPendingBaseline(normalizeReviewPayload(draftFc, staged, liveBaseline));
        }
      }
      // Prompt 11: rejection reason fetch + ack query moved into RejectionPanel (D-141).

      // Merge only proposed SCALARS for display (live values otherwise).
      const merged = pending ? { ...prop, ...proposedScalars } : prop;
      prefillFormFromRow(merged, setForm);
      void loadLocationReadiness(prop.id, prop.building_name_source, prop.discovery_confirmed_at, prop.location_confirmed_at);
      // Surface pending custom additions in the editors (display only).
      if (addAmenities.length || addFurnishing.length) {
        setForm((f) => ({
          ...f,
          building_amenities: [...f.building_amenities, ...addAmenities.filter((a) => !f.building_amenities.includes(a))],
          furnishing_detail: [...f.furnishing_detail, ...addFurnishing],
        }));
      }
      setEntryStatus(status as EntryStatus);
      setPropertyId(idParam);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode, idParam, user?.id]);

  // ─── Load draft from ?draft= query on mount (create-mode resume) ─────────
  // Fires ONCE per mount, only if the query param was present on initial load.
  // D-127 fix: previously this re-ran when createDraft set ?draft=<newId>,
  // re-fetching the just-inserted row (with only the 6 threshold fields) and
  // clobbering everything the owner had typed after crossing the threshold.
  const draftInitialResumeRef = useRef<string | null>(null);
  useEffect(() => {
    if (isEditMode || !user?.id) return;
    // Latch: capture whatever draftIdFromQuery was on the FIRST render where
    // user became available. Subsequent draftIdFromQuery changes (from
    // createDraft's setSearchParams) do not retrigger the fetch.
    if (draftInitialResumeRef.current !== null) return;
    if (!draftIdFromQuery) {
      draftInitialResumeRef.current = ""; // mark as "checked, nothing to load"
      return;
    }
    draftInitialResumeRef.current = draftIdFromQuery;
    (async () => {
      const { data: _resumeRows } = await supabase.rpc("get_owner_property", { p_property_id: draftIdFromQuery });
      const data = (_resumeRows ?? [])[0] ?? null;
      if (!data) return;
      prefillFormFromRow(data as Record<string, unknown>, setForm);
      void loadLocationReadiness(data.id, data.building_name_source, data.discovery_confirmed_at, data.location_confirmed_at);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, isEditMode]);

  // ─── Load images when propertyId known ───────────────────────────────────
  useEffect(() => {
    if (!propertyId) return;
    setImagesLoading(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("property_images")
      .select("id, url, is_primary, is_floor_plan, section, sort_order")
      .eq("property_id", propertyId)
      .order("section", { ascending: true, nullsFirst: true })
      .order("sort_order", { ascending: true })
      .then(({ data }: { data: PropertyImageRow[] | null }) => {
        if (data) setImages(data);
        setImagesLoading(false);
      });
  }, [propertyId]);

  // ─── Derived: section statuses + required-complete count ─────────────────
  const sectionStatuses = useMemo(() => {
    const map = {} as Record<SectionNum, SectionStatus>;
    for (const s of [1, 2, 3, 4, 5, 6, 7, 8, 9] as SectionNum[]) {
      map[s] = computeSectionStatus(s, form, images.length, erroredSections, openedSections, locationState);
    }
    return map;
  }, [form, images.length, erroredSections, openedSections, locationState]);

  const requiredComplete = REQUIRED_SECTIONS.filter((s) => sectionStatuses[s] === "complete").length;

  // ─── Fire commons_listing_section_completed on transitions ───────────────
  useEffect(() => {
    for (const s of [1, 2, 3, 4, 5, 6, 7, 8, 9] as SectionNum[]) {
      const nowComplete = sectionStatuses[s] === "complete";
      const wasComplete = sectionCompletionRef.current[s];
      sectionCompletionRef.current[s] = nowComplete;
    }
    // Also clear an errored section once it becomes complete
    if (erroredSections.size > 0) {
      let changed = false;
      const next = new Set(erroredSections);
      for (const s of erroredSections) {
        if (sectionStatuses[s] === "complete") { next.delete(s); changed = true; }
      }
      if (changed) setErroredSections(next);
    }
  }, [sectionStatuses, erroredSections]);

  // ─── Field patcher (Prompt 2a: risk-based routing) ───────────────────────
  const markSavedLive = useCallback((dbKeys: string[]) => {
    setSavedLiveKeys((prev) => { const n = new Set(prev); for (const k of dbKeys) n.add(k); return n; });
  }, []);

  // Removal-asymmetric CLEAR of a review field: resolve any pending proposal FIRST,
  // then live-clear. Never leave a stale proposal that could restore the value (S5/R16).
  const resolveReviewClear = useCallback(async (dbKey: string, payload: Record<string, unknown>) => {
    // 1) drop any UNSENT proposal for this key.
    setEditRequestPayload((prev) => {
      if (!(dbKey in prev.field_changes)) return prev;
      const fc = { ...prev.field_changes }; delete fc[dbKey];
      return { ...prev, field_changes: fc };
    });
    // 2) if the key is also part of the server pending request, supersede/cancel WITHOUT it first.
    if (propertyId && pendingBaseline && dbKey in pendingBaseline.scalars) {
      const remainingScalars = { ...pendingBaseline.scalars }; delete remainingScalars[dbKey];
      const remaining: NormalizedReview = {
        scalars: remainingScalars,
        amenities_add: pendingBaseline.amenities_add,
        furnishing_add: pendingBaseline.furnishing_add,
        photo_add: pendingBaseline.photo_add,
      };
      try {
        if (isReviewEmpty(remaining)) {
          const { error } = await (supabase as any).rpc("cancel_pending_edit_request", { p_property_id: propertyId });
          if (error) throw error;
          setPendingEdit(null); setPendingBaseline(null); setEntryStatus("listed");
        } else {
          const args = toSubmitArgs(remaining);
          const { error } = await (supabase as any).rpc("submit_property_edit_request", {
            p_property_id: propertyId, p_field_changes: args.p_field_changes, p_photo_changes: args.p_photo_changes,
          });
          if (error) throw error;
          setPendingBaseline(remaining);
        }
      } catch (e) {
        // Failed — retain the previous value (do not show a clear that never persisted).
        toast({ title: "Couldn't update the pending review", description: (e as Error).message, variant: "destructive" });
        return;
      }
    }
    // 3) live-clear.
    patch(payload); markSavedLive([dbKey]);
  }, [propertyId, pendingBaseline, patch, markSavedLive, toast]);

  const updateField = useCallback(<K extends keyof FormState>(key: K, value: FormState[K], dbPatch?: Record<string, unknown>) => {
    const rawPayload = dbPatch ?? mapFieldToDb(key, value);
    const payload: Record<string, unknown> = {};
    if (rawPayload) for (const [k, v] of Object.entries(rawPayload)) payload[k] = v instanceof Date ? format(v, "yyyy-MM-dd") : v;
    const dbKeys = Object.keys(payload);

    // Draft/create/changes_requested → direct save (initial-listing flow, unchanged).
    if (!isLiveListing) {
      setForm((prev) => ({ ...prev, [key]: value }));
      setTextErrors((e) => (e[key as string] ? { ...e, [key as string]: null } : e));
      if (key === "lister_flat_number") {
        const err = validateFlatNumber(value as string | null);
        if (err) {
          setTextErrors((e) => ({ ...e, lister_flat_number: err }));
          return; // invalid — do NOT reach patch()
        }
        // Valid — textErrors already cleared above; showSubmitFieldSummary resets via effect.
      }
      if (dbKeys.length) patch(payload);
      return;
    }

    // Live listing → route by policy of the DB key(s) BEFORE mutating local state (R1).
    const policy = dbKeys.length ? getOwnerEditPolicyForPayload(dbKeys) : "live";
    if (policy === "admin_only") return; // locked — no local mutation, no write
    setForm((prev) => ({ ...prev, [key]: value }));
    setTextErrors((e) => (e[key as string] ? { ...e, [key as string]: null } : e));
    if (!dbKeys.length) return;

    if (policy === "live") { patch(payload); markSavedLive(dbKeys); return; }

    // review — clear-is-live for a single removal-asymmetric text key
    if (dbKeys.length === 1 && OWNER_REVIEW_CLEAR_IS_LIVE.has(dbKeys[0])) {
      const v = payload[dbKeys[0]];
      if (v == null || (typeof v === "string" && v.trim() === "")) { void resolveReviewClear(dbKeys[0], payload); return; }
    }
    // review add/replace → buffer only (never PATCH)
    setEditRequestPayload((prev) => ({ ...prev, field_changes: { ...prev.field_changes, ...payload } }));
  }, [isLiveListing, patch, markSavedLive, resolveReviewClear]);

  // Amenities/furnishing change (S4): compose the ENTIRE safe-live representation together,
  // route new customs to the review buffer, advance safeLiveRef on queue (never leak an
  // unsent custom into the live PATCH). Draft/create → wholesale direct save (unchanged).
  const applyJsonbChange = useCallback((nextFurnishing: FurnishingDetailItem[], nextBuilding: string[]) => {
    if (!isLiveListing) {
      patch({ furnishing_detail: nextFurnishing, amenities: buildAmenitiesJson(nextBuilding, nextFurnishing) });
      return;
    }
    const proposedAmenities = buildAmenitiesJson(nextBuilding, nextFurnishing);
    const fSplit = splitFurnishingChange(safeLiveRef.current.furnishing_detail, nextFurnishing);
    const aSplit = splitAmenitiesChange(safeLiveRef.current.amenities, proposedAmenities);
    const safeFurnishing = fSplit.live as unknown as FurnishingDetailItem[];
    // furnishing_items derived ONLY from safe-live furnishing (never stale, no unsent custom leak).
    const safeAmenities = buildAmenitiesJson(aSplit.live.building, safeFurnishing);
    patch({ furnishing_detail: safeFurnishing, amenities: safeAmenities });
    markSavedLive(["furnishing_detail", "amenities"]);
    // advance safe-live ref ON QUEUE (S1/R7).
    safeLiveRef.current = { amenities: safeAmenities, furnishing_detail: safeFurnishing };
    // buffer new customs into the review draft (additions only).
    setEditRequestPayload((prev) => {
      const fc = { ...prev.field_changes };
      if (fSplit.newCustomItems.length) fc.furnishing_add = fSplit.newCustomItems; else delete fc.furnishing_add;
      if (aSplit.newCustomBuilding.length) fc.amenities_add = aSplit.newCustomBuilding; else delete fc.amenities_add;
      return { ...prev, field_changes: fc };
    });
  }, [isLiveListing, patch, markSavedLive]);

  // R18 — if a live amenities/furnishing save fails/poisons, reconcile authoritative JSON:
  // refetch, reset safeLiveRef, and rebuild the editor form as (authoritative live-safe +
  // still-valid unsent reviewed additions) so the UI never shows a state that isn't live.
  useEffect(() => {
    if (!isLiveListing || !propertyId) return;
    if (!(poisonedKeys.includes("amenities") || poisonedKeys.includes("furnishing_detail"))) return;
    (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any).from("properties").select("amenities, furnishing_detail").eq("id", propertyId).maybeSingle();
      if (!data) return;
      const liveFd = (data.furnishing_detail as FurnishingDetailItem[]) ?? [];
      const liveBuilding = ((data.amenities as { building?: string[] } | null)?.building ?? []) as string[];
      safeLiveRef.current = { amenities: (data.amenities ?? null) as unknown, furnishing_detail: liveFd };
      const addA = (editRequestPayload.field_changes.amenities_add as string[] | undefined) ?? [];
      const addF = (editRequestPayload.field_changes.furnishing_add as FurnishingDetailItem[] | undefined) ?? [];
      setForm((f) => ({
        ...f,
        building_amenities: [...liveBuilding, ...addA.filter((a) => !liveBuilding.includes(a))],
        furnishing_detail: [...liveFd, ...addF],
      }));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poisonedKeys, isLiveListing, propertyId]);

  // ─── Owner public-text validation (blur + submit) ────────────────────────
  // Server-validate one text field on blur. Applies the result only if the field's
  // current value still matches what was validated (stale-response guard via ref).
  const runFieldValidation = useCallback(async (field: ServerTextField) => {
    const validated = formRef.current[field] as string;
    const res = await validatePropertyFieldText(field, validated);
    if (formRef.current[field] !== validated) return; // superseded by a newer edit
    if (res.ok) {
      setTextErrors((e) => ({ ...e, [field]: null }));
    } else if (res.ok === false && res.error !== null) {
      setTextErrors((e) => ({ ...e, [field]: res.error }));
    } else {
      // Network / unknown failure — toast, keep field un-errored inline.
      setTextErrors((e) => ({ ...e, [field]: null }));
      toast({
        variant: "destructive",
        title: "Couldn't validate",
        description: "Check your connection and try again.",
      });
    }
  }, [toast]);

  // YouTube validation is local/sync (never the RPC — a URL trips CONTAINS_URL).
  const runYoutubeValidation = useCallback(() => {
    const res = validateYoutubeUrl(formRef.current.youtube_walkthrough_url);
    setTextErrors((e) => ({
      ...e,
      youtube_walkthrough_url:
        res.ok === false ? YOUTUBE_MESSAGE[res.reason] : null,
    }));
    return res.ok;
  }, []);

  // ─── Trusted location (OwnerLocationPin → confirm-property-location Edge) ──
  // Prompt 2: canonical geography is written ONLY by the confirm-property-location Edge
  // Function. The client no longer autosaves location. This callback fires AFTER a
  // successful atomic server confirm — it updates local form state for display + section /
  // submit gating (the DB is already the source of truth).
  // Called immediately after commit_pin succeeds (before confirmDiscovery). Updates local form state
  // from the trusted commit summary. Do NOT write to DB — the Edge already persisted those columns.
  const handleLocationPersisted = useCallback((
    s: ConfirmedLocationSummary,
    { needsDiscoveryRoot }: { needsDiscoveryRoot: boolean },
  ) => {
    const ff = s.freshFactual ?? {};
    setForm((f) => ({
      ...f,
      place_id: s.place_id,
      formatted_address: s.formatted_address ?? '',
      building_name: s.building_name ?? '',
      latitude: s.latitude,
      longitude: s.longitude,
      // Factual address fields — sourced from Edge-persisted factual payload
      city: (ff.city ?? '') as string,
      locality: (ff.locality ?? '') as string,
      state: (ff.state ?? '') as string,
      pincode: (ff.pincode ?? '') as string,
      country: (ff.country ?? null) as string | null,
      district: (ff.district ?? null) as string | null,
      sublocality_1: (ff.sublocality_1 ?? null) as string | null,
      sublocality_2: (ff.sublocality_2 ?? null) as string | null,
      neighborhood: (ff.neighborhood ?? null) as string | null,
      route: (ff.route ?? null) as string | null,
      street_number: (ff.street_number ?? null) as string | null,
      street_address: (ff.street_address ?? '') as string,
      plus_code: (ff.plus_code ?? null) as string | null,
      address_mode: s.place_id ? 'google_place' : 'manual',
      location_verified_by_owner: true,
      ...(s.freshStreetViewAvailable !== undefined
        ? { streetview_available: s.freshStreetViewAvailable }
        : {}),
    }));
    setLocationState((prev) => ({
      ...prev,
      status: 'ready',
      kind: needsDiscoveryRoot ? 'none' : 'final',
      discoveryConfirmed: false,
      buildingSource: s.building_source,
      needsDiscoveryRoot,
    }));
  }, [setForm]);

  // Called only when confirmDiscovery also succeeded (fully confirmed). At this point
  // handleLocationPersisted has already updated the form fields — only update locationState.
  const handleLocationConfirmed = useCallback((s: ConfirmedLocationSummary) => {
    setLocationState({ status: 'ready', kind: 'final', discoveryConfirmed: true, buildingSource: s.building_source, needsDiscoveryRoot: false });
  }, []);

  // Ensure a minimal locationless draft exists (single draft creator) so the trusted
  // location flow + photo uploads have a property_id. building_name is nullable (Prompt 2).
  const ensureDraft = useCallback(async (): Promise<string | null> => {
    if (propertyId) return propertyId;
    if (!user?.id) return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('properties')
      .insert({ owner_id: user.id, status: 'draft', is_active: false, lister_role: form.lister_role || 'owner', property_type: form.property_type || null })
      .select('id')
      .maybeSingle();
    if (error || !data) {
      if (/Draft limit/.test(error?.message ?? '')) { setShowDraftLimit(true); return null; }
      toast({ title: 'Save failed', description: error?.message ?? 'Could not start your draft.', variant: 'destructive' });
      return null;
    }
    setPropertyId(data.id);
    setSearchParams({ draft: data.id }, { replace: true });
    return data.id;
  }, [propertyId, user?.id, form.lister_role, form.property_type, setSearchParams, toast]);

  // ─── Photos (Prompt 2a) ──────────────────────────────────────────────────
  // Refetch authoritative rows after any DB-authoritative live mutation (S6/R6).
  const reloadImages = useCallback(async () => {
    if (!propertyId) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from("property_images")
      .select("id, url, is_primary, is_floor_plan, section, sort_order")
      .eq("property_id", propertyId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (Array.isArray(data)) setImages(data as PropertyImageRow[]);
  }, [propertyId]);

  const uploadPhoto = useCallback(async (file: File, section: string): Promise<"uploaded" | "limit_reached" | "failed"> => {
    if (!propertyId || !session?.access_token) return "failed";
    // Max-count guard counts live images + staged (R9).
    if (images.length + stagedPhotos.length >= PHOTO_CONFIG.upload.maxCount) {
      toast({ title: `Maximum ${PHOTO_CONFIG.upload.maxCount} photos reached`, variant: "destructive" });
      return "limit_reached";
    }
    const key = `${section}-${file.name}-${Date.now()}`;
    setUploadingFiles((p) => ({ ...p, [key]: true }));

    const processed = await processPhotoForUpload(file);
    if (processed.ok === false) {
      const messages: Record<string, string> = {
        too_large: "Photo too big — max 15 MB",
        unsupported_format: "Format not supported — please use JPG, PNG, WebP or HEIC",
        heic_conversion_failed: "Couldn't convert your iPhone photo — please try a JPG",
        compression_failed: "Photo processing failed — please try another photo",
      };
      toast({ title: messages[processed.error.kind] ?? "Photo failed", variant: "destructive" });
      setUploadingFiles((p) => { const n = { ...p }; delete n[key]; return n; });
      return "failed";
    }

    try {
      const formData = new FormData();
      formData.append("file", processed.file);
      formData.append("property_id", propertyId);
      formData.append("section", section);
      formData.append("is_floor_plan", section.toLowerCase() === "floor plan" ? "true" : "false");
      const res = await fetch(`${SUPABASE_URL}/functions/v1/upload-property-image`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData,
      });
      const json = await res.json();
      if (!json.success) {
        if (json.code === "PHOTO_LIMIT_REACHED") {
          toast({ title: "Maximum 15 photos allowed.", variant: "destructive" });
          return "limit_reached";
        }
        toast({ title: json.error || "Upload failed", variant: "destructive" });
        return "failed";
      }

      if (json.staged) {
        // Live listing: R2-only staged photo → pending review (no live row).
        setStagedPhotos((prev) => [...prev, {
          temp_id: (globalThis.crypto?.randomUUID?.() ?? `s-${Date.now()}-${Math.random()}`),
          url: json.url, section: json.section ?? section, is_floor_plan: !!json.is_floor_plan,
        }]);
      } else {
        // Draft/changes_requested: direct row (initial listing).
        setImages((prev) => [...prev, {
          id: json.id, url: json.url, is_primary: false,
          is_floor_plan: section.toLowerCase() === "floor plan", section, sort_order: 0,
        }]);
        const prevHadPrimary = images.some((i) => i.is_primary);
        await ensurePrimaryPhoto(propertyId, json.id);
        if (!prevHadPrimary) setImages((prev) => prev.map((i) => (i.id === json.id ? { ...i, is_primary: true } : i)));
      }
      return "uploaded";
    } catch {
      toast({ title: "Network error uploading photo", variant: "destructive" });
      return "failed";
    } finally {
      setUploadingFiles((p) => { const n = { ...p }; delete n[key]; return n; });
    }
  }, [propertyId, session?.access_token, images, stagedPhotos.length, toast]);

  // Delete an APPROVED (live) photo — DB-authoritative via the edge fn (min-3 + cover
  // promotion handled server-side), then resync from DB.
  const deletePhoto = useCallback(async (imageId: string) => {
    if (!propertyId || !session?.access_token) return;
    const res = await fetch(`${SUPABASE_URL}/functions/v1/delete-property-image`, {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ image_id: imageId, property_id: propertyId }),
    });
    const json = await res.json();
    if (json.success) { await reloadImages(); }
    else { toast({ title: json.error || "Delete failed", description: json.detail, variant: "destructive" }); }
  }, [propertyId, session?.access_token, toast, reloadImages]);

  // Best-effort staged R2 cleanup for a set of URLs (used by remove/cancel/discard).
  const stagedDeleteUrls = useCallback(async (urls: string[]) => {
    if (!propertyId || !session?.access_token) return;
    for (const url of urls) {
      try {
        await fetch(`${SUPABASE_URL}/functions/v1/delete-property-image`, {
          method: "POST",
          headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ staged_url: url, property_id: propertyId }),
        });
      } catch { /* best-effort */ }
    }
  }, [propertyId, session?.access_token]);

  // Remove a staged photo. If it's already referenced by the server pending request,
  // supersede WITHOUT it first (Prompt 1 blocks deleting a still-referenced staged URL).
  const removeStagedPhoto = useCallback(async (tempId: string) => {
    const item = stagedPhotos.find((s) => s.temp_id === tempId);
    if (!item) return;
    const referenced = !!pendingBaseline && pendingBaseline.photo_add.some((p) => p.url === item.url);
    if (referenced && propertyId) {
      const remaining: NormalizedReview = {
        scalars: pendingBaseline!.scalars,
        amenities_add: pendingBaseline!.amenities_add,
        furnishing_add: pendingBaseline!.furnishing_add,
        photo_add: pendingBaseline!.photo_add.filter((p) => p.url !== item.url),
      };
      try {
        if (isReviewEmpty(remaining)) {
          const { error } = await (supabase as any).rpc("cancel_pending_edit_request", { p_property_id: propertyId });
          if (error) throw error;
          setPendingEdit(null); setPendingBaseline(null); setEntryStatus("listed");
        } else {
          const args = toSubmitArgs(remaining);
          const { error } = await (supabase as any).rpc("submit_property_edit_request", {
            p_property_id: propertyId, p_field_changes: args.p_field_changes, p_photo_changes: args.p_photo_changes,
          });
          if (error) throw error;
          setPendingBaseline(remaining);
        }
      } catch (e) {
        toast({ title: "Couldn't update the pending review", description: (e as Error).message, variant: "destructive" });
        return; // keep the photo in the pending UI
      }
    }
    await stagedDeleteUrls([item.url]);
    setStagedPhotos((prev) => prev.filter((s) => s.temp_id !== tempId));
  }, [stagedPhotos, pendingBaseline, propertyId, stagedDeleteUrls, toast]);

  // Cover change on a live listing — transactional RPC, then resync (S6).
  const setPrimaryPhoto = useCallback(async (imageId: string) => {
    if (!isLiveListing) {
      // draft/create: direct (allowed) — set + refetch.
      try { await setPrimaryPhotoViaRpc(imageId); } catch { /* draft path: fall through to direct */
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any).from("property_images").update({ is_primary: false }).eq("property_id", propertyId);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any).from("property_images").update({ is_primary: true }).eq("id", imageId);
      }
      await reloadImages();
      return;
    }
    try { await setPrimaryPhotoViaRpc(imageId); await reloadImages(); }
    catch (e) { toast({ title: "Couldn't set cover photo", description: (e as Error).message, variant: "destructive" }); }
  }, [isLiveListing, propertyId, reloadImages, toast]);

  // Reorder approved photos — sort_order-only (DB permits exactly this column live).
  const reorderPhoto = useCallback(async (imageId: string, dir: -1 | 1) => {
    const ordered = [...images].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    const idx = ordered.findIndex((i) => i.id === imageId);
    const swapIdx = idx + dir;
    if (idx < 0 || swapIdx < 0 || swapIdx >= ordered.length) return;
    const a = ordered[idx], b = ordered[swapIdx];
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const r1 = await (supabase as any).from("property_images").update({ sort_order: swapIdx }).eq("id", a.id);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const r2 = await (supabase as any).from("property_images").update({ sort_order: idx }).eq("id", b.id);
      if (r1.error || r2.error) throw (r1.error || r2.error);
      await reloadImages();
    } catch { toast({ title: "Couldn't reorder", variant: "destructive" }); await reloadImages(); }
  }, [images, reloadImages, toast]);

  // ─── Submit for review ───────────────────────────────────────────────────
  const submit = useCallback(async () => {
    if (!propertyId || submitting) return;

    // Prompt 2: never submit while a location replacement is unconfirmed.
    if (locationDirty) {
      setErroredSections((s) => new Set(s).add(1));
      setOpenAccordion("section-1");
      toast({ title: "Confirm your property location before submitting", variant: "destructive" });
      setTimeout(() => document.getElementById("section-1-header")?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
      return;
    }

    // Block BEFORE any save / status write / edit-request RPC while a custom
    // furniture or amenity row holds a genuine invalid edit. The invalid draft is
    // buffered inside EditableCustomName and never reaches saveNow/patch, so without
    // this gate Submit would silently persist the previous committed value.
    if (furnishingDraftInvalid || amenitiesDraftInvalid) {
      const sec: SectionNum = furnishingDraftInvalid ? 4 : 5;
      setErroredSections(new Set([sec]));
      setOpenAccordion(`section-${sec}`);
      toast({ title: "Fix the highlighted custom item before submitting", variant: "destructive" });
      setTimeout(() => {
        document.getElementById(`section-${sec}-header`)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
      return;
    }

    // Normalize lister_flat_number before flush.
    // Validate first — only patch if the trimmed value is valid (prevents an invalid
    // trimmed value from reaching Supabase). form.lister_flat_number is not used in
    // any status-change RPC payload; values reach the DB only via patch/saveNow.
    const normalizedFlatNumber = form.lister_flat_number?.trim() || null;
    const flatNumberError = validateFlatNumber(normalizedFlatNumber);
    if (!flatNumberError && normalizedFlatNumber !== form.lister_flat_number) {
      setForm((prev) => ({ ...prev, lister_flat_number: normalizedFlatNumber }));
      patch({ lister_flat_number: normalizedFlatNumber });
    }

    // Flush any pending edits first
    await saveNow();

    // Path A only: block submit if auto-save is currently failing or has
    // unpersisted changes. Otherwise the DB row is stale and the server
    // trigger reports the generic "required fields missing" message that
    // hides the real cause (D-127 root cause: silent 400 → false ✅ UI).
    if (path !== "B") {
      const blocked =
        saveState === "failed" ||
        saveState === "session_expired" ||
        hasPendingChanges() ||
        poisonedKeys.length > 0;
      if (blocked) {
        toast({
          variant: "destructive",
          title: "Save failed — cannot submit",
          description: poisonedKeys.length > 0
            ? `These fields didn't save: ${poisonedKeys.map((k) => k === "lister_flat_number" ? "Flat / Unit number" : k).join(", ")}. Fix them in the highlighted section and try again.`
            : lastError ??
              "Some of your changes did not save. Fix the highlighted section and try again.",
        });
        return;
      }
    }

    // Client-side gate: all required sections complete
    const missing = REQUIRED_SECTIONS.filter((s) => sectionStatuses[s] !== "complete");
    if (missing.length > 0) {
      setErroredSections(new Set(missing));
      const first = missing[0];
      setOpenAccordion(`section-${first}`);
      const sectionNames: Record<SectionNum, string> = {
        1: "Where is your property?", 2: "The basics", 3: "Rent & Deposit",
        4: "What's inside", 5: "Building", 6: "Rules", 7: "Photos",
        8: "Description", 9: "Final checks",
      };
      toast({ title: `Complete "${sectionNames[first]}" before submitting`, variant: "destructive" });
      // Scroll into view
      setTimeout(() => {
        document.getElementById(`section-${first}-header`)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
      return;
    }

    // Owner public-text safety re-check (visible fields only). Blocks submit on any
    // policy error OR an RPC/network failure — a failed validation is never valid.
    // Never the first reveal — blur already surfaced these.
    const serverFields: ServerTextField[] = ["parking_notes", "building_notes"];
    if (form.listing_type !== "sale") serverFields.push("building_rules");
    const nextTextErrors: Record<string, string | null> = {};
    let hadFailure = false;
    for (const f of serverFields) {
      const res = await validatePropertyFieldText(f, form[f] as string);
      if (res.ok) {
        nextTextErrors[f] = null;
      } else if (res.ok === false && res.error !== null) {
        nextTextErrors[f] = res.error;
      } else {
        hadFailure = true;
      }
    }
    const yt = validateYoutubeUrl(form.youtube_walkthrough_url);
    if (yt.ok === false) nextTextErrors.youtube_walkthrough_url = YOUTUBE_MESSAGE[yt.reason];

    // Flat / Unit validation (client-side, synchronous). Uses the pre-computed
    // normalizedFlatNumber so the result is consistent with what was patched above.
    nextTextErrors.lister_flat_number = flatNumberError;

    // Candidate fields ordered by visual position in the form (Section 1 → Section 8).
    // lister_flat_number (Section 1) comes first so the user is taken to the earliest error.
    const candidateFields = [
      "lister_flat_number",
      ...serverFields,
      "youtube_walkthrough_url",
    ];
    const firstBadField = candidateFields.find((f) => nextTextErrors[f]);
    const errorCount = Object.values(nextTextErrors).filter(Boolean).length;

    if (firstBadField || hadFailure) {
      setTextErrors((e) => ({ ...e, ...nextTextErrors }));
      if (errorCount > 0) setShowSubmitFieldSummary(true);
      if (hadFailure) {
        toast({
          variant: "destructive",
          title: "Couldn't validate",
          description: "Check your connection and try again.",
        });
      }
      if (firstBadField) {
        if (firstBadField === "lister_flat_number") {
          setOpenAccordion("section-1");
          setTimeout(() => {
            document.getElementById("lister_flat_number-input")?.scrollIntoView({ behavior: "smooth", block: "center" });
            document.getElementById("lister_flat_number-input")?.focus();
          }, 100);
        } else {
          const sec = DB_COLUMN_TO_SECTION[firstBadField];
          if (sec) {
            setOpenAccordion(`section-${sec}`);
            setTimeout(() => {
              document.getElementById(`section-${sec}-header`)?.scrollIntoView({ behavior: "smooth", block: "start" });
            }, 100);
          }
        }
        toast({ title: "Fix the highlighted field before submitting", variant: "destructive" });
      }
      return;
    }

    setSubmitting(true);

    // Live listing (listed / edit_pending_review): submit review edits via RPC.
    if (isLiveListing) {
      // Coupled JSON guard (R19): a failed dependent Live amenities/furnishing save must
      // block the review submit (else a rename could leave both old-live + new-approved).
      if (poisonedKeys.includes("amenities") || poisonedKeys.includes("furnishing_detail")) {
        setSubmitting(false);
        toast({ title: "A change didn't save", description: "Your amenities/furnishing update didn't save. Fix it and try Submit again.", variant: "destructive" });
        return;
      }
      const liveBaseline: ReviewLiveBaseline = {
        scalars: reviewScalarLiveRef.current,
        amenities: safeLiveRef.current.amenities as { building?: string[] } | null,
        furnishing_detail: safeLiveRef.current.furnishing_detail,
      };
      const normalized = normalizeReviewPayload(editRequestPayload.field_changes, stagedPhotos, liveBaseline);
      const baseline = pendingBaseline ?? { scalars: {}, amenities_add: [], furnishing_add: [], photo_add: [] };

      if (reviewEquals(normalized, baseline)) {
        setSubmitting(false);
        toast({ title: "No changes to submit", description: "Make changes before submitting for review.", variant: "destructive" });
        return;
      }

      // Fully retracted while a pending request exists → cancel instead of a no-op submit (R13).
      if (isReviewEmpty(normalized)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: cancelErr } = await (supabase as any).rpc("cancel_pending_edit_request", { p_property_id: propertyId });
        setSubmitting(false);
        if (cancelErr) { toast({ title: "Could not update review", description: cancelErr.message, variant: "destructive" }); return; }
        try { sessionStorage.removeItem(SESSION_STORAGE_KEY(propertyId!)); } catch { /* ignore */ }
        toast({ title: "Pending review cancelled", description: "Your listing keeps its current details." });
        navigate("/owner-dashboard", { replace: true });
        return;
      }

      const args = toSubmitArgs(normalized);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: newEditId, error: rpcError } = await (supabase as any).rpc("submit_property_edit_request", {
        p_property_id: propertyId, p_field_changes: args.p_field_changes, p_photo_changes: args.p_photo_changes,
      });
      setSubmitting(false);
      if (rpcError) {
        // Cap hit at submission (P0001/PHOTO_LIMIT_REACHED): friendly message; staged
        // photos + form state are left intact so the owner can remove one and resubmit.
        if (rpcError.code === "P0001" && rpcError.message === "PHOTO_LIMIT_REACHED") {
          toast({ title: "Maximum 15 photos allowed.", variant: "destructive" });
          return;
        }
        toast({ title: "Could not submit edit", description: rpcError.message, variant: "destructive" });
        return;
      }
      try { sessionStorage.removeItem(SESSION_STORAGE_KEY(propertyId!)); } catch { /* ignore */ }
      toast({ title: "Edit submitted for review", description: "We'll review your changes within 48 hours." });
      navigate("/owner-dashboard", { replace: true });
      return;
    }

    // Initial-listing location confirmation gate (S8/R6) — create/draft/changes_requested.
    if (isInitialEditable && !form.location_verified_by_owner) {
      setSubmitting(false);
      setOpenAccordion("section-1");
      toast({ title: "Confirm the property location", description: "Tick 'I confirm this is the correct property location' in the location section before submitting.", variant: "destructive" });
      setTimeout(() => { document.getElementById("section-1-header")?.scrollIntoView({ behavior: "smooth", block: "start" }); }, 100);
      return;
    }

    // Path A: transition draft/changes_requested → pending_review.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("properties")
      .update({ status: "pending_review" })
      .eq("id", propertyId);
    setSubmitting(false);
    if (error) {
      toast({ title: "Could not submit", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Submitted for review!", description: "We'll review your listing within 48 hours." });
    navigate("/owner-dashboard", { replace: true });
  }, [propertyId, submitting, saveNow, patch, sectionStatuses, images.length, form, navigate, toast, path, isLiveListing, isInitialEditable, editRequestPayload, stagedPhotos, pendingBaseline, saveState, hasPendingChanges, lastError, poisonedKeys, furnishingDraftInvalid, amenitiesDraftInvalid, locationDirty]);

  // ─── Preview data ────────────────────────────────────────────────────────
  const previewData = useMemo<PropertyPreviewData>(() => ({
    building_name: form.building_name, locality: form.locality, city: form.city,
    state: form.state, pincode: form.pincode,
    bhk: form.bhk, property_type: form.property_type, square_footage: form.square_footage,
    furnishing: form.furnishing, bathrooms: form.bathrooms, balconies: form.balconies,
    facing: form.facing,
    listed_rent: form.listed_rent, security_deposit_amount: form.security_deposit_amount,
    society_maintenance_approx: form.society_maintenance_approx,
    maintenance_included: form.maintenance_included_in_rent,  // preview payload key is intentional (renders "Included")
    available_from: form.available_from ? format(form.available_from, "PP") : "",
    furnishing_detail: form.furnishing_detail,
    building_amenities: form.building_amenities.filter((v) => BUILDING_AMENITIES.some((b) => b.value === v)),
    custom_amenities: form.building_amenities.filter((v) => !BUILDING_AMENITIES.some((b) => b.value === v)),
    parking_2w: PARKING_OPTIONS.find((o) => o.value === form.parking_2w)?.label ?? form.parking_2w,
    parking_4w: PARKING_OPTIONS.find((o) => o.value === form.parking_4w)?.label ?? form.parking_4w,
    water_included: form.water_included, gas_included: form.gas_included, gas_type: form.gas_type,
    electricity_included: form.electricity_included,
    pet_policy: PET_POLICY_OPTIONS.find((o) => o.value === form.pet_policy)?.label ?? form.pet_policy_text,
    house_rules: form.building_rules, building_notes: form.building_notes,
    // Preview = current live images + staged (pending-review) additions.
    images: [
      ...images,
      ...stagedPhotos.map((s) => ({ id: s.temp_id, url: s.url, is_primary: false, section: s.section ?? null })),
    ] as unknown as PreviewImage[],
    youtube_walkthrough_url: form.youtube_walkthrough_url,
    // Prompt 9 additions
    listing_type: form.listing_type,
    lister_role: form.lister_role || undefined,
    landmark: form.landmark || undefined,
    floor_number: form.floor_number || undefined,
    total_floors: form.total_floors || undefined,
    super_built_up_area: form.super_built_up_area || undefined,
    building_age_years: form.building_age_years || undefined,
    lock_in_months: form.lock_in_months || undefined,
    notice_period_days: form.notice_period_days || undefined,
    annual_rent_increase_pct: form.annual_rent_increase_pct || undefined,
    move_in_charges_amount: form.move_in_charges_amount || undefined,
    rent_brokerage_fixed_amount: form.rent_brokerage_fixed_amount || undefined,
    sale_price: form.sale_price || undefined,
    price_negotiable: form.price_negotiable,
    expected_price_per_sqft: form.expected_price_per_sqft || undefined,
    possession_status: form.possession_status || undefined,
    possession_date: form.possession_date ? format(form.possession_date, "PP") : undefined,
    rera_registration_number: form.rera_registration_number || undefined,
    sale_brokerage_pct: form.sale_brokerage_pct || undefined,
    khata_type: form.khata_type || undefined,
    parking_2w_count: form.parking_2w_count || undefined,
    parking_4w_count: form.parking_4w_count || undefined,
    parking_notes: form.parking_notes || undefined,
    water_storage: form.water_storage || undefined,
    water_source: form.water_source.length > 0 ? form.water_source : undefined,
    main_door_lock_type: form.main_door_lock_type || undefined,
    pet_policy_text: form.pet_policy_text || undefined,
    formatted_address: form.formatted_address || undefined,
    lister_flat_number: form.lister_flat_number || undefined,
    location_verified_by_owner: form.location_verified_by_owner,
    streetview_show_in_listing: form.streetview_show_in_listing,
    property_tax_paid_upto: form.property_tax_paid_upto
      ? format(form.property_tax_paid_upto, "PP")
      : undefined,
  }), [form, images, stagedPhotos]);

  // Review-submit is enabled only when the normalized review payload differs from the
  // server pending baseline (or there is any staged/review change on a fresh listed row).
  const reviewDirty = useMemo(() => {
    if (!isLiveListing) return false;
    const liveBaseline: ReviewLiveBaseline = {
      scalars: reviewScalarLiveRef.current,
      amenities: safeLiveRef.current.amenities as { building?: string[] } | null,
      furnishing_detail: safeLiveRef.current.furnishing_detail,
    };
    const normalized = normalizeReviewPayload(editRequestPayload.field_changes, stagedPhotos, liveBaseline);
    const baseline = pendingBaseline ?? { scalars: {}, amenities_add: [], furnishing_add: [], photo_add: [] };
    return !reviewEquals(normalized, baseline);
  }, [isLiveListing, editRequestPayload, stagedPhotos, pendingBaseline]);

  // Prompt 2b — normalized current review proposal (custom-additions delta), reused for per-field status.
  const currentNormalized = useMemo<NormalizedReview>(() => {
    const liveBaseline: ReviewLiveBaseline = {
      scalars: reviewScalarLiveRef.current,
      amenities: safeLiveRef.current.amenities as { building?: string[] } | null,
      furnishing_detail: safeLiveRef.current.furnishing_detail,
    };
    return normalizeReviewPayload(editRequestPayload.field_changes, stagedPhotos, liveBaseline);
  }, [editRequestPayload, stagedPhotos]);

  // Per-field owner status (live listings only). Priority: error → needs_review → under_review → locked → saved.
  const fieldStatus = useCallback((dbKey: string): OwnerFieldStatus => {
    if (!isLiveListing) return null;
    if (poisonedKeys.includes(dbKey) || textErrors[dbKey]) return "save_failed";

    const sameSet = (a: readonly string[], b: readonly string[]) => {
      if (a.length !== b.length) return false;
      const sb = new Set(b);
      return a.every((x) => sb.has(x));
    };

    if (dbKey === "amenities" || dbKey === "furnishing_detail") {
      const cur = dbKey === "amenities" ? currentNormalized.amenities_add : currentNormalized.furnishing_add.map((e) => e.item.trim().toLowerCase());
      const baseArr = dbKey === "amenities"
        ? (pendingBaseline?.amenities_add ?? [])
        : (pendingBaseline?.furnishing_add ?? []).map((e) => e.item.trim().toLowerCase());
      const curNorm = (dbKey === "amenities" ? cur : cur) as string[];
      if (curNorm.length || baseArr.length) {
        if (!sameSet(curNorm, baseArr)) return "needs_review";
        return "under_review";
      }
    } else {
      const curHas = dbKey in currentNormalized.scalars;
      const baseHas = !!pendingBaseline && dbKey in pendingBaseline.scalars;
      if (curHas || baseHas) {
        const curVal = currentNormalized.scalars[dbKey];
        const baseVal = pendingBaseline?.scalars[dbKey];
        if (curVal !== baseVal) return "needs_review";
        return "under_review";
      }
    }

    if (getOwnerEditPolicy(dbKey) === "admin_only") return "locked";
    if (savedLiveKeys.has(dbKey) && saveState === "saved" && !poisonedKeys.includes(dbKey) && !textErrors[dbKey]) return "saved";
    return null;
  }, [isLiveListing, poisonedKeys, textErrors, currentNormalized, pendingBaseline, savedLiveKeys, saveState]);

  const ownerChip = useCallback((dbKey: string) => <FieldStatusChip status={fieldStatus(dbKey)} />, [fieldStatus]);

  // ─── Session storage restore prompt (Prompt 9) ───────────────────────────
  // When landing on /list/:id for a Path B property with a recently-saved payload
  // in sessionStorage, prompt owner to Restore or Start Fresh. Only fires ONCE per
  // mount and only if the current in-memory payload is empty (to avoid clobbering
  // pending-edit values already merged in).
  useEffect(() => {
    if (!propertyId || path !== "B") return;
    if (pendingRestore) return;
    const currentSize = Object.keys(editRequestPayload.field_changes).length + stagedPhotos.length;
    if (currentSize > 0) return; // already have local changes (from pending edit merge) — don't prompt
    try {
      const raw = sessionStorage.getItem(SESSION_STORAGE_KEY(propertyId));
      if (!raw) return;
      const parsed = JSON.parse(raw) as { field_changes?: Record<string, unknown>; staged?: Array<StagedPhoto & { temp_id: string }>; timestamp?: number };
      const age = Date.now() - (parsed.timestamp ?? 0);
      const WEEK = 7 * 24 * 60 * 60 * 1000;
      if (age > WEEK) {
        sessionStorage.removeItem(SESSION_STORAGE_KEY(propertyId));
        return;
      }
      const saved = { field_changes: parsed.field_changes ?? {}, staged: parsed.staged ?? [] };
      const savedSize = Object.keys(saved.field_changes).length + saved.staged.length;
      if (savedSize > 0) setPendingRestore(saved);
    } catch {
      // ignore parse errors
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyId, path]);

  const restoreSaved = useCallback(() => {
    if (!pendingRestore) return;
    setEditRequestPayload({ field_changes: pendingRestore.field_changes, photo_changes: { add: [], delete: [], update: [] } });
    setStagedPhotos(pendingRestore.staged);
    // Merge field_changes into form so read fields reflect saved values
    setForm((prev) => ({ ...prev, ...(pendingRestore.field_changes as Partial<FormState>) }));
    setPendingRestore(null);
  }, [pendingRestore, propertyId]);

  const discardSaved = useCallback(() => {
    if (!propertyId) return;
    // Best-effort staged R2 cleanup for the discarded draft's staged photos (R9).
    const urls = (pendingRestore?.staged ?? []).map((s) => s.url);
    if (urls.length) void stagedDeleteUrls(urls);
    try { sessionStorage.removeItem(SESSION_STORAGE_KEY(propertyId)); } catch { /* ignore */ }
    setPendingRestore(null);
  }, [propertyId, pendingRestore, stagedDeleteUrls]);

  // ─── Session storage for Path B in-progress edits ────────────────────────
  // Silent save on every editRequestPayload change; silent restore on mount.
  // Cleared on submit or cancel.
  useEffect(() => {
    if (!propertyId || path !== "B") return;
    const size = Object.keys(editRequestPayload.field_changes).length + stagedPhotos.length;
    if (size === 0) return;
    try {
      sessionStorage.setItem(
        SESSION_STORAGE_KEY(propertyId),
        JSON.stringify({ field_changes: editRequestPayload.field_changes, staged: stagedPhotos, timestamp: Date.now() }),
      );
    } catch { /* quota exceeded or private mode — ignore */ }
  }, [propertyId, path, editRequestPayload, stagedPhotos]);

  // ─── Cancel pending edit (edit_pending_review → listed) ──────────────────
  const cancelPendingEdit = useCallback(async () => {
    if (!propertyId || !pendingEdit || cancelling) return;
    setCancelling(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).rpc("cancel_pending_edit_request", { p_property_id: propertyId });
    if (error) {
      setCancelling(false);
      toast({ title: "Could not cancel edit", description: error.message, variant: "destructive" });
      return;
    }
    // After the RPC succeeds, best-effort clean the deduped union of abandoned staged URLs (R9).
    const abandoned = Array.from(new Set([
      ...(pendingBaseline?.photo_add ?? []).map((p) => p.url),
      ...stagedPhotos.map((s) => s.url),
    ]));
    if (abandoned.length) await stagedDeleteUrls(abandoned);
    setCancelling(false);
    try { sessionStorage.removeItem(SESSION_STORAGE_KEY(propertyId)); } catch { /* ignore */ }
    toast({ title: "Pending edit cancelled" });
    navigate("/owner-dashboard", { replace: true });
  }, [propertyId, pendingEdit, cancelling, toast, navigate, pendingBaseline, stagedPhotos, stagedDeleteUrls]);

  // Prompt 11: acknowledgeBanner removed — RejectionPanel owns the upsert with activity_log_id (D-141).

  // ─── Session-expired modal state derived from useListingSave ─────────────
  const sessionExpired = saveState === "session_expired";

  // ─── Render ──────────────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <Layout>
        <div className="container mx-auto max-w-2xl px-4 py-8 space-y-3">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
      </Layout>
    );
  }

  return (
    <VerificationGate returnTo="/list">
    <Layout>
      <div className="container mx-auto max-w-2xl px-4 py-6 pb-32">
        {/* Edit-mode status header */}
        {isEditMode && entryStatus !== "loading" && entryStatus !== "blocked" && (
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <button onClick={() => navigate(`/property/${propertyId}`)} className="text-xs text-muted-foreground hover:text-foreground">
                ← Back to property
              </button>
              <h1 className="text-xl font-bold text-foreground mt-1 truncate">{form.building_name || "Edit listing"}</h1>
            </div>
            <span className={cn("shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium", getStatusDisplay(entryStatus).color)}>
              {getStatusDisplay(entryStatus).label}
            </span>
          </div>
        )}

        {/* Prompt 11 (H1/H2/H3, D-138/D-140/D-141): in edit mode, always-visible
            StatusGuidance + persistent RejectionPanel (both self-contained; ack
            scoped to activity_log_id so a second admin rejection reappears). */}
        {isEditMode && propertyId && entryStatus !== "loading" && entryStatus !== "blocked" && entryStatus !== "create" && (
          <div className="mb-4 space-y-3">
            <StatusGuidance status={entryStatus} />
            {user?.id && <RejectionPanel propertyId={propertyId} userId={user.id} />}
          </div>
        )}

        {/* edit_pending_review banner — Live, some edits under review (amber). */}
        {entryStatus === "edit_pending_review" && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="text-sm text-amber-800">
              <span className="font-medium">Live · Some edits under review.</span>{" "}
              Your listing stays visible with its current details while your submitted changes are reviewed
              (usually 24–48 hours). Safe fields (price, availability, facts) still update instantly.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button size="sm" variant="ghost" onClick={() => setShowCancelConfirm(true)} className="text-destructive">
                Cancel pending edit
              </Button>
            </div>
          </div>
        )}

        <header className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">
            {isEditMode ? "Edit your listing" : "List your property"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {path === "B"
              ? "Your changes will be reviewed before going live."
              : "Fill the sections below. We'll auto-save your draft as you go."}
          </p>
          <div className="mt-3 flex items-center gap-3 text-xs">
            <span className="text-muted-foreground">{requiredComplete} of 5 required sections complete</span>
            <SaveStateIndicator state={saveState} />
          </div>
        </header>

        {/* Prompt 10a (D-161) — listing_type toggle above the accordion. Tier-1
            locked for owner post-draft; admin can change (Prompt 10b wires admin).
            Trigger validates listing_type-branched required fields on server side
            (D-160). UI validates first. */}
        <div className="mb-6">
          <SpecField
            fieldKey="listing_type"
            surface="owner_form"
            value={form.listing_type}
            onChange={(v: string) => updateField("listing_type", v)}
            readOnly={tierOneLocked}
            className="max-w-xs"
          />
          {tierOneLocked && (
            <p className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <Lock className="h-3 w-3" /> Locked after submission
            </p>
          )}
        </div>
        {/* F3-C14: lister_role — mandatory select, locked for owner after publish
            (same readOnly rule as listing_type). Admin PropertyEdit path always
            editable (see F3-C15). */}
        <div className="mb-6">
          <SpecField
            fieldKey="lister_role"
            surface="owner_form"
            value={form.lister_role}
            onChange={(v: string) => updateField("lister_role", v)}
            readOnly={tierOneLocked}
            className="max-w-xs"
          />
          {tierOneLocked && (
            <p className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <Lock className="h-3 w-3" /> Locked after submission
            </p>
          )}
        </div>

        <Accordion type="single" collapsible value={openAccordion} onValueChange={(v) => {
          setOpenAccordion(v);
          // A1 (D-144): record which sections the user has opened so optional-only
          // sections (5, 6, 8) can transition from ⚪ to ✅ on first open.
          const match = v?.match(/^section-(\d+)$/);
          if (match) {
            const sec = Number(match[1]) as SectionNum;
            setOpenedSections((prev) => (prev.has(sec) ? prev : new Set(prev).add(sec)));
          }
        }} className="w-full">
          <SectionShell num={1} title="Where is your property?" status={sectionStatuses[1]} summary={sectionSummary(1, form, images)} required>
            <div className="space-y-4">
              {addressEditable ? (
                <OwnerLocationPin
                  propertyId={propertyId}
                  ensureDraft={ensureDraft}
                  token={session?.access_token ?? null}
                  propertyType={form.property_type || null}
                  confirmed={(form.location_verified_by_owner && form.latitude != null) ? {
                    place_id: form.place_id,
                    formatted_address: form.formatted_address || null,
                    city: form.city || null,
                    locality: form.locality || null,
                    building_name: form.building_name || null,
                    latitude: form.latitude,
                    longitude: form.longitude,
                    verified: form.location_verified_by_owner,
                    building_source: locationState.buildingSource,
                  } : null}
                  locationKind={locationState.kind}
                  discoveryConfirmed={locationState.discoveryConfirmed}
                  buildingSource={locationState.buildingSource}
                  hydrating={locationState.status !== 'ready'}
                  onConfirmed={handleLocationConfirmed}
                  onDirtyChange={setLocationDirty}
                  streetViewAvailable={form.streetview_available}
                  streetViewShowInListing={!!form.streetview_show_in_listing}
                  onStreetViewToggle={(v) => updateField("streetview_show_in_listing", v)}
                  needsDiscoveryRoot={locationState.needsDiscoveryRoot}
                  onPersisted={handleLocationPersisted}
                />
              ) : (
                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    {form.formatted_address || [form.building_name, form.locality, form.city].filter(Boolean).join(', ')}
                  </p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Lock className="h-3 w-3" />
                    Address cannot be changed after submission.{' '}
                    <a href="/contact" className="underline">Contact support →</a>
                  </p>
                  {/* Street View visibility stays LIVE-editable even when the address is locked. */}
                  {form.streetview_available && (
                    <label className="flex items-center justify-between rounded-lg border p-3 mt-2">
                      <span className="text-sm">Show Street View link in listing</span>
                      <input
                        type="checkbox"
                        className="h-5 w-5"
                        checked={!!form.streetview_show_in_listing}
                        onChange={(e) => updateField("streetview_show_in_listing", e.target.checked)}
                      />
                    </label>
                  )}
                  {form.streetview_available && ownerChip("streetview_show_in_listing")}
                </div>
              )}
              <SpecField
                fieldKey="lister_flat_number"
                surface="owner_form"
                value={form.lister_flat_number ?? ''}
                onChange={(v: string) => updateField("lister_flat_number", v)}
                onBlur={() => {
                  const err = validateFlatNumber(form.lister_flat_number);
                  if (!err && form.lister_flat_number) {
                    const trimmed = form.lister_flat_number.trim();
                    if (trimmed !== form.lister_flat_number) {
                      setForm((prev) => ({ ...prev, lister_flat_number: trimmed || null }));
                    }
                  }
                  setTextErrors((e) => ({ ...e, lister_flat_number: err }));
                }}
                error={textErrors["lister_flat_number"] ?? undefined}
                inputId="lister_flat_number-input"
                readOnly={tierOneLocked}
              >{ownerChip("lister_flat_number")}</SpecField>
              <SpecField fieldKey="landmark" surface="owner_form" value={form.landmark} onChange={(v: string) => updateField("landmark", v)} readOnly={ownerFieldReadOnly("landmark")} />
            </div>
          </SectionShell>

          {/* Section 2 — scalar rendering driven by PROPERTY_FIELDS spec (D-128, D-155). */}
          <SectionShell num={2} title="The basics" status={sectionStatuses[2]} summary={sectionSummary(2, form, images)} required>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <SpecField fieldKey="bhk" surface="owner_form" value={form.bhk} onChange={(v: string) => updateField("bhk", v)} readOnly={ownerFieldReadOnly("bhk")}>{ownerChip("bhk")}</SpecField>
                {isLiveListing && (
                  <p className="text-xs text-amber-600 mt-1">Corrections are reviewed before going live.</p>
                )}
              </div>
              <div>
                <SpecField fieldKey="property_type" surface="owner_form" value={form.property_type} onChange={(v: string) => updateField("property_type", v)} readOnly={ownerFieldReadOnly("property_type")}>{ownerChip("property_type")}</SpecField>
                {isLiveListing && (
                  <p className="text-xs text-amber-600 mt-1">Corrections are reviewed before going live.</p>
                )}
              </div>
              <SpecField fieldKey="floor_number" surface="owner_form" value={form.floor_number} onChange={(v: string) => updateField("floor_number", v)}>{ownerChip("floor_number")}</SpecField>
              <SpecField fieldKey="total_floors" surface="owner_form" value={form.total_floors} onChange={(v: string) => updateField("total_floors", v)}>{ownerChip("total_floors")}</SpecField>
              <SpecField fieldKey="square_footage" surface="owner_form" value={form.square_footage} onChange={(v: string) => updateField("square_footage", v)}>{ownerChip("square_footage")}</SpecField>
              <SpecField fieldKey="super_built_up_area" surface="owner_form" value={form.super_built_up_area} onChange={(v: string) => updateField("super_built_up_area", v)}>{ownerChip("super_built_up_area")}</SpecField>
              {/* TODO(spec): fold helper into PROPERTY_FIELDS.facing.helper in Prompt 6 bundle */}
              <SpecField
                fieldKey="facing"
                surface="owner_form"
                value={form.facing}
                onChange={(v: string) => updateField("facing", v)}
                helperOverride="Helps users who care about sunlight"
                placeholderOverride="Optional"
              >{ownerChip("facing")}</SpecField>
              <SpecField fieldKey="building_age_years" surface="owner_form" value={form.building_age_years} onChange={(v: string) => updateField("building_age_years", v)}>{ownerChip("building_age_years")}</SpecField>
            </div>
          </SectionShell>

          {/* Section 3 — Prompt 10a (D-161): dual-mode. Title, body, and required-field
              set switch on form.listing_type. Sale mode renders under "Sale Details";
              rent mode retains the pre-Prompt-10 Rent & Deposit body verbatim. */}
          <SectionShell
            num={3}
            title={form.listing_type === "sale" ? "Sale Details" : "Rent & Deposit"}
            status={sectionStatuses[3]}
            summary={sectionSummary(3, form, images)}
            required
          >
            {form.listing_type === "sale" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <SpecField fieldKey="sale_price" surface="owner_form" value={form.sale_price} onChange={(v: string) => updateField("sale_price", v)}>{ownerChip("sale_price")}</SpecField>
                <SpecField fieldKey="expected_price_per_sqft" surface="owner_form" value={form.expected_price_per_sqft} onChange={(v: string) => updateField("expected_price_per_sqft", v)}>{ownerChip("expected_price_per_sqft")}</SpecField>
                <SpecField fieldKey="price_negotiable" surface="owner_form" value={form.price_negotiable} onChange={(v: boolean) => updateField("price_negotiable", v)} />
                <SpecField fieldKey="possession_status" surface="owner_form" value={form.possession_status} onChange={(v: string) => updateField("possession_status", v)}>{ownerChip("possession_status")}</SpecField>
                {/* D-168: spec-driven date field. visibleWhen gates render on possession_status === 'under_construction'.
                    SpecField's generic T is `unknown`: value is a Date, onChange emits ISO string | null. Cast bridges the two. */}
                <SpecField
                  fieldKey="possession_date"
                  surface="owner_form"
                  value={form.possession_date as unknown}
                  onChange={((iso: string | null) =>
                    updateField(
                      "possession_date",
                      iso ? new Date(iso + "T00:00:00") : undefined,
                      { possession_date: iso ?? null },
                    )) as (v: unknown) => void}
                  formValues={{ possession_status: form.possession_status }}
                >{ownerChip("possession_date")}</SpecField>
                <SpecField fieldKey="rera_registration_number" surface="owner_form" value={form.rera_registration_number} onChange={(v: string) => updateField("rera_registration_number", v)}>{ownerChip("rera_registration_number")}</SpecField>
                <SpecField fieldKey="khata_type" surface="owner_form" value={form.khata_type} onChange={(v: string) => updateField("khata_type", v)}>{ownerChip("khata_type")}</SpecField>
                {/* D-168: spec-driven date field (no warnOnPast, no maxDaysFromNow). */}
                <SpecField
                  fieldKey="property_tax_paid_upto"
                  surface="owner_form"
                  value={form.property_tax_paid_upto as unknown}
                  onChange={((iso: string | null) =>
                    updateField(
                      "property_tax_paid_upto",
                      iso ? new Date(iso + "T00:00:00") : undefined,
                      { property_tax_paid_upto: iso ?? null },
                    )) as (v: unknown) => void}
                >{ownerChip("property_tax_paid_upto")}</SpecField>
                {/* Phase 1.5 addendum (D-166) — sale brokerage. */}
                <SpecField
                  fieldKey="sale_brokerage_pct"
                  surface="owner_form"
                  value={form.sale_brokerage_pct}
                  onChange={(v: string) => updateField("sale_brokerage_pct", v)}
                  formValues={{ listing_type: form.listing_type }}
                >{ownerChip("sale_brokerage_pct")}</SpecField>
              </div>
            ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SpecField fieldKey="listed_rent" surface="owner_form" value={form.listed_rent} onChange={(v: string) => updateField("listed_rent", v)}>{ownerChip("listed_rent")}</SpecField>
              {/* Bespoke: security_deposit_amount input + 1/2/3-month convenience chips.
                  P3: months input removed from owner UI; chips still write both
                  amount and months so the column stays populated for legacy readers. */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Security deposit (₹) <span className="text-destructive">*</span></Label>
                <Input type="number" value={form.security_deposit_amount} onChange={(e) => updateField("security_deposit_amount", e.target.value)} placeholder="70000" className="min-h-[44px]" />
                {parseNum(form.listed_rent) ? (
                  <div className="flex gap-1.5 pt-1">
                    {[1, 2, 3].map((n) => (
                      <button key={n} type="button"
                        onClick={() => {
                          const amount = String((parseNum(form.listed_rent) ?? 0) * n);
                          setForm((f) => ({ ...f, security_deposit_amount: amount, security_deposit_months: String(n) }));
                          patch({ security_deposit_amount: parseNum(amount), security_deposit_months: n });
                        }}
                        className="text-xs px-2 py-1 rounded border border-border hover:bg-accent text-muted-foreground">
                        {n} month{n > 1 ? "s" : ""}
                      </button>
                    ))}
                  </div>
                ) : null}
                {(() => {
                  const months = computeDepositMonths(parseNum(form.security_deposit_amount), parseNum(form.listed_rent));
                  if (months === null) return null;
                  const rounded = Math.round(months * 10) / 10;
                  return (
                    <>
                      <p className="text-xs text-muted-foreground pt-1">≈ {rounded} month{rounded === 1 ? "" : "s"} of rent</p>
                      {rounded > 5 ? (
                        <p className="text-xs text-amber-600 pt-0.5">Deposits above 5 months of rent may discourage tenants.</p>
                      ) : null}
                    </>
                  );
                })()}
                {ownerChip("security_deposit_amount")}
              </div>
              <SpecField fieldKey="society_maintenance_approx" surface="owner_form" value={form.society_maintenance_approx} onChange={(v: string) => updateField("society_maintenance_approx", v)}>{ownerChip("society_maintenance_approx")}</SpecField>
              {/* D-171: FormState key renamed to match DB column; bridge removed. */}
              <div className="sm:col-span-2">
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div><Label className="text-sm font-medium">Maintenance included in rent</Label>
                    <p className="text-xs text-muted-foreground">Tenants see "Included" instead of a separate amount</p></div>
                  <Switch checked={form.maintenance_included_in_rent} onCheckedChange={(v) => updateField("maintenance_included_in_rent", v)} />
                </div>
                {ownerChip("maintenance_included_in_rent")}
              </div>
              {/* D-168: spec-driven date field. warnOnPast + maxDaysFromNow:90 come from datePickerOptions (D-146 preserved). */}
              <SpecField
                fieldKey="available_from"
                surface="owner_form"
                value={form.available_from as unknown}
                onChange={((iso: string | null) =>
                  updateField(
                    "available_from",
                    iso ? new Date(iso + "T00:00:00") : undefined,
                    { available_from: iso ?? null },
                  )) as (v: unknown) => void}
              >{ownerChip("available_from")}</SpecField>
              {/* P3: replaced notice_period_months (legacy, admin-only) with:
                    - lock_in_months (new, optional)
                    - notice_period_days (new select, replaces months on owner UI) */}
              <SpecField fieldKey="lock_in_months" surface="owner_form" value={form.lock_in_months} onChange={(v: string) => updateField("lock_in_months", v)} formValues={form as unknown as Record<string, unknown>}>{ownerChip("lock_in_months")}</SpecField>
              <SpecField fieldKey="notice_period_days" surface="owner_form" value={form.notice_period_days} onChange={(v: string) => updateField("notice_period_days", v)} formValues={form as unknown as Record<string, unknown>}>{ownerChip("notice_period_days")}</SpecField>
              <SpecField fieldKey="annual_rent_increase_pct" surface="owner_form" value={form.annual_rent_increase_pct} onChange={(v: string) => updateField("annual_rent_increase_pct", v)} formValues={form as unknown as Record<string, unknown>}>{ownerChip("annual_rent_increase_pct")}</SpecField>
              {/* Phase 1.5 addendum (D-166) — One-time charges sub-heading + move-in +
                  brokerage. Section 3 hit 10 fields in rent mode; the divider prevents
                  a wall-of-inputs feel. col-span-2 spans both grid columns. */}
              <div className="sm:col-span-2 mt-2 pt-2 border-t border-border/60">
                <p className="text-xs font-semibold uppercase text-muted-foreground">One-time charges</p>
              </div>
              <SpecField
                fieldKey="move_in_charges_amount"
                surface="owner_form"
                value={form.move_in_charges_amount}
                onChange={(v: string) => updateField("move_in_charges_amount", v)}
                formValues={{ listing_type: form.listing_type }}
              >{ownerChip("move_in_charges_amount")}</SpecField>
              {/* F2-D2: brokerage collapsed to a single flat amount input. */}
              <SpecField
                fieldKey="rent_brokerage_fixed_amount"
                surface="owner_form"
                value={form.rent_brokerage_fixed_amount}
                onChange={(v: string) => updateField("rent_brokerage_fixed_amount", v)}
                formValues={{ listing_type: form.listing_type }}
              >{ownerChip("rent_brokerage_fixed_amount")}</SpecField>
            </div>
            )}
          </SectionShell>

          {/* Section 4 */}
          <SectionShell num={4} title="What's inside the home?" status={sectionStatuses[4]} summary={sectionSummary(4, form, images)}>
            <div className="space-y-4">
              <FormField label={<>Furnishing <span className="text-destructive">*</span></>}>
                <Select value={form.furnishing} onValueChange={(v) => updateField("furnishing", v)}>
                  <SelectTrigger className="min-h-[44px] max-w-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{FURNISHING_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
                {ownerChip("furnishing")}
              </FormField>
              {/* D-170: shared JSONB editor. Same component used on admin form. */}
              <FurnishingEditor
                value={form.furnishing_detail}
                customLimit={5}
                onInvalidDraftChange={setFurnishingDraftInvalid}
                onChange={(updated) => {
                  setForm((f) => ({ ...f, furnishing_detail: updated }));
                  applyJsonbChange(updated, formRef.current.building_amenities);
                }}
              />
              {ownerChip("furnishing_detail")}
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Bathrooms"><Input type="number" min={1} max={10} value={form.bathrooms} onChange={(e) => updateField("bathrooms", e.target.value)} className="min-h-[44px]" />{ownerChip("bathrooms")}</FormField>
                <FormField label="Balconies"><Input type="number" min={0} max={10} value={form.balconies} onChange={(e) => updateField("balconies", e.target.value)} className="min-h-[44px]" />{ownerChip("balconies")}</FormField>
              </div>
            </div>
          </SectionShell>

          {/* Section 5 */}
          <SectionShell num={5} title="Building & Society" status={sectionStatuses[5]} summary={sectionSummary(5, form, images)}>
            <div className="space-y-4">
              {/* D-170: shared JSONB editor. Same component used on admin form. */}
              <AmenitiesEditor
                value={form.building_amenities}
                customLimit={5}
                onInvalidDraftChange={setAmenitiesDraftInvalid}
                onChange={(updated) => {
                  setForm((f) => ({ ...f, building_amenities: updated }));
                  applyJsonbChange(formRef.current.furnishing_detail, updated);
                }}
              />
              {ownerChip("amenities")}
              {/* Prompt 8 (D-159): parking enum + count inline. Enum stays bespoke;
                  count uses <SpecField> for label/helper. Public detail renders these
                  compound ("Covered · 2 slots") via a bespoke formatter. */}
              <div className="grid grid-cols-2 gap-4">
                <FormField label="2-wheeler parking">
                  <Select value={form.parking_2w} onValueChange={(v) => updateField("parking_2w", v)}>
                    <SelectTrigger className="min-h-[44px]"><SelectValue /></SelectTrigger>
                    <SelectContent>{PARKING_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                  </Select>
                  {ownerChip("parking_2w")}
                </FormField>
                <SpecField fieldKey="parking_2w_count" surface="owner_form" value={form.parking_2w_count} onChange={(v: string) => updateField("parking_2w_count", v)}>{ownerChip("parking_2w_count")}</SpecField>
                <FormField label="4-wheeler parking">
                  <Select value={form.parking_4w} onValueChange={(v) => updateField("parking_4w", v)}>
                    <SelectTrigger className="min-h-[44px]"><SelectValue /></SelectTrigger>
                    <SelectContent>{PARKING_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                  </Select>
                  {ownerChip("parking_4w")}
                </FormField>
                <SpecField fieldKey="parking_4w_count" surface="owner_form" value={form.parking_4w_count} onChange={(v: string) => updateField("parking_4w_count", v)}>{ownerChip("parking_4w_count")}</SpecField>
              </div>
              <SpecField
                fieldKey="parking_notes"
                surface="owner_form"
                value={form.parking_notes}
                onChange={(v: string) => updateField("parking_notes", v)}
                maxLengthOverride={OWNER_TEXT_MAX.parking_notes}
                showCounter
                error={textErrors.parking_notes ?? undefined}
                onBlur={() => runFieldValidation("parking_notes")}
              >{ownerChip("parking_notes")}</SpecField>
              <SpecField fieldKey="water_storage" surface="owner_form" value={form.water_storage} onChange={(v: string) => updateField("water_storage", v)} className="max-w-xs">{ownerChip("water_storage")}</SpecField>
              {/* P3: water source multi-select (text[] column). */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Water source</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {WATER_SOURCE_OPTIONS.map((o) => {
                    const checked = form.water_source.includes(o.value);
                    return (
                      <label key={o.value} className="flex items-center gap-2 min-h-[36px] cursor-pointer">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(v) => {
                            const next = v
                              ? [...form.water_source, o.value]
                              : form.water_source.filter((x) => x !== o.value);
                            updateField("water_source", next);
                          }}
                        />
                        <span className="text-sm">{o.label}</span>
                      </label>
                    );
                  })}
                </div>
                {ownerChip("water_source")}
              </div>
              {/* P3: main_door_lock_type as enum select. */}
              <SpecField fieldKey="main_door_lock_type" surface="owner_form" value={form.main_door_lock_type} onChange={(v: string) => updateField("main_door_lock_type", v)} className="max-w-xs">{ownerChip("main_door_lock_type")}</SpecField>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div><UtilityToggle label="Water included" checked={form.water_included} onChange={(v) => updateField("water_included", v, { utility_water_included: v })} />{ownerChip("utility_water_included")}</div>
                <div><UtilityToggle label="Gas included" checked={form.gas_included} onChange={(v) => updateField("gas_included", v, { utility_gas_included: v })} />{ownerChip("utility_gas_included")}</div>
                <div><UtilityToggle label="Electricity included" checked={form.electricity_included} onChange={(v) => updateField("electricity_included", v, { utility_electricity_included: v })} />{ownerChip("utility_electricity_included")}</div>
              </div>
              {/* F1-B3c: gas_type decoupled from the "included in maintenance" toggle. */}
              <SpecField
                fieldKey="gas_type"
                surface="owner_form"
                value={form.gas_type || "none"}
                onChange={(v: string) => updateField("gas_type", v === "none" ? "" : v, { gas_type: v === "none" ? null : v })}
                formValues={{ listing_type: form.listing_type }}
                className="max-w-xs"
              >{ownerChip("gas_type")}</SpecField>
            </div>
          </SectionShell>

          {/* Section 6 — scalar rendering driven by PROPERTY_FIELDS spec (D-128, D-155). */}
          <SectionShell num={6} title="Rules & preferences" status={sectionStatuses[6]} summary={sectionSummary(6, form, images)}>
            <div className="space-y-4">
              {form.listing_type !== 'sale' && (
                <SpecField fieldKey="pet_policy" surface="owner_form" value={form.pet_policy} onChange={(v: string) => updateField("pet_policy", v)}>{ownerChip("pet_policy")}</SpecField>
              )}
              {/* TODO(spec): fold helper into PROPERTY_FIELDS.building_rules.helper in Prompt 6 bundle */}
              {form.listing_type !== 'sale' && (
                <SpecField
                  fieldKey="building_rules"
                  surface="owner_form"
                  value={form.building_rules}
                  onChange={(v: string) => updateField("building_rules", v)}
                  helperOverride="Vegetarian only? No smoking? Curfew? Anything tenants should know."
                  maxLengthOverride={OWNER_TEXT_MAX.building_rules}
                  showCounter
                  error={textErrors.building_rules ?? undefined}
                  onBlur={() => runFieldValidation("building_rules")}
                >{ownerChip("building_rules")}</SpecField>
              )}
              {/* TODO(spec): fold helper into PROPERTY_FIELDS.building_notes.helper in Prompt 6 bundle */}
              <SpecField
                fieldKey="building_notes"
                surface="owner_form"
                value={form.building_notes}
                onChange={(v: string) => updateField("building_notes", v)}
                helperOverride="Gated society? Near a Metro? 5-min walk to market? Sell your building."
                maxLengthOverride={OWNER_TEXT_MAX.building_notes}
                showCounter
                error={textErrors.building_notes ?? undefined}
                onBlur={() => runFieldValidation("building_notes")}
              >{ownerChip("building_notes")}</SpecField>
            </div>
          </SectionShell>

          {/* Section 7: Photos */}
          <SectionShell num={7} title="Photos" status={sectionStatuses[7]} summary={sectionSummary(7, form, images)} required>
            {!propertyId ? (
              <p className="text-sm text-muted-foreground border border-dashed rounded-lg p-6 text-center">
                Complete the sections above first — we'll save a draft, then you can upload photos.
              </p>
            ) : (
              <div className="space-y-4">
                <div className={cn("text-xs font-medium", images.length < PHOTO_CONFIG.upload.minCount ? "text-destructive" : "text-muted-foreground")}>
                  {images.length} of {PHOTO_CONFIG.upload.maxCount} photos {images.length < PHOTO_CONFIG.upload.minCount && `(minimum ${PHOTO_CONFIG.upload.minCount} required)`}
                </div>
                <p className="text-xs text-muted-foreground">Landscape photos work best. Take from far enough that the whole room is visible.</p>
                <p className="text-xs text-muted-foreground">Accepted: JPG, PNG, WebP, HEIC. Max 15 MB per photo.</p>
                {[...PHOTO_CONFIG.sections.suggestions].map((section) => {
                  const sectionImgs = images.filter((i) => i.section === section);
                  return (
                    <div key={section} className="border rounded-lg overflow-hidden">
                      <div className="flex items-center justify-between px-3 py-2 bg-muted border-b">
                        <span className="text-sm font-medium">{section} {sectionImgs.length > 0 && `· ${sectionImgs.length}`}</span>
                        <label className="text-xs text-primary hover:underline cursor-pointer">
                          + Upload
                          <input type="file" accept={PHOTO_CONFIG.upload.acceptAttribute} multiple className="hidden"
                            onChange={async (e) => {
                              if (!e.target.files) return;
                              const files = Array.from(e.target.files);
                              e.target.value = "";
                              // Cap the whole selection up front — stagedPhotos from this
                              // closure doesn't grow synchronously across the loop, so per-file
                              // guards alone would let one multi-file pick overshoot 15.
                              const remainingSlots = Math.max(0, PHOTO_CONFIG.upload.maxCount - images.length - stagedPhotos.length);
                              if (remainingSlots === 0) {
                                toast({ title: "Maximum 15 photos allowed.", variant: "destructive" });
                                return;
                              }
                              const filesToUpload = files.slice(0, remainingSlots);
                              if (files.length > remainingSlots) {
                                toast({ title: `Only ${remainingSlots} more photo${remainingSlots === 1 ? "" : "s"} can be added.`, variant: "destructive" });
                              }
                              for (const f of filesToUpload) {
                                const r = await uploadPhoto(f, section);
                                if (r === "limit_reached") break;
                              }
                            }} />
                        </label>
                      </div>
                      <div className="p-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {sectionImgs.map((img) => (
                          <div key={img.id} className="relative group aspect-square rounded overflow-hidden bg-muted">
                            <img src={img.url} alt="" className="w-full h-full object-cover" />
                            {img.is_primary && <span className="absolute top-1 left-1 bg-green-500 text-white text-xs px-1.5 py-0.5 rounded">Cover</span>}
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 p-1">
                              <button type="button" onClick={() => setPrimaryPhoto(img.id)} className="text-xs bg-white text-gray-800 px-2 py-1 rounded min-h-[36px]">★ Cover</button>
                              <button type="button" onClick={() => deletePhoto(img.id)} className="text-xs bg-white text-red-600 px-2 py-1 rounded min-h-[36px]">Delete</button>
                              <div className="flex gap-1">
                                <button type="button" aria-label="Move earlier" onClick={() => reorderPhoto(img.id, -1)} className="text-xs bg-white text-gray-800 px-2 py-1 rounded min-h-[36px]">◀</button>
                                <button type="button" aria-label="Move later" onClick={() => reorderPhoto(img.id, 1)} className="text-xs bg-white text-gray-800 px-2 py-1 rounded min-h-[36px]">▶</button>
                              </div>
                            </div>
                          </div>
                        ))}
                        {/* Staged photos (live listing) — amber, pending review; no cover/reorder. */}
                        {stagedPhotos.filter((s) => (s.section ?? "") === section).map((s) => (
                          <div key={s.temp_id} className="relative group aspect-square rounded overflow-hidden bg-muted ring-2 ring-amber-400">
                            <img src={s.url} alt="" className="w-full h-full object-cover" />
                            <span className="absolute top-1 left-1 bg-amber-500 text-white text-xs px-1.5 py-0.5 rounded">Pending review</span>
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-1">
                              <button type="button" onClick={() => removeStagedPhoto(s.temp_id)} className="text-xs bg-white text-red-600 px-2 py-1 rounded min-h-[36px]">Remove</button>
                            </div>
                          </div>
                        ))}
                        {Object.keys(uploadingFiles).filter((k) => k.startsWith(section)).map((k) => (
                          <div key={k} className="aspect-square rounded bg-muted flex items-center justify-center text-xs text-muted-foreground">Uploading…</div>
                        ))}
                        {sectionImgs.length === 0 && stagedPhotos.filter((s) => (s.section ?? "") === section).length === 0 && Object.keys(uploadingFiles).filter((k) => k.startsWith(section)).length === 0 && (
                          <div className="col-span-full py-4 text-center text-xs text-muted-foreground">No photos yet.</div>
                        )}
                      </div>
                    </div>
                  );
                })}
                <FormField label="YouTube walkthrough URL" hint="Paste a YouTube link for a full walkthrough tour">
                  <Input
                    value={form.youtube_walkthrough_url}
                    onChange={(e) => {
                      updateField("youtube_walkthrough_url", e.target.value);
                      // Bespoke input: clear its stale error explicitly on every change.
                      setTextErrors((er) => ({ ...er, youtube_walkthrough_url: null }));
                    }}
                    onBlur={runYoutubeValidation}
                    maxLength={OWNER_TEXT_MAX.youtube_walkthrough_url}
                    placeholder="https://youtube.com/watch?v=..."
                    className="min-h-[44px]"
                  />
                  {textErrors.youtube_walkthrough_url && (
                    <p className="text-sm text-destructive mt-1">{textErrors.youtube_walkthrough_url}</p>
                  )}
                  {ownerChip("youtube_walkthrough_url")}
                </FormField>
              </div>
            )}
            {imagesLoading && <p className="text-xs text-muted-foreground">Loading photos...</p>}
          </SectionShell>

          {/* F1-B2a: Section 8 (title + description inputs) removed from the owner
              form. Fields stay in FormState + mapFieldToDb so the column keeps
              writing correctly and legacy data is not truncated. "About the
              Property" now comes from building_notes in Section 6. */}

          {/* Section 9 */}
          <SectionShell num={9} title="Final checks" status={sectionStatuses[9]} summary={sectionSummary(9, form, images)} required>
            <div className="space-y-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <Checkbox checked={form.consent} onCheckedChange={(v) => setForm((f) => ({ ...f, consent: !!v }))} className="mt-1" />
                <span className="text-sm">
                  I confirm I am the legal owner or authorized representative of this property, and I have permission to list it.
                </span>
              </label>
              {/* J1 (D-148): Terms + Privacy consent required to submit. */}
              <label className="flex items-start gap-3 cursor-pointer">
                <Checkbox checked={form.terms_privacy_consent} onCheckedChange={(v) => setForm((f) => ({ ...f, terms_privacy_consent: !!v }))} className="mt-1" />
                <span className="text-sm">
                  I agree to Reeve's{" "}
                  <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-primary underline">Terms of Service</a>
                  {" "}and{" "}
                  <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-primary underline">Privacy Policy</a>.
                </span>
              </label>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => { setShowPreview(true); }}>
                  <Eye className="h-4 w-4 mr-1.5" /> Preview the Listing
                </Button>
              </div>
            </div>
          </SectionShell>
        </Accordion>

        {/* Sticky footer submit bar */}
        <div className="fixed bottom-16 md:bottom-0 left-0 right-0 z-30 bg-background border-t px-4 py-3 md:pl-64">
          <div className="max-w-2xl mx-auto space-y-2">
          {showSubmitFieldSummary && submitErrorCount > 0 && (
            <p className="text-sm font-medium text-destructive">
              {submitErrorCount === 1 ? "1 field needs attention" : `${submitErrorCount} fields need attention`}
            </p>
          )}
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs">
              <SaveStateIndicator state={saveState} />
              <p className="text-muted-foreground mt-0.5">{requiredComplete}/5 required</p>
            </div>
            <div className="flex gap-2">
              {propertyId && path === "A" && (
                <Button variant="outline" onClick={() => saveNow()}>Save</Button>
              )}
              <Button
                onClick={submit}
                disabled={submitting || !propertyId || (isLiveListing && !reviewDirty)}
                className={cn(!isLiveListing && (requiredComplete < 5 || !form.consent || !form.terms_privacy_consent || images.length < 3) ? "opacity-70" : "")}
              >
                {submitting ? "Submitting..." : isLiveListing ? "Submit changes for review" : "Submit for review"}
              </Button>
            </div>
          </div>
          </div>
        </div>
      </div>

      {/* Preview modal */}
      <PropertyPreview
        open={showPreview}
        onOpenChange={setShowPreview}
        data={previewData}
        isFirstSubmit={entryStatus === "create" || entryStatus === "draft" || entryStatus === "changes_requested"}
      />

      {/* Draft-limit modal */}
      <Dialog open={showDraftLimit} onOpenChange={() => {}}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Draft limit reached</DialogTitle>
            <DialogDescription>
              You have reached the {DRAFT_LIMIT}-draft limit. Complete or discard some drafts before starting a new listing.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => navigate("/owner-dashboard")}>Go to my properties</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Session storage restore prompt */}
      <Dialog open={!!pendingRestore} onOpenChange={(v) => !v && discardSaved()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Restore your unsaved changes?</DialogTitle>
            <DialogDescription>
              You had unsaved edits for this property from your last session. Restore them or start fresh?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={discardSaved}>Start fresh</Button>
            <Button onClick={restoreSaved}>Restore changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel pending edit confirmation */}
      <Dialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel your pending edit?</DialogTitle>
            <DialogDescription>
              Your live listing will stay as it is now. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelConfirm(false)} disabled={cancelling}>
              Keep pending
            </Button>
            <Button variant="destructive" onClick={cancelPendingEdit} disabled={cancelling}>
              {cancelling ? "Cancelling…" : "Cancel edit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Session-expired modal */}
      <Dialog open={sessionExpired} onOpenChange={() => {}}>
        <DialogContent className="max-w-md" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Session expired</DialogTitle>
            <DialogDescription>
              Please log in again. Your work below will be preserved when you return.
            </DialogDescription>
          </DialogHeader>
          <pre className="text-xs bg-muted p-3 rounded max-h-64 overflow-auto whitespace-pre-wrap">
{JSON.stringify(form, null, 2)}
          </pre>
          <DialogFooter>
            <Button onClick={() => navigate(`/login?returnTo=${encodeURIComponent(window.location.pathname + window.location.search)}`)}>
              Log in again
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
    </VerificationGate>
  );
}

// ─── Sub-renders ──────────────────────────────────────────────────────────────

function SectionShell({
  num, title, status, summary, children, required,
}: {
  num: SectionNum; title: string; status: SectionStatus; summary: string; children: React.ReactNode; required?: boolean;
}) {
  return (
    <AccordionItem value={`section-${num}`} id={`section-${num}-header`}>
      <AccordionTrigger className="hover:no-underline">
        <div className="flex items-center justify-between flex-1 gap-3 pr-2">
          <div className="flex items-center gap-3 min-w-0">
            <StatusIcon status={status} />
            <span className="text-sm font-medium text-left">
              {title}
              {/* A2: red asterisk on required section headers (Location, Basics, Rent & Deposit, Photos, Final Checks). */}
              {required && <span className="text-destructive ml-1" aria-hidden="true">*</span>}
            </span>
          </div>
          {summary && <span className="text-xs text-muted-foreground truncate max-w-[40%]">{summary}</span>}
        </div>
      </AccordionTrigger>
      {/* A2/B1: pl-1 pr-1 so focus-ring left edge on inputs inside AccordionContent isn't clipped by Radix's overflow-hidden animation container. */}
      <AccordionContent className="pt-2 px-1">{children}</AccordionContent>
    </AccordionItem>
  );
}

function StatusIcon({ status }: { status: SectionStatus }) {
  if (status === "complete") return <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />;
  if (status === "error") return <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />;
  if (status === "in_progress") return <div className="h-5 w-5 rounded-full bg-amber-400 shrink-0" />;
  return <Circle className="h-5 w-5 text-muted-foreground shrink-0" />;
}

function FormField({ label, hint, children }: { label: React.ReactNode; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function UtilityToggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-3">
      <Label className="text-sm">{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function SaveStateIndicator({ state }: { state: string }) {
  if (state === "saving") return <span className="text-xs text-muted-foreground">Saving...</span>;
  if (state === "saved") return <span className="text-xs text-green-600">Saved</span>;
  if (state === "failed") return <span className="text-xs text-red-500">Save failed — retrying</span>;
  return null;
}

// ─── Field → DB column map ───────────────────────────────────────────────────
function mapFieldToDb<K extends keyof FormState>(key: K, value: FormState[K]): Record<string, unknown> | null {
  const strVal = value as unknown as string;
  switch (key) {
    case "building_name": return { building_name: strVal.trim() || null };
    case "street_address": return { street_address: strVal.trim() || null };
    case "locality": return { locality: strVal.trim() || null };
    case "city": return { city: strVal.trim() || null };
    case "state": return strVal ? { state: strVal } : {};
    case "pincode": return { pincode: strVal.trim() || null };
    case "landmark": return { landmark: strVal.trim() || null };
    case "notice_period_days": return { notice_period_days: parseNum(strVal) };
    case "lock_in_months": return { lock_in_months: parseNum(strVal) };
    case "annual_rent_increase_pct": {
      const num = parseNum(strVal);
      return num !== null && !isNaN(num) ? { annual_rent_increase_pct: num } : {};
    }
    case "parking_2w_count": return { parking_2w_count: parseNum(strVal) ?? 0 };
    case "parking_4w_count": return { parking_4w_count: parseNum(strVal) ?? 0 };
    case "parking_notes": return { parking_notes: strVal.trim() || null };
    case "water_storage": return { water_storage: strVal || null };
    case "water_source": return { water_source: Array.isArray(value) && (value as string[]).length ? (value as string[]) : null };
    case "main_door_lock_type": return { main_door_lock_type: strVal || null };
    // Prompt 10a (D-161) — rent/sale. Date fields (possession_date, property_tax_paid_upto)
    // go through explicit dbPatch from the Calendar onSelect handler; not in this switch.
    case "listing_type": return { listing_type: strVal };
    case "lister_role": return { lister_role: strVal || "owner" };
    case "sale_price": return { sale_price: parseNum(strVal) };
    case "price_negotiable": return { price_negotiable: !!value };
    case "expected_price_per_sqft": return { expected_price_per_sqft: parseNum(strVal) };
    case "possession_status": return { possession_status: strVal || null };
    case "rera_registration_number": return { rera_registration_number: strVal.trim() || null };
    case "khata_type": return { khata_type: strVal || null };
    // Phase 1.5 addendum (D-166).
    case "move_in_charges_amount": return { move_in_charges_amount: parseNum(strVal) };
    case "rent_brokerage_fixed_amount": return { rent_brokerage_fixed_amount: parseNum(strVal) };
    case "sale_brokerage_pct": return { sale_brokerage_pct: parseNum(strVal) };
    case "bhk": return strVal ? { bhk: strVal } : {};
    case "property_type": return { property_type: strVal || null };
    case "floor_number": return { floor_number: parseNum(strVal) };
    case "total_floors": return { total_floors: parseNum(strVal) };
    case "square_footage": return { square_footage: parseNum(strVal) };
    case "super_built_up_area": return { super_built_up_area: parseNum(strVal) };
    case "facing": return { facing: strVal || null };
    case "building_age_years": return { building_age_years: parseNum(strVal) };
    case "listed_rent": return { listed_rent: parseNum(strVal) ?? 0 };
    case "security_deposit_amount": return { security_deposit_amount: parseNum(strVal) };
    case "security_deposit_months": return { security_deposit_months: parseNum(strVal) };
    case "society_maintenance_approx": return { society_maintenance_approx: parseNum(strVal) };
    case "maintenance_included_in_rent": return { maintenance_included_in_rent: !!value };
    case "furnishing": return strVal ? { furnishing: strVal } : {};
    case "bathrooms": return { bathrooms: parseNum(strVal) };
    case "balconies": return { balconies: parseNum(strVal) };
    case "parking_2w": return { parking_2w: strVal };
    case "parking_4w": return { parking_4w: strVal };
    case "gas_type": return { gas_type: strVal || null };
    case "pet_policy": return { pet_policy: strVal || null };
    case "building_rules": return { building_rules: strVal || null };
    case "building_notes": return { building_notes: strVal || null };
    case "youtube_walkthrough_url": return { youtube_walkthrough_url: strVal.trim() || null };
    // Google Maps Phase 1 — address enrichment fields
    case "place_id": return { place_id: strVal?.trim() || null };
    case "formatted_address": return { formatted_address: strVal?.trim() || null };
    case "address_mode": return { address_mode: strVal || null };
    case "street_number": return { street_number: strVal?.trim() || null };
    case "route": return { route: strVal?.trim() || null };
    case "sublocality_1": return { sublocality_1: strVal?.trim() || null };
    case "sublocality_2": return { sublocality_2: strVal?.trim() || null };
    case "neighborhood": return { neighborhood: strVal?.trim() || null };
    case "district": return { district: strVal?.trim() || null };
    case "country": return { country: strVal?.trim() || null };
    case "plus_code": return { plus_code: strVal?.trim() || null };
    case "viewport_ne_lat": return { viewport_ne_lat: value != null ? Number(value) : null };
    case "viewport_ne_lng": return { viewport_ne_lng: value != null ? Number(value) : null };
    case "viewport_sw_lat": return { viewport_sw_lat: value != null ? Number(value) : null };
    case "viewport_sw_lng": return { viewport_sw_lng: value != null ? Number(value) : null };
    case "latitude": return { latitude: value != null ? Number(value) : null };
    case "longitude": return { longitude: value != null ? Number(value) : null };
    case "streetview_available": return { streetview_available: value != null ? Boolean(value) : null };
    case "streetview_pano_id": return { streetview_pano_id: strVal?.trim() || null };
    case "streetview_checked_at": return { streetview_checked_at: strVal || null };
    case "streetview_show_in_listing": return { streetview_show_in_listing: Boolean(value) };
    case "location_verified_by_owner": return { location_verified_by_owner: Boolean(value) };
    case "location_verified_at": return { location_verified_at: strVal || null };
    case "lister_flat_number": return { lister_flat_number: strVal?.trim() || null };
    // Local-only: consent, pet_policy_text, and JSONB-composed fields patched separately
    case "consent": case "pet_policy_text": return null;
    // Values handled through explicit dbPatch in updateField call
    default: return null;
  }
}
