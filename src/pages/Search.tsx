import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  Search as SearchIcon,
  LayoutGrid,
  List,
  SlidersHorizontal,
  X,
  AlertTriangle,
  Home,
  ChevronDown,
} from "lucide-react";
import { useFavourites } from "@/hooks/useFavourites";
import FavouriteHeart from "@/components/FavouriteHeart";
import {
  Drawer as LoginDrawerPrimitive,
  DrawerContent as LoginDrawerContent,
  DrawerHeader as LoginDrawerHeader,
  DrawerTitle as LoginDrawerTitle,
  DrawerClose as LoginDrawerClose,
  DrawerFooter as LoginDrawerFooter,
} from "@/components/ui/drawer";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Property {
  id: string;
  building_name: string;
  floor_number: number | null;
  locality: string | null;
  city: string;
  bhk: string;
  square_footage: number | null;
  furnishing: string;
  listed_rent: number;
  parking_4w: string;
  parking_2w: string;
  amenities: any;
  pet_policy: string | null;
  title: string | null;
  available_from: string | null;
  property_type: string | null;
  primary_image_url: string | null;
}

interface Filters {
  bhk: string[];
  budgetMin: number | null;
  budgetMax: number | null;
  furnishing: string[];
  amenities: string[];
  pets: "any" | "allowed" | "not_allowed";
}

const DEFAULT_FILTERS: Filters = {
  bhk: [],
  budgetMin: null,
  budgetMax: null,
  furnishing: [],
  amenities: [],
  pets: "any",
};

const PAGE_SIZE = 12;

const PLACEHOLDER_IMG =
  "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&q=80";

const LOCALITIES = [
  "Koramangala",
  "HSR Layout",
  "Indiranagar",
  "Whitefield",
  "BTM Layout",
  "Sarjapur Road",
  "Marathahalli",
  "Jayanagar",
  "JP Nagar",
  "Hebbal",
  "Electronic City",
  "Yelahanka",
];

const BHK_OPTIONS = [
  { value: "studio", label: "Studio" },
  { value: "1BHK", label: "1 BHK" },
  { value: "2BHK", label: "2 BHK" },
  { value: "3BHK", label: "3 BHK" },
  { value: "4BHK", label: "4 BHK" },
  { value: "5BHK_plus", label: "5 BHK+" },
];

const FURNISHING_OPTIONS = [
  { value: "unfurnished", label: "Unfurnished" },
  { value: "semi_furnished", label: "Semi Furnished" },
  { value: "fully_furnished", label: "Fully Furnished" },
];

const AMENITY_OPTIONS = [
  "gym", "pool", "lift", "power_backup", "security",
  "cctv", "intercom", "play_area", "clubhouse", "jogging_track",
];

const BUDGET_PRESETS = [
  { label: "Under ₹20k", min: null, max: 20000 },
  { label: "₹20k–35k", min: 20000, max: 35000 },
  { label: "₹35k–50k", min: 35000, max: 50000 },
  { label: "₹50k+", min: 50000, max: null },
];

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
    semi_furnished: "Semi Furnished",
    fully_furnished: "Fully Furnished",
  };
  return map[f] ?? f;
}

function topAmenity(amenities: any): string | null {
  if (!amenities) return null;
  const arr = Array.isArray(amenities) ? amenities : [];
  const priority = ["gym", "pool", "lift", "power_backup", "security"];
  for (const a of priority) {
    if (arr.includes(a)) return a.replace("_", " ");
  }
  return null;
}

function getHighlightPills(p: Property): string[] {
  const pills: string[] = [];
  pills.push(furnishingLabel(p.furnishing));
  if (p.parking_4w && p.parking_4w !== "none") pills.push("Car Parking");
  else if (p.parking_2w && p.parking_2w !== "none") pills.push("Bike Parking");
  const ta = topAmenity(p.amenities);
  if (ta) pills.push(ta.charAt(0).toUpperCase() + ta.slice(1));
  return pills.slice(0, 3);
}

