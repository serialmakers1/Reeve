/**
 * Loading / error+retry / empty states shared by the moderation tabs.
 * Returns null when the list should render its rows.
 */
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  isLoading: boolean;
  isError: boolean;
  isEmpty: boolean;
  onRetry: () => void;
  emptyText: string;
  rows?: number;
}

export default function ModerationListState({ isLoading, isError, isEmpty, onRetry, emptyText, rows = 5 }: Props) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }
  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-10 text-center">
        <AlertCircle className="h-6 w-6 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Couldn't load this list.</p>
        <Button variant="outline" size="sm" onClick={onRetry}>Retry</Button>
      </div>
    );
  }
  if (isEmpty) {
    return <p className="py-10 text-center text-sm text-muted-foreground">{emptyText}</p>;
  }
  return null;
}
