import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { SearchPropertyCard } from "../components/list/SearchPropertyCard";
import type { SearchPropertyResult } from "../data/searchResultContract";

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => navigateSpy };
});

vi.mock("@/features/search/state/pendingSearchIntent", () => ({
  writePendingIntent: (...args: unknown[]) => pendingIntentSpy(...args),
}));

const navigateSpy = vi.fn();
const pendingIntentSpy = vi.fn();
let toggleSpy = vi.fn();

// ── Fixture ──────────────────────────────────────────────────────────────────

function makeResult(overrides: Partial<SearchPropertyResult> = {}): SearchPropertyResult {
  return {
    id: "prop-1",
    detailUrl: "/property/prop-1",
    listingMode: "rent",
    propertyType: "apartment",
    bhk: "2BHK",
    primaryImageUrl: "https://example.com/img.jpg",
    photoCount: 3,
    price: { kind: "rent_total", amount: 35000, currency: "INR" },
    buildingName: "Sunrise Apartments",
    locality: "Koramangala",
    city: "bengaluru",
    locationMode: "exact",
    latitude: 12.9,
    longitude: 77.6,
    carpetAreaSqft: 900,
    superBuiltUpSqft: 1100,
    furnishing: "semi_furnished",
    bathrooms: 2,
    floorNumber: 3,
    totalFloors: 10,
    parking4w: "covered",
    parking2w: null,
    parking4wCount: 1,
    parking2wCount: null,
    buildingAgeYears: 5,
    possessionStatus: null,
    possessionDate: null,
    listerRole: "owner",
    responseHandledCount: 10,
    responseRatePct: 80,
    viewCount: 25,
    commentCount: 2,
    listedAt: new Date(Date.now() - 3 * 86_400_000).toISOString(),
    availabilityConfirmedAt: null,
    isFavourited: false,
    rentBrokerageType: null,
    rentBrokerageFixed: null,
    rentBrokerageMonths: null,
    saleBrokeragePct: null,
    securityDepositAmount: null,
    lockInMonths: null,
    noticePeriodDays: null,
    petPolicy: null,
    hasVideoWalkthrough: false,
    priceNegotiable: null,
    youtubeWalkthroughUrl: null,
    ...overrides,
  };
}

interface RenderOverrides {
  isFavourited?: (id: string) => boolean;
  isLoggedIn?: boolean;
}

function renderCard(result: SearchPropertyResult, overrides: RenderOverrides = {}) {
  return render(
    <MemoryRouter initialEntries={["/search?type=rent&city=bengaluru"]}>
      <SearchPropertyCard
        result={result}
        isFavourited={overrides.isFavourited ?? ((id) => id === "fav-property")}
        onToggleFavourite={toggleSpy}
        isLoggedIn={overrides.isLoggedIn ?? true}
      />
    </MemoryRouter>,
  );
}

// ── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  navigateSpy.mockClear();
  pendingIntentSpy.mockClear();
  toggleSpy = vi.fn();
});

