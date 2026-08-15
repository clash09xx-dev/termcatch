import Link from "next/link";
import { Wordmark } from "@/components/brand/wordmark";
import { LanguageSelector } from "@/components/i18n/language-selector";

const BG = [
  "radial-gradient(ellipse 70% 55% at 8% 0%, rgba(255,255,255,0.92) 0%, transparent 60%)",
  "radial-gradient(ellipse 90% 70% at 92% 8%, rgba(186,203,224,0.42) 0%, transparent 58%)",
  "radial-gradient(ellipse 60% 50% at 40% 100%, rgba(203,213,225,0.30) 0%, transparent 62%)",
  "linear-gradient(172deg, #EDF2F9 0%, #F5F8FC 46%, #E7EEF7 100%)",
].join(", ");

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: BG }}>
      {/* Top bar */}
      <header
        className="h-14 flex items-center justify-between px-6"
        style={{
          background: "var(--surface)",
          borderBottom: "1px solid var(--hairline-soft)",
          boxShadow: "var(--e1)",
        }}
      >
        <Link href="/" className="flex items-center">
          <Wordmark className="text-lg" />
        </Link>
        <LanguageSelector className="cursor-pointer rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-700 outline-none" />
      </header>

      {/* Centered form */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <div
            className="p-8"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--hairline)",
              borderRadius: "1.25rem",
              boxShadow: "var(--e3)",
            }}
          >
            {children}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer
        className="py-4 text-center text-xs"
        style={{
          background: "var(--surface)",
          borderTop: "1px solid var(--hairline-soft)",
          color: "#94A3B8",
        }}
      >
        &copy; {new Date().getFullYear()} TermCatch &middot;{" "}
        <Link href="/terms" className="hover:opacity-70 transition-opacity" style={{ color: "#94A3B8" }}>
          Regulamin
        </Link>
        {" "}&middot;{" "}
        <Link href="/privacy" className="hover:opacity-70 transition-opacity" style={{ color: "#94A3B8" }}>
          Prywatność
        </Link>
      </footer>
    </div>
  );
}
