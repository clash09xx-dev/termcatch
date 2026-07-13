"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { sheetUp, overlayFade, useReducedMotion } from "@/lib/motion";

const MAIN_ITEMS = [
  {
    href: "/business/dashboard",
    label: "Pulpit",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    href: "/business/calendar",
    label: "Kalendarz",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
        <line x1="16" x2="16" y1="2" y2="6" />
        <line x1="8" x2="8" y1="2" y2="6" />
        <line x1="3" x2="21" y1="10" y2="10" />
      </svg>
    ),
  },
  {
    href: "/business/crm",
    label: "Klienci",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    href: "/business/reviews",
    label: "Opinie",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
      </svg>
    ),
  },
];

const MORE_ITEMS = [
  { href: "/business/staff", label: "Pracownicy" },
  { href: "/business/services", label: "Usługi" },
  { href: "/business/hours", label: "Godziny pracy" },
  { href: "/business/payments", label: "Płatności" },
  { href: "/business/invoices", label: "Faktury" },
  { href: "/business/coupons", label: "Kupony" },
  { href: "/business/analytics", label: "Analityka" },
  { href: "/business/ai", label: "AI Asystent" },
  { href: "/business/marketing", label: "Marketing" },
  { href: "/business/profile", label: "Profil salonu" },
  { href: "/business/settings", label: "Ustawienia" },
];

export function BusinessMobileNav() {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <>
      {moreOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <motion.div
            variants={overlayFade}
            initial="hidden"
            animate="show"
            className="absolute inset-0"
            style={{ background: "rgba(15,23,42,0.30)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}
            onClick={() => setMoreOpen(false)}
          />
          <motion.div
            variants={reduceMotion ? overlayFade : sheetUp}
            initial="hidden"
            animate="show"
            className="absolute bottom-0 inset-x-0 rounded-t-3xl p-4 pb-[calc(4.5rem+env(safe-area-inset-bottom))]"
            style={{
              background: "rgba(255,255,255,0.94)",
              backdropFilter: "blur(40px) saturate(200%)",
              WebkitBackdropFilter: "blur(40px) saturate(200%)",
              borderTop: "1px solid rgba(203,213,225,0.50)",
              boxShadow: "0 -8px 32px rgba(15,23,42,0.12), inset 0 1px 0 rgba(255,255,255,0.98)",
            }}
            role="dialog"
            aria-label="Więcej sekcji"
          >
            <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: "rgba(148,163,184,0.45)" }} />
            <div className="grid grid-cols-2 gap-1">
              {MORE_ITEMS.map((item) => {
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    className={cn(
                      "px-4 py-3 rounded-xl text-sm font-medium",
                      isActive ? "text-slate-900" : "nav-item"
                    )}
                    style={isActive ? {
                      background: "rgba(203,213,225,0.22)",
                      border: "1px solid rgba(203,213,225,0.50)",
                      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.90)",
                    } : undefined}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </motion.div>
        </div>
      )}

      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 pb-[env(safe-area-inset-bottom)]"
        style={{
          background: "rgba(255,255,255,0.90)",
          backdropFilter: "blur(32px) saturate(200%)",
          WebkitBackdropFilter: "blur(32px) saturate(200%)",
          borderTop: "1px solid rgba(203,213,225,0.40)",
          boxShadow: "0 -4px 20px rgba(100,116,139,0.08), inset 0 1px 0 rgba(255,255,255,0.90)",
        }}
      >
        <div className="flex items-stretch">
          {MAIN_ITEMS.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMoreOpen(false)}
                className={cn(
                  "flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors",
                  isActive && !moreOpen ? "text-slate-900" : "text-slate-400 hover:text-slate-600"
                )}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMoreOpen((v) => !v)}
            aria-expanded={moreOpen}
            className={cn(
              "flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors",
              moreOpen ? "text-slate-900" : "text-slate-400 hover:text-slate-600"
            )}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <circle cx="12" cy="12" r="1" />
              <circle cx="19" cy="12" r="1" />
              <circle cx="5" cy="12" r="1" />
            </svg>
            Więcej
          </button>
        </div>
      </nav>
    </>
  );
}
