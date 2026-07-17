"use client";

// ─── Asystent wyszukiwania TermCatch (Beta) ───────────────────────────────────
// Compact, optional, inline (never a floating chatbot). Deterministic backend
// over real salon data — no LLM, no fabricated results. Keyboard accessible.

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { discoverSalons } from "@/lib/actions/discovery";
import type { AssistantReply, DiscoveryResult } from "@/lib/discovery";

type Turn = { role: "user" | "assistant"; text: string; results?: DiscoveryResult[] };

const CARD: React.CSSProperties = {
  background: "rgba(255,255,255,0.78)",
  backdropFilter: "blur(28px) saturate(200%)",
  WebkitBackdropFilter: "blur(28px) saturate(200%)",
  border: "1px solid rgba(203,213,225,0.45)",
  boxShadow: "0 0 0 0.5px rgba(203,213,225,0.30), 0 6px 20px rgba(100,116,139,0.08), inset 0 1px 0 rgba(255,255,255,0.95)",
};

export function DiscoveryAssistant() {
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [isPending, start] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function send() {
    const text = input.trim();
    if (!text || isPending) return;
    const userTurns = [...turns, { role: "user" as const, text }];
    setTurns(userTurns);
    setInput("");
    start(async () => {
      let reply: AssistantReply;
      try {
        reply = await discoverSalons(userTurns.filter((t) => t.role === "user").map((t) => t.text));
      } catch {
        reply = { kind: "empty", text: "Coś poszło nie tak. Spróbuj ponownie." };
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

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setTimeout(() => inputRef.current?.focus(), 80);
        }}
        className="btn-spring inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium text-slate-600"
        style={{ background: "rgba(255,255,255,0.70)", border: "1px solid rgba(203,213,225,0.55)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9)" }}
        aria-expanded={false}
      >
        <svg className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm3.75 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm3.75 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM21 12c0 4.556-4.03 8.25-9 8.25a9.76 9.76 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
        </svg>
        Opisz, czego szukasz — pomożemy
        <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded" style={{ background: "rgba(203,213,225,0.30)", color: "#64748B" }}>
          Beta
        </span>
      </button>
    );
  }

  return (
    <section aria-label="Asystent wyszukiwania TermCatch" className="rounded-[20px] overflow-hidden" style={CARD}>
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid rgba(203,213,225,0.30)" }}>
        <p className="text-sm font-semibold text-slate-800">
          Asystent wyszukiwania TermCatch
          <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded align-middle" style={{ background: "rgba(203,213,225,0.30)", color: "#64748B" }}>
            Beta
          </span>
        </p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Zamknij asystenta"
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 6 6 18M6 6l12 12" /></svg>
        </button>
      </div>

      <div className="px-4 py-3 space-y-2.5 max-h-80 overflow-y-auto">
        {turns.length === 0 && (
          <p className="text-xs text-slate-500 leading-relaxed">
            Np. „Znajdź mi dobry salon w Warszawie, który specjalizuje się w kręconych włosach.”
            Odpowiadamy wyłącznie na podstawie prawdziwych salonów w TermCatch.
          </p>
        )}
        {turns.map((t, i) => (
          <div key={i} className={cn("flex", t.role === "user" ? "justify-end" : "justify-start")}>
            <div
              className={cn("max-w-[92%] rounded-2xl px-3 py-2 text-sm", t.role === "user" ? "text-white" : "text-slate-700")}
              style={t.role === "user"
                ? { background: "linear-gradient(180deg,#1E293B,#0F172A)" }
                : { background: "rgba(203,213,225,0.18)", border: "1px solid rgba(203,213,225,0.35)" }}
            >
              <p>{t.text}</p>
              {t.results && (
                <ul className="mt-2 space-y-1.5">
                  {t.results.map((r) => (
                    <li key={r.slug}>
                      <Link
                        href={`/b/${r.slug}`}
                        className="block rounded-xl px-3 py-2 row-hover"
                        style={{ background: "rgba(255,255,255,0.85)", border: "1px solid rgba(203,213,225,0.45)" }}
                      >
                        <span className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-slate-900 truncate">{r.name}</span>
                          {r.priceFrom != null && <span className="text-xs text-slate-500 tabular-nums flex-shrink-0">od {Math.round(r.priceFrom)} zł</span>}
                        </span>
                        <span className="block text-[11px] text-slate-500 mt-0.5 truncate">{r.reasons.join(" · ")}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ))}
        {isPending && <p className="text-xs text-slate-400">Szukam…</p>}
      </div>

      <form
        className="flex gap-2 px-4 py-3"
        style={{ borderTop: "1px solid rgba(203,213,225,0.30)" }}
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Opisz, czego szukasz…"
          aria-label="Twoje pytanie do asystenta"
          className="input-glass flex-1 px-3.5 py-2 text-sm rounded-xl outline-none text-slate-800 placeholder:text-slate-400"
        />
        <button
          type="submit"
          disabled={isPending || !input.trim()}
          className="btn-spring px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-40"
          style={{ background: "linear-gradient(180deg,#1E293B,#0F172A)", border: "1px solid #0F172A" }}
        >
          Wyślij
        </button>
      </form>
    </section>
  );
}
