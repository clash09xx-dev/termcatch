"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState, useCallback, useTransition } from "react";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { value: "HAIR_SALON", label: "Fryzjer" },
  { value: "BARBER", label: "Barber" },
  { value: "NAIL_SALON", label: "Paznokcie" },
  { value: "MASSAGE", label: "Masaż" },
  { value: "SPA", label: "SPA" },
  { value: "BEAUTY_CLINIC", label: "Klinika urody" },
  { value: "EYEBROWS_LASHES", label: "Brwi & Rzęsy" },
  { value: "MAKEUP", label: "Makijaż" },
  { value: "TATTOO", label: "Tatuaż" },
  { value: "PHYSIOTHERAPY", label: "Fizjoterapia" },
  { value: "PERSONAL_TRAINER", label: "Trener personalny" },
  { value: "YOGA", label: "Joga" },
  { value: "DENTIST", label: "Stomatolog" },
  { value: "PSYCHOLOGIST", label: "Psycholog" },
  { value: "NUTRITIONIST", label: "Dietetyk" },
  { value: "GENERAL_PHYSICIAN", label: "Lekarz ogólny" },
];

interface SearchFiltersProps {
  currentQ?: string;
  currentCategory?: string;
  currentCity?: string;
  currentDate?: string;
}

export default function SearchFilters({
  currentQ,
  currentCategory,
  currentCity,
  currentDate,
}: SearchFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const [q, setQ] = useState(currentQ ?? "");
  const [category, setCategory] = useState(currentCategory ?? "");
  const [city, setCity] = useState(currentCity ?? "");
  const [availableToday, setAvailableToday] = useState(
    currentDate === new Date().toISOString().slice(0, 10)
  );

  const applyFilters = useCallback(
    (overrides: {
      q?: string;
      category?: string;
      city?: string;
      availableToday?: boolean;
    }) => {
      const newQ = overrides.q !== undefined ? overrides.q : q;
      const newCategory =
        overrides.category !== undefined ? overrides.category : category;
      const newCity = overrides.city !== undefined ? overrides.city : city;
      const newToday =
        overrides.availableToday !== undefined
          ? overrides.availableToday
          : availableToday;

      const params = new URLSearchParams();
      if (newQ) params.set("q", newQ);
      if (newCategory) params.set("category", newCategory);
      if (newCity) params.set("city", newCity);
      if (newToday) params.set("date", new Date().toISOString().slice(0, 10));

      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [q, category, city, availableToday, pathname, router]
  );

  const handleCategoryToggle = (value: string) => {
    const next = category === value ? "" : value;
    setCategory(next);
    applyFilters({ category: next });
  };

  const handleTodayToggle = () => {
    const next = !availableToday;
    setAvailableToday(next);
    applyFilters({ availableToday: next });
  };

  const handleReset = () => {
    setQ("");
    setCategory("");
    setCity("");
    setAvailableToday(false);
    startTransition(() => {
      router.push(pathname);
    });
  };

  const hasFilters = q || category || city || availableToday;

  return (
    <div
      className={cn(
        "space-y-6 transition-opacity duration-200",
        isPending && "opacity-60 pointer-events-none"
      )}
    >
      {/* Search input */}
      <div>
        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
          Szukaj
        </label>
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") applyFilters({ q });
            }}
            onBlur={() => applyFilters({ q })}
            placeholder="Fryzjer, masaż, manicure..."
            className="w-full pl-9 pr-3 py-2.5 text-sm bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 placeholder-gray-400 text-gray-800"
          />
        </div>
      </div>

      {/* City filter */}
      <div>
        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
          Miasto
        </label>
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"
            />
          </svg>
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") applyFilters({ city });
            }}
            onBlur={() => applyFilters({ city })}
            placeholder="np. Warszawa"
            className="w-full pl-9 pr-3 py-2.5 text-sm bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 placeholder-gray-400 text-gray-800"
          />
        </div>
      </div>

      {/* Available today toggle */}
      <div>
        <button
          type="button"
          onClick={handleTodayToggle}
          className={cn(
            "w-full flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-medium transition-colors",
            availableToday
              ? "bg-gray-900 border-gray-900 text-white"
              : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
          )}
        >
          <span>Dostępne dziś</span>
          <span
            className={cn(
              "w-4 h-4 rounded flex items-center justify-center border transition-colors",
              availableToday
                ? "bg-white border-white"
                : "border-gray-300"
            )}
          >
            {availableToday && (
              <svg
                className="w-3 h-3 text-gray-900"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={3}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m5 13 4 4L19 7"
                />
              </svg>
            )}
          </span>
        </button>
      </div>

      {/* Category filter */}
      <div>
        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-3">
          Kategoria
        </label>
        <div className="space-y-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              type="button"
              onClick={() => handleCategoryToggle(cat.value)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-colors text-left",
                category === cat.value
                  ? "bg-gray-900 text-white"
                  : "text-gray-700 hover:bg-gray-50"
              )}
            >
              <span
                className={cn(
                  "w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors",
                  category === cat.value
                    ? "bg-white border-white"
                    : "border-gray-300"
                )}
              >
                {category === cat.value && (
                  <svg
                    className="w-3 h-3 text-gray-900"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m5 13 4 4L19 7"
                    />
                  </svg>
                )}
              </span>
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Reset */}
      {hasFilters && (
        <button
          type="button"
          onClick={handleReset}
          className="w-full text-sm text-gray-500 hover:text-gray-900 underline underline-offset-4 transition-colors py-1"
        >
          Wyczyść filtry
        </button>
      )}
    </div>
  );
}
