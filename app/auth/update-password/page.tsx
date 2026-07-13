"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { PasswordInput } from "@/components/ui/password-input";
import { Wordmark } from "@/components/brand/wordmark";

const inputCls =
  "w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 bg-white placeholder:text-gray-400 focus:outline-none focus:border-gray-400 transition-colors";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [isPending, startTransition] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Hasło musi mieć min. 8 znaków.");
      return;
    }
    if (password !== confirm) {
      setError("Hasła nie są identyczne.");
      return;
    }
    startTransition(async () => {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(
          updateError.message.includes("different from the old")
            ? "Nowe hasło musi różnić się od poprzedniego."
            : "Nie udało się zmienić hasła. Link mógł wygasnąć — poproś o nowy."
        );
        return;
      }
      setDone(true);
      setTimeout(() => router.push("/customer/dashboard"), 1500);
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="h-14 flex items-center px-6 border-b border-gray-100 bg-white">
        <Link href="/" className="flex items-center">
          <Wordmark className="text-lg" />
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
          {done ? (
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
              </div>
              <h1 className="text-lg font-semibold text-gray-900 mb-1">Hasło zmienione</h1>
              <p className="text-sm text-gray-500">Przekierowujemy Cię do panelu...</p>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-semibold text-gray-900 tracking-tight mb-1">
                Ustaw nowe hasło
              </h1>
              <p className="text-sm text-gray-500 mb-6">
                Wpisz nowe hasło do swojego konta.
              </p>

              <form onSubmit={submit} className="space-y-4">
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Nowe hasło
                  </label>
                  <PasswordInput
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                    placeholder="min. 8 znaków"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label htmlFor="confirm" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Powtórz hasło
                  </label>
                  <PasswordInput
                    id="confirm"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    autoComplete="new-password"
                    required
                    placeholder="••••••••"
                    className={inputCls}
                  />
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isPending}
                  className="btn-spring w-full py-2.5 px-4 disabled:opacity-50 font-semibold text-sm rounded-xl"
                  style={{
                    background: "linear-gradient(180deg, #1E293B 0%, #0F172A 100%)",
                    border: "1px solid #0F172A",
                    color: "#F8FAFC",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.20), 0 8px 20px rgba(15,23,42,0.24), inset 0 1px 0 rgba(255,255,255,0.15)",
                  }}
                >
                  {isPending ? "Zapisywanie..." : "Zmień hasło"}
                </button>
              </form>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
