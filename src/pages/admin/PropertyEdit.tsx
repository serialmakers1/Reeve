import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ArrowLeft, CalendarIcon, ExternalLink } from "lucide-react";

const BHK_OPTIONS = [
  { value: "studio", label: "Studio" },
  { value: "1BHK", label: "1 BHK" },
  { value: "2BHK", label: "2 BHK" },
  { value: "3BHK", label: "3 BHK" },
  { value: "4BHK", label: "4 BHK" },
  { value: "5BHK_plus", label: "5 BHK+" },
];

const PROPERTY_TYPE_OPTIONS = [
  { value: "apartment", label: "Apartment" },
  { value: "villa", label: "Villa" },
  { value: "independent_house", label: "Independent House" },
];

const FURNISHING_OPTIONS = [
  { value: "unfurnished", label: "Unfurnished" },
  { value: "semi_furnished", label: "Semi Furnished" },
  { value: "fully_furnished", label: "Fully Furnished" },
];

const FURNISHING_ITEMS = [
  { value: "ac", label: "AC" },
  { value: "geyser", label: "Geyser" },
  { value: "washing_machine", label: "Washing Machine" },
  { value: "bed", label: "Bed" },
  { value: "wardrobe", label: "Wardrobe" },
  { value: "sofa", label: "Sofa" },
  { value: "dining_table", label: "Dining Table" },
  { value: "tv", label: "TV" },
  { value: "fridge", label: "Fridge" },
  { value: "microwave", label: "Microwave" },
  { value: "modular_kitchen", label: "Modular Kitchen" },
  { value: "curtains", label: "Curtains" },
  { value: "water_purifier", label: "Water Purifier" },
];

const BUILDING_AMENITIES = [
  { value: "lift", label: "Lift" },
  { value: "security_24hr", label: "24hr Security" },
  { value: "power_backup", label: "Power Backup" },
  { value: "gym", label: "Gym" },
  { value: "swimming_pool", label: "Swimming Pool" },
  { value: "clubhouse", label: "Clubhouse" },
  { value: "visitor_parking", label: "Visitor Parking" },
  { value: "cctv", label: "CCTV" },
  { value: "children_play_area", label: "Children's Play Area" },
  { value: "intercom", label: "Intercom" },
  { value: "park", label: "Park" },
  { value: "maintenance_staff", label: "Maintenance Staff" },
  { value: "gated_access", label: "Gated Access" },
];

const PARKING_OPTIONS = [
  { value: "none", label: "None" },
  { value: "covered", label: "Covered" },
  { value: "uncovered", label: "Uncovered" },
  { value: "both", label: "Both" },
];

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  draft: { label: "Draft", variant: "outline" },
  inspection_proposed: { label: "Inspection Requested", variant: "secondary" },
  inspection_scheduled: { label: "Inspection Scheduled", variant: "secondary" },
  inspected: { label: "Inspected", variant: "default" },
  agreement_pending: { label: "Agreement Pending", variant: "secondary" },
  listed: { label: "Listed", variant: "default" },
  occupied: { label: "Occupied", variant: "destructive" },
  off_market: { label: "Off Market", variant: "outline" },
};

