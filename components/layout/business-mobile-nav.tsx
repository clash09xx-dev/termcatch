"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { NAV_GROUPS } from "./business-nav";
import { sheetUp, overlayFade, useReducedMotion } from "@/lib/motion";
import { INK_GRADIENT } from "@/components/ui/glass/tokens";

// Bottom bar = the three daily-work destinations + a "Więcej" sheet for the rest.
const PRIMARY = NAV_GROUPS[0].items; // Praca: Dziś, Kalendarz, Klienci
const MORE_GROUPS = NAV_GROUPS.slice(1); // Oferta, Narzędzia, Firma

export function BusinessMobileNav() {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <>
      {moreOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <motion.div
            variants={overlayFade} initial="hidden" animate="show"
            className="absolute inset-0"
            style={{ background: "rgba(15,23,42,0.30)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}
            onClick={() => setMoreOpen(false)}
          />
          <motion.div
            variants={reduceMotion ? overlayFade : sheetUp} initial="hidden" animate="show"
            className="absolute bottom-0 inset-x-0 rounded-t-3xl p-5 pb-[calc(4.75rem+env(safe-area-inset-bottom))]"
            style={{
              background: "rgba(255,255,255,0.94)",
              backdropFilter: "blur(40px) saturate(200%)", WebkitBackdropFilter: "blur(40px) saturate(200%)",
              borderTop: "1px solid rgba(203,213,225,0.50)",
              boxShadow: "0 -8px 32px rgba(15,23,42,0.12), inset 0 1px 0 rgba(255,255,255,0.98)",
            }}
            role="dialog" aria-label="Więcej sekcji"
          >
            <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: "rgba(148,163,184,0.45)" }} />
            <div className="space-y-4">
              {MORE_GROUPS.map((group) => (
                <div key={group.label}>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-slate-400 mb-1.5 px-1">{group.label}</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {group.items.map((item) => {
                      const active = pathname.startsWith(item.href);
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMoreOpen(false)}
                          className={cn("flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13.5px] font-medium", active ? "text-slate-900" : "nav-item")}
                          style={active ? { background: "rgba(203,213,225,0.24)", border: "1px solid rgba(203,213,225,0.5)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9)" } : undefined}
                        >
                          <Icon className="flex-shrink-0" style={{ color: active ? "#334155" : undefined }} />
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      )}

      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 pb-[env(safe-area-inset-bottom)]"
        style={{
          background: "rgba(255,255,255,0.90)",
          backdropFilter: "blur(32px) saturate(200%)", WebkitBackdropFilter: "blur(32px) saturate(200%)",
          borderTop: "1px solid rgba(203,213,225,0.40)",
          boxShadow: "0 -4px 20px rgba(100,116,139,0.08), inset 0 1px 0 rgba(255,255,255,0.9)",
        }}
      >
        <div className="flex items-stretch">
          {PRIMARY.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMoreOpen(false)}
                className={cn("flex-1 flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors", active && !moreOpen ? "text-slate-900" : "text-slate-400")}
              >
                <Icon style={{ width: 21, height: 21 }} />
                {item.label}
              </Link>
            );
          })}
          {/* New appointment — central emphasis */}
          <Link
            href="/business/calendar?action=new"
            onClick={() => setMoreOpen(false)}
            className="flex-1 flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium text-slate-500"
            aria-label="Nowa wizyta"
          >
            <span className="w-8 h-8 -mt-0.5 rounded-xl flex items-center justify-center" style={{ background: INK_GRADIENT, color: "#F8FAFC", boxShadow: "0 4px 12px rgba(15,23,42,0.28), inset 0 1px 0 rgba(255,255,255,0.15)" }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
            </span>
            Wizyta
          </Link>
          <button
            type="button"
            onClick={() => setMoreOpen((v) => !v)}
            aria-expanded={moreOpen}
            className={cn("flex-1 flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors", moreOpen ? "text-slate-900" : "text-slate-400")}
          >
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true"><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></svg>
            Więcej
          </button>
        </div>
      </nav>
    </>
  );
}
