"use client";

import { useEffect, useRef, useState } from "react";

/**
 * True once the content under a floating bar has actually scrolled.
 *
 * Chrome should separate itself from content only when there is content to
 * separate from. A hairline that is always drawn reads as a structural border
 * — a line in the layout — where the same hairline appearing on scroll reads
 * as the bar lifting off the page, which is what it is.
 *
 * The scroll container in both app shells is the `<main>` beside the bar, not
 * the window, so the hook finds it rather than assuming. If it cannot (an
 * unexpected shell), it simply reports false and the bar stays flat, which is
 * the same as the old behaviour minus the line.
 */
export function useScrolledUnder<T extends HTMLElement>(): [React.RefObject<T | null>, boolean] {
  const ref = useRef<T | null>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const bar = ref.current;
    if (!bar) return;
    const scroller =
      bar.parentElement?.querySelector("main") ??
      bar.closest("[data-scroll-root]")?.querySelector("main") ??
      null;
    if (!scroller) return;

    let raf = 0;
    const read = () => {
      raf = 0;
      setScrolled(scroller.scrollTop > 4);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(read);
    };

    read();
    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      scroller.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return [ref, scrolled];
}