type PropertyData = Record<string, unknown>;

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

  const [property, setProperty] = useState<PropertyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state — Section 1: Basic Details
  const [buildingName, setBuildingName] = useState("");
  const [legalOwnerName, setLegalOwnerName] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [locality, setLocality] = useState("");
  const [city, setCity] = useState("");
  const [pincode, setPincode] = useState("");
  const [bhk, setBhk] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [floorNumber, setFloorNumber] = useState<string>("");
  const [totalFloors, setTotalFloors] = useState<string>("");
  const [squareFootage, setSquareFootage] = useState<string>("");

  // Section 2: Listing Details
  const [flatNumber, setFlatNumber] = useState("");
  const [listedRent, setListedRent] = useState<string>("");
  const [societyMaintenance, setSocietyMaintenance] = useState<string>("");
  const [securityDepositMonths, setSecurityDepositMonths] = useState("1");
  const [availableFrom, setAvailableFrom] = useState<Date | undefined>();

  // Section 3: Furnishing
  const [furnishing, setFurnishing] = useState("");
  const [furnishingItems, setFurnishingItems] = useState<string[]>([]);

  // Section 4: Building Amenities
  const [buildingAmenities, setBuildingAmenities] = useState<string[]>([]);

  // Section 5: Utilities & Policies
  const [waterIncluded, setWaterIncluded] = useState(false);
  const [gasIncluded, setGasIncluded] = useState(false);
  const [electricityIncluded, setElectricityIncluded] = useState(false);
  const [parking2w, setParking2w] = useState("none");
  const [parking4w, setParking4w] = useState("none");
  const [petPolicy, setPetPolicy] = useState("");
  const [buildingRules, setBuildingRules] = useState("");

  // Section 6: Description
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  // Publish toggle
  const [isActive, setIsActive] = useState(false);

  // Section 7: Owner Profile
  const [ownerOnlyRental, setOwnerOnlyRental] = useState<boolean | null>(null);
  const [ownerIncomeDependent, setOwnerIncomeDependent] = useState<boolean | null>(null);
  const [ownerCommitted12, setOwnerCommitted12] = useState<boolean | null>(null);
  const [ownerWantsControl, setOwnerWantsControl] = useState<boolean | null>(null); // inverted from auto_accept_enabled
  const [ownerHasLocalRep, setOwnerHasLocalRep] = useState<boolean | null>(null);
  const [ownerRepName, setOwnerRepName] = useState("");
  const [ownerRepPhone, setOwnerRepPhone] = useState("");
  const [ownerLivesSameCity, setOwnerLivesSameCity] = useState<boolean | null>(null);
  const [ownerPrefersPhone, setOwnerPrefersPhone] = useState<boolean | null>(null);

  // Photos
  const [images, setImages] = useState<PropertyImage[]>([]);
  const [imagesLoading, setImagesLoading] = useState(false);
  const [newSectionName, setNewSectionName] = useState("");
  const [showSectionInput, setShowSectionInput] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<Record<string, boolean>>({});
  const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!id || authLoading) return;
    const fetchProperty = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error || !data) {
        toast({ title: "Property not found", variant: "destructive" });
        navigate("/admin/owners", { replace: true });
        return;
      }

      setProperty(data as PropertyData);

      // Pre-fill form
      setBuildingName((data as Record<string, unknown>).building_name as string || "");
      setLegalOwnerName((data as Record<string, unknown>).legal_owner_name as string || "");
      setStreetAddress((data as Record<string, unknown>).street_address as string || "");
      setLocality((data as Record<string, unknown>).locality as string || "");
      setCity((data as Record<string, unknown>).city as string || "");
      setPincode((data as Record<string, unknown>).pincode as string || "");
      setBhk((data as Record<string, unknown>).bhk as string || "");
      setPropertyType((data as Record<string, unknown>).property_type as string || "apartment");
      setFloorNumber((data as Record<string, unknown>).floor_number != null ? String((data as Record<string, unknown>).floor_number) : "");
      setTotalFloors((data as Record<string, unknown>).total_floors != null ? String((data as Record<string, unknown>).total_floors) : "");
      setSquareFootage((data as Record<string, unknown>).square_footage != null ? String((data as Record<string, unknown>).square_footage) : "");
      setFlatNumber((data as Record<string, unknown>).flat_number as string || "");
      setListedRent((data as Record<string, unknown>).listed_rent != null ? String((data as Record<string, unknown>).listed_rent) : "");
      setSocietyMaintenance((data as Record<string, unknown>).society_maintenance_approx != null ? String((data as Record<string, unknown>).society_maintenance_approx) : "");
      setSecurityDepositMonths(String((data as Record<string, unknown>).security_deposit_months ?? 1));
      if ((data as Record<string, unknown>).available_from) {
        setAvailableFrom(new Date(((data as Record<string, unknown>).available_from as string) + "T00:00:00"));
      }
      setFurnishing((data as Record<string, unknown>).furnishing as string || "");
      setWaterIncluded(!!(data as Record<string, unknown>).utility_water_included);
      setGasIncluded(!!(data as Record<string, unknown>).utility_gas_included);
      setElectricityIncluded(!!(data as Record<string, unknown>).utility_electricity_included);
      setParking2w((data as Record<string, unknown>).parking_2w as string || "none");
      setParking4w((data as Record<string, unknown>).parking_4w as string || "none");
      setPetPolicy((data as Record<string, unknown>).pet_policy as string || "");
      setBuildingRules((data as Record<string, unknown>).building_rules as string || "");
      setTitle((data as Record<string, unknown>).title as string || "");
      setDescription((data as Record<string, unknown>).description as string || "");
      setIsActive(!!(data as Record<string, unknown>).is_active);

      // Owner profile fields
      const d = data as Record<string, unknown>;
      setOwnerOnlyRental(d.owner_only_rental_property as boolean | null);
      setOwnerIncomeDependent(d.owner_income_dependent as boolean | null);
      setOwnerCommitted12(d.owner_committed_12_months as boolean | null);
      // auto_accept_enabled: false = owner wants control (Yes), true = platform handles (No)
      const autoAccept = d.auto_accept_enabled as boolean;
      setOwnerWantsControl(autoAccept === true ? false : autoAccept === false ? true : null);
      setOwnerHasLocalRep(d.owner_has_local_rep as boolean | null);
      setOwnerRepName(d.owner_rep_name as string || "");
      setOwnerRepPhone(d.owner_rep_phone as string || "");
      setOwnerLivesSameCity(d.owner_lives_in_same_city as boolean | null);
      setOwnerPrefersPhone(d.owner_prefers_phone_calls as boolean | null);

      // Parse amenities
      const amenities = (data as Record<string, unknown>).amenities as Record<string, unknown> || {};
      setFurnishingItems(Array.isArray(amenities.furnishing_items) ? amenities.furnishing_items as string[] : []);
      setBuildingAmenities(Array.isArray(amenities.building) ? amenities.building as string[] : []);

      setLoading(false);
    };
    fetchProperty();
  }, [id, authLoading, navigate, toast]);

  useEffect(() => {
    if (!id) return;
    setImagesLoading(true);
    supabase
      .from("property_images")
      .select("id, url, caption, is_primary, is_floor_plan, sort_order, section")
      .eq("property_id", id)
      .order("section", { ascending: true, nullsFirst: true })
      .order("sort_order", { ascending: true })
      .then(({ data, error }) => {
        if (!error && data) setImages(data as PropertyImage[]);
        setImagesLoading(false);
      });
  }, [id]);

  const toggleItem = (list: string[], setList: (v: string[]) => void, value: string) => {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  };

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);

    const amenities = {
      furnishing_items: furnishingItems,
      building: buildingAmenities,
    };

    const { error } = await supabase
      .from("properties")
      .update({
        building_name: buildingName,
        legal_owner_name: legalOwnerName || null,
        street_address: streetAddress,
        locality: locality || null,
        city,
        pincode: pincode || null,
        bhk: bhk as "studio" | "1BHK" | "2BHK" | "3BHK" | "4BHK" | "5BHK_plus",
        property_type: propertyType || null,
        floor_number: floorNumber ? parseInt(floorNumber) : null,
        total_floors: totalFloors ? parseInt(totalFloors) : null,
        square_footage: squareFootage ? parseFloat(squareFootage) : null,
        flat_number: flatNumber || null,
        listed_rent: listedRent ? parseFloat(listedRent) : 0,
        society_maintenance_approx: societyMaintenance ? parseFloat(societyMaintenance) : null,
        security_deposit_months: parseInt(securityDepositMonths),
        available_from: availableFrom ? format(availableFrom, "yyyy-MM-dd") : null,
        furnishing: furnishing as "unfurnished" | "semi_furnished" | "fully_furnished",
        amenities: amenities as unknown as typeof amenities & Record<string, never>,
        utility_water_included: waterIncluded,
        utility_gas_included: gasIncluded,
        utility_electricity_included: electricityIncluded,
        parking_2w: parking2w as "none" | "covered" | "uncovered" | "both",
        parking_4w: parking4w as "none" | "covered" | "uncovered" | "both",
        pet_policy: petPolicy || null,
        building_rules: buildingRules || null,
        title: title || null,
        description: description || null,
        is_active: isActive,
        owner_only_rental_property: ownerOnlyRental,
        owner_income_dependent: ownerIncomeDependent,
        owner_committed_12_months: ownerCommitted12,
        auto_accept_enabled: ownerWantsControl === null ? false : !ownerWantsControl,
        owner_has_local_rep: ownerHasLocalRep,
        owner_rep_name: ownerHasLocalRep ? (ownerRepName || null) : null,
        owner_rep_phone: ownerHasLocalRep ? (ownerRepPhone || null) : null,
        owner_lives_in_same_city: ownerLivesSameCity,
        owner_prefers_phone_calls: ownerPrefersPhone,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    setSaving(false);

    if (error) {
      toast({ title: "Failed to save changes", description: error.message, variant: "destructive" });
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
          setImages(prev => [...prev, {
            id: json.id,
            url: json.url,
            caption: null,
            is_primary: false,
            is_floor_plan: section.toLowerCase() === "floor plan",
            sort_order: 0,
            section: section,
          }]);
        } else {
          setUploadErrors(prev => ({ ...prev, [fileKey]: json.error || "Upload failed" }));
        }
      } catch (e) {
        setUploadErrors(prev => ({ ...prev, [fileKey]: "Network error" }));
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
        setImages(prev => prev.filter(img => img.id !== imageId));
      }
    } catch (e) {
      console.error("Delete failed", e);
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
            <Button variant="ghost" size="icon" className="min-h-[44px] min-w-[44px]" onClick={() => navigate("/admin/owners")}>
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

        {/* Section 1 — Basic Details */}
        <Section title="Basic Details">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Building Name">
              <Input value={buildingName} onChange={(e) => setBuildingName(e.target.value)} className="min-h-[44px]" />
            </Field>
            <Field label="Property Legal Owner Name">
              <Input value={legalOwnerName} onChange={(e) => setLegalOwnerName(e.target.value)} placeholder="e.g. Rajesh Kumar Sharma" className="min-h-[44px]" />
            </Field>
            <Field label="Street Address">
              <Input value={streetAddress} onChange={(e) => setStreetAddress(e.target.value)} className="min-h-[44px]" />
            </Field>
            <Field label="Locality">
              <Input value={locality} onChange={(e) => setLocality(e.target.value)} className="min-h-[44px]" />
            </Field>
            <Field label="City">
              <Input value={city} onChange={(e) => setCity(e.target.value)} className="min-h-[44px]" />
            </Field>
            <Field label="Pincode">
              <Input value={pincode} onChange={(e) => setPincode(e.target.value)} className="min-h-[44px]" />
            </Field>
            <Field label="BHK">
              <Select value={bhk} onValueChange={setBhk}>
                <SelectTrigger className="min-h-[44px]"><SelectValue placeholder="Select BHK" /></SelectTrigger>
                <SelectContent>
                  {BHK_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Property Type">
              <Select value={propertyType} onValueChange={setPropertyType}>
                <SelectTrigger className="min-h-[44px]"><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {PROPERTY_TYPE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Floor Number">
              <Input type="number" value={floorNumber} onChange={(e) => setFloorNumber(e.target.value)} className="min-h-[44px]" />
            </Field>
            <Field label="Total Floors">
              <Input type="number" value={totalFloors} onChange={(e) => setTotalFloors(e.target.value)} className="min-h-[44px]" />
            </Field>
            <Field label="Carpet Area (in sq ft)">
              <Input type="number" value={squareFootage} onChange={(e) => setSquareFootage(e.target.value)} className="min-h-[44px]" />
            </Field>
          </div>
        </Section>

        {/* Section 2 — Listing Details */}
        <Section title="Listing Details">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Flat No. (hidden from tenants)">
              <Input value={flatNumber} onChange={(e) => setFlatNumber(e.target.value)} className="min-h-[44px]" />
            </Field>
            <Field label="Listed Rent (₹)">
              <Input type="number" value={listedRent} onChange={(e) => setListedRent(e.target.value)} className="min-h-[44px]" />
            </Field>
            <Field label="Society Maintenance Approx (₹)">
              <Input type="number" value={societyMaintenance} onChange={(e) => setSocietyMaintenance(e.target.value)} className="min-h-[44px]" />
            </Field>
            <Field label="Security Deposit (months)">
              <Select value={securityDepositMonths} onValueChange={setSecurityDepositMonths}>
                <SelectTrigger className="min-h-[44px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 month</SelectItem>
                  <SelectItem value="2">2 months</SelectItem>
                  <SelectItem value="3">3 months</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Available From">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full min-h-[44px] justify-start text-left font-normal", !availableFrom && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {availableFrom ? format(availableFrom, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={availableFrom} onSelect={setAvailableFrom} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </Field>
          </div>
        </Section>

        {/* Section 3 — Furnishing */}
        <Section title="Furnishing">
          <div className="space-y-4">
            <Field label="Furnishing Type">
              <Select value={furnishing} onValueChange={setFurnishing}>
                <SelectTrigger className="min-h-[44px] max-w-xs"><SelectValue placeholder="Select furnishing" /></SelectTrigger>
                <SelectContent>
                  {FURNISHING_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <div>
              <Label className="text-sm font-medium">Furnishing Items</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                {FURNISHING_ITEMS.map((item) => (
                  <label key={item.value} className="flex items-center gap-2 cursor-pointer min-h-[44px]">
                    <Checkbox
                      checked={furnishingItems.includes(item.value)}
                      onCheckedChange={() => toggleItem(furnishingItems, setFurnishingItems, item.value)}
                    />
                    <span className="text-sm">{item.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* Section 4 — Building Amenities */}
        <Section title="Building Amenities">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {BUILDING_AMENITIES.map((item) => (
              <label key={item.value} className="flex items-center gap-2 cursor-pointer min-h-[44px]">
                <Checkbox
                  checked={buildingAmenities.includes(item.value)}
                  onCheckedChange={() => toggleItem(buildingAmenities, setBuildingAmenities, item.value)}
                />
                <span className="text-sm">{item.label}</span>
              </label>
            ))}
          </div>
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
              <Field label="Parking — 2 Wheeler">
                <Select value={parking2w} onValueChange={setParking2w}>
                  <SelectTrigger className="min-h-[44px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PARKING_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Parking — 4 Wheeler">
                <Select value={parking4w} onValueChange={setParking4w}>
                  <SelectTrigger className="min-h-[44px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PARKING_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <Field label="Pet Policy">
              <Input value={petPolicy} onChange={(e) => setPetPolicy(e.target.value)} placeholder="e.g. No pets allowed" className="min-h-[44px]" />
            </Field>
            <Field label="Building Rules">
              <Textarea value={buildingRules} onChange={(e) => setBuildingRules(e.target.value)} rows={3} />
            </Field>
          </div>
        </Section>

        {/* Section 6 — Description */}
        <Section title="Description">
          <div className="space-y-4">
            <Field label="Title (optional)">
              <Input value={title} onChange={(e) => setTitle(e.target.value)} className="min-h-[44px]" />
            </Field>
            <Field label="Description">
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
            </Field>
          </div>
        </Section>

        {/* Section 7 — Owner Profile */}
        <div className="rounded-lg border bg-card p-4 md:p-6 space-y-4">
          <div>
            <h2 className="text-base font-medium text-foreground">Owner Profile</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Internal notes collected during inspection — not visible to tenants or owners.</p>
          </div>
          <div className="space-y-5">
            <TriStateQuestion label="Is this the owner's only rental property?" value={ownerOnlyRental} onChange={setOwnerOnlyRental} />
            <TriStateQuestion label="Is rental income from this property important for the owner's monthly financial commitments?" value={ownerIncomeDependent} onChange={setOwnerIncomeDependent} />
            <TriStateQuestion label="Does the owner expect to keep this property available for rent for at least 12 months?" value={ownerCommitted12} onChange={setOwnerCommitted12} />
            <TriStateQuestion label="Does the owner want to make the final accept/reject/counter decision on tenant applications themselves?" value={ownerWantsControl} onChange={setOwnerWantsControl} />
            <div className="space-y-2">
              <TriStateQuestion label="Does the owner have a local representative who can coordinate access and communication?" value={ownerHasLocalRep} onChange={(v) => { setOwnerHasLocalRep(v); if (v !== true) { setOwnerRepName(""); setOwnerRepPhone(""); } }} />
              {ownerHasLocalRep === true && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-4 border-l-2 border-muted ml-2">
                  <Field label="Representative Name">
                    <Input value={ownerRepName} onChange={(e) => setOwnerRepName(e.target.value)} className="min-h-[44px]" />
                  </Field>
                  <Field label="Representative Phone">
                    <Input value={ownerRepPhone} onChange={(e) => setOwnerRepPhone(e.target.value)} className="min-h-[44px]" />
                  </Field>
                </div>
              )}
            </div>
            <TriStateQuestion label="Is the owner currently living in the same city as the property?" value={ownerLivesSameCity} onChange={setOwnerLivesSameCity} />
            <TriStateQuestion label="Does the owner prefer phone calls over WhatsApp/email for urgent decisions?" value={ownerPrefersPhone} onChange={setOwnerPrefersPhone} />
          </div>
        </div>

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

function TriStateQuestion({ label, value, onChange }: { label: string; value: boolean | null; onChange: (v: boolean | null) => void }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
      <p className="text-sm text-foreground flex-1">{label}</p>
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={() => onChange(null)}
          className={cn(
            "px-2.5 py-1 text-xs font-medium rounded-l-md border min-h-[32px] transition-colors",
            value === null ? "bg-muted text-foreground border-border" : "bg-background text-muted-foreground border-border hover:bg-muted/50"
          )}
        >
          —
        </button>
        <button
          type="button"
          onClick={() => onChange(true)}
          className={cn(
            "px-3 py-1 text-xs font-medium border-y border-r min-h-[32px] transition-colors",
            value === true ? "bg-primary/10 text-primary border-primary/30" : "bg-background text-muted-foreground border-border hover:bg-muted/50"
          )}
        >
          Yes
        </button>
        <button
          type="button"
          onClick={() => onChange(false)}
          className={cn(
            "px-3 py-1 text-xs font-medium rounded-r-md border-y border-r min-h-[32px] transition-colors",
            value === false ? "bg-destructive/10 text-destructive border-destructive/30" : "bg-background text-muted-foreground border-border hover:bg-muted/50"
          )}
        >
          No
        </button>
      </div>
    </div>
  );
}
