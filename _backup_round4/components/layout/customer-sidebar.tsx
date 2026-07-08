"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Wordmark } from "@/components/brand/wordmark";

const NAV_ITEMS = [
  {
    href: "/customer/dashboard",
    label: "Moje wizyty",
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
    label: "Ulubione",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    ),
  },
  {
    href: "/customer/history",
    label: "Historia",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="12 8 12 12 14 14" />
        <path d="M3.05 11a9 9 0 1 1 .5 4m-.5 5v-5h5" />
      </svg>
    ),
  },
  {
    href: "/customer/profile",
    label: "Mój profil",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  {
    href: "/customer/notifications",
    label: "Powiadomienia",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    ),
  },
];

export function CustomerSidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="hidden md:flex flex-col w-56 h-screen shrink-0"
      style={{
        background: "rgba(255,255,255,0.78)",
        backdropFilter: "blur(40px) saturate(200%)",
        WebkitBackdropFilter: "blur(40px) saturate(200%)",
        borderRight: "1px solid rgba(203,213,225,0.45)",
        boxShadow: "4px 0 24px rgba(100,116,139,0.08), inset -1px 0 0 rgba(255,255,255,0.80)",
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 h-16" style={{ borderBottom: "1px solid rgba(203,213,225,0.28)" }}>
        <Link href="/" className="flex items-center">
          <Wordmark className="text-base" variant="light" />
        </Link>
      </div>

      {/* Find button */}
      <div className="px-3 py-4">
        <Link
          href="/search"
          className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm font-medium rounded-xl transition-all"
          style={{
            background: "rgba(203,213,225,0.20)",
            border: "1px solid rgba(203,213,225,0.55)",
            color: "#334155",
            boxShadow: "0 0 0 0.5px rgba(203,213,225,0.20), inset 0 1px 0 rgba(255,255,255,0.80)",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          Zarezerwuj wizytę
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-2 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
              style={isActive ? {
                background: "rgba(203,213,225,0.22)",
                color: "#1E293B",
                border: "1px solid rgba(203,213,225,0.50)",
                boxShadow: "0 0 0 0.5px rgba(203,213,225,0.20), inset 0 1px 0 rgba(255,255,255,0.90)",
              } : {
                color: "#94A3B8",
                border: "1px solid transparent",
              }}
              onMouseEnter={e => { if (!isActive) { (e.currentTarget as HTMLElement).style.background = "rgba(203,213,225,0.14)"; (e.currentTarget as HTMLElement).style.color = "#475569"; (e.currentTarget as HTMLElement).style.border = "1px solid rgba(203,213,225,0.30)"; } }}
              onMouseLeave={e => { if (!isActive) { (e.currentTarget as HTMLElement).style.background = ""; (e.currentTarget as HTMLElement).style.color = "#94A3B8"; (e.currentTarget as HTMLElement).style.border = "1px solid transparent"; } }}
            >
              <span className="flex-shrink-0" style={{ color: isActive ? "#64748B" : "inherit" }}>
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="p-3" style={{ borderTop: "1px solid rgba(203,213,225,0.28)" }}>
        <Link
          href="/customer/profile"
          className="flex items-center gap-3 px-3 py-2 rounded-lg transition-all"
          style={{ color: "#64748B" }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(148,163,184,0.10)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ""; }}
        >
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0"
            style={{ background: "rgba(203,213,225,0.25)", border: "1px solid rgba(203,213,225,0.55)", color: "#475569", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.70)" }}
          >
            U
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-slate-700 truncate">Mój profil</p>
            <p className="text-[10px] text-slate-400 truncate">Edytuj dane</p>
          </div>
        </Link>
      </div>
    </aside>
  );
}
