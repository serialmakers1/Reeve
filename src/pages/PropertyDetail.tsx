import React, { useState, useEffect, useCallback, useMemo, useRef, Suspense } from "react";
const CommentSection = React.lazy(() => import("@/components/comments/CommentSection"));
import PublicTimeline, { type PublicTimelineRow } from "@/components/property-detail/PublicTimeline";
import { formatBuildingLine } from "@/lib/location/formatBuildingLine";
import RequestContactPanel from "@/components/property-detail/RequestContactPanel";
import ManageListingCard from "@/components/property-detail/ManageListingCard";
import PropertyCTABar from "@/components/property-detail/PropertyCTABar";
import BackToTopFAB from "@/components/property-detail/BackToTopFAB";
import PropertyUnavailable from "@/components/property-detail/PropertyUnavailable";
import PropertySidebar from "@/components/property-detail/PropertySidebar";
import OwnerCard from "@/components/property-detail/OwnerCard";
import OwnerPerformanceStrip from "@/components/property-detail/OwnerPerformanceStrip";
import HowItWorksStrip from "@/components/property-detail/HowItWorksStrip";
import PriceAndTerms from "@/components/property-detail/PriceAndTerms";
import { LISTER_ROLE_BADGE } from "@/components/property-detail/listerRoleBadge";
import ClampedText from "@/components/property-detail/ClampedText";
import { useOwnerCard } from "@/hooks/useOwnerCard";
import PageSection from "@/components/property-detail/PageSection";
import NoSurprisesCard from "@/components/property-detail/NoSurprisesCard";
import AtAGlance from "@/components/property-detail/AtAGlance";
import MonthlyCosts from "@/components/property-detail/MonthlyCosts";
import FurnishingDetails from "@/components/property-detail/FurnishingDetails";
import BuildingAmenities from "@/components/property-detail/BuildingAmenities";
import AllDetailsAccordion from "@/components/property-detail/AllDetailsAccordion";
import { formatEnumLabel } from "@/utils/property/formatEnumLabel";
import { cn } from "@/lib/utils";
import type { CommentSectionHandle } from "@/components/comments/CommentSection";
import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
import posthog from "posthog-js";
import {
  SEARCH_EVENTS,
  getSearchSessionId,
  getDeviceClass,
  getActiveFilterGroups,
} from "@/features/search/analytics/searchAnalytics";
import { parseSearchUrl } from "@/features/search/state/parseSearchUrl";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { useFavourites } from "@/hooks/useFavourites";
import { useTrackPropertyView } from "@/hooks/useTrackPropertyView";
import FavouriteHeart from "@/components/FavouriteHeart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
  type CarouselApi,
} from "@/components/ui/carousel";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
  DrawerFooter,
} from "@/components/ui/drawer";
import Layout from "@/components/Layout";
// F1-B3e: SpecField + PUBLIC_DETAILS_GRID_KEYS no longer used on this page.
import { PROPERTY_TYPE_OPTIONS } from "@/config/property-form";
import {
  ArrowLeft,
  Shield,
  Droplets,
  Zap,
  Flame,
  Home,
  Maximize2,
  Building2,
  Layers,
  Armchair,
  Car,
  Bike,
  KeyRound,
  PawPrint,
  X,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Waves,
  ArrowUpDown,
  BatteryCharging,
  ShieldCheck,
  Cctv,
  Phone,
  TreePine,
  Users,
  CircleDot,
  Wind,
  Compass,
  CalendarDays,
  Youtube,
  MapPin,
  Share2,
  AlignLeft,
  ScrollText,
  Play,
  Eye,
  MessageCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";

// ─── Types ───────────────────────────────────────────────────────────────────

interface PropertyData {
  id: string;
  owner_id: string | null;
  status: string;
  building_name: string;
  floor_number: number | null;
  total_floors: number | null;
  locality: string | null;
  city: string;
  bhk: string;
  square_footage: number | null;
  furnishing: string;
  listed_rent: number;
  parking_4w: string;
  parking_2w: string;
  amenities: string[] | null;
  pet_policy: string | null;
  available_from: string | null;
  property_type: string | null;
  building_rules: string | null;
  security_deposit_months: number;
  security_deposit_amount: number | null; // Sync Prompt 1 (D-167) — public deposit display prefers this over months × rent.
  society_maintenance_approx: number | null;
  maintenance_included_in_rent: boolean;
  gas_type: string | null;
  utility_water_included: boolean;
  utility_electricity_included: boolean;
  utility_gas_included: boolean;
  main_door_lock_type: string | null;
  bathrooms: number | null;
  balconies: number | null;
  facing: string | null;
  building_age_years: number | null;
  furnishing_detail: unknown;
  youtube_walkthrough_url: string | null;
  // Prompt 8 (D-159) — India fields.
  landmark: string | null;
  annual_rent_increase_pct: number | null;
  water_storage: string | null;
  parking_2w_count: number | null;
  parking_4w_count: number | null;
  parking_notes: string | null;
  // Prompt 10b (D-162) — rent/sale.
  listing_type: string;
  // F3-C16: lister_role — 'owner' | 'broker' | 'property_manager' | 'builder'
  lister_role: string;
  sale_price: number | null;
  price_negotiable: boolean | null;
  expected_price_per_sqft: number | null;
  possession_status: string | null;
  possession_date: string | null;
  rera_registration_number: string | null;
  khata_type: string | null;
  property_tax_paid_upto: string | null;
  // Phase 1.5 addendum (D-166) — move-in charges + brokerage.
  move_in_charges_amount: number | null;
  // F2-D4: rent_brokerage_type + rent_brokerage_months removed from public surface.
  rent_brokerage_fixed_amount: number | null;
  sale_brokerage_pct: number | null;
  // P1 additions (2026-07-21).
  lock_in_months: number | null;
  notice_period_days: number | null;
  super_built_up_area: number | null;
  water_source: string[] | null;
  // P6: freshness chip in PublicTimeline.
  listed_at: string | null;
  // F1-B2c: owner-authored "About the Property" copy (rendered in place of description).
  building_notes: string | null;
  // Google Maps Phase 1 — address display + action buttons
  formatted_address: string | null;
  latitude: number | null;
  longitude: number | null;
  streetview_available: boolean | null;
  streetview_show_in_listing: boolean;
  streetview_pano_id: string | null;
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Sync Prompt 1 (D-167) — public deposit display.
 * Precedence: owner-entered amount → months × rent → 2 × rent default.
 * When amount and months both set, months appears as parenthetical context.
 */
export function formatDeposit(
  amount: number | null | undefined,
  months: number | null | undefined,
  rent: number,
): string {
  if (typeof amount === "number" && amount > 0) {
    const base = `₹${amount.toLocaleString("en-IN")}`;
    return typeof months === "number" && months > 0 ? `${base} (${months} months)` : base;
  }
  const multiplier = typeof months === "number" && months > 0 ? months : 2;
  return `₹${(rent * multiplier).toLocaleString("en-IN")}`;
}

function formatIndianRupee(n: number): string {
  const s = Math.round(n).toString();
  if (s.length <= 3) return "₹" + s;
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3);
  const formatted = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return "₹" + formatted + "," + last3;
}

function bhkLabel(bhk: string): string {
  const map: Record<string, string> = {
    studio: "Studio",
    "1BHK": "1 BHK",
    "2BHK": "2 BHK",
    "3BHK": "3 BHK",
    "4BHK": "4 BHK",
    "5BHK_plus": "5 BHK+",
  };
  return map[bhk] ?? bhk;
}

function furnishingLabel(f: string): string {
  const map: Record<string, string> = {
    unfurnished: "Unfurnished",
    semi_furnished: "Semi-Furnished",
    fully_furnished: "Fully Furnished",
  };
  return map[f] ?? f;
}

function parkingLabel(p: string): string {
  const map: Record<string, string> = {
    none: "None",
    open: "Open",
    covered: "Covered",
    both: "Both",
  };
  return map[p] ?? p;
}

function formatAvailableFrom(date: string | null): string {
  if (!date) return "Available Now";
  const d = new Date(date);
  if (d <= new Date()) return "Available Now";
  return `Available from ${d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`;
}

// P7B Fix B: AMENITY_ICONS removed — dead since P5 replaced the hard-coded
// building amenities grid with <BuildingAmenities>. Icons now live in
// src/components/property-detail/BuildingAmenities.tsx via ICON_MAP.

const FURNISHING_LABELS: Record<string, string> = {
  ac: 'AC', bed: 'Bed', wardrobe: 'Wardrobe', sofa: 'Sofa',
  dining_table: 'Dining Table', tv: 'TV', fridge: 'Fridge',
  washing_machine: 'Washing Machine', geyser: 'Geyser',
  microwave: 'Microwave', modular_kitchen: 'Modular Kitchen',
  curtains: 'Curtains', water_purifier: 'Water Purifier'
};

interface FurnishingDetailItem {
  item: string
  count?: number
  size?: string
  rooms?: string
}

const FURNISHING_DETAIL_LABELS: Record<string, string> = {
  bed: 'Bed', mattress: 'Mattress', ac: 'AC', wardrobe: 'Wardrobe',
  geyser: 'Geyser', fridge: 'Fridge', washing_machine: 'Washing Machine',
  tv: 'TV', sofa: 'Sofa', dining_table: 'Dining Table', microwave: 'Microwave',
  modular_kitchen: 'Modular Kitchen', water_purifier: 'Water Purifier',
  curtain_rod: 'Curtain Rod', curtains: 'Curtains',
  stove: 'Stove', chimney: 'Chimney', fan: 'Fan', exhaust_fan: 'Exhaust Fan'
};

const BUILDING_AMENITY_LABELS: Record<string, string> = {
  lift: 'Lift', security_24hr: '24hr Security', power_backup: 'Power Backup',
  gym: 'Gym', swimming_pool: 'Swimming Pool', clubhouse: 'Clubhouse',
  visitor_parking: 'Visitor Parking', cctv: 'CCTV',
  children_play_area: "Children's Play Area", intercom: 'Intercom',
  park: 'Park', maintenance_staff: 'Maintenance Staff', gated_access: 'Gated Access',
  garden: 'Garden', sports_facility: 'Sports Facility',
  community_hall: 'Community Hall', water_supply_24hr: '24hr Water Supply'
};

function amenityLabel(a: string): string {
  return a.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}


// ─── Placeholder images ─────────────────────────────────────────────────────

const PLACEHOLDER_IMAGES: PropertyImage[] = Array.from({ length: 5 }, (_, i) => ({
  id: `placeholder-${i}`,
  url: `https://placehold.co/800x500/e2e8f0/94a3b8?text=Property+Photo+${i + 1}`,
  caption: null,
  is_primary: i === 0,
  is_floor_plan: false,
  sort_order: i,
  section: null,
}));

// ─── Skeleton Loader ─────────────────────────────────────────────────────────

function PropertySkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-64 w-full rounded-none" />
      <div className="space-y-3 px-4">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-1/3" />
        <div className="flex gap-2">
          <Skeleton className="h-6 w-28 rounded-full" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
        <Skeleton className="h-32 w-full rounded-lg" />
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-40 w-full rounded-lg" />
      </div>
    </div>
  );
}

