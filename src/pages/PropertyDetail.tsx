import React, { useState, useEffect, useCallback, useMemo } from "react";
import { WhyReeveFeeLink } from "@/components/WhyReeveFeeModal";
import PublicTimeline, { type PublicTimelineRow } from "@/components/property-detail/PublicTimeline";
import { useParams, useNavigate, Link } from "react-router-dom";
import posthog from "posthog-js";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { useFavourites } from "@/hooks/useFavourites";
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
import { SpecField } from "@/components/property/SpecField";
import { PUBLIC_DETAILS_GRID_KEYS } from "@/config/property-fields";
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
  // COMMONS-HIDE: ClipboardCheck, — only used in eligibility gate drawer (hidden)
  // COMMONS-HIDE: Loader2, — only used in schedule visit CTA (hidden)
  Wind,
  Compass,
  CalendarDays,
  Youtube,
  MapPin,
} from "lucide-react";
// COMMONS-HIDE: import VisitSchedulerModal from "@/components/VisitSchedulerModal";
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
  title: string | null;
  available_from: string | null;
  property_type: string | null;
  description: string | null;
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
  google_maps_url: string | null;
  // Prompt 8 (D-159) — India fields.
  landmark: string | null;
  notice_period_months: number | null;
  annual_rent_increase_pct: number | null;
  water_storage: string | null;
  parking_2w_count: number | null;
  parking_4w_count: number | null;
  parking_notes: string | null;
  // Prompt 10b (D-162) — rent/sale.
  listing_type: string;
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
  rent_brokerage_type: string | null;
  rent_brokerage_fixed_amount: number | null;
  rent_brokerage_months: number | null;
  sale_brokerage_pct: number | null;
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

const AMENITY_ICONS: Record<string, React.ReactNode> = {
  gym: <Dumbbell className="h-3.5 w-3.5" />,
  pool: <Waves className="h-3.5 w-3.5" />,
  lift: <ArrowUpDown className="h-3.5 w-3.5" />,
  power_backup: <BatteryCharging className="h-3.5 w-3.5" />,
  security: <ShieldCheck className="h-3.5 w-3.5" />,
  cctv: <Cctv className="h-3.5 w-3.5" />,
  intercom: <Phone className="h-3.5 w-3.5" />,
  play_area: <TreePine className="h-3.5 w-3.5" />,
  clubhouse: <Users className="h-3.5 w-3.5" />,
  jogging_track: <CircleDot className="h-3.5 w-3.5" />,
};

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

