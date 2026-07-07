"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Wordmark } from "@/components/brand/wordmark";
import { createClient } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";

type AuthState =
  | { status: "loading" }
  | { status: "guest" }
  | { status: "authed"; dashboardHref: string };

export function LandingNav() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [auth, setAuth] = useState<AuthState>({ status: "loading" });

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 20);
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
    { href: "/for-business", label: "Dla specjalistów" },
  ];

  return (
    <header className="fixed top-0 inset-x-0 z-50 px-4 pt-3">
      <div className="max-w-6xl mx-auto">
        {/* ── Floating glass pill ───────────────────────────────── */}
        <div
          className={cn(
            "flex items-center justify-between px-5 py-2.5 rounded-2xl",
            "transition-all duration-300 ease-out",
            "backdrop-blur-xl",
            isScrolled
              ? [
                  "bg-white/90",
                  "border border-gray-200/70",
                  "shadow-[0_4px_24px_rgba(17,24,39,0.09),inset_0_1px_0_rgba(255,255,255,0.75)]",
                ].join(" ")
              : [
                  "bg-white/65",
                  "border border-white/55",
                  "shadow-[0_2px_16px_rgba(17,24,39,0.05),inset_0_1px_0_rgba(255,255,255,0.85)]",
                ].join(" ")
          )}
        >
          {/* Logo */}
          <Link href="/" className="flex items-center flex-shrink-0">
            <Wordmark className="text-[1.05rem]" />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-0.5">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-3.5 py-2 text-sm text-gray-500 hover:text-gray-900 hover:bg-black/[0.04] rounded-xl transition-all duration-150"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Actions */}
          <div className="hidden md:flex items-center gap-1.5">
            {auth.status === "authed" ? (
              <Link
                href={auth.dashboardHref}
                className="text-sm font-semibold px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-xl transition-colors shadow-sm"
              >
                Mój panel
              </Link>
            ) : auth.status === "guest" ? (
              <>
                <Link
                  href="/login"
                  className="text-sm font-medium text-gray-600 hover:text-gray-900 px-3.5 py-2 rounded-xl hover:bg-black/[0.04] transition-all duration-150"
                >
                  Zaloguj się
                </Link>
                <Link
                  href="/register"
                  className="text-sm font-semibold px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-xl transition-all duration-150 shadow-sm"
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
            className="md:hidden p-2 rounded-xl hover:bg-black/[0.05] transition-colors"
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            aria-label="Menu"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-gray-700"
            >
              {isMobileOpen ? (
                <path d="M18 6L6 18M6 6l12 12" />
              ) : (
                <path d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* ── Mobile menu — glass panel ─────────────────────────── */}
        <AnimatePresence>
          {isMobileOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className="mt-2 rounded-2xl overflow-hidden backdrop-blur-xl bg-white/92 border border-gray-200/60 shadow-[0_8px_40px_rgba(17,24,39,0.12),inset_0_1px_0_rgba(255,255,255,0.8)]"
            >
              <div className="px-4 py-3 space-y-0.5">
                {links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsMobileOpen(false)}
                    className="block px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-900/5 rounded-xl transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
              <div className="px-4 pb-4 pt-1 border-t border-gray-100 space-y-2">
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
                      className="block w-full text-center px-4 py-2.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                    >
                      Zaloguj się
                    </Link>
                    <Link
                      href="/register"
                      onClick={() => setIsMobileOpen(false)}
                      className="block w-full text-center px-4 py-2.5 text-sm font-semibold bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors"
                    >
                      Zarejestruj się
                    </Link>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
