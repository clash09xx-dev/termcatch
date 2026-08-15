"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, type PanInfo } from "framer-motion";
import { cn } from "@/lib/utils";
import { navGroupsFor } from "./business-nav";
import { gentleFade, overlayFade, projectMomentum, sheetUp, SPRING_SHEET, useReducedMotion } from "@/lib/motion";
import { CHROME, CHROME_STRONG, INK_GRADIENT, SCRIM } from "@/components/ui/glass/tokens";
import { useT } from "@/components/i18n/i18n-provider";

export function BusinessMobileNav({ multiLocation = false }: { multiLocation?: boolean } = {}) {
  const t = useT();
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const [moreOpen, setMoreOpen] = useState(false);
  const navGroups = navGroupsFor({ multiLocation });

  // A sheet that covers the page has to behave like one: Escape closes it, the
  // page behind stops scrolling, and the route changing dismisses it.
  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMoreOpen(false); };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [moreOpen]);

  useEffect(() => { setMoreOpen(false); }, [pathname]);

  function handleDragEnd(_: unknown, info: PanInfo) {
    if (info.offset.y + projectMomentum(info.velocity.y) > 100) setMoreOpen(false);
  }
  // Bottom bar = the three daily-work destinations + a "Więcej" sheet for the rest.
  const PRIMARY = navGroups[0].items; // Praca: Dziś, Kalendarz, Klienci
  const MORE_GROUPS = navGroups.slice(1); // Oferta, Narzędzia, Firma

  return (
    <>
      <AnimatePresence>
        {moreOpen && (
          <div className="lg:hidden fixed inset-0" style={{ zIndex: "var(--z-overlay)" as unknown as number }}>
            <motion.div
              variants={overlayFade} initial="hidden" animate="show" exit="exit"
              className="absolute inset-0"
              style={SCRIM}
              onClick={() => setMoreOpen(false)}
            />
            <motion.div
              variants={reduceMotion ? gentleFade : sheetUp}
              initial="hidden" animate="show" exit="exit"
              drag={reduceMotion ? false : "y"}
              dragDirectionLock
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.6 }}
              onDragEnd={handleDragEnd}
              transition={SPRING_SHEET}
              className="absolute bottom-0 inset-x-0 rounded-t-[22px] p-5 pt-3 pb-[calc(4.75rem+env(safe-area-inset-bottom))]"
              style={{
                ...CHROME_STRONG,
                borderTop: "1px solid var(--hairline)",
                boxShadow: "var(--e4)",
              }}
              role="dialog" aria-modal="true" aria-label={t.businessNav.more}
            >
              <div className="w-9 h-1 rounded-full mx-auto mb-5" style={{ background: "var(--hairline-firm)" }} aria-hidden="true" />
              <div className="space-y-4">
                {MORE_GROUPS.map((group) => (
                  <div key={group.groupKey}>
                    <p className="text-[11px] font-semibold uppercase track-overline text-slate-500 mb-2 px-1">{t.businessNav[group.groupKey]}</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {group.items.map((item) => {
                        const active = pathname.startsWith(item.href);
                        const Icon = item.icon;
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            aria-current={active ? "page" : undefined}
                            onClick={() => setMoreOpen(false)}
                            className={cn(
                              "flex items-center gap-2.5 px-3 min-h-[44px] rounded-[10px] text-[13.5px] font-medium",
                              active ? "text-slate-900" : "nav-item"
                            )}
                            style={active ? { background: "var(--surface-inset)", border: "1px solid var(--hairline-soft)" } : undefined}
                          >
                            <Icon className="flex-shrink-0" style={{ color: active ? "#334155" : undefined }} />
                            {t.businessNav[item.key]}
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
      </AnimatePresence>

      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 pb-[env(safe-area-inset-bottom)]"
        style={{
          ...CHROME,
          zIndex: "var(--z-nav)" as unknown as number,
          borderTop: "1px solid var(--hairline-soft)",
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
                aria-current={active && !moreOpen ? "page" : undefined}
                className={cn("flex-1 flex flex-col items-center justify-center gap-1 min-h-[52px] py-2 text-[10px] font-medium transition-colors", active && !moreOpen ? "text-slate-900" : "text-slate-400")}
              >
                <Icon style={{ width: 21, height: 21 }} />
                {t.businessNav[item.key]}
              </Link>
            );
          })}
          {/* New appointment — central emphasis */}
          <Link
            href="/business/calendar?action=new"
            onClick={() => setMoreOpen(false)}
            className="flex-1 flex flex-col items-center justify-center gap-1 min-h-[52px] py-2 text-[10px] font-medium text-slate-500"
            aria-label={t.businessNav.newAppointment}
          >
            <span className="w-8 h-8 -mt-0.5 rounded-[10px] flex items-center justify-center" style={{ background: INK_GRADIENT, color: "#F8FAFC", boxShadow: "0 2px 8px -2px rgba(15,23,42,0.34), inset 0 1px 0 rgba(255,255,255,0.14)" }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
            </span>
            {t.businessNav.appointmentShort}
          </Link>
          <button
            type="button"
            onClick={() => setMoreOpen((v) => !v)}
            aria-expanded={moreOpen}
            className={cn("flex-1 flex flex-col items-center justify-center gap-1 min-h-[52px] py-2 text-[10px] font-medium transition-colors", moreOpen ? "text-slate-900" : "text-slate-400")}
          >
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true"><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></svg>
            {t.businessNav.more}
          </button>
        </div>
      </nav>
    </>
  );
}
