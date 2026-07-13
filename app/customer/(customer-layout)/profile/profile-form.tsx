"use client";

import { useActionState } from "react";
import { updateProfileAction, type ProfileState } from "@/lib/actions/profile";
import { logoutAction } from "@/actions/auth";
import { getInitials } from "@/lib/utils";
import {
  PageHeader,
  GlassCard,
  InkButton,
  GlassButton,
  ChromeAvatar,
} from "@/components/ui/glass";

interface ProfileFormProps {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
}

const initialState: ProfileState = {};

const INPUT_CLS =
  "input-glass w-full px-3.5 py-2.5 rounded-xl text-sm outline-none text-slate-800 placeholder:text-slate-400";
const LABEL_CLS = "block text-sm font-medium text-slate-700 mb-1.5";

export default function ProfileForm({ firstName, lastName, phone, email }: ProfileFormProps) {
  const [state, formAction, isPending] = useActionState(updateProfileAction, initialState);

  return (
    <div className="space-y-5 max-w-xl">
      <PageHeader title="Mój profil" subtitle="Twoje dane osobowe i preferencje" />

      {/* Avatar */}
      <GlassCard className="fade-rise fade-rise-d1 p-6">
        <div className="flex items-center gap-5">
          <ChromeAvatar size="lg" initials={getInitials(firstName, lastName) || "U"} className="w-16 h-16 text-xl rounded-2xl" />
          <div>
            <p className="text-sm font-semibold text-slate-900">
              {firstName} {lastName}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">{email}</p>
          </div>
        </div>
      </GlassCard>

      {/* Form */}
      <GlassCard className="fade-rise fade-rise-d2 p-6">
        <form action={formAction}>
          <h3 className="text-sm font-semibold text-slate-900 mb-5">Dane osobowe</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="pf-first" className={LABEL_CLS}>Imię</label>
                <input
                  id="pf-first"
                  type="text"
                  name="firstName"
                  defaultValue={firstName}
                  placeholder="Jan"
                  required
                  className={INPUT_CLS}
                />
              </div>
              <div>
                <label htmlFor="pf-last" className={LABEL_CLS}>Nazwisko</label>
                <input
                  id="pf-last"
                  type="text"
                  name="lastName"
                  defaultValue={lastName}
                  placeholder="Kowalski"
                  required
                  className={INPUT_CLS}
                />
              </div>
            </div>

            <div>
              <label htmlFor="pf-phone" className={LABEL_CLS}>Numer telefonu</label>
              <input
                id="pf-phone"
                type="tel"
                name="phone"
                defaultValue={phone}
                placeholder="+48 000 000 000"
                className={`${INPUT_CLS} tabular-nums`}
              />
            </div>

            {state.error && (
              <div
                role="alert"
                className="px-4 py-3 rounded-xl"
                style={{ background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.25)" }}
              >
                <p className="text-sm font-medium" style={{ color: "#BE123C" }}>{state.error}</p>
              </div>
            )}
            {state.success && (
              <div
                className="px-4 py-3 rounded-xl"
                style={{ background: "rgba(16,185,129,0.10)", border: "1px solid rgba(16,185,129,0.25)" }}
              >
                <p className="text-sm font-medium" style={{ color: "#047857" }}>{state.success}</p>
              </div>
            )}

            <InkButton type="submit" disabled={isPending}>
              {isPending ? "Zapisywanie…" : "Zapisz zmiany"}
            </InkButton>
          </div>
        </form>
      </GlassCard>

      {/* Account */}
      <GlassCard className="fade-rise fade-rise-d3 p-6">
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Konto</h3>
        <form action={logoutAction}>
          <GlassButton type="submit">Wyloguj się</GlassButton>
        </form>
      </GlassCard>
    </div>
  );
}
