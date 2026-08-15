"use client";

import Link from "next/link";
import { logoutAction } from "@/actions/auth";
import { Wordmark } from "@/components/brand/wordmark";
import { useUnreadCount } from "@/hooks/use-unread-count";
import { useT } from "@/components/i18n/i18n-provider";
import { useScrolledUnder } from "@/hooks/use-scrolled";

export function CustomerTopbar() {
  const t = useT();
  const unreadCount = useUnreadCount();
  const [barRef, scrolled] = useScrolledUnder<HTMLElement>();
  return (
    <header
      ref={barRef}
      className="h-16 flex items-center gap-4 px-6 shrink-0"
      style={{
        background: scrolled ? "var(--chrome-strong)" : "var(--chrome)",
        backdropFilter: "var(--chrome-blur)",
        WebkitBackdropFilter: "var(--chrome-blur)",
        borderBottom: "1px solid " + (scrolled ? "var(--hairline)" : "transparent"),
        boxShadow: scrolled ? "0 1px 12px -6px rgba(15,23,42,0.24)" : "none",
        transition: "background var(--dur-fast) var(--ease-hover), border-color var(--dur-fast) var(--ease-hover), box-shadow var(--dur-fast) var(--ease-hover)",
      }}
    >
      {/* Mobile logo */}
      <Link href="/" className="flex items-center md:hidden">
        <Wordmark className="text-base" variant="light" />
      </Link>

      {/* Search shortcut */}
      <div className="flex-1 max-w-sm rounded-xl">
        <Link
          href="/search"
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm w-full"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--hairline)",
            color: "#94A3B8",
            boxShadow: "var(--e1)",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          {t.customer.searchPlaceholder}
        </Link>
      </div>

      <div className="flex items-center gap-2 ml-auto">
        {/* Notifications */}
        <Link
          href="/customer/notifications"
          className="relative p-2 rounded-lg icon-btn"
          style={{ color: "#94A3B8" }}
          aria-label={unreadCount > 0 ? `${t.a11y.notifications} (${unreadCount})` : t.a11y.notifications}
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
            title={t.a11y.logout}
            aria-label={t.a11y.logout}
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
