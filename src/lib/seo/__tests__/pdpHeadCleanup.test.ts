import { describe, it, expect, beforeEach } from "vitest";
import { restorePdpBaseHead } from "@/lib/seo/pdpHeadCleanup";

// Simulate the DOM the edge produced for a direct PDP: property tags marked
// data-pdp-edge, and the original homepage head saved in data-pdp-base on <html>.
function setupDirectPdpDom() {
  document.documentElement.removeAttribute("data-pdp-base");
  document.head.innerHTML = "";
  document.title = "";

  const originals = [
    "<title>Reeve | Rentals in Bangalore</title>",
    '<meta name="description" content="Homepage description.">',
    '<link rel="canonical" href="https://www.reeve.in/">',
    '<meta property="og:title" content="Reeve | Rentals in Bangalore">',
    '<script type="application/ld+json">{"@type":"Organization"}</script>',
  ];
  document.documentElement.setAttribute("data-pdp-base", JSON.stringify(originals));

  // property (edge) tags currently in the head
  document.head.insertAdjacentHTML(
    "beforeend",
    '<title data-pdp-edge>Prestige Lakeside Habitat for Rent in Whitefield, Bengaluru | Reeve</title>',
  );
  document.head.insertAdjacentHTML(
    "beforeend",
    '<link rel="canonical" href="https://www.reeve.in/property/abc" data-pdp-edge>',
  );
  document.head.insertAdjacentHTML(
    "beforeend",
    '<meta name="robots" content="index, follow" data-pdp-edge>',
  );
}

beforeEach(() => {
  document.head.innerHTML = "";
  document.documentElement.removeAttribute("data-pdp-base");
  document.title = "";
});

describe("restorePdpBaseHead", () => {
  it("restores the original homepage head exactly once and removes edge tags", () => {
    setupDirectPdpDom();
    restorePdpBaseHead();

    // edge tags gone
    expect(document.querySelectorAll("[data-pdp-edge]").length).toBe(0);

    // exactly one canonical, pointing back at the homepage
    const canonicals = document.querySelectorAll('link[rel="canonical"]');
    expect(canonicals.length).toBe(1);
    expect(canonicals[0].getAttribute("href")).toBe("https://www.reeve.in/");

    // homepage description + JSON-LD + og restored; robots (property-only) is gone
    expect(document.querySelectorAll('meta[name="description"]').length).toBe(1);
    expect(document.querySelector('meta[name="description"]')?.getAttribute("content")).toBe("Homepage description.");
    expect(document.querySelectorAll('meta[property="og:title"]').length).toBe(1);
    expect(document.querySelectorAll('script[type="application/ld+json"]').length).toBe(1);
    expect(document.querySelectorAll('meta[name="robots"]').length).toBe(0);

    // title restored to homepage
    expect(document.title).toBe("Reeve | Rentals in Bangalore");

    // carrier removed so a later route can't mistake it for a fresh direct load
    expect(document.documentElement.hasAttribute("data-pdp-base")).toBe(false);
  });

  it("does NOT leave the property canonical/robots for the next route to capture", () => {
    setupDirectPdpDom();
    restorePdpBaseHead();
    // What useSearchMeta would read when /search mounts next:
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute("href")).not.toContain("/property/");
    expect(document.querySelector('meta[name="robots"]')).toBeNull();
  });

  it("is a no-op for a client-entered PDP (no data-pdp-base)", () => {
    document.head.innerHTML = '<link rel="canonical" href="https://www.reeve.in/search">';
    document.title = "Search Properties | Reeve";
    restorePdpBaseHead();
    expect(document.querySelectorAll('link[rel="canonical"]').length).toBe(1);
    expect(document.title).toBe("Search Properties | Reeve");
  });
});
