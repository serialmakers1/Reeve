import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export function useSearchMeta() {
  const { search } = useLocation();

  useEffect(() => {
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
  }, [search]);
}
