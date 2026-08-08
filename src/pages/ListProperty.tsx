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
import posthog from "posthog-js";
import { format } from "date-fns";
import { CheckCircle2, Circle, AlertCircle, X, Eye, Trash2, Lock } from "lucide-react";
import { getStatusDisplay } from "@/lib/propertyStatus";

import Layout from "@/components/Layout";
import VerificationGate from "@/components/VerificationGate";
import { SpecField } from "@/components/property/SpecField";
import { ensurePrimaryPhoto } from "@/lib/property-images";
import RejectionPanel from "@/components/property-management/RejectionPanel";
import StatusGuidance from "@/components/property-management/StatusGuidance";
import { supabase } from "@/integrations/supabase/client";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useToast } from "@/hooks/use-toast";
import { useListingSave } from "@/hooks/useListingSave";
import { processPhotoForUpload } from "@/lib/photo";
import { PHOTO_CONFIG } from "@/config/photo";
import {
  BHK_OPTIONS, PROPERTY_TYPE_OPTIONS, FURNISHING_OPTIONS,
  BUILDING_AMENITIES, PARKING_OPTIONS, WATER_SOURCE_OPTIONS, FACING_OPTIONS, GAS_TYPE_OPTIONS,
  PET_POLICY_OPTIONS, INDIAN_STATES,
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
import { PropertyAddressInput } from '@/components/property-address';
import type { AddressData } from '@/components/property-address';

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
  notice_period_months: 3, annual_rent_increase_pct: 3,
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
  notice_period_months: string;               // Prompt 8 — India field (legacy, admin-only from P3)
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
  notice_period_months: "", notice_period_days: "", lock_in_months: "",
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
    notice_period_months: d.notice_period_months != null ? String(d.notice_period_months) : "",
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
): SectionStatus {
  const isErrored = errored.has(section);
  const complete = isSectionComplete(section, f, imageCount, openedSections);
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
): boolean {
  switch (section) {
    case 1: return !!(f.building_name.trim().length >= 2 && f.city.trim() && f.state && f.pincode.trim() && f.location_verified_by_owner);
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
    case 8: return openedSections.has(8) || isSectionTouched(8, f, imageCount);
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
    case 8: return "";
    case 9: return "";
  }
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
  const [insertingDraft, setInsertingDraft] = useState(false);
  // Owner-limited custom-item editors report a genuine invalid edit still on screen;
  // submission is blocked while either is true (the invalid draft is buffered locally
  // and never reaches saveNow/patch, so the pending-changes gate can't catch it).
  const [furnishingDraftInvalid, setFurnishingDraftInvalid] = useState(false);
  const [amenitiesDraftInvalid, setAmenitiesDraftInvalid] = useState(false);
  // Owner-only public-text validation errors, keyed by field. Never blocks autosave.
  const [textErrors, setTextErrors] = useState<Record<string, string | null>>({});
  const draftCheckedRef = useRef(false);
  // Live mirror of `form` so async blur-validation can compare against the current
  // value (a closed-over `form` would be stale and defeat the stale-response guard).
  const formRef = useRef(form);
  useEffect(() => { formRef.current = form; }, [form]);
  const pageOpenedRef = useRef(false);
  const sectionCompletionRef = useRef<Record<SectionNum, boolean>>({ 1: false, 2: false, 3: false, 4: false, 5: false, 6: false, 7: false, 8: false, 9: false });

  // ── Edit-mode state ─────────────────────────────────────────────────────
  const [entryStatus, setEntryStatus] = useState<EntryStatus>(isEditMode ? "loading" : "create");
  const [pendingEdit, setPendingEdit] = useState<PendingEditRow | null>(null);
  const [editRequestPayload, setEditRequestPayload] = useState<EditRequestPayload>(EMPTY_EDIT_PAYLOAD);
  const [modifyingEdit, setModifyingEdit] = useState(false);
  // Prompt 11: rejection state removed — RejectionPanel owns fetch + ack (D-141).
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [pendingRestore, setPendingRestore] = useState<EditRequestPayload | null>(null);

  // Path A: draft/changes_requested — direct patch via useListingSave.
  // Path B: listed/edit_pending_review — accumulate in editRequestPayload; Submit via RPC.
  const path: "A" | "B" | null =
    entryStatus === "draft" || entryStatus === "changes_requested" ? "A" :
    entryStatus === "listed" || entryStatus === "edit_pending_review" ? "B" :
    entryStatus === "create" ? "A" : null;

  const readOnly = entryStatus === "edit_pending_review" && !modifyingEdit;
  const tierOneLocked = entryStatus !== "create" && entryStatus !== "draft" && entryStatus !== "changes_requested";
  const addressEditable = !tierOneLocked;

  const { saveState, patch, saveNow, lastError, failureTick, hasPendingChanges, poisonedKeys } =
    useListingSave(propertyId);

  // ─── Surface save failures as a toast (D-127) ────────────────────────────
  // Fires on every failure via failureTick — re-toasts even when the same
  // column keeps 400ing with the same message across retries.
  // Session-expired case is handled separately by the sessionExpired modal.
  useEffect(() => {
    if (failureTick === 0) return; // skip initial mount
    if (saveState === "session_expired") return;
    if (!lastError) return;
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

  // ─── PostHog: page opened once per mount ─────────────────────────────────
  useEffect(() => {
    if (pageOpenedRef.current) return;
    pageOpenedRef.current = true;
    posthog?.capture("commons_listing_page_opened", { mode: draftIdFromQuery ? "resume" : "new" });
  }, [draftIdFromQuery]);

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

  // ─── Load property in edit mode (URL /list/:id) ──────────────────────────
  useEffect(() => {
    if (!isEditMode || !idParam || !user?.id) return;
    (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: prop } = await (supabase as any)
        .from("properties")
        .select("*")
        .eq("id", idParam)
        .maybeSingle();
      if (!prop) {
        toast({ title: "Property not found", variant: "destructive" });
        navigate("/my-properties", { replace: true });
        return;
      }
      if (prop.owner_id !== user.id) {
        toast({ title: "You can only edit your own properties.", variant: "destructive" });
        navigate("/my-properties", { replace: true });
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
        navigate("/my-properties", { replace: true });
        setEntryStatus("blocked");
        return;
      }
      // Load pending edit request when in edit_pending_review
      let pending: PendingEditRow | null = null;
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
          // Seed editRequestPayload from pending so "Modify edit" starts from current pending values
          setEditRequestPayload({
            field_changes: (pending.payload.field_changes ?? {}) as Record<string, unknown>,
            photo_changes: {
              add: (pending.payload.photo_changes?.add ?? []) as unknown[],
              delete: (pending.payload.photo_changes?.delete ?? []) as string[],
              update: (pending.payload.photo_changes?.update ?? []) as unknown[],
            },
          });
        }
      }
      // Prompt 11: rejection reason fetch + ack query moved into RejectionPanel (D-141).


      const merged = pending ? { ...prop, ...pending.payload.field_changes } : prop;
      prefillFormFromRow(merged, setForm);
      setEntryStatus(status as EntryStatus);
      setPropertyId(idParam);
      posthog?.capture("commons_listing_edit_mode_opened", { status });
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from("properties")
        .select("*")
        .eq("id", draftIdFromQuery)
        .eq("owner_id", user.id)
        .maybeSingle();
      if (!data) return;
      prefillFormFromRow(data as Record<string, unknown>, setForm);
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
      map[s] = computeSectionStatus(s, form, images.length, erroredSections, openedSections);
    }
    return map;
  }, [form, images.length, erroredSections, openedSections]);

  const requiredComplete = REQUIRED_SECTIONS.filter((s) => sectionStatuses[s] === "complete").length;

  // ─── Fire commons_listing_section_completed on transitions ───────────────
  useEffect(() => {
    for (const s of [1, 2, 3, 4, 5, 6, 7, 8, 9] as SectionNum[]) {
      const nowComplete = sectionStatuses[s] === "complete";
      const wasComplete = sectionCompletionRef.current[s];
      if (nowComplete && !wasComplete) {
        posthog?.capture("commons_listing_section_completed", { section_number: s });
      }
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

  // ─── Minimum required INSERT fields ──────────────────────────────────────
  const canInsertDraft = !!(form.building_name.trim() && form.city.trim() && user?.id);

  // ─── Field patcher ───────────────────────────────────────────────────────
  // Path A (draft/changes_requested/create): patches DB directly via useListingSave.
  // Path B (listed/edit_pending_review): accumulates into editRequestPayload.field_changes.
  const updateField = useCallback(<K extends keyof FormState>(key: K, value: FormState[K], dbPatch?: Record<string, unknown>) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    // Clear any stale inline validation error the moment the field is edited.
    setTextErrors((e) => (e[key as string] ? { ...e, [key as string]: null } : e));
    if (readOnly) return; // no writes while pending edit is under review
    const rawPayload = dbPatch ?? mapFieldToDb(key, value);
    if (!rawPayload || Object.keys(rawPayload).length === 0) return;
    // Defensive normalization: DATE columns must receive YYYY-MM-DD strings,
    // not Date objects. Any caller passing a Date via dbPatch is normalized
    // here (D-127 root cause 3 belt-and-suspenders).
    const payload: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(rawPayload)) {
      payload[k] = v instanceof Date ? format(v, "yyyy-MM-dd") : v;
    }

    if (path === "B") {
      // Owner must click "Modify edit" explicitly to enter modify mode — no auto-transition.
      // (readOnly gate above already returns before we get here in edit_pending_review view.)
      setEditRequestPayload((prev) => ({
        ...prev,
        field_changes: { ...prev.field_changes, ...payload },
      }));
    } else {
      // Pre-draft (propertyId null) included: useListingSave buffers and
      // auto-flushes once the draft row exists. Never drop pre-draft edits.
      patch(payload);
    }
  }, [patch, path, readOnly]);

  // ─── Owner public-text validation (blur + submit) ────────────────────────
  // Server-validate one text field on blur. Applies the result only if the field's
  // current value still matches what was validated (stale-response guard via ref).
  const runFieldValidation = useCallback(async (field: ServerTextField) => {
    const validated = formRef.current[field] as string;
    const res = await validatePropertyFieldText(field, validated);
    if (formRef.current[field] !== validated) return; // superseded by a newer edit
    if (res.ok) {
      setTextErrors((e) => ({ ...e, [field]: null }));
    } else if (res.error) {
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
      youtube_walkthrough_url: res.ok ? null : YOUTUBE_MESSAGE[res.reason],
    }));
    return res.ok;
  }, []);

  // ─── Address resolved callback (PropertyAddressInput → form + DB) ────────
  const handleAddressResolved = useCallback((data: AddressData) => {
    const addressPatch = {
      building_name: data.building_name ?? '',
      street_address: data.street_address ?? '',
      locality: data.locality ?? '',
      city: data.city ?? '',
      state: data.state ?? form.state,
      pincode: data.pincode ?? '',
      place_id: data.place_id,
      formatted_address: data.formatted_address,
      address_mode: data.address_mode,
      street_number: data.street_number,
      route: data.route,
      sublocality_1: data.sublocality_1,
      sublocality_2: data.sublocality_2,
      neighborhood: data.neighborhood,
      district: data.district,
      country: data.country,
      plus_code: data.plus_code,
      viewport_ne_lat: data.viewport_ne_lat,
      viewport_ne_lng: data.viewport_ne_lng,
      viewport_sw_lat: data.viewport_sw_lat,
      viewport_sw_lng: data.viewport_sw_lng,
      latitude: data.latitude,
      longitude: data.longitude,
      streetview_available: data.streetview_available,
      streetview_pano_id: data.streetview_pano_id,
      streetview_checked_at: data.streetview_checked_at,
      streetview_show_in_listing: data.streetview_show_in_listing,
      location_verified_by_owner: data.location_verified_by_owner,
      location_verified_at: data.location_verified_at,
    };
    setForm((prev) => ({ ...prev, ...addressPatch }));
    if (!readOnly) {
      patch(addressPatch);
    }
  }, [setForm, patch, readOnly]);

  // ─── First-save (create draft) ───────────────────────────────────────────
  const createDraft = useCallback(async () => {
    if (!canInsertDraft || !user?.id || insertingDraft) return;
    setInsertingDraft(true);
    const insertPayload = {
      owner_id: user.id,
      status: "draft" as const,
      is_active: false,
      building_name: form.building_name.trim(),
      street_address: form.street_address.trim(),
      city: form.city.trim(),
      state: form.state || null,
      locality: form.locality.trim() || null,
      pincode: form.pincode.trim() || null,
      bhk: form.bhk || null,
      furnishing: form.furnishing || null,
      lister_role: form.lister_role || 'owner',
      property_type: form.property_type || null,
      listed_rent: parseNum(form.listed_rent) ?? 0,
      draft_at: new Date().toISOString(),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("properties")
      .insert(insertPayload)
      .select("id")
      .maybeSingle();
    setInsertingDraft(false);
    if (error || !data) {
      const msg = error?.message ?? "Could not save. Please try again.";
      // Draft limit error from trigger
      if (/Draft limit/.test(msg)) {
        setShowDraftLimit(true);
        return;
      }
      toast({ title: "Save failed", description: msg, variant: "destructive" });
      return;
    }
    setPropertyId(data.id);
    setSearchParams({ draft: data.id }, { replace: true });
    posthog?.capture("commons_listing_draft_created", { property_id: data.id });
    toast({ title: "Draft saved" });
  }, [canInsertDraft, form, insertingDraft, setSearchParams, toast, user?.id]);

  // Trigger createDraft when the 6 required INSERT fields fill in (auto-save on threshold).
  // Skip entirely in edit mode — we never auto-insert a new property when editing an existing one.
  useEffect(() => {
    if (isEditMode || propertyId || !canInsertDraft || insertingDraft || showDraftLimit) return;
    const t = setTimeout(() => { void createDraft(); }, 800);
    return () => clearTimeout(t);
  }, [isEditMode, canInsertDraft, propertyId, insertingDraft, showDraftLimit, createDraft]);

  // ─── Photo upload ────────────────────────────────────────────────────────
  const uploadPhoto = useCallback(async (file: File, section: string) => {
    if (!propertyId || !session?.access_token) return;
    if (images.length >= PHOTO_CONFIG.upload.maxCount) {
      toast({ title: `Maximum ${PHOTO_CONFIG.upload.maxCount} photos reached`, variant: "destructive" });
      return;
    }
    const key = `${section}-${file.name}-${Date.now()}`;
    setUploadingFiles((p) => ({ ...p, [key]: true }));

    // Process (HEIC convert + compress)
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
      return;
    }

    try {
      const formData = new FormData();
      formData.append("file", processed.file);
      formData.append("property_id", propertyId);
      formData.append("section", section);
      formData.append("is_floor_plan", section.toLowerCase() === "floor plan" ? "true" : "false");
      // Path B + already-submitted edit_pending_review → route into pending edit's payload
      if (path === "B" && pendingEdit?.id && modifyingEdit) {
        formData.append("pending_edit_request_id", pendingEdit.id);
      }
      const res = await fetch(`${SUPABASE_URL}/functions/v1/upload-property-image`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData,
      });
      const json = await res.json();
      if (json.success) {
        // If routed into a pending edit, the file lives only in the edit_request payload
        // until admin approves. Local UI adds it to the visible list as an optimistic
        // "pending" entry so owner can see and manage it. On the next render after
        // approval / cancellation the real image list is refetched.
        if (json.pending) {
          setEditRequestPayload((prev) => ({
            ...prev,
            photo_changes: {
              ...prev.photo_changes,
              add: [
                ...prev.photo_changes.add,
                {
                  temp_id: json.id, url: json.url, section, caption: null,
                  is_primary: false, is_floor_plan: section.toLowerCase() === "floor plan", sort_order: 0,
                },
              ],
            },
          }));
        } else if (path === "B" && !pendingEdit) {
          // Uploading photos before first Submit while editing a `listed` property:
          // Edge Function did a direct INSERT (no pending_edit_request_id available yet),
          // but semantically these should go into photo_changes.add on Submit.
          // We fold them into local state so on Submit they're serialized into payload.
          setEditRequestPayload((prev) => ({
            ...prev,
            photo_changes: {
              ...prev.photo_changes,
              add: [
                ...prev.photo_changes.add,
                {
                  temp_id: json.id, url: json.url, section, caption: null,
                  is_primary: false, is_floor_plan: section.toLowerCase() === "floor plan", sort_order: 0,
                },
              ],
            },
          }));
          setImages((prev) => [...prev, {
            id: json.id, url: json.url, is_primary: false,
            is_floor_plan: section.toLowerCase() === "floor plan",
            section, sort_order: 0,
          }]);
        } else {
          setImages((prev) => [...prev, {
            id: json.id, url: json.url, is_primary: false,
            is_floor_plan: section.toLowerCase() === "floor plan",
            section, sort_order: 0,
          }]);
        }
        // Sync Prompt 1 (D-167) — auto-select first upload as cover if property has no primary yet.
        // Client-side prevHadPrimary check keeps local state consistent with the DB update.
        // In edit_pending_review path (Path B) the listed property usually already has a primary
        // — helper no-ops in that case.
        if (propertyId) {
          const prevHadPrimary = images.some((i) => i.is_primary);
          await ensurePrimaryPhoto(propertyId, json.id);
          if (!prevHadPrimary) {
            setImages((prev) => prev.map((i) => (i.id === json.id ? { ...i, is_primary: true } : i)));
          }
        }
      } else {
        toast({ title: json.error || "Upload failed", variant: "destructive" });
      }
    } catch {
      toast({ title: "Network error uploading photo", variant: "destructive" });
    } finally {
      setUploadingFiles((p) => { const n = { ...p }; delete n[key]; return n; });
    }
  }, [propertyId, session?.access_token, images.length, toast, path, pendingEdit, modifyingEdit]);

  const deletePhoto = useCallback(async (imageId: string) => {
    if (!propertyId || !session?.access_token) return;
    // Path B: don't actually delete — mark in photo_changes.delete for admin to apply on approval.
    // Exception: photos added in this edit (add[] entries with matching temp_id) can be dropped locally.
    if (path === "B") {
      // Local-add cancel: drop from add[] if present.
      const isLocalAdd = editRequestPayload.photo_changes.add.some((a) => (a as { temp_id: string }).temp_id === imageId);
      if (isLocalAdd) {
        setEditRequestPayload((prev) => ({
          ...prev,
          photo_changes: {
            ...prev.photo_changes,
            add: prev.photo_changes.add.filter((a) => (a as { temp_id: string }).temp_id !== imageId),
          },
        }));
        setImages((prev) => prev.filter((i) => i.id !== imageId));
      } else {
        // Real existing image: queue for deletion on approval.
        setEditRequestPayload((prev) => ({
          ...prev,
          photo_changes: { ...prev.photo_changes, delete: [...prev.photo_changes.delete, imageId] },
        }));
        setImages((prev) => prev.filter((i) => i.id !== imageId));
      }
      return;
    }
    // Path A: direct delete.
    const res = await fetch(`${SUPABASE_URL}/functions/v1/delete-property-image`, {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ image_id: imageId, property_id: propertyId }),
    });
    const json = await res.json();
    if (json.success) {
      setImages((prev) => prev.filter((i) => i.id !== imageId));
    } else {
      toast({ title: "Delete failed", variant: "destructive" });
    }
  }, [propertyId, session?.access_token, toast, path, editRequestPayload.photo_changes.add]);

  const setPrimaryPhoto = useCallback(async (imageId: string) => {
    if (!propertyId) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("property_images").update({ is_primary: false }).eq("property_id", propertyId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("property_images").update({ is_primary: true }).eq("id", imageId);
    setImages((prev) => prev.map((i) => ({ ...i, is_primary: i.id === imageId })));
  }, [propertyId]);

  // ─── Submit for review ───────────────────────────────────────────────────
  const submit = useCallback(async () => {
    if (!propertyId || submitting) return;

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
            ? `These fields didn't save: ${poisonedKeys.join(", ")}. Fix them in the highlighted section and try again.`
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
      } else if (res.error) {
        nextTextErrors[f] = res.error;
      } else {
        hadFailure = true;
      }
    }
    const yt = validateYoutubeUrl(form.youtube_walkthrough_url);
    if (!yt.ok) nextTextErrors.youtube_walkthrough_url = YOUTUBE_MESSAGE[yt.reason];

    const firstBadField = [...serverFields, "youtube_walkthrough_url"].find(
      (f) => nextTextErrors[f],
    );
    if (firstBadField || hadFailure) {
      setTextErrors((e) => ({ ...e, ...nextTextErrors }));
      if (hadFailure) {
        toast({
          variant: "destructive",
          title: "Couldn't validate",
          description: "Check your connection and try again.",
        });
      }
      if (firstBadField) {
        const sec = DB_COLUMN_TO_SECTION[firstBadField];
        if (sec) {
          setOpenAccordion(`section-${sec}`);
          setTimeout(() => {
            document.getElementById(`section-${sec}-header`)?.scrollIntoView({ behavior: "smooth", block: "start" });
          }, 100);
        }
        toast({ title: "Fix the highlighted field before submitting", variant: "destructive" });
      }
      return;
    }

    setSubmitting(true);

    // Path B (listed / edit_pending_review): submit via RPC as an edit request.
    if (path === "B") {
      // Guard: block submission if the payload has no changes at all (D-122).
      const hasFieldChanges = Object.keys(editRequestPayload.field_changes).length > 0;
      const hasPhotoChanges =
        editRequestPayload.photo_changes.add.length > 0
        || editRequestPayload.photo_changes.delete.length > 0
        || editRequestPayload.photo_changes.update.length > 0;
      if (!hasFieldChanges && !hasPhotoChanges) {
        setSubmitting(false);
        toast({
          title: "No changes to submit",
          description: "Make changes before submitting for review.",
          variant: "destructive",
        });
        return;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: newEditId, error: rpcError } = await (supabase as any).rpc(
        "submit_property_edit_request",
        {
          p_property_id: propertyId,
          p_field_changes: editRequestPayload.field_changes,
          p_photo_changes: editRequestPayload.photo_changes,
        },
      );
      setSubmitting(false);
      if (rpcError) {
        toast({ title: "Could not submit edit", description: rpcError.message, variant: "destructive" });
        return;
      }
      posthog?.capture("commons_edit_submitted", {
        property_id: propertyId,
        edit_request_id: newEditId as string,
        changed_field_count: Object.keys(editRequestPayload.field_changes).length,
        photo_change_count:
          editRequestPayload.photo_changes.add.length +
          editRequestPayload.photo_changes.delete.length +
          editRequestPayload.photo_changes.update.length,
      });
      try { sessionStorage.removeItem(SESSION_STORAGE_KEY(propertyId)); } catch { /* ignore */ }
      toast({ title: "Edit submitted for review", description: "We'll review your changes within 48 hours." });
      navigate("/my-properties", { replace: true });
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
    posthog?.capture("commons_listing_submitted", {
      property_id: propertyId,
      photo_count: images.length,
      has_optional_sections_filled: !!(form.building_notes || form.building_rules),
    });
    toast({ title: "Submitted for review!", description: "We'll review your listing within 48 hours." });
    navigate("/my-properties", { replace: true });
  }, [propertyId, submitting, saveNow, sectionStatuses, images.length, form, navigate, toast, path, editRequestPayload, saveState, hasPendingChanges, lastError, poisonedKeys, furnishingDraftInvalid, amenitiesDraftInvalid]);

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
    // Preview should reflect what the property will look like AFTER admin approval
    // in Path B: hide photos marked for deletion, include pending adds.
    // In Path A: images is already the live state.
    images: (path === "B"
      ? [
          ...images.filter((i) => !editRequestPayload.photo_changes.delete.includes(i.id)),
          ...editRequestPayload.photo_changes.add.map((a) => {
            const add = a as { temp_id?: string; url: string; section?: string | null; is_primary?: boolean };
            return {
              id: add.temp_id ?? `temp-${Math.random()}`,
              url: add.url,
              is_primary: !!add.is_primary,
              section: add.section ?? null,
            };
          }),
        ]
      : images) as unknown as PreviewImage[],
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
    notice_period_months: form.notice_period_months || undefined,
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
  }), [form, images]);

  // ─── Session storage restore prompt (Prompt 9) ───────────────────────────
  // When landing on /list/:id for a Path B property with a recently-saved payload
  // in sessionStorage, prompt owner to Restore or Start Fresh. Only fires ONCE per
  // mount and only if the current in-memory payload is empty (to avoid clobbering
  // pending-edit values already merged in).
  useEffect(() => {
    if (!propertyId || path !== "B") return;
    if (pendingRestore) return;
    const currentSize = Object.keys(editRequestPayload.field_changes).length +
      editRequestPayload.photo_changes.add.length +
      editRequestPayload.photo_changes.delete.length +
      editRequestPayload.photo_changes.update.length;
    if (currentSize > 0) return; // already have local changes (from pending edit merge) — don't prompt
    try {
      const raw = sessionStorage.getItem(SESSION_STORAGE_KEY(propertyId));
      if (!raw) return;
      const parsed = JSON.parse(raw) as EditRequestPayload & { timestamp?: number };
      const age = Date.now() - (parsed.timestamp ?? 0);
      const WEEK = 7 * 24 * 60 * 60 * 1000;
      if (age > WEEK) {
        sessionStorage.removeItem(SESSION_STORAGE_KEY(propertyId));
        return;
      }
      const saved: EditRequestPayload = {
        field_changes: parsed.field_changes ?? {},
        photo_changes: {
          add: parsed.photo_changes?.add ?? [],
          delete: parsed.photo_changes?.delete ?? [],
          update: parsed.photo_changes?.update ?? [],
        },
      };
      const savedSize = Object.keys(saved.field_changes).length +
        saved.photo_changes.add.length + saved.photo_changes.delete.length + saved.photo_changes.update.length;
      if (savedSize > 0) setPendingRestore(saved);
    } catch {
      // ignore parse errors
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyId, path]);

  const restoreSaved = useCallback(() => {
    if (!pendingRestore) return;
    setEditRequestPayload(pendingRestore);
    // Merge field_changes into form so read fields reflect saved values
    setForm((prev) => ({ ...prev, ...(pendingRestore.field_changes as Partial<FormState>) }));
    setModifyingEdit(true);
    setPendingRestore(null);
    posthog?.capture("commons_edit_session_restored", { property_id: propertyId });
  }, [pendingRestore, propertyId]);

  const discardSaved = useCallback(() => {
    if (!propertyId) return;
    try { sessionStorage.removeItem(SESSION_STORAGE_KEY(propertyId)); } catch { /* ignore */ }
    setPendingRestore(null);
    posthog?.capture("commons_edit_session_discarded", { property_id: propertyId });
  }, [propertyId]);

  // ─── Session storage for Path B in-progress edits ────────────────────────
  // Silent save on every editRequestPayload change; silent restore on mount.
  // Cleared on submit or cancel.
  useEffect(() => {
    if (!propertyId || path !== "B") return;
    const size = Object.keys(editRequestPayload.field_changes).length +
      editRequestPayload.photo_changes.add.length +
      editRequestPayload.photo_changes.delete.length +
      editRequestPayload.photo_changes.update.length;
    if (size === 0) return;
    try {
      sessionStorage.setItem(
        SESSION_STORAGE_KEY(propertyId),
        JSON.stringify({ ...editRequestPayload, timestamp: Date.now() }),
      );
    } catch { /* quota exceeded or private mode — ignore */ }
  }, [propertyId, path, editRequestPayload]);

  // ─── Cancel pending edit (edit_pending_review → listed) ──────────────────
  const cancelPendingEdit = useCallback(async () => {
    if (!propertyId || !pendingEdit || cancelling) return;
    setCancelling(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).rpc("cancel_pending_edit_request", { p_property_id: propertyId });
    setCancelling(false);
    if (error) {
      toast({ title: "Could not cancel edit", description: error.message, variant: "destructive" });
      return;
    }
    try { sessionStorage.removeItem(SESSION_STORAGE_KEY(propertyId)); } catch { /* ignore */ }
    posthog?.capture("commons_edit_cancelled", { property_id: propertyId, edit_request_id: pendingEdit.id });
    toast({ title: "Pending edit cancelled" });
    navigate("/my-properties", { replace: true });
  }, [propertyId, pendingEdit, cancelling, toast, navigate]);

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

        {/* edit_pending_review banner */}
        {entryStatus === "edit_pending_review" && !modifyingEdit && (
          <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3">
            <p className="text-sm text-blue-800">
              Your edit is under review — usually takes 24-48 hours. Your live listing stays visible unchanged.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => setModifyingEdit(true)}>Modify edit</Button>
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
        }} className={cn("w-full", readOnly && "opacity-70 pointer-events-none select-none")}>
          {/* Section 1 — address via PropertyAddressInput (Google Maps Phase 1). */}
          <SectionShell num={1} title="Where is your property?" status={sectionStatuses[1]} summary={sectionSummary(1, form, images)} required>
            <div className="space-y-4">
              {addressEditable ? (
                <PropertyAddressInput
                  mode="owner"
                  initialData={form.place_id ? {
                    building_name: form.building_name || null,
                    place_id: form.place_id,
                    formatted_address: form.formatted_address,
                    address_mode: form.address_mode ?? 'google_place',
                    street_address: form.street_address || null,
                    locality: form.locality || null,
                    city: form.city || null,
                    state: form.state || null,
                    pincode: form.pincode || null,
                    latitude: form.latitude,
                    longitude: form.longitude,
                    sublocality_1: form.sublocality_1,
                    sublocality_2: form.sublocality_2,
                    neighborhood: form.neighborhood,
                    district: form.district,
                    country: form.country,
                    route: form.route,
                    street_number: form.street_number,
                    plus_code: form.plus_code,
                    viewport_ne_lat: form.viewport_ne_lat,
                    viewport_ne_lng: form.viewport_ne_lng,
                    viewport_sw_lat: form.viewport_sw_lat,
                    viewport_sw_lng: form.viewport_sw_lng,
                    streetview_available: form.streetview_available,
                    streetview_pano_id: form.streetview_pano_id,
                    streetview_checked_at: form.streetview_checked_at,
                    streetview_show_in_listing: form.streetview_show_in_listing,
                    location_verified_by_owner: form.location_verified_by_owner,
                    location_verified_at: form.location_verified_at,
                    lister_flat_number: null,
                  } : undefined}
                  canRecheck={addressEditable}
                  onAddressResolved={handleAddressResolved}
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
                </div>
              )}
              <SpecField
                fieldKey="lister_flat_number"
                surface="owner_form"
                value={form.lister_flat_number ?? ''}
                onChange={(v: string) => updateField("lister_flat_number", v)}
                readOnly={tierOneLocked}
              />
              <SpecField fieldKey="landmark" surface="owner_form" value={form.landmark} onChange={(v: string) => updateField("landmark", v)} />
            </div>
          </SectionShell>

          {/* Section 2 — scalar rendering driven by PROPERTY_FIELDS spec (D-128, D-155). */}
          <SectionShell num={2} title="The basics" status={sectionStatuses[2]} summary={sectionSummary(2, form, images)} required>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <SpecField fieldKey="bhk" surface="owner_form" value={form.bhk} onChange={(v: string) => updateField("bhk", v)} readOnly={tierOneLocked} />
                {tierOneLocked && (
                  <p className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                    <Lock className="h-3 w-3" /> Locked after submission
                  </p>
                )}
              </div>
              <div>
                <SpecField fieldKey="property_type" surface="owner_form" value={form.property_type} onChange={(v: string) => updateField("property_type", v)} readOnly={tierOneLocked} />
                {tierOneLocked && (
                  <p className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                    <Lock className="h-3 w-3" /> Locked after submission
                  </p>
                )}
              </div>
              <SpecField fieldKey="floor_number" surface="owner_form" value={form.floor_number} onChange={(v: string) => updateField("floor_number", v)} />
              <SpecField fieldKey="total_floors" surface="owner_form" value={form.total_floors} onChange={(v: string) => updateField("total_floors", v)} />
              <SpecField fieldKey="square_footage" surface="owner_form" value={form.square_footage} onChange={(v: string) => updateField("square_footage", v)} />
              <SpecField fieldKey="super_built_up_area" surface="owner_form" value={form.super_built_up_area} onChange={(v: string) => updateField("super_built_up_area", v)} />
              {/* TODO(spec): fold helper into PROPERTY_FIELDS.facing.helper in Prompt 6 bundle */}
              <SpecField
                fieldKey="facing"
                surface="owner_form"
                value={form.facing}
                onChange={(v: string) => updateField("facing", v)}
                helperOverride="Helps users who care about sunlight"
                placeholderOverride="Optional"
              />
              <SpecField fieldKey="building_age_years" surface="owner_form" value={form.building_age_years} onChange={(v: string) => updateField("building_age_years", v)} />
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
                <SpecField fieldKey="sale_price" surface="owner_form" value={form.sale_price} onChange={(v: string) => updateField("sale_price", v)} />
                <SpecField fieldKey="expected_price_per_sqft" surface="owner_form" value={form.expected_price_per_sqft} onChange={(v: string) => updateField("expected_price_per_sqft", v)} />
                <SpecField fieldKey="price_negotiable" surface="owner_form" value={form.price_negotiable} onChange={(v: boolean) => updateField("price_negotiable", v)} />
                <SpecField fieldKey="possession_status" surface="owner_form" value={form.possession_status} onChange={(v: string) => updateField("possession_status", v)} />
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
                />
                <SpecField fieldKey="rera_registration_number" surface="owner_form" value={form.rera_registration_number} onChange={(v: string) => updateField("rera_registration_number", v)} />
                <SpecField fieldKey="khata_type" surface="owner_form" value={form.khata_type} onChange={(v: string) => updateField("khata_type", v)} />
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
                />
                {/* Phase 1.5 addendum (D-166) — sale brokerage. */}
                <SpecField
                  fieldKey="sale_brokerage_pct"
                  surface="owner_form"
                  value={form.sale_brokerage_pct}
                  onChange={(v: string) => updateField("sale_brokerage_pct", v)}
                  formValues={{ listing_type: form.listing_type }}
                />
              </div>
            ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SpecField fieldKey="listed_rent" surface="owner_form" value={form.listed_rent} onChange={(v: string) => updateField("listed_rent", v)} />
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
              </div>
              <SpecField fieldKey="society_maintenance_approx" surface="owner_form" value={form.society_maintenance_approx} onChange={(v: string) => updateField("society_maintenance_approx", v)} />
              {/* D-171: FormState key renamed to match DB column; bridge removed. */}
              <div className="sm:col-span-2">
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div><Label className="text-sm font-medium">Maintenance included in rent</Label>
                    <p className="text-xs text-muted-foreground">Tenants see "Included" instead of a separate amount</p></div>
                  <Switch checked={form.maintenance_included_in_rent} onCheckedChange={(v) => updateField("maintenance_included_in_rent", v)} />
                </div>
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
              />
              {/* P3: replaced notice_period_months (legacy, admin-only) with:
                    - lock_in_months (new, optional)
                    - notice_period_days (new select, replaces months on owner UI) */}
              <SpecField fieldKey="lock_in_months" surface="owner_form" value={form.lock_in_months} onChange={(v: string) => updateField("lock_in_months", v)} formValues={form as unknown as Record<string, unknown>} />
              <SpecField fieldKey="notice_period_days" surface="owner_form" value={form.notice_period_days} onChange={(v: string) => updateField("notice_period_days", v)} formValues={form as unknown as Record<string, unknown>} />
              <SpecField fieldKey="annual_rent_increase_pct" surface="owner_form" value={form.annual_rent_increase_pct} onChange={(v: string) => updateField("annual_rent_increase_pct", v)} formValues={form as unknown as Record<string, unknown>} />
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
              />
              {/* F2-D2: brokerage collapsed to a single flat amount input. */}
              <SpecField
                fieldKey="rent_brokerage_fixed_amount"
                surface="owner_form"
                value={form.rent_brokerage_fixed_amount}
                onChange={(v: string) => updateField("rent_brokerage_fixed_amount", v)}
                formValues={{ listing_type: form.listing_type }}
              />
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
              </FormField>
              {/* D-170: shared JSONB editor. Same component used on admin form. */}
              <FurnishingEditor
                value={form.furnishing_detail}
                customLimit={5}
                onInvalidDraftChange={setFurnishingDraftInvalid}
                onChange={(updated) => {
                  setForm((f) => ({ ...f, furnishing_detail: updated }));
                  patch({
                    furnishing_detail: updated,
                    amenities: buildAmenitiesJson(form.building_amenities, updated),
                  });
                }}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Bathrooms"><Input type="number" min={1} max={10} value={form.bathrooms} onChange={(e) => updateField("bathrooms", e.target.value)} className="min-h-[44px]" /></FormField>
                <FormField label="Balconies"><Input type="number" min={0} max={10} value={form.balconies} onChange={(e) => updateField("balconies", e.target.value)} className="min-h-[44px]" /></FormField>
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
                  patch({ amenities: buildAmenitiesJson(updated, form.furnishing_detail) });
                }}
              />
              {/* Prompt 8 (D-159): parking enum + count inline. Enum stays bespoke;
                  count uses <SpecField> for label/helper. Public detail renders these
                  compound ("Covered · 2 slots") via a bespoke formatter. */}
              <div className="grid grid-cols-2 gap-4">
                <FormField label="2-wheeler parking">
                  <Select value={form.parking_2w} onValueChange={(v) => updateField("parking_2w", v)}>
                    <SelectTrigger className="min-h-[44px]"><SelectValue /></SelectTrigger>
                    <SelectContent>{PARKING_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                  </Select>
                </FormField>
                <SpecField fieldKey="parking_2w_count" surface="owner_form" value={form.parking_2w_count} onChange={(v: string) => updateField("parking_2w_count", v)} />
                <FormField label="4-wheeler parking">
                  <Select value={form.parking_4w} onValueChange={(v) => updateField("parking_4w", v)}>
                    <SelectTrigger className="min-h-[44px]"><SelectValue /></SelectTrigger>
                    <SelectContent>{PARKING_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                  </Select>
                </FormField>
                <SpecField fieldKey="parking_4w_count" surface="owner_form" value={form.parking_4w_count} onChange={(v: string) => updateField("parking_4w_count", v)} />
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
              />
              <SpecField fieldKey="water_storage" surface="owner_form" value={form.water_storage} onChange={(v: string) => updateField("water_storage", v)} className="max-w-xs" />
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
              </div>
              {/* P3: main_door_lock_type as enum select. */}
              <SpecField fieldKey="main_door_lock_type" surface="owner_form" value={form.main_door_lock_type} onChange={(v: string) => updateField("main_door_lock_type", v)} className="max-w-xs" />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <UtilityToggle label="Water included" checked={form.water_included} onChange={(v) => updateField("water_included", v, { utility_water_included: v })} />
                <UtilityToggle label="Gas included" checked={form.gas_included} onChange={(v) => updateField("gas_included", v, { utility_gas_included: v })} />
                <UtilityToggle label="Electricity included" checked={form.electricity_included} onChange={(v) => updateField("electricity_included", v, { utility_electricity_included: v })} />
              </div>
              {/* F1-B3c: gas_type decoupled from the "included in maintenance" toggle. */}
              <SpecField
                fieldKey="gas_type"
                surface="owner_form"
                value={form.gas_type || "none"}
                onChange={(v: string) => updateField("gas_type", v === "none" ? "" : v, { gas_type: v === "none" ? null : v })}
                formValues={{ listing_type: form.listing_type }}
                className="max-w-xs"
              />
            </div>
          </SectionShell>

          {/* Section 6 — scalar rendering driven by PROPERTY_FIELDS spec (D-128, D-155). */}
          <SectionShell num={6} title="Rules & preferences" status={sectionStatuses[6]} summary={sectionSummary(6, form, images)}>
            <div className="space-y-4">
              {form.listing_type !== 'sale' && (
                <SpecField fieldKey="pet_policy" surface="owner_form" value={form.pet_policy} onChange={(v: string) => updateField("pet_policy", v)} />
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
                />
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
              />
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
                              for (const f of files) { await uploadPhoto(f, section); }
                            }} />
                        </label>
                      </div>
                      <div className="p-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {sectionImgs.map((img) => (
                          <div key={img.id} className="relative group aspect-square rounded overflow-hidden bg-muted">
                            <img src={img.url} alt="" className="w-full h-full object-cover" />
                            {img.is_primary && <span className="absolute top-1 left-1 bg-green-500 text-white text-xs px-1.5 py-0.5 rounded">Cover</span>}
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 p-1">
                              <button type="button" onClick={() => setPrimaryPhoto(img.id)} className="text-xs bg-white text-gray-800 px-2 py-1 rounded">★ Cover</button>
                              <button type="button" onClick={() => deletePhoto(img.id)} className="text-xs bg-white text-red-600 px-2 py-1 rounded">Delete</button>
                            </div>
                          </div>
                        ))}
                        {Object.keys(uploadingFiles).filter((k) => k.startsWith(section)).map((k) => (
                          <div key={k} className="aspect-square rounded bg-muted flex items-center justify-center text-xs text-muted-foreground">Uploading…</div>
                        ))}
                        {sectionImgs.length === 0 && Object.keys(uploadingFiles).filter((k) => k.startsWith(section)).length === 0 && (
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
                <Button variant="outline" onClick={() => { setShowPreview(true); posthog?.capture("commons_listing_preview_opened"); }}>
                  <Eye className="h-4 w-4 mr-1.5" /> Preview the Listing
                </Button>
              </div>
            </div>
          </SectionShell>
        </Accordion>

        {/* Sticky footer submit bar */}
        <div className="fixed bottom-16 md:bottom-0 left-0 right-0 z-30 bg-background border-t px-4 py-3 md:pl-64">
          <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
            <div className="text-xs">
              <SaveStateIndicator state={saveState} />
              <p className="text-muted-foreground mt-0.5">{requiredComplete}/5 required</p>
            </div>
            <div className="flex gap-2">
              {propertyId && path === "A" && (
                <Button variant="outline" onClick={() => saveNow()}>Save</Button>
              )}
              {!readOnly && (
                <Button
                  onClick={submit}
                  disabled={submitting || !propertyId || (path === "B" && Object.keys(editRequestPayload.field_changes).length === 0 && editRequestPayload.photo_changes.add.length === 0 && editRequestPayload.photo_changes.delete.length === 0 && editRequestPayload.photo_changes.update.length === 0)}
                  className={cn(path === "A" && (requiredComplete < 5 || !form.consent || !form.terms_privacy_consent || images.length < 3) ? "opacity-70" : "")}
                >
                  {submitting ? "Submitting..." : path === "B" ? "Submit for review" : "Submit for review"}
                </Button>
              )}
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
            <Button onClick={() => navigate("/my-properties")}>Go to my properties</Button>
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
    case "notice_period_months": return { notice_period_months: parseNum(strVal) };
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
