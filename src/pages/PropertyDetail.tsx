import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
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
import {
  ArrowLeft,
  Lock,
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
  ClipboardCheck,
  Loader2,
} from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import VisitSchedulingModal from "@/components/VisitSchedulingModal";

// ─── Types ───────────────────────────────────────────────────────────────────

interface PropertyData {
  id: string;
  owner_id: string | null;
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
  society_maintenance_approx: number | null;
  utility_water_included: boolean;
  utility_electricity_included: boolean;
  utility_gas_included: boolean;
  main_door_lock_type: string | null;
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

const PropertyDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [property, setProperty] = useState<PropertyData | null>(null);
  const [rawAmenities, setRawAmenities] = useState<{ furnishing_items?: string[]; building?: string[] } | null>(null);
  const [images, setImages] = useState<PropertyImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [session, setSession] = useState<Session | null>(null);

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
  const [eligibilityGateOpen, setEligibilityGateOpen] = useState(false);
  const [eligibilityChecking, setEligibilityChecking] = useState(false);

  // Flat number reveal
  const [revealedFlatNumber, setRevealedFlatNumber] = useState<string | null>(null);

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

  // Favourites
  const { isFavourited, toggleFavourite, isLoggedIn: favLoggedIn } = useFavourites();

  // Auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => setSession(s));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  // Check for existing visit
  const fetchExistingVisit = useCallback(async () => {
    if (!id) { setExistingVisit(null); return; }
    const { data: { session: s } } = await supabase.auth.getSession();
    if (!s) { setExistingVisit(null); return; }
    const { data } = await supabase
      .from("visits")
      .select("id, scheduled_at, status")
      .eq("property_id", id)
      .eq("tenant_id", s.user.id)
      .in("status", ["scheduled", "rescheduled", "confirmed"])
      .maybeSingle();
    setExistingVisit(data ?? null);
  }, [id]);

  useEffect(() => {
    fetchExistingVisit();
  }, [fetchExistingVisit]);

  // Check if user has earned flat_number access
  useEffect(() => {
    if (!session?.user?.id || !id) return;
    const checkFlatNumberAccess = async () => {
      const { data } = await supabase
        .from("properties_with_flat_number")
        .select("flat_number")
        .eq("id", id)
        .maybeSingle();
      if (data?.flat_number) {
        setRevealedFlatNumber(data.flat_number);
      }
    };
    checkFlatNumberAccess();
  }, [session, id]);

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
            "id, owner_id, building_name, floor_number, total_floors, locality, city, bhk, square_footage, furnishing, listed_rent, parking_4w, parking_2w, amenities, pet_policy, title, available_from, property_type, description, building_rules, security_deposit_months, society_maintenance_approx, utility_water_included, utility_electricity_included, utility_gas_included, main_door_lock_type"
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

      const raw = propRes.data;
      setProperty({
        ...raw,
        amenities: Array.isArray(raw.amenities) ? (raw.amenities as string[]) : null,
      } as PropertyData);

      const fetchedImages = (imgRes.data ?? []) as unknown as PropertyImage[];
      setImages(fetchedImages.length > 0 ? fetchedImages : PLACEHOLDER_IMAGES);

      // Check session for own-property and already-applied
      const sess = await supabase.auth.getSession();
      const currentUserId = sess.data.session?.user?.id;
      setIsOwnProperty(!!(currentUserId && raw.owner_id === currentUserId));

      // Fetch application history for this tenant+property
      if (currentUserId) {
        const { data: appHistory } = await supabase
          .from("applications")
          .select("id, status, attempt_number, reapplication_eligible_from, proposed_rent, created_at")
          .eq("property_id", id)
          .eq("tenant_id", currentUserId)
          .order("attempt_number", { ascending: false });
        setApplicationHistory(appHistory ?? []);
      }