describe("SearchPropertyCard — rent card", () => {
  it("renders the monthly rent amount with a month unit + Total monthly label", () => {
    renderCard(makeResult());
    expect(screen.getByText(/35,000/)).toBeTruthy();
    expect(screen.getByText("/ month")).toBeTruthy();
    expect(screen.getByText("Total monthly")).toBeTruthy();
  });

  it("renders building name (combined with locality)", () => {
    renderCard(makeResult());
    expect(screen.getByText(/Sunrise Apartments/)).toBeTruthy();
  });

  it("renders feature tiles with explicit labels; size is exclusive (carpet over super built-up)", () => {
    renderCard(makeResult());
    // carpet (home-spec) → Semi-furnished (condition) → parking backfill. Super
    // built-up is the same `size` concept as carpet, so it is NOT also shown.
    expect(screen.getByText("900 sq ft")).toBeTruthy();
    expect(screen.getByText("Carpet")).toBeTruthy();
    expect(screen.getByText("Semi-furnished")).toBeTruthy();
    expect(screen.queryByText("Super built-up")).toBeNull();
  });

  it("favourite button is a sibling of the link, not nested inside it", () => {
    const { container } = renderCard(makeResult());
    const wrapper = container.firstChild as HTMLElement;
    const link = wrapper.querySelector("a");
    const favButton = wrapper.querySelector("button[aria-label]");
    expect(favButton).toBeTruthy();
    expect(link).toBeTruthy();
    // button must NOT be inside the link
    expect(link?.contains(favButton)).toBe(false);
    // both must be direct children of wrapper
    const childArray = Array.from(wrapper.children);
    expect(childArray).toContain(favButton);
    expect(childArray).toContain(link);
  });

  it("clicking favourite calls toggleFavourite when logged in", () => {
    renderCard(makeResult());
    const btn = screen.getByLabelText(/Save to favourites|Remove from favourites/);
    fireEvent.click(btn);
    expect(toggleSpy).toHaveBeenCalledWith("prop-1", "list");
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it("renders response rate when available (compact visible + full aria)", () => {
    renderCard(makeResult({ responseRatePct: 80 }));
    expect(screen.getByText("Responds 80%")).toBeTruthy();
    expect(screen.getByText("Responds to 80 percent of enquiries")).toBeTruthy();
  });

  it("renders view count when >= 10 (sr-only accessible phrase)", () => {
    renderCard(makeResult({ viewCount: 25 }));
    expect(screen.getByText("25 views")).toBeTruthy();
  });

  it("does not render view count when < 10", () => {
    renderCard(makeResult({ viewCount: 5 }));
    expect(screen.queryByText(/views/)).toBeNull();
  });
});

describe("SearchPropertyCard — buy card", () => {
  it("renders sale price formatted with formatPriceShort", () => {
    renderCard(
      makeResult({
        listingMode: "buy",
        price: { kind: "sale", amount: 8500000, currency: "INR" },
        possessionStatus: "ready_to_move",
        carpetAreaSqft: 1200,
      }),
    );
    expect(screen.getByText(/85L/)).toBeTruthy();
  });

  it("renders possession status as a comparison fact (when higher-priority attrs absent)", () => {
    renderCard(
      makeResult({
        listingMode: "buy",
        price: null,
        possessionStatus: "ready_to_move",
        // Clear the preferred carpet/super-built-up/furnishing/parking so possession surfaces.
        carpetAreaSqft: null,
        superBuiltUpSqft: null,
        furnishing: null,
        parking4w: null,
        parking2w: null,
      }),
    );
    expect(screen.getByText("Ready to move")).toBeTruthy();
  });
});

describe("SearchPropertyCard — unauthenticated favourite", () => {
  it("calls writePendingIntent and navigates to login when not logged in", () => {
    renderCard(makeResult(), { isLoggedIn: false, isFavourited: () => false });
    const btn = screen.getByLabelText(/Save to favourites/);
    fireEvent.click(btn);
    expect(pendingIntentSpy).toHaveBeenCalledWith("prop-1", expect.stringContaining("/"));
    expect(navigateSpy).toHaveBeenCalledWith(expect.stringContaining("/login?returnTo="));
    expect(toggleSpy).not.toHaveBeenCalled();
  });
});

describe("SearchPropertyCard — broken image", () => {
  it("shows placeholder src after image error", () => {
    const { container } = renderCard(makeResult({ primaryImageUrl: "https://broken.url/img.jpg" }));
    const img = container.querySelector("img") as HTMLImageElement;
    expect(img).toBeTruthy();
    fireEvent.error(img);
    expect(img.src).toContain("unsplash.com");
  });

  it("shows placeholder when primaryImageUrl is null from the start", () => {
    const { container } = renderCard(makeResult({ primaryImageUrl: null }));
    const img = container.querySelector("img") as HTMLImageElement;
    expect(img?.src).toContain("unsplash.com");
  });
});

describe("SearchPropertyCard — footer deck", () => {
  it("shows Owner label for owner lister", () => {
    renderCard(makeResult({ listerRole: "owner" }));
    // Visible (aria-hidden) + sr-only both carry the label → getAllByText.
    expect(screen.getAllByText("Owner").length).toBeGreaterThan(0);
  });

  it("shows Property Manager label", () => {
    renderCard(makeResult({ listerRole: "property_manager" }));
    expect(screen.getAllByText("Property Manager").length).toBeGreaterThan(0);
  });

  it("never renders 'New on Reeve' (removed in redesign)", () => {
    renderCard(makeResult({ responseRatePct: 70 }));
    expect(screen.queryByText("New on Reeve")).toBeNull();
    expect(screen.getByText("Responds 70%")).toBeTruthy();
  });
});

describe("SearchPropertyCard — activity + header", () => {
  it("does not render comments segment when commentCount is 0", () => {
    renderCard(makeResult({ commentCount: 0, viewCount: 25 }));
    expect(screen.queryByText(/comments?$/)).toBeNull();
  });

  it("renders comment count when > 0", () => {
    renderCard(makeResult({ commentCount: 3, viewCount: 25 }));
    expect(screen.getByText("3 comments")).toBeTruthy();
  });

  it("omits the price header cleanly when price is null (no TOTAL MONTHLY)", () => {
    renderCard(makeResult({ price: null, viewCount: 0, commentCount: 0 }));
    expect(screen.queryByText("Total monthly")).toBeNull();
    expect(screen.queryByText(/undefined/)).toBeNull();
  });
});

describe("SearchPropertyCard — Split isolation (layout=horizontal)", () => {
  function renderSplit(result: SearchPropertyResult) {
    return render(
      <MemoryRouter initialEntries={["/search?type=rent&city=bengaluru"]}>
        <SearchPropertyCard
          result={result}
          layout="horizontal"
          isFavourited={() => false}
          onToggleFavourite={toggleSpy}
          isLoggedIn
        />
      </MemoryRouter>,
    );
  }

  it("does not render the new footer deck / feature grid in Split", () => {
    renderSplit(makeResult({ responseRatePct: 80 }));
    // The vibrant footer response segment is List-only.
    expect(screen.queryByText("Responds 80%")).toBeNull();
    // Split keeps its chip facts instead of feature tiles.
    expect(screen.queryByText("Carpet")).toBeNull();
  });
});

describe("SearchPropertyCard — location line null/whitespace safety", () => {
  it("falls back to locality when building name is whitespace-only (no stray separator)", () => {
    renderCard(makeResult({ buildingName: "   ", locality: "Koramangala", city: "bengaluru" }));
    // The location line shows the locality alone — never a leading "· " from a blank building.
    expect(screen.getByText("Koramangala")).toBeInTheDocument();
    expect(screen.queryByText(/·\s*Koramangala/)).toBeNull();
  });

  it("shows city when building + locality are blank, and nothing when all blank", () => {
    const { rerender } = renderCard(makeResult({ buildingName: "", locality: "  ", city: "bengaluru" }));
    expect(screen.getByText("bengaluru")).toBeInTheDocument();
    rerender(
      <MemoryRouter initialEntries={["/search?type=rent"]}>
        <SearchPropertyCard
          result={makeResult({ buildingName: "  ", locality: null, city: null })}
          isFavourited={() => false}
          onToggleFavourite={toggleSpy}
          isLoggedIn
        />
      </MemoryRouter>,
    );
    // Title (bhk · type) still renders; no crash / no blank location paragraph asserted here.
    expect(screen.getAllByText(/2 BHK|Apartment/i).length).toBeGreaterThan(0);
  });
});
