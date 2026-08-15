"use client";

// ─── notify — the one feedback channel ───────────────────────────────────────
//
// Every mutation in this product used to complete in silence. Confirming an
// appointment, deleting a service, toggling visibility, publishing a review
// reply — all of them just happened, and the user could not tell "it worked"
// from "nothing happened" from "it failed quietly". That single absence did
// more damage to how finished the product feels than any visual detail.
//
// So: one wrapper, one vocabulary, called from every server-action call site.
// Nothing in the app imports `sonner` directly.
//
// Four kinds of feedback, and only four:
//   saved()    — a change landed
//   error()    — a change did not land, and why
//   info()     — something happened that the user did not ask for
//   promise()  — a round-trip worth narrating while it is in flight
//
// Deliberately NOT a toast: anything with its own inline confirmation already
// (the hours and settings save bars, the profile tab "Saved" state). A toast on
// top of those would be telling the user twice.

import { toast } from "sonner";

/** Pull a human message out of whatever a server action threw. */
export function errorText(e: unknown, fallback: string): string {
  if (typeof e === "string" && e.trim()) return e;
  if (e instanceof Error && e.message) return e.message;
  if (e && typeof e === "object" && "message" in e) {
    const m = (e as { message?: unknown }).message;
    if (typeof m === "string" && m.trim()) return m;
  }
  return fallback;
}

export const notify = {
  /** A change landed. Short and past tense: "Saved", "Deleted", "Published". */
  saved(message: string) {
    return toast.success(message);
  },

  /** A change did not land. Says what went wrong, and stays long enough to read. */
  error(message: string) {
    return toast.error(message, { duration: 6000 });
  },

  /** Neutral notice. Nothing failed, but the user should know. */
  info(message: string) {
    return toast(message);
  },

  /** Narrate a round-trip that is slow enough to notice. */
  promise<T>(p: Promise<T>, msgs: { loading: string; success: string; error: string }) {
    return toast.promise(p, msgs);
  },

  dismiss(id?: string | number) {
    return toast.dismiss(id);
  },
};

/**
 * Run a server action and report the outcome, with the caller's own dictionary
 * strings. Returns true when it succeeded, so the caller can close a form or
 * update local state only on success.
 */
export async function runWithFeedback(
  action: () => Promise<unknown>,
  msgs: { success: string; error: string },
): Promise<boolean> {
  try {
    await action();
    notify.saved(msgs.success);
    return true;
  } catch (e) {
    notify.error(errorText(e, msgs.error));
    return false;
  }
}
