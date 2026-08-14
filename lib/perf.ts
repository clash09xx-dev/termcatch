// ─── Server-action latency instrumentation ──────────────────────────────────
// Emits ONE line per instrumented action, e.g.
//   [perf] createAppointment total=842ms auth+lookups=210ms validate=90ms tx=120ms
// Only the action name + millisecond phase durations are logged — NEVER
// arguments, user data, tokens, or secrets. On by default; set PERF_LOG=0 to
// silence (e.g. in noisy environments). Uses the monotonic performance clock.

const ENABLED = process.env.PERF_LOG !== "0";

export interface PerfTimer {
  /** Record the elapsed time since the previous mark (or start) under `phase`. */
  mark(phase: string): void;
  /** Log the single summary line. `extra` adds trailing `key=Nms`/`key=val` fields. */
  end(extra?: Record<string, number | string>): void;
}

const NOOP: PerfTimer = { mark() {}, end() {} };

export function perf(action: string): PerfTimer {
  if (!ENABLED) return NOOP;
  const t0 = performance.now();
  let last = t0;
  const phases: Array<[string, number]> = [];
  return {
    mark(phase) {
      const now = performance.now();
      phases.push([phase, now - last]);
      last = now;
    },
    end(extra) {
      const total = Math.round(performance.now() - t0);
      const parts = phases.map(([k, v]) => `${k}=${Math.round(v)}ms`);
      if (extra) {
        for (const [k, v] of Object.entries(extra)) {
          parts.push(`${k}=${typeof v === "number" ? `${Math.round(v)}ms` : v}`);
        }
      }
      console.log(`[perf] ${action} total=${total}ms ${parts.join(" ")}`.trimEnd());
    },
  };
}
