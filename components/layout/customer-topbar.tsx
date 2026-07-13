"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { logoutAction } from "@/actions/auth";
import { Wordmark } from "@/components/brand/wordmark";
import { useUnreadCount } from "@/hooks/use-unread-count";

export function CustomerTopbar() {
  const unreadCount = useUnreadCount();
  return (
    <header
      className="h-16 flex items-center gap-4 px-6 shrink-0"
      style={{
        background: "rgba(255,255,255,0.82)",
        backdropFilter: "blur(40px) saturate(200%)",
        WebkitBackdropFilter: "blur(40px) saturate(200%)",
        borderBottom: "1px solid rgba(203,213,225,0.35)",
        boxShadow: "0 0 0 0.5px rgba(203,213,225,0.20), 0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(100,116,139,0.06), inset 0 1px 0 rgba(255,255,255,0.90)",
      }}
    >
      {/* Mobile logo */}
      <Link href="/" className="flex items-center md:hidden">
        <Wordmark className="text-base" variant="light" />
      </Link>

      {/* Search shortcut */}
      <motion.div
        className="flex-1 max-w-sm glass-shimmer-wrap rounded-xl"
        whileHover={{ scale: 1.01 }}
        transition={{ type: "spring", stiffness: 400, damping: 28 }}
      >
        <Link
          href="/search"
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm w-full"
          style={{
            background: "rgba(255,255,255,0.78)",
            backdropFilter: "blur(20px) saturate(190%)",
            WebkitBackdropFilter: "blur(20px) saturate(190%)",
            border: "1px solid rgba(203,213,225,0.45)",
            color: "#94A3B8",
            boxShadow: "0 0 0 0.5px rgba(203,213,225,0.25), inset 0 1px 0 rgba(255,255,255,0.90), inset 0 1px 3px rgba(0,0,0,0.02)",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          Szukaj specjalisty...
        </Link>
      </motion.div>

      <div className="flex items-center gap-2 ml-auto">
        {/* Notifications */}
        <Link
          href="/customer/notifications"
          className="relative p-2 rounded-lg icon-btn"
          style={{ color: "#94A3B8" }}
          aria-label={unreadCount > 0 ? `Powiadomienia (${unreadCount})` : "Powiadomienia"}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          {unreadCount > 0 && (
            <span
              className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full text-white text-[10px] font-bold flex items-center justify-center tabular-nums"
              style={{ background: "#E11D48", boxShadow: "0 0 0 2px rgba(255,255,255,0.90)" }}
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Link>

        {/* Logout */}
        <form action={logoutAction}>
          <button
            type="submit"
            className="p-2 rounded-lg icon-btn"
            style={{ color: "#CBD5E1" }}
            title="Wyloguj"
            aria-label="Wyloguj"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" x2="9" y1="12" y2="12" />
            </svg>
          </button>
        </form>
      </div>
    </header>
  );
}
