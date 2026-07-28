import { Skeleton } from "@/components/ui/skeleton";

export function SearchCardSkeleton() {
  return (
    <div className="border-b bg-white">
      <Skeleton className="h-36 w-full rounded-none" />
      <div className="space-y-2 p-2.5">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-1/2" />
        <div className="flex gap-2">
          <Skeleton className="h-5 w-14 rounded-full" />
          <Skeleton className="h-5 w-14 rounded-full" />
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
  );
}
