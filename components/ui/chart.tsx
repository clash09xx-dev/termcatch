"use client";

// ─── Chart kit — hand-rolled SVG, token-driven ──────────────────────────────
// Silver area / bars with an ink emphasis, faint hairline grid, glass tooltip.
// No charting dependency: full control over the Machined Silver aesthetic.

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

const INK = "#0F172A";
const INK_SOFT = "#334155";

type Point = { label: string; value: number };

// ── Area chart (revenue over time) ────────────────────────────

export function AreaChart({
  data,
  height = 200,
  formatValue = (v) => String(v),
  className,
}: {
  data: Point[];
  height?: number;
  formatValue?: (v: number) => string;
  className?: string;
}) {
  const W = 760;
  const H = height;
  const padX = 8;
  const padTop = 16;
  const padBottom = 26;
  const ref = useRef<SVGSVGElement | null>(null);
  const [hover, setHover] = useState<number | null>(null);

  const max = Math.max(...data.map((d) => d.value), 1);
  const innerW = W - padX * 2;
  const innerH = H - padTop - padBottom;
  const n = data.length;

  const x = (i: number) => (n <= 1 ? padX + innerW / 2 : padX + (i / (n - 1)) * innerW);
  const y = (v: number) => padTop + innerH - (v / max) * innerH;

  const linePath = data.map((d, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(d.value).toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${x(n - 1).toFixed(1)},${padTop + innerH} L${x(0).toFixed(1)},${padTop + innerH} Z`;

  const gridLines = [0.25, 0.5, 0.75, 1].map((f) => padTop + innerH - f * innerH);

  function onMove(e: React.MouseEvent<SVGSVGElement>) {
    const svg = ref.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    let nearest = 0;
    let best = Infinity;
    for (let i = 0; i < n; i++) {
      const d = Math.abs(x(i) - px);
      if (d < best) { best = d; nearest = i; }
    }
    setHover(nearest);
  }

  const hv = hover !== null ? data[hover] : null;

  return (
    <div className={cn("relative w-full", className)}>
      <svg
        ref={ref}
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height={H}
        preserveAspectRatio="none"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
        role="img"
        aria-label="Wykres przychodu w czasie"
        style={{ display: "block" }}
      >
        <defs>
          <linearGradient id="tc-area-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(100,116,139,0.28)" />
            <stop offset="100%" stopColor="rgba(148,163,184,0.02)" />
          </linearGradient>
        </defs>
        {gridLines.map((gy, i) => (
          <line key={i} x1={padX} y1={gy} x2={W - padX} y2={gy} stroke="rgba(203,213,225,0.35)" strokeWidth={1} strokeDasharray="2 4" vectorEffect="non-scaling-stroke" />
        ))}
        <path d={areaPath} fill="url(#tc-area-fill)" />
        <path d={linePath} fill="none" stroke={INK_SOFT} strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
        {/* endpoint dot */}
        {n > 0 && (
          <circle cx={x(n - 1)} cy={y(data[n - 1].value)} r={3.5} fill={INK} stroke="#fff" strokeWidth={2} vectorEffect="non-scaling-stroke" />
        )}
        {/* hover crosshair */}
        {hv && hover !== null && (
          <>
            <line x1={x(hover)} y1={padTop} x2={x(hover)} y2={padTop + innerH} stroke="rgba(100,116,139,0.4)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
            <circle cx={x(hover)} cy={y(hv.value)} r={4} fill={INK} stroke="#fff" strokeWidth={2} vectorEffect="non-scaling-stroke" />
          </>
        )}
      </svg>

      {/* x labels */}
      <div className="flex justify-between px-1 mt-1">
        {data.map((d, i) => (
          <span key={i} className={cn("text-[10px] tabular-nums", hover === i ? "text-slate-700 font-semibold" : "text-slate-400")}>
            {d.label}
          </span>
        ))}
      </div>

      {/* tooltip */}
      {hv && hover !== null && (
        <div
          className="absolute -top-1 pointer-events-none px-2.5 py-1.5 rounded-lg text-xs"
          style={{
            left: `${(x(hover) / W) * 100}%`,
            transform: "translate(-50%, -100%)",
            background: "rgba(255,255,255,0.94)",
            border: "1px solid rgba(203,213,225,0.5)",
            boxShadow: "0 4px 16px rgba(15,23,42,0.12), inset 0 1px 0 rgba(255,255,255,0.9)",
            backdropFilter: "blur(12px)",
            whiteSpace: "nowrap",
          }}
        >
          <span className="text-slate-500">{hv.label} · </span>
          <span className="font-bold text-slate-900 tabular-nums">{formatValue(hv.value)}</span>
        </div>
      )}
    </div>
  );
}

// ── Bar columns (weekday activity) ────────────────────────────

export function BarColumns({
  data,
  height = 140,
  className,
}: {
  data: Point[];
  height?: number;
  className?: string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className={cn("flex items-end gap-3", className)} style={{ height }}>
      {data.map((d, i) => {
        const isPeak = d.value === max && d.value > 0;
        const h = (d.value / max) * (height - 40);
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
            <span className={cn("text-xs tabular-nums", isPeak ? "font-bold text-slate-900" : "text-slate-500")}>{d.value}</span>
            <div
              className="w-full rounded-t-lg transition-all"
              style={{
                height: Math.max(h, d.value > 0 ? 4 : 0),
                background: isPeak
                  ? "linear-gradient(180deg,#1E293B,#0F172A)"
                  : "linear-gradient(180deg,rgba(148,163,184,0.5),rgba(203,213,225,0.35))",
                border: d.value > 0 ? "1px solid rgba(148,163,184,0.35)" : "none",
                borderBottom: "none",
                boxShadow: d.value > 0 ? "inset 0 1px 0 rgba(255,255,255,0.3)" : "none",
              }}
            />
            <span className={cn("text-xs", isPeak ? "font-semibold text-slate-800" : "font-medium text-slate-500")}>{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Sparkline (inline mini area) ──────────────────────────────

export function Sparkline({ data, width = 96, height = 28, className }: { data: number[]; width?: number; height?: number; className?: string }) {
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const n = data.length;
  const x = (i: number) => (n <= 1 ? width / 2 : (i / (n - 1)) * width);
  const y = (v: number) => height - 2 - ((v - min) / range) * (height - 4);
  const line = data.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const area = `${line} L${width},${height} L0,${height} Z`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={className} aria-hidden="true">
      <defs>
        <linearGradient id="tc-spark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(100,116,139,0.22)" />
          <stop offset="100%" stopColor="rgba(148,163,184,0.01)" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#tc-spark)" />
      <path d={line} fill="none" stroke="#334155" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
      {n > 0 && <circle cx={x(n - 1)} cy={y(data[n - 1])} r={2.2} fill="#0F172A" />}
    </svg>
  );
}
