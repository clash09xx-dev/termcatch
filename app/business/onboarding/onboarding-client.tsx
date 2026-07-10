"use client";

// ─── Focused onboarding — Machined Silver, full screen ──────────────────────
// Six small steps on ambient mesh. Ink primary, glass everything else,
// horizontal step slides, hard redirect on success (no router-cache bounce).

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Wordmark } from "@/components/brand/wordmark";
import { createBusiness, type OnboardingInput, type WorkingHourInput } from "@/lib/actions/business";
import { ServiceCategory } from "@prisma/client";
import { stepSlide, stepFade, SPRING, useReducedMotion } from "@/lib/motion";

// ─── Style tokens ─────────────────────────────────────────────

const BG = [
  "radial-gradient(ellipse 120% 80% at 85% -20%, rgba(203,213,225,0.70) 0%, transparent 50%)",
  "radial-gradient(ellipse 80% 70% at -8% 90%, rgba(148,163,184,0.28) 0%, transparent 55%)",
  "radial-gradient(ellipse 60% 50% at 50% 55%, rgba(226,232,240,0.65) 0%, transparent 65%)",
  "linear-gradient(168deg, #E8EFF8 0%, #F1F6FB 40%, #E5EEF9 100%)",
].join(", ");

const CARD: React.CSSProperties = {
  background: "rgba(255,255,255,0.78)",
  backdropFilter: "blur(40px) saturate(200%)",
  WebkitBackdropFilter: "blur(40px) saturate(200%)",
  border: "1px solid rgba(203,213,225,0.50)",
  boxShadow:
    "0 0 0 0.5px rgba(203,213,225,0.40), 0 2px 4px rgba(0,0,0,0.04), 0 12px 36px rgba(100,116,139,0.10), 0 40px 80px rgba(100,116,139,0.05), inset 0 1px 0 rgba(255,255,255,0.98)",
};

const INK = "linear-gradient(180deg, #1E293B 0%, #0F172A 100%)";

const inputCls =
  "input-glass w-full px-3.5 py-2.5 text-sm rounded-xl outline-none text-slate-800 placeholder:text-slate-400 transition-shadow";

// ─── Data ─────────────────────────────────────────────────────

const CATEGORIES: { value: ServiceCategory; label: string }[] = [
  { value: "HAIR_SALON", label: "Salon fryzjerski" },
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
  { value: "YOGA", label: "Joga / Pilates" },
  { value: "DENTIST", label: "Stomatolog" },
  { value: "NUTRITIONIST", label: "Dietetyk" },
  { value: "PSYCHOLOGIST", label: "Psycholog" },
  { value: "GENERAL_PHYSICIAN", label: "Inne" },
];

const DEFAULT_HOURS: WorkingHourInput[] = [
  { dayOfWeek: 0, isOpen: true, openTime: "09:00", closeTime: "18:00" },
  { dayOfWeek: 1, isOpen: true, openTime: "09:00", closeTime: "18:00" },
  { dayOfWeek: 2, isOpen: true, openTime: "09:00", closeTime: "18:00" },
  { dayOfWeek: 3, isOpen: true, openTime: "09:00", closeTime: "18:00" },
  { dayOfWeek: 4, isOpen: true, openTime: "09:00", closeTime: "18:00" },
  { dayOfWeek: 5, isOpen: true, openTime: "10:00", closeTime: "16:00" },
  { dayOfWeek: 6, isOpen: false, openTime: "10:00", closeTime: "16:00" },
];

const DAY_LABELS = ["Poniedziałek", "Wtorek", "Środa", "Czwartek", "Piątek", "Sobota", "Niedziela"];
const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120];

const STEPS = [
  { id: 1, label: "Kategoria" },
  { id: 2, label: "Informacje" },
  { id: 3, label: "Adres" },
  { id: 4, label: "Godziny" },
  { id: 5, label: "Zespół" },
  { id: 6, label: "Usługa" },
];

// ─── Component ────────────────────────────────────────────────

