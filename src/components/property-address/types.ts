export interface AddressData {
  // Google Places
  place_id: string | null;
  formatted_address: string | null;
  building_name: string | null;
  street_number: string | null;
  route: string | null;
  street_address: string | null;
  sublocality_1: string | null;
  sublocality_2: string | null;
  neighborhood: string | null;
  locality: string | null;
  city: string | null;
  district: string | null;
  state: string | null;
  country: string | null;
  pincode: string | null;
  plus_code: string | null;
  latitude: number | null;
  longitude: number | null;
  viewport_ne_lat: number | null;
  viewport_ne_lng: number | null;
  viewport_sw_lat: number | null;
  viewport_sw_lng: number | null;
  address_mode: 'google_place' | 'manual';
  // Street View
  streetview_available: boolean;
  streetview_pano_id: string | null;
  streetview_checked_at: string | null;
  streetview_show_in_listing: boolean;
  // Location verification
  location_verified_by_owner: boolean;
  location_verified_at: string | null;
  // Flat number
  lister_flat_number: string | null;
}

export interface PropertyAddressInputProps {
  mode: 'owner' | 'admin';
  initialData?: Partial<AddressData>;
  onAddressResolved: (data: AddressData) => void;
  canRecheck: boolean;
}
