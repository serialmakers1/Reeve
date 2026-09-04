import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Quote, ChevronLeft, ChevronRight } from "lucide-react";
import {
  TESTIMONIALS,
  SECTION_COPY,
  AVATAR_PALETTES,
  type Testimonial,
} from "@/data/testimonials";

const HEADING_ID = "testimonial-heading";
const EASE = "cubic-bezier(.22,.61,.36,1)";
const SCROLL_TOLERANCE = 2; // px — absorbs fractional browser scroll values

/** Deterministic gradient monogram avatar. Same testimonial → same colour, always. */
function Avatar({ t }: { t: Testimonial }) {
  const [from, to] = AVATAR_PALETTES[t.avatarVariant];
  return (
    <span className="relative inline-flex shrink-0" aria-hidden="true">
      {/* soft colour halo behind the avatar */}
      <span
        className="absolute inset-0 rounded-[16px]"
        style={{
          background: `linear-gradient(140deg, ${from}, ${to})`,
          filter: "blur(10px)",
          opacity: 0.35,
          transform: "scale(1.05)",
        }}
      />
      <span
        className="reeve-story-avatar relative grid h-12 w-12 place-items-center rounded-[15px] text-[15px] font-bold text-white sm:h-[52px] sm:w-[52px]"
        style={{
          background: `linear-gradient(140deg, ${from}, ${to})`,
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.45), 0 2px 6px rgba(15,23,42,0.18)",
        }}
      >
        {/* tiny abstract geometric accent */}
        <span
          className="pointer-events-none absolute right-1 top-1 h-2 w-2 rounded-[3px]"
          style={{ background: "rgba(255,255,255,0.28)", transform: "rotate(18deg)" }}
        />
        {t.initials}
      </span>
    </span>
  );
}

function Card({ t }: { t: Testimonial }) {
  return (
    <figure
      className="reeve-story-card flex h-full w-full flex-col rounded-[20px] border bg-white p-[22px] sm:p-7"
      style={{
        borderColor: "rgba(15,23,42,0.08)",
        boxShadow: "0 8px 30px rgba(15,23,42,0.06)",
      }}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <span
          className="inline-flex items-center rounded-full px-[10px] py-[6px] text-[11px] font-bold tracking-[0.05em]"
          style={{ background: "#EEF2FF", color: "#4338CA", border: "1px solid #E0E7FF" }}
        >
          {t.service}
        </span>
        <Quote className="h-6 w-6 shrink-0" style={{ color: "#A5B4FC" }} aria-hidden="true" />
      </div>

      <blockquote
        className="text-[16px] font-normal leading-[1.62] sm:text-[17px]"
        style={{ color: "#1E293B" }}
      >
        {t.quote}
      </blockquote>

      <figcaption className="mt-auto flex items-center gap-3 pt-6">
        <Avatar t={t} />
        <div className="min-w-0">
          <div className="text-[15px] font-bold" style={{ color: "#0F172A" }}>
            {t.name}
          </div>
          <div className="text-[13px] leading-[1.45]" style={{ color: "#64748B" }}>
            {t.role} · {t.ownerLocation}
          </div>
          <div className="text-[13px] leading-[1.45]" style={{ color: "#64748B" }}>
            {t.propertyType} · {t.propertyLocation}
          </div>
        </div>
      </figcaption>
    </figure>
  );
}

