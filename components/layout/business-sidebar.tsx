"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { motion } from "framer-motion";
import { Wordmark } from "@/components/brand/wordmark";

type NavItem = {
  href: string;
  icon: ({ className, style }: { className?: string; style?: React.CSSProperties }) => React.JSX.Element;
  label: string;
  badge?: string;
};

const NAV_SECTIONS: { label: string | null; items: NavItem[] }[] = [
  {
    label: null,
    items: [
      { href: "/business/dashboard", icon: HomeIcon, label: "Pulpit" },
      { href: "/business/calendar", icon: CalendarIcon, label: "Kalendarz" },
    ],
  },
  {
    label: "Zarządzanie",
    items: [
      { href: "/business/staff", icon: UsersIcon, label: "Pracownicy" },
      { href: "/business/services", icon: ServicesIcon, label: "Usługi" },
      { href: "/business/hours", icon: ClockIcon, label: "Godziny pracy" },
    ],
  },
  {
    label: "Klienci i Finanse",
    items: [
      { href: "/business/crm", icon: CrmIcon, label: "CRM" },
      { href: "/business/payments", icon: PaymentsIcon, label: "Płatności" },
      { href: "/business/invoices", icon: InvoiceIcon, label: "Faktury" },
      { href: "/business/coupons", icon: CouponIcon, label: "Kupony" },
    ],
  },
  {
    label: "Wzrost",
    items: [
      { href: "/business/analytics", icon: AnalyticsIcon, label: "Analityka" },
      { href: "/business/ai", icon: AiIcon, label: "AI Asystent", badge: "Nowe" },
      { href: "/business/marketing", icon: MarketingIcon, label: "Marketing" },
      { href: "/business/reviews", icon: ReviewIcon, label: "Opinie" },
    ],
  },
  {
    label: "Profil",
    items: [
      { href: "/business/profile", icon: ProfileIcon, label: "Profil salonu" },
      { href: "/business/settings", icon: SettingsIcon, label: "Ustawienia" },
    ],
  },
];

const PLAN_LABELS: Record<string, string> = {
  FREE: "Plan darmowy",
  SOLO: "Plan Solo",
  TEAM: "Plan Zespół",
  PRO: "Plan Salon Pro",
};

export function BusinessSidebar({
  businessName,
  plan,
}: {
  businessName?: string;
  plan?: string;
} = {}) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const displayName = businessName ?? "Twój salon";
  const displayInitial = (businessName ?? "T").charAt(0).toUpperCase();
  const displayPlan = (plan && PLAN_LABELS[plan]) || "Wczesny dostęp";

  return (
    <aside
      className={cn("hidden lg:flex flex-col h-screen shrink-0 transition-all duration-300", isCollapsed ? "w-[58px]" : "w-[228px]")}
      style={{
        background: "rgba(255,255,255,0.78)",
        backdropFilter: "blur(40px) saturate(200%)",
        WebkitBackdropFilter: "blur(40px) saturate(200%)",
        borderRight: "1px solid rgba(203,213,225,0.45)",
        boxShadow: "0 0 0 0.5px rgba(203,213,225,0.25) inset, 4px 0 24px rgba(100,116,139,0.08), inset -1px 0 0 rgba(255,255,255,0.80)",
      }}
    >
      {/* ── Logo ── */}
      <div
        className={cn("flex items-center h-14 flex-shrink-0", isCollapsed ? "px-3.5 justify-center" : "px-4")}
        style={{ borderBottom: "1px solid rgba(203,213,225,0.28)" }}
      >
        {isCollapsed ? (
          <button
            onClick={() => setIsCollapsed(false)}
            className="p-1.5 rounded-lg icon-btn"
            style={{ color: "#94A3B8" }}
            aria-label="Rozwiń"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        ) : (
          <>
            <Wordmark className="text-[0.95rem]" variant="light" />
            <button
              onClick={() => setIsCollapsed(true)}
              className="ml-auto p-1.5 rounded-lg icon-btn"
              style={{ color: "#CBD5E1" }}
              aria-label="Zwiń"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
          </>
        )}
      </div>

      {/* ── Navigation ── */}
      <nav className={cn("flex-1 overflow-y-auto no-scrollbar py-3", isCollapsed ? "px-2" : "px-2.5")}>
        {NAV_SECTIONS.map((section, si) => (
          <div key={si} className={si > 0 ? "mt-4" : ""}>
            {section.label && !isCollapsed && (
              <p
                className="px-2.5 mb-1 text-[9px] font-semibold uppercase tracking-[0.12em] select-none"
                style={{ color: "#CBD5E1", letterSpacing: "0.12em" }}
              >
                {section.label}
              </p>
            )}
            {section.label && isCollapsed && (
              <div className="mx-2 my-1.5 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(148,163,184,0.28), transparent)" }} />
            )}
            <ul className="space-y-px">
              {section.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/business/dashboard" && pathname.startsWith(item.href));

                return (
                  <li key={item.href} className="relative">
                    {isActive && !isCollapsed && (
                      <span
                        className="absolute left-0 top-[5px] bottom-[5px] w-[3px] rounded-full"
                        style={{ background: "linear-gradient(180deg, #CBD5E1 0%, #94A3B8 50%, #CBD5E1 100%)" }}
                      />
                    )}
                    <motion.div
                      whileHover={!isActive ? { x: 1 } : {}}
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    >
                    <Link
                      href={item.href}
                      title={isCollapsed ? item.label : undefined}
                      className={cn(
                        "flex items-center gap-2.5 rounded-lg text-sm font-medium group",
                        !isActive && "nav-item",
                        isCollapsed ? "px-2 py-2 justify-center" : "pl-3 pr-2.5 py-2"
                      )}
                      style={isActive ? {
                        background: "rgba(203,213,225,0.22)",
                        color: "#1E293B",
                        backdropFilter: "blur(12px) saturate(180%)",
                        WebkitBackdropFilter: "blur(12px) saturate(180%)",
                        border: "1px solid rgba(203,213,225,0.50)",
                        boxShadow: "0 0 0 0.5px rgba(203,213,225,0.20), inset 0 1px 0 rgba(255,255,255,0.90)",
                      } : undefined}
                    >
                      <item.icon
                        className="flex-shrink-0"
                        style={{ color: isActive ? "#64748B" : "inherit" } as React.CSSProperties}
                      />
                      {!isCollapsed && (
                        <>
                          <span className="flex-1 truncate leading-none">{item.label}</span>
                          {item.badge && (
                            <span
                              className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold tracking-wide uppercase"
                              style={{
                                background: "rgba(203,213,225,0.22)",
                                color: "#64748B",
                                border: "1px solid rgba(203,213,225,0.50)",
                                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.70)",
                              }}
                            >
                              {item.badge}
                            </span>
                          )}
                        </>
                      )}
                    </Link>
                    </motion.div>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* ── Bottom user card ── */}
      {!isCollapsed && (
        <div className="p-2.5 flex-shrink-0" style={{ borderTop: "1px solid rgba(203,213,225,0.28)" }}>
          <Link
            href="/business/settings"
            className="flex items-center gap-2.5 p-2 rounded-lg row-hover group"
            style={{ color: "#64748B" }}
          >
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0"
              style={{ background: "rgba(203,213,225,0.25)", border: "1px solid rgba(203,213,225,0.55)", color: "#475569", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.70)" }}
            >
              {displayInitial}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold truncate leading-tight text-slate-700">{displayName}</p>
              <p className="text-[10px] truncate leading-tight mt-px text-slate-400">{displayPlan}</p>
            </div>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "#CBD5E1", flexShrink: 0 }}>
              <path d="m9 18 6-6-6-6" />
            </svg>
          </Link>
        </div>
      )}

      {isCollapsed && (
        <div className="p-2 flex-shrink-0 flex justify-center" style={{ borderTop: "1px solid rgba(148,163,184,0.16)" }}>
          <Link
            href="/business/settings"
            title="Ustawienia"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold transition-colors"
            style={{ background: "rgba(148,163,184,0.22)", border: "1px solid rgba(148,163,184,0.30)", color: "#475569" }}
          >
            {displayInitial}
          </Link>
        </div>
      )}
    </aside>
  );
}

