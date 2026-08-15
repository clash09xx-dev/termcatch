"use client";

// ─── GlassModal — the one overlay primitive ──────────────────────────────────
//
// Radix Dialog gives focus trapping, Escape, scroll lock and aria. This adds
// the material and the motion:
//
//   • It leaves the way it arrived. Every overlay in this product used to
//     animate in over ~350ms and vanish in a single frame, because the panel
//     was unmounted the instant `open` flipped. Asymmetry like that reads as a
//     bug even when nobody can name it. AnimatePresence keeps the exit.
//
//   • On a phone it is a sheet, not a shrunken dialog. It rises from the bottom
//     edge, and it leaves through that same edge — the path in and the path out
//     are the same path. It can be dragged down to dismiss, with the throw
//     decided by velocity rather than distance, so a flick is enough.
//
//   • On a desktop it is a centred modal. Modals are not anchored to a trigger,
//     so they stay centred and materialise in place: blur and scale resolve
//     together, which reads as a real surface arriving rather than an image
//     cross-dissolving.
//
//   • The scrim dims but does not blur. Blurring the whole viewport on every
//     dialog is the most expensive thing an overlay can do, and the dim alone
//     already pushes the page back.

import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion, type PanInfo } from "framer-motion";
import {
  DUR,
  EASE_DRAWER,
  gentleFade,
  modalIn,
  overlayFade,
  projectMomentum,
  sheetUp,
  SPRING_SHEET,
  useReducedMotion,
} from "@/lib/motion";
import { ELEV_OVERLAY, INK_BTN, GLASS_BTN, SCRIM } from "@/components/ui/glass/tokens";
import { useIsCompact } from "@/hooks/use-media";
import { cn } from "@/lib/utils";
import { useT } from "@/components/i18n/i18n-provider";

/** A flick past this projected distance dismisses, however short the drag was. */
const DISMISS_PROJECTION_PX = 120;

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
  const compact = useIsCompact();
  const a = useT().a11y;

  const panelVariants = reduceMotion ? gentleFade : compact ? sheetUp : modalIn;

  function handleDragEnd(_: unknown, info: PanInfo) {
    // Momentum projection, not a distance threshold: a short fast flick should
    // throw the sheet away, a long slow drag should not.
    const projected = info.offset.y + projectMomentum(info.velocity.y);
    if (projected > DISMISS_PROJECTION_PX) onOpenChange(false);
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                variants={overlayFade}
                initial="hidden"
                animate="show"
                exit="exit"
                className="fixed inset-0"
                style={{ ...SCRIM, zIndex: "var(--z-overlay)" as unknown as number }}
              />
            </Dialog.Overlay>

            <div
              className="fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4 pointer-events-none"
              style={{ zIndex: "var(--z-modal)" as unknown as number }}
            >
              <Dialog.Content asChild forceMount>
                <motion.div
                  variants={panelVariants}
                  initial="hidden"
                  animate="show"
                  exit="exit"
                  drag={compact && !reduceMotion ? "y" : false}
                  dragDirectionLock
                  dragConstraints={{ top: 0, bottom: 0 }}
                  dragElastic={{ top: 0, bottom: 0.6 }}
                  onDragEnd={handleDragEnd}
                  dragTransition={{ bounceStiffness: 400, bounceDamping: 40 }}
                  transition={SPRING_SHEET}
                  className={cn(
                    "relative w-full max-w-md rounded-t-[22px] sm:rounded-[20px] overflow-hidden pointer-events-auto",
                    "max-h-[92dvh] sm:max-h-[85dvh] flex flex-col",
                    className
                  )}
                  style={ELEV_OVERLAY}
                >
                  {accent && (
                    <div className="h-[3px] flex-shrink-0" style={{ background: accent }} aria-hidden="true" />
                  )}

                  {/* Grabber. Only rendered where it is actually draggable, so the
                      affordance never lies about what the surface can do. */}
                  {compact && !reduceMotion && (
                    <div className="flex justify-center pt-2.5 pb-0.5 flex-shrink-0" aria-hidden="true">
                      <span className="h-1 w-9 rounded-full" style={{ background: "var(--hairline-firm)" }} />
                    </div>
                  )}

                  <div className="p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] overflow-y-auto">
                    <div className="flex items-start justify-between gap-3 mb-1">
                      <Dialog.Title className="text-[17px] leading-[1.25] font-semibold text-slate-900 track-title">
                        {title}
                      </Dialog.Title>
                      <Dialog.Close asChild>
                        <button
                          type="button"
                          aria-label={a.close}
                          className="w-9 h-9 -mr-2 -mt-1.5 flex items-center justify-center rounded-lg icon-btn flex-shrink-0"
                          style={{ color: "var(--text-muted)" }}
                        >
                          <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </Dialog.Close>
                    </div>
                    {description ? (
                      <Dialog.Description className="text-[13.5px] leading-[1.5] text-secondary mb-5">
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
      </AnimatePresence>
    </Dialog.Root>
  );
}

/**
 * Confirmation for a destructive or irreversible action.
 *
 * Apple's rule: a confirmation dialog is for genuinely destructive, irreversible
 * work — overusing one trains people to click straight through. Everything that
 * can be undone should just happen, and say so.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  body,
  confirmLabel,
  cancelLabel,
  onConfirm,
  busy,
  danger = true,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  busy?: boolean;
  danger?: boolean;
}) {
  return (
    <GlassModal open={open} onOpenChange={onOpenChange} title={title} accent={danger ? "#E11D48" : undefined}>
      <p className="text-[13.5px] leading-[1.55] text-secondary">{body}</p>
      <div className="flex gap-2.5 mt-6">
        <ModalGlassButton onClick={() => onOpenChange(false)} disabled={busy}>
          {cancelLabel}
        </ModalGlassButton>
        <button
          type="button"
          onClick={onConfirm}
          disabled={busy}
          data-on-ink
          className="btn-spring flex-1 rounded-[10px] px-4 py-[9px] min-h-[38px] text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          style={
            danger
              ? {
                  background: "linear-gradient(180deg, #E11D48 0%, #BE123C 100%)",
                  border: "1px solid #BE123C",
                  color: "#FFF1F2",
                  boxShadow: "0 1px 2px rgba(190,18,60,0.24), 0 6px 16px -6px rgba(190,18,60,0.34)",
                }
              : INK_BTN
          }
        >
          {confirmLabel}
        </button>
      </div>
    </GlassModal>
  );
}

/** Ink primary button for modal footers. */
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
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      data-on-ink
      className="btn-spring flex-1 rounded-[10px] px-4 py-[9px] min-h-[38px] text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
      style={INK_BTN}
    >
      {children}
    </button>
  );
}

/** Secondary button for modal footers. */
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
      className="btn-spring rounded-[10px] px-4 py-[9px] min-h-[38px] text-sm font-medium disabled:opacity-50"
      style={GLASS_BTN}
    >
      {children}
    </button>
  );
}

/** Exported for sheets that manage their own layout but want the same exit. */
export const SHEET_EXIT = { duration: DUR.base / 1000, ease: EASE_DRAWER } as const;
