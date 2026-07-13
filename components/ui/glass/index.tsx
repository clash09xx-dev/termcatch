// ─── Glass primitives — server-safe ──────────────────────────────────────────
// No hooks, no handlers: usable directly in RSC pages. Interactive springs
// come from CSS (.btn-spring, .row-hover, .card-hover-lift) so pages stay
// server components. Modals/sheets live in glass-modal.tsx (client).

import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  ELEV_RAISED,
  ROW,
  CHIP,
  HAIRLINE,
  INK_BTN,
  GLASS_BTN,
  STATUS_TINT,
  OVERLINE_CLS,
  type StatusKey,
} from "./tokens";

export * from "./tokens";

// ── Page header ───────────────────────────────────────────────

export function PageHeader({
  title,
  subtitle,
  actions,
  className,
}: {
  title: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("fade-rise flex flex-wrap items-end justify-between gap-3", className)}>
      <div className="min-w-0">
        <h1 className="text-xl font-semibold text-slate-900" style={{ letterSpacing: "-0.02em" }}>
          {title}
        </h1>
        {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
    </div>
  );
}

// ── Cards ─────────────────────────────────────────────────────

export function GlassCard({
  children,
  className,
  row = false,
}: {
  children: React.ReactNode;
  className?: string;
  /** Solid row variant — no backdrop blur, for repeated list items */
  row?: boolean;
}) {
  return (
    <div className={cn("rounded-[20px]", className)} style={row ? ROW : ELEV_RAISED}>
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  action,
  className,
}: {
  title: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn("flex items-center justify-between gap-3 px-5 py-3.5", className)}
      style={{ borderBottom: HAIRLINE }}
    >
      <h3 className="text-sm font-semibold text-slate-800" style={{ letterSpacing: "-0.01em" }}>
        {title}
      </h3>
      {action}
    </div>
  );
}

export function Overline({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn(OVERLINE_CLS, className)}>{children}</p>;
}

// ── Stat card ─────────────────────────────────────────────────

export function StatCard({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-[20px] p-4 sm:p-5" style={ELEV_RAISED}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        {icon && (
          <span
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 flex-shrink-0"
            style={CHIP}
          >
            {icon}
          </span>
        )}
      </div>
      <p
        className="mt-1.5 text-[22px] leading-7 font-bold text-slate-900 tabular-nums"
        style={{ letterSpacing: "-0.02em" }}
      >
        {value}
      </p>
      {sub && <p className="mt-0.5 text-xs text-slate-500 tabular-nums">{sub}</p>}
    </div>
  );
}

// ── Empty state — always names the next action ────────────────

export function EmptyState({
  icon,
  title,
  body,
  action,
  className,
}: {
  icon: React.ReactNode;
  title: string;
  body?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center px-6 py-14", className)}>
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4 text-slate-400"
        style={{
          background: "rgba(255,255,255,0.78)",
          border: "1px solid rgba(203,213,225,0.50)",
          boxShadow: "0 0 0 0.5px rgba(203,213,225,0.25), 0 4px 14px rgba(100,116,139,0.07), inset 0 1px 0 rgba(255,255,255,0.90)",
        }}
      >
        {icon}
      </div>
      <p className="text-sm font-semibold text-slate-800">{title}</p>
      {body && <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

// ── Status badge — one implementation, glass tints ────────────

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const meta = STATUS_TINT[status as StatusKey] ?? {
    label: status,
    style: STATUS_TINT.RESCHEDULED.style,
  };
  return (
    <span
      className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap", className)}
      style={meta.style}
    >
      {meta.label}
    </span>
  );
}

// ── Buttons & links — CSS springs, server-safe ────────────────

const BTN_BASE = "btn-spring inline-flex items-center justify-center gap-1.5 rounded-xl text-sm font-semibold";
const BTN_PAD = { sm: "px-3 py-1.5 text-xs", md: "px-4 py-2", lg: "px-5 py-2.5" } as const;

export function InkLink({
  href,
  children,
  size = "md",
  className,
}: {
  href: string;
  children: React.ReactNode;
  size?: keyof typeof BTN_PAD;
  className?: string;
}) {
  return (
    <Link href={href} className={cn(BTN_BASE, BTN_PAD[size], className)} style={INK_BTN}>
      {children}
    </Link>
  );
}

export function GlassLink({
  href,
  children,
  size = "md",
  className,
}: {
  href: string;
  children: React.ReactNode;
  size?: keyof typeof BTN_PAD;
  className?: string;
}) {
  return (
    <Link href={href} className={cn(BTN_BASE, "font-medium", BTN_PAD[size], className)} style={GLASS_BTN}>
      {children}
    </Link>
  );
}

export function InkButton({
  children,
  size = "md",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  size?: keyof typeof BTN_PAD;
}) {
  return (
    <button
      {...props}
      className={cn(BTN_BASE, BTN_PAD[size], "disabled:opacity-50 disabled:cursor-not-allowed", className)}
      style={INK_BTN}
    >
      {children}
    </button>
  );
}

export function GlassButton({
  children,
  size = "md",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  size?: keyof typeof BTN_PAD;
}) {
  return (
    <button
      {...props}
      className={cn(BTN_BASE, "font-medium", BTN_PAD[size], "disabled:opacity-50 disabled:cursor-not-allowed", className)}
      style={GLASS_BTN}
    >
      {children}
    </button>
  );
}

// ── Avatar — chrome initials ──────────────────────────────────

export function ChromeAvatar({
  initials,
  size = "md",
  className,
}: {
  initials: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const dims = size === "sm" ? "w-7 h-7 text-[10px]" : size === "lg" ? "w-11 h-11 text-sm" : "w-9 h-9 text-xs";
  return (
    <span
      className={cn("rounded-xl flex items-center justify-center font-bold text-slate-600 flex-shrink-0", dims, className)}
      style={{
        background: "linear-gradient(140deg, rgba(226,232,240,0.70) 0%, rgba(203,213,225,0.40) 100%)",
        border: "1px solid rgba(203,213,225,0.55)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.80)",
      }}
    >
      {initials}
    </span>
  );
}

// ── Coming soon — shared quiet treatment for waitlist pages ───

export function ComingSoon({
  title,
  body,
  icon,
}: {
  title: string;
  body: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="max-w-lg mx-auto mt-10 fade-rise">
      <div className="rounded-[20px] p-8 text-center" style={ELEV_RAISED}>
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-500"
          style={CHIP}
        >
          {icon}
        </div>
        <h1 className="text-lg font-semibold text-slate-900" style={{ letterSpacing: "-0.02em" }}>
          {title}
        </h1>
        <p className="text-sm text-slate-500 mt-2 leading-relaxed">{body}</p>
        <p className="mt-5 inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold text-slate-600" style={CHIP}>
          Wkrótce
        </p>
      </div>
    </div>
  );
}
