import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { SearchFilterPanel } from "../components/SearchFilterPanel";
import { countActiveFilters } from "../state/filterUtils";
import { parseSearchUrl } from "../state/parseSearchUrl";
import { serializeSearchState } from "../state/serializeSearchState";
import { getDefaultSearchState } from "../domain/searchDefaults";
import type { RentFilters, BuyFilters } from "../domain/searchTypes";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const setFiltersSpy = vi.fn();
const setSortSpy = vi.fn();
const resetFiltersSpy = vi.fn();

const defaultMockState = {
  context: { mode: "rent" as const, city: "bengaluru", locations: [], propertyType: null },
  filters: {} as RentFilters,
  sort: "newest" as const,
  view: "list" as const,
  cursor: null,
  mapBounds: null,
  selectedPropertyId: null,
};

let mockState = { ...defaultMockState };

vi.mock("@/features/search/state/useSearchState", () => ({
  useSearchState: vi.fn(() => ({
    state: mockState,
    setFilters: setFiltersSpy,
    setSort: setSortSpy,
    resetFilters: resetFiltersSpy,
    hasValidContext: true,
  })),
}));

import { useSearchState } from "@/features/search/state/useSearchState";

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderPanel(open = true, mode: "rent" | "buy" = "rent") {
  mockState = {
    ...defaultMockState,
    context: { ...defaultMockState.context, mode },
  };
  vi.mocked(useSearchState).mockReturnValue({
    state: mockState,
    setFilters: setFiltersSpy,
    setSort: setSortSpy,
    resetFilters: resetFiltersSpy,
    hasValidContext: true,
  });
  return render(
    <MemoryRouter>
      <SearchFilterPanel open={open} onOpenChange={vi.fn()} />
    </MemoryRouter>,
  );
}

// Advanced filter sections live behind the "More filters" disclosure.
function openMore() {
  fireEvent.click(screen.getByRole("button", { name: /more filters/i }));
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  setFiltersSpy.mockClear();
  setSortSpy.mockClear();
  resetFiltersSpy.mockClear();
  mockState = { ...defaultMockState };
});

describe("draft state", () => {
  it("does NOT call setFilters when a BHK chip is toggled in draft", () => {
    renderPanel();
    const chip2BHK = screen.getByText("2 BHK");
    fireEvent.click(chip2BHK);
    expect(setFiltersSpy).not.toHaveBeenCalled();
  });

  it("does NOT call setSort when sort is changed in draft", () => {
    renderPanel();
    const priceAsc = screen.getByText("Price ↑");
    fireEvent.click(priceAsc);
    expect(setSortSpy).not.toHaveBeenCalled();
  });
});

