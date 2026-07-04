"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const STORAGE_KEY = "tc-notif-prompt-dismissed";

/**
 * Jednorazowy pop-up dla salonu: zaproszenie do skonfigurowania
 * powiadomień SMS/WhatsApp. Pokazuje się tylko, gdy salon jeszcze
 * nie zapisał żadnych ustawień powiadomień.
 */
export function NotificationsPrompt({ configured }: { configured: boolean }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (configured) return;
    if (window.localStorage.getItem(STORAGE_KEY)) return;
    const t = setTimeout(() => setVisible(true), 1200);
    return () => clearTimeout(t);
  }, [configured]);

  const dismiss = () => {
    window.localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4" role="dialog" aria-modal="true">
      <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl p-6 shadow-xl">
        <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
          <svg className="w-6 h-6 text-gray-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-gray-900 mb-1.5">
          Chcesz wiedzieć o rezerwacjach od razu?
        </h2>
        <p className="text-sm text-gray-500 leading-relaxed mb-5">
          Skonfiguruj powiadomienia SMS lub WhatsApp — dostaniesz wiadomość
          w sekundę po każdej nowej rezerwacji, przełożeniu i anulowaniu.
          E-maile masz włączone domyślnie.
        </p>
        <div className="flex gap-2">
          <Link
            href="/business/settings"
            onClick={dismiss}
            className="flex-1 py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-sm font-semibold transition-colors text-center"
          >
            Skonfiguruj teraz
          </Link>
          <button
            type="button"
            onClick={dismiss}
            className="px-5 py-3 border border-gray-200 hover:bg-gray-50 text-gray-600 rounded-xl text-sm font-medium transition-colors"
          >
            Później
          </button>
        </div>
      </div>
    </div>
  );
}
