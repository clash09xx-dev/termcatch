"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { createBusiness, type OnboardingInput, type WorkingHourInput } from "@/lib/actions/business";
import { ServiceCategory } from "@prisma/client";

// ─── Category config ──────────────────────────────────────────

const CATEGORIES: { value: ServiceCategory; label: string; icon: React.ReactNode }[] = [
  { value: "HAIR_SALON", label: "Salon fryzjerski", icon: <ScissorsIcon /> },
  { value: "BARBER", label: "Barber", icon: <RazorIcon /> },
  { value: "NAIL_SALON", label: "Paznokcie", icon: <NailIcon /> },
  { value: "MASSAGE", label: "Masaż", icon: <MassageIcon /> },
  { value: "SPA", label: "SPA", icon: <SpaIcon /> },
  { value: "BEAUTY_CLINIC", label: "Klinika urody", icon: <ClinicIcon /> },
  { value: "EYEBROWS_LASHES", label: "Brwi & Rzęsy", icon: <EyeIcon /> },
  { value: "MAKEUP", label: "Makijaż", icon: <MakeupIcon /> },
  { value: "TATTOO", label: "Tatuaż", icon: <TattooIcon /> },
  { value: "PHYSIOTHERAPY", label: "Fizjoterapia", icon: <PhysioIcon /> },
  { value: "PERSONAL_TRAINER", label: "Trener personalny", icon: <TrainerIcon /> },
  { value: "YOGA", label: "Joga / Pilates", icon: <YogaIcon /> },
  { value: "DENTIST", label: "Stomatolog", icon: <DentistIcon /> },
  { value: "NUTRITIONIST", label: "Dietetyk", icon: <NutritionIcon /> },
  { value: "PSYCHOLOGIST", label: "Psycholog", icon: <PsychIcon /> },
  { value: "GENERAL_PHYSICIAN", label: "Inne", icon: <OtherIcon /> },
];

// ─── Working hours defaults ───────────────────────────────────

const DEFAULT_HOURS: WorkingHourInput[] = [
  { dayOfWeek: 0, isOpen: true,  openTime: "09:00", closeTime: "18:00" }, // Mon
  { dayOfWeek: 1, isOpen: true,  openTime: "09:00", closeTime: "18:00" }, // Tue
  { dayOfWeek: 2, isOpen: true,  openTime: "09:00", closeTime: "18:00" }, // Wed
  { dayOfWeek: 3, isOpen: true,  openTime: "09:00", closeTime: "18:00" }, // Thu
  { dayOfWeek: 4, isOpen: true,  openTime: "09:00", closeTime: "18:00" }, // Fri
  { dayOfWeek: 5, isOpen: true,  openTime: "10:00", closeTime: "16:00" }, // Sat
  { dayOfWeek: 6, isOpen: false, openTime: "10:00", closeTime: "16:00" }, // Sun
];

const DAY_LABELS = ["Poniedziałek", "Wtorek", "Środa", "Czwartek", "Piątek", "Sobota", "Niedziela"];

const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120];

// ─── Step definitions ─────────────────────────────────────────

const STEPS = [
  { id: 1, label: "Kategoria" },
  { id: 2, label: "Informacje" },
  { id: 3, label: "Adres" },
  { id: 4, label: "Godziny" },
  { id: 5, label: "Usługa" },
];

