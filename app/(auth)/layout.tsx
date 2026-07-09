import Link from "next/link";
import { Wordmark } from "@/components/brand/wordmark";

const BG = [
  "radial-gradient(ellipse 120% 80% at 85% -20%, rgba(203,213,225,0.70) 0%, transparent 50%)",
  "radial-gradient(ellipse 80% 70% at -8% 90%, rgba(148,163,184,0.28) 0%, transparent 55%)",
  "radial-gradient(ellipse 60% 50% at 50% 55%, rgba(226,232,240,0.65) 0%, transparent 65%)",
  "linear-gradient(168deg, #E8EFF8 0%, #F1F6FB 40%, #E5EEF9 100%)",
].join(", ");

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: BG }}>
      {/* Top bar */}
      <header
        className="h-14 flex items-center px-6"
        style={{
          background: "rgba(255,255,255,0.72)",
          backdropFilter: "blur(40px) saturate(200%)",
          WebkitBackdropFilter: "blur(40px) saturate(200%)",
          borderBottom: "1px solid rgba(203,213,225,0.40)",
          boxShadow: "0 1px 0 rgba(255,255,255,0.80)",
        }}
      >
        <Link href="/" className="flex items-center">
          <Wordmark className="text-lg" />
        </Link>
      </header>

      {/* Centered form */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <div
            className="p-8"
            style={{
              background: "rgba(255,255,255,0.78)",
              backdropFilter: "blur(40px) saturate(200%)",
              WebkitBackdropFilter: "blur(40px) saturate(200%)",
              border: "1px solid rgba(203,213,225,0.55)",
              borderRadius: "1.25rem",
              boxShadow:
                "0 0 0 0.5px rgba(203,213,225,0.45), 0 2px 4px rgba(0,0,0,0.05), 0 12px 36px rgba(100,116,139,0.12), 0 40px 80px rgba(100,116,139,0.07), inset 0 1px 0 rgba(255,255,255,1), inset 0 -1px 0 rgba(203,213,225,0.12)",
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
          background: "rgba(255,255,255,0.60)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderTop: "1px solid rgba(203,213,225,0.30)",
          color: "#94A3B8",
        }}
      >
        &copy; {new Date().getFullYear()} Termcatch &middot;{" "}
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
