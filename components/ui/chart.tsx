"use client";

// ─── Chart kit — hand-rolled SVG, token-driven ──────────────────────────────
// Silver area / bars with an ink emphasis, faint hairline grid, glass tooltip.
// No charting dependency: full control over the Machined Silver aesthetic.

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const INK = "#0F172A";
const INK_SOFT = "#334155";

type Point = { label: string; value: number };

// ── Area chart (revenue over time) ────────────────────────────
// Renders at the container's REAL pixel width (ResizeObserver) instead of
// stretching a fixed viewBox — no distortion at any breakpoint, round dots,
// true edge padding, and the first/last points never clip.

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
  const H = height;
  const padL = 12;
  const padR = 14; // endpoint dot (r 3.5 + 2px ring) stays inside
  const padTop = 18;
  const padBottom = 6;
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [W, setW] = useState(0);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = Math.round(entries[0].contentRect.width);
      if (w > 0) setW(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const realMax = Math.max(...data.map((d) => d.value), 0);
  const max = Math.max(realMax, 1);
  const innerW = Math.max(W - padL - padR, 1);
  const innerH = H - padTop - padBottom;
  const n = data.length;

  const x = (i: number) => (n <= 1 ? padL + innerW / 2 : padL + (i / (n - 1)) * innerW);
  const y = (v: number) => padTop + innerH - (v / max) * innerH;

  const linePath = data.map((d, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(d.value).toFixed(1)}`).join(" ");
  const areaPath = n > 1 ? `${linePath} L${x(n - 1).toFixed(1)},${padTop + innerH} L${x(0).toFixed(1)},${padTop + innerH} Z` : "";

  // Value context on the 50% / 100% gridlines (skipped when everything is 0 —
  // no fabricated scale).
  const gridLines = [0.25, 0.5, 0.75, 1].map((f) => ({ gy: padTop + innerH - f * innerH, f }));

  function onMove(e: React.MouseEvent<SVGSVGElement>) {
    if (W === 0 || n === 0) return;
    const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
    const px = e.clientX - rect.left;
    let nearest = 0;
    let best = Infinity;
    for (let i = 0; i < n; i++) {
      const d = Math.abs(x(i) - px);
      if (d < best) { best = d; nearest = i; }
    }
    setHover(nearest);
  }

  const hv = hover !== null ? data[hover] : null;
  // Clamp the tooltip so it never leaves the card horizontally.
  const tipAnchor = hover !== null ? x(hover) : 0;
  const tipTransform = tipAnchor < 70 ? "translate(0, -100%)" : tipAnchor > W - 70 ? "translate(-100%, -100%)" : "translate(-50%, -100%)";

  return (
    <div ref={wrapRef} className={cn("relative w-full", className)}>
      {W > 0 && (
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width={W}
          height={H}
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
          {gridLines.map(({ gy, f }) => (
            <g key={f}>
              <line x1={padL} y1={gy} x2={W - padR} y2={gy} stroke="rgba(203,213,225,0.35)" strokeWidth={1} strokeDasharray="2 4" />
              {realMax > 0 && (f === 1 || f === 0.5) && (
                <text x={padL} y={gy - 4} fontSize={10} fill="#94A3B8" className="tabular-nums">
                  {formatValue(Math.round(max * f))}
                </text>
              )}
            </g>
          ))}
          {areaPath && <path d={areaPath} fill="url(#tc-area-fill)" />}
          <path d={linePath} fill="none" stroke={INK_SOFT} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {/* endpoint dot */}
          {n > 0 && (
            <circle cx={x(n - 1)} cy={y(data[n - 1].value)} r={3.5} fill={INK} stroke="#fff" strokeWidth={2} />
          )}
          {/* hover crosshair */}
          {hv && hover !== null && (
            <>
              <line x1={x(hover)} y1={padTop} x2={x(hover)} y2={padTop + innerH} stroke="rgba(100,116,139,0.4)" strokeWidth={1} />
              <circle cx={x(hover)} cy={y(hv.value)} r={4} fill={INK} stroke="#fff" strokeWidth={2} />
            </>
          )}
        </svg>
      )}
      {W === 0 && <div style={{ height: H }} aria-hidden="true" />}

      {/* x labels — thinned when dense */}
      <div className="flex justify-between mt-1" style={{ paddingLeft: padL, paddingRight: padR }}>
        {data.map((d, i) => {
          const step = Math.ceil(n / 8);
          const show = i === 0 || i === n - 1 || i % step === 0;
          return (
            <span key={i} className={cn("text-[10px] tabular-nums", hover === i ? "text-slate-700 font-semibold" : "text-slate-400")}>
              {show || hover === i ? d.label : ""}
            </span>
          );
        })}
      </div>

      {/* tooltip — clamped inside the card */}
      {hv && hover !== null && (
        <div
          className="absolute -top-1 pointer-events-none px-2.5 py-1.5 rounded-lg text-xs"
          style={{
            left: tipAnchor,
            transform: tipTransform,
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
