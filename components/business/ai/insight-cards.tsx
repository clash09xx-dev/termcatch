import Link from "next/link";
import type { Insight, InsightSeverity } from "@/lib/ai/insights-types";
import { GlassCard, Overline } from "@/components/ui/glass";

const TINT: Record<InsightSeverity, { rail: string; label: string; text: string }> = {
  warning: { rail: "#E11D48", label: "Wymaga uwagi", text: "#9F1239" },
  opportunity: { rail: "#0D9488", label: "Szansa", text: "#0F766E" },
  info: { rail: "#64748B", label: "Obserwacja", text: "#475569" },
};

export function InsightCard({ insight }: { insight: Insight }) {
  const tint = TINT[insight.severity];
  return (
    <GlassCard className="relative overflow-hidden p-4">
      <span aria-hidden className="absolute left-0 top-0 h-full w-1" style={{ background: tint.rail }} />
      <div className="pl-2">
        <div className="flex items-center justify-between gap-2">
          <Overline>
            <span style={{ color: tint.text }}>{tint.label}</span>
          </Overline>
          {insight.metric && (
            <span className="text-lg font-bold text-slate-900 tabular-nums" style={{ letterSpacing: "-0.02em" }}>
              {insight.metric}
            </span>
          )}
        </div>
        <h3 className="mt-1 text-sm font-semibold text-slate-900">{insight.title}</h3>
        <p className="mt-1 text-xs leading-relaxed text-slate-600">{insight.body}</p>
        {insight.cta && (
          <Link
            href={insight.cta.href}
            className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-slate-700 hover:text-slate-900"
          >
            {insight.cta.label}
            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </Link>
        )}
      </div>
    </GlassCard>
  );
}

export function InsightCards({ insights, className }: { insights: Insight[]; className?: string }) {
  if (insights.length === 0) return null;
  return (
    <div className={className ?? "grid gap-3 sm:grid-cols-2 lg:grid-cols-3"}>
      {insights.map((i) => (
        <InsightCard key={i.id} insight={i} />
      ))}
    </div>
  );
}
