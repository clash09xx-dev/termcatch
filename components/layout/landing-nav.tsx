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
  | { status: "authed"; dashboardHref: string; isCustomer: boolean };

// ── Chrome glass pill styles ──────────────────────────────────────────────────

const NAV_GLASS_BASE = {
  backdropFilter: "blur(40px) saturate(200%)",
  WebkitBackdropFilter: "blur(40px) saturate(200%)",
  border: "1px solid rgba(203,213,225,0.45)",
} as React.CSSProperties;

const NAV_SHADOW_REST =
  "0 0 0 0.5px rgba(203,213,225,0.30), 0 1px 2px rgba(0,0,0,0.03), 0 4px 16px rgba(100,116,139,0.07), inset 0 1px 0 rgba(255,255,255,0.90)";
const NAV_SHADOW_SCROLLED =
  "0 0 0 0.5px rgba(203,213,225,0.45), 0 2px 4px rgba(0,0,0,0.05), 0 8px 32px rgba(100,116,139,0.10), 0 20px 48px rgba(100,116,139,0.05), inset 0 1px 0 rgba(255,255,255,0.95)";

export function LandingNav() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [auth, setAuth] = useState<AuthState>({ status: "loading" });

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 24);
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
        const isBusiness = role === "BUSINESS_OWNER";
        setAuth({
          status: "authed",
          dashboardHref: isBusiness ? "/business/dashboard" : "/customer/dashboard",
          isCustomer: !isBusiness,
        });
      })
      .catch(() => setAuth({ status: "guest" }));
  }, []);

  // "Dla specjalistów" (/for-business) is a B2B acquisition link — irrelevant to a
  // logged-in customer, so hide it for them (guests + business owners still see it).
  const links = [
    { href: "/search", label: "Szukaj" },
    ...(auth.status === "authed" && auth.isCustomer
      ? []
      : [{ href: "/for-business", label: "Dla specjalistów" }]),
  ];

  return (
    <header className="fixed top-0 inset-x-0 z-50 px-4 pt-3">
      <div className="max-w-6xl mx-auto">
        {/* ── Floating chrome glass pill ── */}
        <motion.div
          className="flex items-center justify-between px-5 py-2.5 rounded-2xl"
          style={{
            ...NAV_GLASS_BASE,
            background: isScrolled ? "rgba(255,255,255,0.88)" : "rgba(255,255,255,0.70)",
            boxShadow: isScrolled ? NAV_SHADOW_SCROLLED : NAV_SHADOW_REST,
          }}
          animate={{
            background: isScrolled ? "rgba(255,255,255,0.88)" : "rgba(255,255,255,0.70)",
          }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          <Link href="/" className="flex items-center flex-shrink-0">
            <Wordmark className="text-[1.05rem]" variant="light" />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-0.5">
            {links.map((link) => (
              <NavLink key={link.href} href={link.href}>
                {link.label}
              </NavLink>
            ))}
          </nav>

          {/* Actions */}
          <div className="hidden md:flex items-center gap-1.5">
            {auth.status === "authed" ? (
              <ChromeBtn href={auth.dashboardHref}>Mój panel</ChromeBtn>
            ) : auth.status === "guest" ? (
              <>
                <NavLink href="/login">Zaloguj się</NavLink>
                <ChromeBtn href="/register">Zarejestruj się</ChromeBtn>
              </>
            ) : (
              <div className="w-40 h-9" aria-hidden="true" />
            )}
          </div>

          {/* Mobile toggle */}
          <button
            className="md:hidden p-2 rounded-xl nav-link"
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            aria-label="Menu"
            aria-expanded={isMobileOpen}
          >
            <motion.svg
              width="17" height="17" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2"
              animate={{ rotate: isMobileOpen ? 90 : 0 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            >
              {isMobileOpen
                ? <path d="M18 6L6 18M6 6l12 12" />
                : <path d="M4 6h16M4 12h16M4 18h16" />
              }
            </motion.svg>
          </button>
        </motion.div>

        {/* ── Mobile menu — chrome glass ── */}
        <AnimatePresence>
          {isMobileOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.97 }}
              transition={{ type: "spring", stiffness: 380, damping: 32 }}
              className="mt-2 rounded-2xl overflow-hidden"
              style={{
                background: "rgba(255,255,255,0.92)",
                backdropFilter: "blur(40px) saturate(200%)",
                WebkitBackdropFilter: "blur(40px) saturate(200%)",
                border: "1px solid rgba(203,213,225,0.45)",
                boxShadow: "0 0 0 0.5px rgba(203,213,225,0.35), 0 8px 32px rgba(100,116,139,0.12), 0 20px 48px rgba(100,116,139,0.06), inset 0 1px 0 rgba(255,255,255,0.98)",
              }}
            >
              <div className="px-3 py-2.5 space-y-px">
                {links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsMobileOpen(false)}
                    className="block px-3.5 py-2.5 text-sm rounded-xl nav-link"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
              <div className="px-3 pb-3 pt-2 space-y-1.5" style={{ borderTop: "1px solid rgba(203,213,225,0.25)" }}>
                {auth.status === "authed" ? (
                  <Link
                    href={auth.dashboardHref}
                    onClick={() => setIsMobileOpen(false)}
                    className="block w-full text-center px-4 py-2.5 text-sm font-semibold rounded-xl transition-all"
                    style={{
                      background: "rgba(148,163,184,0.16)",
                      border: "1px solid rgba(203,213,225,0.45)",
                      color: "#334155",
                      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.80)",
                    }}
                  >
                    Mój panel
                  </Link>
                ) : (
                  <>
                    <Link
                      href="/login"
                      onClick={() => setIsMobileOpen(false)}
                      className="block w-full text-center px-4 py-2.5 text-sm rounded-xl transition-all"
                      style={{
                        color: "#475569",
                        background: "rgba(241,245,249,0.80)",
                        border: "1px solid rgba(203,213,225,0.35)",
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.80)",
                      }}
                    >
                      Zaloguj się
                    </Link>
                    <Link
                      href="/register"
                      onClick={() => setIsMobileOpen(false)}
                      className="block w-full text-center px-4 py-2.5 text-sm font-semibold rounded-xl transition-all"
                      style={{
                        background: "rgba(148,163,184,0.16)",
                        border: "1px solid rgba(203,213,225,0.45)",
                        color: "#334155",
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.80)",
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

// ── Sub-components ─────────────────────────────────────────────────────────────

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="relative px-3.5 py-2 text-sm rounded-xl nav-link">
      {children}
    </Link>
  );
}

function ChromeBtn({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <motion.div
      whileHover={{ scale: 1.03, y: -0.5 }}
      whileTap={{ scale: 0.975 }}
      transition={{ type: "spring", stiffness: 420, damping: 26 }}
      className="glass-shimmer-wrap rounded-xl"
    >
      <Link
        href={href}
        className="text-sm font-semibold px-4 py-2 rounded-xl block transition-colors duration-150"
        style={{
          background: "rgba(148,163,184,0.14)",
          border: "1px solid rgba(203,213,225,0.55)",
          color: "#334155",
          boxShadow: "0 0 0 0.5px rgba(203,213,225,0.25), inset 0 1px 0 rgba(255,255,255,0.80)",
        }}
      >
        {children}
      </Link>
    </motion.div>
  );
}
