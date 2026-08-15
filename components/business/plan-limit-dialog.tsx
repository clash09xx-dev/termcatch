"use client";

import Link from "next/link";
import type { PlanLimitInfo } from "@/lib/entitlements";
import { useT } from "@/components/i18n/i18n-provider";
import { GlassModal, ModalGlassButton } from "@/components/ui/glass-modal";
import { INK_BTN } from "@/components/ui/glass/tokens";

/**
 * Blocking upgrade dialog shown when a plan limit is hit server-side. Honest:
 * it never pretends the upgrade succeeded — the CTA leads to the billing route
 * where the Stripe upgrade / Customer Portal is available.
 *
 * Built on GlassModal rather than a hand-rolled div, so it inherits the focus
 * trap, Escape, scroll lock, focus restore and the symmetric enter/exit that
 * every other overlay in the product has.
 */
export function PlanLimitDialog({ info, onClose }: { info: PlanLimitInfo; onClose: () => void }) {
  const t = useT();
  const T = t.pages.planLimit;

  const title = info.resource === "employee" ? T.employeeTitle : T.locationTitle;
  const word = info.resource === "employee" ? T.employeeWord : T.locationWord;

  return (
    <GlassModal open onOpenChange={(o) => { if (!o) onClose(); }} title={title}>
      <p className="text-[13.5px] leading-[1.55] text-secondary">
        {T.bodyPre} <span className="font-semibold text-slate-900">{info.planLabel}</span>{" "}
        {T.bodyMid} <span className="font-semibold text-slate-900 tabular-nums">{info.limit}</span> {word}.{" "}
        {T.bodyUsed} <span className="font-semibold text-slate-900 tabular-nums">{info.used}</span>.
      </p>
      {info.requiredPlanLabel && (
        <p className="text-[13.5px] leading-[1.55] text-secondary mt-2.5">
          {info.resource === "employee" ? T.upgradeEmployee : T.upgradeLocation}{" "}
          <span className="font-semibold text-slate-900">{info.requiredPlanLabel}</span>.
        </p>
      )}
      <div className="flex flex-col sm:flex-row gap-2.5 mt-6">
        <Link
          href="/business/payments?upgrade=1"
          data-on-ink
          className="btn-spring flex-1 text-center rounded-[10px] px-4 py-[9px] min-h-[38px] text-sm font-semibold"
          style={INK_BTN}
        >
          {T.upgradeCta}
        </Link>
        <ModalGlassButton onClick={onClose}>{t.common.close}</ModalGlassButton>
      </div>
    </GlassModal>
  );
}
