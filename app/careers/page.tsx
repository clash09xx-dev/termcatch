import Link from "next/link";
import { LandingNav } from "@/components/layout/landing-nav";
import { LandingFooter } from "@/components/layout/landing-footer";

const BG = [
  "radial-gradient(ellipse 120% 80% at 85% -20%, rgba(203,213,225,0.70) 0%, transparent 50%)",
  "radial-gradient(ellipse 80% 70% at -8% 90%, rgba(148,163,184,0.28) 0%, transparent 55%)",
  "radial-gradient(ellipse 60% 50% at 50% 55%, rgba(226,232,240,0.65) 0%, transparent 65%)",
  "linear-gradient(168deg, #E8EFF8 0%, #F1F6FB 40%, #E5EEF9 100%)",
].join(", ");

export default function CareersPage() {
  return (
    <div className="min-h-screen" style={{ background: BG }}>
      <LandingNav />
      <div className="pt-32 pb-24 px-6 text-center">
        <div className="max-w-md mx-auto">
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-8 text-xs font-semibold uppercase tracking-widest"
            style={{
              background: "rgba(203,213,225,0.28)",
              border: "1px solid rgba(203,213,225,0.50)",
              color: "#64748B",
            }}
          >
            Kariera
          </div>
          <h1
            className="text-4xl font-bold mb-4"
            style={{ letterSpacing: "-0.04em", color: "#0F172A" }}
          >
            Dołącz do zespołu
          </h1>
          <p className="mb-10 leading-relaxed text-sm" style={{ color: "#64748B" }}>
            Budujemy przyszłość rezerwacji online w Polsce. Wkrótce opublikujemy pierwsze oferty.
          </p>
          <div
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl mb-10 text-sm"
            style={{
              background: "rgba(255,255,255,0.72)",
              backdropFilter: "blur(40px) saturate(200%)",
              WebkitBackdropFilter: "blur(40px) saturate(200%)",
              border: "1px solid rgba(203,213,225,0.55)",
              boxShadow:
                "0 1px 2px rgba(0,0,0,0.04), 0 6px 20px rgba(100,116,139,0.09), inset 0 1px 0 rgba(255,255,255,0.95)",
              color: "#475569",
            }}
          >
            <span
              className="w-2 h-2 rounded-full animate-pulse"
              style={{
                background: "linear-gradient(135deg, #94A3B8, #CBD5E1)",
                boxShadow: "0 0 6px rgba(148,163,184,0.6)",
              }}
            />
            Oferty pracy wkrótce
          </div>
          <div className="mt-6">
            <p className="text-sm mb-4" style={{ color: "#94A3B8" }}>
              Chcesz nas poznać wcześniej? Napisz do nas.
            </p>
            <Link
              href="/contact"
              className="btn-spring glass-shimmer-wrap px-6 py-2.5 text-sm font-semibold"
              style={{
                display: "inline-flex",
                background: "linear-gradient(135deg, #CBD5E1 0%, #94A3B8 50%, #CBD5E1 100%)",
                color: "#0F172A",
                border: "1px solid rgba(148,163,184,0.45)",
                borderRadius: "0.75rem",
                boxShadow: "0 1px 2px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.40)",
              }}
            >
              Skontaktuj się
            </Link>
          </div>
        </div>
      </div>
      <LandingFooter />
    </div>
  );
}
