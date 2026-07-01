export const dynamic = "force-dynamic";

"use client";

import { useState } from "react";

export default function CouponsPage() {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Kupony</h2>
          <p className="text-sm text-gray-500 mt-1">Kody rabatowe dla klientów</p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="px-4 py-2 text-sm font-semibold bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors"
        >
          Nowy kupon
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex flex-col items-center justify-center py-20 text-center px-6">
          <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
              <line x1="7" x2="7.01" y1="7" y2="7" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-700 mb-1">Brak kuponów</p>
          <p className="text-xs text-gray-400 max-w-xs mb-6">
            Twórz kody rabatowe dla klientów — procentowe lub kwotowe.
          </p>
          <button
            onClick={() => setOpen(true)}
            className="px-4 py-2 text-sm font-semibold bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors"
          >
            Utwórz pierwszy kupon
          </button>
        </div>
      </div>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Nowy kupon</h3>
              <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-gray-100 transition-colors text-gray-400">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Kod</label>
                <input
                  type="text"
                  placeholder="np. WELCOME20"
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-400 transition-colors uppercase"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Typ rabatu</label>
                <select className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-gray-400 transition-colors">
                  <option>Procentowy (%)</option>
                  <option>Kwotowy (zł)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Wartość</label>
                <input
                  type="number"
                  placeholder="20"
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-400 transition-colors"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setOpen(false)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Anuluj
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="flex-1 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-sm font-semibold transition-colors"
                >
                  Zapisz kupon
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
