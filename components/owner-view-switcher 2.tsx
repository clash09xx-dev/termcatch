"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useT } from "@/components/i18n/i18n-provider";
import { useReducedMotion } from "@/lib/motion";
import { INK_GRADIENT } from "@/components/ui/glass/tokens";

/**
 * Client ⇄ Salon view switch for salon OWNERS.
 *
 * Rendered ONLY after the server has confirmed business ownership
 * (currentOwnedBusinessId → resolveViewSwitch === "owner") — never gated by the
 * frontend alone. It deliberately does NOT include the internal "Owner/Admin"
 * mode; that stays in AdminViewSwitcher, separately permission-gated.
 *
 * `current` is fixed by the layout that mounts this (business layout → "salon",
 * customer layout → "client"). The links point only at the user's OWN dashboards
 * — no business identifier is ever passed, so another business can't be selected.
 * Clicking records a presentation-only `ownerView` cookie; server authorization
 * never trusts it (business routes re-check real ownership).
 *
 * Shape: a small neutral dot at rest. It expands into a capsule on hover
 * (desktop), on keyboard focus, or on tap (mobile). Both states are absolutely
 * positioned inside a fixed wrapper, so expanding animates opacity/transform
 * only and never shifts the page.
 */
export function OwnerViewSwitcher({ current }: { current: "client" | "salon" }) {
  const t = useT();
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const dotRef = useRef<HTMLButtonElement | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelClose = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  // Collapse after a short beat so a diagonal mouse path doesn't snap it shut.
  const scheduleClose = useCallback(() => {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpen(false), 260);
  }, [cancelClose]);

  useEffect(() => () => cancelClose(), [cancelClose]);

  // Hover only where hovering is real; touch taps must not open it by "hover".
  const canHover = useCallback(
    () => typeof window !== "undefined" && window.matchMedia("(hover: hover) and (pointer: fine)").matches,
    []
  );

  // Tap outside closes it (mobile), Escape closes it and returns focus.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        dotRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const rememberPreference = (v: "client" | "salon") => {
    // Presentation persistence only — NOT an authorization signal.
    document.cookie = `ownerView=${v}; path=/; max-age=${60 * 60 * 24 * 180}; samesite=lax`;
    setOpen(false);
  };

  const items: { key: "client" | "salon"; href: string; label: string; aria: string }[] = [
    { key: "client", href: "/customer/dashboard", label: t.viewSwitch.client, aria: t.viewSwitch.ariaClient },
    { key: "salon", href: "/business/dashboard", label: t.viewSwitch.salon, aria: t.viewSwitch.ariaSalon },
  ];

  const ease = reduce ? "none" : "opacity 160ms ease, transform 180ms cubic-bezier(0.23, 1, 0.32, 1)";

  return (
    <div
      className="fixed right-4 z-[70] bottom-[calc(5rem+env(safe-area-inset-bottom))] md:bottom-4"
      ref={rootRef}
      onPointerEnter={() => { if (canHover()) { cancelClose(); setOpen(true); } }}
      onPointerLeave={() => { if (canHover()) scheduleClose(); }}
      onFocus={() => { cancelClose(); setOpen(true); }}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false); }}
    >
      {/* Sized to the widest state so neither layer can nudge the page. */}
      <div className="relative flex h-11 items-center justify-end">
        {/* Collapsed: a quiet grey dot in a comfortable 44px target. */}
        <button
          ref={dotRef}
          type="button"
          aria-label={t.viewSwitch.ariaOpen}
          aria-expanded={open}
          aria-controls="owner-view-switch"
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "absolute right-0 grid h-11 w-11 place-items-center rounded-full",
            open && "pointer-events-none"
          )}
          style={{ opacity: open ? 0 : 1, transition: ease }}
        >
          <span
            className="block h-2.5 w-2.5 rounded-full"
            style={{
              background: "rgba(100,116,139,0.55)",
              boxShadow: "0 0 0 4px rgba(255,255,255,0.55), 0 1px 3px rgba(15,23,42,0.18)",
            }}
          />
        </button>

        {/* Expanded: the same capsule language as the internal admin switcher. */}
        <div
          id="owner-view-switch"
          role="group"
          aria-label={t.viewSwitch.view}
          aria-hidden={!open}
          className={cn(
            "absolute right-0 flex items-center gap-1 rounded-full p-1",
            open ? "pointer-events-auto" : "pointer-events-none"
          )}
          style={{
            background: INK_GRADIENT,
            boxShadow: "0 1px 2px rgba(15,23,42,0.22), 0 8px 24px rgba(15,23,42,0.24), inset 0 1px 0 rgba(255,255,255,0.12)",
            opacity: open ? 1 : 0,
            transform: open || reduce ? "none" : "translateX(6px) scale(0.96)",
            transformOrigin: "right center",
            transition: ease,
          }}
        >
          <span className="select-none pl-2.5 pr-1 text-[9px] font-bold uppercase tracking-wider text-white/40">
            {t.viewSwitch.view}
          </span>
          {items.map((v) => {
            const isActive = v.key === current;
            return (
              <Link
                key={v.key}
                href={v.href}
                aria-label={v.aria}
                aria-current={isActive ? "page" : undefined}
                tabIndex={open ? 0 : -1}
                onClick={() => rememberPreference(v.key)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                  isActive ? "bg-white text-slate-900" : "text-white/70 hover:bg-white/10 hover:text-white"
                )}
              >
                {v.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
