import {
  Wallet,
  IndianRupee,
  LockKeyhole,
  CalendarDays,
  Ruler,
  Bath,
  Building2,
  CarFront,
  Sofa,
  PawPrint,
  Video,
  KeyRound,
  ArrowLeftRight,
  Percent,
  UserRound,
  BriefcaseBusiness,
  HardHat,
  MessageSquareReply,
  CircleCheckBig,
  Clock3,
  type LucideIcon,
} from "lucide-react";
import type { IconKey, TileScheme } from "@/features/search/resolvers/cardTilesResolver";

/**
 * Static, JIT-safe class maps for the vibrant vertical SearchPropertyCard tiles.
 * Colour lives in icon boxes / thin borders / pale surfaces only — never behind
 * paragraphs. All class strings are literal so Tailwind's scanner sees them.
 */
export interface TileStyle {
  surface: string;
  border: string;
  iconBox: string;
  icon: string;
  text: string;
}

export const TILE_STYLES: Record<TileScheme, TileStyle> = {
  deposit: { surface: "bg-violet-50", border: "border-violet-200", iconBox: "bg-violet-600", icon: "text-white", text: "text-slate-900" },
  paidBrokerage: { surface: "bg-sky-50", border: "border-sky-200", iconBox: "bg-sky-600", icon: "text-white", text: "text-slate-900" },
  zeroBrokerage: { surface: "bg-emerald-50", border: "border-emerald-200", iconBox: "bg-emerald-600", icon: "text-white", text: "text-emerald-900" },
  lockin: { surface: "bg-amber-50", border: "border-amber-200", iconBox: "bg-amber-500", icon: "text-white", text: "text-slate-900" },
  availableFrom: { surface: "bg-cyan-50", border: "border-cyan-200", iconBox: "bg-cyan-600", icon: "text-white", text: "text-slate-900" },
  area: { surface: "bg-blue-50", border: "border-blue-200", iconBox: "bg-blue-600", icon: "text-white", text: "text-slate-900" },
  furnishing: { surface: "bg-violet-50", border: "border-violet-200", iconBox: "bg-violet-600", icon: "text-white", text: "text-slate-900" },
  petsAllowed: { surface: "bg-green-50", border: "border-green-200", iconBox: "bg-green-600", icon: "text-white", text: "text-green-900" },
  petsRestricted: { surface: "bg-amber-50", border: "border-amber-200", iconBox: "bg-amber-500", icon: "text-white", text: "text-slate-900" },
  neutralRestriction: { surface: "bg-slate-50", border: "border-slate-200", iconBox: "bg-slate-500", icon: "text-white", text: "text-slate-900" },
  video: { surface: "bg-blue-50", border: "border-blue-200", iconBox: "bg-blue-600", icon: "text-white", text: "text-slate-900" },
  readyToMove: { surface: "bg-cyan-50", border: "border-cyan-200", iconBox: "bg-cyan-600", icon: "text-white", text: "text-slate-900" },
  possessionDate: { surface: "bg-indigo-50", border: "border-indigo-200", iconBox: "bg-indigo-600", icon: "text-white", text: "text-slate-900" },
  buildingAge: { surface: "bg-slate-50", border: "border-slate-200", iconBox: "bg-slate-500", icon: "text-white", text: "text-slate-900" },
  openToOffers: { surface: "bg-amber-50", border: "border-amber-200", iconBox: "bg-amber-500", icon: "text-white", text: "text-amber-900" },
  saleBrokerage: { surface: "bg-violet-50", border: "border-violet-200", iconBox: "bg-violet-500", icon: "text-white", text: "text-slate-900" },
  parking: { surface: "bg-blue-50", border: "border-blue-200", iconBox: "bg-blue-600", icon: "text-white", text: "text-slate-900" },
  floor: { surface: "bg-blue-50", border: "border-blue-200", iconBox: "bg-blue-600", icon: "text-white", text: "text-slate-900" },
  bath: { surface: "bg-cyan-50", border: "border-cyan-200", iconBox: "bg-cyan-600", icon: "text-white", text: "text-slate-900" },
};

export type FooterSegmentScheme = "footerLister" | "footerResponse" | "footerConfirmed" | "footerListed";

export interface FooterStyle {
  iconBox: string;
  icon: string;
  text: string;
}

export const FOOTER_SEGMENT_STYLES: Record<FooterSegmentScheme, FooterStyle> = {
  footerLister: { iconBox: "bg-slate-100", icon: "text-slate-600", text: "text-slate-700" },
  footerResponse: { iconBox: "bg-teal-100", icon: "text-teal-700", text: "text-teal-800" },
  footerConfirmed: { iconBox: "bg-emerald-100", icon: "text-emerald-700", text: "text-emerald-800" },
  footerListed: { iconBox: "bg-indigo-100", icon: "text-indigo-700", text: "text-indigo-800" },
};

export const ACTIVITY_STYLES = {
  views: { iconBox: "bg-slate-100", icon: "text-slate-600", text: "text-slate-800" },
  comments: { iconBox: "bg-fuchsia-50", icon: "text-fuchsia-600", text: "text-slate-800" },
} as const;

export const ICONS: Record<IconKey, LucideIcon> = {
  wallet: Wallet,
  rupee: IndianRupee,
  lockin: LockKeyhole,
  calendar: CalendarDays,
  area: Ruler,
  bath: Bath,
  floor: Building2,
  parking: CarFront,
  furnishing: Sofa,
  pets: PawPrint,
  video: Video,
  readyToMove: KeyRound,
  openToOffers: ArrowLeftRight,
  percent: Percent,
  buildingAge: Building2,
  listerOwner: UserRound,
  listerBroker: BriefcaseBusiness,
  listerManager: Building2,
  listerBuilder: HardHat,
  response: MessageSquareReply,
  confirmed: CircleCheckBig,
  listed: Clock3,
};
