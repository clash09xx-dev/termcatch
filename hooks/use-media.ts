"use client";

import { useEffect, useState } from "react";

/**
 * Subscribe to a media query. Returns `false` until mounted, so server and
 * first client render agree and nothing flashes.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(query);
    setMatches(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}

/** Phone-width: overlays become bottom sheets, rails become swipeable. */
export function useIsCompact(): boolean {
  return useMediaQuery("(max-width: 639px)");
}

/**
 * True only where hovering is real. A touch tap fires :hover and keeps it until
 * the next tap, so every hover-driven behaviour has to be gated on this.
 */
export function useHasHover(): boolean {
  return useMediaQuery("(hover: hover) and (pointer: fine)");
}
