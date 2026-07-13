"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/lib/motion";
import { INK_GRADIENT } from "@/components/ui/glass/tokens";

export type SegOption = { value: string; label: React.ReactNode; href?: string; count?: number };

// One segmented control for the whole app. Controlled via onChange, or
// URL-driven when options carry `href` (server-page period/tab switches).
export function Segmented({
  options,
  value,
  onChange,
  ariaLabel,
  size = "md",
  className,
  idBase = "seg",
}: {
  options: SegOption[];
  value: string;
  onChange?: (value: string) => void;
  ariaLabel: string;
  size?: "sm" | "md";
  className?: string;
  idBase?: string;
}) {
  const reduce = useReducedMotion();
  const pad = size === "sm" ? "px-3 py-1 text-xs" : "px-3.5 py-1.5 text-[13px]";

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn("inline-flex items-center gap-0.5 p-0.5 rounded-xl", className)}
      style={{
        background: "rgba(255,255,255,0.60)",
        border: "1px solid rgba(203,213,225,0.45)",
        boxShadow: "0 0 0 0.5px rgba(203,213,225,0.20), inset 0 1px 0 rgba(255,255,255,0.9)",
      }}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        const inner = (
          <span className="relative z-10 inline-flex items-center gap-1.5">
            {opt.label}
            {opt.count !== undefined && (
              <span className={cn("tabular-nums text-[11px]", active ? "text-white/70" : "text-slate-400")}>
                {opt.count}
              </span>
            )}
          </span>
        );
        const cls = cn(
          "relative rounded-[10px] font-semibold transition-colors whitespace-nowrap",
          pad,
          active ? "text-white" : "text-slate-500 hover:text-slate-800"
        );
        const indicator = active && (
          <motion.span
            layoutId={reduce ? undefined : `${idBase}-ind`}
            className="absolute inset-0 rounded-[10px]"
            style={{ background: INK_GRADIENT, boxShadow: "0 1px 2px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.15)" }}
            transition={{ type: "spring", stiffness: 420, damping: 34 }}
          />
        );
        return opt.href ? (
          <Link key={opt.value} href={opt.href} aria-current={active ? "true" : undefined} className={cls}>
            {indicator}
            {inner}
          </Link>
        ) : (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange?.(opt.value)}
            aria-pressed={active}
            className={cls}
          >
            {indicator}
            {inner}
          </button>
        );
      })}
    </div>
  );
}
