"use client";

import { useActionState } from "react";
import { submitContactAction, type ContactState } from "@/lib/actions/contact";

const initialState: ContactState = {};

const inputCls =
  "w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-400 transition-colors";

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
      <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm text-center">
        <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Wiadomość wysłana</h2>
        <p className="text-sm text-gray-500">{state.success}</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">Napisz do nas</h2>
      <form action={formAction} className="space-y-4">
        {/* Honeypot — ukryte dla ludzi, boty je wypełniają */}
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
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Imię</label>
            <input type="text" name="firstName" required placeholder="Jan" className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Nazwisko</label>
            <input type="text" name="lastName" required placeholder="Kowalski" className={inputCls} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">E-mail</label>
          <input type="email" name="email" required placeholder="twoj@email.pl" className={inputCls} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Temat</label>
          <select
            name="topic"
            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:border-gray-400 transition-colors"
          >
            {TOPICS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Wiadomość</label>
          <textarea
            name="message"
            required
            minLength={10}
            rows={4}
            placeholder="Opisz swoje pytanie lub projekt..."
            className={`${inputCls} resize-none`}
          />
        </div>

        {state.error && (
          <div className="px-4 py-3 bg-red-50 border border-red-100 rounded-xl">
            <p className="text-sm text-red-600">{state.error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="w-full py-2.5 bg-gray-900 hover:bg-gray-800 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          {isPending ? "Wysyłanie..." : "Wyślij wiadomość"}
        </button>
      </form>
    </div>
  );
}
