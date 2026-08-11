"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { inviteEmployee, resendInvitation, revokeInvitation, type InviteResult } from "@/lib/actions/employee-invitations";
import { startViewAs } from "@/lib/actions/view-as";
import { CHIP } from "@/components/ui/glass/tokens";

const LABEL: Record<string, string> = {
  pending: "Zaproszenie wysłane", accepted: "Konto aktywne", expired: "Zaproszenie wygasło", revoked: "Zaproszenie cofnięte",
};

export function EmployeeAccountControls({
  employeeId, hasAccount, hasEmail, inviteStatus,
}: {
  employeeId: string; hasAccount: boolean; hasEmail: boolean; inviteStatus: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function act(fn: () => Promise<InviteResult>) {
    setMsg(null);
    start(async () => {
      const r = await fn();
      if (!r.ok) setMsg(r.error ?? "Błąd.");
      else router.refresh();
    });
  }

  if (hasAccount) {
    return (
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-200/60 pt-3">
        <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-emerald-700" style={{ background: "rgba(16,185,129,0.1)" }}>Konto aktywne</span>
        <button type="button" disabled={pending} onClick={() => start(() => { void startViewAs(employeeId); })}
          className="ml-auto text-xs font-semibold text-slate-600 hover:text-slate-900">
          Podgląd jako pracownik →
        </button>
      </div>
    );
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-200/60 pt-3">
      {inviteStatus === "pending" ? (
        <>
          <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-slate-500" style={CHIP}>{LABEL.pending}</span>
          <button type="button" disabled={pending} onClick={() => act(() => resendInvitation(employeeId))} className="text-xs font-medium text-slate-500 hover:text-slate-900">Wyślij ponownie</button>
          <button type="button" disabled={pending} onClick={() => act(() => revokeInvitation(employeeId))} className="text-xs font-medium text-slate-400 hover:text-rose-600">Cofnij</button>
        </>
      ) : (
        <>
          {inviteStatus && inviteStatus !== "accepted" && (
            <span className="rounded-full px-2 py-0.5 text-[10px] font-medium text-slate-400" style={CHIP}>{LABEL[inviteStatus] ?? ""}</span>
          )}
          <button type="button" disabled={pending || !hasEmail} onClick={() => act(() => inviteEmployee(employeeId))}
            title={hasEmail ? undefined : "Dodaj adres e-mail pracownika, aby wysłać zaproszenie"}
            className="text-xs font-semibold text-slate-700 hover:text-slate-900 disabled:opacity-50">
            {pending ? "Wysyłam…" : "Zaproś do TermCatch"}
          </button>
        </>
      )}
      {msg && <span className="w-full text-xs" style={{ color: "#BE123C" }}>{msg}</span>}
    </div>
  );
}
