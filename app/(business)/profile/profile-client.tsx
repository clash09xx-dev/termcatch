"use client";

import { useState, useTransition } from "react";
import { updateBusinessProfile } from "@/lib/actions/business";
import type { Business } from "@prisma/client";

type Props = {
  business: Business;
};

type Tab = "podstawowe" | "kontakt" | "media" | "social";

const TABS: { id: Tab; label: string }[] = [
  { id: "podstawowe", label: "Podstawowe" },
  { id: "kontakt", label: "Kontakt" },
  { id: "media", label: "Media" },
  { id: "social", label: "Social media" },
];

export function ProfileClient({ business }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("podstawowe");
  const [isPending, startTransition] = useTransition();
  const [savedTab, setSavedTab] = useState<Tab | null>(null);

  // Tab 1 — Podstawowe
  const [name, setName] = useState(business.name);
  const [description, setDescription] = useState(business.description ?? "");
  const [shortDescription, setShortDescription] = useState(business.shortDescription ?? "");
  const [subcategory, setSubcategory] = useState(business.subcategory ?? "");

  // Tab 2 — Kontakt
  const [phone, setPhone] = useState(business.phone ?? "");
  const [email, setEmail] = useState(business.email ?? "");
  const [website, setWebsite] = useState(business.website ?? "");
  const [address, setAddress] = useState(business.address);
  const [city, setCity] = useState(business.city);
  const [postalCode, setPostalCode] = useState(business.postalCode);

  // Tab 3 — Media
  const [logoUrl, setLogoUrl] = useState(business.logoUrl ?? "");
  const [coverImageUrl, setCoverImageUrl] = useState(business.coverImageUrl ?? "");

  // Tab 4 — Social
  const [instagramUrl, setInstagramUrl] = useState(business.instagramUrl ?? "");
  const [facebookUrl, setFacebookUrl] = useState(business.facebookUrl ?? "");

  function handleSave() {
    const dataMap: Record<Tab, Parameters<typeof updateBusinessProfile>[0]> = {
      podstawowe: { name, description, shortDescription, subcategory },
      kontakt: { phone, email, website, address, city, postalCode },
      media: { logoUrl, coverImageUrl },
      social: { instagramUrl, facebookUrl },
    };

    startTransition(async () => {
      await updateBusinessProfile(dataMap[activeTab]);
      setSavedTab(activeTab);
      setTimeout(() => setSavedTab(null), 2000);
    });
  }

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Profil salonu</h1>
          <p className="text-sm text-surface-700 mt-0.5">
            Informacje widoczne dla klientów
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={isPending}
          className="bg-gray-900 hover:bg-gray-800 text-white rounded-xl px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-60 flex items-center gap-2"
        >
          {isPending ? (
            <>
              <SpinnerIcon className="w-4 h-4 animate-spin" />
              Zapisywanie...
            </>
          ) : savedTab === activeTab ? (
            <>
              <CheckIcon className="w-4 h-4" />
              Zapisano
            </>
          ) : (
            "Zapisz"
          )}
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-white border border-surface-100 rounded-2xl overflow-hidden">
        <div className="flex border-b border-surface-100">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-3.5 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "text-brand-600 border-b-2 border-brand-600"
                  : "text-surface-700 hover:text-gray-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6 space-y-5">
          {/* Tab 1: Podstawowe */}
          {activeTab === "podstawowe" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1.5">
                  Nazwa salonu *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border border-surface-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-gray-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1.5">
                  Krótki opis (do 160 znaków)
                </label>
                <input
                  type="text"
                  maxLength={160}
                  value={shortDescription}
                  onChange={(e) => setShortDescription(e.target.value)}
                  placeholder="Jedno zdanie opisujące Twój salon..."
                  className="w-full border border-surface-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-gray-400"
                />
                <p className="text-xs text-surface-700 mt-1 text-right">{shortDescription.length}/160</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1.5">
                  Pełny opis
                </label>
                <textarea
                  rows={5}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Opisz swój salon, ofertę i wyróżniki..."
                  className="w-full border border-surface-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-gray-400 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1.5">
                  Kategoria
                </label>
                <input
                  type="text"
                  value={business.category}
                  disabled
                  className="w-full border border-surface-100 rounded-xl px-3.5 py-2.5 text-sm bg-surface-50 text-surface-700 cursor-not-allowed"
                />
                <p className="text-xs text-surface-700 mt-1">
                  Kategoria nie może być zmieniona po rejestracji. Skontaktuj się z pomocą techniczną.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1.5">
                  Podkategoria (opcjonalnie)
                </label>
                <input
                  type="text"
                  value={subcategory}
                  onChange={(e) => setSubcategory(e.target.value)}
                  placeholder="np. Kosmetologia, Makijaż permanentny..."
                  className="w-full border border-surface-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-gray-400"
                />
              </div>
            </>
          )}

          {/* Tab 2: Kontakt */}
          {activeTab === "kontakt" && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1.5">
                    Telefon
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+48 000 000 000"
                    className="w-full border border-surface-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1.5">
                    E-mail
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="salon@example.com"
                    className="w-full border border-surface-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-gray-400"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1.5">
                  Strona internetowa
                </label>
                <input
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://www.twojastrona.pl"
                  className="w-full border border-surface-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-gray-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1.5">
                  Adres
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="ul. Kwiatowa 5/3"
                  className="w-full border border-surface-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-gray-400"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1.5">
                    Miasto
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full border border-surface-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1.5">
                    Kod pocztowy
                  </label>
                  <input
                    type="text"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    placeholder="00-000"
                    className="w-full border border-surface-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-gray-400"
                  />
                </div>
              </div>
            </>
          )}

          {/* Tab 3: Media */}
          {activeTab === "media" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1.5">
                  URL logo
                </label>
                <input
                  type="url"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full border border-surface-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-gray-400"
                />
                {logoUrl && (
                  <div className="mt-3">
                    <p className="text-xs text-surface-700 mb-2">Podgląd:</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={logoUrl}
                      alt="Logo podgląd"
                      className="w-20 h-20 rounded-xl object-cover border border-surface-200"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1.5">
                  URL zdjęcia okładkowego
                </label>
                <input
                  type="url"
                  value={coverImageUrl}
                  onChange={(e) => setCoverImageUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full border border-surface-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-gray-400"
                />
                {coverImageUrl && (
                  <div className="mt-3">
                    <p className="text-xs text-surface-700 mb-2">Podgląd:</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={coverImageUrl}
                      alt="Okładka podgląd"
                      className="w-full h-40 rounded-xl object-cover border border-surface-200"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                )}
              </div>
            </>
          )}

          {/* Tab 4: Social */}
          {activeTab === "social" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1.5">
                  Instagram
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-700 text-sm">
                    instagram.com/
                  </span>
                  <input
                    type="text"
                    value={instagramUrl}
                    onChange={(e) => setInstagramUrl(e.target.value)}
                    placeholder="twojsalon"
                    className="w-full border border-surface-200 rounded-xl pl-[120px] pr-3.5 py-2.5 text-sm focus:outline-none focus:border-gray-400"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1.5">
                  Facebook
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-700 text-sm">
                    facebook.com/
                  </span>
                  <input
                    type="text"
                    value={facebookUrl}
                    onChange={(e) => setFacebookUrl(e.target.value)}
                    placeholder="twojsalon"
                    className="w-full border border-surface-200 rounded-xl pl-[112px] pr-3.5 py-2.5 text-sm focus:outline-none focus:border-gray-400"
                  />
                </div>
              </div>
              <div className="p-4 bg-surface-50 rounded-xl">
                <p className="text-xs text-surface-700">
                  Linki do social media są wyświetlane na Twojej stronie profilu, którą widzą klienci.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SpinnerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4Z" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
    </svg>
  );
}
