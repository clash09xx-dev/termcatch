"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { requestDangerCode, confirmBusinessDeletion } from "@/lib/actions/danger";

type Step = "confirm" | "code" | "done";

export function DangerDeleteModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("confirm");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [isPending, startTransition] = useTransition();

  if (!open) return null;

  const close = () => {
    if (isPending) return;
    setStep("confirm");
    setCode("");
    setError("");
    setInfo("");
    onClose();
  };

  const sendCode = () => {
    setError("");
    startTransition(async () => {
      const res = await requestDangerCode();
      if (res.error) {
        setError(res.error);
        return;
      }
      setStep("code");
    });
  };

  const confirm = () => {
    setError("");
    startTransition(async () => {
      const res = await confirmBusinessDeletion(code);
      if (res.error && !res.deleted) {
        setError(res.error);
        return;
      }
      setInfo(res.error ?? "");
      setStep("done");
      setTimeout(() => router.push("/"), 2500);
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={close} />
      <div className="relative bg-white rounded-2xl shadow-soft-xl w-full max-w-md animate-scale-in p-6">
        {step === "confirm" && (
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-gray-900">Usuń konto biznesowe</h3>
            </div>
            <p className="text-sm text-gray-600 mb-2">
              Ta operacja <strong>trwale usuwa</strong> Twój salon: usługi, pracowników,
              rezerwacje, opinie i wszystkie dane. Nie da się jej cofnąć.
            </p>
            <p className="text-sm text-gray-600 mb-6">
              Dla bezpieczeństwa wyślemy 6-cyfrowy kod potwierdzający na Twój adres e-mail.
            </p>
            {error && (
              <div className="mb-4 px-4 py-3 bg-red-50 border border-red-100 rounded-xl">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={close}
                disabled={isPending}
                className="flex-1 border border-gray-200 text-gray-900 hover:bg-gray-50 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50"
              >
                Anuluj
              </button>
              <button
                onClick={sendCode}
                disabled={isPending}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors"
              >
                {isPending ? "Wysyłanie kodu..." : "Wyślij kod na e-mail"}
              </button>
            </div>
          </>
        )}

        {step === "code" && (
          <>
            <h3 className="text-base font-semibold text-gray-900 mb-1.5">
              Wpisz kod z e-maila
            </h3>
            <p className="text-sm text-gray-600 mb-5">
              Wysłaliśmy 6-cyfrowy kod na Twój adres e-mail. Wpisz go poniżej,
              aby potwierdzić usunięcie salonu.
            </p>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              className="w-full text-center text-2xl font-bold tracking-[0.5em] px-4 py-3.5 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-300 focus:outline-none focus:border-gray-400 transition-colors mb-4"
            />
            {error && (
              <div className="mb-4 px-4 py-3 bg-red-50 border border-red-100 rounded-xl">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={close}
                disabled={isPending}
                className="flex-1 border border-gray-200 text-gray-900 hover:bg-gray-50 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50"
              >
                Anuluj
              </button>
              <button
                onClick={confirm}
                disabled={isPending || code.length !== 6}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors"
              >
                {isPending ? "Usuwanie..." : "Potwierdź i usuń"}
              </button>
            </div>
            <button
              onClick={sendCode}
              disabled={isPending}
              className="mt-3 w-full text-xs text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
            >
              Kod nie dotarł? Wyślij ponownie
            </button>
          </>
        )}

        {step === "done" && (
          <div className="text-center py-4">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-gray-900 mb-1">
              Konto biznesowe usunięte
            </h3>
            <p className="text-sm text-gray-500">
              {info || "Wszystkie dane salonu zostały usunięte."} Przekierowujemy Cię na stronę główną...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
