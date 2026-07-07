"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/actions/auth";

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
    <header
      className="h-14 flex items-center gap-4 px-5 shrink-0 sticky top-0 z-30"
      style={{
        background: "rgba(255,255,255,0.65)",
        backdropFilter: "blur(28px) saturate(180%)",
        WebkitBackdropFilter: "blur(28px) saturate(180%)",
        borderBottom: "1px solid rgba(255,255,255,0.50)",
        boxShadow: "0 1px 0 rgba(255,255,255,0.35), 0 4px 24px rgba(17,24,39,0.06)",
      }}
    >
      <div className="flex-1 min-w-0">
        <h1 className="text-[15px] font-semibold text-gray-900 truncate tracking-[-0.01em]">{title}</h1>
      </div>

      <div className="flex items-center gap-1.5">
        {/* New appointment */}
        <Link
          href="/business/calendar?action=new"
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-gray-900 hover:bg-gray-800 text-white rounded-lg transition-colors shadow-sm"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Nowa wizyta
        </Link>

        {/* Divider */}
        <div className="hidden sm:block h-5 w-px bg-gray-100 mx-1" />

        {/* Notifications */}
        <button
          className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
          title="Powiadomienia"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full ring-1 ring-white" />
        </button>

        {/* Help */}
        <button
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
          title="Pomoc"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <line x1="12" x2="12.01" y1="17" y2="17" />
          </svg>
        </button>

        {/* User + Logout */}
        <form action={logoutAction}>
          <button
            type="submit"
            title="Wyloguj"
            className="flex items-center gap-2 pl-2 pr-2.5 py-1.5 rounded-lg hover:bg-gray-100 transition-colors group"
          >
            <div className="w-6 h-6 rounded-md bg-gray-900 flex items-center justify-center text-[9px] font-bold text-white">
              AB
            </div>
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-gray-300 group-hover:text-gray-500 transition-colors"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" x2="9" y1="12" y2="12" />
            </svg>
          </button>
        </form>
      </div>
    </header>
  );
}
