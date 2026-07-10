"use client";

// ─── GlassModal — the one modal primitive ────────────────────────────────────
// Radix Dialog (focus trap, Escape, aria) + Machined Silver glass skin
// + shared motion vocabulary. Every product modal should build on this.

import * as Dialog from "@radix-ui/react-dialog";
import { motion } from "framer-motion";
import { modalIn, overlayFade, useReducedMotion } from "@/lib/motion";
import { cn } from "@/lib/utils";

const PANEL_STYLE: React.CSSProperties = {
  background: "rgba(255,255,255,0.92)",
  backdropFilter: "blur(40px) saturate(200%)",
  WebkitBackdropFilter: "blur(40px) saturate(200%)",
  border: "1px solid rgba(203,213,225,0.50)",
  boxShadow:
    "0 0 0 0.5px rgba(203,213,225,0.40), 0 8px 32px rgba(15,23,42,0.14), 0 32px 80px rgba(15,23,42,0.10), inset 0 1px 0 rgba(255,255,255,0.98)",
};

export function GlassModal({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
  accent,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  /** Extra classes for the panel (e.g. max-w overrides; default max-w-md) */
  className?: string;
  /** Optional 3px top accent bar color (e.g. employee color) */
  accent?: string;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                variants={overlayFade}
                initial="hidden"
                animate="show"
                className="fixed inset-0 z-50"
                style={{
                  background: "rgba(15,23,42,0.30)",
                  backdropFilter: "blur(6px)",
                  WebkitBackdropFilter: "blur(6px)",
                }}
              />
            </Dialog.Overlay>
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 pointer-events-none">
              <Dialog.Content asChild forceMount>
                <motion.div
                  variants={reduceMotion ? overlayFade : modalIn}
                  initial="hidden"
                  animate="show"
                  className={cn(
                    "relative w-full max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden pointer-events-auto",
                    className
                  )}
                  style={PANEL_STYLE}
                >
                  {accent && (
                    <div className="h-[3px]" style={{ background: accent }} aria-hidden="true" />
                  )}
                  <div className="p-6">
                    <div className="flex items-start justify-between gap-3 mb-1">
                      <Dialog.Title
                        className="text-lg font-bold text-slate-900"
                        style={{ letterSpacing: "-0.02em" }}
                      >
                        {title}
                      </Dialog.Title>
                      <Dialog.Close asChild>
                        <button
                          type="button"
                          aria-label="Zamknij"
                          className="w-8 h-8 -mr-2 -mt-1 flex items-center justify-center rounded-lg icon-btn"
                          style={{ color: "#94A3B8" }}
                        >
                          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </Dialog.Close>
                    </div>
                    {description ? (
                      <Dialog.Description className="text-sm text-slate-500 mb-4">
                        {description}
                      </Dialog.Description>
                    ) : (
                      <Dialog.Description className="sr-only">{title}</Dialog.Description>
                    )}
                    {children}
                  </div>
                </motion.div>
              </Dialog.Content>
            </div>
          </Dialog.Portal>
        )}
    </Dialog.Root>
  );
}

/** Ink primary button for modal footers */
export function ModalInkButton({
  children,
  disabled,
  onClick,
  type = "button",
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  type?: "button" | "submit";
}) {
  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      whileHover={disabled ? undefined : { scale: 1.01, y: -1 }}
      whileTap={disabled ? undefined : { scale: 0.982 }}
      transition={{ type: "spring", stiffness: 420, damping: 26 }}
      className="flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
      style={{
        background: "linear-gradient(180deg, #1E293B 0%, #0F172A 100%)",
        border: "1px solid #0F172A",
        color: "#F8FAFC",
        boxShadow: "0 1px 2px rgba(0,0,0,0.20), 0 8px 20px rgba(15,23,42,0.24), inset 0 1px 0 rgba(255,255,255,0.15)",
      }}
    >
      {children}
    </motion.button>
  );
}

/** Glass secondary button for modal footers */
export function ModalGlassButton({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="py-2.5 px-4 rounded-xl text-sm font-medium btn-spring disabled:opacity-50"
      style={{
        background: "rgba(255,255,255,0.70)",
        border: "1px solid rgba(203,213,225,0.55)",
        color: "#475569",
        boxShadow: "0 0 0 0.5px rgba(203,213,225,0.20), inset 0 1px 0 rgba(255,255,255,0.85)",
      }}
    >
      {children}
    </button>
  );
}
