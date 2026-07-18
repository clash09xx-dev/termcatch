"use client";

// ─── Asystent TermCatch — customer recommendation assistant ──────────────────
// A premium extension of search for CUSTOMERS looking for salons (distinct
// from the business AI assistant and from support). Deterministic, local:
// interprets the query server-side against real marketplace data — no external
// AI service, no API key, nothing leaves TermCatch. Inline expanding surface,
// never a floating chatbot widget.

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { discoverSalons } from "@/lib/actions/discovery";
import type { AssistantReply, DiscoveryResult } from "@/lib/discovery";

type Turn = { role: "user" | "assistant"; text: string; results?: DiscoveryResult[] };

const SUGGESTIONS = ["Kręcone włosy w Warszawie", "Manicure dzisiaj", "Masaż po 18:00", "Barber w Krakowie"];

const GLASS: React.CSSProperties = {
  background: "rgba(255,255,255,0.72)",
  backdropFilter: "blur(28px) saturate(200%)",
  WebkitBackdropFilter: "blur(28px) saturate(200%)",
  border: "1px solid rgba(203,213,225,0.50)",
  boxShadow:
    "0 0 0 0.5px rgba(203,213,225,0.30), 0 6px 20px rgba(100,116,139,0.08), inset 0 1px 0 rgba(255,255,255,0.95)",
};

const INK: React.CSSProperties = {
  background: "linear-gradient(180deg,#1E293B,#0F172A)",
  border: "1px solid #0F172A",
  color: "#F8FAFC",
  boxShadow: "0 1px 2px rgba(0,0,0,0.18), 0 8px 20px rgba(15,23,42,0.22), inset 0 1px 0 rgba(255,255,255,0.15)",
};

export function CustomerAssistant({ className }: { className?: string }) {
  const [expanded, setExpanded] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [failed, setFailed] = useState(false);
  const [isPending, start] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const firstQuery = turns.find((t) => t.role === "user")?.text ?? "";

  function ask(raw: string) {
    const text = raw.trim().slice(0, 300);
    if (!text || isPending) return;
    setFailed(false);
    setExpanded(true);
    const userTurns = [...turns, { role: "user" as const, text }];
    setTurns(userTurns);
    setInput("");
    start(async () => {
      let reply: AssistantReply;
      try {
        reply = await discoverSalons(userTurns.filter((t) => t.role === "user").map((t) => t.text));
      } catch {
        setFailed(true);
        reply = { kind: "empty", text: "Coś poszło nie tak po naszej stronie. Spróbuj ponownie za chwilę." };
      }
      setTurns((prev) => [
        ...prev,
        reply.kind === "results"
          ? { role: "assistant", text: reply.intro, results: reply.results }
          : { role: "assistant", text: reply.text },
      ]);
      inputRef.current?.focus();
    });
  }

  function close() {
    setExpanded(false);
    setTurns([]);
    setInput("");
    setFailed(false);
  }

  return (
    <section
      aria-label="Asystent TermCatch — rekomendacje salonów"
      className={cn("w-full max-w-xl rounded-2xl overflow-hidden text-left", className)}
      style={GLASS}
      onKeyDown={(e) => {
        if (e.key === "Escape" && expanded) close();
      }}
    >
      {/* Header row */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <p className="text-xs font-semibold text-slate-700 flex items-center gap-2">
          <svg className="w-3.5 h-3.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
          </svg>
          Asystent TermCatch
          <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded" style={{ background: "rgba(203,213,225,0.30)", color: "#64748B" }}>
            Beta
          </span>
        </p>
        {expanded && (
          <button type="button" onClick={close} aria-label="Zamknij asystenta" className="p-1 rounded-lg text-slate-400 hover:text-slate-700">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        )}
      </div>

      {/* Conversation (expanded) */}
      {expanded && (
        <div className="px-4 py-2 space-y-2.5 max-h-96 overflow-y-auto" aria-live="polite">
          {turns.map((t, i) => (
            <div key={i} className={cn("flex", t.role === "user" ? "justify-end" : "justify-start")}>
              <div
                className={cn("max-w-[94%] rounded-2xl px-3 py-2 text-sm", t.role === "user" ? "text-white" : "text-slate-700")}
                style={t.role === "user" ? { background: "linear-gradient(180deg,#1E293B,#0F172A)" } : { background: "rgba(203,213,225,0.18)", border: "1px solid rgba(203,213,225,0.35)" }}
              >
                <p>{t.text}</p>
                {t.results && (
                  <ul className="mt-2 space-y-1.5">
                    {t.results.map((r) => (
                      <li key={r.slug} className="rounded-xl px-3 py-2.5" style={{ background: "rgba(255,255,255,0.88)", border: "1px solid rgba(203,213,225,0.45)" }}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-slate-900 truncate">{r.name}</span>
                          <span className="text-xs text-slate-500 tabular-nums flex-shrink-0">
                            {r.slotLabel ? `wolne o ${r.slotLabel}` : r.priceFrom != null ? `od ${Math.round(r.priceFrom)} zł` : ""}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{r.reasons.join(" · ")}</p>
                        <div className="flex gap-2 mt-2">
                          <Link
                            href={`/b/${r.slug}`}
                            className="btn-spring px-2.5 py-1 rounded-lg text-[11px] font-semibold text-slate-600"
                            style={{ background: "rgba(255,255,255,0.8)", border: "1px solid rgba(203,213,225,0.55)" }}
                          >
                            Zobacz profil
                          </Link>
                          <Link
                            href={`/b/${r.slug}/book${r.serviceId ? `?serviceId=${r.serviceId}` : ""}`}
                            className="btn-spring px-2.5 py-1 rounded-lg text-[11px] font-semibold text-white"
                            style={INK}
                          >
                            Zarezerwuj
                          </Link>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ))}
          {isPending && <p className="text-xs text-slate-400">Szukam wśród salonów…</p>}
          {!isPending && firstQuery && !failed && (
            <div className="pt-0.5">
              <Link
                href={`/search?q=${encodeURIComponent(firstQuery)}`}
                className="text-[11px] font-semibold text-slate-500 hover:text-slate-800"
              >
                Zobacz wyniki w wyszukiwarce →
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Input row */}
      <form
        className="flex gap-2 px-3 pb-3 pt-2"
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
      >
        <input
          ref={inputRef}
          value={input}
          maxLength={300}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Opisz, czego szukasz…"
          aria-label="Opisz, czego szukasz — asystent poleci salony"
          className="flex-1 px-3.5 py-2.5 rounded-xl text-sm outline-none text-slate-800 placeholder:text-slate-400"
          style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(203,213,225,0.55)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9)" }}
        />
        <button
          type="submit"
          disabled={isPending || !input.trim()}
          className="btn-spring px-4 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40 flex-shrink-0"
          style={INK}
        >
          Zapytaj
        </button>
      </form>

      {/* Suggestion chips (collapsed only) */}
      {!expanded && (
        <div className="flex flex-wrap gap-1.5 px-3 pb-3">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => ask(s)}
              className="btn-spring px-2.5 py-1 rounded-lg text-[11px] font-medium text-slate-600"
              style={{ background: "rgba(255,255,255,0.7)", border: "1px solid rgba(203,213,225,0.5)" }}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
