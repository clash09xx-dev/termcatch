"use client";

// ─── Salon location picker (Google Places Autocomplete) ──────────────────────
// The owner must pick a real Google suggestion — typed text is never treated
// as coordinates. Works only when NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is a real
// key; otherwise shows an honest unavailable state (never a fake map).

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { mapsBrowserKey, embedUrl, navigationUrl } from "@/lib/maps";
import { saveBusinessLocation, clearBusinessLocation } from "@/lib/actions/location";
import { CHIP, HAIRLINE } from "@/components/ui/glass/tokens";

type Picked = { placeId: string; formattedAddress: string; latitude: number; longitude: number };

type Props = {
  current: { placeId: string | null; latitude: number | null; longitude: number | null; address: string };
};

const INPUT = "input-glass w-full px-3.5 py-2.5 text-sm rounded-xl outline-none text-slate-800 placeholder:text-slate-400";

let mapsLoader: Promise<void> | null = null;
function loadMapsJs(key: string): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  const w = window as unknown as { google?: { maps?: { places?: unknown } } };
  if (w.google?.maps?.places) return Promise.resolve();
  if (!mapsLoader) {
    mapsLoader = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=places&language=pl&region=PL`;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => { mapsLoader = null; reject(new Error("maps load failed")); };
      document.head.appendChild(s);
    });
  }
  return mapsLoader;
}

export function LocationPicker({ current }: Props) {
  const router = useRouter();
  const key = mapsBrowserKey();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [picked, setPicked] = useState<Picked | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [isPending, start] = useTransition();

  const verified = current.latitude != null && current.longitude != null;

  useEffect(() => {
    if (!key || !inputRef.current) return;
    let ac: { addListener: (ev: string, fn: () => void) => void; getPlace: () => unknown } | null = null;
    loadMapsJs(key)
      .then(() => {
        const g = (window as unknown as { google: { maps: { places: { Autocomplete: new (el: HTMLInputElement, opts: unknown) => typeof ac } } } }).google;
        if (!inputRef.current) return;
        ac = new g.maps.places.Autocomplete(inputRef.current, {
          componentRestrictions: { country: "pl" },
          fields: ["place_id", "formatted_address", "geometry"],
          types: ["address"],
        });
        ac!.addListener("place_changed", () => {
          const place = ac!.getPlace() as {
            place_id?: string;
            formatted_address?: string;
            geometry?: { location?: { lat: () => number; lng: () => number } };
          };
          if (place.place_id && place.formatted_address && place.geometry?.location) {
            setMsg(null);
            setPicked({
              placeId: place.place_id,
              formattedAddress: place.formatted_address,
              latitude: place.geometry.location.lat(),
              longitude: place.geometry.location.lng(),
            });
          }
        });
      })
      .catch(() => setLoadError(true));
    return () => { ac = null; };
  }, [key]);

  function save() {
    if (!picked) return;
    start(async () => {
      const res = await saveBusinessLocation(picked);
      if (res.ok) {
        setMsg({ ok: true, text: "Lokalizacja zapisana — pinezka na mapie jest teraz dokładna." });
        setPicked(null);
        if (inputRef.current) inputRef.current.value = "";
        router.refresh();
      } else {
        setMsg({ ok: false, text: res.error });
      }
    });
  }

  function clear() {
    start(async () => {
      const res = await clearBusinessLocation();
      setMsg(res.ok ? { ok: true, text: "Lokalizacja została wyczyszczona." } : { ok: false, text: res.error });
      router.refresh();
    });
  }

  const preview = picked ?? (verified
    ? { placeId: current.placeId ?? "", formattedAddress: current.address, latitude: current.latitude!, longitude: current.longitude! }
    : null);

  return (
    <div className="rounded-2xl p-4 space-y-3" style={CHIP}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-800">Lokalizacja na mapie</p>
        <span
          className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
          style={verified
            ? { background: "rgba(16,185,129,0.10)", border: "1px solid rgba(16,185,129,0.25)", color: "#047857" }
            : { background: "rgba(251,191,36,0.10)", border: "1px solid rgba(217,119,6,0.25)", color: "#B45309" }}
        >
          {verified ? "Potwierdzona" : "Niepotwierdzona"}
        </span>
      </div>

      {!key ? (
        <p className="text-xs text-slate-500 leading-relaxed">
          Wyszukiwanie adresu Google nie jest jeszcze skonfigurowane
          (<span className="font-mono text-[11px]">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</span>).
          Do tego czasu profil publiczny pokazuje adres tekstowo, bez pinezki na mapie —
          nie zgadujemy lokalizacji.
        </p>
      ) : loadError ? (
        <p className="text-xs text-slate-500">Nie udało się załadować map Google. Odśwież stronę i spróbuj ponownie.</p>
      ) : (
        <>
          <input
            ref={inputRef}
            placeholder="Zacznij wpisywać adres i wybierz podpowiedź…"
            className={INPUT}
            aria-label="Wyszukaj adres salonu"
          />
          <p className="text-[11px] text-slate-400">
            Wybierz adres z listy podpowiedzi — dopiero wtedy pinezka będzie dokładna.
          </p>
        </>
      )}

      {preview && (
        <div className="rounded-xl overflow-hidden" style={{ border: HAIRLINE, background: "rgba(255,255,255,0.7)" }}>
          <div className="px-3 py-2 text-xs text-slate-700 flex items-center justify-between gap-2">
            <span className="truncate">{preview.formattedAddress}</span>
            <span className="tabular-nums text-slate-400 flex-shrink-0">
              {preview.latitude.toFixed(5)}, {preview.longitude.toFixed(5)}
            </span>
          </div>
          {key && (
            <iframe
              title="Podgląd lokalizacji salonu"
              src={embedUrl(key, preview)}
              className="w-full h-44 border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          )}
          <div className="px-3 py-2" style={{ borderTop: HAIRLINE }}>
            <a
              href={navigationUrl(preview)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-semibold text-slate-500 hover:text-slate-800"
            >
              Sprawdź w Google Maps ↗
            </a>
          </div>
        </div>
      )}

      {msg && (
        <p role="status" className="text-xs font-medium" style={{ color: msg.ok ? "#047857" : "#BE123C" }}>
          {msg.text}
        </p>
      )}

      <div className="flex gap-2">
        {picked && (
          <button
            type="button"
            onClick={save}
            disabled={isPending}
            className="btn-spring px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: "linear-gradient(180deg,#1E293B,#0F172A)", border: "1px solid #0F172A" }}
          >
            {isPending ? "Zapisywanie…" : "Zapisz lokalizację"}
          </button>
        )}
        {verified && (
          <button
            type="button"
            onClick={clear}
            disabled={isPending}
            className="btn-spring px-4 py-2 rounded-xl text-sm font-medium text-slate-600 disabled:opacity-50"
            style={{ background: "rgba(255,255,255,0.72)", border: "1px solid rgba(203,213,225,0.55)" }}
          >
            Wyczyść lokalizację
          </button>
        )}
      </div>
    </div>
  );
}
