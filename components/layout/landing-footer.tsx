"use client";

import Link from "next/link";
import { Wordmark } from "@/components/brand/wordmark";
import { useT } from "@/components/i18n/i18n-provider";

export function LandingFooter() {
  const t = useT();
  const f = t.footer;

  const columns: { title: string; links: { label: string; href: string }[] }[] = [
    {
      title: f.forCustomers,
      links: [
        { label: f.findSpecialist, href: "/search" },
        { label: f.categories, href: "/categories" },
        { label: f.availableToday, href: "/search?available=today" },
      ],
    },
    {
      title: f.forSalons,
      links: [
        { label: f.registerSalon, href: "/register?role=business" },
        { label: t.nav.pricing, href: "/pricing" },
        { label: f.features, href: "/for-business" },
      ],
    },
    {
      title: f.company,
      links: [
        { label: f.about, href: "/about" },
        { label: f.help, href: "/faq" },
        { label: f.contact, href: "/contact" },
        { label: f.careers, href: "/careers" },
      ],
    },
    {
      title: f.legalSection,
      links: [
        { label: f.terms, href: "/terms" },
        { label: f.privacy, href: "/privacy" },
        { label: f.cookies, href: "/cookies" },
        { label: f.gdpr, href: "/gdpr" },
      ],
    },
  ];

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
              {f.blurb}
            </p>
          </div>

          {/* Link columns */}
          {columns.map((section) => (
            <div key={section.title}>
              <h3 className="text-sm font-semibold text-gray-900 mb-4">{section.title}</h3>
              <ul className="space-y-3">
                {section.links.map((link) => (
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
            &copy; {new Date().getFullYear()} TermCatch. {f.allRights}
          </p>
          <p className="text-xs text-gray-400 flex items-center gap-1.5">
            {f.builtInPoland}
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
