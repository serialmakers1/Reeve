/**
 * src/lib/seo/pdpHeadCleanup.ts (client, DOM-only)
 *
 * On leaving a *direct edge-rendered* Property Detail page, restore the original
 * homepage `<head>` and remove the property tags the edge injected.
 *
 * On a direct PDP load, `api/property.ts` injects property head tags marked
 * `data-pdp-edge` and saves the original homepage head (title/description/canonical/
 * robots/OG/Twitter/JSON-LD) as a JSON array in the `data-pdp-base` attribute on
 * `<html>`. This runs from `PropertyDetail`'s layout-effect cleanup — before
 * `useSearchMeta`'s passive effect captures the head on the next route — so property
 * canonical/robots never leak into e.g. `/search`, and the destination head is complete.
 *
 * No-op when `data-pdp-base` is absent (client-entered PDPs). This never generates or
 * chooses SEO metadata; it only restores what the edge saved.
 */
export function restorePdpBaseHead(): void {
  if (typeof document === "undefined") return;
  const html = document.documentElement;
  const base = html.getAttribute("data-pdp-base");
  if (base == null) return;

  // Remove the property tags first, so restoring the originals yields exactly one each.
  document.querySelectorAll("[data-pdp-edge]").forEach((el) => el.remove());

  try {
    const originals = JSON.parse(base) as string[];
    for (const tag of originals) {
      const titleMatch = /^<title\b[^>]*>([\s\S]*?)<\/title>\s*$/i.exec(tag.trim());
      if (titleMatch) {
        // Title is RCDATA — set it explicitly (reliable in every environment / getter).
        let titleEl = document.head.querySelector("title");
        if (!titleEl) {
          titleEl = document.createElement("title");
          document.head.appendChild(titleEl);
        }
        titleEl.textContent = titleMatch[1];
        document.title = titleMatch[1];
      } else {
        // meta/link/JSON-LD: insertAdjacentHTML (an inserted <script> does not execute).
        document.head.insertAdjacentHTML("beforeend", tag);
      }
    }
  } catch {
    /* malformed carrier — leave head as-is rather than throw during cleanup */
  }

  html.removeAttribute("data-pdp-base");
}
