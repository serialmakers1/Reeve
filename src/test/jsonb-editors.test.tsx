/**
 * Sync Prompt 4 (D-170) — FurnishingEditor + AmenitiesEditor.
 * Covers: canonical/custom split, add/toggle/delete flows, onChange payload shape.
 */
import { describe, it, expect, vi } from "vitest";
import { useState } from "react";
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

// Stateful wrapper — re-renders FurnishingEditor with updated value after onChange;
// exposes committed parent state via <output> for assertion
function FurnishingEditorWrapper({ initial }: { initial: FurnishingDetailItem[] }) {
  const [value, setValue] = useState(initial);
  return (
    <>
      <FurnishingEditor value={value} onChange={setValue} />
      <output data-testid="furnishing-state">{JSON.stringify(value)}</output>
    </>
  );
}

describe("FurnishingEditor — count input blank-state fix", () => {
  it("canonical: 6 → blank displays '' → type '1' → blur shows '1' and commits 1", () => {
    render(<FurnishingEditorWrapper initial={[{ item: "bed", count: 6 }]} />);
    const input = screen.getByDisplayValue("6") as HTMLInputElement;

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "" } });
    expect(input.value).toBe(""); // visibly blank while editing

    fireEvent.change(input, { target: { value: "1" } });
    expect(input.value).toBe("1"); // shows "1" while still editing

    fireEvent.blur(input);
    expect(input.value).toBe("1");
    expect(screen.getByTestId("furnishing-state")).toHaveTextContent('"count":1');
  });

  it("custom: 6 → blank displays '' → blur shows '1' and commits 1", () => {
    render(
      <FurnishingEditorWrapper initial={[{ item: "Rug", count: 6, custom: true }]} />,
    );
    const input = screen.getByDisplayValue("6") as HTMLInputElement;

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "" } });
    expect(input.value).toBe(""); // visibly blank while editing

    fireEvent.blur(input);
    expect(input.value).toBe("1");
    expect(screen.getByTestId("furnishing-state")).toHaveTextContent('"count":1');
  });

  it("blur: blank becomes 1", () => {
    render(<FurnishingEditorWrapper initial={[{ item: "bed", count: 3 }]} />);
    const input = screen.getByDisplayValue("3") as HTMLInputElement;
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "" } });
    fireEvent.blur(input);
    expect(input.value).toBe("1");
    expect(screen.getByTestId("furnishing-state")).toHaveTextContent('"count":1');
  });

  it("blur: 0 becomes 1", () => {
    render(<FurnishingEditorWrapper initial={[{ item: "bed", count: 3 }]} />);
    const input = screen.getByDisplayValue("3") as HTMLInputElement;
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "0" } });
    fireEvent.blur(input);
    expect(input.value).toBe("1");
    expect(screen.getByTestId("furnishing-state")).toHaveTextContent('"count":1');
  });

  it("blur: 100 becomes 99", () => {
    render(<FurnishingEditorWrapper initial={[{ item: "bed", count: 3 }]} />);
    const input = screen.getByDisplayValue("3") as HTMLInputElement;
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "100" } });
    fireEvent.blur(input);
    expect(input.value).toBe("99");
    expect(screen.getByTestId("furnishing-state")).toHaveTextContent('"count":99');
  });

  it("blur: leading-zero '04' normalizes to '4'", () => {
    render(<FurnishingEditorWrapper initial={[{ item: "bed", count: 3 }]} />);
    const input = screen.getByDisplayValue("3") as HTMLInputElement;
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "04" } });
    fireEvent.blur(input);
    expect(input.value).toBe("4");
    expect(screen.getByTestId("furnishing-state")).toHaveTextContent('"count":4');
  });

  it("blank count does not delete custom item — row still present with count 1 after blur", () => {
    render(
      <FurnishingEditorWrapper initial={[{ item: "Rug", count: 6, custom: true }]} />,
    );
    const input = screen.getByDisplayValue("6") as HTMLInputElement;
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "" } });
    fireEvent.blur(input);
    expect(screen.getByDisplayValue("Rug")).toBeInTheDocument();
    expect(input.value).toBe("1");
    expect(screen.getByTestId("furnishing-state")).toHaveTextContent('"count":1');
  });
});

// ── Owner-limited custom-item mode (customLimit prop) ──────────────────────
function AmenitiesEditorWrapper({ initial, customLimit }: { initial: string[]; customLimit?: number }) {
  const [value, setValue] = useState(initial);
  return (
    <>
      <AmenitiesEditor value={value} onChange={setValue} customLimit={customLimit} />
      <output data-testid="amenities-state">{JSON.stringify(value)}</output>
    </>
  );
}

