"use client";

import { useActionState } from "react";
import { submitContactAction, type ContactState } from "@/lib/actions/contact";

const initialState: ContactState = {};

const inputCls =
  "w-full px-3.5 py-2.5 text-sm rounded-xl transition-all outline-none" +
  " placeholder:text-[#94A3B8] text-[#0F172A]";

const inputStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.80)",
  border: "1px solid rgba(203,213,225,0.60)",
  boxShadow: "0 1px 2px rgba(0,0,0,0.04), inset 0 1.5px 3px rgba(0,0,0,0.04)",
};

const TOPICS = [
  "Pytanie ogólne",
  "Wsparcie techniczne",
  "Enterprise / sieć salonów",
  "Partnerstwo",
  "Inne",
];

export default function ContactForm() {
  const [state, formAction, isPending] = useActionState(submitContactAction, initialState);

  if (state.success) {
    return (
      <div
        className="p-8 text-center glass-shimmer-wrap"
        style={{
          background: "rgba(255,255,255,0.72)",
          backdropFilter: "blur(40px) saturate(200%)",
          WebkitBackdropFilter: "blur(40px) saturate(200%)",
          border: "1px solid rgba(203,213,225,0.55)",
          borderRadius: "1.25rem",
          boxShadow:
            "0 0 0 0.5px rgba(203,213,225,0.45), 0 1px 2px rgba(0,0,0,0.04), 0 6px 20px rgba(100,116,139,0.09), inset 0 1px 0 rgba(255,255,255,0.95)",
        }}
      >
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{
            background: "rgba(203,213,225,0.30)",
            border: "1px solid rgba(203,213,225,0.50)",
          }}
        >
          <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold mb-1" style={{ color: "#0F172A", letterSpacing: "-0.02em" }}>
          Wiadomość wysłana
        </h2>
        <p className="text-sm" style={{ color: "#64748B" }}>{state.success}</p>
      </div>
    );
  }

  return (
    <div
      className="p-8 glass-shimmer-wrap"
      style={{
        background: "rgba(255,255,255,0.72)",
        backdropFilter: "blur(40px) saturate(200%)",
        WebkitBackdropFilter: "blur(40px) saturate(200%)",
        border: "1px solid rgba(203,213,225,0.55)",
        borderRadius: "1.25rem",
        boxShadow:
          "0 0 0 0.5px rgba(203,213,225,0.45), 0 1px 2px rgba(0,0,0,0.04), 0 6px 20px rgba(100,116,139,0.09), 0 20px 48px rgba(100,116,139,0.05), inset 0 1px 0 rgba(255,255,255,0.95), inset 0 -1px 0 rgba(203,213,225,0.10)",
      }}
    >
      <h2
        className="text-lg font-semibold mb-6"
        style={{ color: "#0F172A", letterSpacing: "-0.02em" }}
      >
        Napisz do nas
      </h2>
      <form action={formAction} className="space-y-4">
        {/* Honeypot */}
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          className="hidden"
          aria-hidden="true"
        />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label
              className="block text-sm font-medium mb-1.5"
              style={{ color: "#475569" }}
            >
              Imię
            </label>
            <input
              type="text"
              name="firstName"
              required
              placeholder="Jan"
              className={inputCls}
              style={inputStyle}
            />
          </div>
          <div>
            <label
              className="block text-sm font-medium mb-1.5"
              style={{ color: "#475569" }}
            >
              Nazwisko
            </label>
            <input
              type="text"
              name="lastName"
              required
              placeholder="Kowalski"
              className={inputCls}
              style={inputStyle}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: "#475569" }}>
            E-mail
          </label>
          <input
            type="email"
            name="email"
            required
            placeholder="twoj@email.pl"
            className={inputCls}
            style={inputStyle}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: "#475569" }}>
            Temat
          </label>
          <select
            name="topic"
            className={inputCls}
            style={{ ...inputStyle, color: "#475569" }}
          >
            {TOPICS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: "#475569" }}>
            Wiadomość
          </label>
          <textarea
            name="message"
            required
            minLength={10}
            rows={4}
            placeholder="Opisz swoje pytanie lub projekt..."
            className={`${inputCls} resize-none`}
            style={inputStyle}
          />
        </div>

        {state.error && (
          <div
            className="px-4 py-3 rounded-xl text-sm"
            style={{
              background: "rgba(254,226,226,0.70)",
              border: "1px solid rgba(252,165,165,0.50)",
              color: "#DC2626",
            }}
          >
            {state.error}
          </div>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="w-full py-2.5 text-sm font-semibold rounded-xl btn-spring glass-shimmer-wrap"
          style={{
            background: "linear-gradient(135deg, #CBD5E1 0%, #94A3B8 50%, #CBD5E1 100%)",
            color: "#0F172A",
            border: "1px solid rgba(148,163,184,0.45)",
            boxShadow: "0 1px 2px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.40)",
            opacity: isPending ? 0.6 : 1,
            cursor: isPending ? "not-allowed" : "pointer",
          }}
        >
          {isPending ? "Wysyłanie..." : "Wyślij wiadomość"}
        </button>
      </form>
    </div>
  );
}