// ── Icons ──────────────────────────────────────────────────────

function HomeIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} style={style}>
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function CalendarIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} style={style}>
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
      <line x1="16" x2="16" y1="2" y2="6" />
      <line x1="8" x2="8" y1="2" y2="6" />
      <line x1="3" x2="21" y1="10" y2="10" />
    </svg>
  );
}

function UsersIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} style={style}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function ServicesIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} style={style}>
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

function ClockIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} style={style}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function CrmIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} style={style}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function PaymentsIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} style={style}>
      <rect width="20" height="14" x="2" y="5" rx="2" />
      <line x1="2" x2="22" y1="10" y2="10" />
    </svg>
  );
}

function InvoiceIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} style={style}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" x2="8" y1="13" y2="13" />
      <line x1="16" x2="8" y1="17" y2="17" />
    </svg>
  );
}

function CouponIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} style={style}>
      <path d="M21.5 12H16c-.7 2-2 3-4 3s-3.3-1-4-3H2.5" />
      <path d="M5.5 5.1L2 12v6c0 1.1.9 2 2 2h16a2 2 0 0 0 2-2v-6l-3.4-6.9A2 2 0 0 0 16.8 4H7.2a2 2 0 0 0-1.7.9z" />
    </svg>
  );
}

function AnalyticsIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} style={style}>
      <line x1="18" x2="18" y1="20" y2="10" />
      <line x1="12" x2="12" y1="20" y2="4" />
      <line x1="6" x2="6" y1="20" y2="14" />
    </svg>
  );
}

function AiIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} style={style}>
      <path d="M9.663 17h4.673M12 3v1m6.364 1.636-.707.707M21 12h-1M4 12H3m3.343-5.657-.707-.707m2.828 9.9a5 5 0 1 1 7.072 0l-.548.547A3.374 3.374 0 0 0 14 18.469V19a2 2 0 1 1-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  );
}

function MarketingIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} style={style}>
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}

function ReviewIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} style={style}>
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function ProfileIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} style={style}>
      <rect width="7" height="9" x="3" y="3" rx="1" />
      <rect width="7" height="5" x="14" y="3" rx="1" />
      <rect width="7" height="9" x="14" y="12" rx="1" />
      <rect width="7" height="5" x="3" y="16" rx="1" />
    </svg>
  );
}

function SettingsIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} style={style}>
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
