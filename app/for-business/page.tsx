import Link from "next/link";
import { LandingNav } from "@/components/layout/landing-nav";
import { LandingFooter } from "@/components/layout/landing-footer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dla salonów",
  description: "Termcatch dla właścicieli salonów — kalendarz online, zarządzanie rezerwacjami i klientami.",
};

const FEATURES = [
  {
    title: "Kalendarz online 24/7",
    desc: "Klienci rezerwują sami — o dowolnej porze, bez dzwonienia. Ty dostajesz powiadomienie i Twój kalendarz jest zawsze aktualny.",
  },
  {
    title: "Zarządzanie pracownikami",
    desc: "Każdy pracownik ma własny harmonogram, usługi i dostępność. Klienci mogą wybrać konkretną osobę lub losowego specjalistę.",
  },
  {
    title: "Automatyczne przypomnienia",
    desc: "SMS i e-mail przed każdą wizytą. Mniej no-show, więcej zajętych terminów i spokojny dzień pracy.",
  },
  {
    title: "Płatności i depozyty",
    desc: "Przyjmuj płatności online lub depozyty przy rezerwacji. Integracja ze Stripe — pieniądze trafiają bezpośrednio do Ciebie.",
  },
  {
    title: "CRM i historia klientów",
    desc: "Pełna historia wizyt, notatki i preferencje każdego klienta. Buduj relacje i wracający biznes.",
  },
  {
    title: "Analityka i raporty",
    desc: "Przychody, popularne usługi, najlepsi klienci — dane dzienne, tygodniowe i miesięczne w jednym miejscu.",
  },
];

const STEPS = [
  { n: "01", title: "Zarejestruj salon", desc: "Wypełnij formularz w 5 minut — kategoria, lokalizacja, godziny pracy." },
  { n: "02", title: "Dodaj usługi i personel", desc: "Dodaj usługi z cenami i pracowników z własnymi harmonogramami." },
  { n: "03", title: "Wyślij link klientom", desc: "Twoja strona rezerwacji gotowa. Link do bio, do SMS, do Google." },
];

export default function ForBusinessPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <LandingNav />

      {/* Hero */}
      <section className="pt-32 pb-20 px-6 border-b border-gray-100">
        <div className="max-w-4xl mx-auto text-center">
          <span className="inline-block px-3 py-1.5 rounded-full bg-gray-900 text-white text-xs font-semibold mb-8">
            Dla właścicieli salonów
          </span>
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight leading-[1.05] mb-6">
            Mniej telefonów.<br />Więcej klientów.
          </h1>
          <p className="text-lg text-gray-500 max-w-xl mx-auto mb-10 leading-relaxed">
            Jeden link — Twoja strona rezerwacji. Klienci wybierają termin sami,
            Ty skupiasz się na pracy. Instalacja w 5 minut.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/register?role=business"
              className="inline-flex items-center justify-center px-7 py-3.5 bg-gray-900 hover:bg-gray-800 text-white font-semibold text-sm rounded-xl transition-colors"
            >
              Zarejestruj salon za darmo
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center px-7 py-3.5 bg-white hover:bg-gray-50 text-gray-700 font-medium text-sm rounded-xl border border-gray-200 transition-colors"
            >
              Zobacz cennik →
            </Link>
          </div>
          <p className="mt-5 text-xs text-gray-400">
            Bez karty kredytowej · Plan Starter bezpłatnie na zawsze
          </p>
        </div>
      </section>

      {/* How to start */}
      <section className="py-24 px-6 border-b border-gray-100">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-14 text-center">Zacznij w 3 krokach</h2>
          <div className="grid md:grid-cols-3 gap-10 relative">
            <div className="hidden md:block absolute top-6 left-[calc(16.7%+2rem)] right-[calc(16.7%+2rem)] h-px bg-gray-100" />
            {STEPS.map((step, i) => (
              <div key={step.n}>
                <div className="w-12 h-12 rounded-2xl border border-gray-200 bg-white shadow-sm flex items-center justify-center text-xs font-bold text-gray-400 mb-5 relative">
                  {step.n}
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-gray-900 text-white text-[8px] font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-6 bg-gray-50 border-b border-gray-100">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900">Wszystko w jednym miejscu</h2>
            <p className="mt-3 text-gray-500 max-w-sm mx-auto text-sm">Bez żadnych integracji. Bez skomplikowanej konfiguracji.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 duration-200">
                <div className="w-8 h-8 rounded-lg bg-gray-900 flex items-center justify-center text-white text-[11px] font-bold mb-4">
                  {`0${i + 1}`}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-20 px-6 border-b border-gray-100">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { num: "−80%", label: "mniej telefonów od klientów" },
            { num: "24/7", label: "dostępność kalendarza" },
            { num: "5 min", label: "konfiguracja salonu" },
            { num: "0 zł", label: "koszt startu" },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-3xl font-bold text-gray-900">{s.num}</p>
              <p className="mt-1.5 text-sm text-gray-400">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="relative bg-gray-900 rounded-3xl p-14 text-center overflow-hidden">
            <div
              className="absolute inset-0 opacity-[0.035]"
              style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "24px 24px" }}
            />
            <div className="relative z-10">
              <h2 className="text-3xl font-bold text-white mb-4">Gotowy na więcej klientów?</h2>
              <p className="text-gray-400 mb-10 max-w-sm mx-auto">
                Zarejestruj salon w 5 minut i zacznij przyjmować rezerwacje online.
              </p>
              <Link
                href="/register?role=business"
                className="inline-flex items-center justify-center px-8 py-3.5 bg-white hover:bg-gray-100 text-gray-900 font-semibold text-sm rounded-xl transition-colors"
              >
                Zarejestruj salon — za darmo
              </Link>
            </div>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
