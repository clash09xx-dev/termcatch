"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { GlassCard, Overline, GlassButton, InkButton, HAIRLINE, CHIP } from "@/components/ui/glass";
import { ConfirmDialog } from "@/components/ui/glass-modal";
import { PlanLimitDialog } from "@/components/business/plan-limit-dialog";
import { useT, useLocale } from "@/components/i18n/i18n-provider";
import { interpolate } from "@/lib/i18n/dictionaries";
import { intlLocale } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/config";
import { getInitials } from "@/lib/utils";
import { notify, errorText } from "@/lib/notify";
import { approveJoinRequest, rejectJoinRequest } from "@/lib/actions/join-requests";
import type { PlanLimitInfo } from "@/lib/entitlements";

export type PendingJoinRequest = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  /** ISO string — serialized across the server/client boundary. */
  createdAt: string;
  /** The last approval attempt hit the plan's specialist limit. */
  blocked: boolean;
};

/**
 * The owner's approval queue.
 *
 * Sits directly under the join code, because the two halves of one mechanism
 * should be read together: the code goes out, the requests come back here.
 * Renders nothing at all when the queue is empty — an owner with no pending
 * requests should not carry an empty box down the page forever.
 *
 * Approval can fail for a reason the owner can act on (the plan is full), so
 * that case gets the same PlanLimitDialog the rest of the product uses rather
 * than a toast that scrolls away. Everything else is a plain error.
 */
export function JoinRequestsCard({ requests }: { requests: PendingJoinRequest[] }) {
  const t = useT();
  const T = t.pages.staff;
  const locale = useLocale();
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [limitInfo, setLimitInfo] = useState<PlanLimitInfo | null>(null);
  const [, start] = useTransition();

  if (requests.length === 0) return null;

  function approve(id: string) {
    setBusyId(id);
    start(async () => {
      try {
        const res = await approveJoinRequest(id);
        if (res.ok) {
          notify.saved(T.approved);
          router.refresh();
        } else if ("limit" in res) {
          // Not a failure the owner caused — show what to change, and by how much.
          setLimitInfo(res.limit);
        } else {
          notify.error(res.error);
          router.refresh();
        }
      } catch (e) {
        notify.error(errorText(e, t.errors.generic));
      } finally {
        setBusyId(null);
      }
    });
  }

  function reject(id: string) {
    setBusyId(id);
    start(async () => {
      try {
        const res = await rejectJoinRequest(id);
        if (res.ok) notify.saved(T.rejected);
        else if (!("limit" in res)) notify.error(res.error);
        router.refresh();
      } catch (e) {
        notify.error(errorText(e, t.errors.generic));
      } finally {
        setBusyId(null);
        setConfirmId(null);
      }
    });
  }

  return (
    <GlassCard className="p-5 fade-rise">
      <Overline>{T.requestsTitle}</Overline>
      <p className="text-[13px] leading-[1.55] text-secondary mt-2 max-w-[62ch]">{T.requestsBody}</p>

      <ul className="mt-4 pt-1" style={{ borderTop: HAIRLINE }}>
        {requests.map((r) => {
          const name = `${r.firstName} ${r.lastName}`.trim();
          const busy = busyId === r.id;
          return (
            <li
              key={r.id}
              className="flex flex-wrap items-center gap-3 py-3.5"
              style={{ borderTop: HAIRLINE }}
            >
              <span
                className="w-10 h-10 rounded-xl flex items-center justify-center text-[13px] font-semibold text-slate-600 flex-shrink-0"
                style={CHIP}
                aria-hidden="true"
              >
                {getInitials(r.firstName, r.lastName)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-semibold text-slate-900 truncate">{name}</span>
                <span className="block text-[12px] text-muted-glass truncate">
                  {interpolate(T.requestedAt, { when: relativeTime(r.createdAt, locale) })}
                </span>
                {r.blocked && (
                  <span className="block text-[12px] mt-0.5" style={{ color: "#B45309" }} role="status">
                    {T.requestBlocked}
                  </span>
                )}
              </span>
              <span className="flex items-center gap-2 ml-auto">
                <GlassButton
                  size="sm"
                  onClick={() => setConfirmId(r.id)}
                  disabled={busy}
                  aria-label={`${T.reject} — ${name}`}
                >
                  {T.reject}
                </GlassButton>
                <InkButton
                  size="sm"
                  onClick={() => approve(r.id)}
                  disabled={busy}
                  aria-label={`${T.approve} — ${name}`}
                >
                  {busy ? T.approving : T.approve}
                </InkButton>
              </span>
            </li>
          );
        })}
      </ul>

      <ConfirmDialog
        open={confirmId !== null}
        onOpenChange={(o) => { if (!o) setConfirmId(null); }}
        title={T.rejectConfirmTitle}
        body={T.rejectConfirmBody}
        confirmLabel={T.reject}
        cancelLabel={t.common.cancel}
        busy={busyId !== null}
        onConfirm={() => confirmId && reject(confirmId)}
      />

      {limitInfo && <PlanLimitDialog info={limitInfo} onClose={() => setLimitInfo(null)} />}
    </GlassCard>
  );
}

/**
 * "2 minutes ago", in the viewer's language.
 *
 * Intl.RelativeTimeFormat rather than a hand-rolled table, so the four launch
 * locales get correct plurals for free and a fifth would need no new strings.
 */
function relativeTime(iso: string, locale: Locale): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";
  const diffSec = Math.round((then - Date.now()) / 1000);
  const abs = Math.abs(diffSec);
  const rtf = new Intl.RelativeTimeFormat(intlLocale(locale), { numeric: "auto" });
  if (abs < 60) return rtf.format(Math.min(-1, diffSec), "second");
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), "hour");
  return rtf.format(Math.round(diffSec / 86400), "day");
}
