"use client";

import { useState, useTransition, useRef, useCallback } from "react";
import { updateBusinessProfile } from "@/lib/actions/business";
import { uploadBusinessImage } from "@/lib/actions/upload";
import { LocationPicker } from "@/components/business/location-picker";
import { SPECIALTY_TAGS } from "@/lib/discovery";
import { categoryLabelFor } from "@/lib/categories";
import { useT, useLocale } from "@/components/i18n/i18n-provider";
import type { Dictionary } from "@/lib/i18n/dictionaries";
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

const TAB_IDS: Tab[] = ["podstawowe", "kontakt", "media", "social"];

export function ProfileClient({ business, embedded = false }: Props) {
  const t = useT();
  const T = t.pages.profile;
  const locale = useLocale();
  const TAB_LABEL: Record<Tab, string> = { podstawowe: T.tabBasics, kontakt: T.tabContact, media: T.tabMedia, social: T.tabSocial };
  const [activeTab, setActiveTab] = useState<Tab>("podstawowe");
  const [isPending, startTransition] = useTransition();
  const [savedTab, setSavedTab] = useState<Tab | null>(null);

  // Tab 1 — Podstawowe
  const [name, setName] = useState(business.name);
  const [description, setDescription] = useState(business.description ?? "");
  const [shortDescription, setShortDescription] = useState(business.shortDescription ?? "");
  const [subcategory, setSubcategory] = useState(business.subcategory ?? "");
  const [specialties, setSpecialties] = useState<string[]>(business.specialties ?? []);

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
      podstawowe: { name, description, shortDescription, subcategory, specialties },
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
          {t.pages.hours.saving}
        </>
      ) : savedTab === activeTab ? (
        <>
          <CheckIcon className="w-4 h-4" />
          {T.saved}
        </>
      ) : (
        t.common.save
      )}
    </InkButton>
  );

  return (
    <div className={cn(embedded ? "space-y-5" : "max-w-4xl mx-auto space-y-5")}>
      {embedded ? (
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-sm text-slate-500">{T.embeddedNote}</p>
          {saveButton}
        </div>
      ) : (
        <PageHeader
          title={T.title}
          subtitle={T.subtitle}
          actions={saveButton}
        />
      )}

      {/* Tabs */}
      <GlassCard className="fade-rise fade-rise-d1 overflow-hidden">
        <div className="flex" style={{ borderBottom: HAIRLINE }}>
          {TAB_IDS.map((id) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              aria-current={activeTab === id ? "true" : undefined}
              className={`flex-1 py-3.5 text-sm font-medium transition-colors relative ${
                activeTab === id
                  ? "text-slate-900 font-semibold"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {TAB_LABEL[id]}
              {activeTab === id && (
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
                  {T.fieldName}
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
                  {T.fieldShort}
                </label>
                <input
                  type="text"
                  maxLength={160}
                  value={shortDescription}
                  onChange={(e) => setShortDescription(e.target.value)}
                  placeholder={T.shortPh}
                  className={INPUT_CLS}
                />
                <p className="text-xs text-slate-400 mt-1 text-right tabular-nums">{shortDescription.length}/160</p>
              </div>
              <div>
                <label className={LABEL_CLS}>
                  {T.fieldFull}
                </label>
                <textarea
                  rows={5}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={T.fullPh}
                  className={cn(INPUT_CLS, "resize-none")}
                />
              </div>
              <div>
                <label className={LABEL_CLS}>
                  {T.fieldCategory}
                </label>
                <input
                  type="text"
                  value={categoryLabelFor(business.category, locale)}
                  disabled
                  className={cn(INPUT_CLS, "opacity-60 cursor-not-allowed")}
                />
                <p className="text-xs text-slate-500 mt-1">
                  {T.categoryNote}
                </p>
              </div>
              <div>
                <label className={LABEL_CLS}>
                  {T.fieldSubcategory}
                </label>
                <input
                  type="text"
                  value={subcategory}
                  onChange={(e) => setSubcategory(e.target.value)}
                  placeholder={T.subcategoryPh}
                  className={INPUT_CLS}
                />
              </div>

              <div>
                <label className={LABEL_CLS}>{T.fieldSpecialties}</label>
                <p className="text-xs text-slate-500 mb-2">{T.specialtiesHint}</p>
                <div className="flex flex-wrap gap-1.5">
                  {SPECIALTY_TAGS.map((tag) => {
                    const on = specialties.includes(tag.slug);
                    return (
                      <button
                        key={tag.slug}
                        type="button"
                        aria-pressed={on}
                        onClick={() =>
                          setSpecialties((prev) =>
                            on ? prev.filter((s) => s !== tag.slug) : prev.length >= 6 ? prev : [...prev, tag.slug]
                          )
                        }
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${on ? "text-white" : "text-slate-600"}`}
                        style={on
                          ? { background: "var(--ink-raised)", border: "1px solid #0F172A" }
                          : { background: "var(--surface)", border: "1px solid var(--hairline)" }}
                      >
                        {t.specialties[tag.slug as keyof Dictionary["specialties"]] ?? tag.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* Tab 2: Kontakt */}
          {activeTab === "kontakt" && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={LABEL_CLS}>
                    {T.fieldPhone}
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
                    {T.fieldEmail}
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
                  {T.fieldWebsite}
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
                  {T.fieldAddress}
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder={T.addressPh}
                  className={INPUT_CLS}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={LABEL_CLS}>
                    {T.fieldCity}
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
                    {T.fieldPostal}
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

              <LocationPicker
                current={{
                  placeId: business.placeId,
                  latitude: business.latitude,
                  longitude: business.longitude,
                  address: business.address,
                }}
              />
            </>
          )}

          {/* Tab 3: Media */}
          {activeTab === "media" && (
            <>
              <ImageUploadField
                label={T.logoLabel}
                hint={T.logoHint}
                value={logoUrl}
                onChange={setLogoUrl}
                shape="square"
                t={T}
              />
              <ImageUploadField
                label={T.coverLabel}
                hint={T.coverHint}
                value={coverImageUrl}
                onChange={setCoverImageUrl}
                shape="wide"
                t={T}
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
                  {T.socialNote}
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
  t,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (url: string) => void;
  shape: "square" | "wide";
  t: Dictionary["pages"]["profile"];
}) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      if (uploading) return; // no duplicate submissions
      setError("");

      // Client pre-validation — drag&drop bypasses the input's `accept`, so
      // iPhone HEIC photos and oversized files must be caught here, BEFORE the
      // request (a rejected oversized action body used to crash the page).
      const okTypes = ["image/jpeg", "image/png", "image/webp", "image/avif"];
      const name = file.name.toLowerCase();
      if (/\.(heic|heif)$/.test(name) || /image\/hei[cf]/.test(file.type)) {
        setError(t.errHeic);
        return;
      }
      if (!okTypes.includes(file.type)) {
        setError(t.errType);
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError(t.errSize);
        return;
      }

      setUploading(true);
      try {
        const fd = new FormData();
        fd.append("file", file);
        const result = await uploadBusinessImage(fd);
        if (result.error) {
          setError(result.error);
        } else if (result.url) {
          onChange(result.url);
        }
      } catch {
        // Network/server failure must never crash the form or lose the
        // existing image — keep everything usable with an honest message.
        setError(t.errUpload);
      } finally {
        setUploading(false);
      }
    },
    [onChange, uploading, t]
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
          "relative rounded-xl border-2 border-dashed cursor-pointer transition-colors overflow-hidden bg-white/50",
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
                {t.changePhoto}
              </span>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-400">
            <UploadIcon className="w-8 h-8" />
            <p className="text-sm font-medium">{t.dropHere}</p>
            <p className="text-xs text-slate-400">{t.dropHint}</p>
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
          {t.removePhoto}
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