describe("Apply", () => {
  it("calls setFilters on Apply", () => {
    renderPanel();
    const applyBtn = screen.getByRole("button", { name: "Show properties" });
    fireEvent.click(applyBtn);
    expect(setFiltersSpy).toHaveBeenCalledTimes(1);
  });

  it("calls setSort on Apply", () => {
    renderPanel();
    const applyBtn = screen.getByRole("button", { name: "Show properties" });
    fireEvent.click(applyBtn);
    expect(setSortSpy).toHaveBeenCalledTimes(1);
  });

  it("closes panel after Apply", () => {
    const onOpenChange = vi.fn();
    render(
      <MemoryRouter>
        <SearchFilterPanel open onOpenChange={onOpenChange} />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Show properties" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

describe("Reset", () => {
  it("does NOT call setFilters or resetFilters on Reset (draft-only)", () => {
    renderPanel();
    const resetBtn = screen.getByRole("button", { name: "Reset" });
    fireEvent.click(resetBtn);
    expect(setFiltersSpy).not.toHaveBeenCalled();
    expect(resetFiltersSpy).not.toHaveBeenCalled();
  });

  it("does NOT close panel after Reset", () => {
    const onOpenChange = vi.fn();
    render(
      <MemoryRouter>
        <SearchFilterPanel open onOpenChange={onOpenChange} />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(onOpenChange).not.toHaveBeenCalled();
  });
});

describe("Rent/Buy visibility", () => {
  it("shows Brokerage section in rent", () => {
    renderPanel(true, "rent");
    openMore();
    expect(screen.getByText("Brokerage")).toBeTruthy();
  });

  it("shows Pets section in rent, not in buy", () => {
    renderPanel(true, "rent");
    openMore();
    expect(screen.getByText("Pets")).toBeTruthy();
  });

  it("shows Possession section in buy", () => {
    renderPanel(true, "buy");
    openMore();
    expect(screen.getByText("Possession")).toBeTruthy();
  });

  it("does NOT show Possession section in rent", () => {
    renderPanel(true, "rent");
    expect(screen.queryByText("Possession")).toBeNull();
  });

  it("shows Furnishing in both rent and buy", () => {
    const { unmount } = renderPanel(true, "rent");
    expect(screen.getByText("Furnishing")).toBeTruthy();
    unmount();
    renderPanel(true, "buy");
    expect(screen.getByText("Furnishing")).toBeTruthy();
  });

  it("shows 'Availability Confirmed' section in rent (under More filters)", () => {
    renderPanel(true, "rent");
    openMore();
    expect(screen.getByText("Availability Confirmed")).toBeTruthy();
    expect(screen.getByText("Within 7d")).toBeTruthy();
  });

  it("does NOT show 'Availability Confirmed' in buy", () => {
    renderPanel(true, "buy");
    expect(screen.queryByText("Availability Confirmed")).toBeNull();
  });
});

describe("Sort", () => {
  it("shows Newest, Price ↑, Price ↓ options", () => {
    renderPanel();
    expect(screen.getByText("Newest")).toBeTruthy();
    expect(screen.getByText("Price ↑")).toBeTruthy();
    expect(screen.getByText("Price ↓")).toBeTruthy();
  });

  it("does NOT show Availability Confirmed sort option", () => {
    renderPanel();
    expect(screen.queryByText("Availability")).toBeNull();
    expect(screen.queryByText(/availability_confirmed/i)).toBeNull();
  });
});

describe("URL round-trip — via parseSearchUrl / serializeSearchState", () => {
  it("round-trips BHK multi-select: ['2BHK', '3BHK']", () => {
    const base = getDefaultSearchState("rent");
    const state = {
      ...base,
      context: { ...base.context, city: "bengaluru" },
      filters: { bhk: ["2BHK", "3BHK"] } as RentFilters,
    };
    const params = serializeSearchState(state);
    const parsed = parseSearchUrl(params);
    expect((parsed.filters as RentFilters).bhk).toEqual(["2BHK", "3BHK"]);
  });

  it("round-trips zeroRentBrokerage: true → 'zero_brok=1' → parse → true", () => {
    const base = getDefaultSearchState("rent");
    const state = {
      ...base,
      context: { ...base.context, city: "bengaluru" },
      filters: { zeroRentBrokerage: true } as RentFilters,
    };
    const params = serializeSearchState(state);
    expect(params.get("zero_brok")).toBe("1");
    const parsed = parseSearchUrl(params);
    expect((parsed.filters as RentFilters).zeroRentBrokerage).toBe(true);
  });

  it("round-trips price_asc sort", () => {
    const base = getDefaultSearchState("rent");
    const state = { ...base, sort: "price_asc" as const };
    const params = serializeSearchState(state);
    const parsed = parseSearchUrl(params);
    expect(parsed.sort).toBe("price_asc");
  });
});

describe("countActiveFilters", () => {
  it("counts rent-only fields for rent mode", () => {
    const filters: RentFilters = {
      listedWithin: 7,
      petPolicy: ["allowed"],
      maxDeposit: 100000,
    };
    const count = countActiveFilters(filters, "rent");
    expect(count).toBe(3);
  });

  it("counts buy-only fields for buy mode", () => {
    const filters: BuyFilters = {
      possessionStatus: ["ready_to_move"],
      khataType: ["A"],
      minCarpetArea: 800,
    };
    const count = countActiveFilters(filters, "buy");
    expect(count).toBe(3);
  });

  it("does NOT double-count listedWithin across modes", () => {
    const rentFilters: RentFilters = { listedWithin: 7 };
    const buyFilters: BuyFilters = { listedWithin: 7 };
    const rentCount = countActiveFilters(rentFilters, "rent");
    const buyCount = countActiveFilters(buyFilters, "buy");
    // listedWithin should count as 1 in each mode, not double-counted
    expect(rentCount).toBe(1);
    expect(buyCount).toBe(1);
  });

  it("does NOT double-count maxBrokerage across modes", () => {
    const rentFilters: RentFilters = { maxBrokerage: 10000 };
    const buyFilters: BuyFilters = { maxBrokerage: 2 };
    // Rent: counts in brokerage group (zeroRentBrokerage || maxBrokerage = 1)
    expect(countActiveFilters(rentFilters, "rent")).toBe(1);
    // Buy: counts as its own field = 1
    expect(countActiveFilters(buyFilters, "buy")).toBe(1);
  });

  it("counts shared fields for both modes", () => {
    const filters: RentFilters = {
      bhk: ["2BHK"],
      hasVideoWalkthrough: true,
    };
    expect(countActiveFilters(filters, "rent")).toBe(2);
    expect(countActiveFilters(filters, "buy")).toBe(2);
  });
});
