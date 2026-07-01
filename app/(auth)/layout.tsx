import Link from "next/link";

function TermcatchMark() {
  return (
    <svg width="36" height="36" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
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

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Minimal top bar */}
      <header className="h-14 flex items-center px-6 border-b border-gray-100 bg-white">
        <Link href="/" className="flex items-center gap-2.5">
          <TermcatchMark />
          <span className="text-sm font-semibold text-gray-900 tracking-tight">termcatch</span>
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
