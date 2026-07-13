"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Wordmark } from "@/components/brand/wordmark";
import { NAV_GROUPS } from "./business-nav";
import { INK_GRADIENT } from "@/components/ui/glass/tokens";

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
  const [collapsed, setCollapsed] = useState(false);
  const name = businessName ?? "Twój salon";
  const initial = (businessName ?? "T").charAt(0).toUpperCase();
  const planLabel = (plan && PLAN_LABELS[plan]) || "Wczesny dostęp";

  return (
    <motion.aside
      animate={{ width: collapsed ? 66 : 244 }}
      transition={{ type: "spring", stiffness: 320, damping: 34 }}
      className="hidden lg:flex flex-col h-screen shrink-0 overflow-hidden relative z-20"
      style={{
        background: "rgba(255,255,255,0.55)",
        backdropFilter: "blur(28px) saturate(200%)",
        WebkitBackdropFilter: "blur(28px) saturate(200%)",
        borderRight: "1px solid rgba(203,213,225,0.40)",
        boxShadow: "1px 0 0 rgba(255,255,255,0.6) inset, 6px 0 30px rgba(100,116,139,0.06)",
      }}
    >
      {/* Brand + collapse */}
      <div className={cn("flex items-center h-16 flex-shrink-0", collapsed ? "justify-center px-2" : "px-4")}>
        {collapsed ? (
          <button
            onClick={() => setCollapsed(false)}
            className="icon-btn p-2 rounded-xl"
            style={{ color: "#94A3B8" }}
            aria-label="Rozwiń menu"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
          </button>
        ) : (
          <>
            <Wordmark className="text-[1.02rem]" variant="light" />
            <button
              onClick={() => setCollapsed(true)}
              className="ml-auto icon-btn p-1.5 rounded-lg"
              style={{ color: "#CBD5E1" }}
              aria-label="Zwiń menu"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
            </button>
          </>
        )}
      </div>

      {/* Nav */}
      <nav className={cn("flex-1 overflow-y-auto no-scrollbar pb-3", collapsed ? "px-2" : "px-3")}>
        {NAV_GROUPS.map((group, gi) => (
          <div key={group.label} className={gi > 0 ? "mt-5" : "mt-1"}>
            {collapsed ? (
              <div className="mx-2 mb-2 h-px" style={{ background: "linear-gradient(90deg,transparent,rgba(148,163,184,0.28),transparent)" }} />
            ) : (
              <p className="px-2.5 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.13em] select-none" style={{ color: "#B4C0D0" }}>
                {group.label}
              </p>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active =
                  pathname === item.href ||
                  (item.href !== "/business/dashboard" && pathname.startsWith(item.href));
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      title={collapsed ? item.label : undefined}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group relative flex items-center gap-3 rounded-[11px] text-[13.5px] font-medium transition-colors",
                        collapsed ? "px-0 py-2.5 justify-center" : "px-3 py-2",
                        active ? "text-white" : "nav-item"
                      )}
                      style={active ? {
                        background: INK_GRADIENT,
                        boxShadow: "0 1px 2px rgba(15,23,42,0.24), 0 6px 16px rgba(15,23,42,0.20), inset 0 1px 0 rgba(255,255,255,0.14)",
                      } : undefined}
                    >
                      <Icon className="flex-shrink-0" style={{ color: active ? "#F8FAFC" : undefined }} />
                      {!collapsed && <span className="truncate leading-none">{item.label}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Salon identity */}
      <div className={cn("flex-shrink-0 p-2.5", collapsed && "flex justify-center")} style={{ borderTop: "1px solid rgba(203,213,225,0.30)" }}>
        <Link
          href="/business/settings"
          title={collapsed ? name : undefined}
          className={cn("row-hover flex items-center gap-2.5 rounded-xl", collapsed ? "p-1.5 justify-center" : "p-2")}
        >
          <span
            className="w-8 h-8 rounded-[10px] flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{ background: INK_GRADIENT, color: "#F8FAFC", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.16)" }}
          >
            {initial}
          </span>
          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-[12.5px] font-semibold truncate leading-tight text-slate-800">{name}</p>
                <p className="text-[10.5px] truncate leading-tight mt-px text-slate-400">{planLabel}</p>
              </div>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "#CBD5E1", flexShrink: 0 }} aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
            </>
          )}
        </Link>
      </div>
    </motion.aside>
  );
}