describe("AmenitiesEditor — owner limits (customLimit)", () => {
  it("shows the usage counter and an Add button", () => {
    render(<AmenitiesEditorWrapper initial={[]} customLimit={5} />);
    expect(screen.getByText("0 of 5 custom items added")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add" })).toBeDisabled(); // blank
  });

  it("adds a valid unique custom name via staging input", () => {
    render(<AmenitiesEditorWrapper initial={[]} customLimit={5} />);
    const input = screen.getByPlaceholderText("Add a custom amenity");
    fireEvent.change(input, { target: { value: "Rooftop terrace" } });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(screen.getByTestId("amenities-state")).toHaveTextContent('"Rooftop terrace"');
  });

  it("blocks a canonical duplicate and directs to the option", () => {
    render(<AmenitiesEditorWrapper initial={[]} customLimit={5} />);
    const input = screen.getByPlaceholderText("Add a custom amenity");
    fireEvent.change(input, { target: { value: "lift" } });
    expect(screen.getByText(/already available above as "Lift"/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add" })).toBeDisabled();
  });

  it("blocks a custom duplicate", () => {
    render(<AmenitiesEditorWrapper initial={["Terrace"]} customLimit={5} />);
    const input = screen.getByPlaceholderText("Add a custom amenity");
    fireEvent.change(input, { target: { value: "terrace" } });
    expect(screen.getByText(/already added "Terrace"/)).toBeInTheDocument();
  });

  it("disables Add once 5 customs exist", () => {
    render(<AmenitiesEditorWrapper initial={["a", "b", "c", "d", "e"]} customLimit={5} />);
    expect(screen.getByText("5 of 5 custom items added")).toBeInTheDocument();
    const input = screen.getByPlaceholderText("Add a custom amenity");
    fireEvent.change(input, { target: { value: "Sixth" } });
    expect(screen.getByRole("button", { name: "Add" })).toBeDisabled();
  });

  it("Enter in the staging input adds (and does not throw / submit)", () => {
    render(<AmenitiesEditorWrapper initial={[]} customLimit={5} />);
    const input = screen.getByPlaceholderText("Add a custom amenity");
    fireEvent.change(input, { target: { value: "Garden gym" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(screen.getByTestId("amenities-state")).toHaveTextContent('"Garden gym"');
  });

  it("legacy 7-item value renders all rows editable + Add disabled (never truncated)", () => {
    const legacy = ["one", "two", "three", "four", "five", "six", "seven"];
    render(<AmenitiesEditorWrapper initial={legacy} customLimit={5} />);
    for (const name of legacy) expect(screen.getByDisplayValue(name)).toBeInTheDocument();
    expect(screen.getByText("7 of 5 custom items added")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add" })).toBeDisabled();
  });

  it("edit mode: renaming an existing row to a valid unique name commits (limit skipped even at/over 5)", () => {
    render(<AmenitiesEditorWrapper initial={["a", "b", "c", "d", "e"]} customLimit={5} />);
    const input = screen.getByDisplayValue("a");
    fireEvent.change(input, { target: { value: "Alpha" } });
    fireEvent.blur(input);
    expect(screen.getByTestId("amenities-state")).toHaveTextContent('"Alpha"');
  });

  it("edit mode: renaming to a duplicate shows an error and does not commit", () => {
    render(<AmenitiesEditorWrapper initial={["a", "b"]} customLimit={5} />);
    const input = screen.getByDisplayValue("a");
    fireEvent.change(input, { target: { value: "b" } });
    expect(screen.getByText(/already added "b"/)).toBeInTheDocument();
    fireEvent.blur(input);
    // reverted to "a"; state unchanged
    expect(screen.getByTestId("amenities-state")).toHaveTextContent('["a","b"]');
  });
});

describe("AmenitiesEditor — admin (no customLimit) stays unrestricted", () => {
  it("appends beyond 5 custom items via '+ Add amenity'", () => {
    const onChange = vi.fn();
    render(<AmenitiesEditor value={["a", "b", "c", "d", "e"]} onChange={onChange} />);
    fireEvent.click(screen.getByText("+ Add amenity"));
    expect(onChange).toHaveBeenCalledWith(["a", "b", "c", "d", "e", ""]);
  });

  it("renders legacy 7-item value fully with no Add button / counter", () => {
    render(<AmenitiesEditor value={["1", "2", "3", "4", "5", "6", "7"]} onChange={() => {}} />);
    expect(screen.queryByRole("button", { name: "Add" })).not.toBeInTheDocument();
    expect(screen.queryByText(/custom items added/)).not.toBeInTheDocument();
    expect(screen.getByText("+ Add amenity")).toBeInTheDocument();
  });
});

describe("FurnishingEditor — owner limits (customLimit)", () => {
  it("adds a valid custom furniture item with count 1", () => {
    function Wrap() {
      const [value, setValue] = useState<FurnishingDetailItem[]>([]);
      return (
        <>
          <FurnishingEditor value={value} onChange={setValue} customLimit={5} />
          <output data-testid="f-state">{JSON.stringify(value)}</output>
        </>
      );
    }
    render(<Wrap />);
    const input = screen.getByPlaceholderText("Add a custom item");
    fireEvent.change(input, { target: { value: "Shoe rack" } });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(screen.getByTestId("f-state")).toHaveTextContent('"item":"Shoe rack"');
    expect(screen.getByTestId("f-state")).toHaveTextContent('"custom":true');
  });

  it("blocks 'AC' as a canonical duplicate via the alias map", () => {
    render(<FurnishingEditor value={[]} onChange={() => {}} customLimit={5} />);
    const input = screen.getByPlaceholderText("Add a custom item");
    fireEvent.change(input, { target: { value: "Air Conditioner" } });
    expect(screen.getByText(/already available above as "AC"/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add" })).toBeDisabled();
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
