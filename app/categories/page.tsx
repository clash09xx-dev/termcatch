import Link from "next/link";
import { LandingNav } from "@/components/layout/landing-nav";
import { LandingFooter } from "@/components/layout/landing-footer";
import { visibleCategories } from "@/lib/categories";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kategorie — TermCatch",
  description: "Przeglądaj wszystkie kategorie salonów i specjalistów na TermCatch.",
};

const BG = [
  "radial-gradient(ellipse 120% 80% at 85% -20%, rgba(203,213,225,0.70) 0%, transparent 50%)",
  "radial-gradient(ellipse 80% 70% at -8% 90%, rgba(148,163,184,0.28) 0%, transparent 55%)",
  "radial-gradient(ellipse 60% 50% at 50% 55%, rgba(226,232,240,0.65) 0%, transparent 65%)",
  "linear-gradient(168deg, #E8EFF8 0%, #F1F6FB 40%, #E5EEF9 100%)",
].join(", ");

const cardStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.72)",
  backdropFilter: "blur(40px) saturate(200%)",
  WebkitBackdropFilter: "blur(40px) saturate(200%)",
  border: "1px solid rgba(203,213,225,0.55)",
  boxShadow:
    "0 0 0 0.5px rgba(203,213,225,0.45), 0 1px 2px rgba(0,0,0,0.04), 0 6px 20px rgba(100,116,139,0.08), inset 0 1px 0 rgba(255,255,255,0.95)",
  borderRadius: "1rem",
  transition: "transform 300ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 200ms ease",
};

import React from "react";

export default function CategoriesPage() {
  // Single source of truth (lib/categories) — canonical slugs that /search
  // actually resolves, with medical categories hidden until launch-ready.
  const categories = visibleCategories();
  return (
    <div className="min-h-screen" style={{ background: BG }}>
      <LandingNav />

      <div className="pt-32 pb-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-12">
            <div
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-6 text-xs font-semibold uppercase tracking-widest"
              style={{
                background: "rgba(203,213,225,0.28)",
                border: "1px solid rgba(203,213,225,0.50)",
                color: "#64748B",
              }}
            >
              Kategorie
            </div>
            <h1
              className="text-4xl font-bold mb-3"
              style={{ letterSpacing: "-0.04em", color: "#0F172A" }}
            >
              Znajdź swojego specjalistę
            </h1>
            <p className="text-sm" style={{ color: "#64748B" }}>
              Przeglądaj salony i specjalistów według kategorii
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {categories.map((cat) => (
              <Link
                key={cat.slug}
                href={`/search?category=${cat.slug}`}
                className="group glass-shimmer-wrap"
                style={cardStyle}
              >
                <div className="p-5">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center mb-4"
                    style={{
                      background: "rgba(203,213,225,0.30)",
                      border: "1px solid rgba(203,213,225,0.45)",
                      transition: "background 200ms ease",
                    }}
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ background: "linear-gradient(135deg, #94A3B8, #CBD5E1)" }}
                    />
                  </div>
                  <p
                    className="text-sm font-semibold mb-0.5"
                    style={{ color: "#0F172A", letterSpacing: "-0.01em" }}
                  >
                    {cat.label}
                  </p>
                  <p
                    className="text-xs"
                    style={{ color: "#94A3B8" }}
                  >
                    Szukaj →
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <LandingFooter />
    </div>
  );
}
