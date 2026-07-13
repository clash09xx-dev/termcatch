"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { logoutAction } from "@/actions/auth";
import { useUnreadCount } from "@/hooks/use-unread-count";
import { pageMetaFor } from "./business-nav";
import { INK_GRADIENT } from "@/components/ui/glass/tokens";

export function BusinessTopbar({ initials }: { initials?: string } = {}) {
  const pathname = usePathname();
  const meta = pageMetaFor(pathname);
  const unread = useUnreadCount();

  return (
    <header
      className="h-16 flex items-center gap-4 px-5 sm:px-6 shrink-0 sticky top-0 z-30"
      style={{
        background: "rgba(247,250,253,0.72)",
        backdropFilter: "blur(28px) saturate(200%)",
        WebkitBackdropFilter: "blur(28px) saturate(200%)",
        borderBottom: "1px solid rgba(203,213,225,0.32)",
      }}
    >
      <h1 className="text-[17px] font-semibold tracking-[-0.02em] text-slate-900 flex-shrink-0">
        {meta.title}
      </h1>

      <div className="flex items-center gap-1.5 ml-auto">
        {/* Command palette hint */}
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent("tc-palette"))}
          className="hidden md:flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-lg icon-btn"
          style={{ color: "#94A3B8" }}
          aria-label="Otwórz paletę poleceń (Cmd+K)"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
          <kbd className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ background: "rgba(203,213,225,0.24)", border: "1px solid rgba(203,213,225,0.45)", color: "#64748B" }}>⌘K</kbd>
        </button>

        {/* Contextual primary action */}
        {meta.action && (
          <motion.div whileHover={{ scale: 1.03, y: -0.5 }} whileTap={{ scale: 0.975 }} transition={{ type: "spring", stiffness: 420, damping: 26 }} className="hidden sm:block">
            <Link
              href={meta.action.href}
              className="flex items-center gap-1.5 pl-3 pr-3.5 py-2 text-[13px] font-semibold rounded-lg"
              style={{ background: INK_GRADIENT, border: "1px solid #0F172A", color: "#F8FAFC", boxShadow: "0 1px 2px rgba(0,0,0,0.18), 0 6px 16px rgba(15,23,42,0.22), inset 0 1px 0 rgba(255,255,255,0.15)" }}
            >
              {meta.action.plus && (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
              )}
              {meta.action.label}
            </Link>
          </motion.div>
        )}

        <div className="hidden sm:block h-5 w-px mx-1" style={{ background: "rgba(203,213,225,0.45)" }} />

        {/* Notifications */}
        <Link
          href="/customer/notifications"
          className="relative p-2 rounded-lg icon-btn"
          style={{ color: "#94A3B8" }}
          aria-label={unread > 0 ? `Powiadomienia (${unread} nieprzeczytanych)` : "Powiadomienia"}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
          {unread > 0 && (
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full" style={{ background: "#E11D48", boxShadow: "0 0 0 2px rgba(247,250,253,0.95)" }} />
          )}
        </Link>

        {/* Logout */}
        <form action={logoutAction}>
          <button
            type="submit"
            title="Wyloguj"
            aria-label="Wyloguj"
            className="flex items-center gap-2 pl-2 pr-2.5 py-1.5 rounded-lg icon-btn"
            style={{ color: "#94A3B8" }}
          >
            <span className="w-6 h-6 rounded-md flex items-center justify-center text-[9px] font-bold" style={{ background: "rgba(203,213,225,0.25)", border: "1px solid rgba(203,213,225,0.55)", color: "#475569", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.7)" }}>
              {initials ?? "•"}
            </span>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" x2="9" y1="12" y2="12" /></svg>
          </button>
        </form>
      </div>
    </header>
  );
}
