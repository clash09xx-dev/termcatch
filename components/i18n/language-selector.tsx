"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setLocale } from "@/lib/actions/locale";
import { LOCALES, LOCALE_LABEL, LOCALE_FLAG, LOCALE_CODE, type Locale } from "@/lib/i18n/config";
import { useI18n } from "@/components/i18n/i18n-provider";

/**
 * Language switcher (native <select> — accessible, low-noise, one-tap).
 *
 * `compact` renders just "🇵🇱 PL" (flag + standard code) for tight spots like the
 * mobile header, sitting NEXT TO the menu button rather than inside the menu.
 * Non-compact shows the full endonym ("Polski", "Deutsch", …) for desktop.
 */
export function LanguageSelector({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
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

  const defaultCls = compact
    ? "cursor-pointer rounded-lg border border-slate-200/70 bg-white/70 px-1.5 py-1.5 text-xs font-semibold text-slate-700 outline-none hover:bg-white disabled:opacity-60"
    : "cursor-pointer rounded-lg border border-slate-200 bg-white/70 px-2 py-1.5 text-sm text-slate-700 outline-none hover:bg-white disabled:opacity-60";

  return (
    <select
      value={locale}
      disabled={pending}
      onChange={(e) => change(e.target.value)}
      aria-label={t.lang.change}
      title={t.lang.change}
      className={className ?? defaultCls}
    >
      {LOCALES.map((l) => (
        <option key={l} value={l}>
          {LOCALE_FLAG[l]} {compact ? LOCALE_CODE[l] : LOCALE_LABEL[l]}
        </option>
      ))}
    </select>
  );
}
