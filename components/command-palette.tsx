"use client";

// ─── Command palette (⌘K) ────────────────────────────────────────────────────
// Navigate the panel, start a visit, copy the booking link, find a client.
// Radix Dialog (focus trap, aria) + glass skin + shared motion.

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { motion } from "framer-motion";
import { overlayFade, useReducedMotion } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { searchClients } from "@/lib/actions/appointments";

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
  section: "Akcje" | "Nawigacja";
  keywords: string;
  run: () => void;
};

const PANEL_STYLE: React.CSSProperties = {
  background: "rgba(255,255,255,0.94)",
  backdropFilter: "blur(40px) saturate(200%)",
  WebkitBackdropFilter: "blur(40px) saturate(200%)",
  border: "1px solid rgba(203,213,225,0.50)",
  boxShadow:
    "0 0 0 0.5px rgba(203,213,225,0.40), 0 8px 32px rgba(15,23,42,0.16), 0 32px 80px rgba(15,23,42,0.12), inset 0 1px 0 rgba(255,255,255,0.98)",
};

const paletteIn = {
  hidden: { opacity: 0, y: -12, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring" as const, stiffness: 420, damping: 32 } },
  exit: { opacity: 0, y: -8, scale: 0.98, transition: { duration: 0.12 } },
};

const NAV_TARGETS: { label: string; href: string; keywords: string }[] = [
  { label: "Dziś", href: "/business/dashboard", keywords: "dzis dashboard pulpit start dzisiaj" },
  { label: "Kalendarz", href: "/business/calendar", keywords: "kalendarz wizyty terminy calendar" },
  { label: "Klienci", href: "/business/crm", keywords: "klienci crm customers baza" },
  { label: "Usługi", href: "/business/services", keywords: "uslugi cennik services oferta" },
  { label: "Zespół", href: "/business/staff", keywords: "zespol pracownicy staff team" },
  { label: "Godziny", href: "/business/hours", keywords: "godziny otwarcia hours praca" },
  { label: "AI Asystent", href: "/business/ai", keywords: "ai asystent obserwacje insights" },
  { label: "Marketing", href: "/business/marketing", keywords: "marketing kampanie sms email" },
  { label: "Kupony", href: "/business/coupons", keywords: "kupony promocje coupons rabaty" },
  { label: "Faktury", href: "/business/invoices", keywords: "faktury rozliczenia sprzedaz invoices" },
  { label: "Analityka", href: "/business/analytics", keywords: "analityka raporty analytics statystyki" },
  { label: "Opinie", href: "/business/reviews", keywords: "opinie recenzje reviews oceny" },
  { label: "Płatności", href: "/business/payments", keywords: "platnosci payments stripe wyplaty" },
  { label: "Ustawienia", href: "/business/settings", keywords: "ustawienia settings konto profil salonu" },
];

export function CommandPalette({ businessSlug }: { businessSlug?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
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
        label: "Nowa wizyta",
        hint: "Zapisz klienta",
        section: "Akcje",
        keywords: "nowa wizyta rezerwacja dodaj klient new appointment",
        run: go("/business/calendar?action=new"),
      },
      ...(businessSlug
        ? [
            {
              id: "copy-link",
              label: copied ? "Skopiowano ✓" : "Skopiuj link do rezerwacji",
              hint: `/b/${businessSlug}`,
              section: "Akcje" as const,
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
              label: "Otwórz profil publiczny",
              hint: "Nowa karta",
              section: "Akcje" as const,
              keywords: "profil publiczny podglad public profile open",
              run: () => {
                window.open(`/b/${businessSlug}`, "_blank", "noopener");
                close();
              },
            },
          ]
        : []),
      ...NAV_TARGETS.map((t) => ({
        id: `nav-${t.href}`,
        label: t.label,
        section: "Nawigacja" as const,
        keywords: t.keywords,
        run: go(t.href),
      })),
    ];
    return actions;
  }, [businessSlug, router, close, copied]);

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
                variants={overlayFade}
                initial="hidden"
                animate="show"
                className="fixed inset-0 z-[60]"
                style={{
                  background: "rgba(15,23,42,0.30)",
                  backdropFilter: "blur(6px)",
                  WebkitBackdropFilter: "blur(6px)",
                }}
              />
            </Dialog.Overlay>
            <div className="fixed inset-0 z-[60] flex items-start justify-center pt-[15vh] px-4 pointer-events-none">
              <Dialog.Content
                asChild
                forceMount
                onOpenAutoFocus={(e) => {
                  e.preventDefault();
                  inputRef.current?.focus();
                }}
              >
                <motion.div
                  variants={reduceMotion ? overlayFade : paletteIn}
                  initial="hidden"
                  animate="show"
                  className="relative w-full max-w-lg rounded-2xl overflow-hidden pointer-events-auto"
                  style={PANEL_STYLE}
                >
                  <Dialog.Title className="sr-only">Paleta poleceń</Dialog.Title>
                  <Dialog.Description className="sr-only">
                    Szukaj poleceń, sekcji panelu i klientów
                  </Dialog.Description>

                  {/* Input */}
                  <div className="flex items-center gap-3 px-4" style={{ borderBottom: "1px solid rgba(203,213,225,0.30)" }}>
                    <svg className="w-4 h-4 text-slate-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                    </svg>
                    <input
                      ref={inputRef}
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={onInputKeyDown}
                      placeholder="Szukaj poleceń, sekcji, klientów…"
                      className="flex-1 py-3.5 text-sm bg-transparent outline-none placeholder:text-slate-400 text-slate-900"
                      role="combobox"
                      aria-expanded="true"
                      aria-controls="palette-list"
                      aria-activedescendant={flatItems[activeIdx] ? `palette-item-${activeIdx}` : undefined}
                    />
                    <kbd
                      className="text-[10px] font-semibold px-1.5 py-0.5 rounded flex-shrink-0"
                      style={{ background: "rgba(203,213,225,0.22)", border: "1px solid rgba(203,213,225,0.45)", color: "#94A3B8" }}
                    >
                      Esc
                    </kbd>
                  </div>

                  {/* Results */}
                  <div id="palette-list" role="listbox" aria-label="Wyniki" className="max-h-[40vh] overflow-y-auto p-2">
                    {flatItems.length === 0 && (
                      <p className="px-3 py-6 text-center text-sm text-slate-500">
                        Brak wyników dla „{query}"
                      </p>
                    )}

                    {(["Akcje", "Nawigacja"] as const).map((section) => {
                      const sectionCommands = filteredCommands.filter((c) => c.section === section);
                      if (sectionCommands.length === 0) return null;
                      return (
                        <div key={section} className="mb-1">
                          <p className="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400 select-none">
                            {section}
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
                                onMouseMove={() => setActiveIdx(idx)}
                                className={cn(
                                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors",
                                  active ? "text-white" : "text-slate-700"
                                )}
                                style={active ? { background: "linear-gradient(180deg, #1E293B 0%, #0F172A 100%)" } : undefined}
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
                          Klienci
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
                              onMouseMove={() => setActiveIdx(idx)}
                              className={cn(
                                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors",
                                active ? "text-white" : "text-slate-700"
                              )}
                              style={active ? { background: "linear-gradient(180deg, #1E293B 0%, #0F172A 100%)" } : undefined}
                            >
                              <span
                                className={cn(
                                  "w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold flex-shrink-0",
                                  active ? "text-white" : "text-slate-600"
                                )}
                                style={{
                                  background: active ? "rgba(255,255,255,0.15)" : "rgba(203,213,225,0.25)",
                                  border: active ? "1px solid rgba(255,255,255,0.20)" : "1px solid rgba(203,213,225,0.50)",
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
                </motion.div>
              </Dialog.Content>
            </div>
          </Dialog.Portal>
      )}
    </Dialog.Root>
  );
}