// ─── Main component ───────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [category, setCategory] = useState<ServiceCategory | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [hours, setHours] = useState<WorkingHourInput[]>(DEFAULT_HOURS);
  const [serviceName, setServiceName] = useState("");
  const [serviceDuration, setServiceDuration] = useState(60);
  const [servicePrice, setServicePrice] = useState("");

  // ─── Navigation ─────────────────────────────────────────────

  function next() {
    setError(null);
    if (step === 1 && !category) {
      setError("Wybierz kategorię.");
      return;
    }
    if (step === 2 && !name.trim()) {
      setError("Podaj nazwę firmy.");
      return;
    }
    if (step === 2 && !phone.trim()) {
      setError("Podaj numer telefonu.");
      return;
    }
    if (step === 3 && (!address.trim() || !city.trim() || !postalCode.trim())) {
      setError("Uzupełnij wszystkie pola adresu.");
      return;
    }
    if (step < STEPS.length) {
      setStep((s) => s + 1);
    } else {
      handleSubmit();
    }
  }

  function back() {
    setError(null);
    if (step > 1) setStep((s) => s - 1);
  }

  function updateHour(idx: number, patch: Partial<WorkingHourInput>) {
    setHours((prev) => prev.map((h, i) => (i === idx ? { ...h, ...patch } : h)));
  }

  // ─── Submit ──────────────────────────────────────────────────

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
    };

    startTransition(async () => {
      try {
        await createBusiness(data);
        router.push("/business/dashboard");
        router.refresh();
      } catch (err) {
        setError("Coś poszło nie tak. Spróbuj ponownie.");
      }
    });
  }

  // ─── Render ──────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-100 h-14 flex items-center px-6">
        <div className="flex items-center gap-2.5">
          <TermcatchMark />
          <span className="text-sm font-semibold text-gray-900">termcatch</span>
        </div>
        <span className="ml-auto text-xs text-gray-400">
          Krok {step} z {STEPS.length}
        </span>
      </header>

      {/* Progress bar */}
      <div className="h-0.5 bg-gray-100">
        <div
          className="h-full bg-gray-900 transition-all duration-500 ease-out"
          style={{ width: `${(step / STEPS.length) * 100}%` }}
        />
      </div>

      {/* Content */}
      <main className="flex-1 flex items-start justify-center px-4 py-12">
        <div className="w-full max-w-2xl">

          {/* Step 1 — Category */}
          {step === 1 && (
            <StepWrapper title="Czym się zajmujesz?" subtitle="Wybierz kategorię swojej działalności">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.value}
                    onClick={() => setCategory(cat.value)}
                    className={cn(
                      "flex flex-col items-center gap-2.5 p-4 rounded-xl border-2 text-center transition-all",
                      category === cat.value
                        ? "border-gray-900 bg-gray-900 text-white"
                        : "border-gray-200 bg-white text-gray-700 hover:border-gray-400"
                    )}
                  >
                    <span className={cn("w-7 h-7", category === cat.value ? "text-white" : "text-gray-500")}>
                      {cat.icon}
                    </span>
                    <span className="text-xs font-medium leading-tight">{cat.label}</span>
                  </button>
                ))}
              </div>
            </StepWrapper>
          )}

          {/* Step 2 — Basic info */}
          {step === 2 && (
            <StepWrapper title="Podstawowe informacje" subtitle="Jak klienci znajdą Twój salon?">
              <div className="space-y-4">
                <Field label="Nazwa firmy *">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="np. Salon Fryzjerski Kowalska"
                    className={inputCls}
                    autoFocus
                  />
                </Field>
                <Field label="Krótki opis (opcjonalnie)">
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Opowiedz klientom czym się wyróżniasz..."
                    rows={3}
                    className={cn(inputCls, "resize-none")}
                  />
                </Field>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Telefon *">
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+48 600 000 000"
                      className={inputCls}
                    />
                  </Field>
                  <Field label="E-mail (opcjonalnie)">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="salon@example.com"
                      className={inputCls}
                    />
                  </Field>
                </div>
              </div>
            </StepWrapper>
          )}

          {/* Step 3 — Address */}
          {step === 3 && (
            <StepWrapper title="Lokalizacja" subtitle="Gdzie klienci mogą Cię znaleźć?">
              <div className="space-y-4">
                <Field label="Ulica i numer *">
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="ul. Marszałkowska 1"
                    className={inputCls}
                    autoFocus
                  />
                </Field>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Miasto *">
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Warszawa"
                      className={inputCls}
                    />
                  </Field>
                  <Field label="Kod pocztowy *">
                    <input
                      type="text"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      placeholder="00-000"
                      maxLength={6}
                      className={inputCls}
                    />
                  </Field>
                </div>
              </div>
            </StepWrapper>
          )}

          {/* Step 4 — Working hours */}
          {step === 4 && (
            <StepWrapper title="Godziny pracy" subtitle="Kiedy przyjmujesz klientów?">
              <div className="space-y-1">
                {hours.map((h, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-xl transition-colors",
                      h.isOpen ? "bg-white border border-gray-200" : "bg-gray-50 border border-gray-100"
                    )}
                  >
                    {/* Day label */}
                    <span className={cn("w-28 text-sm font-medium flex-shrink-0", h.isOpen ? "text-gray-900" : "text-gray-400")}>
                      {DAY_LABELS[idx]}
                    </span>

                    {/* Toggle */}
                    <button
                      onClick={() => updateHour(idx, { isOpen: !h.isOpen })}
                      className={cn(
                        "relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                        h.isOpen ? "bg-gray-900" : "bg-gray-200"
                      )}
                      role="switch"
                      aria-checked={h.isOpen}
                    >
                      <span
                        className={cn(
                          "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                          h.isOpen ? "translate-x-4" : "translate-x-0"
                        )}
                      />
                    </button>

                    {/* Times */}
                    {h.isOpen ? (
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="time"
                          value={h.openTime}
                          onChange={(e) => updateHour(idx, { openTime: e.target.value })}
                          className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 text-gray-900 focus:outline-none focus:border-gray-400"
                        />
                        <span className="text-gray-400 text-xs">—</span>
                        <input
                          type="time"
                          value={h.closeTime}
                          onChange={(e) => updateHour(idx, { closeTime: e.target.value })}
                          className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 text-gray-900 focus:outline-none focus:border-gray-400"
                        />
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400 flex-1">Nieczynne</span>
                    )}
                  </div>
                ))}
              </div>
            </StepWrapper>
          )}

          {/* Step 5 — First service */}
          {step === 5 && (
            <StepWrapper
              title="Dodaj pierwszą usługę"
              subtitle="Możesz dodać więcej usług po skonfigurowaniu konta"
            >
              <div className="space-y-4">
                <Field label="Nazwa usługi">
                  <input
                    type="text"
                    value={serviceName}
                    onChange={(e) => setServiceName(e.target.value)}
                    placeholder="np. Strzyżenie damskie"
                    className={inputCls}
                    autoFocus
                  />
                </Field>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Czas trwania">
                    <select
                      value={serviceDuration}
                      onChange={(e) => setServiceDuration(Number(e.target.value))}
                      className={inputCls}
                    >
                      {DURATION_OPTIONS.map((d) => (
                        <option key={d} value={d}>
                          {d} min
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Cena (PLN)">
                    <input
                      type="number"
                      value={servicePrice}
                      onChange={(e) => setServicePrice(e.target.value)}
                      placeholder="0.00"
                      min={0}
                      step={0.01}
                      className={inputCls}
                    />
                  </Field>
                </div>
              </div>

              <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
                <p className="text-xs text-gray-500">
                  Możesz pominąć ten krok — usługi dodasz później w panelu{" "}
                  <strong className="text-gray-700">Usługi</strong>.
                </p>
              </div>
            </StepWrapper>
          )}

          {/* Error */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Navigation */}
          <div className="mt-8 flex items-center justify-between">
            <button
              onClick={back}
              disabled={step === 1}
              className={cn(
                "px-4 py-2.5 text-sm font-medium rounded-xl transition-colors",
                step === 1
                  ? "invisible"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              )}
            >
              Wstecz
            </button>

            <button
              onClick={next}
              disabled={isPending}
              className="px-6 py-2.5 bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isPending ? (
                <>
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Tworzę konto...
                </>
              ) : step === STEPS.length ? (
                "Utwórz konto"
              ) : (
                "Dalej"
              )}
            </button>
          </div>

          {/* Step dots */}
          <div className="mt-8 flex justify-center gap-2">
            {STEPS.map((s) => (
              <div
                key={s.id}
                className={cn(
                  "rounded-full transition-all duration-300",
                  s.id === step
                    ? "w-6 h-1.5 bg-gray-900"
                    : s.id < step
                    ? "w-1.5 h-1.5 bg-gray-400"
                    : "w-1.5 h-1.5 bg-gray-200"
                )}
              />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

// ─── Reusable sub-components ──────────────────────────────────

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
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{title}</h1>
        <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-gray-400 transition-colors";

// ─── Logo ─────────────────────────────────────────────────────

function TermcatchMark() {
  return (
    <svg width="26" height="26" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="30" height="30" rx="8" fill="#111827" />
      <rect x="5" y="8" width="20" height="15" rx="2.5" stroke="white" strokeWidth="1.4" strokeOpacity="0.25" />
      <rect x="5" y="8" width="20" height="5.5" rx="2.5" fill="white" fillOpacity="0.1" />
      <line x1="5" y1="13.5" x2="25" y2="13.5" stroke="white" strokeWidth="1.4" strokeOpacity="0.2" />
      <line x1="10" y1="5.5" x2="10" y2="10.5" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeOpacity="0.6" />
      <line x1="20" y1="5.5" x2="20" y2="10.5" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeOpacity="0.6" />
      <path d="M9 19.5L12.5 23L21 15" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Category Icons (SVG) ─────────────────────────────────────

function ScissorsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-full h-full">
      <circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" />
      <line x1="20" y1="4" x2="8.12" y2="15.88" /><line x1="14.47" y1="14.48" x2="20" y2="20" />
      <line x1="8.12" y1="8.12" x2="12" y2="12" />
    </svg>
  );
}

function RazorIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-full h-full">
      <path d="M6 2L18 2L18 7L6 7Z" /><path d="M8 7L16 7L19 22L5 22Z" />
      <line x1="12" y1="7" x2="12" y2="22" />
    </svg>
  );
}

function NailIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-full h-full">
      <path d="M12 2C8 2 5 5 5 9c0 5 4 13 7 13s7-8 7-13c0-4-3-7-7-7z" />
      <path d="M12 2v13" />
    </svg>
  );
}

function MassageIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-full h-full">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function SpaIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-full h-full">
      <path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
      <path d="M12 8C10 10 8 12 8 14a4 4 0 0 0 8 0c0-2-2-4-4-6z" />
    </svg>
  );
}

function ClinicIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-full h-full">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-full h-full">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function MakeupIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-full h-full">
      <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );
}

function TattooIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-full h-full">
      <path d="M17 3a2 2 0 0 1 2 2 2 2 0 0 1-2 2H7a2 2 0 0 1-2-2 2 2 0 0 1 2-2h10z" />
      <line x1="12" y1="7" x2="12" y2="21" /><line x1="7" y1="12" x2="17" y2="12" />
    </svg>
  );
}

function PhysioIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-full h-full">
      <circle cx="12" cy="5" r="2" /><path d="M5 22v-6l3-4 2 4h4l2-4 3 4v6" />
      <path d="M9 11l1-4h4l1 4" />
    </svg>
  );
}

function TrainerIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-full h-full">
      <circle cx="12" cy="5" r="2" /><path d="M5 22v-4l3-4 4 4 4-4 3 4v4" />
      <path d="M3 10h18" />
    </svg>
  );
}

function YogaIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-full h-full">
      <circle cx="12" cy="4" r="2" />
      <path d="M12 6v6l-4 4M12 12l4 4M8 22l4-4 4 4" />
    </svg>
  );
}

function DentistIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-full h-full">
      <path d="M12 2C9 2 6 4 6 7c0 1 .5 2 1 3l2 9c.5 2 1 3 3 3s2.5-1 3-3l2-9c.5-1 1-2 1-3 0-3-3-5-6-5z" />
    </svg>
  );
}

function NutritionIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-full h-full">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function PsychIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-full h-full">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function OtherIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-full h-full">
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}
