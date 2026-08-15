"use client";

// ─── Command palette (⌘K) ────────────────────────────────────────────────────
// Navigate the panel, start a visit, copy the booking link, find a client.
//
// This surface deliberately does NOT animate open. It is keyboard-initiated and
// a power user hits it a hundred times a day; any entrance makes the fastest
// path through the product feel like the slowest, and the panel is what the
// user is already looking at when they press the key. Only the scrim fades, and
// only far enough to read as a dimming rather than a transition. The scrim also
// does not blur: blurring the entire viewport on every ⌘K is the single most
// expensive thing this interaction could do.

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { motion } from "framer-motion";
import { DUR } from "@/lib/motion";
import { CHROME_STRONG, SCRIM } from "@/components/ui/glass/tokens";
import { useT } from "@/components/i18n/i18n-provider";
import { cn } from "@/lib/utils";
import { interpolate } from "@/lib/i18n/dictionaries";
import { searchClients } from "@/lib/actions/appointments";
import type { NavKey } from "@/components/layout/business-nav";

type ClientResult = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
};

type Command = {
  id: string;
  label: string;
  hint?: string;
  section: "actions" | "navigation";
  keywords: string;
  run: () => void;
};

const PANEL_STYLE: React.CSSProperties = {
  ...CHROME_STRONG,
  border: "1px solid var(--hairline)",
  boxShadow: "var(--e4)",
};

// The nav key indexes dict.businessNav for the visible label; the keyword list
// stays multilingual so search keeps working in every language.
const NAV_TARGETS: { key: NavKey; href: string; keywords: string }[] = [
  { key: "today", href: "/business/dashboard", keywords: "dzis dashboard pulpit start dzisiaj today heute bugun" },
  { key: "calendar", href: "/business/calendar", keywords: "kalendarz wizyty terminy calendar kalender takvim" },
  { key: "clients", href: "/business/crm", keywords: "klienci crm customers baza clients kunden musteri" },
  { key: "services", href: "/business/services", keywords: "uslugi cennik services oferta leistungen hizmet" },
  { key: "team", href: "/business/staff", keywords: "zespol pracownicy staff team ekip" },
  { key: "hours", href: "/business/hours", keywords: "godziny otwarcia hours praca zeiten saat" },
  { key: "ai", href: "/business/ai", keywords: "ai asystent obserwacje insights assistant asistan" },
  { key: "marketing", href: "/business/marketing", keywords: "marketing kampanie sms email kampagne pazarlama" },
  { key: "coupons", href: "/business/coupons", keywords: "kupony promocje coupons rabaty gutschein kupon" },
  { key: "invoices", href: "/business/invoices", keywords: "faktury rozliczenia sprzedaz invoices rechnungen fatura" },
  { key: "analytics", href: "/business/analytics", keywords: "analityka raporty analytics statystyki analysen analitik" },
  { key: "reviews", href: "/business/reviews", keywords: "opinie recenzje reviews oceny bewertungen degerlendirme" },
  { key: "payments", href: "/business/payments", keywords: "platnosci payments stripe wyplaty zahlungen odeme" },
  { key: "settings", href: "/business/settings", keywords: "ustawienia settings konto profil salonu einstellungen ayarlar" },
];

