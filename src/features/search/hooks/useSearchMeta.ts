import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useSearchState } from "@/features/search/state/useSearchState";
import { formatSearchHeading } from "@/features/search/state/formatSearchHeading";
import { formatCitiesLabel } from "@/features/search/state/searchStateUtils";

export function useSearchMeta() {
  const { search } = useLocation();
  const { state, hasValidContext } = useSearchState();

  // propertyTypes-aware document title, consistent with the page H1. Falls back to a
  // generic title when the search context is not yet valid.
  const title = hasValidContext
    ? `${formatSearchHeading({
        mode: state.context.mode,
        city: state.context.city,
        citiesLabel: formatCitiesLabel(state.context.cities),
        propertyTypes: state.context.propertyTypes,
      })} | Reeve`
    : "Search Properties | Reeve";

  useEffect(() => {
    const prevTitle = document.title;
    document.title = title;

    const isDynamic = search.length > 0;

    // robots meta
    let createdRobots = false;
    let robotsMeta = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (!robotsMeta) {
      robotsMeta = document.createElement("meta");
      robotsMeta.setAttribute("name", "robots");
      document.head.appendChild(robotsMeta);
      createdRobots = true;
    }
    const prevRobotsContent = robotsMeta.content;
    robotsMeta.content = isDynamic ? "noindex, follow" : "index, follow";

    // canonical
    let createdCanonical = false;
    let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
      createdCanonical = true;
    }
    const prevCanonicalHref = canonical.href;
    canonical.href = "https://reeve.in/search";

    return () => {
      document.title = prevTitle;
      if (createdRobots) {
        robotsMeta?.parentNode?.removeChild(robotsMeta);
      } else if (robotsMeta) {
        robotsMeta.content = prevRobotsContent;
      }
      if (createdCanonical) {
        canonical?.parentNode?.removeChild(canonical);
      } else if (canonical) {
        canonical.href = prevCanonicalHref;
      }
    };
  }, [search, title]);
}
