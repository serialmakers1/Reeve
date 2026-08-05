import { cn } from "@/lib/utils";
import type { CardTile as CardTileData, FooterSegment } from "@/features/search/resolvers/cardTilesResolver";
import { TILE_STYLES, FOOTER_SEGMENT_STYLES, ICONS } from "./cardTileStyles";

interface IconBoxProps {
  iconKey: keyof typeof ICONS;
  boxClass: string;
  iconClass: string;
  /** Tailwind size for the box (e.g. "h-7 w-7"). */
  sizeClass?: string;
  /** Tailwind size for the icon (e.g. "h-4 w-4"). */
  iconSizeClass?: string;
}

export function IconBox({ iconKey, boxClass, iconClass, sizeClass = "h-7 w-7", iconSizeClass = "h-4 w-4" }: IconBoxProps) {
  const Icon = ICONS[iconKey];
  return (
    <span className={cn("flex shrink-0 items-center justify-center rounded-lg", sizeClass, boxClass)}>
      <Icon aria-hidden="true" className={cn(iconSizeClass, iconClass)} />
    </span>
  );
}

/** Financial tile — HORIZONTAL (icon-left, label over value). */
export function FinancialTile({ tile }: { tile: CardTileData }) {
  const s = TILE_STYLES[tile.scheme];
  return (
    <div className={cn("grid grid-cols-[32px_minmax(0,1fr)] items-center gap-2 rounded-xl border p-2", s.surface, s.border)}>
      <IconBox iconKey={tile.iconKey} boxClass={s.iconBox} iconClass={s.icon} sizeClass="h-8 w-8" iconSizeClass="h-[18px] w-[18px]" />
      <div className="min-w-0">
        <p className="truncate text-[10px] font-medium leading-tight text-muted-foreground">{tile.line1}</p>
        {tile.line2 && <p className={cn("truncate text-[13px] font-semibold leading-tight tabular-nums", s.text)}>{tile.line2}</p>}
      </div>
    </div>
  );
}

/** Feature tile — icon ABOVE text (stable at all vertical-card widths). */
export function FeatureTile({ tile }: { tile: CardTileData }) {
  const s = TILE_STYLES[tile.scheme];
  return (
    <div className={cn("flex min-w-0 flex-col items-start gap-1 rounded-xl border p-2", s.surface, s.border)}>
      <IconBox iconKey={tile.iconKey} boxClass={s.iconBox} iconClass={s.icon} sizeClass="h-7 w-7" iconSizeClass="h-4 w-4" />
      <div className="min-w-0">
        <p className={cn("line-clamp-2 text-[11px] font-semibold leading-tight", s.text)}>{tile.line1}</p>
        {tile.line2 && <p className="truncate text-[10px] leading-tight text-muted-foreground">{tile.line2}</p>}
      </div>
    </div>
  );
}

/** Footer segment — compact stacked, centred. */
export function FooterSegmentView({ segment }: { segment: FooterSegment }) {
  const s = FOOTER_SEGMENT_STYLES[segment.scheme];
  return (
    <div className="flex min-w-0 flex-col items-center gap-0.5 px-1 text-center">
      <IconBox iconKey={segment.iconKey} boxClass={s.iconBox} iconClass={s.icon} sizeClass="h-6 w-6" iconSizeClass="h-3.5 w-3.5" />
      <span aria-hidden="true" className={cn("line-clamp-2 text-[10px] font-medium leading-tight", s.text)}>
        {segment.text}
      </span>
      <span className="sr-only">{segment.ariaLabel}</span>
    </div>
  );
}
