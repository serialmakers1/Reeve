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

const toastMock = vi.fn();
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: toastMock }) }));
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
// Observable status-write + edit-request spies (Part C submit-gate assertions).
const updateMock = vi.fn();
const rpcMock = vi.fn().mockResolvedValue({ data: "new-edit-id", error: null });
function makeChain(result: unknown) {
  const chain: Record<string, unknown> = {};
  for (const m of ["select", "eq", "order", "in", "is", "limit"]) {
    chain[m] = () => chain;
  }
  chain.update = (...args: unknown[]) => {
    updateMock(...args);
    return chain;
  };
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
    rpc: (...args: unknown[]) => rpcMock(...args),
    auth: {
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }),
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
    },
  },
}));

// jsdom has no scrollIntoView; the submit gate calls it after opening a section.
Element.prototype.scrollIntoView = vi.fn();

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

// ── Part C: Submit is blocked while a genuine invalid custom draft is visible ──
// The invalid draft is buffered inside EditableCustomName and never reaches
// patch/saveNow, so the gate must fire BEFORE any save / status write / edit RPC.
// "Submission proceeds after correction" is asserted via saveNow being reached
// (the gate sits immediately above `await saveNow()`), which holds for BOTH paths
// without requiring a fully-complete property row.
describe.each([
  ["Path A (draft / direct patch)", "draft"],
  ["Path B (listed / edit request)", "listed"],
])("ListProperty submit-gate on invalid custom draft — %s", (_label, status) => {
  beforeEach(() => {
    currentProp = propertyRow(status);
    patchMock.mockReset();
    saveNowMock.mockClear();
    toastMock.mockClear();
    updateMock.mockClear();
    rpcMock.mockClear();
  });

  it("blocks Submit while invalid, runs no side effects, then proceeds after correction", async () => {
    render(
      <MemoryRouter initialEntries={["/list/prop-1"]}>
        <ListProperty />
      </MemoryRouter>,
    );

    await screen.findByText("Where is your property?");
    await openSection("What's inside the home?");

    // Make one valid committed change (Bathrooms) so Path B's edit-request button is
    // enabled — Path B accumulates field_changes only via updateField, and the custom
    // editors route through patch(). Path A's button is always enabled. This isolates
    // the invalid-draft gate as the reason submission is blocked below.
    fireEvent.change(screen.getAllByRole("spinbutton")[0], { target: { value: "3" } });

    const customInput = await screen.findByDisplayValue("Legacy Sofa Custom");
    // Make the existing custom row invalid (4 words → TOO_LONG) and leave it visible.
    fireEvent.change(customInput, { target: { value: "one two three four" } });

    const submitBtn = screen.getByRole("button", { name: /Submit for review/i });
    expect(submitBtn).not.toBeDisabled();
    fireEvent.click(submitBtn);

    // Gate fired: a toast appeared and NO save/side-effect ran.
    await waitFor(() => expect(toastMock).toHaveBeenCalled());
    expect(saveNowMock).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
    expect(rpcMock).not.toHaveBeenCalledWith(
      "submit_property_edit_request",
      expect.anything(),
    );
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: expect.stringMatching(/custom item/i) }),
    );

    // Correct the draft → the invalid-draft gate passes → saveNow is reached.
    fireEvent.change(customInput, { target: { value: "Corner Desk" } });
    fireEvent.click(submitBtn);
    await waitFor(() => expect(saveNowMock).toHaveBeenCalled());
  });
});
