"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const VIEWS = [
  { href: "/customer/dashboard", label: "Klient", prefix: "/customer" },
  { href: "/business/dashboard", label: "Salon", prefix: "/business" },
  { href: "/admin/dashboard", label: "Właściciel", prefix: "/admin" },
];

/**
 * Pływający przełącznik widoków — widoczny wyłącznie dla adminów
 * (ADMIN_EMAILS). Pozwala jednym kliknięciem obejrzeć aplikację
 * oczami klienta, salonu i właściciela platformy.
 */
export function AdminViewSwitcher() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-20 md:bottom-4 right-4 z-[70]">
      <div className="flex items-center gap-1 bg-gray-900 rounded-full p-1 shadow-xl">
        <span className="text-[9px] font-bold text-white/40 uppercase tracking-wider pl-2.5 pr-1 select-none">
          Widok
        </span>
        {VIEWS.map((v) => {
          const isActive = pathname.startsWith(v.prefix);
          return (
            <Link
              key={v.href}
              href={v.href}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-semibold transition-colors",
                isActive
                  ? "bg-white text-gray-900"
                  : "text-white/70 hover:text-white hover:bg-white/10"
              )}
            >
              {v.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
