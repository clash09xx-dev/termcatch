"use client";

import { useActionState } from "react";
import { updateProfileAction, type ProfileState } from "@/lib/actions/profile";
import { logoutAction } from "@/actions/auth";
import { getInitials } from "@/lib/utils";

interface ProfileFormProps {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
}

const initialState: ProfileState = {};

export default function ProfileForm({ firstName, lastName, phone, email }: ProfileFormProps) {
  const [state, formAction, isPending] = useActionState(updateProfileAction, initialState);

  const inputCls =
    "w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-400 transition-colors";

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Mój profil</h2>
        <p className="text-sm text-gray-500 mt-1">Twoje dane osobowe i preferencje</p>
      </div>

      {/* Avatar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-full bg-gray-900 flex items-center justify-center text-xl font-bold text-white">
            {getInitials(firstName, lastName) || "U"}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">
              {firstName} {lastName}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">{email}</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form action={formAction} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-5">Dane osobowe</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Imię</label>
              <input
                type="text"
                name="firstName"
                defaultValue={firstName}
                placeholder="Jan"
                required
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Nazwisko</label>
              <input
                type="text"
                name="lastName"
                defaultValue={lastName}
                placeholder="Kowalski"
                required
                className={inputCls}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Numer telefonu</label>
            <input
              type="tel"
              name="phone"
              defaultValue={phone}
              placeholder="+48 000 000 000"
              className={inputCls}
            />
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
            {isPending ? "Zapisywanie..." : "Zapisz zmiany"}
          </button>
        </div>
      </form>

      {/* Account */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Konto</h3>
        <form action={logoutAction}>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
          >
            Wyloguj się
          </button>
        </form>
      </div>
    </div>
  );
}
