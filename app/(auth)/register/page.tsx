"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { registerAction, signInWithGoogleAction, signInWithAppleAction } from "@/actions/auth";
import type { AuthState } from "@/actions/auth";
import { cn } from "@/lib/utils";
import { PasswordInput } from "@/components/ui/password-input";

const initialState: AuthState = {};

// Włącz po skonfigurowaniu Apple Developer Account (Supabase → Providers → Apple)
const APPLE_SIGNIN_ENABLED = false;

const inputCls =
  "w-full px-3.5 py-2.5 rounded-xl text-sm text-[#0F172A] placeholder:text-[#94A3B8] outline-none transition-all input-glass";

export default function RegisterPage() {
  const [state, formAction, isPending] = useActionState(registerAction, initialState);
  const [role, setRole] = useState<"CUSTOMER" | "BUSINESS_OWNER">("CUSTOMER");

  // Preselect the business-owner role when arriving via ?role=business (all the
  // "Załóż konto salonu" CTAs), so the correct onboarding flow follows.
  useEffect(() => {
    const r = new URLSearchParams(window.location.search).get("role");
    if (r === "business" || r === "BUSINESS_OWNER") setRole("BUSINESS_OWNER");
  }, []);

  return (
    <div>
      <div className="mb-7">
        <h1 className="text-xl font-semibold text-gray-900 tracking-tight">Utwórz konto</h1>
        <p className="mt-1 text-sm text-gray-500">
          Masz już konto?{" "}
          <Link href="/login" className="text-gray-900 font-medium underline underline-offset-2 hover:no-underline transition-all">
            Zaloguj się
          </Link>
        </p>
      </div>

      {/* Role toggle */}
      <div
        className="flex gap-1.5 mb-6 p-1 rounded-xl"
        style={{ background: "rgba(226,232,240,0.50)", border: "1px solid rgba(203,213,225,0.40)" }}
      >
        {(["CUSTOMER", "BUSINESS_OWNER"] as const).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRole(r)}
            className="flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all"
            style={
              role === r
                ? {
                    background: "rgba(255,255,255,0.90)",
                    color: "#0F172A",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,1)",
                  }
                : { color: "#64748B" }
            }
          >
            {r === "CUSTOMER" ? "Klient" : "Właściciel salonu"}
          </button>
        ))}
      </div>

      {/* OAuth buttons */}
      <div className="space-y-2.5">
        <form action={signInWithGoogleAction}>
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors btn-spring"
            style={{
              background: "rgba(255,255,255,0.80)",
              border: "1px solid rgba(203,213,225,0.55)",
              color: "#475569",
              boxShadow: "0 1px 2px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.90)",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            Kontynuuj z Google
          </button>
        </form>

        {/* Apple Sign In — ukryty do czasu konfiguracji Apple Developer Account.
            Aby przywrócić: zmień APPLE_SIGNIN_ENABLED na true. */}
        {APPLE_SIGNIN_ENABLED && (
          <form action={signInWithAppleAction}>
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 814 1000" fill="currentColor">
                <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105.3-57.8-155.5-127.4C46 790.7 0 663 0 541.8c0-207.5 135.4-317.3 269-317.3 71 0 130.5 46.4 175 46.4 42.8 0 109.1-49 191.8-49 30.8 0 110.6 2.6 163.9 100.9zm-234.5-181.5c32.4-38.4 56.5-91.4 56.5-144.4 0-7.4-.6-15.5-2-22.3-53.4 2-116.8 35.2-154.5 78.6-29.4 33.6-58.5 86.6-58.5 140.4 0 8.3 1.3 16.6 1.9 19.2 3.2.6 8.4 1.3 13.6 1.3 48 0 108.8-32.1 143-72.8z"/>
              </svg>
              Kontynuuj z Apple
            </button>
          </form>
        )}
      </div>

      <p className="mt-2.5 text-[11px] text-gray-400 leading-relaxed">
        Kontynuując przez {APPLE_SIGNIN_ENABLED ? "Google lub Apple" : "Google"}, akceptujesz{" "}
        <Link href="/terms" target="_blank" className="underline underline-offset-2 hover:text-gray-600">Regulamin</Link>{" "}
        i{" "}
        <Link href="/privacy" target="_blank" className="underline underline-offset-2 hover:text-gray-600">Politykę prywatności</Link>.
      </p>

      <div className="flex items-center gap-3 my-5">
        <div className="flex-1 h-px" style={{ background: "rgba(203,213,225,0.45)" }} />
        <span className="text-xs" style={{ color: "#94A3B8" }}>lub</span>
        <div className="flex-1 h-px" style={{ background: "rgba(203,213,225,0.45)" }} />
      </div>

      {state.error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
          {state.error}
        </div>
      )}
      {state.success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-600">
          {state.success}
        </div>
      )}

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="role" value={role} />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1.5">Imię</label>
            <input
              id="firstName" name="firstName" type="text"
              autoComplete="given-name" required placeholder="Jan"
              className={inputCls}
            />
            {state.fieldErrors?.firstName && (
              <p className="mt-1 text-xs text-red-500">{state.fieldErrors.firstName[0]}</p>
            )}
          </div>
          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1.5">Nazwisko</label>
            <input
              id="lastName" name="lastName" type="text"
              autoComplete="family-name" required placeholder="Kowalski"
              className={inputCls}
            />
          </div>
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">Adres e-mail</label>
          <input
            id="email" name="email" type="email"
            autoComplete="email" required placeholder="twoj@email.pl"
            className={inputCls}
          />
          {state.fieldErrors?.email && (
            <p className="mt-1 text-xs text-red-500">{state.fieldErrors.email[0]}</p>
          )}
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">Hasło</label>
          <PasswordInput
            id="password" name="password"
            autoComplete="new-password" required placeholder="min. 8 znaków"
            className={inputCls}
          />
          {state.fieldErrors?.password && (
            <p className="mt-1 text-xs text-red-500">{state.fieldErrors.password[0]}</p>
          )}
        </div>

        <label className="flex items-start gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            name="acceptTerms"
            required
            className="mt-0.5 w-4 h-4 accent-gray-900 flex-shrink-0"
          />
          <span className="text-xs text-gray-500 leading-relaxed">
            Akceptuję{" "}
            <Link href="/terms" target="_blank" className="text-gray-900 underline underline-offset-2 hover:no-underline">
              Regulamin
            </Link>{" "}
            oraz{" "}
            <Link href="/privacy" target="_blank" className="text-gray-900 underline underline-offset-2 hover:no-underline">
              Politykę prywatności
            </Link>{" "}
            TermCatch.
          </span>
        </label>
        {state.fieldErrors?.acceptTerms && (
          <p className="text-xs text-red-500">{state.fieldErrors.acceptTerms[0]}</p>
        )}

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
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Tworzenie konta...
            </>
          ) : role === "BUSINESS_OWNER" ? "Zarejestruj salon" : "Utwórz konto"}
        </button>
      </form>
    </div>
  );
}
