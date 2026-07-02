"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleFavourite } from "@/lib/actions/favourites";
import { cn } from "@/lib/utils";

interface FavouriteButtonProps {
  businessId: string;
  initialIsFavourite: boolean;
  /** Redirect target after login when the user is logged out */
  redirectPath: string;
  size?: "sm" | "md";
  className?: string;
}

export default function FavouriteButton({
  businessId,
  initialIsFavourite,
  redirectPath,
  size = "md",
  className,
}: FavouriteButtonProps) {
  const router = useRouter();
  const [isFav, setIsFav] = useState(initialIsFavourite);
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    startTransition(async () => {
      const optimistic = !isFav;
      setIsFav(optimistic);
      try {
        const result = await toggleFavourite(businessId);
        if (result.requiresLogin) {
          setIsFav(false);
          router.push(`/login?redirect=${encodeURIComponent(redirectPath)}`);
          return;
        }
        setIsFav(result.isFavourite);
      } catch {
        setIsFav(!optimistic);
      }
    });
  };

  const box = size === "sm" ? "w-8 h-8 rounded-lg" : "w-10 h-10 rounded-xl";
  const icon = size === "sm" ? "w-4 h-4" : "w-5 h-5";

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      aria-label={isFav ? "Usuń z ulubionych" : "Dodaj do ulubionych"}
      title={isFav ? "Usuń z ulubionych" : "Dodaj do ulubionych"}
      className={cn(
        box,
        "flex items-center justify-center border transition-all active:scale-90",
        isFav
          ? "bg-red-50 border-red-100 text-red-500 hover:bg-red-100"
          : "bg-white border-gray-200 text-gray-400 hover:text-gray-600 hover:border-gray-300",
        className
      )}
    >
      <svg
        className={cn(icon, "transition-transform", isFav && "scale-110")}
        viewBox="0 0 24 24"
        fill={isFav ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={1.8}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
        />
      </svg>
    </button>
  );
}
