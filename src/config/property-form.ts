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
  { value: "bed", label: "Bed", hasSize: true, yesNoOnly: false },
  { value: "mattress", label: "Mattress", hasSize: true, yesNoOnly: false },
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

export const BUILDING_AMENITIES = [
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
  { value: "garden", label: "Garden" },
  { value: "sports_facility", label: "Sports Facility" },
  { value: "community_hall", label: "Community Hall" },
  { value: "water_supply_24hr", label: "24hr Water Supply" },
] as const;

export const PARKING_OPTIONS = [
  { value: "none", label: "None" },
  { value: "covered", label: "Covered" },
  { value: "uncovered", label: "Uncovered" },
  { value: "both", label: "Both" },
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

export type FurnishingDetailItem = {
  item: string;      // matches FURNISHING_ITEM_OPTIONS.value OR free-text custom label
  count?: number;
  size?: string;
  rooms?: string;
  custom?: boolean;  // true for owner-added items
};
