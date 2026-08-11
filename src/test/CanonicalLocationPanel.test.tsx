import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CanonicalLocationPanel, type GeoAssociation } from "@/pages/admin/ListingReviewDetail";

const prop = {
  building_name: "Prestige Lakeside",
  building_name_source: "google",
  formatted_address: "Prestige Lakeside Habitat, Whitefield, Bengaluru, Karnataka 560066",
  latitude: 12.9698,
  longitude: 77.75,
};

const assoc: GeoAssociation[] = [
  { relationship: "primary_city", source: "google", geo_place: { display_name: "Bengaluru", kind: "city" } },
  { relationship: "secondary_city", source: "google", geo_place: { display_name: "Whitefield City", kind: "city" } },
  { relationship: "area_road", source: "google", geo_place: { display_name: "Whitefield", kind: "area" } },
  { relationship: "area_road", source: "owner", geo_place: { display_name: "Brookefield", kind: "area" } },
];

describe("CanonicalLocationPanel (admin review)", () => {
  it("shows Google address, building name + source, primary/secondary city, and areas", () => {
    render(<CanonicalLocationPanel property={prop} associations={assoc} />);
    expect(screen.getByText(/Prestige Lakeside Habitat/)).toBeInTheDocument();
    expect(screen.getByText("Prestige Lakeside")).toBeInTheDocument();
    expect(screen.getByText("Google")).toBeInTheDocument(); // building source badge
    expect(screen.getByText("Bengaluru")).toBeInTheDocument(); // primary city
    expect(screen.getByText("Whitefield City")).toBeInTheDocument(); // secondary city
    expect(screen.getByText("Whitefield")).toBeInTheDocument(); // area
    expect(screen.getByText("Brookefield")).toBeInTheDocument(); // owner-added area
  });

  it("renders safely with a null building name and no associations", () => {
    render(
      <CanonicalLocationPanel
        property={{ building_name: null, building_name_source: null, formatted_address: null, latitude: null, longitude: null }}
        associations={[]}
      />,
    );
    expect(screen.getByText("Canonical location")).toBeInTheDocument();
    expect(screen.getByText("Not resolved")).toBeInTheDocument(); // primary city fallback
  });
});
