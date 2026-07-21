/**
 * Owner-form constants. Duplicated from admin/PropertyEdit.tsx per Prompt 3 —
 * admin form's local copies remain untouched. Both forms will read from here
 * in a later prompt when admin gets refactored.
 *
 * All values match DB enum / string conventions used by properties table.
 */

export const BHK_OPTIONS = [
  { value: "studio", label: "Studio" },
  { value: "1BHK", label: "1 BHK" },
  { value: "2BHK", label: "2 BHK" },
  { value: "3BHK", label: "3 BHK" },
  { value: "4BHK", label: "4 BHK" },
  { value: "5BHK_plus", label: "5 BHK+" },
] as const;

export const PROPERTY_TYPE_OPTIONS = [
  { value: "apartment", label: "Apartment" },
  { value: "villa", label: "Villa" },
  { value: "independent_house", label: "Independent House" },
] as const;

export const FURNISHING_OPTIONS = [
  { value: "unfurnished", label: "Unfurnished" },
  { value: "semi_furnished", label: "Semi Furnished" },
  { value: "fully_furnished", label: "Fully Furnished" },
] as const;

export const FURNISHING_ITEM_OPTIONS = [
  { value: "bed", label: "Bed", hasSizeText: true, yesNoOnly: false },
  { value: "mattress", label: "Mattress", hasSizeText: true, yesNoOnly: false },
  { value: "ac", label: "AC", hasRooms: true, yesNoOnly: false },
  { value: "wardrobe", label: "Wardrobe", yesNoOnly: false },
  { value: "geyser", label: "Geyser", yesNoOnly: false },
  { value: "fridge", label: "Fridge", yesNoOnly: true },
  { value: "washing_machine", label: "Washing Machine", yesNoOnly: true },
  { value: "tv", label: "TV", yesNoOnly: false },
  { value: "sofa", label: "Sofa", yesNoOnly: true },
  { value: "dining_table", label: "Dining Table", yesNoOnly: true },
  { value: "microwave", label: "Microwave", yesNoOnly: true },
  { value: "modular_kitchen", label: "Modular Kitchen", yesNoOnly: true },
  { value: "water_purifier", label: "Water Purifier / RO", yesNoOnly: true },
  { value: "curtain_rod", label: "Curtain Rods", yesNoOnly: false },
  { value: "stove", label: "Stove", yesNoOnly: true },
  { value: "chimney", label: "Chimney", yesNoOnly: true },
  { value: "fan", label: "Fan", yesNoOnly: false },
  { value: "exhaust_fan", label: "Exhaust Fan", yesNoOnly: false },
] as const;

// P5: `icon` is the Lucide icon *name* (string). Consumers map to component.
export const BUILDING_AMENITIES = [
  { value: "lift", label: "Lift", icon: "ArrowUpDown" },
  { value: "security_24hr", label: "24hr Security", icon: "ShieldCheck" },
  { value: "power_backup", label: "Power Backup", icon: "Battery" },
  { value: "gym", label: "Gym", icon: "Dumbbell" },
  { value: "swimming_pool", label: "Swimming Pool", icon: "Waves" },
  { value: "clubhouse", label: "Clubhouse", icon: "Building" },
  { value: "visitor_parking", label: "Visitor Parking", icon: "Car" },
  { value: "cctv", label: "CCTV", icon: "Camera" },
  { value: "children_play_area", label: "Children's Play Area", icon: "Gamepad2" },
  { value: "intercom", label: "Intercom", icon: "Phone" },
  { value: "park", label: "Park", icon: "Trees" },
  { value: "maintenance_staff", label: "Maintenance Staff", icon: "Wrench" },
  { value: "gated_access", label: "Gated Access", icon: "Lock" },
  { value: "garden", label: "Garden", icon: "Flower2" },
  { value: "sports_facility", label: "Sports Facility", icon: "Trophy" },
  { value: "community_hall", label: "Community Hall", icon: "Users" },
  { value: "water_supply_24hr", label: "24hr Water Supply", icon: "Droplets" },
  { value: "ev_charging", label: "EV Charging", icon: "Zap" }, // B2 (D-158): added Phase 1.5 Prompt 6
  { value: "garbage_collection", label: "Doorstep Garbage Collection", icon: "Trash2" },
] as const;

export const PARKING_OPTIONS = [
  { value: "none", label: "None" },
  { value: "covered", label: "Covered" },
  { value: "uncovered", label: "Uncovered" },
  { value: "both", label: "Both" },
] as const;

// P3: water_source multi-select options. Column is text[] on properties.
export const WATER_SOURCE_OPTIONS = [
  { value: "municipal", label: "Municipal / Corporation supply" },
  { value: "borewell", label: "Borewell" },
  { value: "tanker", label: "Water tanker" },
  { value: "rainwater_harvesting", label: "Rainwater harvesting" },
  { value: "packaged", label: "Packaged / RO water supply" },
  { value: "open_well", label: "Open well" },
] as const;

export const FACING_OPTIONS = [
  "North", "South", "East", "West",
  "North-East", "North-West", "South-East", "South-West",
] as const;

export const GAS_TYPE_OPTIONS = [
  { value: "pipeline", label: "Piped" },
  { value: "cylinder", label: "Cylinder" },
] as const;

export const PET_POLICY_OPTIONS = [
  { value: "not_allowed", label: "Not allowed" },
  { value: "small_only", label: "Small pets only" },
  { value: "all_welcome", label: "All pets welcome" },
  { value: "case_by_case", label: "Case by case" },
] as const;

export const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir",
  "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim",
  "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
] as const;

// D-170: FurnishingDetailItem moved to @/types/property (shared type).
// Re-exported here for backward compatibility with legacy imports.
export type { FurnishingDetailItem } from "@/types/property";
