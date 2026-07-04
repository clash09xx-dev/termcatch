"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { getStoredConsent } from "@/components/cookie-consent";

function track(path: string) {
  try {
    void fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path, referrer: document.referrer || null }),
      keepalive: true,
    });
  } catch {
    // Statystyki nigdy nie mogą zepsuć strony
  }
}

/**
 * Rejestruje odsłony stron — wyłącznie po zgodzie na cookie analityczne.
 * Deduplikacja odświeżeń odbywa się po stronie serwera (sesja + ścieżka).
 */
export function AnalyticsTracker() {
  const pathname = usePathname();
  const lastTracked = useRef<string | null>(null);

  useEffect(() => {
    const consent = getStoredConsent();
    const send = () => {
      if (lastTracked.current === pathname) return;
      lastTracked.current = pathname;
      track(pathname);
    };

    if (consent?.analytics) {
      send();
      return;
    }

    // Czekaj aż użytkownik wyrazi zgodę w bannerze
    const onConsent = (e: Event) => {
      const detail = (e as CustomEvent).detail as { analytics?: boolean } | undefined;
      if (detail?.analytics) send();
    };
    window.addEventListener("tc-consent-changed", onConsent);
    return () => window.removeEventListener("tc-consent-changed", onConsent);
  }, [pathname]);

  return null;
}
