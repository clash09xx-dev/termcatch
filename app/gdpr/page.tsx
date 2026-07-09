import Link from "next/link";
import { LandingNav } from "@/components/layout/landing-nav";
import { LandingFooter } from "@/components/layout/landing-footer";

const BG = [
  "radial-gradient(ellipse 100% 60% at 80% 0%, rgba(203,213,225,0.55) 0%, transparent 50%)",
  "radial-gradient(ellipse 60% 50% at 10% 90%, rgba(148,163,184,0.20) 0%, transparent 55%)",
  "linear-gradient(168deg, #EEF3F9 0%, #F4F8FC 40%, #ECF3F9 100%)",
].join(", ");

export default function GdprPage() {
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
            Wkrótce
          </div>
          <h1
            className="text-4xl font-bold mb-4"
            style={{ letterSpacing: "-0.04em", color: "#0F172A" }}
          >
            Ta strona jest w przygotowaniu
          </h1>
          <p className="mb-10 text-sm leading-relaxed" style={{ color: "#64748B" }}>
            Pracujemy nad zawartością. Wróć wkrótce.
          </p>
          <Link
            href="/"
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
            Wróć na stronę główną
          </Link>
        </div>
      </div>
      <LandingFooter />
    </div>
  );
}
