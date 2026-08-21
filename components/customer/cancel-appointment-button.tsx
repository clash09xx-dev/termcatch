"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useT } from "@/components/i18n/i18n-provider";
import { interpolate } from "@/lib/i18n/dictionaries";
import { ConfirmDialog } from "@/components/ui/glass-modal";
import { notify, errorText } from "@/lib/notify";
import { cancelAppointment } from "@/lib/actions/appointments";

/**
 * Cancel an appointment, behind a confirmation.
 *
 * WHAT THIS REPLACES
 * A `<form action={serverAction}>` with a bare submit button: one click, and a
 * real appointment was gone. No confirmation, no pending state, and because a
 * plain submit stays enabled while the action runs, an impatient double-click
 * fired the mutation twice.
 *
 * WHY A CLIENT COMPONENT
 * The confirmation has to happen BEFORE the request, which needs state. The
 * server action itself is unchanged and still enforces every rule it always
 * did: ownership, appointment status and the salon's cancellationHours window.
 * This is a guard in front of that action, never a replacement for it.
 *
 * NOT `window.confirm`: it is unstyled, unlocalised, blocks the main thread and
 * cannot be reached by the design system. This uses the product's own
 * ConfirmDialog, which is built on GlassModal and therefore inherits the focus
 * trap, Escape-to-close, scroll lock and focus restore to the trigger.
 *
 * DOUBLE-SUBMIT
 * Two guards, because they fail differently. `isPending` disables the buttons,
 * which covers the UI; `sent` is a ref checked synchronously inside the handler,
 * which covers the case where two click events are dispatched in the same tick
 * before React has re-rendered with the disabled state.
 */
export function CancelAppointmentButton({
  appointmentId,
  label,
  className,
}: {
  appointmentId: string;
  /** What is being cancelled, for the trigger's accessible name. */
  label?: string;
  className?: string;
}) {
  const t = useT();
  const T = t.cancelAppt;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, start] = useTransition();
  const sent = useRef(false);

  function confirm() {
    if (sent.current) return;
    sent.current = true;
    start(async () => {
      try {
        await cancelAppointment(appointmentId);
        notify.saved(T.done);
        setOpen(false);
        router.refresh();
      } catch (e) {
        // The action throws for a real reason (not yours, too late, wrong
        // status). Surface its message rather than a generic failure, and let
        // the customer try again — the mutation did not happen.
        notify.error(errorText(e, T.failed));
        sent.current = false;
        setOpen(false);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={isPending}
        aria-label={label ? interpolate(T.ariaTrigger, { what: label }) : undefined}
        className={cn(
          "btn-spring text-xs font-semibold px-3 py-1.5 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed",
          className
        )}
        style={{
          background: "rgba(244,63,94,0.08)",
          border: "1px solid rgba(244,63,94,0.28)",
          color: "#BE123C",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.60)",
        }}
      >
        {isPending ? T.cancelling : T.trigger}
      </button>

      <ConfirmDialog
        open={open}
        onOpenChange={(o) => { if (!isPending) setOpen(o); }}
        title={T.title}
        body={T.body}
        confirmLabel={isPending ? T.cancelling : T.confirm}
        cancelLabel={T.back}
        busy={isPending}
        onConfirm={confirm}
      />
    </>
  );
}
