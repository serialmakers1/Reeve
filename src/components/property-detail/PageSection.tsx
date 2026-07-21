/**
 * P5 shared section wrapper for /property/:id sections.
 * All colours from shadcn tokens — no hard-coded gray/hex.
 */
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageSectionProps {
  title: string;
  icon?: LucideIcon;
  background?: "default" | "muted" | "accent";
  className?: string;
  children: React.ReactNode;
}

export default function PageSection({
  title,
  icon: Icon,
  background = "default",
  className,
  children,
}: PageSectionProps) {
  const rounded = background !== "default";
  return (
    <section
      className={cn(
        "px-4 py-5 lg:px-0",
        background === "muted" && "bg-muted/40",
        background === "accent" && "bg-primary/5 border border-primary/20",
        rounded && "rounded-2xl mx-4 lg:mx-0",
        className,
      )}
    >
      <div className="mb-3 flex items-center gap-2">
        {Icon ? <Icon className="h-4 w-4 text-muted-foreground" /> : null}
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}
