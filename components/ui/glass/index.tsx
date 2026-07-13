// ─── Glass primitives — server-safe ──────────────────────────────────────────
// No hooks, no handlers: usable directly in RSC pages. Interactive springs
// come from CSS (.btn-spring, .row-hover, .card-hover-lift) so pages stay
// server components. Modals/sheets live in glass-modal.tsx (client).

import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  ELEV_RAISED,
  ELEV_SURFACE,
  ROW,
  CHIP,
  HAIRLINE,
  INK_BTN,
  GLASS_BTN,
  DANGER_BTN,
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

export function DangerButton({
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
      style={DANGER_BTN}
    >
      {children}
    </button>
  );
}

// ── Skeleton — unified loading shimmer ────────────────────────

export function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <span
      aria-hidden="true"
      className={cn("block rounded-lg tc-skeleton", className)}
      style={style}
    />
  );
}

// ── FormField — label + control + hint/error ──────────────────

export function FormField({
  label,
  htmlFor,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-700 mb-1.5">
        {label}
      </label>
      {hint && !error && <p className="text-xs text-slate-500 -mt-1 mb-2">{hint}</p>}
      {children}
      {error && (
        <p className="mt-1.5 text-xs font-medium flex items-center gap-1.5" style={{ color: "#BE123C" }}>
          <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}

// ── Timeline — vertical spine with hairline connectors ────────

export function Timeline({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("relative", className)}>{children}</div>;
}

export function TimelineRow({
  time,
  sub,
  dotColor = "#94A3B8",
  connector = true,
  muted = false,
  children,
}: {
  time: string;
  sub?: string;
  dotColor?: string;
  connector?: boolean;
  muted?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("relative flex gap-4", muted && "opacity-60")}>
      <div className="w-12 text-right flex-shrink-0 pt-0.5">
        <p className={cn("text-sm font-semibold tabular-nums", muted ? "text-slate-400" : "text-slate-900")}>{time}</p>
        {sub && <p className="text-[10px] text-slate-400 tabular-nums">{sub}</p>}
      </div>
      <div className="relative flex flex-col items-center">
        <span
          className="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0"
          style={{ background: dotColor, boxShadow: "0 0 0 3px rgba(255,255,255,0.85)" }}
        />
        {connector && <span className="w-px flex-1 my-1" style={{ background: "rgba(203,213,225,0.5)" }} />}
      </div>
      <div className="flex-1 min-w-0 pb-2.5">{children}</div>
    </div>
  );
}

// ── SplitShell — master–detail two-pane (server-safe layout) ──
// Selection state lives in the page; pass detailOpen to drive the
// mobile single-pane swap (list ⇄ detail).

export function SplitShell({
  list,
  detail,
  detailOpen = false,
  className,
}: {
  list: React.ReactNode;
  detail: React.ReactNode;
  detailOpen?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-4 lg:grid-cols-[minmax(300px,380px)_1fr] items-start", className)}>
      <div className={cn("min-w-0", detailOpen ? "hidden lg:block" : "block")}>{list}</div>
      <div className={cn("min-w-0", detailOpen ? "block" : "hidden lg:block")}>{detail}</div>
    </div>
  );
}

// ── DetailEmpty — placeholder for the empty detail pane ───────

export function DetailEmpty({ icon, title, body }: { icon: React.ReactNode; title: string; body?: string }) {
  return (
    <div
      className="hidden lg:flex flex-col items-center justify-center text-center rounded-[20px] min-h-[420px] px-8"
      style={ELEV_SURFACE}
    >
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4 text-slate-400" style={CHIP}>
        {icon}
      </div>
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      {body && <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">{body}</p>}
    </div>
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
