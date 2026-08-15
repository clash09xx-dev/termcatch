"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Wordmark } from "@/components/brand/wordmark";
import { createClient } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { useT } from "@/components/i18n/i18n-provider";
import { LanguageSelector } from "@/components/i18n/language-selector";
import { SPRING } from "@/lib/motion";

type AuthState =
  | { status: "loading" }
  | { status: "guest" }
  | { status: "authed"; dashboardHref: string };

// ── Chrome glass pill styles ──────────────────────────────────────────────────

const NAV_GLASS_BASE = {
  backdropFilter: "var(--chrome-blur-lg)",
  WebkitBackdropFilter: "var(--chrome-blur-lg)",
  border: "1px solid var(--hairline)",
} as React.CSSProperties;

const NAV_SHADOW_REST =
  "var(--e1)";
const NAV_SHADOW_SCROLLED =
  "var(--e3)";

// Stronger (graphite) CTA — used for "Zaproś i zarób".
const AFFILIATE_CTA: React.CSSProperties = {
  background: "var(--ink-raised)",
  border: "1px solid #0F172A",
  boxShadow: "0 1px 2px rgba(0,0,0,0.20), 0 8px 20px rgba(15,23,42,0.22), inset 0 1px 0 rgba(255,255,255,0.15)",
};

export type LandingNavVariant = "marketing" | "customer-discovery";