// ─── Lightbox ────────────────────────────────────────────────────────────────

function Lightbox({
  images,
  currentIndex,
  onClose,
  onPrev,
  onNext,
}: {
  images: PropertyImage[];
  currentIndex: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onPrev();
      if (e.key === "ArrowRight") onNext();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose, onPrev, onNext]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/90">
      <button
        onClick={onClose}
        className="absolute right-4 top-4 z-10 rounded-full bg-background/20 p-2 text-background transition-colors hover:bg-background/40"
        aria-label="Close"
      >
        <X className="h-6 w-6" />
      </button>
      <button
        onClick={onPrev}
        className="absolute left-3 z-10 rounded-full bg-background/20 p-2 text-background transition-colors hover:bg-background/40"
        aria-label="Previous"
      >
        <ChevronLeft className="h-6 w-6" />
      </button>
      <button
        onClick={onNext}
        className="absolute right-3 z-10 rounded-full bg-background/20 p-2 text-background transition-colors hover:bg-background/40"
        aria-label="Next"
      >
        <ChevronRight className="h-6 w-6" />
      </button>
      <img
        src={images[currentIndex].url}
        alt={images[currentIndex].caption || `Photo ${currentIndex + 1}`}
        className="max-h-[85vh] max-w-[95vw] rounded object-contain"
      />
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-background/30 px-3 py-1 text-sm font-medium text-background">
        {currentIndex + 1} / {images.length}
      </div>
    </div>
  );
}

