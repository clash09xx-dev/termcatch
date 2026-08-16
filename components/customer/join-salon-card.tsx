"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GlassCard, InkButton, HAIRLINE, CHIP } from "@/components/ui/glass";
import { useT } from "@/components/i18n/i18n-provider";
import { interpolate } from "@/lib/i18n/dictionaries";
import { notify, errorText } from "@/lib/notify";
import { joinBusinessByCode } from "@/lib/actions/join-code";
import { formatJoinCode, isWellFormedJoinCode } from "@/lib/employee/join-code";

/**
 * The specialist's half of the join-code flow.
 *
 * Lives in customer settings because that is where someone lands after signing
 * up normally — the point of the code is that a specialist does not need a
 * special invite link to get started, only an account and four words from their
 * salon.
 *
 * The four-step explanation is shown by default rather than behind a toggle:
 * this is the one screen where the person genuinely does not yet know what is
 * supposed to happen.
 */
export function JoinSalonCard({
  membership,
}: {
  /**
   * The salon this account already belongs to, resolved server-side.
   *
   * Before this existed the only sign a join had worked was a toast that
   * vanished on the next render: the membership row was created, the role
   * became EMPLOYEE, and the settings page looked exactly as it had a second
   * earlier. Stating it here is the durable confirmation.
   */
  membership: { businessName: string; salonHref: string } | null;
}) {
  const t = useT();
  const T = t.pages.joinSalon;
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [isPending, start] = useTransition();

  const ready = isWellFormedJoinCode(code);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready) { setError(T.errUnknown); return; }
    setError("");
    start(async () => {
      try {
        const res = await joinBusinessByCode(code);
        if (res.ok) {
          notify.saved(interpolate(T.joined, { salon: res.businessName }));
          setCode("");
          // The role may have changed to EMPLOYEE, which changes which panel
          // the shell offers — refresh so the server re-resolves it.
          router.refresh();
        } else {
          setError(res.error);
        }
      } catch (err) {
        setError(errorText(err, t.errors.generic));
      }
    });
  }

  // Already a member: state the relationship and offer the way in. The join
  // form stays below for the (rare) case of joining a second salon, so nothing
  // is taken away.
  if (membership) {
    return (
      <GlassCard className="fade-rise p-6">
        <h3 className="text-[15px] font-semibold text-slate-900 track-heading">{T.memberTitle}</h3>

        <dl className="mt-4 space-y-3">
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-[12px] uppercase tracking-wide text-muted-glass">{T.memberTitle}</dt>
            <dd className="text-[14px] font-semibold text-slate-900 text-right truncate">
              {membership.businessName}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-[12px] uppercase tracking-wide text-muted-glass">{T.memberRoleLabel}</dt>
            <dd className="text-[14px] font-medium text-slate-700 text-right">{T.memberRoleSpecialist}</dd>
          </div>
        </dl>

        <div className="mt-5 pt-5" style={{ borderTop: HAIRLINE }}>
          <Link
            href={membership.salonHref}
            className="btn-spring inline-flex items-center px-4 py-2.5 min-h-[42px] text-sm font-semibold rounded-[10px] text-slate-800"
            style={CHIP}
          >
            {T.memberEnter}
          </Link>
          <p className="mt-3 text-[12px] leading-[1.55] text-muted-glass max-w-[62ch]">{T.memberNote}</p>
        </div>

        <form onSubmit={submit} className="mt-5 pt-5" style={{ borderTop: HAIRLINE }}>
          <label htmlFor="join-code-more" className="block text-[13px] font-medium text-slate-700 mb-1.5">
            {T.memberJoinAnother}
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              id="join-code-more"
              value={code}
              onChange={(e) => { setCode(e.target.value); setError(""); }}
              placeholder={T.codePlaceholder}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "join-code-more-error" : undefined}
              className="input-glass flex-1 px-3.5 py-2.5 min-h-[44px] text-sm rounded-xl outline-none uppercase tracking-[0.12em] tabular-nums text-slate-800 placeholder:text-slate-400 placeholder:tracking-normal"
            />
            <InkButton type="submit" disabled={isPending || !ready}>
              {isPending ? T.joining : T.submit}
            </InkButton>
          </div>
          {error && (
            <p id="join-code-more-error" role="alert" className="mt-2 text-[12.5px] font-medium" style={{ color: "#BE123C" }}>
              {error}
            </p>
          )}
        </form>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="fade-rise p-6">
      <h3 className="text-[15px] font-semibold text-slate-900 track-heading">{T.title}</h3>
      <p className="text-[13px] leading-[1.55] text-secondary mt-1.5 max-w-[62ch]">{T.subtitle}</p>

      <ol className="mt-5 space-y-2" aria-label={T.howTitle}>
        {[T.how1, T.how2, T.how3, T.how4].map((step, i) => (
          <li key={i} className="flex items-start gap-3 text-[13px] text-secondary">
            <span
              className="w-5 h-5 rounded-full flex items-center justify-center text-[10.5px] font-semibold tabular-nums flex-shrink-0 mt-px text-slate-600"
              style={CHIP}
            >
              {i + 1}
            </span>
            {step}
          </li>
        ))}
      </ol>

      <form onSubmit={submit} className="mt-5 pt-5" style={{ borderTop: HAIRLINE }}>
        <label htmlFor="join-code" className="block text-[13px] font-medium text-slate-700 mb-1.5">
          {T.codeLabel}
        </label>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            id="join-code"
            value={code}
            onChange={(e) => { setCode(e.target.value); setError(""); }}
            placeholder={T.codePlaceholder}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "join-code-error" : undefined}
            className="input-glass flex-1 px-3.5 py-2.5 min-h-[44px] text-sm rounded-xl outline-none uppercase tracking-[0.12em] tabular-nums text-slate-800 placeholder:text-slate-400 placeholder:tracking-normal"
          />
          <InkButton type="submit" disabled={isPending || !ready}>
            {isPending ? T.joining : T.submit}
          </InkButton>
        </div>

        {/* Echo the canonical form back so the person can see we read it the
            way they meant it, whatever spacing or case they typed. */}
        {code && ready && !error && (
          <p className="mt-2 text-[12px] text-muted-glass tabular-nums">{formatJoinCode(code)}</p>
        )}
        {error && (
          <p id="join-code-error" role="alert" className="mt-2 text-[12.5px] font-medium" style={{ color: "#BE123C" }}>
            {error}
          </p>
        )}
        <p className="mt-3 text-[12px] leading-[1.55] text-muted-glass max-w-[62ch]">{T.note}</p>
      </form>
    </GlassCard>
  );
}
