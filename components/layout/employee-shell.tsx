"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTransition } from "react";
import { cn } from "@/lib/utils";
import { stopViewAs } from "@/lib/actions/view-as";
import { ChromeAvatar } from "@/components/ui/glass";
import { INK_GRADIENT } from "@/components/ui/glass/tokens";

const NAV = [
  { href: "/employee/dashboard", label: "Dziś", icon: "M4 5h16M4 12h16M4 19h10" },
  { href: "/employee/calendar", label: "Kalendarz", icon: "M8 2v4M16 2v4M3 9h18M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" },
  { href: "/employee/appointments", label: "Moje wizyty", icon: "M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2" },
  { href: "/employee/ai", label: "AI Asystent", icon: "M12 3v3m0 12v3M5.6 5.6l2.1 2.1m8.6 8.6 2.1 2.1M3 12h3m12 0h3M5.6 18.4l2.1-2.1m8.6-8.6 2.1-2.1" },
  { href: "/employee/profile", label: "Mój profil", icon: "M20 21a8 8 0 1 0-16 0M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" },
];

function Icon({ d, className }: { d: string; className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>;
}

export function EmployeeShell({
  employeeName, businessName, viewAs, initials, children,
}: {
  employeeName: string; businessName: string; viewAs: boolean; initials?: string; children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [pending, start] = useTransition();
  const active = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <div className="flex min-h-screen flex-col lg:flex-row" style={{ background: "radial-gradient(ellipse 90% 60% at 10% 0%, rgba(226,232,240,0.40) 0%, transparent 50%), radial-gradient(ellipse 70% 55% at 92% 100%, rgba(203,213,225,0.28) 0%, transparent 55%), #F2F7FC" }}>
      {/* Desktop sidebar */}
      <aside className="hidden w-60 flex-shrink-0 flex-col border-r border-slate-200/60 p-4 lg:flex">
        <div className="mb-6 px-2">
          <p className="text-sm font-bold text-slate-900" style={{ letterSpacing: "-0.02em" }}>{businessName}</p>
          <p className="text-xs text-slate-500">Panel pracownika</p>
        </div>
        <nav className="space-y-1">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href}
              className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active(n.href) ? "text-white" : "text-slate-600 hover:bg-white/70 hover:text-slate-900")}
              style={active(n.href) ? { background: INK_GRADIENT } : undefined}>
              <Icon d={n.icon} className="h-4.5 w-4.5" />
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto flex items-center gap-2.5 px-2 pt-4">
          <ChromeAvatar initials={initials ?? "?"} size="sm" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-800">{employeeName}</p>
            <p className="text-[11px] text-slate-500">Pracownik</p>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {viewAs && (
          <div className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm text-white" style={{ background: "linear-gradient(180deg,#B45309,#92400E)" }}>
            <span className="font-semibold">Podgląd jako: {employeeName}</span>
            <button type="button" disabled={pending} onClick={() => start(() => { void stopViewAs(); })}
              className="rounded-lg bg-white/20 px-3 py-1 text-xs font-semibold hover:bg-white/30">
              Zakończ podgląd
            </button>
          </div>
        )}

        {/* Mobile top bar */}
        <header className="flex items-center justify-between px-4 py-3 lg:hidden">
          <div>
            <p className="text-sm font-bold text-slate-900">{businessName}</p>
            <p className="text-[11px] text-slate-500">Panel pracownika</p>
          </div>
          <ChromeAvatar initials={initials ?? "?"} size="sm" />
        </header>

        <main className="flex-1 overflow-y-auto px-4 pb-24 pt-1 lg:px-8 lg:pb-8 lg:pt-6">{children}</main>

        {/* Mobile bottom nav */}
        <nav className="fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t border-slate-200/70 bg-white/85 backdrop-blur lg:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className={cn("flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium", active(n.href) ? "text-slate-900" : "text-slate-400")}>
              <Icon d={n.icon} className="h-5 w-5" />
              {n.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
