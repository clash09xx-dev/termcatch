import Link from "next/link";
import type { Metadata } from "next";
import { cookies } from "next/headers";

/**
 * Custom 404.
 *
 * Deliberately a SERVER component, unlike the sibling error boundary: a
 * not-found response has no client-side state to recover, so the locale can be
 * read on the server and the page ships no JavaScript. Copy is inlined for the
 * same reason `app/error.tsx` inlines it — this file renders inside the root
 * layout but must not depend on the i18n provider tree resolving, since a 404
 * can be served for a path that never matched a layout with one.
 *
 * `robots: noindex` matters: without it a crawler can index the 404 body under
 * whatever wrong URL produced it, and those entries then compete with the real
 * pages in search results.
 */

export const metadata: Metadata = {
  title: "Nie znaleziono strony",
  robots: { index: false, follow: false },
};

type Copy = { title: string; body: string; home: string; search: string };

const DICT: Record<string, Copy> = {
  pl: {
    title: "Nie znaleziono tej strony",
    body: "Adres jest nieprawidłowy albo strona została przeniesiona. Sprawdź link lub wróć na stronę główną.",
    home: "Strona główna",
    search: "Szukaj salonu",
  },
  en: {
    title: "We couldn't find that page",
    body: "The address is wrong or the page has moved. Check the link, or head back to the homepage.",
    home: "Homepage",
    search: "Find a salon",
  },
  de: {
    title: "Diese Seite wurde nicht gefunden",
    body: "Die Adresse ist falsch oder die Seite wurde verschoben. Prüfen Sie den Link oder gehen Sie zur Startseite.",
    home: "Startseite",
    search: "Salon finden",
  },
  tr: {
    title: "Bu sayfayı bulamadık",
    body: "Adres hatalı ya da sayfa taşınmış. Bağlantıyı kontrol edin veya ana sayfaya dönün.",
    home: "Ana sayfa",
    search: "Salon bul",
  },
};

export default async function NotFound() {
  const jar = await cookies();
  const raw = jar.get("tc-locale")?.value;
  const t = DICT[raw && raw in DICT ? raw : "pl"];

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-16">
      <div className="max-w-md text-center">
        <p
          className="text-[64px] font-bold leading-none tabular-nums"
          style={{ color: "rgba(100,116,139,0.28)" }}
          aria-hidden="true"
        >
          404
        </p>
        <h1 className="mt-4 text-xl font-semibold text-slate-900">{t.title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">{t.body}</p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
          <Link
            href="/"
            className="btn-spring inline-flex min-h-[42px] items-center rounded-xl px-5 text-sm font-semibold"
            style={{ background: "var(--ink-raised)", border: "1px solid #0F172A", color: "#F8FAFC" }}
          >
            {t.home}
          </Link>
          <Link
            href="/search"
            className="btn-spring inline-flex min-h-[42px] items-center rounded-xl px-5 text-sm font-medium text-slate-700"
            style={{ background: "var(--surface)", border: "1px solid var(--hairline)" }}
          >
            {t.search}
          </Link>
        </div>
      </div>
    </div>
  );
}