export function LandingNav({
  variant = "customer-discovery",
}: {
  /** "marketing" (homepage) shows the full nav (Szukaj, Zarejestruj salon,
   *  Cennik, Kariera, O nas + the "Zaproś i zarób" CTA). The default
   *  customer-discovery/booking variant stays minimal ("Szukaj" only). */
  variant?: LandingNavVariant;
}) {
  const t = useT();
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
        setAuth({
          status: "authed",
          dashboardHref: role === "BUSINESS_OWNER" ? "/business/dashboard" : "/customer/dashboard",
        });
      })
      .catch(() => setAuth({ status: "guest" }));
  }, []);

  // Marketing (homepage) shows the full B2B/discovery nav; customer discovery /
  // booking contexts stay intentionally minimal ("Szukaj" only).
  const isMarketing = variant === "marketing";
  const links = isMarketing
    ? [
        { href: "/search", label: t.nav.search },
        { href: "/register?role=business", label: t.nav.registerSalon },
        { href: "/pricing", label: t.nav.pricing },
        { href: "/careers", label: t.nav.careers },
        { href: "/about", label: t.nav.about },
      ]
    : [{ href: "/search", label: t.nav.search }];
  // "Zaproś i zarób" — the stronger CTA → affiliate section under Careers.
  const affiliateHref = "/careers#zaros-i-zarob";
  // Fuller marketing nav needs a later breakpoint so it never overflows the pill.
  const desktopNavCls = isMarketing ? "hidden lg:flex items-center gap-0.5" : "hidden md:flex items-center gap-0.5";
  const desktopActionsCls = isMarketing ? "hidden lg:flex items-center gap-1.5" : "hidden md:flex items-center gap-1.5";

  return (
    <header className="fixed top-0 inset-x-0 z-50 px-4 pt-3">
      <div className="max-w-6xl mx-auto">
        {/* ── Floating chrome glass pill ── */}
        <motion.div
          className="flex items-center justify-between px-5 py-2.5 rounded-2xl"
          style={{
            ...NAV_GLASS_BASE,
            background: isScrolled ? "var(--chrome-strong)" : "var(--chrome)",
            boxShadow: isScrolled ? NAV_SHADOW_SCROLLED : NAV_SHADOW_REST,
          }}
          animate={{
            background: isScrolled ? "var(--chrome-strong)" : "var(--chrome)",
          }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          <Link href="/" className="flex items-center flex-shrink-0">
            <Wordmark className="text-[1.05rem]" variant="light" />
          </Link>

          {/* Desktop nav */}
          <nav className={desktopNavCls}>
            {links.map((link) => (
              <NavLink key={link.href} href={link.href}>
                {link.label}
              </NavLink>
            ))}
          </nav>

          {/* Actions */}
          <div className={desktopActionsCls}>
            <LanguageSelector />
            {isMarketing && (
              <Link href={affiliateHref} className="btn-spring px-3.5 py-2 min-h-[38px] inline-flex items-center text-sm font-semibold rounded-[10px] text-white" style={AFFILIATE_CTA}>
                {t.nav.inviteEarn}
              </Link>
            )}
            {auth.status === "authed" ? (
              <ChromeBtn href={auth.dashboardHref}>{t.nav.dashboard}</ChromeBtn>
            ) : auth.status === "guest" ? (
              <>
                <NavLink href="/login">{t.nav.login}</NavLink>
                <ChromeBtn href="/register">{t.nav.register}</ChromeBtn>
              </>
            ) : (
              <div className="w-40 h-9" aria-hidden="true" />
            )}
          </div>

          {/* Mobile: compact language control sits NEXT TO the menu button
              (flag + PL/EN/DE/TR) — visible without opening the menu. */}
          <div className={isMarketing ? "flex items-center gap-1.5 lg:hidden" : "flex items-center gap-1.5 md:hidden"}>
            <LanguageSelector compact />
            <button
              className="p-2 rounded-xl nav-link"
              onClick={() => setIsMobileOpen(!isMobileOpen)}
              aria-label={t.nav.menu}
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
          </div>
        </motion.div>

        {/* ── Mobile menu — chrome glass ── */}
        <AnimatePresence>
          {isMobileOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.97 }}
              transition={SPRING}
              className="mt-2 rounded-2xl overflow-hidden"
              style={{
                background: "var(--chrome-strong)",
                backdropFilter: "var(--chrome-blur-lg)",
                WebkitBackdropFilter: "var(--chrome-blur-lg)",
                border: "1px solid var(--hairline)",
                boxShadow: "var(--e3)",
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
              <div className="px-3 pb-3 pt-2 space-y-1.5" style={{ borderTop: "1px solid var(--hairline-soft)" }}>
                {isMarketing && (
                  <Link
                    href={affiliateHref}
                    onClick={() => setIsMobileOpen(false)}
                    className="block w-full text-center px-4 py-2.5 text-sm font-semibold rounded-xl text-white"
                    style={AFFILIATE_CTA}
                  >
                    {t.nav.inviteEarn}
                  </Link>
                )}
                {auth.status === "authed" ? (
                  <Link
                    href={auth.dashboardHref}
                    onClick={() => setIsMobileOpen(false)}
                    className="block w-full text-center px-4 py-2.5 text-sm font-semibold rounded-xl transition-colors"
                    style={{
                      background: "rgba(148,163,184,0.16)",
                      border: "1px solid var(--hairline)",
                      color: "#334155",
                      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.80)",
                    }}
                  >
                    {t.nav.dashboard}
                  </Link>
                ) : (
                  <>
                    <Link
                      href="/login"
                      onClick={() => setIsMobileOpen(false)}
                      className="block w-full text-center px-4 py-2.5 text-sm rounded-xl transition-colors"
                      style={{
                        color: "#475569",
                        background: "rgba(241,245,249,0.80)",
                        border: "1px solid var(--hairline-soft)",
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.80)",
                      }}
                    >
                      {t.nav.login}
                    </Link>
                    <Link
                      href="/register"
                      onClick={() => setIsMobileOpen(false)}
                      className="block w-full text-center px-4 py-2.5 text-sm font-semibold rounded-xl transition-colors"
                      style={{
                        background: "rgba(148,163,184,0.16)",
                        border: "1px solid var(--hairline)",
                        color: "#334155",
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.80)",
                      }}
                    >
                      {t.nav.register}
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
    <div 
      className="btn-spring rounded-xl"
    >
      <Link
        href={href}
        className="text-sm font-semibold px-4 py-2 rounded-xl block transition-colors duration-150"
        style={{
          background: "rgba(148,163,184,0.14)",
          border: "1px solid var(--hairline)",
          color: "#334155",
          boxShadow: "var(--e1)",
        }}
      >
        {children}
      </Link>
    </div>
  );
}
