import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { CitySearchInput } from "../components/CitySearchInput";

// ─── Mocks ──────────────────────────────────────────────────────────────────

const geocodeLatLng = vi.fn();

vi.mock("@/features/search/hooks/usePlacesSearch", () => ({
  usePlacesSearch: () => ({
    suggestions: [],
    isLoading: false,
    error: null,
    isReady: true,
    fetchSuggestions: vi.fn(),
    resolvePlace: vi.fn(),
    clearSuggestions: vi.fn(),
  }),
}));

vi.mock("@/features/search/hooks/useReverseGeocode", () => ({
  useReverseGeocode: () => ({ geocodeLatLng, isReady: true }),
}));

const toast = vi.fn();
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast }),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

const VIEWPORT = {
  low: { lat: 12.8, lng: 77.4 },
  high: { lat: 13.1, lng: 77.8 },
};

function setGeolocation(impl: Geolocation["getCurrentPosition"]) {
  Object.defineProperty(navigator, "geolocation", {
    value: { getCurrentPosition: impl },
    configurable: true,
  });
}

const onCitySelected = vi.fn();
const onToggleManualFallback = vi.fn();

function renderInput(strict = false) {
  const element = React.createElement(CitySearchInput, {
    displayValue: "",
    onCitySelected,
    showManualFallback: false,
    onToggleManualFallback,
  });
  return render(
    strict ? React.createElement(React.StrictMode, null, element) : element,
  );
}

// ─── Tests ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  geocodeLatLng.mockReset();
  toast.mockReset();
  onCitySelected.mockReset();
  onToggleManualFallback.mockReset();
});

describe("CitySearchInput — Use my location (Issue 5)", () => {
  it("success → calls onCitySelected with resolved city + viewport", async () => {
    geocodeLatLng.mockResolvedValue({ city: "bengaluru", viewport: VIEWPORT });
    setGeolocation((success) =>
      success({ coords: { latitude: 12.97, longitude: 77.59 } } as GeolocationPosition),
    );

    renderInput();
    fireEvent.click(screen.getByRole("button", { name: /use my location/i }));

    await waitFor(() => {
      expect(onCitySelected).toHaveBeenCalledWith("bengaluru", "bengaluru", null, VIEWPORT);
    });
    expect(onToggleManualFallback).not.toHaveBeenCalled();
  });

  it("PERMISSION_DENIED → does NOT call onCitySelected (draft preserved); no throw", async () => {
    setGeolocation((_success, error) =>
      error?.({ code: 1, message: "denied" } as GeolocationPositionError),
    );

    renderInput();
    fireEvent.click(screen.getByRole("button", { name: /use my location/i }));

    await waitFor(() => {
      expect(toast).toHaveBeenCalled();
    });
    expect(onCitySelected).not.toHaveBeenCalled();
    expect(onToggleManualFallback).toHaveBeenCalled();
  });

  it("under StrictMode: success still calls onCitySelected (mount ref survives double cycle)", async () => {
    geocodeLatLng.mockResolvedValue({ city: "mumbai", viewport: VIEWPORT });
    setGeolocation((success) =>
      success({ coords: { latitude: 19.07, longitude: 72.87 } } as GeolocationPosition),
    );

    renderInput(true);
    fireEvent.click(screen.getByRole("button", { name: /use my location/i }));

    await waitFor(() => {
      expect(onCitySelected).toHaveBeenCalledWith("mumbai", "mumbai", null, VIEWPORT);
    });
  });
});
