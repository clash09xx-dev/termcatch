import { LandingNav } from "@/components/layout/landing-nav";
import { LandingFooter } from "@/components/layout/landing-footer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "O nas",
  description: "Poznaj historię i misję Termcatch — platformy rezerwacji online dla polskiego rynku beauty.",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <LandingNav />

      <div className="pt-32 pb-24 px-6">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="mb-16">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest block mb-4">O nas</span>
            <h1 className="text-5xl font-bold tracking-tight leading-[1.05] mb-6">
              Rezerwacje bez telefonu.<br />Budujemy to dla Polski.
            </h1>
            <p className="text-lg text-gray-500 leading-relaxed">
              Termcatch powstał z prostej obserwacji: właściciele salonów tracą godziny dziennie
              na odbieranie telefonów, a klienci frustrują się brakiem dostępności online.
              Postanowiliśmy to zmienić.
            </p>
          </div>

          {/* Mission */}
          <div className="grid md:grid-cols-2 gap-8 mb-16">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Nasza misja</h2>
              <p className="text-gray-500 leading-relaxed">
                Chcemy sprawić, żeby każdy salon w Polsce — niezależnie od wielkości — miał dostęp
                do profesjonalnego systemu rezerwacji online. Bez skomplikowanej konfiguracji,
                bez drogich abonamentów, bez pośredników.
              </p>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Dla kogo</h2>
              <p className="text-gray-500 leading-relaxed">
                Budujemy dla fryzjerów, barberów, kosmetyczek, masażystów, tatuatorów i wszystkich
                specjalistów, którzy chcą skupić się na pracy, a nie na administracji.
              </p>
            </div>
          </div>

          {/* Values */}
          <div className="bg-gray-900 rounded-3xl p-10 text-white mb-16">
            <h2 className="text-2xl font-bold mb-8">Co nas wyróżnia</h2>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { title: "Prostota", desc: "Instalacja w 5 minut. Bez IT, bez szkoleń, bez komplikacji." },
                { title: "Polskie wsparcie", desc: "Odbieramy telefon. Rozumiemy lokalny rynek i potrzeby polskich salonów." },
                { title: "Fair pricing", desc: "Zaczynasz za darmo. Płacisz tylko gdy Twój biznes rośnie razem z nami." },
              ].map((v) => (
                <div key={v.title}>
                  <h3 className="font-bold text-white mb-2">{v.title}</h3>
                  <p className="text-white/60 text-sm leading-relaxed">{v.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Contact CTA */}
          <div className="text-center">
            <p className="text-gray-500 mb-4">Masz pytania? Napisz do nas.</p>
            <a
              href="mailto:hello@termcatch.com"
              className="text-gray-900 font-semibold underline underline-offset-4 hover:no-underline transition-all"
            >
              hello@termcatch.com
            </a>
          </div>
        </div>
      </div>

      <LandingFooter />
    </div>
  );
}