      setLoading(false);
    };

    fetchData();
  }, [id]);

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
  const lightboxImages = images.filter((img) =>
    galleryTab === "floorplan" ? img.is_floor_plan : !img.is_floor_plan
  );
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
  const handleScheduleVisit = async () => {
    if (!session) {
      setLoginDrawerOpen(true);
      return;
    }
    // Check eligibility before opening scheduling modal
    setEligibilityChecking(true);
    const { data } = await supabase
      .from("eligibility")
      .select("status")
      .eq("user_id", session.user.id)
      .eq("status", "passed")
      .limit(1)
      .maybeSingle();
    setEligibilityChecking(false);

    if (data) {
      setVisitModalOpen(true);
    } else {
      setEligibilityGateOpen(true);
    }
  };

  const handleApply = async () => {
    if (!session) {
      setLoginDrawerOpen(true);
      return;
    }

    const { data } = await supabase
      .from("eligibility")
      .select("status")
      .eq("user_id", session.user.id)
      .limit(1)
      .maybeSingle();

    if (data?.status === "passed") {
      navigate(`/dashboard/applications/new?property_id=${id}`);
    } else {
      navigate(`/eligibility?property_id=${id}`);
    }
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

  const photoImages = images.filter((img) => !img.is_floor_plan);
  const floorPlanImages = images.filter((img) => img.is_floor_plan);
  const hasFloorPlan = floorPlanImages.length > 0;
  const activeImages = galleryTab === "floorplan"
    ? floorPlanImages
    : galleryTab === "all" || galleryTab === "photos"
      ? photoImages
      : images.filter(img => img.section === galleryTab && !img.is_floor_plan);

  const depositAmount = property.listed_rent * property.security_deposit_months;

  // ─── Application history derived state ────────────────────────────────────
  const latestApp = applicationHistory[0] ?? null;

  const ACTIVE_STATUSES = [
    "submitted", "platform_review", "sent_to_owner",
    "owner_countered", "tenant_countered",
    "payment_pending", "payment_received",
    "kyc_pending", "kyc_passed", "kyc_failed",
    "agreement_pending", "lease_active",
  ];
  const DECIDED_STATUSES = ["owner_rejected", "platform_rejected", "owner_accepted"];

  const decidedCount = applicationHistory.filter((a) =>
    DECIDED_STATUSES.includes(a.status)
  ).length;

  const hasDraft = latestApp?.status === "draft";
  const isActive = latestApp != null && ACTIVE_STATUSES.includes(latestApp.status);
  const isOnHold = latestApp?.status === "on_hold";
  const isRejected = latestApp != null && ["owner_rejected", "platform_rejected"].includes(latestApp.status);
  const isExpiredOrWithdrawn = latestApp != null && ["expired", "withdrawn"].includes(latestApp.status);
  const maxReached = decidedCount >= 3;
  const withinCooldown =
    isRejected &&
    latestApp?.reapplication_eligible_from != null &&
    new Date() < new Date(latestApp.reapplication_eligible_from);

  const renderApplySection = (mobile: boolean) => {
    const btnClass = mobile ? "min-h-[44px] flex-1" : "w-full min-h-[44px]";

    if (hasDraft && latestApp) {
      return (
        <Button
          onClick={() => navigate(`/dashboard/applications/new?resume=${latestApp.id}`)}
          className={btnClass}
        >
          Continue your saved draft →
        </Button>
      );
    }

    if (isActive && latestApp) {
      return (
        <p className="text-sm text-gray-600 text-center py-2">
          Application in progress · {getFriendlyStatus(latestApp.status)}
        </p>
      );
    }

    if (isOnHold) {
      return (
        <p className="text-sm text-gray-600 text-center py-2">
          Another applicant has secured this property. You'll be notified if anything changes.
        </p>
      );
    }

    if (maxReached) {
      return (
        <p className="text-sm text-gray-500 text-center py-2">
          You've reached the maximum applications for this property. Please explore other listings.
        </p>
      );
    }

    if (withinCooldown && latestApp?.reapplication_eligible_from) {
      return (
        <p className="text-sm text-gray-500 text-center py-2">
          Your application was not successful. You may reapply after {format(new Date(latestApp.reapplication_eligible_from), 'd MMM yyyy')}.
        </p>
      );
    }

    const buttonLabel = applicationHistory.length > 0 ? "Apply Again" : "Apply Now";
    const attemptLabel =
      decidedCount === 1
        ? "This will be your 2nd application for this property."
        : decidedCount === 2
        ? "This is your 3rd and final application for this property."
        : "";

    return (
      <>
        <Button onClick={handleApply} className={btnClass}>
          {buttonLabel}
        </Button>
        {attemptLabel && (
          <p className="text-xs text-gray-400 mt-1 text-center">{attemptLabel}</p>
        )}
      </>
    );
  };

  // Details grid items
  const detailItems: { icon: React.ReactNode; label: string; value: string }[] = [];
  detailItems.push({ icon: <Home className="h-4 w-4" />, label: "BHK Type", value: bhkLabel(property.bhk) });
  if (property.square_footage) {
    detailItems.push({ icon: <Maximize2 className="h-4 w-4" />, label: "Area", value: `${property.square_footage} sqft` });
  }
  if (property.floor_number != null) {
    detailItems.push({ icon: <Building2 className="h-4 w-4" />, label: "Floor", value: String(property.floor_number) });
  }
  if (property.total_floors != null) {
    detailItems.push({ icon: <Layers className="h-4 w-4" />, label: "Total Floors", value: String(property.total_floors) });
  }
  detailItems.push({ icon: <Armchair className="h-4 w-4" />, label: "Furnishing", value: furnishingLabel(property.furnishing) });
  if (property.parking_4w && property.parking_4w !== "none") {
    detailItems.push({ icon: <Car className="h-4 w-4" />, label: "4-Wheeler Parking", value: parkingLabel(property.parking_4w) });
  }
  if (property.parking_2w && property.parking_2w !== "none") {
    detailItems.push({ icon: <Bike className="h-4 w-4" />, label: "2-Wheeler Parking", value: parkingLabel(property.parking_2w) });
  }
  if (property.main_door_lock_type) {
    detailItems.push({ icon: <KeyRound className="h-4 w-4" />, label: "Lock Type", value: property.main_door_lock_type });
  }
  if (property.pet_policy) {
    detailItems.push({ icon: <PawPrint className="h-4 w-4" />, label: "Pet Policy", value: property.pet_policy });
  }

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

      {/* Visit Scheduling Modal */}
      {session && id && property && (
        <VisitSchedulingModal
          open={visitModalOpen}
          onOpenChange={setVisitModalOpen}
          propertyId={id}
          userId={session.user.id}
          buildingName={property.building_name}
          bhk={property.bhk}
          existingVisit={existingVisit}
          onVisitChanged={fetchExistingVisit}
        />
      )}

      <div className="mx-auto max-w-4xl pb-24 lg:pb-8">
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
          <div className="space-y-5">

            {/* 1. Photo Gallery */}
            <section>
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
                    {property.property_type}
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
              <div className="flex flex-wrap gap-2 pt-1">
                <span className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">
                  🟢 1 Month Deposit Only
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">
                  🟢 Zero Brokerage
                </span>
              </div>
            </section>

            {/* 3. Rent & Fees */}
            <section className="px-4 lg:px-0">
              <Card className="border-border">
                <CardContent className="space-y-3 p-4">
                  <div>
                    <span className="text-2xl font-bold text-foreground">
                      {formatIndianRupee(property.listed_rent)}
                    </span>
                    <span className="text-sm text-muted-foreground">/month</span>
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Service fee: 7% of rent for the first 11-month term. Reduces to 4% on renewal.
                  </p>
                  <div className="space-y-1.5 border-t border-border pt-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Security Deposit</span>
                      <span className="font-medium text-foreground">
                        {formatIndianRupee(depositAmount)} ({property.security_deposit_months} month only) — held by Reeve
                      </span>
                    </div>
                    <div className="text-sm">
                      <span className="text-muted-foreground">Society Maintenance: </span>
                      <span className="font-medium text-foreground">
                        {property.society_maintenance_approx
                          ? `~${formatIndianRupee(property.society_maintenance_approx)}/month (approx)`
                          : "To be confirmed"}
                      </span>
                      <span className="text-muted-foreground">
                        {" "}— paid directly by tenant, in addition to rent & service fee
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

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
                  label="Gas"
                  included={property.utility_gas_included}
                />
              </div>
            </section>

            {/* 5. Flat Number — Locked / Revealed */}
            <section className="px-4 lg:px-0">
              {revealedFlatNumber ? (
                <Card className="border-green-200 bg-green-50/50">
                  <CardContent className="flex items-center gap-3 p-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">
                        Flat {revealedFlatNumber}
                      </span>
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                        Revealed
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-border bg-muted/50">
                  <CardContent className="flex items-center gap-3 p-4">
                    <Lock className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
                    <p className="text-sm italic text-muted-foreground">
                      Flat number revealed after scheduling a visit or completing payment
                    </p>
                  </CardContent>
                </Card>
              )}
            </section>

            {/* 6. Property Details Grid */}
            <section className="space-y-3 px-4 lg:px-0">
              <h2 className="text-base font-semibold text-foreground">Property Details</h2>
              <div className="grid grid-cols-2 gap-3">
                {detailItems.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-start gap-2.5 rounded-lg border border-border bg-card p-3"
                  >
                    <span className="mt-0.5 text-muted-foreground">{item.icon}</span>
                    <div>
                      <p className="text-[11px] text-muted-foreground">{item.label}</p>
                      <p className="text-sm font-medium text-foreground">{item.value}</p>
                    </div>
                  </div>
                ))}
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

          {/* ─── Desktop Sidebar CTA ─────────────────────────── */}
          <aside className="hidden lg:block">
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
                    Security Deposit: {formatIndianRupee(depositAmount)} · 7% service fee
                  </p>
                  {isOwnProperty ? (
                    <p className="text-sm text-muted-foreground text-center py-2">This is your listed property.</p>
                  ) : (
                    <>
                      {existingVisit ? (
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
                      ) : (
                        <Button
                          onClick={handleScheduleVisit}
                          variant="outline"
                          className="w-full min-h-[44px]"
                          disabled={eligibilityChecking}
                        >
                          {eligibilityChecking ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Checking...</> : "Schedule a Visit"}
                        </Button>
                      )}
                      {renderApplySection(false)}
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </aside>
        </div>
      </div>

      {/* ─── Mobile Sticky CTA Bar ───────────────────────────── */}
      {!isOwnProperty && (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background p-3 lg:hidden">
          <div className="mx-auto flex max-w-4xl gap-3">
            {existingVisit ? (
              <div className="flex-1 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                <p className="text-xs text-blue-800 font-medium leading-tight">
                  {format(new Date(existingVisit.scheduled_at), "EEE, d MMM · h:mm a")}
                </p>
                <a href="/dashboard/visits" className="text-xs text-blue-600 underline">
                  Manage →
                </a>
              </div>
            ) : (
              <Button
                onClick={handleScheduleVisit}
                variant="outline"
                className="min-h-[44px] flex-1"
                disabled={eligibilityChecking}
              >
                {eligibilityChecking ? <Loader2 className="h-4 w-4 animate-spin" /> : "Schedule Visit"}
              </Button>
            )}
            {renderApplySection(true)}
          </div>
        </div>
      )}

      {/* ─── Eligibility Gate Modal ──────────────────────────── */}
      <Drawer open={eligibilityGateOpen} onOpenChange={setEligibilityGateOpen}>
        <DrawerContent>
          <div className="flex flex-col items-center gap-3 px-6 pt-6 pb-2 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent">
              <ClipboardCheck className="h-7 w-7 text-primary" />
            </div>
            <h3 className="text-lg font-bold text-foreground">Complete Eligibility Check First</h3>
            <p className="text-sm text-muted-foreground">
              To schedule a visit, you need to complete a quick eligibility check. It only takes 2 minutes and helps us match you with the right properties.
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
              Check Eligibility Now
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
