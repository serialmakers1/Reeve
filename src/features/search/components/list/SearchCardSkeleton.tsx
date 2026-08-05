import { Skeleton } from "@/components/ui/skeleton";

interface SearchCardSkeletonProps {
  /** Same resolved search mode as the results query. null/undefined → Sale-shaped (no financial row). */
  listingMode?: "rent" | "buy" | null;
}

/**
 * Mirrors the redesigned vertical card layout to avoid layout shift on load.
 * Rent shows the financial-row placeholder; Sale (and unknown) omit it.
 * Never taller than the fully-populated card.
 */
export function SearchCardSkeleton({ listingMode }: SearchCardSkeletonProps) {
  const isRent = listingMode === "rent";
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
      <Skeleton className="h-36 w-full rounded-none" />
      <div className="h-[3px] w-full bg-muted" />
      <div className="flex flex-col gap-2 p-2.5 md:p-3">
        {/* Price + activity */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <Skeleton className="h-6 w-28" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="h-6 w-10" />
        </div>
        {/* Identity */}
        <div className="space-y-1">
          <Skeleton className="h-4 w-2/5" />
          <Skeleton className="h-3 w-3/5" />
        </div>
        {/* Rent financial row */}
        {isRent && (
          <div className="grid grid-cols-2 gap-2">
            <Skeleton className="h-14 rounded-xl" />
            <Skeleton className="h-14 rounded-xl" />
          </div>
        )}
        {/* Feature tiles */}
        <div className="grid grid-cols-3 gap-1.5 md:gap-2">
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
        </div>
        {/* Footer deck */}
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
    </div>
  );
}
