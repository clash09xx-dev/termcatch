"use client";

import { useEffect, useRef, useState } from "react";
import { askAssistant, confirmAiAction } from "@/lib/actions/ai";
import type { ActionProposal, AssistantMessage } from "@/lib/ai/proposal-types";
import { InkButton } from "@/components/ui/glass";
import { CHIP, INK_GRADIENT } from "@/components/ui/glass/tokens";
import { GlassModal, ModalInkButton, ModalGlassButton } from "@/components/ui/glass-modal";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  proposals?: ActionProposal[];
};

type ProposalState = { status: "idle" | "pending" | "done" | "error"; message?: string; draft?: string };

const SUGGESTIONS = [
  "Jak wygląda ten tydzień?",
  "Kto ma najmniej rezerwacji?",
  "Znajdź mi wolne godziny jutro.",
  "Którzy klienci nie byli u nas od 60 dni?",
  "Jak zwiększyć przychód w przyszłym tygodniu?",
  "Podsumuj dzisiejszy dzień.",
];

let counter = 0;
const uid = () => `m${Date.now()}_${counter++}`;

export function AssistantClient({
  available,
  reason,
  tier,
  initialPrompt,
}: {
  available: boolean;
  reason?: string;
  tier?: string;
  initialPrompt?: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState(initialPrompt ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limitOpen, setLimitOpen] = useState<null | "rate_limited" | "plan_excluded">(null);
  const [proposalStates, setProposalStates] = useState<Record<string, ProposalState>>({});
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, pending]);

  async function send(text: string) {
    const q = text.trim();
    if (!q || pending || !available) return;
    setError(null);
    const userMsg: ChatMessage = { id: uid(), role: "user", content: q };
    const history: AssistantMessage[] = [...messages, userMsg].map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setPending(true);
    try {
      const res = await askAssistant(history);
      if (res.ok) {
        setMessages((prev) => [...prev, { id: uid(), role: "assistant", content: res.text, proposals: res.proposals }]);
      } else if (res.reason === "rate_limited" || res.reason === "plan_excluded") {
        setLimitOpen(res.reason);
      } else {
        setError(res.message);
      }
    } catch {
      setError("Coś poszło nie tak. Spróbuj ponownie.");
    } finally {
      setPending(false);
    }
  }

  async function confirm(key: string, p: ActionProposal) {
    const edited = proposalStates[key]?.draft;
    const params = { ...p.params };
    if (edited != null) {
      if (p.actionType === "send_campaign") params.message = edited;
      if (p.actionType === "publish_review_reply") params.replyText = edited;
    }
    setProposalStates((s) => ({ ...s, [key]: { ...s[key], status: "pending" } }));
    try {
      const res = await confirmAiAction(p.actionType, params);
      if ("ok" in res && res.ok) {
        setProposalStates((s) => ({ ...s, [key]: { status: "done", message: res.message } }));
      } else {
        setProposalStates((s) => ({ ...s, [key]: { status: "error", message: res.message, draft: edited } }));
      }
    } catch {
      setProposalStates((s) => ({ ...s, [key]: { status: "error", message: "Nie udało się wykonać działania.", draft: edited } }));
    }
  }

  if (!available) {
    return (
      <div className="rounded-2xl p-6" style={{ ...CHIP }}>
        <h3 className="text-sm font-semibold text-slate-900">Asystent AI niedostępny</h3>
        <p className="mt-1 text-sm text-slate-600">
          {reason === "plan_excluded"
            ? "Asystent AI jest dostępny w planie Professional i Ultimate. Uaktualnij plan, aby rozmawiać z asystentem i uruchomić działania."
            : reason === "not_configured"
              ? "Asystent AI nie został jeszcze skonfigurowany (brak klucza OpenAI). Analizy poniżej działają niezależnie."
              : reason === "rate_limited"
                ? "Osiągnięto dzienny limit zapytań do AI. Spróbuj ponownie później."
                : "Asystent AI jest chwilowo niedostępny."}
        </p>
        {reason === "plan_excluded" && (
          <a href="/business/payments" className="mt-3 inline-block rounded-xl px-4 py-2 text-sm font-semibold text-white" style={{ background: INK_GRADIENT }}>
            Zobacz plany
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col rounded-2xl" style={{ ...CHIP, minHeight: 420 }}>
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4" style={{ maxHeight: 520 }}>
        {messages.length === 0 && (
          <div className="py-6 text-center">
            <p className="text-sm text-slate-500">Zadaj pytanie albo wybierz jedną z propozycji poniżej.</p>
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div className={m.role === "user" ? "max-w-[85%]" : "w-full"}>
              <div
                className={
                  m.role === "user"
                    ? "rounded-2xl rounded-br-sm px-4 py-2.5 text-sm text-white"
                    : "rounded-2xl rounded-bl-sm bg-white/80 px-4 py-2.5 text-sm text-slate-800"
                }
                style={m.role === "user" ? { background: INK_GRADIENT } : { border: "1px solid rgba(203,213,225,0.4)" }}
              >
                <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
              </div>
              {m.proposals?.map((p, pi) => {
                const key = `${m.id}_${pi}`;
                const st = proposalStates[key] ?? { status: "idle" as const };
                return <ProposalCard key={key} p={p} state={st} onEdit={(v) => setProposalStates((s) => ({ ...s, [key]: { ...st, draft: v } }))} onConfirm={() => confirm(key, p)} />;
              })}
            </div>
          </div>
        ))}
        {pending && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-sm bg-white/80 px-4 py-2.5 text-sm text-slate-500" style={{ border: "1px solid rgba(203,213,225,0.4)" }}>
              Analizuję dane salonu…
            </div>
          </div>
        )}
      </div>

      {error && <p className="px-4 text-xs" style={{ color: "#BE123C" }}>{error}</p>}

      {messages.length === 0 && (
        <div className="flex flex-wrap gap-2 px-4 pb-1">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => send(s)}
              className="rounded-full border border-slate-200 bg-white/70 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-white hover:text-slate-900"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => { e.preventDefault(); send(input); }}
        className="flex items-center gap-2 border-t p-3"
        style={{ borderColor: "rgba(203,213,225,0.4)" }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Zapytaj asystenta o Twój salon…"
          className="input-glass flex-1 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 outline-none placeholder:text-slate-400"
          disabled={pending}
        />
        <InkButton type="submit" disabled={pending || !input.trim()}>
          {pending ? "…" : "Wyślij"}
        </InkButton>
      </form>

      <GlassModal
        open={limitOpen !== null}
        onOpenChange={(o) => !o && setLimitOpen(null)}
        title={limitOpen === "plan_excluded" ? "Asystent AI w wyższym planie" : "Osiągnięto dzienny limit AI"}
      >
        <div className="space-y-3">
          <p className="text-sm leading-relaxed text-slate-600">
            {limitOpen === "plan_excluded"
              ? "Rozmowa z asystentem i akcje AI są dostępne w planie Professional i Ultimate. Uaktualnij plan, aby korzystać z asystenta."
              : tier === "unlimited"
                ? "To chwilowe zabezpieczenie przed nietypowo dużym ruchem. Spróbuj ponownie za jakiś czas — Twój plan Ultimate nie ma stałego limitu."
                : "Wykorzystałeś dzienny limit zapytań do asystenta w planie Professional. Limit odnawia się w ciągu 24 godzin. W planie Ultimate korzystasz z AI bez limitu."}
          </p>
          <div className="flex items-center gap-2 pt-1">
            {(limitOpen === "plan_excluded" || tier !== "unlimited") && (
              <ModalInkButton onClick={() => { window.location.href = "/business/payments"; }}>
                {limitOpen === "plan_excluded" ? "Zobacz plany" : "Przejdź na Ultimate"}
              </ModalInkButton>
            )}
            <ModalGlassButton onClick={() => setLimitOpen(null)}>Zamknij</ModalGlassButton>
          </div>
        </div>
      </GlassModal>
    </div>
  );
}

function ProposalCard({
  p,
  state,
  onEdit,
  onConfirm,
}: {
  p: ActionProposal;
  state: ProposalState;
  onEdit: (v: string) => void;
  onConfirm: () => void;
}) {
  const done = state.status === "done";
  const editable = p.actionType === "send_campaign" || p.actionType === "publish_review_reply";
  return (
    <div
      className="mt-2 rounded-xl p-3.5"
      style={{ background: "rgba(255,255,255,0.92)", border: `1px solid ${p.danger ? "rgba(225,29,72,0.35)" : "rgba(203,213,225,0.6)"}` }}
    >
      <div className="flex items-center gap-2">
        <span
          className="rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white"
          style={{ background: p.external ? "#B45309" : p.danger ? "#E11D48" : "#0F172A" }}
        >
          {p.external ? "Wyśle na zewnątrz" : "Do zatwierdzenia"}
        </span>
        <span className="text-sm font-semibold text-slate-900">{p.title}</span>
      </div>
      <p className="mt-1 text-xs text-slate-600">{p.summary}</p>

      <dl className="mt-2 space-y-1">
        {p.details.map((d, i) => (
          <div key={i} className="flex gap-2 text-xs">
            <dt className="min-w-24 shrink-0 font-medium text-slate-500">{d.label}</dt>
            <dd className="text-slate-800">{d.value}</dd>
          </div>
        ))}
      </dl>

      {editable && p.draft != null && (
        <textarea
          value={state.draft ?? p.draft}
          onChange={(e) => onEdit(e.target.value)}
          disabled={done || state.status === "pending"}
          rows={4}
          className="input-glass mt-2 w-full rounded-lg px-3 py-2 text-xs text-slate-800 outline-none"
        />
      )}

      {p.costHint && <p className="mt-2 text-[11px] text-slate-500">Szacowany zasięg: {p.costHint}</p>}

      {done ? (
        <p className="mt-3 text-xs font-semibold" style={{ color: "#0F766E" }}>✓ {state.message}</p>
      ) : (
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={onConfirm}
            disabled={state.status === "pending"}
            className="rounded-lg px-3.5 py-2 text-xs font-semibold text-white disabled:opacity-60"
            style={{ background: p.danger ? "linear-gradient(180deg,#E11D48,#BE123C)" : INK_GRADIENT }}
          >
            {state.status === "pending" ? "Wykonuję…" : p.confirmLabel}
          </button>
          {state.status === "error" && <span className="text-xs" style={{ color: "#BE123C" }}>{state.message}</span>}
        </div>
      )}
    </div>
  );
}