export function CommandPalette({ businessSlug }: { businessSlug?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const t = useT();
  const a = t.a11y;
  const P = t.pages.palette;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const [clients, setClients] = useState<ClientResult[]>([]);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ⌘K / Ctrl+K + topbar trigger event
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    const onOpenEvent = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("tc-palette", onOpenEvent);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("tc-palette", onOpenEvent);
    };
  }, []);

  // Reset on open/close
  useEffect(() => {
    if (open) {
      setQuery("");
      setClients([]);
      setActiveIdx(0);
      setCopied(false);
    }
  }, [open]);

  // Route changed — the palette's job is done
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Debounced client search
  useEffect(() => {
    if (!open || query.trim().length < 2) {
      setClients([]);
      return;
    }
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      try {
        const found = await searchClients(query);
        setClients(found as ClientResult[]);
      } catch {
        setClients([]);
      }
    }, 250);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [query, open]);

  const close = useCallback(() => setOpen(false), []);

  const commands = useMemo<Command[]>(() => {
    const go = (href: string) => () => {
      close();
      router.push(href);
    };
    const actions: Command[] = [
      {
        id: "new-appointment",
        label: t.businessNav.newAppointment,
        hint: P.newAppointmentHint,
        section: "actions",
        keywords: "nowa wizyta rezerwacja dodaj klient new appointment",
        run: go("/business/calendar?action=new"),
      },
      ...(businessSlug
        ? [
            {
              id: "copy-link",
              label: copied ? t.common.copied : P.copyBookingLink,
              hint: `/b/${businessSlug}`,
              section: "actions" as const,
              keywords: "kopiuj link rezerwacja booking url copy",
              run: () => {
                navigator.clipboard
                  .writeText(`${window.location.origin}/b/${businessSlug}`)
                  .then(() => {
                    setCopied(true);
                    setTimeout(() => close(), 600);
                  })
                  .catch(() => close());
              },
            },
            {
              id: "open-profile",
              label: P.openPublicProfile,
              hint: P.newTab,
              section: "actions" as const,
              keywords: "profil publiczny podglad public profile open",
              run: () => {
                window.open(`/b/${businessSlug}`, "_blank", "noopener");
                close();
              },
            },
          ]
        : []),
      ...NAV_TARGETS.map((target) => ({
        id: `nav-${target.href}`,
        label: t.businessNav[target.key],
        section: "navigation" as const,
        keywords: target.keywords,
        run: go(target.href),
      })),
    ];
    return actions;
  }, [businessSlug, router, close, copied, t, P]);

  const q = query.trim().toLowerCase();
  const filteredCommands = q
    ? commands.filter(
        (c) => c.label.toLowerCase().includes(q) || c.keywords.includes(q)
      )
    : commands;

  // Flat list for keyboard navigation: commands then clients
  const flatItems = [
    ...filteredCommands.map((c) => ({ kind: "command" as const, command: c })),
    ...clients.map((c) => ({ kind: "client" as const, client: c })),
  ];

  useEffect(() => {
    setActiveIdx(0);
  }, [query, clients.length]);

  function runItem(idx: number) {
    const item = flatItems[idx];
    if (!item) return;
    if (item.kind === "command") {
      item.command.run();
    } else {
      close();
      router.push(`/business/crm?q=${encodeURIComponent(`${item.client.firstName} ${item.client.lastName}`)}`);
    }
  }

  function onInputKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, flatItems.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      runItem(activeIdx);
    }
  }

  let renderIdx = -1;

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: DUR.press / 1000 }}
                className="fixed inset-0"
                style={{ ...SCRIM, zIndex: "var(--z-palette)" }}
              />
            </Dialog.Overlay>
            <div
              className="fixed inset-0 flex items-start justify-center pt-[12dvh] px-4 pointer-events-none"
              style={{ zIndex: "var(--z-palette)" }}
            >
              <Dialog.Content
                asChild
                forceMount
                onOpenAutoFocus={(e) => {
                  e.preventDefault();
                  inputRef.current?.focus();
                }}
              >
                {/* No entrance: the panel is simply there on the next frame. */}
                <div
                  className="relative w-full max-w-lg rounded-[18px] overflow-hidden pointer-events-auto"
                  style={PANEL_STYLE}
                >
                  <Dialog.Title className="sr-only">{P.title}</Dialog.Title>
                  <Dialog.Description className="sr-only">{a.palettePlaceholder}</Dialog.Description>

                  {/* Input */}
                  <div className="flex items-center gap-3 px-4" style={{ borderBottom: "1px solid var(--hairline-soft)" }}>
                    <svg className="w-4 h-4 text-slate-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                    </svg>
                    <input
                      ref={inputRef}
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={onInputKeyDown}
                      placeholder={a.palettePlaceholder}
                      className="flex-1 py-3.5 text-sm bg-transparent outline-none placeholder:text-slate-400 text-slate-900"
                      role="combobox"
                      aria-expanded="true"
                      aria-controls="palette-list"
                      aria-activedescendant={flatItems[activeIdx] ? `palette-item-${activeIdx}` : undefined}
                    />
                    <kbd
                      className="text-[10px] font-semibold px-1.5 py-0.5 rounded flex-shrink-0"
                      style={{ background: "var(--surface-inset)", border: "1px solid var(--hairline-soft)", color: "var(--text-muted)" }}
                    >
                      Esc
                    </kbd>
                  </div>

                  {/* Results */}
                  <div id="palette-list" role="listbox" aria-label={a.results} className="max-h-[52dvh] overflow-y-auto p-2">
                    {flatItems.length === 0 && (
                      <p className="px-3 py-6 text-center text-sm text-slate-500">
                        {interpolate(P.noResults, { q: query })}
                      </p>
                    )}

                    {(["actions", "navigation"] as const).map((section) => {
                      const sectionCommands = filteredCommands.filter((c) => c.section === section);
                      if (sectionCommands.length === 0) return null;
                      return (
                        <div key={section} className="mb-1">
                          <p className="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400 select-none">
                            {section === "actions" ? P.sectionActions : P.sectionNavigation}
                          </p>
                          {sectionCommands.map((c) => {
                            renderIdx += 1;
                            const idx = renderIdx;
                            const active = idx === activeIdx;
                            return (
                              <button
                                key={c.id}
                                id={`palette-item-${idx}`}
                                role="option"
                                aria-selected={active}
                                type="button"
                                onClick={() => runItem(idx)}
                                onPointerEnter={() => setActiveIdx(idx)}
                                className={cn(
                                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-left transition-colors",
                                  active ? "text-white" : "text-slate-700"
                                )}
                                style={active ? { background: "var(--ink-raised)" } : undefined}
                              >
                                <span className="text-sm font-medium flex-1 truncate">{c.label}</span>
                                {c.hint && (
                                  <span className={cn("text-xs truncate", active ? "text-white/60" : "text-slate-400")}>
                                    {c.hint}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      );
                    })}

                    {clients.length > 0 && (
                      <div className="mb-1">
                        <p className="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400 select-none">
                          {t.businessNav.clients}
                        </p>
                        {clients.map((c) => {
                          renderIdx += 1;
                          const idx = renderIdx;
                          const active = idx === activeIdx;
                          return (
                            <button
                              key={c.id}
                              id={`palette-item-${idx}`}
                              role="option"
                              aria-selected={active}
                              type="button"
                              onClick={() => runItem(idx)}
                              onPointerEnter={() => setActiveIdx(idx)}
                              className={cn(
                                "w-full flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-left transition-colors",
                                active ? "text-white" : "text-slate-700"
                              )}
                              style={active ? { background: "var(--ink-raised)" } : undefined}
                            >
                              <span
                                className={cn(
                                  "w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold flex-shrink-0",
                                  active ? "text-white" : "text-slate-600"
                                )}
                                style={{
                                  background: active ? "rgba(255,255,255,0.15)" : "rgba(203,213,225,0.25)",
                                  border: active ? "1px solid rgba(255,255,255,0.20)" : "1px solid var(--hairline)",
                                }}
                              >
                                {c.firstName[0]}{c.lastName[0]}
                              </span>
                              <span className="text-sm font-medium flex-1 truncate">
                                {c.firstName} {c.lastName}
                              </span>
                              <span className={cn("text-xs truncate tabular-nums", active ? "text-white/60" : "text-slate-400")}>
                                {c.phone ?? c.email}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </Dialog.Content>
            </div>
          </Dialog.Portal>
      )}
    </Dialog.Root>
  );
}
