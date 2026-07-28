import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { SearchPropertyCard } from "../components/list/SearchPropertyCard";
import type { SearchPropertyResult } from "../data/searchResultContract";

// ── Mocks ────────────────────────────────────────────────────────────────────

// useFavourites default: logged in, no favourites
vi.mock("@/hooks/useFavourites", () => ({
  useFavourites: vi.fn(() => ({
    isFavourited: (id: string) => id === "fav-property",
    toggleFavourite: vi.fn(),
    isLoggedIn: true,
    loading: false,
    favouriteIds: new Set<string>(),
  })),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => navigateSpy };
});

vi.mock("@/features/search/state/pendingSearchIntent", () => ({
  writePendingIntent: (...args: unknown[]) => pendingIntentSpy(...args),
}));

// Spies declared after vi.mock so Vitest's module hoisting doesn't affect them.
// The factory closures above reference these by name — they'll be defined by the
// time the first test body runs.
const navigateSpy = vi.fn();
const pendingIntentSpy = vi.fn();
let toggleSpy = vi.fn();

import { useFavourites } from "@/hooks/useFavourites";

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
    isNewOnReeve: false,
    viewCount: 25,
    commentCount: 2,
    experienceFeedback: null,
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

function renderCard(result: SearchPropertyResult) {
  return render(
    <MemoryRouter initialEntries={["/search?type=rent&city=bengaluru"]}>
      <SearchPropertyCard result={result} />
    </MemoryRouter>,
  );
}

// ── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  navigateSpy.mockClear();
  pendingIntentSpy.mockClear();
  toggleSpy = vi.fn();
  vi.mocked(useFavourites).mockReturnValue({
    isFavourited: (id: string) => id === "fav-property",
    toggleFavourite: toggleSpy,
    isLoggedIn: true,
    loading: false,
    favouriteIds: new Set<string>(),
  });
});

describe("SearchPropertyCard — rent card", () => {
  it("renders price text with /mo suffix", () => {
    renderCard(makeResult());
    expect(screen.getByText(/35,000\/mo/)).toBeTruthy();
  });

  it("renders building name", () => {
    renderCard(makeResult());
    expect(screen.getByText("Sunrise Apartments")).toBeTruthy();
  });

  it("renders comparison facts (max 3)", () => {
    renderCard(makeResult());
    // carpet (900), super-built-up (1100 — different value), semi-furnished
    expect(screen.getByText("900 sq.ft")).toBeTruthy();
    expect(screen.getByText("1100 sq.ft SBA")).toBeTruthy();
    expect(screen.getByText("Semi-furnished")).toBeTruthy();
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
    expect(toggleSpy).toHaveBeenCalledWith("prop-1");
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it("renders response rate when available", () => {
    renderCard(makeResult({ responseRatePct: 80 }));
    expect(screen.getByText(/Responds to 80%/)).toBeTruthy();
  });

  it("renders view count when >= 10", () => {
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

  it("renders possession status as a comparison fact", () => {
    renderCard(
      makeResult({
        listingMode: "buy",
        price: null,
        possessionStatus: "ready_to_move",
      }),
    );
    expect(screen.getByText("Ready to move")).toBeTruthy();
  });
});

describe("SearchPropertyCard — unauthenticated favourite", () => {
  it("calls writePendingIntent and navigates to login when not logged in", () => {
    vi.mocked(useFavourites).mockReturnValue({
      isFavourited: () => false,
      toggleFavourite: toggleSpy,
      isLoggedIn: false,
      loading: false,
      favouriteIds: new Set<string>(),
    });
    renderCard(makeResult());
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

describe("SearchPropertyCard — lister row", () => {
  it("shows Owner label for owner lister", () => {
    renderCard(makeResult({ listerRole: "owner" }));
    expect(screen.getByText("Owner")).toBeTruthy();
  });

  it("shows New on Reeve chip alongside response rate (additive, not replacing)", () => {
    renderCard(makeResult({ isNewOnReeve: true, responseRatePct: 70 }));
    expect(screen.getByText("New on Reeve")).toBeTruthy();
    expect(screen.getByText(/Responds to 70%/)).toBeTruthy();
  });
});
