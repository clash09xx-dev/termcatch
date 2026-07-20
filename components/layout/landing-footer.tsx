import Link from "next/link";
import { Wordmark } from "@/components/brand/wordmark";

const FOOTER_LINKS = {
  "Dla klientów": [
    { label: "Znajdź specjalistę", href: "/search" },
    { label: "Kategorie", href: "/categories" },
    { label: "Dostępne dziś", href: "/search?available=today" },
  ],
  "Dla salonów": [
    { label: "Zarejestruj salon", href: "/register?role=business" },
    { label: "Cennik", href: "/pricing" },
    { label: "Funkcje", href: "/for-business" },
  ],
  Firma: [
    { label: "O nas", href: "/about" },
    { label: "Kontakt", href: "/contact" },
    { label: "Kariera", href: "/careers" },
  ],
  Prawne: [
    { label: "Regulamin", href: "/terms" },
    { label: "Polityka prywatności", href: "/privacy" },
    { label: "Cookies", href: "/cookies" },
    { label: "RODO", href: "/gdpr" },
  ],
};

export function LandingFooter() {
  return (
    <footer className="border-t border-gray-100 bg-white">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 lg:gap-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center mb-4">
              <Wordmark className="text-lg" />
            </Link>
            <p className="text-sm text-gray-500 leading-relaxed mb-6">
              Platforma rezerwacji online dla polskiego rynku beauty i wellness.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(FOOTER_LINKS).map(([section, links]) => (
            <div key={section}>
              <h3 className="text-sm font-semibold text-gray-900 mb-4">{section}</h3>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-gray-100 mt-12 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-400">
            &copy; {new Date().getFullYear()} TermCatch. Wszelkie prawa zastrzeżone.
          </p>
          <p className="text-xs text-gray-400 flex items-center gap-1.5">
            Zbudowane w Polsce
            <svg viewBox="0 0 20 14" className="w-5 h-3.5 inline-block" xmlns="http://www.w3.org/2000/svg">
              <rect width="20" height="7" fill="white" />
              <rect y="7" width="20" height="7" fill="#DC143C" />
              <rect width="20" height="14" fill="none" stroke="#e5e7eb" strokeWidth="0.5" />
            </svg>
          </p>
        </div>
      </div>
    </footer>
  );
}
