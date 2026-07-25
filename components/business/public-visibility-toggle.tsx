"use client";

import { useState, useTransition } from "react";
import { setPublicProfileActive } from "@/lib/actions/business";
import { cn } from "@/lib/utils";
import { CHIP } from "@/components/ui/glass";

/**
 * Owner control: "Profil publiczny aktywny". Toggles Business.isActive via the
 * server action. Optimistic; reverts on error. Disabling hides the salon from
 * every public surface (search, categories, recommendations, sitemap, direct
 * /b/[slug] → not-found) without deleting anything; enabling restores it.
 */
export function PublicVisibilityToggle({
  initialActive,
  published,
}: {
  initialActive: boolean;
  published: boolean;
}) {
  const [active, setActive] = useState(initialActive);
  const [pending, start] = useTransition();
  const [err, setErr] = useState("");

  function toggle() {
    const next = !active;
    setErr("");
    setActive(next); // optimistic
    start(async () => {
      try {
        await setPublicProfileActive(next);
      } catch {
        setActive(!next); // revert
        setErr("Nie udało się zapisać zmiany. Spróbuj ponownie.");
      }
    });
  }

  return (
    <div className="rounded-2xl p-4 mb-5" style={CHIP}>
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900">Profil publiczny aktywny</p>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            {active
              ? "Twój salon jest widoczny w wyszukiwarce i klienci mogą rezerwować online."
              : "Twój salon jest ukryty — nie pojawia się w wyszukiwarce, kategoriach ani pod bezpośrednim linkiem. Dane, usługi i wizyty pozostają nienaruszone."}
          </p>
          {active && !published && (
            <p className="text-xs mt-1.5" style={{ color: "#B45309" }}>
              Profil stanie się publiczny po uzupełnieniu wymaganych informacji.
            </p>
          )}
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={active}
          aria-label="Profil publiczny aktywny"
          onClick={toggle}
          disabled={pending}
          className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 disabled:opacity-60"
          style={{ background: active ? "#0F172A" : "rgba(148,163,184,0.45)" }}
        >
          <span className={cn("inline-block h-4 w-4 rounded-full bg-white shadow transition-transform", active ? "translate-x-6" : "translate-x-1")} />
        </button>
      </div>
      {err && <p role="alert" className="text-xs mt-2" style={{ color: "#BE123C" }}>{err}</p>}
    </div>
  );
}
