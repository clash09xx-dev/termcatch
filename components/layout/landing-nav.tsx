"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Wordmark } from "@/components/brand/wordmark";
import { createClient } from "@/lib/supabase/client";

type AuthState =
  | { status: "loading" }
  | { status: "guest" }
  | { status: "authed"; dashboardHref: string };

export function LandingNav() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [auth, setAuth] = useState<AuthState>({ status: "loading" });

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 16);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth
      .getUser()
      .then(({ data: { user } }) => {
        if (!user) {
          setAuth({ status: "guest" });
          return;
        }
        const role = user.user_metadata?.role as string | undefined;
        setAuth({
          status: "authed",
          dashboardHref:
            role === "BUSINESS_OWNER" ? "/business/dashboard" : "/customer/dashboard",
        });
      })
      .catch(() => setAuth({ status: "guest" }));
  }, []);

  const links = [
    { href: "/search", label: "Szukaj" },
    { href: "/pricing", label: "Cennik" },
    { href: "/for-business", label: "Dla salonów" },
  ];

  return (
    <header
      className={cn(
        "fixed top-0 inset-x-0 z-50 transition-all duration-300",
        isScrolled
          ? "py-2 bg-white/90 backdrop-blur-lg shadow-sm border-b border-gray-100"
          : "py-4 bg-transparent"
      )}
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center">
          <Wordmark className="text-xl" />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-7">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Actions */}
        <div className="hidden md:flex items-center gap-3">
          {auth.status === "authed" ? (
            <Link
              href={auth.dashboardHref}
              className="text-sm font-semibold px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-xl transition-colors"
            >
              Mój panel
            </Link>
          ) : auth.status === "guest" ? (
            <>
              <Link
                href="/login"
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors px-3 py-1.5"
              >
                Zaloguj się
              </Link>
              <Link
                href="/register"
                className="text-sm font-semibold px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-xl transition-colors"
              >
                Zarejestruj się
              </Link>
            </>
          ) : (
            <div className="w-40 h-9" aria-hidden="true" />
          )}
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          aria-label="Menu"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-700">
            {isMobileOpen ? (
              <path d="M18 6L6 18M6 6l12 12" />
            ) : (
              <path d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {isMobileOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white">
          <div className="max-w-7xl mx-auto px-6 py-4 space-y-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMobileOpen(false)}
                className="block px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-3 border-t border-gray-100 space-y-2">
              {auth.status === "authed" ? (
                <Link
                  href={auth.dashboardHref}
                  onClick={() => setIsMobileOpen(false)}
                  className="block w-full text-center px-4 py-2.5 text-sm font-semibold bg-gray-900 text-white rounded-xl"
                >
                  Mój panel
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setIsMobileOpen(false)}
                    className="block w-full text-center px-4 py-2.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-xl"
                  >
                    Zaloguj się
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setIsMobileOpen(false)}
                    className="block w-full text-center px-4 py-2.5 text-sm font-semibold bg-gray-900 text-white rounded-xl"
                  >
                    Zarejestruj się
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