function activeFilterCount(f: Filters): number {
  let c = 0;
  if (f.bhk.length) c++;
  if (f.budgetMin !== null || f.budgetMax !== null) c++;
  if (f.furnishing.length) c++;
  if (f.amenities.length) c++;
  if (f.pets !== "any") c++;
  return c;
}

// ─── Filter Panel Component ─────────────────────────────────────────────────

function FilterPanel({
  draft,
  setDraft,
  onApply,
  onReset,
}: {
  draft: Filters;
  setDraft: React.Dispatch<React.SetStateAction<Filters>>;
  onApply: () => void;
  onReset: () => void;
}) {
  const toggleChip = (key: "bhk" | "furnishing", val: string) => {
    setDraft((d) => ({
      ...d,
      [key]: d[key].includes(val) ? d[key].filter((v) => v !== val) : [...d[key], val],
    }));
  };

  const toggleAmenity = (val: string) => {
    setDraft((d) => ({
      ...d,
      amenities: d.amenities.includes(val)
        ? d.amenities.filter((v) => v !== val)
        : [...d.amenities, val],
    }));
  };

  const applyPreset = (min: number | null, max: number | null) => {
    setDraft((d) => ({ ...d, budgetMin: min, budgetMax: max }));
  };

  return (
    <div className="space-y-6">
      {/* BHK */}
      <div>
        <h3 className="mb-2 text-sm font-semibold text-gray-900">BHK</h3>
        <div className="flex flex-wrap gap-2">
          {BHK_OPTIONS.map((o) => (
            <button
              key={o.value}
              onClick={() => toggleChip("bhk", o.value)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                draft.bhk.includes(o.value)
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Budget */}
      <div>
        <h3 className="mb-2 text-sm font-semibold text-gray-900">Budget</h3>
        <div className="flex flex-wrap gap-2 mb-3">
          {BUDGET_PRESETS.map((p) => {
            const active = draft.budgetMin === p.min && draft.budgetMax === p.max;
            return (
              <button
                key={p.label}
                onClick={() => applyPreset(p.min, p.max)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            placeholder="Min ₹"
            value={draft.budgetMin ?? ""}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                budgetMin: e.target.value ? Number(e.target.value) : null,
              }))
            }
            className="h-9 text-sm"
          />
          <span className="text-gray-400">–</span>
          <Input
            type="number"
            placeholder="Max ₹"
            value={draft.budgetMax ?? ""}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                budgetMax: e.target.value ? Number(e.target.value) : null,
              }))
            }
            className="h-9 text-sm"
          />
        </div>
      </div>

      {/* Furnishing */}
      <div>
        <h3 className="mb-2 text-sm font-semibold text-gray-900">Furnishing</h3>
        <div className="flex flex-wrap gap-2">
          {FURNISHING_OPTIONS.map((o) => (
            <button
              key={o.value}
              onClick={() => toggleChip("furnishing", o.value)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                draft.furnishing.includes(o.value)
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Amenities */}
      <div>
        <h3 className="mb-2 text-sm font-semibold text-gray-900">Amenities</h3>
        <div className="flex flex-wrap gap-2">
          {AMENITY_OPTIONS.map((a) => (
            <button
              key={a}
              onClick={() => toggleAmenity(a)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                draft.amenities.includes(a)
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
              }`}
            >
              {a.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Pets */}
      <div>
        <h3 className="mb-2 text-sm font-semibold text-gray-900">Pet Policy</h3>
        <div className="flex gap-2">
          {([
            { v: "any" as const, l: "Don't care" },
            { v: "allowed" as const, l: "Pets OK" },
            { v: "not_allowed" as const, l: "No pets" },
          ]).map((o) => (
            <button
              key={o.v}
              onClick={() => setDraft((d) => ({ ...d, pets: o.v }))}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                draft.pets === o.v
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
              }`}
            >
              {o.l}
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button onClick={onApply} className="flex-1">
          Show Results
        </Button>
        <Button variant="outline" onClick={onReset} className="flex-1">
          Reset
        </Button>
      </div>
    </div>
  );
}

// ─── Skeleton Cards ──────────────────────────────────────────────────────────

function SkeletonCardGrid() {
  return (
    <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
      <Skeleton className="h-48 w-full rounded-none" />
      <div className="p-4 space-y-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-20" />
        <div className="flex gap-2 pt-1">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
      </div>
    </div>
  );
}

function SkeletonCardList() {
  return (
    <div className="flex rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
      <Skeleton className="h-32 w-32 flex-shrink-0 rounded-none" />
      <div className="flex-1 p-3 space-y-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-20" />
        <div className="flex gap-2 pt-1">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
      </div>
    </div>
  );
}

// ─── Property Card ───────────────────────────────────────────────────────────

function PropertyCardGrid({ p }: { p: Property }) {
  const pills = getHighlightPills(p);
  return (
    <Link to={`/property/${p.id}`} className="block cursor-pointer">
    <div className="group rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden transition-shadow hover:shadow-md hover:shadow-primary/10">
      <div className="relative h-48 overflow-hidden">
        <img
          src={p.primary_image_url || PLACEHOLDER_IMG}
          alt={`${p.building_name} ${bhkLabel(p.bhk)} apartment`}
          loading="lazy"
          className="h-full w-full object-cover transition-transform group-hover:scale-105"
        />
        <span className="absolute left-2 top-2 rounded-md bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
          {bhkLabel(p.bhk)}
        </span>
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-3 pb-2 pt-6">
          <span className="text-lg font-bold text-white">
            {formatIndianRupee(p.listed_rent)}
            <span className="text-sm font-normal opacity-80">/mo</span>
          </span>
        </div>
      </div>
      <div className="p-4 space-y-1.5">
        <p className="text-xs text-gray-500">
          {p.locality ? `${p.locality}, ` : ""}{p.city}
        </p>
        <h3 className="text-sm font-bold text-gray-900 leading-tight">
          {p.building_name}
          {p.floor_number != null && (
            <span className="font-normal text-gray-500"> · Floor {p.floor_number}</span>
          )}
        </h3>
        {p.square_footage && (
          <p className="text-xs text-gray-500">{p.square_footage} sqft</p>
        )}
        <div className="flex flex-wrap gap-1 pt-1">
          {pills.map((pill) => (
            <span
              key={pill}
              className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] font-medium text-gray-600"
            >
              {pill}
            </span>
          ))}
        </div>
        <div className="flex gap-1.5 pt-2">
          <span className="rounded-full border border-green-100 bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-700">
            1 Month Deposit
          </span>
          <span className="rounded-full border border-green-100 bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-700">
            Zero Brokerage
          </span>
        </div>
      </div>
    </div>
    </Link>
  );
}

function PropertyCardList({ p }: { p: Property }) {
  const pills = getHighlightPills(p);
  return (
    <Link to={`/property/${p.id}`} className="block cursor-pointer">
    <div className="group flex rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden transition-shadow hover:shadow-md hover:shadow-primary/10">
      <div className="relative h-auto w-32 flex-shrink-0 overflow-hidden">
        <img
          src={p.primary_image_url || PLACEHOLDER_IMG}
          alt={`${p.building_name} ${bhkLabel(p.bhk)} apartment`}
          loading="lazy"
          className="h-full w-full object-cover transition-transform group-hover:scale-105"
        />
        <span className="absolute left-1.5 top-1.5 rounded-md bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
          {bhkLabel(p.bhk)}
        </span>
      </div>
      <div className="flex flex-1 flex-col justify-between p-3">
        <div className="space-y-1">
          <p className="text-[10px] text-gray-500">
            {p.locality ? `${p.locality}, ` : ""}{p.city}
          </p>
          <h3 className="text-sm font-bold text-gray-900 leading-tight">
            {p.building_name}
            {p.floor_number != null && (
              <span className="font-normal text-gray-500"> · Floor {p.floor_number}</span>
            )}
          </h3>
          {p.square_footage && (
            <p className="text-[10px] text-gray-500">{p.square_footage} sqft</p>
          )}
          <p className="text-base font-bold text-gray-900">
            {formatIndianRupee(p.listed_rent)}
            <span className="text-xs font-normal text-gray-500">/mo</span>
          </p>
        </div>
        <div className="space-y-1.5">
          <div className="flex flex-wrap gap-1">
            {pills.map((pill) => (
              <span
                key={pill}
                className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] font-medium text-gray-600"
              >
                {pill}
              </span>
            ))}
          </div>
          <div className="flex gap-1.5">
            <span className="rounded-full border border-green-100 bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-700">
              1 Month Deposit
            </span>
            <span className="rounded-full border border-green-100 bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-700">
              Zero Brokerage
            </span>
          </div>
        </div>
      </div>
    </div>
    </Link>
  );
}

// ─── Main Search Page ────────────────────────────────────────────────────────

export default function SearchPage() {
  const [viewMode, setViewMode] = useState<"grid" | "list">(() =>
    typeof window !== "undefined" && window.innerWidth >= 768 ? "grid" : "list"
  );
  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [draftFilters, setDraftFilters] = useState<Filters>(DEFAULT_FILTERS);

  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const pageRef = useRef(0);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchText), 300);
    return () => clearTimeout(t);
  }, [searchText]);

  // Filter suggestions
  const suggestions = useMemo(() => {
    if (!searchText.trim()) return LOCALITIES;
    return LOCALITIES.filter((l) =>
      l.toLowerCase().includes(searchText.toLowerCase())
    );
  }, [searchText]);

  // Fetch properties
  const fetchProperties = useCallback(
    async (page: number, append: boolean) => {
      if (page === 0) {
        setLoading(true);
        setError(null);
      } else {
        setLoadingMore(true);
      }

      try {
        const from = page * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

        let query = supabase
          .from("properties")
          .select(
            "id, building_name, floor_number, locality, city, bhk, square_footage, furnishing, listed_rent, parking_4w, parking_2w, amenities, pet_policy, title, available_from, property_type",
            { count: "exact" }
          )
          .eq("status", "listed")
          .eq("is_active", true)
          .order("listed_at", { ascending: false })
          .range(from, to);

        // Search by locality
        if (debouncedSearch.trim()) {
          query = query.ilike("locality", `%${debouncedSearch.trim()}%`);
        }

        // BHK filter
        if (filters.bhk.length > 0) {
          query = query.in("bhk", filters.bhk as any);
        }

        // Budget
        if (filters.budgetMin != null) {
          query = query.gte("listed_rent", filters.budgetMin);
        }
        if (filters.budgetMax != null) {
          query = query.lte("listed_rent", filters.budgetMax);
        }

        // Furnishing
        if (filters.furnishing.length > 0) {
          query = query.in("furnishing", filters.furnishing as any);
        }

        // Amenities
        if (filters.amenities.length > 0) {
          query = query.contains("amenities", filters.amenities);
        }

        // Pets
        if (filters.pets === "allowed") {
          query = query.ilike("pet_policy", "%allowed%");
        } else if (filters.pets === "not_allowed") {
          query = query.not("pet_policy", "ilike", "%allowed%");
        }

        const { data, error: queryError, count } = await query;

        if (queryError) throw queryError;

        const rows = (data ?? []) as any[];
        if (count != null) setTotalCount(count);

        // Fetch primary images
        let imageMap: Record<string, string> = {};
        if (rows.length > 0) {
          const ids = rows.map((r) => r.id);
          const { data: imgs } = await supabase
            .from("property_images")
            .select("property_id, url")
            .in("property_id", ids)
            .eq("is_primary", true);
          if (imgs) {
            for (const img of imgs) {
              imageMap[img.property_id] = img.url;
            }
          }
        }

        const mapped: Property[] = rows.map((r) => ({
          ...r,
          primary_image_url: imageMap[r.id] || null,
        }));

        if (append) {
          setProperties((prev) => [...prev, ...mapped]);
        } else {
          setProperties(mapped);
        }

        setHasMore(rows.length === PAGE_SIZE);
      } catch (e: any) {
        setError(e.message ?? "Something went wrong");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [debouncedSearch, filters]
  );

  // Reset and fetch when search or filters change
  useEffect(() => {
    pageRef.current = 0;
    fetchProperties(0, false);
  }, [fetchProperties]);

  // Infinite scroll
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          pageRef.current += 1;
          fetchProperties(pageRef.current, true);
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, fetchProperties]);

  // Apply filters from draft
  const applyFilters = () => {
    setFilters({ ...draftFilters });
    setDrawerOpen(false);
  };

  const resetFilters = () => {
    setDraftFilters(DEFAULT_FILTERS);
  };

  const clearAllFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setDraftFilters(DEFAULT_FILTERS);
    setSearchText("");
  };

  const filterCount = activeFilterCount(filters);

  const selectSuggestion = (loc: string) => {
    setSearchText(loc);
    setShowSuggestions(false);
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-100">
      {/* ─── NAV ─── */}
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          <Link
            to="/"
            className="flex-shrink-0 text-xl font-bold tracking-tight text-primary"
          >
            REEVE
          </Link>

          {/* Search bar */}
          <div className="relative flex-1 max-w-xl">
            <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search by locality..."
              value={searchText}
              onChange={(e) => {
                setSearchText(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50 pl-9 pr-8 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary"
            />
            {searchText && (
              <button
                onClick={() => {
                  setSearchText("");
                  searchInputRef.current?.focus();
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            {/* Suggestions dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                {suggestions.map((loc) => (
                  <button
                    key={loc}
                    onMouseDown={() => selectSuggestion(loc)}
                    className="flex w-full items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <SearchIcon className="mr-2 h-3.5 w-3.5 text-gray-400" />
                    {loc}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* View toggle */}
          <div className="hidden items-center rounded-lg border border-gray-200 bg-gray-50 p-0.5 md:flex">
            <button
              onClick={() => setViewMode("grid")}
              className={`rounded-md p-1.5 transition-colors ${
                viewMode === "grid"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`rounded-md p-1.5 transition-colors ${
                viewMode === "list"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>

          {/* Mobile: View toggle + Filters button */}
          <div className="flex items-center gap-2 md:hidden">
            <div className="flex items-center rounded-lg border border-gray-200 bg-gray-50 p-0.5">
              <button
                onClick={() => setViewMode("grid")}
                className={`rounded-md p-1.5 transition-colors ${
                  viewMode === "grid"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-400"
                }`}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`rounded-md p-1.5 transition-colors ${
                  viewMode === "list"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-400"
                }`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Desktop tagline */}
        <div className="hidden border-t border-gray-100 bg-gray-50 lg:block">
          <p className="mx-auto max-w-7xl px-4 py-1.5 text-center text-xs text-gray-500">
            Zero Brokerage. One Month Deposit. Hassle-Free Renting.
          </p>
        </div>
      </header>

      {/* ─── BODY ─── */}
      <div className="mx-auto max-w-7xl lg:flex">
        {/* Desktop sidebar */}
        <aside className="hidden w-72 flex-shrink-0 border-r border-gray-200 bg-white p-5 lg:block">
          <div className="sticky top-32">
            <h2 className="mb-4 text-sm font-bold text-gray-900 uppercase tracking-wider">
              Filters
            </h2>
            <FilterPanel
              draft={draftFilters}
              setDraft={setDraftFilters}
              onApply={applyFilters}
              onReset={resetFilters}
            />
          </div>
        </aside>

        {/* Results */}
        <main className="flex-1 p-4">
          {/* Mobile filter bar */}
          <div className="mb-4 flex items-center justify-between lg:hidden">
            <p className="text-sm text-gray-500">
              {!loading && `${totalCount} properties`}
            </p>
            <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
              <DrawerTrigger asChild>
                <Button variant="outline" size="sm" className="relative gap-1.5">
                  <SlidersHorizontal className="h-4 w-4" />
                  Filters
                  {filterCount > 0 && (
                    <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                      {filterCount}
                    </span>
                  )}
                </Button>
              </DrawerTrigger>
              <DrawerContent className="max-h-[85vh]">
                <DrawerHeader>
                  <DrawerTitle>Filters</DrawerTitle>
                </DrawerHeader>
                <div className="overflow-y-auto px-4 pb-4">
                  <FilterPanel
                    draft={draftFilters}
                    setDraft={setDraftFilters}
                    onApply={applyFilters}
                    onReset={resetFilters}
                  />
                </div>
              </DrawerContent>
            </Drawer>
          </div>

          {/* Desktop count */}
          <div className="mb-4 hidden items-center justify-between lg:flex">
            <p className="text-sm text-gray-500">
              {!loading && `${totalCount} properties found`}
            </p>
            {filterCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-xs text-gray-500">
                Clear all filters
              </Button>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-800">
                  Something went wrong. Try again.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  pageRef.current = 0;
                  fetchProperties(0, false);
                }}
              >
                Retry
              </Button>
            </div>
          )}

          {/* Loading skeleton */}
          {loading && (
            <div
              className={
                viewMode === "grid"
                  ? "grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
                  : "space-y-3"
              }
            >
              {Array.from({ length: 6 }).map((_, i) =>
                viewMode === "grid" ? (
                  <SkeletonCardGrid key={i} />
                ) : (
                  <SkeletonCardList key={i} />
                )
              )}
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && properties.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <span className="text-5xl">🏠</span>
              <h2 className="mt-4 text-lg font-bold text-gray-900">
                No properties found
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Try adjusting your filters or search for a different locality
              </p>
              <Button
                className="mt-4"
                variant="outline"
                onClick={clearAllFilters}
              >
                Clear Filters
              </Button>
            </div>
          )}

          {/* Property grid/list */}
          {!loading && properties.length > 0 && (
            <>
              <div
                className={
                  viewMode === "grid"
                    ? "grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
                    : "space-y-3"
                }
              >
                {properties.map((p) =>
                  viewMode === "grid" ? (
                    <PropertyCardGrid key={p.id} p={p} />
                  ) : (
                    <PropertyCardList key={p.id} p={p} />
                  )
                )}
              </div>

              {/* Loading more skeletons */}
              {loadingMore && (
                <div
                  className={
                    viewMode === "grid"
                      ? "mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
                      : "mt-3 space-y-3"
                  }
                >
                  {Array.from({ length: 3 }).map((_, i) =>
                    viewMode === "grid" ? (
                      <SkeletonCardGrid key={`more-${i}`} />
                    ) : (
                      <SkeletonCardList key={`more-${i}`} />
                    )
                  )}
                </div>
              )}

              {/* End of results */}
              {!hasMore && !loadingMore && (
                <p className="py-8 text-center text-sm text-gray-400">
                  You've seen all {totalCount} properties
                </p>
              )}
            </>
          )}

          {/* Refer a Property Banner */}
          {!loading && (
            <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50 p-6 text-center sm:p-8">
              <h3 className="text-lg font-bold text-gray-900 sm:text-xl">
                Can't find your property listed here?
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm text-gray-600">
                Tell us the owner's details — we'll bring them onboard with our 1-month deposit system.
              </p>
              <Link to="/refer-property">
                <Button className="mt-4 rounded-lg bg-primary px-6 text-sm font-semibold text-white hover:bg-primary/90">
                  Refer a Property →
                </Button>
              </Link>
            </div>
          )}

          {/* Sentinel for infinite scroll */}
          <div ref={sentinelRef} className="h-px" />
        </main>
      </div>
    </div>
  );
}
