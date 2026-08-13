import { useState, useEffect, useRef } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ShieldCheck,
  CalendarCheck, UserRound, Folder, Wrench,
  Building2, CheckCircle, Check,
  Home, AlertTriangle, KeyRound, CheckCircle2,
} from "lucide-react";
import Layout from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";
import PropertyEnquiryForm from "@/components/property-services/PropertyEnquiryForm";

const SERIF = "'Instrument Serif', Georgia, serif";
const SANS = "'DM Sans', system-ui, sans-serif";

// ── Section 2: Managed Control Layer — types & data ───────────────────────

type ManagedMode = "visits" | "tenant" | "records" | "repairs";

interface ModeConfig {
  id: ManagedMode;
  label: string;
  Icon: LucideIcon;
  modeLabel: string;
  h3: string;
  facts: string[];
}

const MODES: ModeConfig[] = [
  {
    id: "visits",
    label: "Visits",
    Icon: CalendarCheck,
    modeLabel: "VISITS",
    h3: "The property is actually checked.",
    facts: [
      "4 scheduled inspections each year",
      "Dated photographs from every inspection",
      "2 additional on-request inspections included",
      "Move-in and move-out condition records",
    ],
  },
  {
    id: "tenant",
    label: "Tenant",
    Icon: UserRound,
    modeLabel: "TENANT",
    h3: "Someone stays on top of the tenancy.",
    facts: [
      "Monthly tenant check-in",
      "Maintenance and access communication",
      "Renewal negotiation included",
      "Move-out coordination",
    ],
  },
  {
    id: "records",
    label: "Records",
    Icon: Folder,
    modeLabel: "RECORDS",
    h3: "Your property develops a history.",
    facts: [
      "Monthly itemised statement — even in a quiet month",
      "Agreements and renewals",
      "Tax, society, utilities and meter tracking",
      "Rent receipt confirmation and late follow-up",
    ],
  },
  {
    id: "repairs",
    label: "Repairs",
    Icon: Wrench,
    modeLabel: "REPAIRS",
    h3: "Repairs stay visible from estimate to completion.",
    facts: [
      "Vendor bills at actuals — Reeve markup ₹0",
      "Above ₹3,000 → written owner approval",
      "Up to 6 repair/coordination visits each year",
      "Before / after record when work is completed",
    ],
  },
];

// ── Section 3: Pricing — types & data ────────────────────────────────────

type PropType = "3bhk" | "4bhk";

interface PricingTier {
  label: string;
  rentedMonthly: number;
  emptyMonthly: number;
  terms: { months: 3 | 6 | 12; total: number; saving?: number }[];
}

const PRICING: Record<PropType, PricingTier> = {
  "3bhk": {
    label: "Up to 3 BHK",
    rentedMonthly: 3000,
    emptyMonthly: 2000,
    terms: [
      { months: 3,  total: 9000 },
      { months: 6,  total: 17000, saving: 1000 },
      { months: 12, total: 32000, saving: 4000 },
    ],
  },
  "4bhk": {
    label: "4 BHK+ / villa / independent home",
    rentedMonthly: 4500,
    emptyMonthly: 3000,
    terms: [
      { months: 3,  total: 13500 },
      { months: 6,  total: 25500, saving: 1500 },
      { months: 12, total: 48000, saving: 6000 },
    ],
  },
};

function inr(n: number) {
  return "₹" + n.toLocaleString("en-IN");
}

// ── ModeButton ────────────────────────────────────────────────────────────

interface ModeButtonProps {
  config: ModeConfig;
  active: boolean;
  onClick: () => void;
  className?: string;
  iconSize?: number;
}

function ModeButton({ config, active, onClick, className = "", iconSize = 18 }: ModeButtonProps) {
  const { Icon, label } = config;
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handlePointerEnter = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    if (active) return;
    if (hoverTimerRef.current) { clearTimeout(hoverTimerRef.current); hoverTimerRef.current = null; }
    hoverTimerRef.current = setTimeout(() => {
      hoverTimerRef.current = null;
      onClick();
    }, 150);
  };

  const handlePointerLeave = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    if (hoverTimerRef.current) { clearTimeout(hoverTimerRef.current); hoverTimerRef.current = null; }
  };

  const handleClick = () => {
    if (hoverTimerRef.current) { clearTimeout(hoverTimerRef.current); hoverTimerRef.current = null; }
    onClick();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (!["ArrowRight","ArrowDown","ArrowLeft","ArrowUp","Home","End"].includes(e.key)) return;
    e.preventDefault();
    if (hoverTimerRef.current) { clearTimeout(hoverTimerRef.current); hoverTimerRef.current = null; }
    const group = e.currentTarget.closest("[data-managed-mode-group]");
    if (!group) return;
    const btns = Array.from(group.querySelectorAll<HTMLButtonElement>("[data-managed-mode-button]"));
    const cur = btns.indexOf(e.currentTarget);
    const n = btns.length;
    let next = cur;
    if      (e.key === "ArrowRight" || e.key === "ArrowDown") next = (cur + 1) % n;
    else if (e.key === "ArrowLeft"  || e.key === "ArrowUp")   next = (cur - 1 + n) % n;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End")  next = n - 1;
    const target = btns[next];
    if (target) { target.focus(); target.click(); }
  };

  useEffect(() => {
    return () => { if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current); };
  }, []);

  return (
    <button
      type="button"
      onClick={handleClick}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onKeyDown={handleKeyDown}
      aria-pressed={active}
      aria-controls="managed-mode-panel"
      tabIndex={active ? 0 : -1}
      data-managed-mode-button={config.id}
      className={[
        "flex flex-col items-center justify-center gap-[6px] rounded-[16px] border",
        "transition-all duration-[170ms]",
        "motion-reduce:transition-none motion-reduce:transform-none",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0057F2]",
        active
          ? "bg-[#0057F2] border-[#0057F2] -translate-y-[2px] shadow-[0_10px_26px_rgba(0,87,242,.23)]"
          : "border-[#CDDDF5] shadow-[0_6px_18px_rgba(36,72,126,.11)]",
        className,
      ].join(" ")}
      style={{
        fontFamily: SANS,
        background: active ? "#0057F2" : "rgba(255,255,255,.94)",
      }}
    >
      <Icon
        size={iconSize}
        strokeWidth={2}
        style={{ color: active ? "#fff" : "#315A91" }}
      />
      <span
        className="text-[14px] font-[700] leading-none"
        style={{ color: active ? "#fff" : "#44566F" }}
      >
        {label}
      </span>
    </button>
  );
}

// ── PropertyCore (desktop 2.5D stack) ────────────────────────────────────

function PropertyCore() {
  return (
    <div className="relative mx-auto" style={{ width: 168, height: 168 }}>
      {/* Back layer */}
      <div
        className="absolute rounded-[24px]"
        style={{ width: 152, height: 152, top: 8, left: 8, background: "#DCE8FF" }}
      />
      {/* Middle layer */}
      <div
        className="absolute rounded-[24px]"
        style={{ width: 152, height: 152, top: 4, left: 4, background: "#BBD1FF" }}
      />
      {/* Front layer */}
      <div
        className="absolute rounded-[24px] flex flex-col items-center justify-center"
        style={{
          width: 152,
          height: 152,
          top: 0,
          left: 0,
          background: "linear-gradient(145deg, #0B2857 0%, #0B1C3B 55%, #071426 100%)",
          boxShadow: "0 18px 34px rgba(7,20,38,.20), 0 5px 12px rgba(0,87,242,.10)",
          gap: 5,
        }}
      >
        <p
          style={{
            fontFamily: SANS,
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: "0.12em",
            color: "#A8C4F0",
            textTransform: "uppercase",
          }}
        >
          YOUR PROPERTY
        </p>
        <Building2 size={48} color="#C7DBFF" strokeWidth={1.6} />
        {/* MANAGED status capsule */}
        <div
          className="flex items-center gap-[5px] rounded-full"
          style={{
            background: "rgba(0,87,242,.28)",
            border: "1px solid rgba(100,160,255,.35)",
            boxShadow: "0 0 10px rgba(0,87,242,.20)",
            paddingLeft: 12,
            paddingRight: 12,
            height: 30,
          }}
        >
          <div
            className="rounded-full flex-shrink-0"
            style={{ width: 6, height: 6, background: "#60A5FA" }}
          />
          <span
            style={{
              fontFamily: SANS,
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.1em",
              color: "#EAF2FF",
              textTransform: "uppercase",
            }}
          >
            MANAGED
          </span>
        </div>
      </div>
    </div>
  );
}

// ── DesktopControlMap (≥1240px radial layout) ────────────────────────────

const CONNECTOR_COORDS: Record<ManagedMode, [number, number]> = {
  visits:  [18, 17],
  tenant:  [82, 17],
  records: [18, 83],
  repairs: [82, 83],
};

