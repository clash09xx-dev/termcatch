"use client";

import Link from "next/link";
import { logoutAction } from "@/actions/auth";

export function CustomerTopbar() {
  return (
    <header className="h-16 border-b border-surface-100 dark:border-surface-800 bg-white dark:bg-surface-900 flex items-center gap-4 px-6 shrink-0">
      {/* Mobile logo */}
      <Link href="/" className="flex items-center gap-2 md:hidden">
        <div className="w-7 h-7 bg-brand-600 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-xs">T</span>
        </div>
      </Link>

      {/* Search */}
      <Link
        href="/search"
        className="flex-1 max-w-sm flex items-center gap-2 px-3 py-2 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm text-surface-400 hover:border-brand-300 transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.35-4.35"/>
        </svg>
        Szukaj specjalisty...
      </Link>

      <div className="flex items-center gap-2 ml-auto">
        {/* Notifications */}
        <button className="relative p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors text-surface-500">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
        </button>

        {/* Logout */}
        <form action={logoutAction}>
          <button
            type="submit"
            className="p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors text-surface-400 hover:text-surface-600"
            title="Wyloguj"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" x2="9" y1="12" y2="12"/>
            </svg>
          </button>
        </form>
      </div>
    </header>
  );
}
