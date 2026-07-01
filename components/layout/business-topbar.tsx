"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/actions/auth";

// Breadcrumb map
const PAGE_TITLES: Record<string, string> = {
  "/business/dashboard": "Pulpit",
  "/business/calendar": "Kalendarz",
  "/business/staff": "Pracownicy",
  "/business/services": "Usługi",
  "/business/hours": "Godziny pracy",
  "/business/crm": "CRM",
  "/business/payments": "Płatności",
  "/business/invoices": "Faktury",
  "/business/coupons": "Kupony",
  "/business/analytics": "Analityka",
  "/business/ai": "AI Asystent",
  "/business/marketing": "Marketing",
  "/business/reviews": "Opinie",
  "/business/profile": "Profil salonu",
  "/business/settings": "Ustawienia",
};

export function BusinessTopbar() {
  const pathname = usePathname();
  const title = PAGE_TITLES[pathname] ?? "Dashboard";

  return (
    <header className="h-16 border-b border-surface-100 dark:border-surface-800 bg-white dark:bg-surface-900 flex items-center gap-4 px-6 shrink-0">
      {/* Page title */}
      <div className="flex-1 min-w-0">
        <h1 className="text-base font-semibold text-surface-900 dark:text-white truncate">
          {title}
        </h1>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Quick new booking */}
        <Link
          href="/business/calendar?action=new"
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-brand-600 hover:bg-brand-700 text-white rounded-lg transition-colors shadow-brand-sm"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          Nowa wizyta
        </Link>

        {/* Notifications */}
        <button className="relative p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors text-surface-500">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          {/* Unread badge */}
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger-500 rounded-full" />
        </button>

        {/* Help */}
        <button className="p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors text-surface-500">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
            <line x1="12" x2="12.01" y1="17" y2="17"/>
          </svg>
        </button>

        {/* User menu */}
        <form action={logoutAction}>
          <button
            type="submit"
            className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
          >
            <div className="w-6 h-6 rounded-full bg-brand-100 dark:bg-brand-900/40 flex items-center justify-center text-2xs font-semibold text-brand-700 dark:text-brand-300">
              AB
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-surface-400">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" x2="9" y1="12" y2="12"/>
            </svg>
          </button>
        </form>
      </div>
    </header>
  );
}