function DesktopControlMap({
  activeMode,
  setActiveMode,
}: {
  activeMode: ManagedMode;
  setActiveMode: (m: ManagedMode) => void;
}) {
  return (
    <div className="relative w-full" style={{ minHeight: 380 }}>
      {/* SVG connector overlay */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {MODES.map((m) => {
          const [sx, sy] = CONNECTOR_COORDS[m.id];
          const isActive = activeMode === m.id;
          // Paths terminate just short of center so they read as disappearing under the Core
          const ex = sx < 50 ? 47 : 53;
          const ey = sy < 50 ? 47 : 53;
          return (
            <path
              key={m.id}
              d={`M ${sx} ${sy} Q ${sx} 50 ${ex} ${ey}`}
              fill="none"
              stroke={isActive ? "#0057F2" : "#C8D8F3"}
              strokeWidth={isActive ? 2 : 1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              className="transition-all duration-[240ms] motion-reduce:transition-none"
            />
          );
        })}
      </svg>

      {/* 3×3 control grid */}
      <div
        role="group"
        aria-label="Managed service areas"
        data-managed-mode-group="true"
        className="relative z-10 grid items-center justify-items-center"
        style={{
          gridTemplateColumns: "112px 1fr 112px",
          gridTemplateRows: "auto auto auto",
          rowGap: 40,
          columnGap: 16,
          padding: "16px 0",
        }}
      >
        <ModeButton config={MODES[0]} active={activeMode === "visits"}  onClick={() => setActiveMode("visits")}  iconSize={22} className="w-[112px] h-[66px]" />
        <div />
        <ModeButton config={MODES[1]} active={activeMode === "tenant"}  onClick={() => setActiveMode("tenant")}  iconSize={22} className="w-[112px] h-[66px]" />
        <div />
        <PropertyCore />
        <div />
        <ModeButton config={MODES[2]} active={activeMode === "records"} onClick={() => setActiveMode("records")} iconSize={22} className="w-[112px] h-[66px]" />
        <div />
        <ModeButton config={MODES[3]} active={activeMode === "repairs"} onClick={() => setActiveMode("repairs")} iconSize={22} className="w-[112px] h-[66px]" />
      </div>
    </div>
  );
}

// ── Artifacts ─────────────────────────────────────────────────────────────

function VisitsArtifact() {
  return (
    <div aria-hidden="true">
      <img
        src="/images/managed_visits.webp"
        alt=""
        role="presentation"
        width={1536}
        height={1024}
        loading="lazy"
        decoding="async"
        className="block w-full h-auto object-contain max-w-[290px] sm:max-w-[380px] min-[1240px]:max-w-[430px] mx-auto min-[1240px]:mx-0"
      />
    </div>
  );
}

function TenantArtifact() {
  return (
    <div aria-hidden="true" className="w-full">
      {/* Shared SVG marker defs — referenced by both BidiArrow instances */}
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true" focusable="false">
        <defs>
          <marker id="pmb-arr-l" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto-start-reverse">
            <path d="M0 0 L6 3 L0 6 z" fill="#0057F2" />
          </marker>
          <marker id="pmb-arr-r" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
            <path d="M0 0 L6 3 L0 6 z" fill="#0057F2" />
          </marker>
        </defs>
      </svg>

      {/* ≥640px: polished horizontal layout */}
      <div className="hidden sm:flex flex-col gap-3">
        <div className="flex items-center gap-2">
          {/* Tenant card */}
          <div className="flex-1 flex flex-col items-center gap-[6px] rounded-[14px] border border-[#DCE7F8] bg-white px-4 py-3 shadow-[0_8px_22px_rgba(36,72,126,.11)]">
            <UserRound size={22} strokeWidth={1.8} style={{ color: "#315A91" }} />
            <span className="text-[12px] font-[700] uppercase tracking-[0.08em] text-[#44566F]" style={{ fontFamily: SANS }}>TENANT</span>
          </div>
          {/* Bidirectional connector */}
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
            <line x1="3" y1="12" x2="21" y2="12" stroke="#0057F2" strokeWidth="1.5"
              markerStart="url(#pmb-arr-l)" markerEnd="url(#pmb-arr-r)" />
          </svg>
          {/* Reeve card */}
          <div
            className="flex-[1.1] flex flex-col items-center gap-[7px] rounded-[14px] border border-[#0057F2] px-4 py-4 shadow-[0_10px_26px_rgba(0,87,242,.22)]"
            style={{ background: "#0057F2" }}
          >
            <div
              className="flex items-center justify-center rounded-full"
              style={{ width: 46, height: 46, border: "1.5px solid rgba(255,255,255,.55)" }}
            >
              <span className="text-[20px] font-[700] text-white leading-none" style={{ fontFamily: SANS }}>R</span>
            </div>
            <span className="text-[12px] font-[700] uppercase tracking-[0.08em] text-white" style={{ fontFamily: SANS }}>REEVE</span>
          </div>
          {/* Bidirectional connector */}
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
            <line x1="3" y1="12" x2="21" y2="12" stroke="#0057F2" strokeWidth="1.5"
              markerStart="url(#pmb-arr-l)" markerEnd="url(#pmb-arr-r)" />
          </svg>
          {/* Owner card */}
          <div className="flex-1 flex flex-col items-center gap-[6px] rounded-[14px] border border-[#DCE7F8] bg-white px-4 py-3 shadow-[0_8px_22px_rgba(36,72,126,.11)]">
            <Home size={22} strokeWidth={1.8} style={{ color: "#315A91" }} />
            <span className="text-[12px] font-[700] uppercase tracking-[0.08em] text-[#44566F]" style={{ fontFamily: SANS }}>OWNER</span>
          </div>
        </div>
        {/* Status pills */}
        <div className="flex flex-wrap gap-2">
          {["CHECK-IN ✓", "ACCESS · COORDINATED", "RENEWAL · TRACKED"].map((pill) => (
            <span
              key={pill}
              className="rounded-full px-3 py-1 text-[12px] font-[700] text-[#1D4ED8]"
              style={{ fontFamily: SANS, background: "#EBF2FF" }}
            >
              {pill}
            </span>
          ))}
        </div>
      </div>

      {/* <640px: compact 5-column grid, no pills */}
      <div className="sm:hidden">
        <div
          className="grid items-center"
          style={{ gridTemplateColumns: "minmax(0,1fr) 14px minmax(0,1.1fr) 14px minmax(0,1fr)" }}
        >
          <div className="flex flex-col items-center gap-[4px] rounded-[12px] border border-[#DCE7F8] bg-white py-[10px] px-2 shadow-[0_8px_22px_rgba(36,72,126,.11)] min-w-0">
            <UserRound size={18} strokeWidth={1.8} style={{ color: "#315A91" }} />
            <span className="text-[11px] font-[700] text-[#44566F]" style={{ fontFamily: SANS }}>TENANT</span>
          </div>
          <div className="flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <line x1="3" y1="12" x2="21" y2="12" stroke="#0057F2" strokeWidth="1.5"
                markerStart="url(#pmb-arr-l)" markerEnd="url(#pmb-arr-r)" />
            </svg>
          </div>
          <div
            className="flex flex-col items-center gap-[5px] rounded-[12px] border border-[#0057F2] py-[10px] px-2 shadow-[0_10px_26px_rgba(0,87,242,.22)] min-w-0"
            style={{ background: "#0057F2" }}
          >
            <div
              className="flex items-center justify-center rounded-full"
              style={{ width: 34, height: 34, border: "1.5px solid rgba(255,255,255,.55)" }}
            >
              <span className="text-[14px] font-[700] text-white leading-none" style={{ fontFamily: SANS }}>R</span>
            </div>
            <span className="text-[11px] font-[700] text-white" style={{ fontFamily: SANS }}>REEVE</span>
          </div>
          <div className="flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <line x1="3" y1="12" x2="21" y2="12" stroke="#0057F2" strokeWidth="1.5"
                markerStart="url(#pmb-arr-l)" markerEnd="url(#pmb-arr-r)" />
            </svg>
          </div>
          <div className="flex flex-col items-center gap-[4px] rounded-[12px] border border-[#DCE7F8] bg-white py-[10px] px-2 shadow-[0_8px_22px_rgba(36,72,126,.11)] min-w-0">
            <Home size={18} strokeWidth={1.8} style={{ color: "#315A91" }} />
            <span className="text-[11px] font-[700] text-[#44566F]" style={{ fontFamily: SANS }}>OWNER</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function RepairsArtifact() {
  const zeroPill = (
    <div className="flex mt-3">
      <div
        className="flex items-center gap-[6px] rounded-full border border-[#BBF7D0] px-4"
        style={{ background: "#F0FDF4", height: 34 }}
      >
        <Check size={13} strokeWidth={2.5} style={{ color: "#16A34A" }} />
        <span className="text-[13px] font-[700] text-[#15803D]" style={{ fontFamily: SANS }}>REEVE MARKUP ₹0</span>
      </div>
    </div>
  );

  return (
    <div aria-hidden="true" className="w-full">
      {/* ≥768px: horizontal rail */}
      <div className="hidden md:block">
        <div className="flex items-center">
          <div className="flex flex-col items-center gap-[6px] rounded-[14px] border border-[#DCE7F8] bg-white px-3 py-3 shadow-[0_8px_22px_rgba(36,72,126,.11)]" style={{ minWidth: 70 }}>
            <AlertTriangle size={20} strokeWidth={1.8} style={{ color: "#315A91" }} />
            <span className="text-[11px] font-[700] uppercase tracking-[0.07em] text-[#44566F]" style={{ fontFamily: SANS }}>ISSUE</span>
          </div>
          {/* connector ●——● */}
          <div className="flex-1 flex items-center px-[3px]">
            <div className="w-[5px] h-[5px] rounded-full bg-[#A8C4F0] flex-shrink-0" />
            <div className="h-px flex-1 bg-[#A8C4F0]" />
            <div className="w-[5px] h-[5px] rounded-full bg-[#A8C4F0] flex-shrink-0" />
          </div>
          <div className="flex flex-col items-center gap-[4px] rounded-[14px] border border-[#DCE7F8] bg-white px-3 py-3 shadow-[0_8px_22px_rgba(36,72,126,.11)]" style={{ minWidth: 70 }}>
            <span className="text-[16px] font-[700] text-[#44566F]" style={{ fontFamily: SANS }}>₹4,600</span>
            <span className="text-[11px] font-[700] uppercase tracking-[0.07em] text-[#44566F]" style={{ fontFamily: SANS }}>ESTIMATE</span>
          </div>
          <div className="flex-1 flex items-center px-[3px]">
            <div className="w-[5px] h-[5px] rounded-full bg-[#A8C4F0] flex-shrink-0" />
            <div className="h-px flex-1 bg-[#A8C4F0]" />
            <div className="w-[5px] h-[5px] rounded-full bg-[#A8C4F0] flex-shrink-0" />
          </div>
          <div className="flex flex-col items-center gap-[4px] rounded-[14px] border border-[#DCE7F8] bg-white px-3 py-3 shadow-[0_8px_22px_rgba(36,72,126,.11)]" style={{ minWidth: 70 }}>
            <Check size={20} strokeWidth={2.2} style={{ color: "#16A34A" }} />
            <span className="text-[10px] font-[500] text-[#44566F]" style={{ fontFamily: SANS }}>Written</span>
            <span className="text-[11px] font-[700] uppercase tracking-[0.07em] text-[#44566F]" style={{ fontFamily: SANS }}>APPROVAL</span>
          </div>
          <div className="flex-1 flex items-center px-[3px]">
            <div className="w-[5px] h-[5px] rounded-full bg-[#A8C4F0] flex-shrink-0" />
            <div className="h-px flex-1 bg-[#A8C4F0]" />
            <div className="w-[5px] h-[5px] rounded-full bg-[#A8C4F0] flex-shrink-0" />
          </div>
          <div className="flex flex-col items-center gap-[6px] rounded-[14px] border border-[#DCE7F8] bg-white px-3 py-3 shadow-[0_8px_22px_rgba(36,72,126,.11)]" style={{ minWidth: 70 }}>
            <CheckCircle size={20} strokeWidth={2} style={{ color: "#0057F2" }} />
            <span className="text-[11px] font-[700] uppercase tracking-[0.07em] text-[#44566F]" style={{ fontFamily: SANS }}>COMPLETE</span>
          </div>
        </div>
        {zeroPill}
      </div>

      {/* <768px: 2×2 grid, no connectors */}
      <div className="md:hidden">
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col items-center gap-[6px] rounded-[14px] border border-[#DCE7F8] bg-white py-3 px-3 shadow-[0_8px_22px_rgba(36,72,126,.11)]">
            <AlertTriangle size={20} strokeWidth={1.8} style={{ color: "#315A91" }} />
            <span className="text-[11px] font-[700] uppercase tracking-[0.07em] text-[#44566F]" style={{ fontFamily: SANS }}>ISSUE</span>
          </div>
          <div className="flex flex-col items-center gap-[4px] rounded-[14px] border border-[#DCE7F8] bg-white py-3 px-3 shadow-[0_8px_22px_rgba(36,72,126,.11)]">
            <span className="text-[16px] font-[700] text-[#44566F]" style={{ fontFamily: SANS }}>₹4,600</span>
            <span className="text-[11px] font-[700] uppercase tracking-[0.07em] text-[#44566F]" style={{ fontFamily: SANS }}>ESTIMATE</span>
          </div>
          <div className="flex flex-col items-center gap-[4px] rounded-[14px] border border-[#DCE7F8] bg-white py-3 px-3 shadow-[0_8px_22px_rgba(36,72,126,.11)]">
            <Check size={20} strokeWidth={2.2} style={{ color: "#16A34A" }} />
            <span className="text-[10px] font-[500] text-[#44566F]" style={{ fontFamily: SANS }}>Written</span>
            <span className="text-[11px] font-[700] uppercase tracking-[0.07em] text-[#44566F]" style={{ fontFamily: SANS }}>APPROVAL</span>
          </div>
          <div className="flex flex-col items-center gap-[6px] rounded-[14px] border border-[#DCE7F8] bg-white py-3 px-3 shadow-[0_8px_22px_rgba(36,72,126,.11)]">
            <CheckCircle size={20} strokeWidth={2} style={{ color: "#0057F2" }} />
            <span className="text-[11px] font-[700] uppercase tracking-[0.07em] text-[#44566F]" style={{ fontFamily: SANS }}>COMPLETE</span>
          </div>
        </div>
        {zeroPill}
      </div>
    </div>
  );
}

function RecordsArtifact() {
  const ROWS = ["Inspection", "Repair record", "Statement", "Agreement"];

  return (
    <div
      aria-hidden="true"
      className="mx-auto min-[1240px]:mx-0 w-full max-w-[290px] sm:max-w-[390px]"
    >
      {/* Phone: compact stack — 38px offsets expose each header (~29px) fully */}
      <div className="relative sm:hidden overflow-visible" style={{ height: 215 }}>
        <div
          className="absolute rounded-[14px] border border-[#DCE7F8] shadow-[0_8px_22px_rgba(36,72,126,.11)] overflow-hidden"
          style={{ top: 0, height: 215, left: 4, right: 4, background: "#F8FAFF" }}
        >
          <div className="rounded-t-[14px] px-4 py-[9px]" style={{ background: "#0B1C3B" }}>
            <span className="text-[11px] font-[700] uppercase tracking-[0.1em] text-white" style={{ fontFamily: SANS }}>JAN</span>
          </div>
        </div>
        <div
          className="absolute rounded-[14px] border border-[#DCE7F8] shadow-[0_8px_22px_rgba(36,72,126,.11)] overflow-hidden"
          style={{ top: 38, height: 177, left: 2, right: 2, background: "#F4F8FF" }}
        >
          <div className="rounded-t-[14px] px-4 py-[9px]" style={{ background: "#0B1C3B" }}>
            <span className="text-[11px] font-[700] uppercase tracking-[0.1em] text-white" style={{ fontFamily: SANS }}>FEB</span>
          </div>
        </div>
        <div
          className="absolute rounded-[14px] border border-[#DCE7F8] shadow-[0_8px_22px_rgba(36,72,126,.11)] overflow-hidden bg-white"
          style={{ top: 76, height: 139, left: 0, right: 0 }}
        >
          <div className="rounded-t-[14px] px-4 py-[9px]" style={{ background: "#0B1C3B" }}>
            <span className="text-[11px] font-[700] uppercase tracking-[0.1em] text-white" style={{ fontFamily: SANS }}>MARCH</span>
          </div>
          <div className="px-4 py-2 space-y-[5px]">
            {ROWS.map((r) => (
              <div key={r} className="flex items-center gap-[7px]">
                <div className="w-[5px] h-[5px] rounded-full flex-shrink-0" style={{ background: "#0057F2" }} />
                <span className="text-[12px] font-[500] text-[#3D5272]" style={{ fontFamily: SANS }}>{r}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* sm+: larger stack — 40px offsets expose each header (~31px) fully */}
      <div className="relative hidden sm:block overflow-visible" style={{ height: 240 }}>
        <div
          className="absolute rounded-[14px] border border-[#DCE7F8] shadow-[0_8px_22px_rgba(36,72,126,.11)] overflow-hidden"
          style={{ top: 0, height: 240, left: 4, right: 4, background: "#F8FAFF" }}
        >
          <div className="rounded-t-[14px] px-4 py-[10px]" style={{ background: "#0B1C3B" }}>
            <span className="text-[11px] font-[700] uppercase tracking-[0.1em] text-white" style={{ fontFamily: SANS }}>JAN</span>
          </div>
        </div>
        <div
          className="absolute rounded-[14px] border border-[#DCE7F8] shadow-[0_8px_22px_rgba(36,72,126,.11)] overflow-hidden"
          style={{ top: 40, height: 200, left: 2, right: 2, background: "#F4F8FF" }}
        >
          <div className="rounded-t-[14px] px-4 py-[10px]" style={{ background: "#0B1C3B" }}>
            <span className="text-[11px] font-[700] uppercase tracking-[0.1em] text-white" style={{ fontFamily: SANS }}>FEB</span>
          </div>
        </div>
        <div
          className="absolute rounded-[14px] border border-[#DCE7F8] shadow-[0_8px_22px_rgba(36,72,126,.11)] overflow-hidden bg-white"
          style={{ top: 80, height: 160, left: 0, right: 0 }}
        >
          <div className="rounded-t-[14px] px-4 py-[10px]" style={{ background: "#0B1C3B" }}>
            <span className="text-[11px] font-[700] uppercase tracking-[0.1em] text-white" style={{ fontFamily: SANS }}>MARCH</span>
          </div>
          <div className="px-4 py-3 space-y-[7px]">
            {ROWS.map((r) => (
              <div key={r} className="flex items-center gap-[8px]">
                <div className="w-[6px] h-[6px] rounded-full flex-shrink-0" style={{ background: "#0057F2" }} />
                <span className="text-[13px] font-[500] text-[#3D5272]" style={{ fontFamily: SANS }}>{r}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── ActiveDetailContent ───────────────────────────────────────────────────

function ActiveDetailContent({ activeMode }: { activeMode: ManagedMode }) {
  const config = MODES.find((m) => m.id === activeMode)!;
  const { Icon } = config;

  return (
    <div key={activeMode} className="pmb-mode-enter">
      {/* Mode label row */}
      <div className="flex items-center gap-[7px] mb-2">
        <Icon size={18} strokeWidth={2} style={{ color: "#0057F2", flexShrink: 0 }} />
        <p
          className="text-[11px] font-[700] uppercase tracking-[0.1em]"
          style={{ fontFamily: SANS, color: "#0057F2" }}
        >
          {config.modeLabel}
        </p>
      </div>

      {/* H3 */}
      <h3
        className="text-[20px] min-[1240px]:text-[23px] font-[700] leading-[1.2] text-[#0B1526] mb-4"
        style={{ fontFamily: SANS }}
      >
        {config.h3}
      </h3>

      {/* Facts */}
      <ul className="space-y-[8px] mb-5 min-[1240px]:mb-6">
        {config.facts.map((fact) => (
          <li key={fact} className="flex items-start gap-[10px]">
            <span
              className="mt-[6px] rounded-full flex-shrink-0"
              style={{ width: 8, height: 8, background: "#0057F2" }}
            />
            <span
              className="text-[14px] min-[1240px]:text-[15px] font-[500] leading-[1.4] text-[#46566B]"
              style={{ fontFamily: SANS }}
            >
              {fact}
            </span>
          </li>
        ))}
      </ul>

      {/* Mode artifact */}
      {activeMode === "visits"  && <VisitsArtifact />}
      {activeMode === "tenant"  && <TenantArtifact />}
      {activeMode === "repairs" && <RepairsArtifact />}
      {activeMode === "records" && <RecordsArtifact />}
    </div>
  );
}

// ── ManagedControlSection ─────────────────────────────────────────────────

function ManagedControlSection() {
  const [activeMode, setActiveMode] = useState<ManagedMode>("visits");

  const modeTouchStartRef = useRef<{ x: number; y: number } | null>(null);

  const handleModeTouchStart = (e: React.TouchEvent) => {
    if (window.innerWidth >= 1240 || e.touches.length !== 1) {
      modeTouchStartRef.current = null;
      return;
    }
    const t = e.touches[0];
    modeTouchStartRef.current = { x: t.clientX, y: t.clientY };
  };

  const handleModeTouchEnd = (e: React.TouchEvent) => {
    if (!modeTouchStartRef.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - modeTouchStartRef.current.x;
    const dy = t.clientY - modeTouchStartRef.current.y;
    modeTouchStartRef.current = null;
    if (Math.abs(dx) < 50 || Math.abs(dx) <= Math.abs(dy)) return;
    setActiveMode((prev) => {
      const idx = MODES.findIndex((m) => m.id === prev);
      if (dx < 0 && idx < MODES.length - 1) return MODES[idx + 1].id as ManagedMode;
      if (dx > 0 && idx > 0)                return MODES[idx - 1].id as ManagedMode;
      return prev;
    });
  };

  const handleModeTouchCancel = () => { modeTouchStartRef.current = null; };

  return (
    <section
      id="managed-control"
      aria-labelledby="managed-control-heading"
      className="pt-[52px] pb-[56px] min-[1180px]:pt-[88px] min-[1180px]:pb-[92px]"
      style={{
        background: `
          radial-gradient(700px 420px at 14% 44%, rgba(0,87,242,.075), transparent 70%),
          radial-gradient(600px 360px at 88% 18%, rgba(37,99,235,.045), transparent 72%),
          #F3F7FF
        `,
      }}
    >
      <div className="mx-auto max-w-[1240px] px-5 sm:px-8 lg:px-10">

        {/* Section header */}
        <p
          className="text-[11px] sm:text-[12px] font-[700] uppercase tracking-[0.14em]"
          style={{ fontFamily: SANS, color: "#0057F2" }}
        >
          WHAT REEVE MANAGED HANDLES
        </p>
        <h2
          id="managed-control-heading"
          className="mt-3 max-w-[820px] text-[32px] sm:text-[36px] min-[1240px]:text-[clamp(38px,3.3vw,44px)] font-normal leading-[1.05] tracking-[-0.018em] text-[#0B1526]"
          style={{ fontFamily: SERIF }}
        >
          Your property keeps moving. You don&#8217;t have to manage every move.
        </h2>
        <p
          className="mt-[14px] max-w-[650px] text-[15.5px] min-[1240px]:text-[17px] font-[500] leading-[1.5] text-[#536176]"
          style={{ fontFamily: SANS }}
        >
          Visits, tenant communication, repair coordination and property records stay connected in one operating flow.
        </p>

        {/* Main interactive surface */}
        <div
          className="mt-6 min-[1240px]:mt-8 rounded-[24px] border border-[#DCE7F8] shadow-[0_20px_60px_rgba(36,72,126,.10)]"
          style={{
            background:
              "linear-gradient(135deg, rgba(255,255,255,.98) 0%, rgba(250,252,255,.98) 52%, rgba(244,248,255,.98) 100%)",
          }}
        >
          <div className="flex flex-col min-[1240px]:flex-row min-[1240px]:min-h-[480px]">

            {/* Controls column */}
            <div className="min-[1240px]:w-[42%] min-[1240px]:flex-none min-[1240px]:p-8 min-[1240px]:flex min-[1240px]:items-center min-[1240px]:justify-center">

              {/* A. Radial map — ≥1240px only */}
              <div className="hidden min-[1240px]:block w-full">
                <DesktopControlMap activeMode={activeMode} setActiveMode={setActiveMode} />
              </div>

              {/* B. Horizontal row — 640px–1239px */}
              <div role="group" aria-label="Managed service areas" data-managed-mode-group="true" className="hidden sm:flex min-[1240px]:hidden gap-3 w-full p-6">
                {MODES.map((m) => (
                  <ModeButton
                    key={m.id}
                    config={m}
                    active={activeMode === m.id}
                    onClick={() => setActiveMode(m.id)}
                    className="flex-1 py-3 px-2"
                  />
                ))}
              </div>

              {/* C. 2×2 grid — <640px */}
              <div role="group" aria-label="Managed service areas" data-managed-mode-group="true" className="sm:hidden grid grid-cols-2 gap-2 p-4">
                {MODES.map((m) => (
                  <ModeButton
                    key={m.id}
                    config={m}
                    active={activeMode === m.id}
                    onClick={() => setActiveMode(m.id)}
                    className="min-h-[52px] py-3 px-2"
                  />
                ))}
              </div>
            </div>

            {/* Vertical divider — desktop only */}
            <div className="hidden min-[1240px]:block w-px bg-[#E1EAF7] self-stretch my-6" />

            {/* Single shared detail panel */}
            <div
              id="managed-mode-panel"
              aria-live="polite"
              onTouchStart={handleModeTouchStart}
              onTouchEnd={handleModeTouchEnd}
              onTouchCancel={handleModeTouchCancel}
              style={{ touchAction: "pan-y pinch-zoom" }}
              className="flex-1 min-w-0
                mx-4 mb-4 rounded-[18px] border border-[#DCE7F8]
                bg-white p-[18px] shadow-[0_8px_24px_rgba(36,72,126,.08)]
                sm:mx-6 sm:mb-6 sm:p-5
                min-[1240px]:m-0 min-[1240px]:rounded-none
                min-[1240px]:border-0 min-[1240px]:bg-transparent
                min-[1240px]:p-8 min-[1240px]:shadow-none"
            >
              <ActiveDetailContent activeMode={activeMode} />
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}

// ── Section 3: Pricing ────────────────────────────────────────────────────

function PropertyRateCard() {
  return (
    <div
      className="rounded-[24px] border p-[18px] sm:p-[26px]"
      style={{
        background: "linear-gradient(145deg, rgba(13,35,72,.97) 0%, rgba(7,20,38,.99) 100%)",
        borderColor: "rgba(143,183,255,.22)",
        boxShadow: "0 28px 72px rgba(0,0,0,.24), inset 0 1px 0 rgba(255,255,255,.035)",
      }}
    >
      <div
        aria-hidden="true"
        style={{ background: "radial-gradient(circle, rgba(0,87,242,.14) 0%, rgba(0,87,242,.04) 46%, transparent 72%)" }}
      >
        <img
          src="/images/managed_3.webp"
          alt=""
          role="presentation"
          width={1536}
          height={1024}
          loading="lazy"
          decoding="async"
          className="block w-full h-auto object-contain max-w-[290px] sm:max-w-[400px] min-[1240px]:max-w-[420px] mx-auto"
        />
      </div>

      <p
        className="mt-3 text-[12.5px] min-[1240px]:text-[13px] font-[500] text-center"
        style={{ fontFamily: SANS, color: "#9FB0C8" }}
      >
        Example &middot; property up to 3 BHK
      </p>

      <div className="mt-4 flex justify-between items-end mb-4">
        <div>
          <p className="text-[11px] font-[700] uppercase tracking-[0.10em]"
             style={{ fontFamily: SANS, color: "#6EA6FF" }}>RENTED</p>
          <p className="text-[22px] sm:text-[25px] font-[700] text-white leading-tight" style={{ fontFamily: SANS }}>
            &#8377;3,000<span className="text-[12px] font-[500]" style={{ color: "#8AA8CC" }}>/mo</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-[11px] font-[700] uppercase tracking-[0.10em]"
             style={{ fontFamily: SANS, color: "#53C9BC" }}>EMPTY</p>
          <p className="text-[22px] sm:text-[25px] font-[700] text-white leading-tight" style={{ fontFamily: SANS }}>
            &#8377;2,000<span className="text-[12px] font-[500]" style={{ color: "#8AA8CC" }}>/mo</span>
          </p>
        </div>
      </div>

      <div className="relative pt-6">
        <p
          className="absolute left-1/2 -translate-x-1/2 top-0 text-[10.5px] font-[700] uppercase tracking-[0.08em] whitespace-nowrap"
          style={{ fontFamily: SANS, color: "#F47A60" }}
        >
          KEYS RETURNED
        </p>
        <div
          className="relative h-[2px] w-full rounded-full"
          style={{ background: "linear-gradient(90deg, #0057F2 0%, #5C74E8 30%, #F46F52 52%, #A39A84 68%, #0F9F8F 100%)" }}
        >
          <div
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full border-2"
            style={{ borderColor: "#0057F2", background: "#0A1C3A" }}
          />
          <div
            className="absolute left-1/2 top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full border-2"
            style={{ borderColor: "#F46F52", background: "#0A1C3A" }}
          />
          <div
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3 h-3 rounded-full border-2"
            style={{ borderColor: "#0F9F8F", background: "#0A1C3A" }}
          />
        </div>
      </div>

      <div className="mt-5">
        <p className="text-[13.5px] font-[600]" style={{ fontFamily: SANS, color: "#C8D4E5" }}>
          No cancellation. No new agreement.
        </p>
        <p className="mt-[5px] text-[13px] font-[500]" style={{ fontFamily: SANS, color: "#9FB1C9" }}>
          Tenant takes possession &#8594; rented rate returns
        </p>
      </div>
    </div>
  );
}

function PricingCard({
  propType,
  setPropType,
}: {
  propType: PropType;
  setPropType: (t: PropType) => void;
}) {
  return (
    <div
      className="rounded-[24px] border p-[20px] sm:p-[30px]"
      style={{
        background: "#FCFDFF",
        borderColor: "#DFE8F5",
        boxShadow: "0 28px 75px rgba(0,0,0,.22)",
      }}
    >
      <p
        className="text-[11px] font-[700] uppercase tracking-[0.11em]"
        style={{ fontFamily: SANS, color: "#0057F2" }}
      >
        MANAGED PRICING
      </p>
      <h3
        className="mt-[6px] text-[21px] sm:text-[24px] font-[700] leading-[1.15] text-[#0B1526]"
        style={{ fontFamily: SANS }}
      >
        Simple pricing. No quote required.
      </h3>
      <p
        className="mt-[8px] text-[14px] sm:text-[14.5px] font-[500] text-[#536176]"
        style={{ fontFamily: SANS }}
      >
        Minimum 3 months. Starts after the first 3-month payment.
      </p>

      <div className="mt-5 rounded-[13px] border overflow-hidden" style={{ borderColor: "#DDE6F2" }}>
        <table className="w-full border-collapse" style={{ tableLayout: "fixed" }}>
          <thead>
            <tr>
              <th scope="col" className="py-[10px] px-3 w-[40%]" aria-hidden="true" />
              <th
                scope="col"
                className="py-[10px] px-2 text-[11px] sm:text-[12px] font-[700] uppercase tracking-[0.07em] text-center"
                style={{ background: "#EAF1FF", color: "#0057F2", fontFamily: SANS }}
              >
                RENTED
              </th>
              <th
                scope="col"
                className="py-[10px] px-2 text-[11px] sm:text-[12px] font-[700] uppercase tracking-[0.07em] text-center"
                style={{ background: "#E9F9F6", color: "#0F8E80", fontFamily: SANS }}
              >
                EMPTY
              </th>
            </tr>
          </thead>
          <tbody>
            {(["3bhk", "4bhk"] as PropType[]).map((type, i) => {
              const p = PRICING[type];
              return (
                <tr key={type} className={i > 0 ? "border-t" : ""} style={{ borderColor: "#E4EBF4" }}>
                  <th
                    scope="row"
                    className="py-3 px-3 text-left text-[12px] sm:text-[13px] font-[700] text-[#2F4059] align-middle"
                    style={{ fontFamily: SANS }}
                  >
                    {p.label}
                  </th>
                  <td className="py-3 px-2 text-center align-middle">
                    <span
                      className="block text-[20px] sm:text-[25px] font-[700] text-[#0B1526] leading-none"
                      style={{ fontFamily: SANS }}
                    >
                      {inr(p.rentedMonthly)}
                    </span>
                    <span
                      className="block text-[11px] sm:text-[12px] font-[500] text-[#68768B] mt-[2px]"
                      style={{ fontFamily: SANS }}
                    >
                      /month
                    </span>
                  </td>
                  <td className="py-3 px-2 text-center align-middle">
                    <span
                      className="block text-[20px] sm:text-[25px] font-[700] text-[#0B1526] leading-none"
                      style={{ fontFamily: SANS }}
                    >
                      {inr(p.emptyMonthly)}
                    </span>
                    <span
                      className="block text-[11px] sm:text-[12px] font-[500] text-[#68768B] mt-[2px]"
                      style={{ fontFamily: SANS }}
                    >
                      /month
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p
        className="mt-6 text-[11px] sm:text-[12px] font-[700] uppercase tracking-[0.10em]"
        style={{ fontFamily: SANS, color: "#0057F2" }}
      >
        PREPAID TERMS
      </p>

      <div className="mt-3 grid gap-2 sm:grid-cols-[0.9fr_1.25fr]">
        {(["3bhk", "4bhk"] as PropType[]).map((type) => {
          const active = propType === type;
          return (
            <button
              key={type}
              type="button"
              aria-pressed={active}
              aria-controls="managed-prepaid-prices"
              onClick={() => setPropType(type)}
              className="flex items-center justify-center rounded-[12px] border text-[13px] font-[700] leading-snug px-4 min-h-[48px] transition-all duration-[150ms] motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0057F2]"
              style={{
                fontFamily: SANS,
                background: active ? "#0057F2" : "#F2F5FA",
                borderColor: active ? "#0057F2" : "#DDE5F0",
                color: active ? "#fff" : "#43516A",
                boxShadow: active ? "0 5px 14px rgba(0,87,242,.16)" : undefined,
              }}
            >
              {PRICING[type].label}
            </button>
          );
        })}
      </div>

      <div id="managed-prepaid-prices" aria-live="polite" className="mt-5">
        {(["3bhk", "4bhk"] as PropType[]).map((type) => {
          const active = type === propType;
          return (
            <div
              key={active ? `${type}-active` : type}
              aria-hidden={!active ? true : undefined}
              className={active ? "pmb-price-enter" : ""}
              style={{ display: active ? undefined : "none" }}
            >
              <div className="hidden sm:grid grid-cols-3 gap-3">
                {PRICING[type].terms.map((term) => {
                  const isBest = term.months === 12;
                  return (
                    <div
                      key={term.months}
                      className="relative rounded-[14px] border p-[18px]"
                      style={{
                        background: isBest ? "#F6F9FF" : "#FFFFFF",
                        borderColor: isBest ? "#8CB2FF" : "#DFE7F2",
                        boxShadow: "0 7px 20px rgba(36,72,126,.07)",
                      }}
                    >
                      {isBest && (
                        <p
                          className="text-[10px] font-[700] uppercase tracking-[0.07em] text-white rounded-[4px] px-[6px] py-[3px] inline-block mb-[8px]"
                          style={{ background: "#0057F2", fontFamily: SANS }}
                        >
                          BEST VALUE
                        </p>
                      )}
                      <p
                        className="text-[12px] font-[700] uppercase tracking-[0.06em] mb-[6px]"
                        style={{ color: "#1E5ACD", fontFamily: SANS }}
                      >
                        {term.months} MONTHS
                      </p>
                      <p
                        className="text-[26px] font-[700] text-[#0B1526] leading-none"
                        style={{ fontFamily: SANS }}
                      >
                        {inr(term.total)}
                      </p>
                      {term.saving && (
                        <p
                          className="mt-[7px] inline-block text-[12px] font-[700] rounded-[6px] px-[7px] py-[3px]"
                          style={{ background: "#EAF1FF", color: "#0057F2", fontFamily: SANS }}
                        >
                          Save {inr(term.saving)}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="sm:hidden flex flex-col gap-2">
                {PRICING[type].terms.map((term) => {
                  const isBest = term.months === 12;
                  return (
                    <div
                      key={term.months}
                      className="flex items-center justify-between rounded-[12px] border min-h-[62px] px-4 py-3"
                      style={{
                        background: isBest ? "#F6F9FF" : "#FFFFFF",
                        borderColor: isBest ? "#8CB2FF" : "#DFE7F2",
                      }}
                    >
                      <div>
                        <p
                          className="text-[11px] font-[700] uppercase tracking-[0.07em]"
                          style={{ color: "#1E5ACD", fontFamily: SANS }}
                        >
                          {term.months} MONTHS
                        </p>
                        {isBest && (
                          <p
                            className="text-[10px] font-[700] uppercase tracking-[0.05em]"
                            style={{ color: "#0057F2", fontFamily: SANS }}
                          >
                            BEST VALUE
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p
                          className="text-[22px] font-[700] text-[#0B1526] leading-none"
                          style={{ fontFamily: SANS }}
                        >
                          {inr(term.total)}
                        </p>
                        {term.saving && (
                          <p
                            className="text-[11px] font-[700] mt-[3px]"
                            style={{ color: "#0057F2", fontFamily: SANS }}
                          >
                            Save {inr(term.saving)}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div
        className="mt-5 rounded-[16px] border p-[16px] sm:p-[18px]"
        style={{
          background: "#FFF4F0",
          borderColor: "#FFD1C5",
          boxShadow: "0 9px 24px rgba(244,111,82,.07)",
        }}
      >
        <div className="flex items-center gap-[7px] mb-[8px]">
          <KeyRound size={18} strokeWidth={2} style={{ color: "#D7583F", flexShrink: 0 }} />
          <p
            className="text-[11px] font-[700] uppercase tracking-[0.10em]"
            style={{ color: "#D7583F", fontFamily: SANS }}
          >
            TENANT PLACEMENT
          </p>
        </div>
        <p className="text-[22px] sm:text-[24px] font-[700] leading-none" style={{ fontFamily: SANS }}>
          <span style={{ color: "#0B1526" }}>&#8377;15,000</span>
          <span className="mx-[8px] text-[18px] font-[400]" style={{ color: "#A0ADB8" }}>&middot;</span>
          <span style={{ color: "#F46F52" }}>&#8377;0 upfront</span>
        </p>
        <p className="mt-[7px] text-[13.5px] font-[500] text-[#536176]" style={{ fontFamily: SANS }}>
          Pay when let &#8212; after the token reaches you.
        </p>
        <p className="mt-[8px] text-[12.5px] sm:text-[13px] font-[600]" style={{ color: "#B44B38", fontFamily: SANS }}>
          Unlimited viewings &middot; Same-tenant renewal free &middot; Agreement included
        </p>
      </div>
    </div>
  );
}

function ManagedPricingSection() {
  const [propType, setPropType] = useState<PropType>("3bhk");

  return (
    <section
      id="pricing"
      aria-labelledby="pricing-heading"
      className="scroll-mt-16 pt-[56px] pb-[60px] min-[1240px]:pt-[92px] min-[1240px]:pb-[96px]"
      style={{
        background: [
          "radial-gradient(760px 500px at 10% 20%, rgba(0,87,242,.22), transparent 70%)",
          "radial-gradient(650px 430px at 91% 45%, rgba(15,159,143,.10), transparent 72%)",
          "linear-gradient(180deg, #071426 0%, #081832 52%, #0A1C3A 100%)",
        ].join(", "),
      }}
    >
      <div className="mx-auto max-w-[1240px] px-5 sm:px-8 lg:px-10">
        <div className="flex flex-col gap-4 min-[1240px]:grid min-[1240px]:grid-cols-[43fr_57fr] min-[1240px]:gap-6 min-[1240px]:items-start">

          {/* LEFT: header + dark rate card */}
          <div className="min-w-0">
            <p
              className="text-[11px] min-[1240px]:text-[12px] font-[700] uppercase tracking-[0.14em]"
              style={{ fontFamily: SANS, color: "#75A8FF" }}
            >
              PRICING THAT FOLLOWS THE PROPERTY
            </p>
            <h2
              id="pricing-heading"
              className="mt-3 max-w-[680px] text-[31px] min-[1240px]:text-[clamp(42px,3.5vw,44px)] font-normal leading-[1.05] tracking-[-0.018em] text-white"
              style={{ fontFamily: SERIF }}
            >
              When there&#8217;s less to manage, you pay less.
            </h2>
            <p
              className="mt-[14px] max-w-[660px] text-[15.5px] min-[1240px]:text-[17px] font-[500] leading-[1.5]"
              style={{ fontFamily: SANS, color: "#C5D1E2" }}
            >
              When the keys are returned, the rate drops automatically. When a tenant takes possession, the rented rate returns.
            </p>

            <div className="mt-6 min-[1240px]:mt-8">
              <PropertyRateCard />
            </div>
          </div>

          {/* RIGHT: pricing card */}
          <PricingCard propType={propType} setPropType={setPropType} />
        </div>
      </div>
    </section>
  );
}

// ── Section 4: Managed Start ──────────────────────────────────────────────

const MANAGED_START_STEPS = [
  "Tell us about your property",
  "We visit and assess it — free",
  "Choose your term",
  "We set up records, documents, keys & access",
  "Management starts",
] as const;

const MANAGED_START_INCLUDED = [
  "Free property assessment",
  "Baseline condition record",
  "Onboarding included",
  "Rental agreement & renewal included",
] as const;

function StepToken({ n, isFinal }: { n: number; isFinal: boolean }) {
  const label = String(n).padStart(2, "0");
  return (
    <div
      className="relative flex-shrink-0 w-10 h-10 lg:w-12 lg:h-12"
      aria-hidden="true"
    >
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: isFinal ? "#AFC8FF" : "#DCE8FF",
          transform: "translate(3px, 3px)",
        }}
      />
      <div
        className="absolute inset-0 rounded-full flex items-center justify-center"
        style={
          isFinal
            ? { background: "#0057F2", boxShadow: "0 9px 22px rgba(0,87,242,.20)" }
            : { background: "#FFFFFF", border: "1px solid #AFC8F8", boxShadow: "0 7px 18px rgba(36,72,126,.12)" }
        }
      >
        <span
          className="text-[11px] lg:text-[12px] font-[700] leading-none select-none"
          style={{ fontFamily: SANS, color: isFinal ? "#FFFFFF" : "#0057F2" }}
        >
          {label}
        </span>
      </div>
    </div>
  );
}

function ManagedStartSection() {
  return (
    <section
      id="managed-start"
      aria-labelledby="managed-start-heading"
      className="pt-[54px] pb-[56px] lg:pt-[88px] lg:pb-[88px]"
      style={{
        background: [
          "radial-gradient(650px 320px at 8% 8%, rgba(0,87,242,.055), transparent 72%)",
          "radial-gradient(520px 300px at 94% 84%, rgba(37,99,235,.035), transparent 72%)",
          "#FBFAF7",
        ].join(", "),
      }}
    >
      <div className="mx-auto max-w-[1240px] px-5 sm:px-8 lg:px-10">

        <p
          className="text-[11px] lg:text-[12px] font-[700] uppercase tracking-[0.14em]"
          style={{ fontFamily: SANS, color: "#0057F2" }}
        >
          HOW MANAGED STARTS
        </p>
        <h2
          id="managed-start-heading"
          className="mt-3 max-w-[660px] text-[30px] lg:text-[40px] font-normal leading-[1.05] tracking-[-0.018em]"
          style={{ fontFamily: SERIF, color: "#0B1526" }}
        >
          Start with a free property assessment.
        </h2>
        <p
          className="mt-[14px] max-w-[620px] text-[15.5px] lg:text-[17px] font-[500] leading-[1.5]"
          style={{ fontFamily: SANS, color: "#536176" }}
        >
          We visit, assess the property, and explain what we find — before you pay anything.
        </p>

        {/*
          Connector maths:
            Mobile: top/bottom = 14px (py-[14px]) + 20px (half of 40px token) = 34px
                    left = 19px = center of 40px token (20px) - 1px half-connector
            Desktop: top = 24px = half of 48px token (no vertical padding)
                     left/right = 10% = center of first/last 1/5 column in 5-col grid
          Connectors placed before <ol> in DOM so they paint underneath by natural stacking.
        */}
        <div className="relative mt-[26px] lg:mt-[34px]">
          <div
            aria-hidden="true"
            className="lg:hidden absolute"
            style={{ left: 19, top: 34, bottom: 34, width: 2, background: "#D3E0F4" }}
          />
          <div
            aria-hidden="true"
            className="hidden lg:block absolute"
            style={{
              left: "10%",
              right: "10%",
              top: 24,
              height: 2,
              background: "linear-gradient(90deg, #D5E2F6 0%, #C5D8F7 45%, #9DBCF4 75%, #0057F2 100%)",
            }}
          />
          <ol
            className="relative flex flex-col lg:grid lg:grid-cols-5 m-0 p-0"
            style={{ listStyle: "none" }}
          >
            {MANAGED_START_STEPS.map((step, i) => (
              <li
                key={i}
                className="relative flex items-start min-w-0 min-h-[50px] py-[14px] lg:py-0 lg:flex-col lg:items-center"
              >
                <StepToken n={i + 1} isFinal={i === 4} />
                <span
                  className="ml-[14px] lg:ml-0 lg:mt-3 text-[14px] font-[700] leading-[1.3] lg:text-center"
                  style={{ fontFamily: SANS, color: "#263750" }}
                >
                  {step}
                </span>
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-[28px] lg:mt-[36px]">
          <p
            className="text-[11px] font-[700] uppercase tracking-[0.11em] text-center"
            style={{ fontFamily: SANS, color: "#45648A" }}
          >
            INCLUDED FROM THE START
          </p>
          <ul
            className="mt-4 grid grid-cols-2 lg:grid-cols-4 rounded-[16px] border overflow-hidden m-0 p-0"
            style={{
              background: "#FFFFFF",
              borderColor: "#E3E9F2",
              boxShadow: "0 8px 24px rgba(36,72,126,.065)",
              listStyle: "none",
            }}
          >
            {MANAGED_START_INCLUDED.map((item, i) => (
              <li
                key={i}
                className={[
                  "flex items-center min-h-[64px] lg:min-h-0 p-[14px] lg:p-[18px] min-w-0",
                  "border-[#E7ECF3]",
                  i === 0 || i === 2 ? "border-r" : "",
                  i === 0 || i === 1 ? "border-b lg:border-b-0" : "",
                  i < 3 ? "lg:border-r" : "lg:border-r-0",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <CheckCircle2
                  size={18}
                  strokeWidth={2}
                  aria-hidden="true"
                  className="flex-shrink-0"
                  style={{ color: "#0057F2" }}
                />
                <span
                  className="ml-[10px] text-[13.5px] font-[600] leading-[1.35] min-w-0"
                  style={{ fontFamily: SANS, color: "#34465F" }}
                >
                  {item}
                </span>
              </li>
            ))}
          </ul>
        </div>

      </div>
    </section>
  );
}

// ── Section 1: Hero ───────────────────────────────────────────────────────

function HeroSection() {
  function handleEnquiryClick(e: React.MouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    const target = document.getElementById("enquiry");
    if (!target) return;
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ behavior: prefersReduced ? "auto" : "smooth" });
  }

  return (
    <section
      id="hero"
      aria-label="Reeve Managed hero"
      className="bg-[#FBFAF7] pt-9 pb-8 sm:pt-12 sm:pb-12 lg:py-20"
    >
      <div className="mx-auto max-w-[1240px] px-5 sm:px-8 lg:px-10">
        <div className="lg:grid lg:grid-cols-[49fr_51fr] lg:items-center lg:gap-12">

          {/* Left: copy column */}
          <div className="flex min-w-0 flex-col">

            {/* Eyebrow */}
            <p
              className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#0057F2] sm:text-[12px]"
              style={{ fontFamily: SANS }}
            >
              REEVE MANAGED · BANGALORE
            </p>

            {/* H1 */}
            <h1
              className="mt-[14px] max-w-[560px] text-[38px] font-normal leading-[1.02] tracking-[-0.025em] text-[#0B1526] sm:text-[46px] lg:text-[clamp(54px,4.4vw,64px)]"
              style={{ fontFamily: SERIF }}
            >
              Property Management in Bangalore
            </h1>

            {/* Supporting copy */}
            <p
              className="mt-5 max-w-[525px] text-[15.5px] font-[500] leading-[1.5] text-[#46566B] lg:text-[17.5px]"
              style={{ fontFamily: SANS }}
            >
              Reeve handles tenant communication, property visits, repairs and records — through one accountable Reeve contact, wherever you live.
            </p>

            {/* Price */}
            <div className="mt-[23px] flex items-baseline gap-[5px]" style={{ fontFamily: SANS }}>
              <span className="text-[15px] font-[600] text-[#596778]">From</span>
              <span className="text-[30px] font-bold leading-none text-[#0057F2] sm:text-[36px] lg:text-[44px]">
                ₹3,000
              </span>
              <span className="text-[15px] font-[600] text-[#596778]">/month</span>
            </div>

            {/* CTA */}
            <div className="mt-[22px]">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <a
                  href="#enquiry"
                  onClick={handleEnquiryClick}
                  className="inline-flex w-full sm:w-auto items-center justify-center rounded-[11px] bg-[#0057F2] px-6 text-[16px] font-[700] text-white shadow-[0_4px_14px_rgba(0,87,242,0.25)] transition-all duration-[160ms] hover:-translate-y-px hover:bg-[#0047D0] hover:shadow-[0_6px_20px_rgba(0,87,242,0.35)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0057F2]"
                  style={{ fontFamily: SANS, height: 52 }}
                >
                  Tell us about your property →
                </a>
                <a
                  href="#pricing"
                  onClick={(e) => {
                    e.preventDefault();
                    const el = document.getElementById("pricing");
                    if (!el) return;
                    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
                    el.scrollIntoView({ behavior: prefersReduced ? "auto" : "smooth" });
                  }}
                  className="flex items-center justify-center sm:justify-start min-h-[44px] text-[14px] font-[700] transition-colors duration-[130ms] rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0057F2]"
                  style={{ fontFamily: SANS, color: "#3D5B80" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#0057F2")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#3D5B80")}
                >
                  See pricing ↓
                </a>
              </div>
            </div>

            {/* Trust line */}
            <div className="mt-[18px] flex items-center gap-[11px]" style={{ fontFamily: SANS }}>
              <span
                className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full"
                style={{ background: "#EAF1FF" }}
                aria-hidden="true"
              >
                <ShieldCheck size={15} className="text-[#0057F2]" strokeWidth={2} />
              </span>
              <span className="text-[13px] font-[600] text-[#536176] lg:text-[13.5px]">
                Rent and security deposit never pass through Reeve.
              </span>
            </div>

          </div>

          {/* Right: artwork */}
          <div className="mt-8 lg:mt-0">
            <div className="pmb-hero-art flex items-center justify-center lg:justify-end">
              <img
                src="/images/managed_1.webp"
                alt=""
                role="presentation"
                width={1402}
                height={1122}
                className="h-auto w-full max-w-[300px] object-contain sm:max-w-[380px] lg:max-w-none lg:w-full xl:max-w-[680px]"
                loading="eager"
                fetchPriority="high"
                decoding="async"
              />
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

// ── Section 5: Questions ───────────────────────────────────────────────────

function QuestionsSection() {
  const chevron = (
    <svg
      width="17"
      height="17"
      viewBox="0 0 16 16"
      fill="none"
      className="flex-shrink-0 transition-transform duration-[150ms] group-open:rotate-180 text-[#69758B] group-open:text-[#2563EB]"
      aria-hidden="true"
    >
      <path
        d="M3 6L8 10.5L13 6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  return (
    <section
      id="questions"
      aria-labelledby="questions-heading"
      className="bg-[#F4F4FF] scroll-mt-16 pt-16 pb-16 lg:pt-[84px] lg:pb-[84px]"
    >
      <div className="mx-auto max-w-[1240px] px-5 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-[880px]">

          <h2
            id="questions-heading"
            className="text-center text-[30px] font-normal leading-[1.06] tracking-[-0.015em] text-[#0B1526] lg:text-[clamp(38px,3vw,42px)]"
            style={{ fontFamily: SERIF }}
          >
            Questions about Reeve Managed
          </h2>

          <div className="mt-6 lg:mt-8">

            <div className="border-t border-[#DADCF0]">
              <details className="group">
                <summary
                  className="list-none [&::-webkit-details-marker]:hidden flex items-center justify-between gap-4 min-h-[60px] lg:min-h-[68px] py-[17px] lg:py-5 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 rounded-sm"
                  style={{ outlineColor: "#8FB7FF" }}
                >
                  <span className="min-w-0 text-[15px] lg:text-[16.5px] font-[650] leading-[1.35] text-[#172235] group-open:text-[#1D4ED8]" style={{ fontFamily: SANS }}>
                    What happens when my tenant moves out?
                  </span>
                  {chevron}
                </summary>
                <div className="pb-[18px] lg:pb-5 pr-[34px] lg:pr-11 max-w-[720px]">
                  <p className="text-[14px] lg:text-[15px] font-[500] leading-[1.55] lg:leading-[1.6] text-[#536074]" style={{ fontFamily: SANS }}>
                    When the tenant returns the keys and the property becomes physically vacant, Reeve Managed moves to the applicable empty-property rate from that point. Management continues without needing a new management contract. If the owner wants another tenant, Reeve can also begin tenant finding.
                  </p>
                </div>
              </details>
            </div>

            <div className="border-t border-[#DADCF0]">
              <details className="group">
                <summary
                  className="list-none [&::-webkit-details-marker]:hidden flex items-center justify-between gap-4 min-h-[60px] lg:min-h-[68px] py-[17px] lg:py-5 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 rounded-sm"
                  style={{ outlineColor: "#8FB7FF" }}
                >
                  <span className="min-w-0 text-[15px] lg:text-[16.5px] font-[650] leading-[1.35] text-[#172235] group-open:text-[#1D4ED8]" style={{ fontFamily: SANS }}>
                    How often will Reeve visit my property?
                  </span>
                  {chevron}
                </summary>
                <div className="pb-[18px] lg:pb-5 pr-[34px] lg:pr-11 max-w-[720px]">
                  <p className="text-[14px] lg:text-[15px] font-[500] leading-[1.55] lg:leading-[1.6] text-[#536074]" style={{ fontFamily: SANS }}>
                    Reeve Managed includes four scheduled property inspections each year, plus two additional on-request inspections. Move-in and move-out condition records are handled when relevant, and repair/maintenance visits are coordinated as needed.
                  </p>
                </div>
              </details>
            </div>

            <div className="border-t border-[#DADCF0]">
              <details className="group">
                <summary
                  className="list-none [&::-webkit-details-marker]:hidden flex items-center justify-between gap-4 min-h-[60px] lg:min-h-[68px] py-[17px] lg:py-5 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 rounded-sm"
                  style={{ outlineColor: "#8FB7FF" }}
                >
                  <span className="min-w-0 text-[15px] lg:text-[16.5px] font-[650] leading-[1.35] text-[#172235] group-open:text-[#1D4ED8]" style={{ fontFamily: SANS }}>
                    What happens if a repair needs my approval and I don&#8217;t respond?
                  </span>
                  {chevron}
                </summary>
                <div className="pb-[18px] lg:pb-5 pr-[34px] lg:pr-11 max-w-[720px]">
                  <p className="text-[14px] lg:text-[15px] font-[500] leading-[1.55] lg:leading-[1.6] text-[#536074]" style={{ fontFamily: SANS }}>
                    Work above the owner&#8217;s approval threshold waits for written approval. The default threshold is ₹3,000, and a different threshold can be agreed during onboarding. Vendor costs are passed through at actuals with zero Reeve markup.
                  </p>
                </div>
              </details>
            </div>

            <div className="border-t border-[#DADCF0]">
              <details className="group">
                <summary
                  className="list-none [&::-webkit-details-marker]:hidden flex items-center justify-between gap-4 min-h-[60px] lg:min-h-[68px] py-[17px] lg:py-5 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 rounded-sm"
                  style={{ outlineColor: "#8FB7FF" }}
                >
                  <span className="min-w-0 text-[15px] lg:text-[16.5px] font-[650] leading-[1.35] text-[#172235] group-open:text-[#1D4ED8]" style={{ fontFamily: SANS }}>
                    Do you hold my rent or security deposit?
                  </span>
                  {chevron}
                </summary>
                <div className="pb-[18px] lg:pb-5 pr-[34px] lg:pr-11 max-w-[720px]">
                  <p className="text-[14px] lg:text-[15px] font-[500] leading-[1.55] lg:leading-[1.6] text-[#536074]" style={{ fontFamily: SANS }}>
                    No. Rent and security deposit move directly between the tenant and owner. Reeve can confirm receipt status and follow up where needed, but does not take custody of the money.
                  </p>
                </div>
              </details>
            </div>

            <div className="border-t border-[#DADCF0]">
              <details className="group">
                <summary
                  className="list-none [&::-webkit-details-marker]:hidden flex items-center justify-between gap-4 min-h-[60px] lg:min-h-[68px] py-[17px] lg:py-5 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 rounded-sm"
                  style={{ outlineColor: "#8FB7FF" }}
                >
                  <span className="min-w-0 text-[15px] lg:text-[16.5px] font-[650] leading-[1.35] text-[#172235] group-open:text-[#1D4ED8]" style={{ fontFamily: SANS }}>
                    Can Reeve find my next tenant?
                  </span>
                  {chevron}
                </summary>
                <div className="pb-[18px] lg:pb-5 pr-[34px] lg:pr-11 max-w-[720px]">
                  <p className="text-[14px] lg:text-[15px] font-[500] leading-[1.55] lg:leading-[1.6] text-[#536074]" style={{ fontFamily: SANS }}>
                    Yes. Tenant finding for Reeve Managed clients costs ₹15,000, with ₹0 upfront. The fee is charged when the tenant&#8217;s token advance reaches the owner. Unlimited viewings are included, and same-tenant renewal is free.
                  </p>
                </div>
              </details>
            </div>

            <div className="border-t border-[#DADCF0]">
              <details className="group">
                <summary
                  className="list-none [&::-webkit-details-marker]:hidden flex items-center justify-between gap-4 min-h-[60px] lg:min-h-[68px] py-[17px] lg:py-5 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 rounded-sm"
                  style={{ outlineColor: "#8FB7FF" }}
                >
                  <span className="min-w-0 text-[15px] lg:text-[16.5px] font-[650] leading-[1.35] text-[#172235] group-open:text-[#1D4ED8]" style={{ fontFamily: SANS }}>
                    I don&#8217;t live in Bangalore. How does Reeve Managed work for me?
                  </span>
                  {chevron}
                </summary>
                <div className="pb-[18px] lg:pb-5 pr-[34px] lg:pr-11 max-w-[720px]">
                  <p className="text-[14px] lg:text-[15px] font-[500] leading-[1.55] lg:leading-[1.6] text-[#536074]" style={{ fontFamily: SANS }}>
                    You do not need to be in Bangalore for day-to-day management. Reeve handles local property visits, tenant communication and repair coordination. Owner decisions and written approvals can happen remotely, property records are available remotely, and you have one Reeve point of contact.
                  </p>
                </div>
              </details>
            </div>

            <div className="border-t border-[#DADCF0]" />

          </div>
        </div>
      </div>
    </section>
  );
}

// ── Section 6: Enquiry ────────────────────────────────────────────────────

function EnquirySection() {
  return (
    <section
      id="enquiry"
      aria-labelledby="enquiry-heading"
      className="scroll-mt-0"
      style={{
        background: `
          radial-gradient(circle at 82% 12%, rgba(0,87,242,.30) 0%, rgba(0,87,242,.12) 26%, rgba(0,87,242,0) 52%),
          linear-gradient(135deg, #071426 0%, #0A1730 52%, #0B2857 100%)
        `,
      }}
    >
      <div className="mx-auto max-w-[1240px] px-5 sm:px-8 lg:px-10 pt-16 pb-[72px] lg:pt-24 lg:pb-[104px]">
        <div className="lg:grid lg:grid-cols-[38fr_62fr] lg:gap-[60px] lg:items-start">

          <div className="lg:pt-8">
            <h2
              id="enquiry-heading"
              className="text-[30px] lg:text-[clamp(38px,3vw,42px)] font-normal leading-[1.06] tracking-[-0.015em] text-white max-w-[390px]"
              style={{ fontFamily: SERIF }}
            >
              Tell us about your property.
            </h2>
            <p
              className="mt-[15px] text-[15.5px] lg:text-[17px] font-[500] leading-[1.55] text-[#C8D3E3] max-w-[420px]"
              style={{ fontFamily: SANS }}
            >
              Share a few details. We&#8217;ll work out which service fits and get back to you within a day.
            </p>
            <ul className="mt-[30px] space-y-[14px]">
              {[
                "Response within a day.",
                "No spam calls. If you choose a phone call, we'll coordinate a time first.",
              ].map((text) => (
                <li key={text} className="flex items-start gap-[10px]">
                  <span
                    className="mt-[2px] w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center"
                    style={{ background: "rgba(185,242,39,.12)" }}
                  >
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                      <path d="M2 5.5L4 7.5L8.5 3" stroke="#B9F227" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <span className="text-[14.5px] font-[500] leading-[1.45] text-[#E8EEF7]" style={{ fontFamily: SANS }}>
                    {text}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-8 lg:mt-0">
            <div
              className="rounded-[18px] lg:rounded-[22px] border border-[#E8E6E1] shadow-[0_26px_70px_rgba(0,0,0,.22)]"
              style={{ background: "#FFFDFC" }}
            >
              <div className="p-5 sm:p-7 lg:p-8">
                <PropertyEnquiryForm initialService="property_management" />
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

// ── Mobile sticky CTA ─────────────────────────────────────────────────────

function StickyEnquiryCTA() {
  const [show, setShow] = useState(false);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const heroSection = document.getElementById("hero");
    const enquirySection = document.getElementById("enquiry");
    if (!heroSection || !enquirySection) return;

    let heroVisible = true;
    let enquiryReached = false;
    const update = () => setShow(!heroVisible && !enquiryReached);

    const heroObs = new IntersectionObserver(([e]) => {
      heroVisible = e.isIntersecting;
      update();
    });
    const enquiryObs = new IntersectionObserver(
      ([e]) => {
        const alreadyPassed = !e.isIntersecting && e.boundingClientRect.top < 0;
        enquiryReached = e.isIntersecting || alreadyPassed;
        update();
      },
      { threshold: 0 }
    );

    heroObs.observe(heroSection);
    enquiryObs.observe(enquirySection);
    return () => {
      heroObs.disconnect();
      enquiryObs.disconnect();
    };
  }, []);

  if (!show) return null;

  const bottomStyle = isAuthenticated
    ? "calc(4rem + env(safe-area-inset-bottom, 0px))"
    : "max(1rem, env(safe-area-inset-bottom, 0px))";

  function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    const target = document.getElementById("enquiry");
    if (!target) return;
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ behavior: prefersReduced ? "auto" : "smooth" });
  }

  return (
    <a
      href="#enquiry"
      onClick={handleClick}
      className="fixed left-3 right-3 z-40 lg:hidden flex items-center justify-center rounded-[14px] h-[52px] bg-[#0057F2] text-[15px] font-[700] text-white shadow-[0_10px_30px_rgba(0,40,110,.24)] transition-opacity duration-[150ms]"
      style={{ fontFamily: SANS, bottom: bottomStyle }}
      aria-label="Tell us about your property"
    >
      Tell us about your property
    </a>
  );
}

export default function PropertyManagementBangalore() {
  return (
    <Layout>
      <style>{`
        @keyframes pmbHeroFadeIn {
          from { opacity: 0.96; transform: translateY(5px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pmbModeEnter {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pmbPriceEnter {
          from { opacity: 0; transform: translateY(3px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: no-preference) {
          .pmb-hero-art { animation: pmbHeroFadeIn 500ms cubic-bezier(.22,.8,.3,1) both; }
          .pmb-mode-enter { animation: pmbModeEnter 200ms ease-out both; }
          .pmb-price-enter { animation: pmbPriceEnter 130ms ease-out both; }
        }
      `}</style>

      <HeroSection />
      <ManagedControlSection />
      <ManagedPricingSection />
      <ManagedStartSection />
      <QuestionsSection />
      <EnquirySection />
      <StickyEnquiryCTA />
    </Layout>
  );
}
