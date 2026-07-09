"use client";

import { useActionState } from "react";
import Link from "next/link";
import { resetPasswordAction } from "@/actions/auth";
import type { AuthState } from "@/actions/auth";

const initialState: AuthState = {};

const inputCls = "w-full px-3.5 py-2.5 rounded-xl text-sm text-[#0F172A] placeholder:text-[#94A3B8] outline-none transition-all input-glass";

export default function ResetPasswordPage() {
  const [state, formAction, isPending] = useActionState(resetPasswordAction, initialState);

  return (
    <div>
      <div className="mb-7">
        <h1 className="text-xl font-semibold text-gray-900 tracking-tight">Resetuj hasło</h1>
        <p className="mt-1 text-sm text-gray-500">
          Wyślemy Ci link do zresetowania hasła.
        </p>
      </div>

      {state.error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
          {state.error}
        </div>
      )}
      {state.success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">
          {state.success}
        </div>
      )}

      <form action={formAction} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
            Adres e-mail
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="twoj@email.pl"
            className={inputCls}
          />
          {state.fieldErrors?.email && (
            <p className="mt-1 text-xs text-red-500">{state.fieldErrors.email[0]}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full py-2.5 px-4 font-semibold text-sm rounded-xl flex items-center justify-center gap-2 btn-spring glass-shimmer-wrap disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: "linear-gradient(135deg, #CBD5E1 0%, #94A3B8 50%, #CBD5E1 100%)",
            color: "#0F172A",
            border: "1px solid rgba(148,163,184,0.45)",
            boxShadow: "0 1px 2px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.40)",
          }}
        >
          {isPending ? (
            <>
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Wysyłanie...
            </>
          ) : "Wyślij link resetujący"}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-gray-500">
        <Link href="/login" className="text-gray-900 font-medium underline underline-offset-2 hover:no-underline transition-all">
          Wróć do logowania
        </Link>
      </p>
    </div>
  );
}
