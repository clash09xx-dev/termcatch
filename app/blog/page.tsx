import Link from "next/link";
import { LandingNav } from "@/components/layout/landing-nav";
import { LandingFooter } from "@/components/layout/landing-footer";

export default function Page() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <LandingNav />
      <div className="pt-32 pb-24 px-6 text-center">
        <div className="max-w-md mx-auto">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Wkrótce</p>
          <h1 className="text-4xl font-bold tracking-tight mb-4">Ta strona jest w przygotowaniu</h1>
          <p className="text-gray-500 mb-8">Pracujemy nad zawartością. Wróć wkrótce.</p>
          <Link href="/" className="px-5 py-2.5 bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold rounded-xl transition-colors">
            Wróć na stronę główną
          </Link>
        </div>
      </div>
      <LandingFooter />
    </div>
  );
}
