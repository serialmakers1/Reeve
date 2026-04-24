import React, { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
} from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

// ─── Font constant — matches FONT_SERIF pattern across codebase ───────────────
const FONT_SERIF = "'Instrument Serif', Georgia, serif";
const FONT_DM_SANS = "'DM Sans', system-ui, sans-serif";

// ─── Reduced motion ───────────────────────────────────────────────────────────
function useReducedMotion() {
  const [reduced, setReduced] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false
  );
  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

// ─── Types ────────────────────────────────────────────────────────────────────
export interface WhyReeveFeeModalProps {
  open: boolean;
  onClose: () => void;
}

const TOTAL_SCREENS = 5;

// ─── Screen 1: The Broker Problem ─────────────────────────────────────────────
const Screen1 = () => (
  <div className="space-y-5">
    <div
      className="inline-block rounded-full px-3 py-1 text-xs font-medium tracking-wide uppercase"
      style={{ background: "rgba(201,160,90,0.15)", color: "#c9a05a", fontFamily: FONT_DM_SANS }}
    >
      The problem with brokers
    </div>
    <h2
      className="text-2xl leading-tight text-white"
      style={{ fontFamily: FONT_SERIF }}
    >
      The broker took a month's rent. Then{" "}
      <em style={{ color: "#c9a05a", fontStyle: "italic" }}>vanished.</em>
    </h2>
    <p className="text-sm leading-relaxed" style={{ color: "#a8a89e", fontFamily: FONT_DM_SANS }}>
      Sound familiar? No agent. No middleman. No disappearing act.{" "}
      <strong style={{ color: "#d4d4cc" }}>Reeve stays for the full tenancy.</strong>
    </p>

    {/* Contrast table */}
    <div className="rounded-xl overflow-hidden border" style={{ borderColor: "rgba(201,160,90,0.2)" }}>
      <div className="grid grid-cols-2 text-xs font-semibold" style={{ fontFamily: FONT_DM_SANS }}>
        <div className="px-3 py-2 text-center" style={{ background: "rgba(239,68,68,0.12)", color: "#f87171" }}>
          Typical broker
        </div>
        <div className="px-3 py-2 text-center" style={{ background: "rgba(34,197,94,0.12)", color: "#4ade80" }}>
          Reeve
        </div>
      </div>
      {[
        ["One month's brokerage", "Zero brokerage"],
        ["Unreachable on day 2", "Platform contact, full term"],
        ["No payment receipts", "Rent receipts every payment"],
      ].map(([bad, good], i) => (
        <div key={i} className="grid grid-cols-2 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <div className="px-3 py-3 text-xs leading-snug flex items-start gap-1.5" style={{ color: "#f87171", fontFamily: FONT_DM_SANS }}>
            <span className="mt-0.5 shrink-0 text-red-500" aria-hidden>✗</span>
            {bad}
          </div>
          <div className="px-3 py-3 text-xs leading-snug flex items-start gap-1.5 border-l" style={{ color: "#4ade80", borderColor: "rgba(255,255,255,0.06)", fontFamily: FONT_DM_SANS }}>
            <span className="mt-0.5 shrink-0 text-green-400" aria-hidden>✓</span>
            {good}
          </div>
        </div>
      ))}
    </div>
  </div>
);

