"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { formatCurrency, getInitials } from "@/lib/utils";
import type { CustomerSummary } from "./page";

type Props = {
  customers: CustomerSummary[];
};

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  PENDING: { label: "Oczekuje", className: "bg-warning-50 text-warning-600" },
  CONFIRMED: { label: "Potwierdzona", className: "bg-success-50 text-success-600" },
  COMPLETED: { label: "Zakończona", className: "bg-gray-100 text-gray-700" },
  CANCELLED_CUSTOMER: { label: "Odwołana", className: "bg-danger-50 text-danger-600" },
  CANCELLED_BUSINESS: { label: "Odwołana", className: "bg-danger-50 text-danger-600" },
  NO_SHOW: { label: "No-show", className: "bg-danger-50 text-danger-600" },
  IN_PROGRESS: { label: "W trakcie", className: "bg-gray-50 text-gray-900" },
  RESCHEDULED: { label: "Przełożona", className: "bg-gray-100 text-gray-700" },
};

export function CrmClient({ customers }: Props) {
  const searchParams = useSearchParams();
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
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">CRM — Klienci</h1>
          <p className="text-sm text-gray-700 mt-0.5">
            {customers.length} klientów w bazie
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-700" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Szukaj klientów po nazwie, e-mailu lub telefonie..."
          className="w-full pl-10 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-gray-400"
        />
      </div>

      {customers.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-2xl flex flex-col items-center justify-center py-20 text-center px-6">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <UsersIcon className="w-6 h-6 text-gray-700" />
          </div>
          <p className="text-sm font-medium text-gray-900">Brak klientów</p>
          <p className="text-sm text-gray-700 mt-1 max-w-sm">
            Gdy klienci zarezerwują wizytę, pojawią się tutaj.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[2fr_2fr_1fr_1fr_1fr] gap-4 px-6 py-3 border-b border-gray-100 bg-gray-50">
            <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Klient</span>
            <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Kontakt</span>
            <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider text-right">Wizyty</span>
            <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider text-right">Wydano</span>
            <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider text-right">Ostatnia wizyta</span>
          </div>

          {/* Rows */}
          {filtered.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <p className="text-sm text-gray-700">Brak wyników dla &quot;{search}&quot;</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filtered.map((customer) => (
                <button
                  key={customer.id}
                  onClick={() => setSelectedCustomer(customer)}
                  className="w-full grid grid-cols-[2fr_2fr_1fr_1fr_1fr] gap-4 px-6 py-4 hover:bg-gray-50 transition-colors text-left"
                >
                  {/* Name */}
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gray-100 text-gray-900 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                      {getInitials(customer.firstName, customer.lastName)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {customer.firstName} {customer.lastName}
                      </p>
                    </div>
                  </div>

                  {/* Contact */}
                  <div>
                    <p className="text-sm text-gray-900 truncate">{customer.email}</p>
                    {customer.phone && (
                      <p className="text-xs text-gray-700 mt-0.5">{customer.phone}</p>
                    )}
                  </div>

                  {/* Appointments */}
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">{customer.totalAppointments}</p>
                  </div>

                  {/* Spent */}
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">
                      {formatCurrency(customer.totalSpent)}
                    </p>
                  </div>

                  {/* Last visit */}
                  <div className="text-right">
                    <p className="text-sm text-gray-900">
                      {customer.lastVisit
                        ? new Date(customer.lastVisit).toLocaleDateString("pl-PL", {
                            day: "numeric",
                            month: "short",
                          })
                        : "—"}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Customer detail slide-in */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="flex-1 bg-black/20"
            onClick={() => setSelectedCustomer(null)}
          />
          <div className="w-full max-w-md bg-white shadow-soft-xl h-full overflow-y-auto animate-slide-in-right">
            {/* Header */}
            <div className="flex items-start justify-between p-6 border-b border-gray-100">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gray-100 text-gray-900 flex items-center justify-center text-sm font-semibold">
                  {getInitials(selectedCustomer.firstName, selectedCustomer.lastName)}
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900">
                    {selectedCustomer.firstName} {selectedCustomer.lastName}
                  </h3>
                  <p className="text-sm text-gray-700">{selectedCustomer.email}</p>
                  {selectedCustomer.phone && (
                    <p className="text-sm text-gray-700">{selectedCustomer.phone}</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-700 transition-colors mt-1"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 p-6 border-b border-gray-100">
              <div className="bg-gray-50 rounded-xl p-3.5">
                <p className="text-xl font-bold text-gray-900">
                  {selectedCustomer.totalAppointments}
                </p>
                <p className="text-xs text-gray-700 mt-0.5">Wszystkich wizyt</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3.5">
                <p className="text-xl font-bold text-gray-900">
                  {formatCurrency(selectedCustomer.totalSpent)}
                </p>
                <p className="text-xs text-gray-700 mt-0.5">Łączna wartość</p>
              </div>
            </div>

            {/* Appointments list */}
            <div className="p-6">
              <h4 className="text-sm font-semibold text-gray-900 mb-4">Historia wizyt</h4>
              {selectedCustomer.appointments.length === 0 ? (
                <p className="text-sm text-gray-700">Brak wizyt</p>
              ) : (
                <div className="space-y-3">
                  {selectedCustomer.appointments.map((apt) => {
                    const statusInfo = STATUS_LABELS[apt.status] ?? {
                      label: apt.status,
                      className: "bg-gray-100 text-gray-700",
                    };
                    return (
                      <div
                        key={apt.id}
                        className="flex items-center justify-between p-3.5 bg-gray-50 rounded-xl"
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {apt.service.name}
                          </p>
                          <p className="text-xs text-gray-700 mt-0.5">
                            {new Date(apt.startTime).toLocaleDateString("pl-PL", {
                              weekday: "short",
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-gray-900">
                            {formatCurrency(apt.price)}
                          </p>
                          <span
                            className={`text-2xs px-2 py-0.5 rounded-full font-medium mt-1 inline-block ${statusInfo.className}`}
                          >
                            {statusInfo.label}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path d="M7 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM14.5 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM1.615 16.428a1.224 1.224 0 0 1-.569-1.175 6.002 6.002 0 0 1 11.908 0c.058.467-.172.92-.57 1.174A9.953 9.953 0 0 1 7 18a9.953 9.953 0 0 1-5.385-1.572ZM14.5 16h-.106c.07-.297.088-.611.048-.933a7.47 7.47 0 0 0-1.588-3.755 4.502 4.502 0 0 1 5.874 2.636.818.818 0 0 1-.36.98A7.465 7.465 0 0 1 14.5 16Z" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
    </svg>
  );
}
