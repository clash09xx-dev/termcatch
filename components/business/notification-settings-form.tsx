"use client";

import { useActionState, useState } from "react";
import {
  updateNotificationSettingsAction,
  type NotificationSettingsState,
} from "@/lib/actions/notification-settings";
import type { BusinessNotificationSettings } from "@/lib/notification-settings";

const initialState: NotificationSettingsState = {};

const inputCls =
  "w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-400 transition-colors";

function Toggle({
  checked,
  onChange,
  name,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  name: string;
}) {
  return (
    <>
      <input type="checkbox" name={name} checked={checked} readOnly className="hidden" />
      <button
        type="button"
        onClick={() => onChange(!checked)}
        role="switch"
        aria-checked={checked}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ml-4 mt-0.5 ${
          checked ? "bg-gray-900" : "bg-gray-300"
        }`}
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
  const [sms, setSms] = useState(initial.smsEnabled);
  const [whatsapp, setWhatsapp] = useState(initial.whatsappEnabled);

  return (
    <form action={formAction} className="bg-white border border-gray-100 rounded-2xl p-6 space-y-4">
      <h3 className="text-sm font-semibold text-gray-900">Powiadomienia o rezerwacjach</h3>
      <p className="text-sm text-gray-500">
        Wybierz, jak chcesz dostawać informacje o nowych, przełożonych i anulowanych
        wizytach. Powiadomienia w aplikacji mobilnej pojawią się wraz z premierą aplikacji.
      </p>

      {/* E-mail */}
      <div className="flex items-start justify-between p-4 bg-gray-50 rounded-xl">
        <div>
          <p className="text-sm font-medium text-gray-900">E-mail</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Wiadomości na adres salonu o każdym zdarzeniu. Bez dodatkowych kosztów.
          </p>
        </div>
        <Toggle name="emailEnabled" checked={email} onChange={setEmail} />
      </div>

      {/* SMS */}
      <div className="p-4 bg-gray-50 rounded-xl">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900">SMS</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Krótki SMS przy nowej rezerwacji i anulowaniu.
            </p>
          </div>
          <Toggle name="smsEnabled" checked={sms} onChange={setSms} />
        </div>
        {sms && (
          <div className="mt-3">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Numer telefonu dla SMS
            </label>
            <input
              type="tel"
              name="smsPhone"
              defaultValue={initial.smsPhone}
              placeholder="+48 600 000 000"
              className={inputCls}
            />
          </div>
        )}
        {!sms && <input type="hidden" name="smsPhone" value={initial.smsPhone} />}
      </div>

      {/* WhatsApp */}
      <div className="p-4 bg-gray-50 rounded-xl">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900">WhatsApp</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Wiadomość WhatsApp przy nowej rezerwacji i anulowaniu.
            </p>
          </div>
          <Toggle name="whatsappEnabled" checked={whatsapp} onChange={setWhatsapp} />
        </div>
        {whatsapp && (
          <div className="mt-3">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Numer WhatsApp
            </label>
            <input
              type="tel"
              name="whatsappPhone"
              defaultValue={initial.whatsappPhone}
              placeholder="+48 600 000 000"
              className={inputCls}
            />
          </div>
        )}
        {!whatsapp && <input type="hidden" name="whatsappPhone" value={initial.whatsappPhone} />}
      </div>

      {state.error && (
        <div className="px-4 py-3 bg-red-50 border border-red-100 rounded-xl">
          <p className="text-sm text-red-600">{state.error}</p>
        </div>
      )}
      {state.success && (
        <div className="px-4 py-3 bg-emerald-50 border border-emerald-100 rounded-xl">
          <p className="text-sm text-emerald-700">{state.success}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="px-5 py-2.5 bg-gray-900 hover:bg-gray-800 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors"
      >
        {isPending ? "Zapisywanie..." : "Zapisz ustawienia"}
      </button>
    </form>
  );
}
