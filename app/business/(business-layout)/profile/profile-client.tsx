"use client";

import { useState, useTransition, useRef, useCallback } from "react";
import { updateBusinessProfile } from "@/lib/actions/business";
import { uploadBusinessImage } from "@/lib/actions/upload";
import { cn } from "@/lib/utils";
import type { Business } from "@prisma/client";
import { PageHeader, GlassCard, InkButton, HAIRLINE, CHIP } from "@/components/ui/glass";

const INPUT_CLS =
  "input-glass w-full rounded-xl px-3.5 py-2.5 text-sm outline-none text-slate-800 placeholder:text-slate-400";
const LABEL_CLS = "block text-sm font-medium text-slate-800 mb-1.5";

type Props = {
  business: Business;
  /** When embedded inside Ustawienia, hide the standalone page header
   * (the section already provides context) but keep the per-tab save. */
  embedded?: boolean;
};

type Tab = "podstawowe" | "kontakt" | "media" | "social";

const TABS: { id: Tab; label: string }[] = [
  { id: "podstawowe", label: "Podstawowe" },
  { id: "kontakt", label: "Kontakt" },
  { id: "media", label: "Media" },
  { id: "social", label: "Social media" },
];

export function ProfileClient({ business, embedded = false }: Props) {
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

  const saveButton = (
    <InkButton onClick={handleSave} disabled={isPending}>
      {isPending ? (
        <>
          <SpinnerIcon className="w-4 h-4 animate-spin" />
          Zapisywanie…
        </>
      ) : savedTab === activeTab ? (
        <>
          <CheckIcon className="w-4 h-4" />
          Zapisano
        </>
      ) : (
        "Zapisz"
      )}
    </InkButton>
  );

  return (
    <div className={cn(embedded ? "space-y-5" : "max-w-4xl mx-auto space-y-5")}>
      {embedded ? (
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-sm text-slate-500">Te informacje widzą klienci w Twoim profilu publicznym.</p>
          {saveButton}
        </div>
      ) : (
        <PageHeader
          title="Profil salonu"
          subtitle="Informacje widoczne dla klientów"
          actions={saveButton}
        />
      )}

      {/* Tabs */}
      <GlassCard className="fade-rise fade-rise-d1 overflow-hidden">
        <div className="flex" style={{ borderBottom: HAIRLINE }}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              aria-current={activeTab === tab.id ? "true" : undefined}
              className={`flex-1 py-3.5 text-sm font-medium transition-colors relative ${
                activeTab === tab.id
                  ? "text-slate-900 font-semibold"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <span
                  className="absolute bottom-0 left-1/4 right-1/4 h-[2.5px] rounded-full"
                  style={{ background: "linear-gradient(90deg, #1E293B, #0F172A)" }}
                  aria-hidden="true"
                />
              )}
            </button>
          ))}
        </div>

        <div className="p-6 space-y-5">
          {/* Tab 1: Podstawowe */}
          {activeTab === "podstawowe" && (
            <>
              <div>
                <label className={LABEL_CLS}>
                  Nazwa salonu *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={INPUT_CLS}
                />
              </div>
              <div>
                <label className={LABEL_CLS}>
                  Krótki opis (do 160 znaków)
                </label>
                <input
                  type="text"
                  maxLength={160}
                  value={shortDescription}
                  onChange={(e) => setShortDescription(e.target.value)}
                  placeholder="Jedno zdanie opisujące Twój salon..."
                  className={INPUT_CLS}
                />
                <p className="text-xs text-slate-400 mt-1 text-right tabular-nums">{shortDescription.length}/160</p>
              </div>
              <div>
                <label className={LABEL_CLS}>
                  Pełny opis
                </label>
                <textarea
                  rows={5}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Opisz swój salon, ofertę i wyróżniki..."
                  className={cn(INPUT_CLS, "resize-none")}
                />
              </div>
              <div>
                <label className={LABEL_CLS}>
                  Kategoria
                </label>
                <input
                  type="text"
                  value={business.category}
                  disabled
                  className={cn(INPUT_CLS, "opacity-60 cursor-not-allowed")}
                />
                <p className="text-xs text-slate-500 mt-1">
                  Kategoria nie może być zmieniona po rejestracji. Skontaktuj się z pomocą techniczną.
                </p>
              </div>
              <div>
                <label className={LABEL_CLS}>
                  Podkategoria (opcjonalnie)
                </label>
                <input
                  type="text"
                  value={subcategory}
                  onChange={(e) => setSubcategory(e.target.value)}
                  placeholder="np. Kosmetologia, Makijaż permanentny..."
                  className={INPUT_CLS}
                />
              </div>
            </>
          )}

          {/* Tab 2: Kontakt */}
          {activeTab === "kontakt" && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={LABEL_CLS}>
                    Telefon
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+48 000 000 000"
                    className={INPUT_CLS}
                  />
                </div>
                <div>
                  <label className={LABEL_CLS}>
                    E-mail
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="salon@example.com"
                    className={INPUT_CLS}
                  />
                </div>
              </div>
              <div>
                <label className={LABEL_CLS}>
                  Strona internetowa
                </label>
                <input
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://www.twojastrona.pl"
                  className={INPUT_CLS}
                />
              </div>
              <div>
                <label className={LABEL_CLS}>
                  Adres
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="ul. Kwiatowa 5/3"
                  className={INPUT_CLS}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={LABEL_CLS}>
                    Miasto
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className={INPUT_CLS}
                  />
                </div>
                <div>
                  <label className={LABEL_CLS}>
                    Kod pocztowy
                  </label>
                  <input
                    type="text"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    placeholder="00-000"
                    className={INPUT_CLS}
                  />
                </div>
              </div>
            </>
          )}

          {/* Tab 3: Media */}
          {activeTab === "media" && (
            <>
              <ImageUploadField
                label="Logo salonu"
                hint="Kwadratowe zdjęcie. Zalecany rozmiar: 400×400 px."
                value={logoUrl}
                onChange={setLogoUrl}
                shape="square"
              />
              <ImageUploadField
                label="Zdjęcie okładkowe"
                hint="Poziome zdjęcie bannerowe. Zalecany rozmiar: 1200×400 px."
                value={coverImageUrl}
                onChange={setCoverImageUrl}
                shape="wide"
              />
            </>
          )}

          {/* Tab 4: Social */}
          {activeTab === "social" && (
            <>
              <div>
                <label className={LABEL_CLS}>
                  Instagram
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
                    instagram.com/
                  </span>
                  <input
                    type="text"
                    value={instagramUrl}
                    onChange={(e) => setInstagramUrl(e.target.value)}
                    placeholder="twojsalon"
                    className={cn(INPUT_CLS, "pl-[120px]")}
                  />
                </div>
              </div>
              <div>
                <label className={LABEL_CLS}>
                  Facebook
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
                    facebook.com/
                  </span>
                  <input
                    type="text"
                    value={facebookUrl}
                    onChange={(e) => setFacebookUrl(e.target.value)}
                    placeholder="twojsalon"
                    className={cn(INPUT_CLS, "pl-[112px]")}
                  />
                </div>
              </div>
              <div className="p-4 rounded-xl" style={CHIP}>
                <p className="text-xs text-slate-600">
                  Linki do social media są wyświetlane na Twojej stronie profilu, którą widzą klienci.
                </p>
              </div>
            </>
          )}
        </div>
      </GlassCard>
    </div>
  );
}

// ── Drag & drop image upload ──────────────────────────────────────────────────

function ImageUploadField({
  label,
  hint,
  value,
  onChange,
  shape,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (url: string) => void;
  shape: "square" | "wide";
}) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setError("");
      setUploading(true);
      const fd = new FormData();
      fd.append("file", file);
      const result = await uploadBusinessImage(fd);
      setUploading(false);
      if (result.error) {
        setError(result.error);
      } else if (result.url) {
        onChange(result.url);
      }
    },
    [onChange]
  );

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  const heightClass = shape === "square" ? "h-36" : "h-44";

  return (
    <div>
      <label className={LABEL_CLS.replace("mb-1.5", "mb-1")}>{label}</label>
      {hint && <p className="text-xs text-slate-500 mb-2">{hint}</p>}

      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !uploading && inputRef.current?.click()}
        className={cn(
          "relative rounded-xl border-2 border-dashed cursor-pointer transition-all overflow-hidden bg-white/50",
          heightClass,
          dragging
            ? "border-slate-400"
            : "border-slate-300 hover:border-slate-400",
          uploading && "pointer-events-none"
        )}
      >
        {value ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/0 hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
              <span className="text-white text-xs font-semibold bg-black/60 px-3 py-1.5 rounded-lg backdrop-blur-sm">
                Zmień zdjęcie
              </span>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-400">
            <UploadIcon className="w-8 h-8" />
            <p className="text-sm font-medium">Przeciągnij zdjęcie lub kliknij</p>
            <p className="text-xs text-slate-400">JPG, PNG, WebP · maks. 5 MB</p>
          </div>
        )}

        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-xl">
            <SpinnerIcon className="w-6 h-6 animate-spin text-slate-500" />
          </div>
        )}
      </div>

      {error && <p className="mt-1.5 text-xs font-medium" style={{ color: "#BE123C" }}>{error}</p>}

      {value && !uploading && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="mt-1.5 text-xs text-slate-400 hover:text-rose-600 transition-colors"
        >
          Usuń zdjęcie
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            handleFile(file);
            e.target.value = "";
          }
        }}
      />
    </div>
  );
}

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
    </svg>
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