export default function TestimonialsSection() {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const sectionRef = useRef<HTMLElement | null>(null);
  const rafRef = useRef<number | null>(null);

  const [reduced, setReduced] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [nav, setNav] = useState({
    atStart: true,
    atEnd: false,
    current: 0,
    segments: 0, // 0 until measured — avoids a wrong-count flash before geometry is known
    activeSegment: 0,
  });

  // ── reduced-motion preference ─────────────────────────────────────────────
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  // ── one-time reveal on viewport entry ─────────────────────────────────────
  useEffect(() => {
    if (revealed) return;
    const el = sectionRef.current;
    if (!el) return;
    if (reduced || typeof IntersectionObserver === "undefined") {
      setRevealed(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setRevealed(true);
          io.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reduced, revealed]);

  // ── measure the card step (width + gap) from live DOM ──────────────────────
  const measureStep = useCallback(() => {
    const track = trackRef.current;
    if (!track) return { step: 1, perView: 1 };
    const first = track.querySelector<HTMLElement>(".reeve-story-slide");
    const cardW = first?.offsetWidth ?? track.clientWidth;
    const gap = parseFloat(getComputedStyle(track).columnGap || "0") || 0;
    const step = cardW + gap;
    const perView = Math.max(1, Math.round((track.clientWidth + gap) / step));
    return { step, perView };
  }, []);

  // ── recompute progress + arrow state from live scroll geometry ─────────────
  const recompute = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const { step, perView } = measureStep();
    const { scrollLeft, scrollWidth, clientWidth } = track;
    const maxScroll = scrollWidth - clientWidth;

    const atStart = scrollLeft <= SCROLL_TOLERANCE;
    const atEnd = scrollLeft >= maxScroll - SCROLL_TOLERANCE;
    const current = Math.min(
      TESTIMONIALS.length - 1,
      Math.max(0, Math.round(scrollLeft / step)),
    );
    const segments = Math.max(1, Math.ceil(TESTIMONIALS.length / perView));
    const activeSegment = Math.min(
      segments - 1,
      atEnd ? segments - 1 : Math.floor(current / perView),
    );

    setNav((prev) =>
      prev.atStart === atStart &&
      prev.atEnd === atEnd &&
      prev.current === current &&
      prev.segments === segments &&
      prev.activeSegment === activeSegment
        ? prev
        : { atStart, atEnd, current, segments, activeSegment },
    );
  }, [measureStep]);

  // ── measure once before paint so the indicator never shows a wrong count ───
  useLayoutEffect(() => {
    recompute();
  }, [recompute]);

  // ── passive scroll (rAF-throttled) + resize/orientation ────────────────────
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const onScroll = () => {
      if (rafRef.current != null) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        recompute();
      });
    };
    const onResize = () => recompute();

    recompute();
    track.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);

    return () => {
      track.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [recompute]);

  // ── arrow navigation — advance ~one card using the measured step ───────────
  const scrollByCards = useCallback(
    (dir: 1 | -1) => {
      const track = trackRef.current;
      if (!track) return;
      const { step } = measureStep();
      track.scrollBy({
        left: dir * step,
        behavior: reduced ? "auto" : "smooth",
      });
    },
    [measureStep, reduced],
  );

  const shown = revealed || reduced;
  const revealMs = reduced ? 0 : 1;

  return (
    <section
      ref={sectionRef}
      aria-labelledby={HEADING_ID}
      className="relative isolate overflow-hidden"
      style={{
        background:
          "linear-gradient(135deg, #F5F3FF 0%, #F8FAFC 48%, #ECFEFF 100%), #F8FAFC",
      }}
    >
      {/* ── decorative ambient overlays (behind content) ─────────────────── */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute z-0 h-[220px] w-[220px] sm:h-[420px] sm:w-[420px]"
        style={{
          top: "-140px",
          right: "-100px",
          filter: "blur(32px)",
          opacity: shown ? 1 : 0.45,
          transform: shown ? "scale(1)" : "scale(0.96)",
          transition: revealMs ? `opacity 800ms ${EASE}, transform 800ms ${EASE}` : "none",
          background:
            "radial-gradient(circle at 50% 50%, rgba(99,102,241,0.16) 0%, rgba(99,102,241,0) 70%)",
        }}
      />
      {/* richer violet layer — crossfades in on reveal (opacity only, static gradient) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute z-0 h-[220px] w-[220px] sm:h-[420px] sm:w-[420px]"
        style={{
          top: "-140px",
          right: "-100px",
          filter: "blur(34px)",
          opacity: shown ? 1 : 0,
          transform: shown ? "scale(1)" : "scale(0.96)",
          transition: revealMs ? `opacity 900ms ${EASE}, transform 900ms ${EASE}` : "none",
          background:
            "radial-gradient(circle at 50% 50%, rgba(124,58,237,0.08) 0%, rgba(124,58,237,0) 68%)",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute z-0 h-[190px] w-[190px] sm:h-[360px] sm:w-[360px]"
        style={{
          bottom: "-150px",
          left: "-110px",
          filter: "blur(32px)",
          opacity: shown ? 1 : 0.45,
          transform: shown ? "scale(1)" : "scale(0.96)",
          transition: revealMs ? `opacity 800ms ${EASE}, transform 800ms ${EASE}` : "none",
          background:
            "radial-gradient(circle at 50% 50%, rgba(6,182,212,0.12) 0%, rgba(6,182,212,0) 70%)",
        }}
      />

      {/* ── decorative connector lines (desktop/tablet) ──────────────────── */}
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 hidden h-full w-full sm:block"
        viewBox="0 0 1240 600"
        preserveAspectRatio="none"
        fill="none"
      >
        <defs>
          <linearGradient id="reeve-connector" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#818CF8" />
            <stop offset="100%" stopColor="#22D3EE" />
          </linearGradient>
        </defs>
        {[
          "M-40 140 C 260 40, 520 260, 820 150 S 1180 120, 1300 210",
          "M-40 420 C 300 520, 560 320, 900 460 S 1200 500, 1300 400",
        ].map((d, i) => (
          <path
            key={i}
            d={d}
            stroke="url(#reeve-connector)"
            strokeWidth="1"
            opacity="0.07"
            pathLength={1}
            style={{
              strokeDasharray: 1,
              strokeDashoffset: shown ? 0 : 1,
              transition: revealMs ? `stroke-dashoffset 1000ms ${EASE}` : "none",
            }}
          />
        ))}
        {[
          [180, 96],
          [640, 210],
          [980, 172],
          [420, 470],
          [1080, 440],
        ].map(([cx, cy], i) => (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={5}
            fill="#818CF8"
            opacity={shown ? 0.13 : 0}
            style={{ transition: revealMs ? `opacity 700ms ${EASE} 500ms` : "none" }}
          />
        ))}
      </svg>

      {/* ── real content ─────────────────────────────────────────────────── */}
      <div className="relative z-10 mx-auto max-w-[1240px] px-5 py-16 sm:px-8 sm:py-20 lg:px-10 lg:py-24">
        {/* header */}
        <div
          className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between"
          style={{
            opacity: shown ? 1 : 0,
            transform: shown ? "translateY(0)" : "translateY(8px)",
            transition: revealMs ? "opacity 350ms ease, transform 350ms ease" : "none",
          }}
        >
          <div className="max-w-[760px]">
            <p
              className="text-[11px] font-bold uppercase tracking-[0.06em] sm:text-[12px]"
              style={{ color: "#4F46E5" }}
            >
              {SECTION_COPY.eyebrow}
            </p>
            <h2
              id={HEADING_ID}
              className="mt-2 font-bold leading-[1.15] text-[28px] sm:text-[clamp(2rem,3vw,2.625rem)]"
              style={{ color: "#0F172A" }}
            >
              {SECTION_COPY.heading}
            </h2>
            <p
              className="mt-3 text-[16px] leading-[1.52] sm:text-[17px]"
              style={{ color: "#64748B" }}
            >
              {SECTION_COPY.supporting}
            </p>
          </div>

          {/* desktop nav buttons */}
          <div className="hidden shrink-0 gap-3 md:flex">
            <NavButton
              dir="prev"
              disabled={nav.atStart}
              onClick={() => scrollByCards(-1)}
            />
            <NavButton dir="next" disabled={nav.atEnd} onClick={() => scrollByCards(1)} />
          </div>
        </div>

        {/* carousel */}
        <div
          role="region"
          aria-roledescription="carousel"
          aria-label="Customer stories"
          className="mt-10"
        >
          <div
            ref={trackRef}
            className="reeve-story-track no-scrollbar -mr-5 py-4 pr-5 sm:mr-0 sm:pr-0"
          >
            {TESTIMONIALS.map((t, i) => (
              <div
                key={t.id}
                role="group"
                aria-roledescription="slide"
                aria-label={`${i + 1} of ${TESTIMONIALS.length}`}
                className="reeve-story-slide"
                style={{
                  opacity: shown ? 1 : 0,
                  transform: shown ? "translateY(0)" : "translateY(10px)",
                  transition: revealMs
                    ? `opacity 400ms ease ${Math.min(i, 3) * 40}ms, transform 400ms ease ${Math.min(i, 3) * 40}ms`
                    : "none",
                }}
              >
                <Card t={t} />
              </div>
            ))}
          </div>
        </div>

        {/* progress + mobile nav */}
        <div className="mt-8 flex items-center justify-between gap-4">
          {/* desktop segmented indicator (rendered once measured) */}
          <div className="hidden min-h-[6px] items-center gap-1.5 md:flex" aria-hidden="true">
            {Array.from({ length: nav.segments }).map((_, i) => (
              <span
                key={i}
                className="h-1.5 rounded-full transition-all duration-300"
                style={{
                  width: i === nav.activeSegment ? 22 : 8,
                  background: i === nav.activeSegment ? "#4F46E5" : "#CBD5E1",
                }}
              />
            ))}
          </div>

          {/* mobile position + slim track */}
          <div className="flex flex-1 items-center gap-3 md:hidden">
            <span className="text-[13px] font-semibold tabular-nums" style={{ color: "#64748B" }}>
              {nav.current + 1} / {TESTIMONIALS.length}
            </span>
            <span className="relative h-1 flex-1 overflow-hidden rounded-full" style={{ background: "#E2E8F0" }}>
              <span
                className="absolute inset-y-0 left-0 rounded-full transition-all duration-300"
                style={{
                  width: `${((nav.current + 1) / TESTIMONIALS.length) * 100}%`,
                  background: "#4F46E5",
                }}
              />
            </span>
          </div>

          {/* mobile nav buttons (below carousel) */}
          <div className="flex shrink-0 gap-3 md:hidden">
            <NavButton dir="prev" disabled={nav.atStart} onClick={() => scrollByCards(-1)} />
            <NavButton dir="next" disabled={nav.atEnd} onClick={() => scrollByCards(1)} />
          </div>
        </div>
      </div>
    </section>
  );
}

function NavButton({
  dir,
  disabled,
  onClick,
}: {
  dir: "prev" | "next";
  disabled: boolean;
  onClick: () => void;
}) {
  const Icon = dir === "prev" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={dir === "prev" ? "Previous customer stories" : "Next customer stories"}
      className="reeve-story-arrow grid h-11 w-11 place-items-center rounded-full border bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
      style={{ borderColor: "#E2E8F0", color: "#334155" }}
    >
      <Icon className="h-5 w-5" />
    </button>
  );
}
