import { cn } from "@/lib/utils";
import { getUserInitials } from "@/lib/user";

interface Props {
  photoUrl?: string | null;
  displayName: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<Props["size"]>, string> = {
  sm: "h-8 w-8 text-xs",
  md: "h-12 w-12 text-sm",
  lg: "h-20 w-20 text-xl",
  xl: "h-28 w-28 text-3xl",
};

// Deterministic hash → palette index. djb2 variant. Same displayName always
// picks the same color so avatars stay stable across renders.
const PALETTE = [
  "bg-red-500",     "bg-orange-500", "bg-amber-500",
  "bg-lime-500",    "bg-emerald-500", "bg-teal-500",
  "bg-cyan-500",    "bg-sky-500",     "bg-indigo-500",
  "bg-fuchsia-500", "bg-pink-500",    "bg-rose-500",
];

function pickColor(name: string): string {
  let hash = 5381;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 33) ^ name.charCodeAt(i);
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

export default function ProfileAvatar({ photoUrl, displayName, size = "md", className }: Props) {
  const dim = SIZE_CLASSES[size];
  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={displayName}
        className={cn("rounded-full object-cover shrink-0", dim, className)}
        referrerPolicy="no-referrer"
      />
    );
  }
  const initials = getUserInitials(
    { full_name: displayName },
    { display_name: displayName },
  );
  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center font-semibold text-white shrink-0",
        dim,
        pickColor(displayName || "?"),
        className,
      )}
      aria-label={displayName}
    >
      {initials}
    </div>
  );
}
