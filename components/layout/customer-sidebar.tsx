"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Wordmark } from "@/components/brand/wordmark";
import { useT } from "@/components/i18n/i18n-provider";

const NAV_ITEMS = [
  {
    href: "/customer/dashboard",
    key: "navVisits" as const,
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
        <line x1="16" x2="16" y1="2" y2="6" />
        <line x1="8" x2="8" y1="2" y2="6" />
        <line x1="3" x2="21" y1="10" y2="10" />
      </svg>
    ),
  },
  {
    href: "/customer/favourites",
    key: "navFavourites" as const,
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    ),
  },
  {
    href: "/customer/history",
    key: "navHistory" as const,
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="12 8 12 12 14 14" />
        <path d="M3.05 11a9 9 0 1 1 .5 4m-.5 5v-5h5" />
      </svg>
    ),
  },
  {
    href: "/customer/profile",
    key: "navProfile" as const,
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  {
    href: "/customer/notifications",
    key: "navNotifications" as const,
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    ),
  },
];

export function CustomerSidebar() {
  const t = useT();
  const c = t.customer;
  const pathname = usePathname();

  return (
    <aside
      className="hidden md:flex flex-col w-56 h-[100dvh] shrink-0"
      style={{
        background: "var(--chrome-deep)",
        backdropFilter: "var(--chrome-blur)",
        WebkitBackdropFilter: "var(--chrome-blur)",
        borderRight: "1px solid var(--hairline)",
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 h-16" style={{ borderBottom: "1px solid var(--hairline-soft)" }}>
        <Link href="/" className="flex items-center">
          <Wordmark className="text-base" variant="light" />
        </Link>
      </div>

      {/* Find button */}
      <div className="px-3 py-4">
        <div 
          className="btn-spring rounded-xl"
        >
          <Link
            href="/search"
            className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm font-medium rounded-xl"
            style={{
              background: "rgba(203,213,225,0.20)",
              border: "1px solid var(--hairline)",
              color: "#334155",
              boxShadow: "var(--e1)",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            {c.bookVisit}
          </Link>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-2 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <div key={item.href} className="relative">
              {isActive && (
                <span
                  className="absolute left-0 top-[5px] bottom-[5px] w-[3px] rounded-full"
                  style={{ background: "var(--ink)" }}
                />
              )}
              <Link
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`flex items-center gap-3 px-3 min-h-[40px] py-2 rounded-[9px] text-sm font-medium${isActive ? "" : " nav-item"}`}
                style={isActive ? {
                  background: "var(--selected)",
                  color: "#1E293B",
                } : undefined}
              >
                <span className="flex-shrink-0" style={{ color: isActive ? "#334155" : "inherit" }}>
                  {item.icon}
                </span>
                {c[item.key]}
              </Link>
            </div>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="p-3" style={{ borderTop: "1px solid var(--hairline-soft)" }}>
        <Link
          href="/customer/profile"
          className="flex items-center gap-3 px-3 py-2 rounded-lg row-hover"
          style={{ color: "#64748B" }}
        >
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0"
            style={{ background: "rgba(203,213,225,0.25)", border: "1px solid var(--hairline)", color: "#475569", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.70)" }}
          >
            U
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-slate-700 truncate">{c.navProfile}</p>
            <p className="text-[10px] text-slate-400 truncate">{c.navProfileHint}</p>
          </div>
        </Link>
      </div>
    </aside>
  );
}
