/**
 * Focused tests for lister_flat_number validation behavior in ListProperty.
 *
 * Tests the three key integration behaviors:
 * 1. Pre-autosave guard: invalid value does not reach patch()
 * 2. Valid value does reach patch()
 * 3. Submit blocked when flat number is invalid; inline error + summary shown
 *
 * ListProperty has many dependencies; they are all mocked below.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ListProperty from "../ListProperty";

// ── Module mocks (vi.mock hoisted) ───────────────────────────────────────────

const patchSpy = vi.fn();
const saveNowSpy = vi.fn().mockResolvedValue(undefined);

vi.mock("@/hooks/useListingSave", () => ({
  useListingSave: () => ({
    patch: patchSpy,
    saveNow: saveNowSpy,
    saveState: "saved",
    lastError: null,
    failureTick: 0,
    hasPendingChanges: () => false,
    poisonedKeys: [],
    markSavedLive: vi.fn(),
    setSaveState: vi.fn(),
    flushNow: vi.fn(),
  }),
}));

vi.mock("@/hooks/useRequireAuth", () => ({
  useRequireAuth: () => ({
    user: {
      id: "test-user-id",
      role: "owner",
      email: "test@example.com",
      phone_verified: true,
      email_verified: true,
    },
    loading: false,
    isAuthenticated: true,
  }),
}));

vi.mock("posthog-js", () => ({
  default: { capture: vi.fn(), identify: vi.fn() },
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/components/VerificationGate", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/property-address/OwnerLocationPin", () => ({
  OwnerLocationPin: ({ onLocationConfirmed }: { onLocationConfirmed?: (s: unknown) => void }) => (
    <button
      data-testid="location-pin"
      onClick={() => onLocationConfirmed?.({ city: "bengaluru", locality: "hsr", lat: 12.9, lng: 77.6 })}
    >
      Location
    </button>
  ),
  isBuildingNameRequired: () => false,
}));

vi.mock("@/lib/location/isLocationReadyForSubmit", () => ({
  isBuildingNameRequired: () => false,
}));

vi.mock("@/components/property/FurnishingEditor", () => ({
  FurnishingEditor: () => <div data-testid="furnishing-editor" />,
}));

vi.mock("@/components/property/AmenitiesEditor", () => ({
  AmenitiesEditor: () => <div data-testid="amenities-editor" />,
}));

vi.mock("@/components/listing/PropertyPreview", () => ({
  default: () => null,
}));

vi.mock("@/components/property-management/RejectionPanel", () => ({
  default: () => null,
}));

vi.mock("@/components/property-management/StatusGuidance", () => ({
  default: () => null,
}));

// Mock validatePropertyFieldText to always return ok (no server validation needed)
vi.mock("@/lib/ownerTextValidation", () => ({
  OWNER_TEXT_MAX: 500,
  validatePropertyFieldText: vi.fn().mockResolvedValue({ ok: true }),
  validateYoutubeUrl: vi.fn().mockReturnValue({ ok: true }),
  YOUTUBE_MESSAGE: {},
}));

// Supabase client mock
const mockPropertyRow = {
  id: "prop-draft-1",
  status: "draft",
  user_id: "test-user-id",
  city: "bengaluru",
  locality: "hsr layout",
  building_name: "Test Building",
  listing_type: "rent",
  lister_role: "owner",
  lister_flat_number: null,
  bhk: "2bhk",
  property_type: "apartment",
  listed_rent: 25000,
  security_deposit_amount: null,
  security_deposit_months: null,
  furnishing: "semi_furnished",
  furnishing_detail: [],
  amenities: { building: [] },
  floor_number: null,
  total_floors: null,
  square_footage: null,
  super_built_up_area: null,
  facing: null,
  building_age_years: null,
  bathrooms: null,
  balconies: null,
  parking_2w: null,
  parking_4w: null,
  gas_type: null,
  pet_policy: null,
  building_rules: null,
  building_notes: null,
  parking_notes: null,
  youtube_walkthrough_url: null,
  rera_registration_number: null,
  available_from: null,
  notice_period_months: null,
  notice_period_days: null,
  lock_in_months: null,
  annual_rent_increase_pct: null,
  move_in_charges_amount: null,
  rent_brokerage_fixed_amount: null,
  society_maintenance_approx: null,
  maintenance_included_in_rent: false,
  utility_electricity_included: false,
  utility_water_included: false,
  utility_gas_included: false,
  zero_brokerage: false,
  price_negotiable: false,
  streetview_show_in_listing: false,
  streetview_available: null,
  streetview_pano_id: null,
  streetview_checked_at: null,
  location_verified_by_owner: true,
  location_verified_at: null,
  address_mode: "google_place",
  place_id: null,
  formatted_address: null,
  street_number: null,
  route: null,
  sublocality_1: null,
  sublocality_2: null,
  neighborhood: null,
  district: null,
  country: "India",
  plus_code: null,
  viewport_ne_lat: null,
  viewport_ne_lng: null,
  viewport_sw_lat: null,
  viewport_sw_lng: null,
  latitude: 12.9,
  longitude: 77.6,
  landmark: null,
  street_address: null,
  legal_owner_name: null,
  lister_flat_number_confirmed: null,
  expected_price_per_sqft: null,
  possession_status: null,
  khata_type: null,
  water_source: null,
  sale_brokerage_pct: null,
  is_active: false,
  title: null,
  description: null,
  google_maps_url: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mockImageRows: unknown[] = [];

vi.mock("@/integrations/supabase/client", () => {
  const chain = {
    select: () => chain,
    eq: () => chain,
    in: () => chain,
    order: () => chain,
    limit: () => chain,
    single: () => Promise.resolve({ data: mockPropertyRow, error: null }),
    maybeSingle: () => Promise.resolve({ data: mockPropertyRow, error: null }),
    then: (resolve: (v: unknown) => unknown) =>
      Promise.resolve({ data: mockImageRows, error: null }).then(resolve),
  };
  const rpcChain = { then: (resolve: (v: unknown) => unknown) => Promise.resolve({ data: null, error: null }).then(resolve) };
  return {
    supabase: {
      from: vi.fn(() => chain),
      rpc: vi.fn(() => rpcChain),
      channel: vi.fn(() => ({ on: vi.fn(() => ({ subscribe: vi.fn() })) })),
      auth: {
        onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
        getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
        signOut: vi.fn(() => Promise.resolve({ error: null })),
      },
    },
  };
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function renderListProperty() {
  const qc = makeQueryClient();
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={["/list/prop-draft-1"]}>
        <ListProperty />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("lister_flat_number autosave guard", () => {
  beforeEach(() => {
    patchSpy.mockClear();
    saveNowSpy.mockClear();
  });

  it("does NOT call patch() when the Flat / Unit value is invalid", async () => {
    const { container } = renderListProperty();

    const input = await waitFor(
      () => {
        const el = container.querySelector<HTMLInputElement>("#lister_flat_number-input");
        if (!el) throw new Error("flat number input not found");
        return el;
      },
      { timeout: 5000 },
    );

    // Type an invalid value (@ is not in the allowed character class)
    fireEvent.change(input, { target: { value: "12@A" } });

    // patch should not have been called for lister_flat_number
    const flatPatchCalls = patchSpy.mock.calls.filter(
      (call) => call[0] && "lister_flat_number" in call[0],
    );
    expect(flatPatchCalls).toHaveLength(0);

    // Inline error should be visible (use the error element id, not text match which also hits helper text)
    const errorEl = container.querySelector("#lister_flat_number-input-error");
    expect(errorEl).toBeInTheDocument();
    expect(errorEl?.textContent).toMatch(/letters.*numbers.*spaces/i);
  });

  it("calls patch() when the Flat / Unit value is valid", async () => {
    const { container } = renderListProperty();

    const input = await waitFor(
      () => {
        const el = container.querySelector<HTMLInputElement>("#lister_flat_number-input");
        if (!el) throw new Error("flat number input not found");
        return el;
      },
      { timeout: 5000 },
    );

    fireEvent.change(input, { target: { value: "A 603" } });

    const flatPatchCalls = patchSpy.mock.calls.filter(
      (call) => call[0] && "lister_flat_number" in call[0],
    );
    expect(flatPatchCalls).toHaveLength(1);
    expect(flatPatchCalls[0][0].lister_flat_number).toBe("A 603");
  });
});

describe("lister_flat_number inline error lifecycle", () => {
  beforeEach(() => {
    patchSpy.mockClear();
    saveNowSpy.mockClear();
  });

  // Note: the full submit flow (Required-sections gate) can't be exercised in a
  // unit test without complete geo + photo data. These tests verify inline error
  // visibility and error-clear behavior via the change/blur path instead.

  it("shows inline error on blur with invalid value and clears it on next valid change", async () => {
    const { container } = renderListProperty();

    const input = await waitFor(
      () => {
        const el = container.querySelector<HTMLInputElement>("#lister_flat_number-input");
        if (!el) throw new Error("flat number input not found");
        return el;
      },
      { timeout: 5000 },
    );

    // Type invalid then blur — error should appear via onBlur handler
    fireEvent.change(input, { target: { value: "A@603" } });
    fireEvent.blur(input);

    await waitFor(() => {
      const errorEl = container.querySelector("#lister_flat_number-input-error");
      expect(errorEl).toBeInTheDocument();
      expect(errorEl?.textContent).toMatch(/letters.*numbers.*spaces/i);
    });

    // Now fix the value — error should disappear (cleared by updateField's textErrors reset)
    fireEvent.change(input, { target: { value: "A 603" } });

    await waitFor(() => {
      expect(container.querySelector("#lister_flat_number-input-error")).not.toBeInTheDocument();
    });
  });

  it("input has aria-invalid=true when error is present, removed when cleared", async () => {
    const { container } = renderListProperty();

    const input = await waitFor(
      () => {
        const el = container.querySelector<HTMLInputElement>("#lister_flat_number-input");
        if (!el) throw new Error("flat number input not found");
        return el;
      },
      { timeout: 5000 },
    );

    // No error initially
    expect(input.getAttribute("aria-invalid")).toBeNull();

    // Trigger error via blur
    fireEvent.change(input, { target: { value: "A@603" } });
    fireEvent.blur(input);

    await waitFor(() => {
      expect(input.getAttribute("aria-invalid")).toBe("true");
    });

    // Fix → aria-invalid removed
    fireEvent.change(input, { target: { value: "A 603" } });

    await waitFor(() => {
      expect(input.getAttribute("aria-invalid")).toBeNull();
    });
  });
});
