import Link from "next/link";
import { Wordmark } from "@/components/brand/wordmark";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Minimal top bar */}
      <header className="h-14 flex items-center px-6 border-b border-gray-100 bg-white">
        <Link href="/" className="flex items-center">
          <Wordmark className="text-lg" />
        </Link>
      </header>

      {/* Centered form */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          {/* Card */}
          <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
            {children}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-gray-400 border-t border-gray-100 bg-white">
        &copy; {new Date().getFullYear()} Termcatch &middot;{" "}
        <Link href="/terms" className="hover:text-gray-600 transition-colors">Regulamin</Link>
        {" "}&middot;{" "}
        <Link href="/privacy" className="hover:text-gray-600 transition-colors">Prywatność</Link>
      </footer>
    </div>
  );
}
