"use client";

import { useState } from "react";

type Result = { ok: boolean; text: string } | null;

const ERRORS: Record<string, string> = {
  forbidden: "Brak uprawnień.",
  rate_limited: "Za dużo prób — odczekaj chwilę.",
  unconfigured: "Twilio nie jest skonfigurowane (brak zmiennych środowiskowych).",
  invalid_json: "Nieprawidłowe żądanie.",
  invalid_phone: "Nieprawidłowy numer telefonu.",
  empty_body: "Pusta treść wiadomości.",
};

function describe(status: number, data: { error?: string; code?: number; missing?: string[] }): string {
  if (data.error === "unconfigured" && data.missing?.length) {
    return `Twilio nie jest skonfigurowane — brak: ${data.missing.join(", ")}.`;
  }
  const base = (data.error && ERRORS[data.error]) || `Nie udało się wysłać (HTTP ${status}).`;
  return data.code ? `${base} Kod Twilio: ${data.code}.` : base;
}

export function TestSmsForm() {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/test-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setResult({ ok: true, text: `Wysłano ✓  status: ${data.status ?? "—"} · SID: ${data.messageSid ?? "—"}` });
      } else {
        setResult({ ok: false, text: describe(res.status, data) });
      }
    } catch {
      setResult({ ok: false, text: "Błąd sieci — spróbuj ponownie." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <h3 className="text-sm font-semibold text-gray-900 mb-1">Testowy SMS</h3>
      <p className="text-xs text-gray-500 mb-4">
        Wyśle „Test SMS z TermCatch” przez Twilio (API Key). Sprawdza konfigurację niezależnie od SMS_ENABLED.
      </p>
      <form onSubmit={onSubmit} className="flex flex-col sm:flex-row gap-2">
        <input
          type="tel"
          inputMode="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+48123456789"
          maxLength={20}
          required
          className="flex-1 text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300"
        />
        <button
          type="submit"
          disabled={loading || phone.trim().length === 0}
          className="text-sm font-medium px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Wysyłanie…" : "Wyślij testowy SMS"}
        </button>
      </form>
      {result && (
        <p
          role="status"
          aria-live="polite"
          className={`mt-3 text-xs ${result.ok ? "text-green-700" : "text-red-600"}`}
        >
          {result.text}
        </p>
      )}
    </div>
  );
}
