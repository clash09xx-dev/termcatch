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
  smsAvailable = false,
}: {
  initial: BusinessNotificationSettings;
  /** Platform SMS gateway is live (SMS_ENABLED + Twilio configured). */
  smsAvailable?: boolean;
}) {
  const [state, formAction, isPending] = useActionState(
    updateNotificationSettingsAction,
    initialState
  );
  const [email, setEmail] = useState(initial.emailEnabled);
  const [sms, setSms] = useState(initial.smsEnabled);
  const [smsPhone, setSmsPhone] = useState(initial.smsPhone ?? "");

  return (
    <form action={formAction} className="rounded-[20px] p-6 space-y-4" style={ELEV_RAISED}>
      <h3 className="text-sm font-semibold text-slate-900">Powiadomienia o rezerwacjach</h3>
      <p className="text-sm text-slate-500 leading-relaxed">
        Wybierz, jak chcesz dostawać informacje o nowych, przełożonych i anulowanych
        wizytach. Powiadomienia w aplikacji mobilnej pojawią się wraz z premierą aplikacji.
      </p>

      {/* WhatsApp stays off for now — preserve its stored values. */}
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

      {/* SMS */}
      <div className="p-4 rounded-xl" style={CHIP}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-slate-800">SMS</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Krótki SMS przy nowej rezerwacji i anulowaniu.
            </p>
          </div>
          <Toggle name="smsEnabled" checked={sms} onChange={setSms} />
        </div>

        {sms ? (
          <div className="mt-3">
            <label htmlFor="smsPhone" className="block text-xs font-medium text-slate-600 mb-1">
              Numer telefonu do powiadomień SMS
            </label>
            <input
              id="smsPhone"
              name="smsPhone"
              type="tel"
              inputMode="tel"
              value={smsPhone}
              onChange={(e) => setSmsPhone(e.target.value)}
              placeholder="+48 600 000 000"
              maxLength={20}
              className="w-full text-sm px-3 py-2 rounded-lg bg-white/70 outline-none focus:ring-2 focus:ring-slate-900/10"
              style={{ border: "1px solid rgba(148,163,184,0.35)" }}
            />
            {!smsAvailable && (
              <p className="text-[11px] mt-2 leading-relaxed" style={{ color: "#B45309" }}>
                Wysyłka SMS uruchomi się, gdy aktywujemy bramkę SMS na koncie. Ustawienie
                zapiszemy już teraz i zadziała automatycznie po włączeniu.
              </p>
            )}
          </div>
        ) : (
          // Preserve a previously saved number when SMS is toggled off.
          <input type="hidden" name="smsPhone" value={smsPhone} />
        )}
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
