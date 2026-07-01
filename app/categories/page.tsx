import Link from "next/link";
import { LandingNav } from "@/components/layout/landing-nav";
import { LandingFooter } from "@/components/layout/landing-footer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kategorie",
  description: "Przeglądaj wszystkie kategorie salonów i specjalistów na Termcatch.",
};

const CATEGORIES = [
  { label: "Fryzjer", slug: "hair_salon", count: null },
  { label: "Barber", slug: "barbershop", count: null },
  { label: "Masaż", slug: "massage", count: null },
  { label: "Manicure & Pedicure", slug: "nail_salon", count: null },
  { label: "Kosmetyczka", slug: "beauty_salon", count: null },
  { label: "Tatuaż", slug: "tattoo", count: null },
  { label: "Spa & Wellness", slug: "spa", count: null },
  { label: "Makijaż", slug: "makeup", count: null },
  { label: "Brwi & Rzęsy", slug: "brows_lashes", count: null },
  { label: "Depilacja", slug: "hair_removal", count: null },
  { label: "Fizjoterapia", slug: "physiotherapy", count: null },
  { label: "Inne", slug: "other", count: null },
];

export default function CategoriesPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <LandingNav />

      <div className="pt-32 pb-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-12">
            <h1 className="text-4xl font-bold tracking-tight mb-3">Kategorie</h1>
            <p className="text-gray-500">Znajdź specjalistę w swojej kategorii</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {CATEGORIES.map((cat) => (
              <Link
                key={cat.slug}
                href={`/search?category=${cat.slug}`}
                className="group bg-white border border-gray-200 rounded-2xl p-5 hover:border-gray-900 hover:shadow-md transition-all duration-150"
              >
                <div className="w-9 h-9 rounded-xl bg-gray-100 group-hover:bg-gray-900 flex items-center justify-center mb-4 transition-colors">
                  <svg className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 8v4l3 3" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-gray-900">{cat.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">Szukaj →</p>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <LandingFooter />
    </div>
  );
}
