"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { formatCurrency, getInitials } from "@/lib/utils";
import type { CustomerSummary } from "./page";
import {
  PageHeader,
  GlassCard,
  EmptyState,
  StatusBadge,
  ChromeAvatar,
  InkLink,
  Overline,
  HAIRLINE,
  CHIP,
  ELEV_OVERLAY,
} from "@/components/ui/glass";
import { overlayFade, useReducedMotion } from "@/lib/motion";

type Props = {
  customers: CustomerSummary[];
};

// Walk-in records carry a synthetic @termcatch.local address — never show it
function displayContact(c: { email: string; phone: string | null }): string {
  if (c.email.endsWith("@termcatch.local")) return c.phone ?? "dodano ręcznie";
  return c.email;
}

export function CrmClient({ customers }: Props) {
  const searchParams = useSearchParams();
  const reduceMotion = useReducedMotion();
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSummary | null>(null);

  const filtered = customers.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.firstName.toLowerCase().includes(q) ||
      c.lastName.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.phone?.includes(q)
    );
  });

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <PageHeader
        title="Klienci"
        subtitle={<span className="tabular-nums">{customers.length} {customers.length === 1 ? "klient" : customers.length < 5 ? "klientów" : "klientów"} w bazie</span>}
        actions={<InkLink href="/business/calendar?action=new" size="md">Nowa wizyta</InkLink>}
      />

      {/* Search */}
      <div className="fade-rise fade-rise-d1 relative max-w-md">
        <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Szukaj po nazwisku, e-mailu, telefonie…"
          aria-label="Szukaj klientów"
          className="input-glass w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl outline-none placeholder:text-slate-400 text-slate-800"
        />
      </div>

      {customers.length === 0 ? (
        <GlassCard className="fade-rise fade-rise-d2">
          <EmptyState
            icon={
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            }
            title="Brak klientów"
            body="Klienci pojawią się tu po pierwszej rezerwacji — online albo dodanej ręcznie."
            action={<InkLink href="/business/calendar?action=new" size="sm">Zapisz pierwszego klienta</InkLink>}
          />
        </GlassCard>
      ) : (
        <GlassCard className="fade-rise fade-rise-d2 overflow-hidden">
          {/* Table header */}
          <div
            className="hidden sm:grid grid-cols-[2fr_2fr_1fr_1fr_1fr] gap-4 px-5 py-3"
            style={{ borderBottom: HAIRLINE, background: "rgba(203,213,225,0.10)" }}
          >
            <Overline>Klient</Overline>
            <Overline>Kontakt</Overline>
            <Overline className="text-right">Wizyty</Overline>
            <Overline className="text-right">Wydano</Overline>
            <Overline className="text-right">Ostatnia</Overline>
          </div>

          {filtered.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <p className="text-sm text-slate-500">Brak wyników dla „{search}"</p>
            </div>
          ) : (
            <div>
              {filtered.map((customer, i) => (
                <button
                  key={customer.id}
                  onClick={() => setSelectedCustomer(customer)}
                  className="row-hover w-full grid grid-cols-[1fr_auto] sm:grid-cols-[2fr_2fr_1fr_1fr_1fr] gap-2 sm:gap-4 px-5 py-3.5 text-left items-center"
                  style={i > 0 ? { borderTop: HAIRLINE } : undefined}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <ChromeAvatar initials={getInitials(customer.firstName, customer.lastName)} />
                    <p className="text-sm font-semibold text-slate-900 truncate">
                      {customer.firstName} {customer.lastName}
                    </p>
                  </div>

                  <div className="hidden sm:block min-w-0">
                    <p className="text-sm text-slate-700 truncate">{displayContact(customer)}</p>
                    {customer.phone && (
                      <p className="text-xs text-slate-500 mt-0.5 tabular-nums">{customer.phone}</p>
                    )}
                  </div>

                  <p className="hidden sm:block text-sm font-semibold text-slate-900 text-right tabular-nums">
                    {customer.totalAppointments}
                  </p>

                  <p className="text-sm font-bold text-slate-900 text-right tabular-nums">
                    {formatCurrency(customer.totalSpent)}
                  </p>

                  <p className="hidden sm:block text-sm text-slate-500 text-right tabular-nums">
                    {customer.lastVisit
                      ? new Date(customer.lastVisit).toLocaleDateString("pl-PL", { day: "numeric", month: "short" })
                      : "—"}
                  </p>
                </button>
              ))}
            </div>
          )}
        </GlassCard>
      )}

      {/* Client drawer — glass, slides from the right */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <motion.div
            variants={overlayFade}
            initial="hidden"
            animate="show"
            className="absolute inset-0"
            style={{ background: "rgba(15,23,42,0.30)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}
            onClick={() => setSelectedCustomer(null)}
          />
          <motion.div
            initial={reduceMotion ? { opacity: 0 } : { x: 56, opacity: 0 }}
            animate={reduceMotion ? { opacity: 1 } : { x: 0, opacity: 1, transition: { type: "spring", stiffness: 380, damping: 34 } }}
            className="relative w-full max-w-md h-full overflow-y-auto"
            style={{ ...ELEV_OVERLAY, borderRadius: 0, borderRight: "none", borderTop: "none", borderBottom: "none" }}
            role="dialog"
            aria-modal="true"
            aria-label={`Klient: ${selectedCustomer.firstName} ${selectedCustomer.lastName}`}
          >
            {/* Header */}
            <div className="flex items-start justify-between p-6" style={{ borderBottom: HAIRLINE }}>
              <div className="flex items-center gap-4">
                <ChromeAvatar
                  size="lg"
                  initials={getInitials(selectedCustomer.firstName, selectedCustomer.lastName)}
                />
                <div>
                  <h3 className="text-base font-bold text-slate-900" style={{ letterSpacing: "-0.01em" }}>
                    {selectedCustomer.firstName} {selectedCustomer.lastName}
                  </h3>
                  <p className="text-sm text-slate-500">{displayContact(selectedCustomer)}</p>
                  {selectedCustomer.phone && (
                    <p className="text-sm text-slate-500 tabular-nums">{selectedCustomer.phone}</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                aria-label="Zamknij"
                className="icon-btn p-2 rounded-lg mt-1"
                style={{ color: "#94A3B8" }}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 p-6" style={{ borderBottom: HAIRLINE }}>
              <div className="rounded-2xl p-3.5" style={CHIP}>
                <p className="text-xl font-bold text-slate-900 tabular-nums">
                  {selectedCustomer.totalAppointments}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">Wszystkich wizyt</p>
              </div>
              <div className="rounded-2xl p-3.5" style={CHIP}>
                <p className="text-xl font-bold text-slate-900 tabular-nums">
                  {formatCurrency(selectedCustomer.totalSpent)}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">Łączna wartość</p>
              </div>
            </div>

            {/* CTA */}
            <div className="px-6 pt-5">
              <InkLink href="/business/calendar?action=new" className="w-full">
                Umów wizytę
              </InkLink>
            </div>

            {/* Appointments list */}
            <div className="p-6">
              <Overline className="mb-3">Historia wizyt</Overline>
              {selectedCustomer.appointments.length === 0 ? (
                <p className="text-sm text-slate-500">Brak wizyt</p>
              ) : (
                <div className="space-y-2">
                  {selectedCustomer.appointments.map((apt) => (
                    <div
                      key={apt.id}
                      className="flex items-center justify-between gap-3 p-3.5 rounded-2xl"
                      style={{
                        background: "rgba(255,255,255,0.75)",
                        border: "1px solid rgba(203,213,225,0.45)",
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.90)",
                      }}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {apt.service.name}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                          {new Date(apt.startTime).toLocaleDateString("pl-PL", {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-slate-900 tabular-nums">
                          {formatCurrency(apt.price)}
                        </p>
                        <StatusBadge status={apt.status} className="mt-1" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
