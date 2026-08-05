/**
 * Existing-listing edit-flow coverage for owner text/custom-item restrictions.
 *
 * Mounts ListProperty in edit mode with an already-submitted property loaded, for
 * BOTH edit paths — Path A (draft = direct patch) and Path B (listed = edit-request
 * RPC) — and asserts the owner-only restrictions are wired in each: the custom-item
 * editors render in limited mode (staging "Add" + "N of 5 custom items added"),
 * legacy custom rows stay editable, and the public-text fields expose live
 * character counters. The fine-grained blur/duplicate/limit/final-submit behaviour
 * is covered by ownerTextValidation.test.ts + jsonb-editors.test.tsx.
 */
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useParams: () => ({ id: "prop-1" }),
    useSearchParams: () => [new URLSearchParams(), vi.fn()],
  };
});

vi.mock("@/hooks/useRequireAuth", () => ({
  useRequireAuth: () => ({
    user: { id: "owner-1" },
    session: {},
    loading: false,
    isAuthenticated: true,
    signOut: vi.fn(),
    refreshUser: vi.fn(),
  }),
}));

const patchMock = vi.fn();
const saveNowMock = vi.fn().mockResolvedValue(undefined);
vi.mock("@/hooks/useListingSave", () => ({
  useListingSave: () => ({
    saveState: "saved",
    patch: patchMock,
    saveNow: saveNowMock,
    lastError: null,
    failureTick: 0,
    hasPendingChanges: () => false,
    poisonedKeys: [],
  }),
}));

vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
// Avoids pulling the optional `browser-image-compression` dep into the test graph.
vi.mock("@/lib/photo", () => ({ processPhotoForUpload: vi.fn() }));
vi.mock("posthog-js", () => ({ default: { capture: vi.fn() } }));
vi.mock("@/components/property-address", () => ({
  PropertyAddressInput: () => <div data-testid="address-input" />,
}));
// Owner is already verified in these flows; bypass the gate's auth dependency.
vi.mock("@/components/VerificationGate", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Configurable current property row.
let currentProp: Record<string, unknown> = {};
function makeChain(result: unknown) {
  const chain: Record<string, unknown> = {};
  for (const m of ["select", "eq", "order", "in", "is", "limit"]) {
    chain[m] = () => chain;
  }
  chain.maybeSingle = () => Promise.resolve(result);
  chain.single = () => Promise.resolve(result);
  chain.then = (res: (v: unknown) => unknown) => Promise.resolve(result).then(res);
  return chain;
}
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => {
      if (table === "properties") return makeChain({ data: currentProp, error: null });
      if (table === "property_images") return makeChain({ data: [], error: null });
      return makeChain({ data: null, error: null });
    },
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    auth: {
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }),
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
    },
  },
}));

import ListProperty from "@/pages/ListProperty";
import { MemoryRouter } from "react-router-dom";

function propertyRow(status: string): Record<string, unknown> {
  return {
    id: "prop-1",
    owner_id: "owner-1",
    status,
    listing_type: "rent",
    building_name: "Test Towers",
    city: "Bengaluru",
    bhk: "2",
    property_type: "apartment",
    parking_notes: "Shared visitor slots",
    building_rules: "No smoking",
    building_notes: "Gated society near the metro",
    furnishing_detail: [{ item: "Legacy Sofa Custom", custom: true, count: 1 }],
    amenities: { building: ["Legacy Amenity Custom"], furnishing_items: [] },
  };
}

async function openSection(title: string) {
  fireEvent.click(await screen.findByText(title));
}

describe.each([
  ["Path A (draft / direct patch)", "draft"],
  ["Path B (listed / edit request)", "listed"],
])("ListProperty owner restrictions on an existing listing — %s", (_label, status) => {
  beforeEach(() => {
    currentProp = propertyRow(status);
    patchMock.mockReset();
    saveNowMock.mockClear();
  });

  it("renders custom-item limits + text counters for the loaded listing", async () => {
    render(
      <MemoryRouter initialEntries={["/list/prop-1"]}>
        <ListProperty />
      </MemoryRouter>,
    );

    // Wait for the property to load (section 1 header present).
    await screen.findByText("Where is your property?");

    // Furniture section — owner-limited editor: legacy custom editable + usage counter.
    await openSection("What's inside the home?");
    expect(await screen.findByDisplayValue("Legacy Sofa Custom")).toBeInTheDocument();
    expect(screen.getByText("1 of 5 custom items added")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();

    // Amenities section — same owner-limited treatment.
    await openSection("Building & Society");
    expect(await screen.findByDisplayValue("Legacy Amenity Custom")).toBeInTheDocument();
    expect(screen.getByText("1 of 5 custom items added")).toBeInTheDocument();

    // Rules section — House Rules + About Property text counters (owner caps).
    await openSection("Rules & preferences");
    expect(await screen.findByText(/\/ 200$/)).toBeInTheDocument(); // House rules 200
    expect(screen.getByText(/\/ 300$/)).toBeInTheDocument(); // About property 300
  });
});
