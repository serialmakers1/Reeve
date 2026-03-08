import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
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
} from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import VisitSchedulingModal from "@/components/VisitSchedulingModal";

// ─── Types ───────────────────────────────────────────────────────────────────

interface PropertyData {
  id: string;
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

// ─── Placeholder images ─────────────────────────────────────────────────────

const PLACEHOLDER_IMAGES: PropertyImage[] = Array.from({ length: 5 }, (_, i) => ({
  id: `placeholder-${i}`,
  url: `https://placehold.co/800x500/e2e8f0/94a3b8?text=Property+Photo+${i + 1}`,
  caption: null,
  is_primary: i === 0,
  is_floor_plan: false,
  sort_order: i,
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
  const [images, setImages] = useState<PropertyImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [session, setSession] = useState<Session | null>(null);

  // Gallery state
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [totalSlides, setTotalSlides] = useState(0);
  const [galleryTab, setGalleryTab] = useState<"photos" | "floorplan">("photos");
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Login drawer
  const [loginDrawerOpen, setLoginDrawerOpen] = useState(false);

  // Favourites
  const { isFavourited, toggleFavourite, isLoggedIn: favLoggedIn } = useFavourites();

  // Auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => setSession(s));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

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
            "id, building_name, floor_number, total_floors, locality, city, bhk, square_footage, furnishing, listed_rent, parking_4w, parking_2w, amenities, pet_policy, title, available_from, property_type, description, building_rules, security_deposit_months, society_maintenance_approx, utility_water_included, utility_electricity_included, utility_gas_included, main_door_lock_type"
          )
          .eq("id", id)
          .eq("status", "listed")
          .eq("is_active", true)
          .maybeSingle(),
        supabase
          .from("property_images")
          .select("id, url, caption, is_primary, is_floor_plan, sort_order")
          .eq("property_id", id)
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

      const fetchedImages = (imgRes.data ?? []) as PropertyImage[];
      setImages(fetchedImages.length > 0 ? fetchedImages : PLACEHOLDER_IMAGES);
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
  const handleScheduleVisit = () => {
    if (!session) {
      setLoginDrawerOpen(true);
      return;
    }
    // TODO: navigate to visit scheduling
    navigate(`/dashboard/visits/new?property_id=${id}`);
  };

  const handleApplyNow = async () => {
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
  const activeImages = galleryTab === "floorplan" ? floorPlanImages : photoImages;
  const depositAmount = property.listed_rent * property.security_deposit_months;

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
              {hasFloorPlan && (
                <div className="flex gap-1 px-4 pb-2 lg:px-0">
                  <button
                    onClick={() => setGalleryTab("photos")}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      galleryTab === "photos"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    Photos
                  </button>
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
                <FavouriteHeart
                  filled={id ? isFavourited(id) : false}
                  onClick={() => {
                    if (!favLoggedIn) { setLoginDrawerOpen(true); return; }
                    if (id) toggleFavourite(id);
                  }}
                />
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

            {/* 5. Flat Number — Locked */}
            <section className="px-4 lg:px-0">
              <Card className="border-border bg-muted/50">
                <CardContent className="flex items-center gap-3 p-4">
                  <Lock className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Flat number revealed after scheduling a visit or completing payment
                  </p>
                </CardContent>
              </Card>
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
                  <Button
                    onClick={handleScheduleVisit}
                    variant="outline"
                    className="w-full min-h-[44px]"
                  >
                    Schedule a Visit
                  </Button>
                  <Button
                    onClick={handleApplyNow}
                    className="w-full min-h-[44px]"
                  >
                    Apply Now
                  </Button>
                </CardContent>
              </Card>
            </div>
          </aside>
        </div>
      </div>

      {/* ─── Mobile Sticky CTA Bar ───────────────────────────── */}
      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background p-3 lg:hidden">
        <div className="mx-auto flex max-w-4xl gap-3">
          <Button
            onClick={handleScheduleVisit}
            variant="outline"
            className="min-h-[44px] flex-1"
          >
            Schedule Visit
          </Button>
          <Button
            onClick={handleApplyNow}
            className="min-h-[44px] flex-1"
          >
            Apply Now
          </Button>
        </div>
      </div>
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
