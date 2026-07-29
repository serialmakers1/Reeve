import { Map } from "lucide-react";

interface Props {
  onClick: () => void;
}

export function SearchMapPlaceholder({ onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Switch to map view"
      className="fixed bottom-20 right-4 z-30 flex items-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg transition-colors hover:bg-primary/90 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 desk:hidden"
    >
      <Map className="h-4 w-4" />
      Map
    </button>
  );
}
