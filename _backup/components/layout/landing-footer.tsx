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
    { label: "Blog", href: "/blog" },
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

const SOCIALS = [
  {
    label: "Instagram",
    href: "#",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-4 h-4">
        <rect x="2" y="2" width="20" height="20" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    label: "Facebook",
    href: "#",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-4 h-4">
        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
      </svg>
    ),
  },
  {
    label: "LinkedIn",
    href: "#",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-4 h-4">
        <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
        <rect x="2" y="9" width="4" height="12" />
        <circle cx="4" cy="4" r="2" />
      </svg>
    ),
  },
];

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
            <div className="flex items-center gap-2">
              {SOCIALS.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  aria-label={s.label}
                  className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:border-gray-300 transition-colors"
                >
                  {s.icon}
                </a>
              ))}
            </div>
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
            &copy; {new Date().getFullYear()} Termcatch. Wszelkie prawa zastrzeżone.
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
