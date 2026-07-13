"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { INK_BTN, GLASS_BTN, CHIP, ELEV_OVERLAY } from "@/components/ui/glass/tokens";

export type CookieConsent = {
  essential: true;
  analytics: boolean;
  marketing: boolean;
  updatedAt: string;
};

const STORAGE_KEY = "tc-consent";
const CONSENT_EVENT = "tc-consent-changed";
const OPEN_EVENT = "tc-open-consent";

export function getStoredConsent(): CookieConsent | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CookieConsent;
  } catch {
    return null;
  }
}

function persistConsent(consent: CookieConsent) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(consent));
  // Cookie dla serwera (365 dni) — np. gate'owanie skryptów w SSR
  document.cookie = `tc_consent=${encodeURIComponent(
    JSON.stringify({ a: consent.analytics, m: consent.marketing })
  )}; path=/; max-age=31536000; SameSite=Lax`;
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: consent }));
}

/** Otwórz banner ponownie (np. przycisk na /cookies). */
export function openConsentSettings() {
  window.dispatchEvent(new CustomEvent(OPEN_EVENT));
}

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [analytics, setAnalytics] = useState(true);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    const existing = getStoredConsent();
    if (!existing) setVisible(true);
    const onOpen = () => {
      const current = getStoredConsent();
      if (current) {
        setAnalytics(current.analytics);
        setMarketing(current.marketing);
      }
      setShowDetails(true);
      setVisible(true);
    };
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, []);

  const save = useCallback((a: boolean, m: boolean) => {
    persistConsent({
      essential: true,
      analytics: a,
      marketing: m,
      updatedAt: new Date().toISOString(),
    });
    setVisible(false);
    setShowDetails(false);
  }, []);

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Ustawienia plików cookie"
      className="fixed bottom-0 inset-x-0 z-[60] p-4 sm:p-6"
    >
      <div className="max-w-xl mx-auto rounded-[20px] p-5 sm:p-6" style={ELEV_OVERLAY}>
        <h2 className="text-sm font-semibold text-slate-900 mb-1.5">Pliki cookie</h2>
        <p className="text-xs text-slate-500 leading-relaxed mb-4">
          Używamy niezbędnych plików cookie, aby Termcatch działał (logowanie, sesja).
          Za Twoją zgodą użyjemy też cookie analitycznych, żeby rozumieć ruch na stronie.
          Szczegóły w{" "}
          <Link href="/cookies" className="underline underline-offset-2 hover:text-slate-700">
            polityce cookies
          </Link>
          .
        </p>

        {showDetails && (
          <div className="space-y-2.5 mb-4">
            <label className="flex items-start gap-3 p-3 rounded-xl cursor-not-allowed" style={CHIP}>
              <input type="checkbox" checked disabled className="mt-0.5 accent-slate-900" />
              <span>
                <span className="block text-xs font-semibold text-slate-900">Niezbędne</span>
                <span className="block text-xs text-slate-500">
                  Logowanie, sesja, bezpieczeństwo. Zawsze aktywne.
                </span>
              </span>
            </label>
            <label className="flex items-start gap-3 p-3 rounded-xl cursor-pointer" style={CHIP}>
              <input
                type="checkbox"
                checked={analytics}
                onChange={(e) => setAnalytics(e.target.checked)}
                className="mt-0.5 accent-slate-900"
              />
              <span>
                <span className="block text-xs font-semibold text-slate-900">Analityczne</span>
                <span className="block text-xs text-slate-500">
                  Anonimowe statystyki odwiedzin — pomagają nam ulepszać Termcatch.
                </span>
              </span>
            </label>
            <label className="flex items-start gap-3 p-3 rounded-xl cursor-pointer" style={CHIP}>
              <input
                type="checkbox"
                checked={marketing}
                onChange={(e) => setMarketing(e.target.checked)}
                className="mt-0.5 accent-slate-900"
              />
              <span>
                <span className="block text-xs font-semibold text-slate-900">Marketingowe</span>
                <span className="block text-xs text-slate-500">
                  Obecnie nie używamy cookie marketingowych. Ustawienie na przyszłość.
                </span>
              </span>
            </label>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2">
          {showDetails ? (
            <button
              type="button"
              onClick={() => save(analytics, marketing)}
              className="btn-spring flex-1 py-2.5 rounded-xl text-sm font-semibold"
              style={INK_BTN}
            >
              Zapisz wybór
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => save(true, false)}
                className="btn-spring flex-1 py-2.5 rounded-xl text-sm font-semibold"
                style={INK_BTN}
              >
                Akceptuję
              </button>
              <button
                type="button"
                onClick={() => save(false, false)}
                className="btn-spring flex-1 py-2.5 rounded-xl text-sm font-medium"
                style={GLASS_BTN}
              >
                Tylko niezbędne
              </button>
              <button
                type="button"
                onClick={() => setShowDetails(true)}
                className="py-2.5 px-4 text-slate-500 hover:text-slate-700 rounded-xl text-sm font-medium transition-colors"
              >
                Ustawienia
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
