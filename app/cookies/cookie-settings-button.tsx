"use client";

import { openConsentSettings } from "@/components/cookie-consent";

export default function CookieSettingsButton() {
  return (
    <button
      type="button"
      onClick={openConsentSettings}
      className="px-5 py-2.5 bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold rounded-xl transition-colors"
    >
      Zmień ustawienia cookies
    </button>
  );
}