function getFriendlyStatus(status: string): string {
  const map: Record<string, string> = {
    draft: 'Draft',
    submitted: 'Submitted',
    platform_review: 'Under Review',
    platform_rejected: 'Rejected by Platform',
    sent_to_owner: 'Sent to Owner',
    owner_accepted: 'Owner Accepted',
    owner_rejected: 'Owner Rejected',
    owner_countered: 'Owner Countered',
    tenant_countered: 'Tenant Countered',
    payment_pending: 'Payment Pending',
    payment_received: 'Payment Received',
    kyc_pending: 'KYC Pending',
    kyc_passed: 'KYC Passed',
    kyc_failed: 'KYC Failed',
    agreement_pending: 'Agreement Pending',
    lease_active: 'Lease Active',
    withdrawn: 'Withdrawn',
    expired: 'Expired',
    on_hold: 'On Hold',
  };
  return map[status] ?? status;
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

// COMMONS-HIDE: false-as-boolean prevents lint no-constant-binary-expression on {COMMONS_HIDE && ...} blocks
const COMMONS_HIDE = false as boolean;

const PropertyDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, session, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const [property, setProperty] = useState<PropertyData | null>(null);
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

  // Visit scheduling
  const [visitModalOpen, setVisitModalOpen] = useState(false);
  const [existingVisit, setExistingVisit] = useState<{ id: string; scheduled_at: string; status: string } | null>(null);
  const [showVisitConfirmation, setShowVisitConfirmation] = useState(false);
  const [eligibilityGateOpen, setEligibilityGateOpen] = useState(false);
  const [eligibilityChecking, setEligibilityChecking] = useState(false);
  const [visitSchedulingBlocked, setVisitSchedulingBlocked] = useState(false);
  const [scheduleLoading, setScheduleLoading] = useState(false);

  // Application history
  type AppHistoryEntry = {
    id: string;
    status: string;
    attempt_number: number | null;
    reapplication_eligible_from: string | null;
    proposed_rent: number;
    created_at: string;
  };
  const [applicationHistory, setApplicationHistory] = useState<AppHistoryEntry[]>([]);

  // Own property detection
  const [isOwnProperty, setIsOwnProperty] = useState(false);
  const [publicTimeline, setPublicTimeline] = useState<PublicTimelineRow[]>([]);

  // Favourites
  const { isFavourited, toggleFavourite, isLoggedIn: favLoggedIn } = useFavourites();

  // COMMONS-HIDE: Check for existing visit
  // COMMONS-HIDE: const fetchExistingVisit = useCallback(async () => {
  // COMMONS-HIDE:   if (!id) { setExistingVisit(null); return; }
  // COMMONS-HIDE:   if (!user) { setExistingVisit(null); return; }
  // COMMONS-HIDE:   const { data } = await supabase
  // COMMONS-HIDE:     .from("visits")
  // COMMONS-HIDE:     .select("id, scheduled_at, status")
  // COMMONS-HIDE:     .eq("property_id", id)
  // COMMONS-HIDE:     .eq("tenant_id", user.id)
  // COMMONS-HIDE:     .in("status", ["scheduled", "rescheduled", "confirmed"])
  // COMMONS-HIDE:     .maybeSingle();
  // COMMONS-HIDE:   setExistingVisit(data ?? null);
  // COMMONS-HIDE: }, [id, user]);

  // COMMONS-HIDE: const handleVisitScheduled = useCallback(() => {
  // COMMONS-HIDE:   fetchExistingVisit();
  // COMMONS-HIDE:   setShowVisitConfirmation(true);
  // COMMONS-HIDE: }, [fetchExistingVisit]);

  // COMMONS-HIDE: useEffect(() => {
  // COMMONS-HIDE:   fetchExistingVisit();
  // COMMONS-HIDE: }, [fetchExistingVisit]);

  // COMMONS-HIDE: Fetch tenant profile (visit_scheduling_blocked) when session is known
  // COMMONS-HIDE: useEffect(() => {
  // COMMONS-HIDE:   if (authLoading || !session) return;
  // COMMONS-HIDE:   const fetchProfile = async () => {
  // COMMONS-HIDE:     const { data } = await supabase
  // COMMONS-HIDE:       .from("profiles")
  // COMMONS-HIDE:       .select("visit_scheduling_blocked, no_show_count")
  // COMMONS-HIDE:       .eq("user_id", session.user.id)
  // COMMONS-HIDE:       .maybeSingle();
  // COMMONS-HIDE:     setVisitSchedulingBlocked(!!(data as any)?.visit_scheduling_blocked);
  // COMMONS-HIDE:   };
  // COMMONS-HIDE:   fetchProfile();
  // COMMONS-HIDE: }, [authLoading, session]);

  // Fetch property + images
  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      setLoading(true);
      setNotFound(false);

      const [propRes, imgRes] = await Promise.all([
        supabase
          .from("properties")
          .select(
            "id, owner_id, status, building_name, floor_number, total_floors, locality, city, bhk, square_footage, furnishing, listed_rent, parking_4w, parking_2w, amenities, pet_policy, title, available_from, property_type, description, building_rules, security_deposit_months, security_deposit_amount, society_maintenance_approx, maintenance_included_in_rent, gas_type, utility_water_included, utility_electricity_included, utility_gas_included, main_door_lock_type, bathrooms, balconies, facing, building_age_years, furnishing_detail, youtube_walkthrough_url, google_maps_url, landmark, notice_period_months, annual_rent_increase_pct, water_storage, parking_2w_count, parking_4w_count, parking_notes, listing_type, sale_price, price_negotiable, expected_price_per_sqft, possession_status, possession_date, rera_registration_number, khata_type, property_tax_paid_upto, move_in_charges_amount, rent_brokerage_type, rent_brokerage_fixed_amount, rent_brokerage_months, sale_brokerage_pct"
          )
          .eq("id", id)
          .maybeSingle(),
        supabase
          .from("property_images")
          .select("id, url, caption, is_primary, is_floor_plan, sort_order, section")
          .eq("property_id", id)
          .order("section", { ascending: true, nullsFirst: true })
          .order("sort_order", { ascending: true }),
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
      posthog?.capture("property_viewed", {
        property_id: raw.id,
        bhk: raw.bhk,
        locality: raw.locality ?? undefined,
        city: raw.city,
        listed_rent: raw.listed_rent,
        furnishing: raw.furnishing,
      });

      // Store raw amenities jsonb for furnishing/building display
      if (raw.amenities && typeof raw.amenities === 'object' && !Array.isArray(raw.amenities)) {
        setRawAmenities(raw.amenities as { furnishing_items?: string[]; building?: string[] });
      }

      const fetchedImages = (imgRes.data ?? []) as unknown as PropertyImage[];
      const sortedImages = [...fetchedImages].sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0));
      setImages(sortedImages.length > 0 ? sortedImages : PLACEHOLDER_IMAGES);

      // Public activity log timeline (curated events only — RLS enforces is_public=true).
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: logRows } = await (supabase as any)
        .from("property_activity_log")
        .select("id, action, payload, is_public, created_at")
        .eq("property_id", raw.id)
        .eq("is_public", true)
        .order("created_at", { ascending: false });
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

    if (!currentUserId) {
      setApplicationHistory([]);
      return;
    }

    // COMMONS-HIDE: fetchApplicationHistory disabled — CTAs hidden for Commons transition
    // COMMONS-HIDE: const fetchApplicationHistory = async () => {
    // COMMONS-HIDE:   const { data: appHistory } = await supabase
    // COMMONS-HIDE:     .from("applications")
    // COMMONS-HIDE:     .select("id, status, attempt_number, reapplication_eligible_from, proposed_rent, created_at")
    // COMMONS-HIDE:     .eq("property_id", id)
    // COMMONS-HIDE:     .eq("tenant_id", currentUserId)
    // COMMONS-HIDE:     .order("attempt_number", { ascending: false });
    // COMMONS-HIDE:   setApplicationHistory(appHistory ?? []);
    // COMMONS-HIDE: };
    // COMMONS-HIDE: fetchApplicationHistory();
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

  // COMMONS-HIDE: handleScheduleVisit — visit scheduling hidden for Commons transition
  // COMMONS-HIDE: const handleScheduleVisit = async () => {
  // COMMONS-HIDE:   if (!handleVerificationGate(window.location.pathname)) return;
  // COMMONS-HIDE:   if (visitSchedulingBlocked) return;
  // COMMONS-HIDE:   setEligibilityChecking(true);
  // COMMONS-HIDE:   const { data } = await supabase
  // COMMONS-HIDE:     .from("eligibility")
  // COMMONS-HIDE:     .select("status")
  // COMMONS-HIDE:     .eq("user_id", user!.id)
  // COMMONS-HIDE:     .eq("status", "passed")
  // COMMONS-HIDE:     .limit(1)
  // COMMONS-HIDE:     .maybeSingle();
  // COMMONS-HIDE:   setEligibilityChecking(false);
  // COMMONS-HIDE:   if (data) { setVisitModalOpen(true); } else { setEligibilityGateOpen(true); }
  // COMMONS-HIDE: };

  // COMMONS-HIDE: handleScheduleConfirm — visit scheduling hidden for Commons transition
  // COMMONS-HIDE: const handleScheduleConfirm = async (scheduledAt: Date) => {
  // COMMONS-HIDE:   if (!session || !id) return;
  // COMMONS-HIDE:   setScheduleLoading(true);
  // COMMONS-HIDE:   const { data: visitData, error: visitError } = await supabase
  // COMMONS-HIDE:     .from("visits")
  // COMMONS-HIDE:     .insert({ property_id: id, tenant_id: session.user.id, scheduled_at: scheduledAt.toISOString(), status: "scheduled" as any })
  // COMMONS-HIDE:     .select("id")
  // COMMONS-HIDE:     .single();
  // COMMONS-HIDE:   if (visitError || !visitData) {
  // COMMONS-HIDE:     toast({ title: "Failed to schedule visit. Please try again.", variant: "destructive" });
  // COMMONS-HIDE:     setScheduleLoading(false);
  // COMMONS-HIDE:     return;
  // COMMONS-HIDE:   }
  // COMMONS-HIDE:   await supabase.from("visit_events").insert({ visit_id: visitData.id, tenant_id: session.user.id, property_id: id, event_type: "scheduled" as any, initiated_by: "tenant" as any, scheduled_at: scheduledAt.toISOString() } as any);
  // COMMONS-HIDE:   setVisitModalOpen(false);
  // COMMONS-HIDE:   setScheduleLoading(false);
  // COMMONS-HIDE:   handleVisitScheduled();
  // COMMONS-HIDE: };

  // COMMONS-HIDE: handleApply — application flow hidden for Commons transition
  // COMMONS-HIDE: const handleApply = async () => {
  // COMMONS-HIDE:   if (!handleVerificationGate(window.location.pathname)) return;
  // COMMONS-HIDE:   const { data } = await supabase.from("eligibility").select("status").eq("user_id", user!.id).limit(1).maybeSingle();
  // COMMONS-HIDE:   if (data?.status === "passed") { navigate(`/dashboard/applications/new?property_id=${id}`); }
  // COMMONS-HIDE:   else { navigate(`/eligibility?property_id=${id}`); }
  // COMMONS-HIDE: };

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
        <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
          <Home className="mb-4 h-16 w-16 text-muted-foreground/40" />
          <h1 className="mb-2 text-xl font-bold text-foreground">
            This property is no longer available
          </h1>
          <p className="mb-6 text-sm text-muted-foreground">
            It may have been rented out or removed from listings.
          </p>
          <Button onClick={() => navigate("/search")} className="min-h-[44px]">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Search
          </Button>
        </div>
      </Layout>
    );
  }

  // Owner viewing their own archived/unlisted property → friendly notice instead of the
  // public detail layout. RLS lets them fetch these; non-owners are already blocked and
  // fall through to the notFound branch above.
  if (isOwnProperty && (property.status === "archived" || property.status === "unlisted")) {
    posthog?.capture("commons_archived_property_notice_shown", {
      property_id: property.id, status: property.status,
    });
    const isArchived = property.status === "archived";
    return (
      <Layout>
        <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
          <Home className="mb-4 h-16 w-16 text-muted-foreground/40" />
          <h1 className="mb-2 text-xl font-bold text-foreground">
            {isArchived ? "This property is archived" : "This property is unlisted"}
          </h1>
          <p className="mb-6 text-sm text-muted-foreground max-w-md">
            {isArchived
              ? "This listing is archived and no longer visible to tenants. Contact support to restore it."
              : "This listing is unlisted and hidden from tenants. Re-list it from your dashboard to make it visible again."}
          </p>
          <div className="flex gap-2">
            <Button onClick={() => navigate("/owner-dashboard")} className="min-h-[44px]">
              Go to my dashboard
            </Button>
            {!isArchived && (
              <Button
                variant="outline"
                onClick={() => navigate(`/owner-dashboard/property/${property.id}`)}
                className="min-h-[44px]"
              >
                Manage this property
              </Button>
            )}
          </div>
        </div>
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

  // COMMONS-HIDE: Application history derived state — CTAs hidden for Commons transition
  // COMMONS-HIDE: const ACTIVE_STATUSES = ["submitted", "platform_review", "sent_to_owner", "owner_countered", "tenant_countered", "payment_pending", "payment_received", "kyc_pending", "kyc_passed", "kyc_failed", "agreement_pending", "lease_active"];
  // COMMONS-HIDE: const DECIDED_STATUSES = ["owner_rejected", "platform_rejected", "owner_accepted"];
  // COMMONS-HIDE: const draftApp = applicationHistory.find((a) => a.status === "draft") ?? null;
  // COMMONS-HIDE: const hasDraft = draftApp !== null;
  // COMMONS-HIDE: const activeApp = applicationHistory.find((a) => ACTIVE_STATUSES.includes(a.status)) ?? null;
  // COMMONS-HIDE: const isActive = activeApp !== null;
  // COMMONS-HIDE: const latestNonDraftApp = applicationHistory.find((a) => a.status !== "draft") ?? null;
  // COMMONS-HIDE: const isOnHold = latestNonDraftApp?.status === "on_hold";
  // COMMONS-HIDE: const isRejected = latestNonDraftApp != null && ["owner_rejected", "platform_rejected"].includes(latestNonDraftApp.status);
  // COMMONS-HIDE: const decidedCount = applicationHistory.filter((a) => DECIDED_STATUSES.includes(a.status)).length;
  // COMMONS-HIDE: const maxReached = decidedCount >= 3;
  // COMMONS-HIDE: const withinCooldown = isRejected && latestNonDraftApp?.reapplication_eligible_from != null && new Date() < new Date(latestNonDraftApp.reapplication_eligible_from);

  // COMMONS-HIDE: renderApplySection — Apply/Draft CTA hidden for Commons transition
  // COMMONS-HIDE: const renderApplySection = (mobile: boolean) => { ... };

  // Details grid — spec-driven via PROPERTY_FIELDS (D-128, D-155, D-157).
  // Membership + order comes from PUBLIC_DETAILS_GRID_KEYS; visibility guards
  // stay here so semantics (parking !== "none", non-null vs truthy) match the
  // pre-refactor page. To add/remove a scalar from the grid: edit
  // src/config/property-fields.ts only — no changes to this file.
  const propertyRow = property as unknown as Record<string, unknown>;
  const shouldShowGridField = (key: string): boolean => {
    const v = propertyRow[key];
    // floor_number / total_floors: != null (keep 0). Others: truthy.
    if (key === "floor_number" || key === "total_floors") {
      if (v === null || v === undefined) return false;
    } else {
      if (v === null || v === undefined || v === "" || v === 0) return false;
    }
    if ((key === "parking_2w" || key === "parking_4w") && v === "none") return false;
    return true;
  };
  const visibleGridKeys = PUBLIC_DETAILS_GRID_KEYS.filter(shouldShowGridField);

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

      {/* COMMONS-HIDE: Visit Scheduling Modal */}
      {COMMONS_HIDE && (
        <VisitSchedulerModal
          open={visitModalOpen}
          onClose={() => setVisitModalOpen(false)}
          onConfirm={() => {}}
          title="Schedule a Visit"
          loading={scheduleLoading}
        />
      )}

      {/* COMMONS-HIDE: was pb-36 lg:pb-8 — reduced after hiding mobile CTA bar */}
      <div className="mx-auto max-w-4xl pb-8">
        {/* Back button */}
        <div className="px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
        </div>

        <div className="lg:grid lg:grid-cols-[1fr_340px] lg:gap-6 lg:px-4">
          {/* ─── Main Column ────────────────────────────────────── */}
          <div className="space-y-5 min-w-0">

            {/* 1. Photo Gallery */}
            <section className="min-w-0 overflow-hidden">
              {(hasFloorPlan || sections.length > 0) && (
                <div className="flex gap-1 px-4 pb-2 lg:px-0 overflow-x-auto">
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
              <div className="relative">
                <Carousel setApi={setCarouselApi} className="w-full">
                  <CarouselContent className="-ml-0">
                    {activeImages.map((img, idx) => (
                      <CarouselItem key={img.id} className="pl-0">
                        <button
                          onClick={() => openLightbox(idx)}
                          className="block w-full cursor-zoom-in"
                        >
                          <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted lg:rounded-lg">
                            <img
                              src={img.url}
                              alt={img.caption || `Property photo ${idx + 1}`}
                              loading="lazy"
                              className="h-full w-full object-cover"
                            />
                          </div>
                        </button>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <CarouselPrevious className="left-2 hidden lg:flex" />
                  <CarouselNext className="right-2 hidden lg:flex" />
                </Carousel>
                <div className="absolute bottom-3 right-3 rounded-full bg-foreground/60 px-2.5 py-0.5 text-xs font-medium text-background">
                  {currentSlide + 1} / {totalSlides || activeImages.length}
                </div>
              </div>
            </section>

            {/* 2. Header */}
            <section className="space-y-2 px-4 lg:px-0">
              <div className="flex flex-wrap items-center gap-2">
                {property.property_type && (
                  <Badge variant="secondary" className="text-xs capitalize">
                    {/* Sync Prompt 1 (D-167) — map through PROPERTY_TYPE_OPTIONS so public shows label ("Apartment") not raw enum ("apartment"). Fallback to raw value for defensive resilience against new enum values that lag in the frontend constant. */}
                    {PROPERTY_TYPE_OPTIONS.find(o => o.value === property.property_type)?.label ?? property.property_type}
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground">
                  {formatAvailableFrom(property.available_from)}
                </span>
              </div>
              <div className="flex items-start justify-between gap-2">
                <h1 className="text-xl font-bold text-foreground sm:text-2xl">
                  {bhkLabel(property.bhk)} in {property.building_name}
                </h1>
                {!isOwnProperty && (
                  <FavouriteHeart
                    filled={id ? isFavourited(id) : false}
                    onClick={() => {
                      if (!favLoggedIn) { setLoginDrawerOpen(true); return; }
                      if (id) toggleFavourite(id);
                    }}
                  />
                )}
              </div>
              {property.floor_number != null && (
                <p className="text-sm text-muted-foreground">
                  Floor {property.floor_number}
                  {property.total_floors != null && ` of ${property.total_floors}`}
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                {property.locality ? `${property.locality}, ` : ""}
                {property.city}
              </p>
              {/* Prompt 8 (D-159) — bespoke landmark subtitle in the Location block. */}
              {property.landmark && (
                <p className="text-sm text-muted-foreground">Near {property.landmark}</p>
              )}
              <div className="flex flex-wrap gap-2 pt-1">
                <span className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">
                  🟢 2 Month Deposit Only
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">
                  🟢 Zero Brokerage
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">
                  🟢 8 Months Lock-in
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">
                  🟢 2 Month Notice
               </span>
               {property.maintenance_included_in_rent && (
                 <span className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">
                   🟢 Zero Additional Maintenance
                 </span>
               )}
              </div>
            </section>

            {/* Action buttons — Video Walkthrough + Google Maps */}
            {(property.youtube_walkthrough_url != null && property.youtube_walkthrough_url !== "" ||
              property.google_maps_url != null && property.google_maps_url !== "") && (
              <div className="flex flex-wrap gap-3 px-4 lg:px-0">
                {property.youtube_walkthrough_url != null && property.youtube_walkthrough_url !== "" && (
                  <a
                    href={property.youtube_walkthrough_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-red-50 hover:border-red-200 hover:text-red-600 cursor-pointer"
                  >
                    <Youtube className="h-4 w-4 text-red-500" />
                    Video Walkthrough
                  </a>
                )}
                {property.google_maps_url != null && property.google_maps_url !== "" && (
                  <a
                    href={property.google_maps_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 cursor-pointer"
                  >
                    <MapPin className="h-4 w-4 text-blue-500" />
                    View on Map
                  </a>
                )}
              </div>
            )}

            {/* 3. Prominent price block — Prompt 10b (D-162) dual-mode.
                Rent branch preserved byte-identical; Sale branch mirrors visual weight. */}
            {property.listing_type === "sale" ? (
              <section className="px-4 lg:px-0">
                <Card className="border-border">
                  <CardContent className="p-4">
                    <div className="mb-2 flex items-baseline gap-2 flex-wrap">
                      <span className="text-3xl font-bold text-gray-900">
                        {property.sale_price != null ? `₹${property.sale_price.toLocaleString("en-IN")}` : "—"}
                      </span>
                      {property.price_negotiable && (
                        <span className="text-sm font-medium text-green-700">Negotiable</span>
                      )}
                    </div>
                    {property.expected_price_per_sqft != null && (
                      <p className="text-xs text-muted-foreground">
                        Expected ₹{property.expected_price_per_sqft.toLocaleString("en-IN")}/sqft
                      </p>
                    )}
                    {/* Phase 1.5 addendum (D-166) — sale brokerage. Hidden when null/0. */}
                    {property.sale_brokerage_pct != null && property.sale_brokerage_pct > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Brokerage {property.sale_brokerage_pct}%
                      </p>
                    )}
                  </CardContent>
                </Card>
              </section>
            ) : (
            <section className="px-4 lg:px-0">
              <Card className="border-border">
                <CardContent className="p-4">
                  {/* Rent header */}
                  <div className="mb-4">
                    <span className="text-3xl font-bold text-gray-900">
                      ₹{property.listed_rent.toLocaleString('en-IN')}
                    </span>
                    <span className="text-gray-500 text-sm ml-1">/month</span>
                  </div>

                  {/* Monthly costs table */}
                  <div className="hidden border border-gray-100 rounded-lg overflow-hidden mb-4">
                    <div className="flex justify-between items-center px-4 py-2.5 bg-gray-50">
                      <span className="text-sm text-gray-600">Rent</span>
                      <span className="text-sm font-medium text-gray-900">
                        ₹{property.listed_rent.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="flex justify-between items-center px-4 py-2.5 pb-3 border-t border-gray-100">
                      <span className="text-sm text-gray-600 flex items-center gap-1.5">Reeve Fee (7%) <WhyReeveFeeLink /></span>
                      <span className="text-sm font-medium text-gray-900">
                        ₹{Math.round(property.listed_rent * 0.07).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="flex justify-between items-center px-4 py-2.5 border-t border-gray-200 bg-blue-50">
                      <span className="text-sm font-semibold text-gray-800">Monthly Total</span>
                      <span className="text-sm font-bold text-blue-700">
                        ₹{Math.round(property.listed_rent * 1.07).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  {/* One-time and additional costs */}
                  <div className="space-y-2 mt-4">
                    <div className="flex justify-between items-start text-sm">
                      <span className="text-gray-500">Security Deposit</span>
                      <span className="text-gray-700 text-right font-medium">
                        {depositDisplay}
                      </span>
                    </div>
                    {/* Phase 1.5 addendum (D-166) — move-in charges. Row hidden when null/0. */}
                    {property.move_in_charges_amount != null && property.move_in_charges_amount > 0 && (
                      <div className="flex justify-between items-start text-sm">
                        <span className="text-gray-500">Move-in charges</span>
                        <span className="text-gray-700 text-right font-medium">
                          ₹{property.move_in_charges_amount.toLocaleString('en-IN')}
                        </span>
                      </div>
                    )}
                    {/* D-169: brokerage split into two typed columns. Read the matching column per type;
                        skip when type is null/'none' or the matching column is null. */}
                    {((property.rent_brokerage_type === "fixed" && property.rent_brokerage_fixed_amount != null) ||
                      (property.rent_brokerage_type === "months" && property.rent_brokerage_months != null)) && (
                      <div className="flex justify-between items-start text-sm">
                        <span className="text-gray-500">Brokerage</span>
                        <span className="text-gray-700 text-right font-medium">
                          {property.rent_brokerage_type === "fixed"
                            ? `₹${property.rent_brokerage_fixed_amount!.toLocaleString('en-IN')}`
                            : `${property.rent_brokerage_months} month${property.rent_brokerage_months === 1 ? "" : "s"} rent`}
                        </span>
                      </div>
                    )}
                    {property.society_maintenance_approx != null && (
                      <div className="flex justify-between items-start text-sm">
                        <span className="text-gray-500">Society Maintenance</span>
                        <span className="text-gray-700 text-right">
                          {property.society_maintenance_approx === 0 || property.maintenance_included_in_rent
                            ? "Included in Rent"
                            : <>~₹{Number(property.society_maintenance_approx).toLocaleString('en-IN')}/mo{property.maintenance_included_in_rent && <span className="text-gray-400"> · Included in Rent</span>}</>
                          }
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </section>
            )}

            {/* 4. Utilities */}
            <section className="space-y-2 px-4 lg:px-0">
              <h2 className="text-base font-semibold text-foreground">Utility Bills</h2>
              <p className="text-xs text-muted-foreground">
                All utility bills are paid by the tenant at actuals. The below indicates which bills are separate from society maintenance.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <UtilityPill
                  icon={<Droplets className="h-3.5 w-3.5" />}
                  label="Water"
                  included={property.utility_water_included}
                />
                <UtilityPill
                  icon={<Zap className="h-3.5 w-3.5" />}
                  label="Electricity"
                  included={property.utility_electricity_included}
                />
                <UtilityPill
                  icon={<Flame className="h-3.5 w-3.5" />}
                  label={property.gas_type === "pipeline" ? "Gas (Pipeline)" : property.gas_type === "cylinder" ? "Gas (Cylinder)" : "Gas"}
                  included={property.utility_gas_included}
                />
              </div>
            </section>

            {/* 6. Property Details Grid — spec-driven via PROPERTY_FIELDS (D-128, D-157). */}
            <section className="space-y-3 px-4 lg:px-0">
              <h2 className="text-base font-semibold text-foreground">Property Details</h2>
              <div className="grid grid-cols-2 gap-3">
                {visibleGridKeys.map((key) => (
                  <SpecField
                    key={key}
                    fieldKey={key}
                    surface="public_detail"
                    value={propertyRow[key]}
                    readOnly
                    // Prompt 10b (D-162): pass the row so spec-declared visibleWhen
                    // predicates evaluate (possession_date hidden unless under_construction).
                    formValues={propertyRow}
                  />
                ))}
                {/* Prompt 8 (D-159) — compound parking rows combining enum + count.
                    Bespoke because SpecField renders one field per row; parking here
                    needs "{Covered} · {2 slots}" from two columns. Row hides entirely
                    when enum is 'none'/null AND count is 0/null. */}
                {(() => {
                  const rows: Array<{ label: string; icon: React.ReactNode; enumVal: string | null; count: number | null }> = [
                    { label: "4-Wheeler Parking", icon: <Car className="h-4 w-4" />, enumVal: property.parking_4w, count: property.parking_4w_count },
                    { label: "2-Wheeler Parking", icon: <Bike className="h-4 w-4" />, enumVal: property.parking_2w, count: property.parking_2w_count },
                  ];
                  return rows.map((r) => {
                    const hasEnum = r.enumVal && r.enumVal !== "none";
                    const hasCount = r.count != null && r.count > 0;
                    if (!hasEnum && !hasCount) return null;
                    const enumPart = hasEnum ? parkingLabel(r.enumVal as string) : "";
                    const countPart = hasCount ? `${r.count} slot${r.count === 1 ? "" : "s"}` : "";
                    const display = [enumPart, countPart].filter(Boolean).join(" · ");
                    return (
                      <div key={r.label} className="flex items-start gap-2.5 rounded-lg border border-border bg-card p-3">
                        <span className="mt-0.5 text-muted-foreground">{r.icon}</span>
                        <div>
                          <p className="text-[11px] text-muted-foreground">{r.label}</p>
                          <p className="text-sm font-medium text-foreground">{display}</p>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>

              {/* Furnishing Included — new structured format */}
              {property.furnishing_detail && Array.isArray(property.furnishing_detail) && (property.furnishing_detail as FurnishingDetailItem[]).length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Furnishing Included</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(property.furnishing_detail as FurnishingDetailItem[]).map((f, idx) => {
                      const label = FURNISHING_DETAIL_LABELS[f.item] ?? f.item
                      const detail = [
                        f.count != null && f.count >= 1 ? `×${f.count}` : null,
                        f.size ?? null,
                        f.rooms ?? null,
                      ].filter(Boolean).join(' · ')
                      return (
                        <div
                          key={`${f.item}-${idx}`}
                          className="flex flex-col items-center justify-center gap-0.5 px-2 py-2 rounded-lg text-xs bg-white border border-gray-200 text-gray-700 text-center min-h-[52px] w-full"
                        >
                          <span className="font-medium">✓ {label}</span>
                          {detail && <span className="text-gray-500 text-[10px]">{detail}</span>}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Legacy fallback — shown only if furnishing_detail is absent and old items exist */}
              {!property.furnishing_detail && rawAmenities?.furnishing_items && rawAmenities.furnishing_items.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Furnishing Included</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {rawAmenities.furnishing_items.map((item: string) => (
                      <div key={item} className="flex items-center gap-1.5 px-2 py-2 rounded-lg text-xs justify-center bg-white border border-gray-200 text-gray-700 text-center min-h-[52px] w-full">
                        <span className="text-gray-500">✓</span>
                        <span>{FURNISHING_LABELS[item] ?? item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Building Amenities — full inventory */}
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Building Amenities</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { key: 'lift', label: 'Lift' },
                    { key: 'security_24hr', label: '24hr Security' },
                    { key: 'power_backup', label: 'Power Backup' },
                    { key: 'gym', label: 'Gym' },
                    { key: 'swimming_pool', label: 'Swimming Pool' },
                    { key: 'clubhouse', label: 'Clubhouse' },
                    { key: 'visitor_parking', label: 'Visitor Parking' },
                    { key: 'cctv', label: 'CCTV' },
                    { key: 'children_play_area', label: "Children's Play Area" },
                    { key: 'intercom', label: 'Intercom' },
                    { key: 'park', label: 'Park' },
                    { key: 'maintenance_staff', label: 'Maintenance Staff' },
                    { key: 'gated_access', label: 'Gated Access' },
                    { key: 'garden', label: 'Garden' },
                    { key: 'sports_facility', label: 'Sports Facility' },
                    { key: 'community_hall', label: 'Community Hall' },
                    { key: 'water_supply_24hr', label: '24hr Water Supply' },
                  ].map(({ key, label }) => {
                    const present = rawAmenities?.building?.includes(key) ?? false;
                    return (
                      <div
                        key={key}
                        className={`flex items-center gap-1.5 px-2 py-2 rounded-lg text-xs text-center justify-center min-h-[52px] w-full ${
                          present
                            ? 'bg-green-50 border border-green-200 text-green-700'
                            : 'bg-gray-50 border border-gray-100 text-gray-300'
                        }`}
                      >
                        <span className={`text-base ${present ? '' : 'grayscale opacity-40'}`}>
                          {present ? '✓' : '✗'}
                        </span>
                        <span className="leading-tight">{label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* 7. Amenities */}
            {property.amenities && property.amenities.length > 0 && (
              <section className="space-y-3 px-4 lg:px-0">
                <h2 className="text-base font-semibold text-foreground">Amenities</h2>
                <div className="flex flex-wrap gap-2">
                  {property.amenities.map((a) => (
                    <span
                      key={a}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground"
                    >
                      {AMENITY_ICONS[a] || <CircleDot className="h-3.5 w-3.5" />}
                      {amenityLabel(a)}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Public timeline — curated public activity events */}
            {publicTimeline.length > 0 && (
              <PublicTimeline rows={publicTimeline} />
            )}

            {/* 8. Building Rules */}
            {property.building_rules && (
              <section className="space-y-2 px-4 lg:px-0">
                <h2 className="text-base font-semibold text-foreground">Building Rules</h2>
                <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                  {property.building_rules}
                </p>
              </section>
            )}

            {/* 9. Description */}
            {property.description && (
              <section className="space-y-2 px-4 lg:px-0">
                <h2 className="text-base font-semibold text-foreground">Description</h2>
                <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                  {property.description}
                </p>
              </section>
            )}

            {/* 10. No Contact Policy */}
            <section className="px-4 pb-4 lg:px-0">
              <Card className="border-border bg-muted/50">
                <CardContent className="flex items-start gap-3 p-4">
                  <Shield className="h-5 w-5 flex-shrink-0 text-primary" />
                  <p className="text-sm text-muted-foreground">
                    All communication happens through the Reeve platform only. Owner contact details are never shared.
                  </p>
                </CardContent>
              </Card>
            </section>
          </div>

          {/* COMMONS-HIDE: Desktop Sidebar CTA — hidden for Commons transition */}
          {COMMONS_HIDE && (
          <aside className="hidden lg:block flex-shrink-0 w-[340px]">
            <div className="sticky top-24 space-y-3">
              <Card className="border-border">
                <CardContent className="space-y-3 p-4">
                  <div>
                    <span className="text-2xl font-bold text-foreground">
                      {formatIndianRupee(property.listed_rent)}
                    </span>
                    <span className="text-sm text-muted-foreground">/month</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Security Deposit: {depositDisplay}
                  </p>
                  {isOwnProperty ? (
                    <p className="text-sm text-muted-foreground text-center py-2">This is your listed property.</p>
                  ) : (
                    <>
                      {showVisitConfirmation ? (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
                          <div className="flex items-center gap-2">
                            <span className="text-green-600 text-lg">✓</span>
                            <p className="text-sm font-semibold text-green-800">Visit Scheduled!</p>
                          </div>
                          {existingVisit && (
                            <p className="text-sm text-green-700">
                              {format(new Date(existingVisit.scheduled_at), "EEE, d MMM yyyy · h:mm a")}
                            </p>
                          )}
                          <div className="flex items-start gap-2 p-3 bg-white border border-green-100 rounded-lg">
                            <span className="text-base mt-0.5">📋</span>
                            <p className="text-xs text-gray-600">
                              Please carry a valid government-issued photo ID for your visit — Aadhaar Card, Driving Licence, or Voter ID.
                            </p>
                          </div>
                          <button
                            onClick={() => setShowVisitConfirmation(false)}
                            className="w-full min-h-[44px] bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
                          >
                            Got it →
                          </button>
                        </div>
                      ) : existingVisit ? (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <p className="text-sm text-blue-800 font-medium">
                            Visit scheduled for {format(new Date(existingVisit.scheduled_at), "EEE, d MMM yyyy · h:mm a")}
                          </p>
                          <a
                            href="/dashboard/visits"
                            className="text-sm text-blue-600 underline mt-1 inline-block"
                          >
                            Manage your visit →
                          </a>
                        </div>
                      ) : visitSchedulingBlocked ? (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 space-y-1">
                          <p className="text-sm font-medium text-amber-800">Visit scheduling is blocked</p>
                          <p className="text-xs text-amber-700">Your account has been flagged after 3 missed visits.</p>
                          <p className="text-xs text-amber-700">Contact us at <a href="mailto:support@reeve.in" className="underline">support@reeve.in</a> to restore access.</p>
                        </div>
                      ) : (
                        <>
                          {isAuthenticated && (!user?.phone_verified || !user?.email_verified) && (
                            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 flex items-start gap-2">
                              <span className="text-amber-500 text-sm mt-0.5 shrink-0">⚠</span>
                              <div>
                                <p className="text-xs font-medium text-amber-800">Verify to schedule or apply</p>
                                <button
                                  onClick={() => window.open(`/profile?returnTo=${encodeURIComponent(window.location.pathname)}`, "_blank")}
                                  className="text-xs text-amber-700 underline underline-offset-2"
                                >
                                  Complete verification →
                                </button>
                              </div>
                            </div>
                          )}
                          <Button
                            onClick={() => {}}
                            variant="outline"
                            className="w-full min-h-[44px]"
                            disabled={eligibilityChecking}
                          >
                            Schedule a Visit
                          </Button>
                        </>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </aside>
          )}
        </div>
      </div>

      {/* COMMONS-HIDE: Mobile Sticky CTA Bar — hidden for Commons transition */}
      {COMMONS_HIDE && !isOwnProperty && (
        <div className={`fixed inset-x-0 z-40 border-t border-border bg-background px-4 py-3 pb-4 min-h-[72px] lg:hidden ${session ? 'bottom-16 pb-safe' : 'bottom-0'}`}>
          <div className="mx-auto flex max-w-4xl items-center gap-2">
            {showVisitConfirmation ? (
              <div className="flex-1 bg-green-50 border border-green-200 rounded-lg px-3 py-2 min-h-[48px] flex flex-col justify-center">
                <p className="text-xs text-green-800 font-semibold">✓ Visit Scheduled!</p>
                <button
                  onClick={() => setShowVisitConfirmation(false)}
                  className="text-xs text-green-600 underline"
                >
                  Got it →
                </button>
              </div>
            ) : existingVisit ? (
              <div className="flex-1 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 min-h-[48px] flex flex-col justify-center">
                <p className="text-xs text-blue-800 font-medium leading-tight">
                  {format(new Date(existingVisit.scheduled_at), "EEE, d MMM · h:mm a")}
                </p>
                <a href="/dashboard/visits" className="text-xs text-blue-600 underline">
                  Manage →
                </a>
              </div>
            ) : visitSchedulingBlocked ? (
              <div className="flex-1 border border-amber-200 bg-amber-50 rounded-lg px-3 py-2 min-h-[48px] flex flex-col justify-center">
                <p className="text-xs font-medium text-amber-800">Scheduling blocked</p>
                <p className="text-xs text-amber-700">3 missed visits — contact support@reeve.in</p>
              </div>
            ) : isAuthenticated && (!user?.phone_verified || !user?.email_verified) ? (
              <div className="flex-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 min-h-[48px] flex items-center gap-2">
                <span className="text-amber-500 shrink-0">⚠</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-amber-800 leading-tight">Verify to schedule or apply</p>
                  <button
                    onClick={() => navigate(`/profile?returnTo=${encodeURIComponent(window.location.pathname)}`)}
                    className="text-xs text-amber-700 underline"
                  >
                    Verify now →
                  </button>
                </div>
              </div>
            ) : (
              <Button
                onClick={() => {}}
                variant="outline"
                className="min-h-[48px] flex-1 text-sm font-medium"
                disabled={eligibilityChecking}
              >
                Schedule Visit
              </Button>
            )}
          </div>
        </div>
      )}

      {/* COMMONS-HIDE: Eligibility Gate Modal — hidden for Commons transition */}
      {COMMONS_HIDE && (
      <Drawer open={eligibilityGateOpen} onOpenChange={setEligibilityGateOpen}>
        <DrawerContent>
          <div className="flex flex-col items-center gap-3 px-6 pt-6 pb-2 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent">
              {/* ClipboardCheck COMMONS-HIDE */}
            </div>
            <h3 className="text-lg font-bold text-foreground">Set up Rental Preferences First</h3>
            <p className="text-sm text-muted-foreground">
              To schedule a visit, you need to complete your rental preferences first. It only takes 2 minutes and helps us match you with the right properties.
            </p>
          </div>
          <DrawerFooter>
            <Button
              className="min-h-[44px]"
              onClick={() => {
                setEligibilityGateOpen(false);
                navigate(`/eligibility?property_id=${id}&redirect=visit`);
              }}
            >
              Set up Preferences
            </Button>
            <Button
              variant="ghost"
              className="min-h-[44px]"
              onClick={() => setEligibilityGateOpen(false)}
            >
              Maybe Later
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
      )}
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
