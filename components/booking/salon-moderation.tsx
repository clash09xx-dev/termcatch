"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { GlassModal, ModalGlassButton, ConfirmDialog } from "@/components/ui/glass-modal";
import { useT } from "@/components/i18n/i18n-provider";
import { notify, errorText } from "@/lib/notify";
import { DANGER_BTN } from "@/components/ui/glass/tokens";
import { blockBusiness, unblockBusiness, reportBusiness } from "@/lib/actions/moderation";
import { REPORT_REASONS } from "@/lib/moderation";

/**
 * Block and report, on a salon profile.
 *
 * This is the only place they appear, because customer ↔ business is the only
 * relationship in the product where one party can be a problem for the other.
 * Scattering report buttons across surfaces that have no counterparty would be
 * noise.
 *
 * Placed at the very bottom of the profile, under the reviews: these are
 * last-resort actions, not primary ones, and putting them near the booking CTA
 * would give them a weight they should not have.
 */
export function SalonModeration({
  businessId,
  isBlocked: initialBlocked,
  isSignedIn,
}: {
  businessId: string;
  isBlocked: boolean;
  /** Guests get no controls: both actions need an account to attribute them to. */
  isSignedIn: boolean;
}) {
  const t = useT();
  const T = t.moderation;
  const router = useRouter();
  const [blocked, setBlocked] = useState(initialBlocked);
  const [confirmBlock, setConfirmBlock] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reason, setReason] = useState<string>(REPORT_REASONS[0]);
  const [details, setDetails] = useState("");
  const [isPending, start] = useTransition();

  if (!isSignedIn) return null;

  const REASON_LABEL: Record<string, string> = {
    spam: T.reasonSpam,
    inappropriate: T.reasonInappropriate,
    wrong_info: T.reasonWrongInfo,
    other: T.reasonOther,
  };

  function toggleBlock() {
    start(async () => {
      try {
        const res = blocked ? await unblockBusiness(businessId) : await blockBusiness(businessId);
        if (res.ok) {
          const next = !blocked;
          setBlocked(next);
          notify.saved(next ? T.blocked : T.unblocked);
          // A newly blocked salon must disappear from the surfaces that list it.
          router.refresh();
        } else {
          notify.error(res.error);
        }
      } catch (e) {
        notify.error(errorText(e, t.errors.generic));
      } finally {
        setConfirmBlock(false);
      }
    });
  }

  function submitReport() {
    start(async () => {
      try {
        const res = await reportBusiness({ businessId, reason, details });
        if (res.ok) {
          notify.saved(T.reportSent);
          setReportOpen(false);
          setDetails("");
        } else {
          notify.error(res.error);
        }
      } catch (e) {
        notify.error(errorText(e, t.errors.generic));
      }
    });
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-6" style={{ borderTop: "1px solid var(--hairline-soft)" }}>
        <button
          type="button"
          onClick={() => (blocked ? toggleBlock() : setConfirmBlock(true))}
          disabled={isPending}
          className="text-[13px] font-medium text-slate-500 hover:text-slate-900 transition-colors"
        >
          {blocked ? T.unblockCta : T.blockCta}
        </button>
        <button
          type="button"
          onClick={() => setReportOpen(true)}
          disabled={isPending}
          className="text-[13px] font-medium text-slate-500 hover:text-slate-900 transition-colors"
        >
          {T.reportTitle}
        </button>
      </div>

      <ConfirmDialog
        open={confirmBlock}
        onOpenChange={setConfirmBlock}
        title={T.blockTitle}
        body={T.blockBody}
        confirmLabel={T.blockCta}
        cancelLabel={t.common.cancel}
        busy={isPending}
        onConfirm={toggleBlock}
      />

      <GlassModal open={reportOpen} onOpenChange={setReportOpen} title={T.reportTitle} description={T.reportBody}>
        <fieldset>
          <legend className="text-[13px] font-medium text-slate-700 mb-2">{T.reportReason}</legend>
          <div className="space-y-1.5">
            {REPORT_REASONS.map((r) => (
              <label
                key={r}
                className="flex items-center gap-3 px-3.5 py-2.5 min-h-[44px] rounded-xl cursor-pointer text-sm text-slate-700"
                style={{
                  background: reason === r ? "var(--selected)" : "var(--surface)",
                  border: `1px solid ${reason === r ? "var(--hairline)" : "var(--hairline-soft)"}`,
                }}
              >
                <input
                  type="radio"
                  name="report-reason"
                  value={r}
                  checked={reason === r}
                  onChange={() => setReason(r)}
                  className="accent-slate-900"
                />
                {REASON_LABEL[r]}
              </label>
            ))}
          </div>
        </fieldset>

        <label htmlFor="report-details" className="block text-[13px] font-medium text-slate-700 mt-4 mb-1.5">
          {T.reportDetails}
        </label>
        <textarea
          id="report-details"
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          rows={3}
          maxLength={2000}
          className="input-glass w-full px-3.5 py-2.5 text-sm rounded-xl outline-none text-slate-800 resize-none"
        />

        <div className="flex flex-col sm:flex-row gap-2.5 mt-6">
          <button
            type="button"
            onClick={submitReport}
            disabled={isPending}
            className="btn-spring flex-1 rounded-[10px] px-4 py-[9px] min-h-[44px] text-sm font-semibold disabled:opacity-45"
            style={DANGER_BTN}
          >
            {T.reportSubmit}
          </button>
          <ModalGlassButton onClick={() => setReportOpen(false)}>{t.common.cancel}</ModalGlassButton>
        </div>
      </GlassModal>
    </>
  );
}
