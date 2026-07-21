/**
 * F1-B1d: clamped text with overflow-gated Read-more toggle.
 * Only renders the button when the text actually overflows the clamp.
 * Debounced resize listener recomputes overflow on viewport changes.
 */
import { useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface Props {
  text: string;
  /** Tailwind clamp class, e.g. "line-clamp-4". */
  clamp: string;
}

export default function ClampedText({ text, clamp }: Props) {
  const ref = useRef<HTMLParagraphElement | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    // When expanded, `line-clamp-*` is dropped, so scrollHeight === clientHeight.
    // Re-check by temporarily reapplying the clamp via a hidden probe.
    const measure = () => {
      // Clamp is present in DOM only while !expanded; if expanded, don't touch.
      if (!expanded) {
        setOverflows(el.scrollHeight > el.clientHeight + 1);
      }
    };
    measure();
    let t: ReturnType<typeof setTimeout> | null = null;
    const onResize = () => {
      if (t) clearTimeout(t);
      t = setTimeout(measure, 100);
    };
    window.addEventListener("resize", onResize, { passive: true });
    return () => {
      window.removeEventListener("resize", onResize);
      if (t) clearTimeout(t);
    };
  }, [text, expanded]);

  return (
    <>
      <p
        ref={ref}
        className={cn("whitespace-pre-line text-sm text-foreground", !expanded && clamp)}
      >
        {text}
      </p>
      {/* Show toggle only when the text actually overflows (or is already expanded). */}
      {(overflows || expanded) && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-1 text-xs text-primary"
        >
          {expanded ? "Show less" : "Read more"}
        </button>
      )}
    </>
  );
}
