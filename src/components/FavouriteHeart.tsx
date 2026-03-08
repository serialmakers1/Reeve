import React from "react";
import { Heart } from "lucide-react";

interface FavouriteHeartProps {
  filled: boolean;
  onClick: (e: React.MouseEvent) => void;
  className?: string;
}

export default function FavouriteHeart({ filled, onClick, className = "" }: FavouriteHeartProps) {
  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick(e);
      }}
      className={`flex h-11 w-11 items-center justify-center rounded-full bg-background/80 backdrop-blur-sm transition-colors hover:bg-background ${className}`}
      aria-label={filled ? "Remove from favourites" : "Add to favourites"}
    >
      <Heart
        className={`h-5 w-5 transition-colors ${
          filled ? "fill-destructive text-destructive" : "text-muted-foreground"
        }`}
      />
    </button>
  );
}
