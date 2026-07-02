"use client";

import Link from "next/link";
import { logoutAction } from "@/actions/auth";

export function CustomerTopbar({ unreadCount = 0 }: { unreadCount?: number }) {
  return (
    <header className="h-16 border-b border-gray-100 bg-white flex items-center gap-4 px-6 shrink-0">
      {/* Mobile logo */}
      <Link href="/" className="flex items-center gap-2 md:hidden">
        <div className="w-7 h-7 bg-gray-900 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-xs">T</span>
        </div>
      </Link>

      {/* Search shortcut */}
      <Link
        href="/search"
        className="flex-1 max-w-sm flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-400 hover:border-gray-300 transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        Szukaj specjalisty...
      </Link>

      <div className="flex items-center gap-2 ml-auto">
        {/* Notifications */}
        <Link href="/customer/notifications" className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Link>

        {/* Logout */}
        <form action={logoutAction}>
          <button
            type="submit"
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
            title="Wyloguj"
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
