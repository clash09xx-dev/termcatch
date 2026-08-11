"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setLocale } from "@/lib/actions/locale";
import { LOCALES, LOCALE_LABEL, LOCALE_FLAG, type Locale } from "@/lib/i18n/config";
import { useI18n } from "@/components/i18n/i18n-provider";

/** Compact language switcher (native select — accessible, low-noise). */
export function LanguageSelector({ className }: { className?: string }) {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();

  function change(value: string) {
    const l = value as Locale;
    if (l === locale) return;
    start(async () => {
      await setLocale(l);
      router.refresh();
    });
  }

  return (
    <select
      value={locale}
      disabled={pending}
      onChange={(e) => change(e.target.value)}
      aria-label={t.lang.change}
      title={t.lang.change}
      className={
        className ??
        "cursor-pointer rounded-lg border border-slate-200 bg-white/70 px-2 py-1.5 text-sm text-slate-700 outline-none hover:bg-white disabled:opacity-60"
      }
    >
      {LOCALES.map((l) => (
        <option key={l} value={l}>
          {LOCALE_FLAG[l]} {LOCALE_LABEL[l]}
        </option>
      ))}
    </select>
  );
}