export function OnboardingClient({ ownerName }: { ownerName: string }) {
  const reduceMotion = useReducedMotion();
  const [isPending, startTransition] = useTransition();

  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const [category, setCategory] = useState<ServiceCategory | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [hours, setHours] = useState<WorkingHourInput[]>(DEFAULT_HOURS);
  const [addSelf, setAddSelf] = useState(true);
  const [staffTitle, setStaffTitle] = useState("");
  const [serviceName, setServiceName] = useState("");
  const [serviceDuration, setServiceDuration] = useState(60);
  const [servicePrice, setServicePrice] = useState("");

  function next() {
    setError(null);
    if (step === 1 && !category) return setError("Wybierz kategorię.");
    if (step === 2 && !name.trim()) return setError("Podaj nazwę firmy.");
    if (step === 2 && !phone.trim()) return setError("Podaj numer telefonu.");
    if (step === 3 && (!address.trim() || !city.trim() || !postalCode.trim()))
      return setError("Uzupełnij wszystkie pola adresu.");
    if (step === 6 && serviceName.trim() && (parseFloat(servicePrice) || 0) <= 0)
      return setError("Podaj cenę usługi większą niż 0 zł.");

    if (step < STEPS.length) {
      setDirection(1);
      setStep((s) => s + 1);
    } else {
      handleSubmit();
    }
  }

  function back() {
    setError(null);
    if (step > 1) {
      setDirection(-1);
      setStep((s) => s - 1);
    }
  }

  function updateHour(idx: number, patch: Partial<WorkingHourInput>) {
    setHours((prev) => prev.map((h, i) => (i === idx ? { ...h, ...patch } : h)));
  }

  function handleSubmit() {
    if (!category) return;
    const data: OnboardingInput = {
      category,
      name: name.trim(),
      description: description.trim(),
      phone: phone.trim(),
      email: email.trim(),
      address: address.trim(),
      city: city.trim(),
      postalCode: postalCode.trim(),
      workingHours: hours,
      serviceName: serviceName.trim(),
      serviceDuration,
      servicePrice: parseFloat(servicePrice) || 0,
      addSelfAsStaff: addSelf,
      staffTitle: staffTitle.trim() || undefined,
    };

    startTransition(async () => {
      try {
        await createBusiness(data);
        // Hard navigation — the client router cache would bounce back here
        window.location.assign("/business/dashboard");
      } catch (err) {
        const e = err as { message?: string };
        setError(e.message ?? "Coś poszło nie tak. Spróbuj ponownie.");
      }
    });
  }

  const variants = reduceMotion ? stepFade : stepSlide;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: BG }}>
      {/* Dot grid */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(203,213,225,0.35) 1px, transparent 1px)",
          backgroundSize: "38px 38px",
          maskImage: "radial-gradient(ellipse 85% 75% at 50% 40%, black 30%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(ellipse 85% 75% at 50% 40%, black 30%, transparent 100%)",
        }}
      />

      {/* Top bar — wordmark + progress only, no escape hatches */}
      <header className="relative flex items-center px-6 h-16">
        <Wordmark className="text-[1.05rem]" variant="light" />
        <span className="ml-auto text-xs text-slate-500 tabular-nums">
          Krok {step} z {STEPS.length}
        </span>
      </header>

      {/* Content */}
      <main className="relative flex-1 flex items-start sm:items-center justify-center px-4 py-8 sm:py-6">
        <div className="w-full max-w-xl">
          <div className="rounded-3xl overflow-hidden" style={CARD}>
            {/* Chrome top edge */}
            <div className="h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.95), transparent)" }} />

            <div className="p-6 sm:p-8">
              <AnimatePresence mode="wait" custom={direction} initial={false}>
                <motion.div
                  key={step}
                  custom={direction}
                  variants={variants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                >
                  {/* Step 1 — Category */}
                  {step === 1 && (
                    <StepWrapper title="Czym się zajmujesz?" subtitle="Wybierz kategorię swojej działalności">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {CATEGORIES.map((cat) => {
                          const active = category === cat.value;
                          return (
                            <button
                              key={cat.value}
                              type="button"
                              onClick={() => setCategory(cat.value)}
                              aria-pressed={active}
                              className={cn(
                                "px-3 py-2.5 rounded-xl text-sm font-medium text-left transition-all",
                                active ? "text-white" : "text-slate-600"
                              )}
                              style={active
                                ? { background: INK, border: "1px solid #0F172A", boxShadow: "0 1px 2px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.15)" }
                                : { background: "rgba(255,255,255,0.70)", border: "1px solid rgba(203,213,225,0.50)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.90)" }}
                            >
                              {cat.label}
                            </button>
                          );
                        })}
                      </div>
                    </StepWrapper>
                  )}

                  {/* Step 2 — Basic info */}
                  {step === 2 && (
                    <StepWrapper title="Podstawowe informacje" subtitle="Jak klienci znajdą Twój salon?">
                      <div className="space-y-4">
                        <Field label="Nazwa firmy *" htmlFor="ob-name">
                          <input id="ob-name" type="text" value={name} onChange={(e) => setName(e.target.value)}
                            placeholder="np. Salon Fryzjerski Kowalska" className={inputCls} autoFocus />
                        </Field>
                        <Field label="Krótki opis (opcjonalnie)" htmlFor="ob-desc">
                          <textarea id="ob-desc" value={description} onChange={(e) => setDescription(e.target.value)}
                            placeholder="Opowiedz klientom czym się wyróżniasz…" rows={3} className={cn(inputCls, "resize-none")} />
                        </Field>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <Field label="Telefon *" htmlFor="ob-phone">
                            <input id="ob-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                              placeholder="+48 600 000 000" className={cn(inputCls, "tabular-nums")} />
                          </Field>
                          <Field label="E-mail (opcjonalnie)" htmlFor="ob-email">
                            <input id="ob-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                              placeholder="salon@example.com" className={inputCls} />
                          </Field>
                        </div>
                      </div>
                    </StepWrapper>
                  )}

                  {/* Step 3 — Address */}
                  {step === 3 && (
                    <StepWrapper title="Lokalizacja" subtitle="Gdzie klienci mogą Cię znaleźć?">
                      <div className="space-y-4">
                        <Field label="Ulica i numer *" htmlFor="ob-address">
                          <input id="ob-address" type="text" value={address} onChange={(e) => setAddress(e.target.value)}
                            placeholder="ul. Marszałkowska 1" className={inputCls} autoFocus />
                        </Field>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <Field label="Miasto *" htmlFor="ob-city">
                            <input id="ob-city" type="text" value={city} onChange={(e) => setCity(e.target.value)}
                              placeholder="Warszawa" className={inputCls} />
                          </Field>
                          <Field label="Kod pocztowy *" htmlFor="ob-postal">
                            <input id="ob-postal" type="text" value={postalCode} onChange={(e) => setPostalCode(e.target.value)}
                              placeholder="00-000" maxLength={6} className={cn(inputCls, "tabular-nums")} />
                          </Field>
                        </div>
                      </div>
                    </StepWrapper>
                  )}

                  {/* Step 4 — Hours */}
                  {step === 4 && (
                    <StepWrapper title="Godziny pracy" subtitle="Kiedy przyjmujesz klientów?">
                      <div className="space-y-1.5">
                        {hours.map((h, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl"
                            style={h.isOpen
                              ? { background: "rgba(255,255,255,0.75)", border: "1px solid rgba(203,213,225,0.50)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.90)" }
                              : { background: "rgba(203,213,225,0.10)", border: "1px solid rgba(203,213,225,0.30)" }}
                          >
                            <span className={cn("w-24 sm:w-28 text-sm font-medium flex-shrink-0", h.isOpen ? "text-slate-800" : "text-slate-400")}>
                              {DAY_LABELS[idx]}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateHour(idx, { isOpen: !h.isOpen })}
                              className="relative inline-flex h-5 w-9 flex-shrink-0 rounded-full transition-colors duration-200"
                              style={{ background: h.isOpen ? "#0F172A" : "rgba(203,213,225,0.60)" }}
                              role="switch"
                              aria-checked={h.isOpen}
                              aria-label={`${DAY_LABELS[idx]} — ${h.isOpen ? "otwarte" : "zamknięte"}`}
                            >
                              <span
                                className={cn(
                                  "pointer-events-none inline-block h-4 w-4 mt-0.5 ml-0.5 rounded-full bg-white shadow transition-transform duration-200",
                                  h.isOpen ? "translate-x-4" : "translate-x-0"
                                )}
                              />
                            </button>
                            {h.isOpen ? (
                              <div className="flex items-center gap-2 flex-1">
                                <input type="time" value={h.openTime} onChange={(e) => updateHour(idx, { openTime: e.target.value })}
                                  aria-label={`${DAY_LABELS[idx]} — otwarcie`}
                                  className="input-glass text-sm rounded-lg px-2 py-1.5 text-slate-800 outline-none tabular-nums" />
                                <span className="text-slate-400 text-xs">—</span>
                                <input type="time" value={h.closeTime} onChange={(e) => updateHour(idx, { closeTime: e.target.value })}
                                  aria-label={`${DAY_LABELS[idx]} — zamknięcie`}
                                  className="input-glass text-sm rounded-lg px-2 py-1.5 text-slate-800 outline-none tabular-nums" />
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400 flex-1">Nieczynne</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </StepWrapper>
                  )}

                  {/* Step 5 — You as staff */}
                  {step === 5 && (
                    <StepWrapper
                      title="Ty jako specjalista"
                      subtitle="Klienci rezerwują wizyty u konkretnych osób — dodaj siebie do grafiku"
                    >
                      <button
                        type="button"
                        onClick={() => setAddSelf((v) => !v)}
                        aria-pressed={addSelf}
                        className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left transition-all"
                        style={addSelf
                          ? { background: "rgba(203,213,225,0.20)", border: "1px solid rgba(148,163,184,0.45)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.85)" }
                          : { background: "rgba(255,255,255,0.70)", border: "1px solid rgba(203,213,225,0.45)" }}
                      >
                        <span
                          className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 transition-colors"
                          style={addSelf
                            ? { background: INK, border: "1px solid #0F172A" }
                            : { background: "rgba(255,255,255,0.80)", border: "1px solid rgba(148,163,184,0.50)" }}
                        >
                          {addSelf && (
                            <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" d="m5 13 4 4L19 7" />
                            </svg>
                          )}
                        </span>
                        <span className="flex-1">
                          <span className="block text-sm font-semibold text-slate-900">
                            Dodaj mnie jako pracownika{ownerName ? ` (${ownerName})` : ""}
                          </span>
                          <span className="block text-xs text-slate-500 mt-0.5">
                            Będziesz widoczny/a w kalendarzu i przy rezerwacji
                          </span>
                        </span>
                      </button>

                      {addSelf && (
                        <div className="mt-4">
                          <Field label="Stanowisko (opcjonalnie)" htmlFor="ob-title">
                            <input id="ob-title" type="text" value={staffTitle} onChange={(e) => setStaffTitle(e.target.value)}
                              placeholder="np. Barber, Stylistka, Fizjoterapeuta" className={inputCls} />
                          </Field>
                        </div>
                      )}

                      <p className="mt-4 text-xs text-slate-500 leading-relaxed">
                        Kolejnych pracowników dodasz w panelu <strong className="text-slate-700">Pracownicy</strong>.
                      </p>
                    </StepWrapper>
                  )}

                  {/* Step 6 — First service */}
                  {step === 6 && (
                    <StepWrapper title="Dodaj pierwszą usługę" subtitle="Możesz dodać więcej usług po skonfigurowaniu konta">
                      <div className="space-y-4">
                        <Field label="Nazwa usługi" htmlFor="ob-service">
                          <input id="ob-service" type="text" value={serviceName} onChange={(e) => setServiceName(e.target.value)}
                            placeholder="np. Strzyżenie damskie" className={inputCls} autoFocus />
                        </Field>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <Field label="Czas trwania" htmlFor="ob-duration">
                            <div className="relative">
                              <select id="ob-duration" value={serviceDuration} onChange={(e) => setServiceDuration(Number(e.target.value))}
                                className={cn(inputCls, "appearance-none pr-9")}>
                                {DURATION_OPTIONS.map((d) => (
                                  <option key={d} value={d}>{d} min</option>
                                ))}
                              </select>
                              <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m19 9-7 7-7-7" />
                              </svg>
                            </div>
                          </Field>
                          <Field label="Cena (PLN)" htmlFor="ob-price">
                            <input id="ob-price" type="number" value={servicePrice} onChange={(e) => setServicePrice(e.target.value)}
                              placeholder="120" min={1} step={1} className={cn(inputCls, "tabular-nums")} />
                          </Field>
                        </div>
                      </div>

                      <p className="mt-5 text-xs text-slate-500 leading-relaxed px-4 py-3 rounded-xl"
                        style={{ background: "rgba(203,213,225,0.14)", border: "1px dashed rgba(203,213,225,0.55)" }}>
                        Możesz pominąć ten krok (zostaw nazwę pustą) — usługi dodasz później w panelu{" "}
                        <strong className="text-slate-700">Usługi</strong>.
                      </p>
                    </StepWrapper>
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Error */}
              {error && (
                <div
                  role="alert"
                  className="mt-5 px-4 py-3 rounded-xl"
                  style={{ background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.25)" }}
                >
                  <p className="text-sm font-medium" style={{ color: "#BE123C" }}>{error}</p>
                </div>
              )}

              {/* Navigation */}
              <div className="mt-7 flex items-center justify-between">
                <button
                  type="button"
                  onClick={back}
                  disabled={step === 1 || isPending}
                  className={cn(
                    "px-4 py-2.5 text-sm font-medium rounded-xl btn-spring",
                    step === 1 && "invisible"
                  )}
                  style={{
                    background: "rgba(255,255,255,0.70)",
                    border: "1px solid rgba(203,213,225,0.55)",
                    color: "#475569",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.85)",
                  }}
                >
                  Wstecz
                </button>

                <motion.button
                  type="button"
                  onClick={next}
                  disabled={isPending}
                  whileHover={isPending ? undefined : { scale: 1.015, y: -1 }}
                  whileTap={isPending ? undefined : { scale: 0.978 }}
                  transition={SPRING}
                  className="px-6 py-2.5 text-sm font-semibold rounded-xl disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
                  style={{
                    background: INK,
                    border: "1px solid #0F172A",
                    color: "#F8FAFC",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.20), 0 10px 24px rgba(15,23,42,0.28), inset 0 1px 0 rgba(255,255,255,0.15)",
                  }}
                >
                  {isPending ? (
                    <>
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                        <path strokeLinecap="round" d="M4 12a8 8 0 0 1 8-8" />
                      </svg>
                      Tworzę salon…
                    </>
                  ) : step === STEPS.length ? (
                    "Utwórz salon"
                  ) : (
                    "Dalej"
                  )}
                </motion.button>
              </div>
            </div>
          </div>

          {/* Step dots */}
          <div className="mt-6 flex justify-center gap-2" aria-hidden="true">
            {STEPS.map((s) => (
              <div
                key={s.id}
                className="rounded-full transition-all duration-300"
                style={
                  s.id === step
                    ? { width: 24, height: 6, background: INK }
                    : s.id < step
                    ? { width: 6, height: 6, background: "#94A3B8" }
                    : { width: 6, height: 6, background: "rgba(203,213,225,0.60)" }
                }
              />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────

function StepWrapper({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900" style={{ letterSpacing: "-0.03em" }}>{title}</h1>
        <p className="text-sm text-slate-500 mt-1">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
      {children}
    </div>
  );
}