// ─── Login Prompt Drawer ─────────────────────────────────────────────────────

function LoginDrawer({
  open,
  onOpenChange,
  propertyId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  propertyId?: string;
}) {
  const returnPath = propertyId ? `/property/${propertyId}` : "/search";
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Please log in to continue</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-2 text-sm text-muted-foreground">
          You need to be logged in to schedule a visit or apply for this property.
        </div>
        <DrawerFooter>
          <Button asChild className="min-h-[44px]">
            <Link to={`/login?returnTo=${encodeURIComponent(returnPath)}`}>Log In</Link>
          </Button>
          <DrawerClose asChild>
            <Button variant="outline" className="min-h-[44px]">
              Cancel
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

const PropertyDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const routeLocation = useLocation();
  const fromSearch = (routeLocation.state as { fromSearch?: string } | null)?.fromSearch ?? null;

  // Sanitized search context for analytics — only available when arrived from search
  const searchOriginContext = useMemo<Record<string, unknown> | null>(() => {
    if (!fromSearch) return null;
    try {
      const params = new URL(fromSearch, window.location.origin).searchParams;
      const parsed = parseSearchUrl(params);
      const mode = parsed.context.mode ?? "rent";
      return {
        search_session_id: getSearchSessionId(),
        listing_mode: parsed.context.mode ?? null,
        city_id: null,
        selected_location_count: parsed.context.locations.length,
        property_type: parsed.context.propertyType ?? null,
        filter_groups: getActiveFilterGroups(parsed.filters, mode),
        result_count_bucket: "unknown",
        view_mode: "list",
        device_class: getDeviceClass(),
      };
    } catch {
      return null;
    }
  }, [fromSearch]);
  const { user, session, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const [property, setProperty] = useState<PropertyData | null>(null);
  const ownerCard = useOwnerCard(property?.owner_id ?? null);
  const ownerDisplayName = ownerCard.displayName;
  const [rawAmenities, setRawAmenities] = useState<{ furnishing_items?: string[]; building?: string[] } | null>(null);
  const [images, setImages] = useState<PropertyImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Gallery state
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [totalSlides, setTotalSlides] = useState(0);
  const [galleryTab, setGalleryTab] = useState<"all" | "floorplan" | string>("all");
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Login drawer
  const [loginDrawerOpen, setLoginDrawerOpen] = useState(false);

  // Own property detection
  const [isOwnProperty, setIsOwnProperty] = useState(false);
  // F1-B6a: single source for owner display name (RCP consumer) — deduplicated
  // via TanStack cache; other consumers (OwnerCard, PropertySidebar) hit the
  // same key and share this fetch.
  // F1-B1d: expand toggles moved into ClampedText.
  const [publicTimeline, setPublicTimeline] = useState<PublicTimelineRow[]>([]);
  // A2: owner display name via parallel public_profiles fetch — fed to
  // RequestContactPanel so the consent checkbox names the real owner.
  // F1-B6a: ownerDisplayName + ownerRatingSummary now come from useOwnerCard
  // (called after property loads). Old public_profiles + get_user_rating_summary
  // fetches removed from the main effect — same data was already being fetched
  // by useOwnerCard via OwnerCard / PropertySidebar.
  // B6: public stats (view_count + comment_count) for the stats line and CommentSection prop.
  const [propertyStats, setPropertyStats] = useState<{ view_count: number; comment_count: number } | null>(null);
  // C4: owner rating summary — parallel fetch, drives the "Listed by" sub-line.
  const commentSectionRef = useRef<CommentSectionHandle | null>(null);
  const commentAnchorRef = useRef<HTMLDivElement | null>(null);

  // #comments deep link — scroll once per navigation, after property data loads.
  // routeLocation.key changes on every navigation (incl. re-clicking the same
  // #comments URL), so repeated clicks scroll again.
  const handledCommentsNavRef = useRef<string | null>(null);
  useEffect(() => {
    if (loading || !property?.id) return;
    if (routeLocation.hash !== "#comments") return;
    const navKey = `${routeLocation.key}:${property.id}:${routeLocation.hash}`;
    if (handledCommentsNavRef.current === navKey) return;
    handledCommentsNavRef.current = navKey;
    // Ensure the (lazy) comments body starts loading, then scroll after layout.
    commentSectionRef.current?.triggerLoad();
    const raf = requestAnimationFrame(() => {
      commentAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => cancelAnimationFrame(raf);
  }, [loading, property?.id, routeLocation.key, routeLocation.hash]);

  // Favourites
  const { isFavourited, toggleFavourite, isLoggedIn: favLoggedIn } = useFavourites();

  // B3: view tracking — fires once per propertyId, RPC handles owner exclusion + dedup.
  useTrackPropertyView(property?.id, property?.owner_id);

  // Fetch property + images
  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      setLoading(true);
      setNotFound(false);

      // F1-B6a: single Promise.all — properties, images, activity log, stats
      // all fire in parallel. public_profiles + get_user_rating_summary now
      // handled by useOwnerCard (shared TanStack cache with OwnerCard/Sidebar).
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sbAny = supabase as any;
      const [propRes, imgRes, logRes, statsRes] = await Promise.all([
        supabase
          .from("properties")
          .select(
            "id, owner_id, status, building_name, floor_number, total_floors, locality, city, bhk, square_footage, furnishing, listed_rent, parking_4w, parking_2w, amenities, pet_policy, available_from, property_type, building_rules, security_deposit_months, security_deposit_amount, society_maintenance_approx, maintenance_included_in_rent, gas_type, utility_water_included, utility_electricity_included, utility_gas_included, main_door_lock_type, bathrooms, balconies, facing, building_age_years, furnishing_detail, youtube_walkthrough_url, landmark, annual_rent_increase_pct, water_storage, parking_2w_count, parking_4w_count, parking_notes, listing_type, sale_price, price_negotiable, expected_price_per_sqft, possession_status, possession_date, rera_registration_number, khata_type, property_tax_paid_upto, move_in_charges_amount, rent_brokerage_fixed_amount, sale_brokerage_pct, notice_period_days, lock_in_months, super_built_up_area, water_source, listed_at, building_notes, lister_role, formatted_address, latitude, longitude, streetview_available, streetview_show_in_listing, streetview_pano_id"
          )
          .eq("id", id)
          .maybeSingle(),
        supabase
          .from("property_images")
          .select("id, url, caption, is_primary, is_floor_plan, sort_order, section")
          .eq("property_id", id)
          .order("section", { ascending: true, nullsFirst: true })
          .order("sort_order", { ascending: true }),
        sbAny
          .from("property_activity_log")
          .select("id, action, payload, is_public, created_at")
          .eq("property_id", id)
          .eq("is_public", true)
          .order("created_at", { ascending: false }),
        sbAny.rpc("get_property_public_stats", { p_property_id: id }),
      ]);

      if (!propRes.data) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      // Prompt 8: cast around Supabase's SelectQueryError inference cascade
      // that triggers on this long select string. Runtime shape matches PropertyData.
      const raw = propRes.data as unknown as PropertyData & { amenities: unknown };
      setProperty({
        ...raw,
        amenities: Array.isArray(raw.amenities) ? (raw.amenities as string[]) : null,
      } as PropertyData);

      // Store raw amenities jsonb for furnishing/building display
      if (raw.amenities && typeof raw.amenities === 'object' && !Array.isArray(raw.amenities)) {
        setRawAmenities(raw.amenities as { furnishing_items?: string[]; building?: string[] });
      }

      const fetchedImages = (imgRes.data ?? []) as unknown as PropertyImage[];
      const sortedImages = [...fetchedImages].sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0));
      setImages(sortedImages.length > 0 ? sortedImages : PLACEHOLDER_IMAGES);

      // F1-B6a: stats consumed from the primary Promise.all result.
      {
        const row = Array.isArray(statsRes?.data) ? (statsRes.data as unknown[])[0] : statsRes?.data;
        const s = row as { view_count?: number; comment_count?: number } | null;
        if (s) {
          setPropertyStats({
            view_count: Number(s.view_count ?? 0),
            comment_count: Number(s.comment_count ?? 0),
          });
        }
      }

      // Timeline result from the primary Promise.all above.
      const logRows = logRes.data;
      if (logRows) {
        setPublicTimeline(logRows as PublicTimelineRow[]);
        if ((logRows as PublicTimelineRow[]).length > 0) {
          posthog?.capture("commons_property_public_timeline_viewed", { property_id: raw.id, event_count: (logRows as PublicTimelineRow[]).length });
        }
      }

      setLoading(false);
    };

    fetchData();
  }, [id]);

  // Fetch auth-dependent data (own-property flag + application history).
  // Separate effect so it re-runs when auth resolves after mount, preventing
  // the Apply Now button from showing for users with active applications on
  // hard refresh or direct navigation (auth hydration race condition).
  useEffect(() => {
    if (authLoading) return;
    if (!id) return;

    const currentUserId = user?.id;

    // Own-property detection requires property to be loaded
    if (property) {
      setIsOwnProperty(!!(currentUserId && property.owner_id === currentUserId));
    }

    // P4: fire archived/unlisted analytics from an effect (previously fired
    // inline in render return — bad side-effect placement).
    if (
      property &&
      currentUserId &&
      property.owner_id === currentUserId &&
      (property.status === "archived" || property.status === "unlisted")
    ) {
      posthog?.capture("commons_archived_property_notice_shown", {
        property_id: property.id,
        status: property.status,
      });
    }

    if (!currentUserId) {
      return;
    }
  }, [id, user, authLoading, property]);

  // Carousel slide tracking
  useEffect(() => {
    if (!carouselApi) return;
    const onSelect = () => {
      setCurrentSlide(carouselApi.selectedScrollSnap());
      setTotalSlides(carouselApi.scrollSnapList().length);
    };
    onSelect();
    carouselApi.on("select", onSelect);
    return () => { carouselApi.off("select", onSelect); };
  }, [carouselApi]);

  // Lightbox nav
  const lightboxImages = galleryTab === "floorplan"
    ? images.filter(img => img.is_floor_plan)
    : galleryTab === "all" || galleryTab === "photos"
      ? [...images.filter(img => !img.is_floor_plan), ...images.filter(img => img.is_floor_plan)]
      : images.filter(img => img.section === galleryTab && !img.is_floor_plan);
  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  // P4: Web Share (native sheet) with clipboard fallback. Canonical URL always
  // https://reeve.in — never window.location.href (would leak localhost in dev).
  const handleShare = useCallback(async () => {
    if (!property) return;
    const shareUrl = `https://reeve.in/property/${property.id}`;
    const bhk = formatEnumLabel("bhk", property.bhk);
    const priceBit = property.listing_type === "sale"
      ? (typeof property.sale_price === "number" ? ` — ₹${property.sale_price.toLocaleString("en-IN")}` : "")
      : (typeof property.listed_rent === "number" ? ` — ₹${property.listed_rent.toLocaleString("en-IN")}/mo` : "");
    const title = `${bhk} in ${property.building_name ?? "property"}${priceBit} on Reeve`;
    const shareData: ShareData = { title, url: shareUrl };
    try {
      if (typeof navigator !== "undefined" && navigator.share && (!navigator.canShare || navigator.canShare(shareData))) {
        await navigator.share(shareData);
        return;
      }
    } catch { /* user cancel — not an error */ }
    try {
      await navigator.clipboard?.writeText(shareUrl);
      toast({ description: "Link copied" });
    } catch { /* clipboard blocked — silent */ }
  }, [property, toast]);
  const lightboxPrev = useCallback(() => {
    setLightboxIndex((i) => (i > 0 ? i - 1 : lightboxImages.length - 1));
  }, [lightboxImages.length]);
  const lightboxNext = useCallback(() => {
    setLightboxIndex((i) => (i < lightboxImages.length - 1 ? i + 1 : 0));
  }, [lightboxImages.length]);

  // CTA handlers
  const handleVerificationGate = (destination: string): boolean => {
    if (!isAuthenticated) {
      setLoginDrawerOpen(true);
      return false;
    }
    if (!user?.phone_verified || !user?.email_verified) {
      const profileUrl = `/profile?returnTo=${encodeURIComponent(destination)}`;
      posthog?.capture("verification_gate_shown", { trigger: "cta" });
      if (isMobile) {
        navigate(profileUrl);
      } else {
        window.open(profileUrl, "_blank");
      }
      return false;
    }
    return true;
  };


  const sections = useMemo(() => {
    const names = images
      .filter(img => !img.is_floor_plan && img.section && img.section.toLowerCase() !== "floor plan")
      .map(img => img.section as string);
    return Array.from(new Set(names));
  }, [images]);

  // ─── Render states ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <Layout>
        <PropertySkeleton />
      </Layout>
    );
  }

  if (notFound || !property) {
    return (
      <Layout>
        <PropertyUnavailable />
      </Layout>
    );
  }

  // Owner viewing their own archived/unlisted property → generic unavailable page.
  // RLS lets the owner fetch these; non-owners are already blocked and fall
  // through to the notFound branch above.
  if (isOwnProperty && (property.status === "archived" || property.status === "unlisted")) {
    return (
      <Layout>
        <PropertyUnavailable />
      </Layout>
    );
  }

  const photoImages = images.filter((img) => !img.is_floor_plan);
  const floorPlanImages = images.filter((img) => img.is_floor_plan);
  const hasFloorPlan = floorPlanImages.length > 0;
  const activeImages = galleryTab === "floorplan"
    ? floorPlanImages
    : galleryTab === "all" || galleryTab === "photos"
      ? [...photoImages, ...floorPlanImages]
      : images.filter(img => img.section === galleryTab && !img.is_floor_plan);

  // Sync Prompt 1 (D-167) — prefers owner-entered amount over months × rent.
  const depositDisplay = formatDeposit(property.security_deposit_amount, property.security_deposit_months, property.listed_rent);


  // F1-B3e: `shouldShowGridField` + `visibleGridKeys` removed — replaced by
  // AtAGlance + AllDetailsAccordion (each with their own isFieldSet gates)
  // and NoSurprisesCard. `PUBLIC_DETAILS_GRID_KEYS` is unused on this page.

  return (
    <Layout>
      {/* Lightbox */}
      {lightboxOpen && lightboxImages.length > 0 && (
        <Lightbox
          images={lightboxImages}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxOpen(false)}
          onPrev={lightboxPrev}
          onNext={lightboxNext}
        />
      )}

      {/* Login Drawer */}
      <LoginDrawer open={loginDrawerOpen} onOpenChange={setLoginDrawerOpen} propertyId={id} />

      {/* P6: outer container widened to accommodate right sidebar. */}
      <div className="mx-auto max-w-6xl px-4 lg:px-6 pb-8">
        {/* Back button */}
        <div className="px-4 py-3">
          <button
            onClick={() => fromSearch ? navigate(fromSearch, { replace: true }) : navigate(-1)}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
        </div>

        {/* P6: contact panel moved into left column, above CommentSection. */}

        {/* F1-B4a: gallery moved OUT of the left column so it spans the full
            container width on desktop. Overlay (share + heart) sits above the
            outer relative container and appears on both mobile carousel and
            desktop collage. */}
        <section className="relative mt-4">
          <div className="absolute right-3 top-3 z-10 flex items-center gap-2">
            <button
              type="button"
              aria-label="Share this listing"
              onClick={handleShare}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm"
            >
              <Share2 className="h-[18px] w-[18px]" strokeWidth={2} />
            </button>
            {!isOwnProperty && (
              <FavouriteHeart
                filled={id ? isFavourited(id) : false}
                onClick={async () => {
                  if (!favLoggedIn) { setLoginDrawerOpen(true); return; }
                  if (!id) return;
                  const wasAdding = !isFavourited(id);
                  const success = await toggleFavourite(id);
                  if (success && wasAdding) {
                    posthog?.capture(SEARCH_EVENTS.FAVOURITE_COMPLETED, {
                      property_id: id,
                      source_surface: "property_detail",
                      ...(searchOriginContext ?? {
                        search_session_id: null,
                        listing_mode: null,
                        city_id: null,
                        selected_location_count: null,
                        property_type: null,
                        filter_groups: null,
                        result_count_bucket: "unknown",
                        view_mode: null,
                        device_class: getDeviceClass(),
                      }),
                    });
                  }
                }}
                className="!bg-black/40 !text-white hover:!bg-black/60"
              />
            )}
          </div>

          {/* F1F-1: section tabs pulled out of the mobile wrapper — they filter
              activeImages for both mobile carousel AND desktop collage. */}
          {(hasFloorPlan || sections.length > 0) && (
            <div className="flex gap-1 pb-2 overflow-x-auto">
              <button
                onClick={() => setGalleryTab("all")}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  galleryTab === "all"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                All Photos
              </button>
              {sections.map(section => (
                <button
                  key={section}
                  onClick={() => setGalleryTab(section)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                    galleryTab === section
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {section}
                </button>
              ))}
              <button
                onClick={() => setGalleryTab("floorplan")}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  galleryTab === "floorplan"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                Floor Plan
              </button>
            </div>
          )}

          {/* F1-B4b: mobile carousel — embla + counter, hidden on lg+. */}
          <div className="lg:hidden">
            <div className="relative">
              <Carousel setApi={setCarouselApi} className="w-full">
                <CarouselContent className="-ml-0">
                  {activeImages.map((img, idx) => (
                    <CarouselItem key={img.id} className="pl-0">
                      <button
                        onClick={() => openLightbox(idx)}
                        className="block w-full cursor-zoom-in"
                      >
                        <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
                          <img
                            src={img.url}
                            alt={img.caption || `Property photo ${idx + 1}`}
                            loading={idx === 0 ? "eager" : "lazy"}
                            fetchPriority={idx === 0 ? "high" : "auto"}
                            decoding="async"
                            className="h-full w-full object-cover"
                          />
                        </div>
                      </button>
                    </CarouselItem>
                  ))}
                </CarouselContent>
              </Carousel>
              <div className="absolute bottom-3 right-3 rounded-full bg-foreground/60 px-2.5 py-0.5 text-xs font-medium text-background">
                {currentSlide + 1} / {totalSlides || activeImages.length}
              </div>
            </div>
          </div>

          {/* F1-B4b: desktop collage — hero + up to 4 tiles, +N overlay on last. */}
          <div className="hidden lg:block">
            {(() => {
              const imgs = activeImages;
              if (imgs.length === 0) return null;
              if (imgs.length === 1) {
                return (
                  <button
                    type="button"
                    onClick={() => openLightbox(0)}
                    className="block h-[420px] w-full cursor-zoom-in overflow-hidden rounded-2xl bg-muted"
                  >
                    <img
                      src={imgs[0].url}
                      alt={imgs[0].caption || "Property photo 1"}
                      loading="eager"
                      fetchPriority="high"
                      decoding="async"
                      className="h-full w-full object-cover"
                    />
                  </button>
                );
              }
              const tiles = imgs.slice(1, 5);
              const extra = Math.max(0, imgs.length - 5);
              const cols = imgs.length >= 5 ? "grid-cols-[2fr_1fr_1fr]" : "grid-cols-[2fr_1fr]";
              const rows = imgs.length >= 5 || imgs.length === 3 ? "grid-rows-2" : imgs.length === 4 ? "grid-rows-3" : "grid-rows-1";
              const heroSpan = imgs.length >= 5 || imgs.length === 3 ? "row-span-2" : imgs.length === 4 ? "row-span-3" : "row-span-1";
              return (
                <div className={`grid ${cols} ${rows} h-[420px] gap-2 overflow-hidden rounded-2xl`}>
                  <button
                    type="button"
                    onClick={() => openLightbox(0)}
                    className={`${heroSpan} cursor-zoom-in overflow-hidden bg-muted`}
                  >
                    <img
                      src={imgs[0].url}
                      alt={imgs[0].caption || "Property photo 1"}
                      loading="eager"
                      fetchPriority="high"
                      decoding="async"
                      className="h-full w-full object-cover"
                    />
                  </button>
                  {tiles.map((img, idx) => {
                    const abs = idx + 1;
                    const isLastVisible = idx === tiles.length - 1 && extra > 0;
                    return (
                      <button
                        type="button"
                        key={img.id}
                        onClick={() => openLightbox(abs)}
                        className="relative cursor-zoom-in overflow-hidden bg-muted"
                      >
                        <img
                          src={img.url}
                          alt={img.caption || `Property photo ${abs + 1}`}
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-cover"
                        />
                        {isLastVisible && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                            <span className="text-sm font-semibold text-white">+{extra} photos</span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </section>

        <div className="lg:grid lg:grid-cols-[1fr_360px] lg:gap-10 lg:items-start mt-4">
          {/* ─── Main Column ────────────────────────────────────── */}
          <div className="space-y-5 min-w-0">

            {/* P5 header — chips, title, location, action pills, stats.
                Floor line, "Listed by", rating line, and promo pills removed
                (they moved to AtAGlance / OwnerCard [P6] / NoSurprisesCard). */}
            <section className="space-y-2 px-4 lg:px-0">
              <div className="flex flex-wrap items-center gap-2">
                {property.listing_type && (
                  <span className="inline-flex rounded-full border bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                    {formatEnumLabel("listing_type", property.listing_type)}
                  </span>
                )}
                {property.property_type && (
                  <span className="inline-flex rounded-full border bg-muted px-2.5 py-0.5 text-xs font-medium capitalize text-muted-foreground">
                    {PROPERTY_TYPE_OPTIONS.find(o => o.value === property.property_type)?.label ?? property.property_type}
                  </span>
                )}
                {/* F3-C17: lister_role badge — colour-coded, null-safe. */}
                {property.lister_role && LISTER_ROLE_BADGE[property.lister_role] && (
                  <span className={cn(
                    "inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium",
                    LISTER_ROLE_BADGE[property.lister_role].className,
                  )}>
                    {LISTER_ROLE_BADGE[property.lister_role].label}
                  </span>
                )}
              </div>
              <h1 className="mt-2 text-2xl font-bold leading-tight text-foreground">
                {bhkLabel(property.bhk)} in {formatBuildingLine(property, "this area")}
              </h1>
              <p className="text-sm text-muted-foreground">
                {property.formatted_address
                  ? property.formatted_address
                  : [property.locality, property.city].filter(Boolean).join(', ')}
              </p>
              {/* F1-B1c: landmark rendered as-is — owner placeholder already includes "Near". */}
              {property.landmark && (
                <p className="text-sm text-muted-foreground">{property.landmark}</p>
              )}
              {/* Google Maps Phase 1 — location action buttons */}
              {(property.latitude != null && property.longitude != null ||
                (property.streetview_show_in_listing && property.streetview_available)) && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {property.latitude != null && property.longitude != null && (
                    <a
                      href={`https://maps.google.com/?q=${property.latitude},${property.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm text-foreground hover:bg-muted"
                    >
                      <MapPin className="h-3.5 w-3.5" /> View on Google Maps
                    </a>
                  )}
                  {property.streetview_show_in_listing && property.streetview_available && (
                    <a
                      href={
                        property.streetview_pano_id
                          ? `https://www.google.com/maps/@?api=1&map_action=pano&pano=${property.streetview_pano_id}`
                          : `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${property.latitude},${property.longitude}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm text-foreground hover:bg-muted"
                    >
                      <Eye className="h-3.5 w-3.5" /> Street View
                    </a>
                  )}
                </div>
              )}
              {/* F1-B1b: available_from removed from header — surfaces in AtAGlance. */}
              {property.youtube_walkthrough_url && (
                <div className="flex flex-wrap gap-2 pt-2">
                  <a
                    href={property.youtube_walkthrough_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm text-foreground hover:bg-muted"
                  >
                    <Play className="h-3.5 w-3.5" /> Watch Walkthrough
                  </a>
                </div>
              )}
              {(() => {
                const showViews = (propertyStats?.view_count ?? 0) >= 10;
                const showComments = (propertyStats?.comment_count ?? 0) >= 1;
                if (!showViews && !showComments) return null;
                const scrollToComments = () => {
                  commentSectionRef.current?.triggerLoad();
                  commentAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                };
                return (
                  <p className="flex items-center gap-3 pt-1 text-sm text-muted-foreground">
                    {showViews && (
                      <span className="inline-flex items-center gap-1">
                        <Eye className="h-3.5 w-3.5" /> {propertyStats!.view_count} views
                      </span>
                    )}
                    {showComments && (
                      <button
                        type="button"
                        onClick={scrollToComments}
                        className="inline-flex items-center gap-1 hover:text-foreground"
                      >
                        <MessageCircle className="h-3.5 w-3.5" /> {propertyStats!.comment_count === 1 ? "1 comment" : `${propertyStats!.comment_count} comments`}
                      </button>
                    )}
                  </p>
                );
              })()}
            </section>

            {/* P5 new content sections. Order: No Surprises → At a Glance →
                Monthly Costs → What's Included → Building Amenities → All details. */}
            {/* F1-B3d: AtAGlance → MonthlyCosts → NoSurprisesCard for rent.
                F2-E3: sale listings replace the two rent cards with PriceAndTerms. */}
            <AtAGlance property={property} />
            {property.listing_type === "sale" ? (
              <PriceAndTerms property={property} />
            ) : (
              <>
                <MonthlyCosts property={property} />
                <NoSurprisesCard property={property} />
              </>
            )}
            <FurnishingDetails furnishing={property.furnishing} furnishingDetail={property.furnishing_detail} />
            {/* F2-A1: pass the raw JSONB `building` array — the coerced
                `property.amenities` state is null for object-shaped rows. */}
            <BuildingAmenities amenities={rawAmenities?.building ?? null} />
            <AllDetailsAccordion property={property} />

            {/* P5: action pills now live inside the header; price card,
                utility bills, property-details grid, and legacy amenity pills
                are all replaced by NoSurprisesCard / AtAGlance / MonthlyCosts /
                FurnishingDetails / BuildingAmenities / AllDetailsAccordion above. */}

            {/* F1-B2b/c: "About the Property" now reads building_notes (owner
                copy from Rules & preferences). description column retained but
                no longer surfaced. ClampedText gates Read-more on real overflow. */}
            {property.building_notes && property.building_notes.trim() !== "" && (
              <PageSection title="About the Property" icon={AlignLeft}>
                <ClampedText text={property.building_notes} clamp="line-clamp-4" />
              </PageSection>
            )}
            {/* F2-A5: Building Rules is a rental concern; hide for sale listings. */}
            {property.listing_type !== "sale" &&
              property.building_rules &&
              property.building_rules.trim() !== "" && (
                <PageSection title="Building Rules" icon={ScrollText}>
                  <ClampedText text={property.building_rules} clamp="line-clamp-3" />
                </PageSection>
              )}

            {/* P6 reassurance strip — replaces the old No Contact Policy card. */}
            <HowItWorksStrip />

            {/* P6 owner slot — public sees OwnerCard, owner sees performance stats. */}
            {property.owner_id && (
              isOwnProperty ? (
                <OwnerPerformanceStrip
                  propertyId={property.id}
                  isOwnProperty={isOwnProperty}
                  viewCount={propertyStats?.view_count ?? 0}
                  commentCount={propertyStats?.comment_count ?? 0}
                />
              ) : (
                <OwnerCard ownerId={property.owner_id} isOwnProperty={isOwnProperty} listerRole={property.lister_role} />
              )
            )}

            {/* Public listing history — freshness chip powered by listed_at. */}
            {(publicTimeline.length > 0 || property.listed_at) && (
              <PublicTimeline rows={publicTimeline} listed_at={property.listed_at} />
            )}

            {/* P6: contact panel — anchor for CTA smooth-scroll (#contact-panel). */}
            {property?.id && property?.owner_id && (
              <div id="contact-panel" className="scroll-mt-16">
                {isOwnProperty ? (
                  <ManageListingCard propertyId={property.id} />
                ) : (
                  <RequestContactPanel
                    propertyId={property.id}
                    ownerId={property.owner_id}
                    ownerDisplayName={ownerDisplayName}
                    buildingName={property.building_name?.trim() || "this property"}
                    propertyStatus={property.status}
                    listingType={property.listing_type}
                    searchContext={searchOriginContext}
                  />
                )}
              </div>
            )}

            {/* B4/B6: Comments section — lazy loaded, ref for anchor-scroll from stats line. */}
            {property?.id && (
              <div ref={commentAnchorRef} id="comments" className="scroll-mt-16">
                <Suspense fallback={null}>
                  <CommentSection
                    ref={commentSectionRef}
                    propertyId={property.id}
                    propertyOwnerId={property.owner_id ?? ""}
                    commentCount={propertyStats?.comment_count ?? 0}
                  />
                </Suspense>
              </div>
            )}

            {/* P6: No Contact Policy card removed — HowItWorksStrip covers it. */}
          </div>

          {/* P6: right column — sticky sidebar on desktop, hidden on mobile
              (PropertyCTABar handles mobile).
              F2-A3: `self-stretch` extends the right column to the height of the
              left column so `sticky top-4` on the aside has runway to travel. */}
          <div className="hidden lg:block lg:self-stretch">
            {property?.owner_id && (
              <PropertySidebar
                property={property}
                ownerId={property.owner_id}
                isOwnProperty={isOwnProperty}
                isAuthenticated={isAuthenticated}
                viewCount={propertyStats?.view_count ?? 0}
                commentCount={propertyStats?.comment_count ?? 0}
              />
            )}
          </div>
        </div>
      </div>

      {/* P4: sticky CTA bar + back-to-top FAB — mobile only. Not rendered on
          the archived/unlisted/not-found branches (those return earlier). */}
      <PropertyCTABar
        isOwner={isOwnProperty}
        isAuthenticated={!!user}
        listingType={property.listing_type}
        listedRent={property.listed_rent}
        salePrice={property.sale_price}
      />
      <BackToTopFAB />
    </Layout>
  );
};

// ─── Utility Pill ────────────────────────────────────────────────────────────

function UtilityPill({
  icon,
  label,
  included,
}: {
  icon: React.ReactNode;
  label: string;
  included: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${
        included
          ? "border border-green-200 bg-green-50 text-green-700"
          : "border border-border bg-muted text-muted-foreground"
      }`}
    >
      {icon}
      {label} — {included ? "Included in maintenance" : "Separate bill"}
    </span>
  );
}

export default PropertyDetail;
