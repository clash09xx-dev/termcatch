"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

function TermcatchMark({ size = 30 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 30 30"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="30" height="30" rx="8" fill="#111827" />
      {/* calendar body outline */}
      <rect
        x="5"
        y="8"
        width="20"
        height="15"
        rx="2.5"
        stroke="white"
        strokeWidth="1.4"
        strokeOpacity="0.25"
      />
      {/* header fill */}
      <rect x="5" y="8" width="20" height="5.5" rx="2.5" fill="white" fillOpacity="0.1" />
      {/* separator */}
      <line x1="5" y1="13.5" x2="25" y2="13.5" stroke="white" strokeWidth="1.4" strokeOpacity="0.2" />
      {/* pins */}
      <line x1="10" y1="5.5" x2="10" y2="10.5" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeOpacity="0.6" />
      <line x1="20" y1="5.5" x2="20" y2="10.5" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeOpacity="0.6" />
      {/* checkmark */}
      <path
        d="M9 19.5L12.5 23L21 15"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function LandingNav() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 16);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
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
        <Link href="/" className="flex items-center gap-2.5">
          <TermcatchMark size={30} />
          <span className="text-base font-semibold text-gray-900 tracking-tight">
            termcatch
          </span>
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
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
