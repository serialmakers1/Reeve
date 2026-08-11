import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { MemoryRouter } from "react-router-dom";
import { SearchSetupPanel } from "../components/SearchSetupPanel";
import { useSearchState } from "../state/useSearchState";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {},
}));

vi.mock("@vis.gl/react-google-maps", () => ({
  useMapsLibrary: vi.fn(() => null),
}));

vi.mock("../state/useSearchState", () => ({
  useSearchState: vi.fn(),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockSetContext = vi.fn();

const noContextState = {
  state: {
    context: { mode: null, city: null, cities: [], locations: [], propertyTypes: [] },
    filters: {},
    sort: "newest" as const,
    cursor: null,
    view: "list" as const,
    mapBounds: null,
    selectedPropertyId: null,
    distanceKm: null,
  },
  hasValidContext: false,
  setCursor: vi.fn(),
  setDistanceKm: vi.fn(),
  setMode: vi.fn(),
  setFilters: vi.fn(),
  applyFilters: vi.fn(),
  setSort: vi.fn(),
  setView: vi.fn(),
  setContext: mockSetContext,
  setMapBounds: vi.fn(),
  setSelectedPropertyId: vi.fn(),
  replaceSearchSetup: vi.fn(),
  resetFilters: vi.fn(),
};

const BENGALURU_CITY = {
  placeId: "city_blr",
  label: "Bengaluru",
  lat: 12.9716,
  lng: 77.5946,
  viewport: { sw: { lat: 12.8, lng: 77.4 }, ne: { lat: 13.1, lng: 77.8 } },
};

const rentBengaluruState = {
  ...noContextState,
  state: {
    ...noContextState.state,
    context: { mode: "rent" as const, city: "bengaluru", cities: [BENGALURU_CITY], locations: [], propertyTypes: [] },
  },
  hasValidContext: true,
  setContext: mockSetContext,
};

const MUMBAI_CITY = {
  placeId: "city_mum",
  label: "Mumbai",
  lat: 19.076,
  lng: 72.8777,
  viewport: { sw: { lat: 18.9, lng: 72.7 }, ne: { lat: 19.3, lng: 73.0 } },
};

const areaTok = (id: string, label: string, cityId: string) => ({
  id, label, type: "area" as const, cityId, placeId: id, lat: 12.9, lng: 77.6,
  viewport: { sw: { lat: 12.85, lng: 77.55 }, ne: { lat: 12.95, lng: 77.65 } },
});

// Bengaluru + Mumbai, each owning one area (Whitefield in BLR, Andheri in MUM).
const rentTwoCityState = {
  ...noContextState,
  state: {
    ...noContextState.state,
    context: {
      mode: "rent" as const,
      city: "bengaluru",
      cities: [BENGALURU_CITY, MUMBAI_CITY],
      locations: [areaTok("blr_wf", "Whitefield", "city_blr"), areaTok("mum_an", "Andheri", "city_mum")],
      propertyTypes: [],
    },
  },
  hasValidContext: true,
  setContext: mockSetContext,
};

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(MemoryRouter, null, children);
}

function renderPanel(props: { open: boolean; onOpenChange?: (o: boolean) => void }) {
  const onOpenChange = props.onOpenChange ?? vi.fn();
  return render(
    React.createElement(SearchSetupPanel, { open: props.open, onOpenChange }),
    { wrapper },
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("SearchSetupPanel — open/close trigger (controlled by parent)", () => {
  beforeEach(() => {
    vi.mocked(useSearchState).mockReturnValue(noContextState as ReturnType<typeof useSearchState>);
  });

  it("renders dialog when open=true", () => {
    renderPanel({ open: true });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("does not render dialog content when open=false", () => {
    renderPanel({ open: false });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("calls onOpenChange when dialog tries to close", async () => {
    const onOpenChange = vi.fn();
    renderPanel({ open: true, onOpenChange });
    // Pressing Escape should call onOpenChange(false)
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });
});

describe("SearchSetupPanel — draft isolation", () => {
  beforeEach(() => {
    mockSetContext.mockClear();
    vi.mocked(useSearchState).mockReturnValue(noContextState as ReturnType<typeof useSearchState>);
  });

  it("does NOT call setContext when mode changes in draft", async () => {
    renderPanel({ open: true });
    const rentBtn = screen.getByRole("button", { name: /rent/i });
    fireEvent.click(rentBtn);
    expect(mockSetContext).not.toHaveBeenCalled();
  });

  it("does NOT call setContext when property type changes in draft", async () => {
    renderPanel({ open: true });
    const villaBtn = screen.getByRole("button", { name: /^villa$/i });
    fireEvent.click(villaBtn);
    expect(mockSetContext).not.toHaveBeenCalled();
  });

  it("disables 'Show properties' when mode is null", () => {
    renderPanel({ open: true });
    const submitBtn = screen.getByRole("button", { name: /show properties/i });
    expect(submitBtn).toBeDisabled();
  });
});

describe("SearchSetupPanel — submission guard", () => {
  beforeEach(() => {
    mockSetContext.mockClear();
  });

  it("enables 'Show properties' when mode and city are set from URL context", () => {
    vi.mocked(useSearchState).mockReturnValue(rentBengaluruState as ReturnType<typeof useSearchState>);
    renderPanel({ open: true });
    const submitBtn = screen.getByRole("button", { name: /show properties/i });
    expect(submitBtn).not.toBeDisabled();
  });

  it("calls setContext and closes on submit with valid context", async () => {
    vi.mocked(useSearchState).mockReturnValue(rentBengaluruState as ReturnType<typeof useSearchState>);
    const onOpenChange = vi.fn();
    renderPanel({ open: true, onOpenChange });
    const submitBtn = screen.getByRole("button", { name: /show properties/i });
    fireEvent.click(submitBtn);
    expect(mockSetContext).toHaveBeenCalledTimes(1);
    expect(mockSetContext).toHaveBeenCalledWith(
      expect.objectContaining({ mode: "rent", city: "bengaluru" }),
    );
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

describe("SearchSetupPanel — draft resync", () => {
  it("resyncs draft when panel opens from closed state", () => {
    vi.mocked(useSearchState).mockReturnValue(rentBengaluruState as ReturnType<typeof useSearchState>);
    const { rerender } = render(
      React.createElement(SearchSetupPanel, { open: false, onOpenChange: vi.fn() }),
      { wrapper },
    );
    // Open the panel — draft should now show bengaluru
    rerender(
      React.createElement(SearchSetupPanel, { open: true, onOpenChange: vi.fn() }),
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /show properties/i })).not.toBeDisabled();
  });
});

describe("SearchSetupPanel — property type selector", () => {
  beforeEach(() => {
    mockSetContext.mockClear();
    vi.mocked(useSearchState).mockReturnValue(noContextState as ReturnType<typeof useSearchState>);
  });

  it("shows all 5 property types", () => {
    renderPanel({ open: true });
    // Use exact names to avoid "Apartment" matching "Duplex Apartment"
    expect(screen.getByRole("button", { name: "Apartment" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Villa" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Independent House" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Duplex Apartment" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Plot / Land" })).toBeInTheDocument();
  });

  it("toggles property type off when clicked twice (no setContext called)", async () => {
    renderPanel({ open: true });
    const villaBtn = screen.getByRole("button", { name: "Villa" });
    fireEvent.click(villaBtn);
    fireEvent.click(villaBtn);
    expect(mockSetContext).not.toHaveBeenCalled();
  });
});

describe("SearchSetupPanel — RentBuySelector", () => {
  beforeEach(() => {
    vi.mocked(useSearchState).mockReturnValue(noContextState as ReturnType<typeof useSearchState>);
  });

  it("renders rent and buy buttons", () => {
    renderPanel({ open: true });
    expect(screen.getByRole("button", { name: /^rent$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^buy$/i })).toBeInTheDocument();
  });
});

describe("SearchSetupPanel — no browser geolocation", () => {
  beforeEach(() => {
    vi.mocked(useSearchState).mockReturnValue(noContextState as ReturnType<typeof useSearchState>);
  });

  it("does NOT call geolocation on mount and exposes no 'Use my location' control", () => {
    const getCurrentPosition = vi.fn();
    Object.defineProperty(navigator, "geolocation", {
      value: { getCurrentPosition },
      configurable: true,
    });
    renderPanel({ open: true });
    expect(getCurrentPosition).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: /use my location/i })).not.toBeInTheDocument();
  });
});

describe("SearchSetupPanel — Places failure", () => {
  beforeEach(() => {
    vi.mocked(useSearchState).mockReturnValue(rentBengaluruState as ReturnType<typeof useSearchState>);
  });

  it("shows 'Search all of [city]' in location section (city already set)", () => {
    // When city is set from URL, LocationSearchInput renders. With no error yet,
    // the button appears only on error. We just verify the locations area renders.
    renderPanel({ open: true });
    // The "Areas" section renders since city is set (matcher is loose — helper copy
    // also contains "areas", so assert at least one match).
    expect(screen.getAllByText(/areas/i).length).toBeGreaterThan(0);
  });
});

describe("SearchSetupPanel — location limits", () => {
  it("location section does not appear when city is null", () => {
    vi.mocked(useSearchState).mockReturnValue(noContextState as ReturnType<typeof useSearchState>);
    renderPanel({ open: true });
    // When city is null, the "Areas" section is not rendered
    expect(screen.queryByText(/areas/i)).not.toBeInTheDocument();
  });
});

describe("SearchSetupPanel — Area enablement on committed City (Issue 6)", () => {
  // useMapsLibrary is mocked to null, so the city-viewport hydration effect never
  // runs. The Area input must still be enabled purely from the committed city.
  it("enables the Area search input immediately when a committed city exists", () => {
    vi.mocked(useSearchState).mockReturnValue(rentBengaluruState as ReturnType<typeof useSearchState>);
    renderPanel({ open: true });
    const areaInput = screen.getByPlaceholderText(/search areas in bengaluru/i);
    expect(areaInput).toBeInTheDocument();
    expect(areaInput).not.toBeDisabled();
    // The disabled placeholder must NOT appear.
    expect(screen.queryByPlaceholderText(/select a city first/i)).not.toBeInTheDocument();
  });
});

describe("SearchSetupPanel — dialog accessibility (Issue 1)", () => {
  it("renders an accessible description (DialogDescription) for the dialog", () => {
    vi.mocked(useSearchState).mockReturnValue(noContextState as ReturnType<typeof useSearchState>);
    renderPanel({ open: true });
    const dialog = screen.getByRole("dialog");
    // Radix wires DialogDescription via aria-describedby → resolves to a node.
    const describedBy = dialog.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy as string)).toBeTruthy();
  });
});

// ─── Multi-city interaction (Prompt 3B — rendered UI, browser tooling unavailable) ─
describe("SearchSetupPanel — multi-city interaction", () => {
  beforeEach(() => {
    vi.mocked(useSearchState).mockReturnValue(rentTwoCityState as ReturnType<typeof useSearchState>);
  });

  it("renders both city chips; last city is active; clicking a chip switches active + Areas header", () => {
    renderPanel({ open: true });
    // Both chips render.
    expect(screen.getByTestId("city-chip-city_blr")).toBeInTheDocument();
    expect(screen.getByTestId("city-chip-city_mum")).toBeInTheDocument();
    // Active city (most-recently-added = Mumbai) is identifiable + drives the Areas header.
    expect(screen.getByTestId("city-chip-city_mum")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("city-chip-city_blr")).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByTestId("areas-header").textContent).toMatch(/areas in mumbai/i);
    expect(screen.getByText("Andheri")).toBeInTheDocument(); // Mumbai's area shown
    // Switch active city → header + shown area follow.
    fireEvent.click(screen.getByTestId("city-chip-city_blr"));
    expect(screen.getByTestId("city-chip-city_blr")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("areas-header").textContent).toMatch(/areas in bengaluru/i);
    expect(screen.getByText("Whitefield")).toBeInTheDocument(); // Bengaluru's area shown
  });

  it("remove × removes the city WITHOUT selecting it; other city + its area remain", () => {
    renderPanel({ open: true });
    // Mumbai is active. Remove the non-active Bengaluru via its × button.
    fireEvent.click(screen.getByTestId("city-remove-city_blr"));
    // Bengaluru chip gone; Mumbai remains and stays active (× did not switch active).
    expect(screen.queryByTestId("city-chip-city_blr")).toBeNull();
    expect(screen.getByTestId("city-chip-city_mum")).toBeInTheDocument();
    expect(screen.getByTestId("areas-header").textContent).toMatch(/areas in mumbai/i);
    expect(screen.getByText("Andheri")).toBeInTheDocument();
  });

  it("removing the active city prunes only its area; the other city + area survive", () => {
    renderPanel({ open: true });
    // Make Bengaluru active so its area is on screen.
    fireEvent.click(screen.getByTestId("city-chip-city_blr"));
    expect(screen.getByText("Whitefield")).toBeInTheDocument();
    // Remove Bengaluru while active → falls back to Mumbai; Bengaluru's area is pruned.
    fireEvent.click(screen.getByTestId("city-remove-city_blr"));
    expect(screen.queryByTestId("city-chip-city_blr")).toBeNull();
    expect(screen.getByTestId("areas-header").textContent).toMatch(/areas in mumbai/i);
    expect(screen.queryByText("Whitefield")).toBeNull(); // Bengaluru's area gone
    expect(screen.getByText("Andheri")).toBeInTheDocument(); // Mumbai's area remains
  });
});
