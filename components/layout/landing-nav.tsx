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
        if (!user) { setAuth({ status: "guest" }); return; }
        const role = user.user_metadata?.role as string | undefined;
        setAuth({
          status: "authed",
          dashboardHref: role === "BUSINESS_OWNER" ? "/business/dashboard" : "/customer/dashboard",
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
        {/* ── Floating dark glass pill ── */}
        <div
          className="flex items-center justify-between px-5 py-2.5 rounded-2xl transition-all duration-300"
          style={{
            backdropFilter: "blur(28px) saturate(180%)",
            WebkitBackdropFilter: "blur(28px) saturate(180%)",
            background: isScrolled
              ? "rgba(11,13,18,0.88)"
              : "rgba(11,13,18,0.65)",
            border: isScrolled
              ? "1px solid rgba(255,255,255,0.13)"
              : "1px solid rgba(255,255,255,0.09)",
            boxShadow: isScrolled
              ? "0 8px 40px rgba(0,0,0,0.50), inset 0 1px 0 rgba(255,255,255,0.10)"
              : "0 4px 20px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.08)",
          }}
        >
          <Link href="/" className="flex items-center flex-shrink-0">
            <Wordmark className="text-[1.05rem]" variant="dark" />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-0.5">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-3.5 py-2 text-sm rounded-xl transition-all duration-150"
                style={{ color: "rgba(255,255,255,0.55)" }}
                onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.92)")}
                onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.55)")}
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
                className="text-sm font-semibold px-4 py-2 rounded-xl transition-all text-white"
                style={{
                  background: "rgba(212,160,23,0.18)",
                  border: "1px solid rgba(212,160,23,0.30)",
                  boxShadow: "inset 0 1px 0 rgba(212,160,23,0.20)",
                }}
              >
                Mój panel
              </Link>
            ) : auth.status === "guest" ? (
              <>
                <Link
                  href="/login"
                  className="text-sm px-3.5 py-2 rounded-xl transition-all duration-150"
                  style={{ color: "rgba(255,255,255,0.55)" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.90)")}
                  onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.55)")}
                >
                  Zaloguj się
                </Link>
                <Link
                  href="/register"
                  className="text-sm font-semibold px-4 py-2 rounded-xl transition-all text-white"
                  style={{
                    background: "rgba(255,255,255,0.12)",
                    border: "1px solid rgba(255,255,255,0.18)",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12)",
                  }}
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
            className="md:hidden p-2 rounded-xl transition-colors"
            style={{ color: "rgba(255,255,255,0.70)" }}
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            aria-label="Menu"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {isMobileOpen ? <path d="M18 6L6 18M6 6l12 12" /> : <path d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>
        </div>

        {/* ── Mobile menu — dark glass ── */}
        <AnimatePresence>
          {isMobileOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className="mt-2 rounded-2xl overflow-hidden"
              style={{
                background: "rgba(11,13,18,0.92)",
                backdropFilter: "blur(28px) saturate(180%)",
                WebkitBackdropFilter: "blur(28px) saturate(180%)",
                border: "1px solid rgba(255,255,255,0.12)",
                boxShadow: "0 16px 48px rgba(0,0,0,0.60), inset 0 1px 0 rgba(255,255,255,0.10)",
              }}
            >
              <div className="px-4 py-3 space-y-0.5">
                {links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsMobileOpen(false)}
                    className="block px-3 py-2.5 text-sm rounded-xl transition-colors"
                    style={{ color: "rgba(255,255,255,0.65)" }}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
              <div
                className="px-4 pb-4 pt-2 space-y-2"
                style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}
              >
                {auth.status === "authed" ? (
                  <Link
                    href={auth.dashboardHref}
                    onClick={() => setIsMobileOpen(false)}
                    className="block w-full text-center px-4 py-2.5 text-sm font-semibold rounded-xl text-white"
                    style={{
                      background: "rgba(212,160,23,0.20)",
                      border: "1px solid rgba(212,160,23,0.30)",
                    }}
                  >
                    Mój panel
                  </Link>
                ) : (
                  <>
                    <Link
                      href="/login"
                      onClick={() => setIsMobileOpen(false)}
                      className="block w-full text-center px-4 py-2.5 text-sm rounded-xl transition-colors"
                      style={{
                        color: "rgba(255,255,255,0.70)",
                        background: "rgba(255,255,255,0.06)",
                        border: "1px solid rgba(255,255,255,0.10)",
                      }}
                    >
                      Zaloguj się
                    </Link>
                    <Link
                      href="/register"
                      onClick={() => setIsMobileOpen(false)}
                      className="block w-full text-center px-4 py-2.5 text-sm font-semibold rounded-xl text-white transition-colors"
                      style={{
                        background: "rgba(255,255,255,0.12)",
                        border: "1px solid rgba(255,255,255,0.18)",
                      }}
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