// ─── Screen 2: The Maintenance Black Hole ─────────────────────────────────────
const Screen2 = () => (
  <div className="space-y-5">
    <div
      className="inline-block rounded-full px-3 py-1 text-xs font-medium tracking-wide uppercase"
      style={{ background: "rgba(201,160,90,0.15)", color: "#c9a05a", fontFamily: FONT_DM_SANS }}
    >
      When things break
    </div>
    <h2
      className="text-2xl leading-tight text-white"
      style={{ fontFamily: FONT_SERIF }}
    >
      Reported it in October. It's{" "}
      <em style={{ color: "#c9a05a", fontStyle: "italic" }}>December.</em>
    </h2>
    <p className="text-sm leading-relaxed" style={{ color: "#a8a89e", fontFamily: FONT_DM_SANS }}>
      Every maintenance request on Reeve is logged, tracked, and escalated — not lost in a WhatsApp
      thread with read receipts and no reply.
    </p>

    {/* 3-step status track */}
    <div className="rounded-xl p-4 space-y-1" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
      <p className="text-xs font-medium mb-3 uppercase tracking-wide" style={{ color: "#a8a89e", fontFamily: FONT_DM_SANS }}>
        Request status
      </p>
      <div className="flex items-center gap-0" aria-label="Maintenance request stages">
        {[
          { label: "Reported", done: true },
          { label: "Assigned", done: false, inProgress: true },
          { label: "Resolved", done: false },
        ].map((step, i, arr) => (
          <React.Fragment key={i}>
            <div className="flex flex-col items-center gap-1.5 flex-1">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors"
                style={{
                  background: step.done ? "#c9a05a" : step.inProgress ? "rgba(201,160,90,0.25)" : "rgba(255,255,255,0.07)",
                  color: step.done ? "#171714" : step.inProgress ? "#c9a05a" : "#a8a89e",
                  border: step.inProgress ? "2px solid #c9a05a" : "none",
                }}
                aria-label={step.label + (step.done ? " — complete" : step.inProgress ? " — in progress" : " — pending")}
              >
                {step.done ? "✓" : i + 1}
              </div>
              <span className="text-xs text-center leading-tight" style={{ color: step.done ? "#c9a05a" : step.inProgress ? "#d4d4cc" : "#666660", fontFamily: FONT_DM_SANS }}>
                {step.label}
              </span>
            </div>
            {i < arr.length - 1 && (
              <div
                className="h-px flex-1 mb-5 -mx-1"
                style={{ background: i === 0 ? "rgba(201,160,90,0.4)" : "rgba(255,255,255,0.1)" }}
                aria-hidden
              />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>

    <p className="text-sm leading-relaxed" style={{ color: "#a8a89e", fontFamily: FONT_DM_SANS }}>
      <strong style={{ color: "#d4d4cc" }}>Your owner never gets your phone number.</strong> All
      communication routes through Reeve.
    </p>
  </div>
);

// ─── Screen 3: The Deposit Trap ───────────────────────────────────────────────
const Screen3 = () => (
  <div className="space-y-5">
    <div
      className="inline-block rounded-full px-3 py-1 text-xs font-medium tracking-wide uppercase"
      style={{ background: "rgba(201,160,90,0.15)", color: "#c9a05a", fontFamily: FONT_DM_SANS }}
    >
      When you move out
    </div>
    <h2
      className="text-2xl leading-tight text-white"
      style={{ fontFamily: FONT_SERIF }}
    >
      He called it damage. You called it{" "}
      <em style={{ color: "#c9a05a", fontStyle: "italic" }}>two years of living.</em>
    </h2>
    <p className="text-sm leading-relaxed" style={{ color: "#a8a89e", fontFamily: FONT_DM_SANS }}>
      Move-out on Reeve is assessed against the move-in photo record. Not memory. Not mood.{" "}
      <strong style={{ color: "#d4d4cc" }}>Deep cleaning and repainting are never deducted from your deposit.</strong>
    </p>

    {/* Contrast table */}
    <div className="rounded-xl overflow-hidden border" style={{ borderColor: "rgba(201,160,90,0.2)" }}>
      <div className="grid grid-cols-2 text-xs font-semibold" style={{ fontFamily: FONT_DM_SANS }}>
        <div className="px-3 py-2 text-center" style={{ background: "rgba(239,68,68,0.12)", color: "#f87171" }}>
          Without Reeve
        </div>
        <div className="px-3 py-2 text-center" style={{ background: "rgba(34,197,94,0.12)", color: "#4ade80" }}>
          With Reeve
        </div>
      </div>
      {[
        ["Owner decides damages", "Photo comparison baseline"],
        ["Cleaning deducted", "Platform-borne cost"],
        ["No refund timeline", "Structured settlement process"],
      ].map(([bad, good], i) => (
        <div key={i} className="grid grid-cols-2 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <div className="px-3 py-3 text-xs leading-snug flex items-start gap-1.5" style={{ color: "#f87171", fontFamily: FONT_DM_SANS }}>
            <span className="mt-0.5 shrink-0" aria-hidden>✗</span>
            {bad}
          </div>
          <div className="px-3 py-3 text-xs leading-snug flex items-start gap-1.5 border-l" style={{ color: "#4ade80", borderColor: "rgba(255,255,255,0.06)", fontFamily: FONT_DM_SANS }}>
            <span className="mt-0.5 shrink-0" aria-hidden>✓</span>
            {good}
          </div>
        </div>
      ))}
    </div>
  </div>
);

// ─── Screen 4: The Arbitrary Exit ─────────────────────────────────────────────
const Screen4 = () => (
  <div className="space-y-5">
    <div
      className="inline-block rounded-full px-3 py-1 text-xs font-medium tracking-wide uppercase"
      style={{ background: "rgba(201,160,90,0.15)", color: "#c9a05a", fontFamily: FONT_DM_SANS }}
    >
      Your right to stay
    </div>
    <h2
      className="text-2xl leading-tight text-white"
      style={{ fontFamily: FONT_SERIF }}
    >
      "Please vacate by month-end."{" "}
      <em style={{ color: "#c9a05a", fontStyle: "italic" }}>Who do you call?</em>
    </h2>
    <div className="space-y-3">
      <p className="text-sm leading-relaxed" style={{ color: "#a8a89e", fontFamily: FONT_DM_SANS }}>
        In a typical rental — nobody. It's your word against the owner's.
      </p>
      <p className="text-sm leading-relaxed" style={{ color: "#a8a89e", fontFamily: FONT_DM_SANS }}>
        On Reeve, your lease is signed by three parties — you, the owner, and Reeve. Not two. Reeve doesn't disappear after move-in. Reeve is a co-signatory for the full term. Every lease includes a 2-year lock-in. The owner can't bypass Reeve to end it early — and Reeve has a long-term management agreement with the owner, so there's no incentive to side with a bad-faith exit.
      </p>
      <p className="text-sm leading-relaxed" style={{ color: "#d4d4cc", fontFamily: FONT_DM_SANS }}>
        <strong>If there's a dispute, you don't face the owner alone. Reeve is already a legal party to your lease.</strong>
      </p>
    </div>

    {/* Gold stat block */}
    <div
      className="rounded-xl p-5 text-center space-y-2"
      style={{ background: "rgba(201,160,90,0.08)", border: "1px solid rgba(201,160,90,0.3)" }}
    >
      <p
        className="text-5xl font-bold leading-none"
        style={{ color: "#c9a05a", fontFamily: FONT_SERIF }}
        aria-label="2 year lock-in period"
      >
        2 yrs
      </p>
      <p className="text-sm font-medium" style={{ color: "#d4d4cc", fontFamily: FONT_DM_SANS }}>
        Lock-in period. Three-party lease. Reeve enforces.
      </p>
      <p className="text-xs" style={{ color: "#a8a89e", fontFamily: FONT_DM_SANS }}>
        Lease signed by tenant, owner, and Reeve. Not a verbal understanding.
      </p>
    </div>
  </div>
);

// ─── Screen 5: The Resolution ─────────────────────────────────────────────────
const Screen5 = () => (
  <div className="space-y-5">
    <div
      className="inline-block rounded-full px-3 py-1 text-xs font-medium tracking-wide uppercase"
      style={{ background: "rgba(201,160,90,0.15)", color: "#c9a05a", fontFamily: FONT_DM_SANS }}
    >
      What you're actually paying for
    </div>
    <h2
      className="text-2xl leading-tight text-white"
      style={{ fontFamily: FONT_SERIF }}
    >
      This is what the{" "}
      <em style={{ color: "#c9a05a", fontStyle: "italic" }}>7%</em> pays for.
    </h2>
    <p className="text-sm leading-relaxed" style={{ color: "#a8a89e", fontFamily: FONT_DM_SANS }}>
      One number. Included in your monthly payment. No brokerage on top. No hidden costs below.
    </p>

    {/* Pill row */}
    <div className="flex flex-wrap gap-2" aria-label="What's included">
      {[
        { label: "Verified property", lit: true },
        { label: "Verified owner", lit: true },
        { label: "Move-in record", lit: true },
        { label: "Deposit protection", lit: true },
        { label: "Maintenance intake", lit: true },
        { label: "Evidence-led exit", lit: true },
        { label: "Zero brokerage", lit: false },
        { label: "Rent receipts", lit: false },
        { label: "2-yr lock-in", lit: false },
      ].map(({ label, lit }) => (
        <span
          key={label}
          className="rounded-full px-3 py-1 text-xs font-medium"
          style={
            lit
              ? { background: "rgba(201,160,90,0.18)", color: "#c9a05a", border: "1px solid rgba(201,160,90,0.35)", fontFamily: FONT_DM_SANS }
              : { background: "rgba(255,255,255,0.05)", color: "#666660", border: "1px solid rgba(255,255,255,0.08)", fontFamily: FONT_DM_SANS }
          }
        >
          {label}
        </span>
      ))}
    </div>

    {/* 7% display */}
    <div
      className="rounded-xl p-4 flex items-center justify-between"
      style={{ background: "rgba(201,160,90,0.08)", border: "1px solid rgba(201,160,90,0.25)" }}
    >
      <div>
        <p
          className="text-4xl font-bold leading-none"
          style={{ color: "#c9a05a", fontFamily: FONT_SERIF }}
          aria-label="7 percent fee"
        >
          7%
        </p>
        <p className="text-xs mt-1" style={{ color: "#a8a89e", fontFamily: FONT_DM_SANS }}>
          above base rent · first term
        </p>
      </div>
      <div
        className="rounded-full px-3 py-1.5 text-xs font-semibold flex items-center gap-1"
        style={{ background: "rgba(34,197,94,0.15)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.25)", fontFamily: FONT_DM_SANS }}
        aria-label="Reduces to 4 percent at renewal"
      >
        ↓ 4% at renewal
      </div>
    </div>
  </div>
);

// ─── Screens array ────────────────────────────────────────────────────────────
const SCREENS = [Screen1, Screen2, Screen3, Screen4, Screen5];

// ─── Inner content (shared between Drawer and Dialog) ────────────────────────
interface FeeModalContentProps {
  onClose: () => void;
}

const FeeModalContent: React.FC<FeeModalContentProps> = ({ onClose }) => {
  const [current, setCurrent] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const reducedMotion = useReducedMotion();

  // Reset to screen 0 on mount (modal re-open)
  useEffect(() => {
    setCurrent(0);
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
      goTo(deltaX < 0 ? current + 1 : current - 1);
    }
  };

  const goTo = (idx: number) => {
    const clamped = Math.max(0, Math.min(TOTAL_SCREENS - 1, idx));
    setCurrent(clamped);
  };

  const isFirst = current === 0;
  const isLast = current === TOTAL_SCREENS - 1;

  const nextLabel =
    current === 3 ? "See the case →" : current === TOTAL_SCREENS - 2 ? "See what's included →" : "Next →";

  const CurrentScreen = SCREENS[current];

  return (
    <div
      className="flex flex-col"
      style={{ background: "#171714", minHeight: 0 }}
      aria-label="Why the Reeve fee"
    >
      {/* Close button */}
      <div className="flex items-center justify-between px-5 pt-4 pb-2 shrink-0">
        <div className="w-6" aria-hidden />
        <p className="text-xs font-medium tracking-widest uppercase" style={{ color: "#666660", fontFamily: FONT_DM_SANS }}>
          {current + 1} / {TOTAL_SCREENS}
        </p>
        <button
          onClick={onClose}
          className="flex items-center justify-center w-8 h-8 rounded-full transition-colors hover:bg-white/10"
          style={{ color: "#a8a89e" }}
          aria-label="Close"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
            <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Slide track */}
      <div
        className="overflow-hidden flex-1 px-5"
        style={{ minHeight: 0 }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div
          ref={trackRef}
          className="flex"
          style={{
            transform: `translateX(calc(-${current * 100 / TOTAL_SCREENS}% - ${current * 20 / TOTAL_SCREENS}px))`,
            transition: reducedMotion ? "none" : "transform 380ms cubic-bezier(0.4, 0, 0.2, 1)",
            width: `${TOTAL_SCREENS * 100}%`,
            gap: "20px",
          }}
        >
          {SCREENS.map((Screen, i) => (
            <div
              key={i}
              role="tabpanel"
              aria-label={`Screen ${i + 1} of ${TOTAL_SCREENS}`}
              aria-hidden={i !== current}
              style={{ width: `calc(${100 / TOTAL_SCREENS}% - ${(TOTAL_SCREENS - 1) * 20 / TOTAL_SCREENS}px)`, flexShrink: 0, paddingBottom: "8px" }}
            >
              <Screen />
            </div>
          ))}
        </div>
      </div>

      {/* Progress dots */}
      <div
        className="flex items-center justify-center gap-2 py-4 shrink-0"
        role="tablist"
        aria-label="Screen navigation"
      >
        {Array.from({ length: TOTAL_SCREENS }).map((_, i) => (
          <button
            key={i}
            role="tab"
            aria-label={`Go to screen ${i + 1}`}
            aria-selected={i === current}
            onClick={() => goTo(i)}
            className="flex items-center justify-center transition-all"
            style={{ minWidth: "44px", minHeight: "44px" }}
          >
            <span
              className="block rounded-full transition-all"
              style={
                reducedMotion
                  ? {
                      width: i === current ? "20px" : "6px",
                      height: "6px",
                      background: i === current ? "#c9a05a" : "rgba(255,255,255,0.2)",
                    }
                  : {
                      width: i === current ? "20px" : "6px",
                      height: "6px",
                      background: i === current ? "#c9a05a" : "rgba(255,255,255,0.2)",
                      transition: "width 300ms cubic-bezier(0.4, 0, 0.2, 1), background 200ms ease",
                    }
              }
            />
          </button>
        ))}
      </div>

      {/* Footer — nav for screens 1–4, pinned CTA for screen 5 */}
      {!isLast ? (
        <div className="flex items-center justify-between gap-3 px-5 pb-5 shrink-0">
          <button
            onClick={() => (isFirst ? goTo(TOTAL_SCREENS - 1) : goTo(current - 1))}
            className="flex-1 rounded-xl py-3 text-sm font-medium border transition-colors hover:bg-white/5"
            style={{ borderColor: "rgba(255,255,255,0.12)", color: "#a8a89e", fontFamily: FONT_DM_SANS }}
          >
            {isFirst ? "Skip" : "← Back"}
          </button>
          <button
            onClick={() => goTo(current + 1)}
            className="flex-1 rounded-xl py-3 text-sm font-semibold transition-opacity hover:opacity-90"
            style={{ background: "rgba(201,160,90,0.15)", color: "#c9a05a", border: "1px solid rgba(201,160,90,0.3)", fontFamily: FONT_DM_SANS }}
          >
            {nextLabel}
          </button>
        </div>
      ) : (
        <div className="px-5 pb-5 shrink-0">
          <button
            onClick={onClose}
            className="w-full rounded-xl py-3.5 font-semibold transition-opacity hover:opacity-90 active:opacity-80"
            style={{ background: "#c9a05a", color: "#171714", fontFamily: FONT_SERIF, fontSize: "17px" }}
          >
            Got it — view this property
          </button>
          <p className="text-center mt-1" style={{ fontSize: "11px", color: "rgba(255,255,255,0.25)", fontFamily: FONT_DM_SANS }}>
            Reduces to 4% at renewal.
          </p>
        </div>
      )}
    </div>
  );
};

// ─── Main modal — Drawer (mobile) / Dialog (desktop) ─────────────────────────
const WhyReeveFeeModal: React.FC<WhyReeveFeeModalProps> = ({ open, onClose }) => {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
        <DrawerContent
          className="overflow-y-auto"
          style={{ background: "#171714", maxHeight: "92dvh", borderTop: "1px solid rgba(201,160,90,0.2)" }}
        >
          <FeeModalContent onClose={onClose} />
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent
        className="overflow-hidden p-0 gap-0 [&>button]:hidden"
        style={{
          background: "#171714",
          maxWidth: "480px",
          maxHeight: "88vh",
          border: "1px solid rgba(201,160,90,0.2)",
          borderRadius: "16px",
        }}
        aria-label="Why the Reeve fee"
      >
        <FeeModalContent onClose={onClose} />
      </DialogContent>
    </Dialog>
  );
};

export default WhyReeveFeeModal;

// ─── Named export: self-contained trigger link ────────────────────────────────
export const WhyReeveFeeLink: React.FC<{ className?: string }> = ({ className }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "text-xs font-medium underline underline-offset-2 transition-opacity hover:opacity-80",
          className
        )}
        style={{ color: "#c9a05a", fontFamily: FONT_DM_SANS, cursor: "pointer" }}
        aria-label="Learn why there is a 7% Reeve fee"
      >
        Why 7%?
      </button>
      <WhyReeveFeeModal open={open} onClose={() => setOpen(false)} />
    </>
  );
};
