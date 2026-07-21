/**
 * P4 back-to-top FAB. Appears after scrolling past 1.5× viewport height.
 * Sits above the CTA bar on mobile; corner-anchored on desktop.
 */
import { useEffect, useState } from "react";
import { ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

export default function BackToTopFAB() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const threshold = () => window.innerHeight * 1.5;
    const onScroll = () => setVisible(window.scrollY > threshold());
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <button
      type="button"
      aria-label="Back to top"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className={cn(
        "fixed right-4 z-40 flex h-10 w-10 items-center justify-center rounded-full border bg-background opacity-80 shadow-sm transition-opacity duration-150 hover:opacity-100",
        // Mobile: sit above the sticky CTA bar (~72px + safe area + 12px gap).
        // Desktop: no CTA bar, corner-anchor at 1rem.
        "bottom-[calc(72px+env(safe-area-inset-bottom)+12px)] lg:bottom-4",
        visible ? "pointer-events-auto opacity-80" : "pointer-events-none opacity-0",
      )}
    >
      <ChevronUp className="h-4 w-4" />
    </button>
  );
}
