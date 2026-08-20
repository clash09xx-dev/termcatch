"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useT } from "@/components/i18n/i18n-provider";
import { useReducedMotion } from "@/lib/motion";
import { INK_GRADIENT } from "@/components/ui/glass/tokens";

/**
 * The collapsed-dot view switcher — shell only.
 *
 * ONE implementation, two callers: the product Client/Salon switch
 * (ProductViewSwitcher) and the internal Client/Salon/Owner switch
 * (AdminViewSwitcher). The a11y contract here is fiddly enough — hover gating,
 * focus, Escape, outside-tap, the grace delay, tab-order of hidden options,
 * reduced motion — that maintaining it twice would guarantee the two drift
 * apart, and the one that drifts is the one nobody is testing.
 *
 * WHAT THIS COMPONENT IS NOT
 * It is not an authorization boundary. It renders whatever `items` it is handed
 * and knows nothing about who may see it: the LAYOUT decides that, server-side,
 * from the session (lib/ownership resolveBusinessAccess → lib/view-switch
 * resolveViewSwitch). It receives no business id and builds no dynamic business
 * path, so no amount of client tampering can aim it at another salon — the worst
 * a forged value could do is navigate to a route that re-checks membership
 * server-side and redirects.
 *
 * SHAPE
 * A small neutral dot at rest inside a comfortable 44x44 target. It expands into
 * a capsule on hover (desktop, gated to real hover devices), on keyboard focus,
 * or on tap (mobile). Both states are absolutely positioned inside a fixed
 * wrapper sized to the widest state, so expanding animates opacity/transform
 * only and can never shift the page.
 */

export type ViewSwitchItem = {
  /** Stable identity, also matched against `current`. */
  key: string;
  href: string;
  label: string;
  /** Localized accessible name for this destination. */
  aria: string;
};

export function ViewSwitchDot({
  items,
  current,
  onSelect,
}: {
  items: ViewSwitchItem[];
  /** Which item is the active context. Decided by the mounting layout/route. */
  current: string;
  /** Optional side effect on choose (e.g. remembering a presentation preference). */
  onSelect?: (key: string) => void;
}) {
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

  // Collapse after a short beat so a diagonal mouse path toward the options
  // does not snap it shut on the way.
  const scheduleClose = useCallback(() => {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpen(false), 260);
  }, [cancelClose]);

  useEffect(() => () => cancelClose(), [cancelClose]);

  // Hover only where hovering is real; a touch tap must not fire a false hover.
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

  const ease = reduce ? "none" : "opacity 160ms ease, transform 180ms cubic-bezier(0.23, 1, 0.32, 1)";

  return (
    <div
      // Sits above the mobile bottom nav and clears the iOS safe area, so it can
      // never cover navigation or a submit control.
      className="fixed right-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] md:bottom-4"
      style={{ zIndex: "var(--z-switch)" as unknown as number }}
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
          aria-controls="view-switch-options"
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

        {/* Expanded: the capsule. `aria-hidden` + tabIndex -1 while collapsed, so
            the hidden options are never reachable by Tab. */}
        <div
          id="view-switch-options"
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
                onClick={() => { onSelect?.(v.key); setOpen(false); }}
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
