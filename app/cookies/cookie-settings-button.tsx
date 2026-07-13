"use client";

import { openConsentSettings } from "@/components/cookie-consent";
import { INK_BTN } from "@/components/ui/glass/tokens";

export default function CookieSettingsButton() {
  return (
    <button
      type="button"
      onClick={openConsentSettings}
      className="btn-spring px-5 py-2.5 text-sm font-semibold rounded-xl"
      style={INK_BTN}
    >
      Zmień ustawienia cookies
    </button>
  );
}
