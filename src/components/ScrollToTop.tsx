import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    // Let the #comments deep-link own the scroll (PropertyDetail handles it).
    // All other navigations — including hash removal on the same path — reset
    // to the top as before.
    if (hash === "#comments") return;
    window.scrollTo(0, 0);
  }, [pathname, hash]);

  return null;
}
