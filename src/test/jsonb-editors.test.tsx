/**
 * Sync Prompt 4 (D-170) — FurnishingEditor + AmenitiesEditor.
 * Covers: canonical/custom split, add/toggle/delete flows, onChange payload shape.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { FurnishingEditor } from "@/components/property/FurnishingEditor";
import { AmenitiesEditor } from "@/components/property/AmenitiesEditor";
import type { FurnishingDetailItem } from "@/types/property";

describe("FurnishingEditor (D-170)", () => {
  it("renders standard items + a custom item from value prop", () => {
    const value: FurnishingDetailItem[] = [
      { item: "bed", count: 2, size: "Queen" },
      { item: "study_table", count: 1, custom: true },
    ];
    render(<FurnishingEditor value={value} onChange={() => {}} />);
    // Bed should be checked
    const bedRow = screen.getByText("Bed").closest("div");
    expect(bedRow).toBeInTheDocument();
    // Custom item name populated
    expect(screen.getByDisplayValue("study_table")).toBeInTheDocument();
  });

  it("emits updated array with count when a standard item is toggled on", () => {
    const onChange = vi.fn();
    render(<FurnishingEditor value={[]} onChange={onChange} />);
    const wardrobeLabel = screen.getByText("Wardrobe");
    const wardrobeRow = wardrobeLabel.closest("div")!;
    const checkbox = within(wardrobeRow).getByRole("checkbox");
    fireEvent.click(checkbox);
    expect(onChange).toHaveBeenCalledWith([{ item: "wardrobe", count: 1 }]);
  });

  it("yesNoOnly items are emitted without a count", () => {
    const onChange = vi.fn();
    render(<FurnishingEditor value={[]} onChange={onChange} />);
    const fridgeRow = screen.getByText("Fridge").closest("div")!;
    fireEvent.click(within(fridgeRow).getByRole("checkbox"));
    expect(onChange).toHaveBeenCalledWith([{ item: "fridge" }]);
  });

  it("adds a custom item with custom:true on '+ Add item' click", () => {
    const onChange = vi.fn();
    render(<FurnishingEditor value={[]} onChange={onChange} />);
    fireEvent.click(screen.getByText("+ Add item"));
    expect(onChange).toHaveBeenCalledWith([{ item: "", custom: true }]);
  });

  it("removes standard item on second toggle", () => {
    const onChange = vi.fn();
    const value: FurnishingDetailItem[] = [{ item: "bed", count: 1 }];
    render(<FurnishingEditor value={value} onChange={onChange} />);
    const bedRow = screen.getByText("Bed").closest("div")!;
    fireEvent.click(within(bedRow).getByRole("checkbox"));
    expect(onChange).toHaveBeenCalledWith([]);
  });
});

describe("AmenitiesEditor (D-170)", () => {
  it("splits value into canonical (checkboxes) vs custom (input list) correctly", () => {
    render(<AmenitiesEditor value={["lift", "Rooftop terrace"]} onChange={() => {}} />);
    // Canonical Lift checkbox checked
    const liftLabel = screen.getByText("Lift").closest("label")!;
    expect(within(liftLabel).getByRole("checkbox")).toBeChecked();
    // Custom string shown as editable input
    expect(screen.getByDisplayValue("Rooftop terrace")).toBeInTheDocument();
  });

  it("emits updated array on canonical toggle (add)", () => {
    const onChange = vi.fn();
    render(<AmenitiesEditor value={[]} onChange={onChange} />);
    const gymLabel = screen.getByText("Gym").closest("label")!;
    fireEvent.click(within(gymLabel).getByRole("checkbox"));
    expect(onChange).toHaveBeenCalledWith(["gym"]);
  });

  it("emits without the removed canonical value", () => {
    const onChange = vi.fn();
    render(<AmenitiesEditor value={["gym", "lift"]} onChange={onChange} />);
    const gymLabel = screen.getByText("Gym").closest("label")!;
    fireEvent.click(within(gymLabel).getByRole("checkbox"));
    expect(onChange).toHaveBeenCalledWith(["lift"]);
  });

  it("appends an empty string on '+ Add amenity'", () => {
    const onChange = vi.fn();
    render(<AmenitiesEditor value={["gym"]} onChange={onChange} />);
    fireEvent.click(screen.getByText("+ Add amenity"));
    expect(onChange).toHaveBeenCalledWith(["gym", ""]);
  });
});

describe("buildAmenitiesJson (D-170)", () => {
  it("preserves flat building array + derives furnishing_items from non-custom detail entries", async () => {
    const { buildAmenitiesJson } = await import("@/types/property");
    const detail: FurnishingDetailItem[] = [
      { item: "bed", count: 1 },
      { item: "ac", count: 2, rooms: "Master" },
      { item: "Study table", custom: true },
    ];
    const result = buildAmenitiesJson(["lift", "custom"], detail);
    expect(result.building).toEqual(["lift", "custom"]);
    expect(result.furnishing_items).toEqual(["bed", "ac"]);
  });
});
