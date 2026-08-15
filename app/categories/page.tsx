import Link from "next/link";
import { LandingNav } from "@/components/layout/landing-nav";
import { LandingFooter } from "@/components/layout/landing-footer";
import { visibleCategoriesFor } from "@/lib/categories";
import { getServerI18n } from "@/lib/i18n/server";
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
  background: "var(--surface)",
  border: "1px solid var(--hairline)",
  boxShadow: "var(--e2)",
  borderRadius: "1rem",
  transition: "transform 300ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 200ms ease",
};

import React from "react";

export default async function CategoriesPage() {
  // Single source of truth (lib/categories) — canonical slugs that /search
  // actually resolves, with medical categories hidden until launch-ready.
  const { locale, dict } = await getServerI18n();
  const s = dict.search;
  const categories = visibleCategoriesFor(locale);
  return (
    <div className="min-h-screen" style={{ background: BG }}>
      <LandingNav />

      <div className="pt-32 pb-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-12">
            <div
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-6 text-xs font-semibold uppercase tracking-widest"
              style={{
                background: "var(--selected)",
                border: "1px solid var(--hairline)",
                color: "#64748B",
              }}
            >
              {dict.nav.categories}
            </div>
            <h1
              className="text-4xl font-bold mb-3"
              style={{ letterSpacing: "var(--track-display)", color: "#0F172A" }}
            >
              {s.catTitle}
            </h1>
            <p className="text-sm" style={{ color: "#64748B" }}>
              {s.catSubtitle}
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {categories.map((cat) => (
              <Link
                key={cat.slug}
                href={`/search?category=${cat.slug}`}
                className="group"
                style={cardStyle}
              >
                <div className="p-5">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center mb-4"
                    style={{
                      background: "var(--selected)",
                      border: "1px solid var(--hairline)",
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
                    style={{ color: "#0F172A", letterSpacing: "var(--track-heading)" }}
                  >
                    {cat.label}
                  </p>
                  <p
                    className="text-xs"
                    style={{ color: "#94A3B8" }}
                  >
                    {s.searchArrow}
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
