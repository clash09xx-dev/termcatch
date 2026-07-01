"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { registerAction, signInWithGoogleAction } from "@/actions/auth";
import type { AuthState } from "@/actions/auth";
import { cn } from "@/lib/utils";

const initialState: AuthState = {};

export default function RegisterPage() {
  const [state, formAction, isPending] = useActionState(registerAction, initialState);
  const [role, setRole] = useState<"CUSTOMER" | "BUSINESS_OWNER">("CUSTOMER");

  return (
    <div className="animate-fade-up">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-surface-900 dark:text-white tracking-tight">
          Utwórz konto
        </h1>
        <p className="mt-1.5 text-sm text-surface-500 dark:text-surface-400">
          Masz już konto?{" "}
          <Link
            href="/login"
            className="text-brand-600 hover:text-brand-700 font-medium transition-colors"
          >
            Zaloguj się
          </Link>
        </p>
      </div>

      {/* Role selector */}
      <div className="grid grid-cols-2 gap-2 mb-6 p-1 bg-surface-100 dark:bg-surface-800 rounded-xl">
        <button
          type="button"
          onClick={() => setRole("CUSTOMER")}
          className={cn(
            "py-2 px-3 rounded-lg text-sm font-medium transition-all",
            role === "CUSTOMER"
              ? "bg-white dark:bg-surface-700 text-surface-900 dark:text-white shadow-soft-sm"
              : "text-surface-500 hover:text-surface-700 dark:hover:text-surface-300"
          )}
        >
          Klient
        </button>
        <button
          type="button"
          onClick={() => setRole("BUSINESS_OWNER")}
          className={cn(
            "py-2 px-3 rounded-lg text-sm font-medium transition-all",
            role === "BUSINESS_OWNER"
              ? "bg-white dark:bg-surface-700 text-surface-900 dark:text-white shadow-soft-sm"
              : "text-surface-500 hover:text-surface-700 dark:hover:text-surface-300"
          )}
        >
          Właściciel salonu
        </button>
      </div>

      {/* Google OAuth */}
      <form action={signInWithGoogleAction}>
        <button
          type="submit"
          className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-surface-200 dark:border-surface-700 rounded-xl text-sm font-medium text-surface-700 dark:text-surface-200 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
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

      {/* Divider */}
      <div className="flex items-center gap-3 my-6">
        <div className="flex-1 h-px bg-surface-200 dark:bg-surface-700" />
        <span className="text-xs text-surface-400">lub</span>
        <div className="flex-1 h-px bg-surface-200 dark:bg-surface-700" />
      </div>

      {state.error && (
        <div className="mb-4 p-3 bg-danger-50 border border-danger-200 rounded-xl text-sm text-danger-600 animate-fade-in">
          {state.error}
        </div>
      )}

      {state.success && (
        <div className="mb-4 p-3 bg-success-50 border border-success-200 rounded-xl text-sm text-success-600 animate-fade-in">
          {state.success}
        </div>
      )}

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="role" value={role} />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-surface-700 dark:text-surface-200 mb-1.5">
              Imię
            </label>
            <input
              id="firstName"
              name="firstName"
              type="text"
              autoComplete="given-name"
              required
              placeholder="Jan"
              className="w-full px-3.5 py-2.5 border border-surface-200 dark:border-surface-700 rounded-xl text-sm text-surface-900 dark:text-white bg-white dark:bg-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-shadow"
            />
            {state.fieldErrors?.firstName && (
              <p className="mt-1 text-xs text-danger-500">{state.fieldErrors.firstName[0]}</p>
            )}
          </div>
          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-surface-700 dark:text-surface-200 mb-1.5">
              Nazwisko
            </label>
            <input
              id="lastName"
              name="lastName"
              type="text"
              autoComplete="family-name"
              required
              placeholder="Kowalski"
              className="w-full px-3.5 py-2.5 border border-surface-200 dark:border-surface-700 rounded-xl text-sm text-surface-900 dark:text-white bg-white dark:bg-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-shadow"
            />
          </div>
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-surface-700 dark:text-surface-200 mb-1.5">
            Adres e-mail
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="twoj@email.pl"
            className="w-full px-3.5 py-2.5 border border-surface-200 dark:border-surface-700 rounded-xl text-sm text-surface-900 dark:text-white bg-white dark:bg-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-shadow"
          />
          {state.fieldErrors?.email && (
            <p className="mt-1 text-xs text-danger-500">{state.fieldErrors.email[0]}</p>
          )}
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-surface-700 dark:text-surface-200 mb-1.5">
            Hasło
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            placeholder="min. 8 znaków"
            className="w-full px-3.5 py-2.5 border border-surface-200 dark:border-surface-700 rounded-xl text-sm text-surface-900 dark:text-white bg-white dark:bg-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-shadow"
          />
          {state.fieldErrors?.password && (
            <p className="mt-1 text-xs text-danger-500">{state.fieldErrors.password[0]}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full py-2.5 px-4 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium text-sm rounded-xl transition-all shadow-brand hover:shadow-brand-lg active:scale-[0.99]"
        >
          {isPending ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Tworzenie konta...
            </span>
          ) : role === "BUSINESS_OWNER" ? (
            "Zarejestruj salon"
          ) : (
            "Utwórz konto"
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-surface-400">
        Rejestrując się, akceptujesz{" "}
        <Link href="/terms" className="underline hover:text-surface-600 transition-colors">
          Regulamin
        </Link>{" "}
        i{" "}
        <Link href="/privacy" className="underline hover:text-surface-600 transition-colors">
          Politykę Prywatności
        </Link>
      </p>
    </div>
  );
}
