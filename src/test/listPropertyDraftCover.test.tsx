/**
 * Cover-selection path coverage for ListProperty (Phase 1 cleanup).
 *
 * Non-live statuses (draft / changes_requested) must set the cover via a DIRECT
 * `property_images.is_primary` flip and must NOT call the `set_primary_property_photo`
 * RPC (which the backend intentionally rejects off-live — the old code relied on that
 * guaranteed 400 as control flow). Live statuses (listed / edit_pending_review) must
 * still use the RPC. The negative RPC assertion guards against reintroducing the 400.
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

// Header/BottomNav (rendered via Layout) call the real useAuth, which now throws
// outside AuthProvider. Auth is irrelevant to these tests → mock it anonymous.
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    session: null, user: null, isLoading: false, isAuthenticated: false,
    isFullyVerified: false, signOut: vi.fn(), refreshUser: vi.fn(),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@/hooks/useRequireAuth", () => ({
  useRequireAuth: () => ({
    user: { id: "owner-1" },
    session: { access_token: "t" },
    loading: false,
    isAuthenticated: true,
    signOut: vi.fn(),
    refreshUser: vi.fn(),
  }),
}));

vi.mock("@/hooks/useListingSave", () => ({
  useListingSave: () => ({
    saveState: "saved",
    patch: vi.fn(),
    saveNow: vi.fn().mockResolvedValue(undefined),
    lastError: null,
    failureTick: 0,
    hasPendingChanges: () => false,
    poisonedKeys: [],
  }),
}));

vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/lib/photo", () => ({ processPhotoForUpload: vi.fn() }));
vi.mock("@/components/VerificationGate", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

let currentProp: Record<string, unknown> = {};
const IMAGE_ROW = {
  id: "img-1",
  url: "http://example.test/img.jpg",
  is_primary: false,
  is_floor_plan: false,
  section: "Bedroom",
  sort_order: 0,
};

const updateMock = vi.fn();
const rpcMock = vi.fn((...a: unknown[]) => {
  const name = a[0] as string | undefined;
  if (name === "get_owner_property" || name === "get_owner_property_list") {
    return Promise.resolve({ data: [currentProp], error: null });
  }
  return Promise.resolve({ data: null, error: null });
});

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
      if (table === "property_images") return makeChain({ data: [IMAGE_ROW], error: null });
      if (table === "properties") return makeChain({ data: currentProp, error: null });
      return makeChain({ data: null, error: null });
    },
    rpc: (...args: unknown[]) => rpcMock(...args),
    auth: {
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }),
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
    },
  },
}));

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
  };
}

async function renderAndOpenPhotos(status: string) {
  currentProp = propertyRow(status);
  updateMock.mockClear();
  rpcMock.mockClear();
  render(
    <MemoryRouter initialEntries={["/list/prop-1"]}>
      <ListProperty />
    </MemoryRouter>,
  );
  // "← Back to property" only renders once entryStatus is applied (not "loading").
  await screen.findByText("← Back to property");
  fireEvent.click(await screen.findByText("Photos"));
  return screen.findByRole("button", { name: "★ Cover" });
}

describe.each([["draft"], ["changes_requested"]])(
  "ListProperty cover selection — non-live status %s",
  (status) => {
    beforeEach(() => {
      currentProp = propertyRow(status);
    });

    it("uses a direct is_primary flip and never calls set_primary_property_photo", async () => {
      const coverBtn = await renderAndOpenPhotos(status);
      fireEvent.click(coverBtn);

      await waitFor(() => expect(updateMock).toHaveBeenCalledWith({ is_primary: true }));
      expect(updateMock).toHaveBeenCalledWith({ is_primary: false });
      expect(rpcMock).not.toHaveBeenCalledWith("set_primary_property_photo", expect.anything());
    });
  },
);

describe.each([["listed"], ["edit_pending_review"]])(
  "ListProperty cover selection — live status %s",
  (status) => {
    beforeEach(() => {
      currentProp = propertyRow(status);
    });

    it("routes the cover change through the set_primary_property_photo RPC", async () => {
      const coverBtn = await renderAndOpenPhotos(status);
      fireEvent.click(coverBtn);

      await waitFor(() =>
        expect(rpcMock).toHaveBeenCalledWith("set_primary_property_photo", { p_image_id: "img-1" }),
      );
    });
  },
);
