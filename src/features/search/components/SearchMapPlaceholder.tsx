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
      className="fixed bottom-20 right-4 z-30 flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background shadow-lg desk:hidden"
    >
      <Map className="h-4 w-4" />
      Map
    </button>
  );
}
