"use client";

import { useActionState, useState } from "react";
import {
  updateNotificationSettingsAction,
  type NotificationSettingsState,
} from "@/lib/actions/notification-settings";
import type { BusinessNotificationSettings } from "@/lib/notification-settings";
import { ELEV_RAISED, CHIP, INK_BTN } from "@/components/ui/glass/tokens";

const initialState: NotificationSettingsState = {};

function Toggle({
  checked,
  onChange,
  name,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  name: string;
  disabled?: boolean;
}) {
  return (
    <>
      <input type="checkbox" name={name} checked={checked} readOnly className="hidden" />
      <button
        type="button"
        onClick={() => !disabled && onChange(!checked)}
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ml-4 mt-0.5 ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
        style={{ background: checked && !disabled ? "#0F172A" : "rgba(148,163,184,0.45)" }}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </>
  );
}

export function NotificationSettingsForm({
  initial,
}: {
  initial: BusinessNotificationSettings;
}) {
  const [state, formAction, isPending] = useActionState(
    updateNotificationSettingsAction,
    initialState
  );
  const [email, setEmail] = useState(initial.emailEnabled);

  return (
    <form action={formAction} className="rounded-[20px] p-6 space-y-4" style={ELEV_RAISED}>
      <h3 className="text-sm font-semibold text-slate-900">Powiadomienia o rezerwacjach</h3>
      <p className="text-sm text-slate-500 leading-relaxed">
        Wybierz, jak chcesz dostawać informacje o nowych, przełożonych i anulowanych
        wizytach. Powiadomienia w aplikacji mobilnej pojawią się wraz z premierą aplikacji.
      </p>

      {/* Hidden fields to preserve SMS/WhatsApp values in DB */}
      <input type="hidden" name="smsEnabled" value="false" />
      <input type="hidden" name="smsPhone" value={initial.smsPhone ?? ""} />
      <input type="hidden" name="whatsappEnabled" value="false" />
      <input type="hidden" name="whatsappPhone" value={initial.whatsappPhone ?? ""} />

      {/* E-mail */}
      <div className="flex items-start justify-between p-4 rounded-xl" style={CHIP}>
        <div>
          <p className="text-sm font-medium text-slate-800">E-mail</p>
          <p className="text-xs text-slate-500 mt-0.5">
            Wiadomości na adres salonu o każdym zdarzeniu. Bez dodatkowych kosztów.
          </p>
        </div>
        <Toggle name="emailEnabled" checked={email} onChange={setEmail} />
      </div>

      {/* SMS — disabled / coming soon */}
      <div className="p-4 rounded-xl opacity-60" style={CHIP}>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-slate-800">SMS</p>
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold text-slate-500"
                style={{ background: "rgba(203,213,225,0.35)", border: "1px solid rgba(203,213,225,0.50)" }}
              >
                Wkrótce
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Krótki SMS przy nowej rezerwacji i anulowaniu.
            </p>
          </div>
          <Toggle name="_smsDisabled" checked={false} onChange={() => {}} disabled />
        </div>
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

      <button
        type="submit"
        disabled={isPending}
        className="btn-spring px-5 py-2.5 text-sm font-semibold rounded-xl disabled:opacity-50"
        style={INK_BTN}
      >
        {isPending ? "Zapisywanie…" : "Zapisz ustawienia"}
      </button>
    </form>
  );
}
