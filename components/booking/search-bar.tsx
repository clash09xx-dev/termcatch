"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const POPULAR_CITIES = ["Kraków", "Warszawa", "Wrocław", "Gdańsk", "Poznań", "Łódź"];

export function SearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("Kraków");
  const [availableToday, setAvailableToday] = useState(false);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (city) params.set("city", city);
    if (availableToday) params.set("available", "today");
    router.push(`/search?${params.toString()}`);
  }

  return (
    <form
      onSubmit={handleSearch}
      className="w-full max-w-2xl mx-auto"
    >
      <div className="flex flex-col sm:flex-row gap-2 p-2 bg-white dark:bg-surface-900 rounded-2xl shadow-soft-xl border border-surface-200 dark:border-surface-700">
        {/* What */}
        <div className="flex-1 relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Usługa lub specjalista..."
            className="w-full pl-9 pr-3 py-3 text-sm text-surface-900 dark:text-white bg-transparent placeholder:text-surface-400 focus:outline-none"
          />
        </div>

        {/* Divider */}
        <div className="hidden sm:block w-px bg-surface-200 dark:bg-surface-700 my-2" />

        {/* City */}
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
          </div>
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="pl-8 pr-8 py-3 text-sm text-surface-700 dark:text-surface-200 bg-transparent focus:outline-none appearance-none cursor-pointer min-w-[130px]"
          >
            <option value="">Całe miasto</option>
            {POPULAR_CITIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-surface-400">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m6 9 6 6 6-6"/>
            </svg>
          </div>
        </div>

        {/* Search button */}
        <button
          type="submit"
          className="flex items-center justify-center gap-2 px-5 py-3 bg-brand-600 hover:bg-brand-700 text-white font-medium text-sm rounded-xl transition-all shadow-brand hover:shadow-brand-lg active:scale-[0.99] whitespace-nowrap"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
          <span className="hidden sm:inline">Szukaj</span>
        </button>
      </div>

      {/* Available today toggle */}
      <div className="flex items-center justify-center gap-2 mt-3">
        <button
          type="button"
          onClick={() => setAvailableToday(!availableToday)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
            availableToday
              ? "bg-success-50 text-success-700 border border-success-200"
              : "bg-surface-100 dark:bg-surface-800 text-surface-500 dark:text-surface-400 hover:bg-surface-200 dark:hover:bg-surface-700"
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${availableToday ? "bg-success-500" : "bg-surface-400"}`} />
          Dostępne dziś
        </button>
        <button
          type="button"
          onClick={() => {
            setAvailableToday(true);
            const params = new URLSearchParams();
            if (query) params.set("q", query);
            if (city) params.set("city", city);
            params.set("available", "now");
            router.push(`/search?${params.toString()}`);
          }}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-surface-100 dark:bg-surface-800 text-surface-500 dark:text-surface-400 hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors"
        >
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-success-500" />
          </span>
          Dostępne teraz
        </button>
      </div>
    </form>
  );
}
