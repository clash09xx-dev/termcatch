"use client";

import { useState, useTransition } from "react";
import { acceptInvitation } from "@/lib/actions/employee-invitations";
import { InkButton } from "@/components/ui/glass";
import { PasswordInput } from "@/components/ui/password-input";

const INPUT = "input-glass w-full rounded-xl px-3.5 py-2.5 text-sm text-slate-800 outline-none placeholder:text-slate-400";

export function InviteForm({ token, email }: { token: string; email: string }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) return setError("Hasło musi mieć co najmniej 8 znaków.");
    if (password !== confirm) return setError("Hasła nie są takie same.");
    start(async () => {
      // Redirects to /employee/dashboard on success; only returns on error.
      const res = await acceptInvitation(token, password);
      if (res && !res.ok) setError(res.error);
    });
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500">E-mail</label>
        <input value={email} disabled className={INPUT} />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500" htmlFor="pw">Ustaw hasło</label>
        <PasswordInput id="pw" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="min. 8 znaków" className={INPUT} autoComplete="new-password" />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500" htmlFor="pw2">Powtórz hasło</label>
        <PasswordInput id="pw2" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={INPUT} autoComplete="new-password" />
      </div>
      {error && <p className="text-xs" style={{ color: "#BE123C" }}>{error}</p>}
      <InkButton type="submit" disabled={pending} className="w-full">{pending ? "Tworzę konto…" : "Aktywuj konto"}</InkButton>
    </form>
  );
}
