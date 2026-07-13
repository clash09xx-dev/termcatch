"use client";

import { useState, useTransition } from "react";
import { getInitials } from "@/lib/utils";
import { createEmployee, updateEmployee, deleteEmployee } from "@/lib/actions/staff";
import type { Employee, EmployeeService, Service } from "@prisma/client";
import {
  PageHeader,
  GlassCard,
  EmptyState,
  InkButton,
  GlassButton,
  HAIRLINE,
  CHIP,
} from "@/components/ui/glass";
import { GlassModal } from "@/components/ui/glass-modal";

type EmployeeWithServices = Employee & {
  services: (EmployeeService & { service: Service })[];
};

type Props = {
  employees: EmployeeWithServices[];
  availableServices: Service[];
};

type EmployeeForm = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  bio: string;
  color: string;
  isActive: boolean;
  serviceIds: string[];
};

const COLOR_PALETTE = [
  "#334155", "#2563eb", "#16a34a", "#dc2626",
  "#d97706", "#0891b2", "#db2777", "#65a30d",
  "#64748B", "#0f766e", "#b45309", "#1d4ed8",
];

const EMPTY_FORM: EmployeeForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  bio: "",
  color: COLOR_PALETTE[0]!,
  isActive: true,
  serviceIds: [],
};

function employeeToForm(e: EmployeeWithServices): EmployeeForm {
  return {
    firstName: e.firstName,
    lastName: e.lastName,
    email: e.email ?? "",
    phone: e.phone ?? "",
    bio: e.bio ?? "",
    color: e.color,
    isActive: e.isActive,
    serviceIds: e.services.map((s) => s.serviceId),
  };
}

const INPUT_CLS =
  "input-glass w-full px-3.5 py-2.5 text-sm rounded-xl outline-none text-slate-800 placeholder:text-slate-400";
const LABEL_CLS = "block text-sm font-medium text-slate-700 mb-1.5";

export function StaffClient({ employees: initialEmployees, availableServices }: Props) {
  const [employees, setEmployees] = useState<EmployeeWithServices[]>(initialEmployees);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EmployeeForm>(EMPTY_FORM);
  const [isPending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function openAdd() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  }

  function openEdit(emp: EmployeeWithServices) {
    setEditingId(emp.id);
    setForm(employeeToForm(emp));
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  function toggleService(serviceId: string) {
    setForm((prev) => ({
      ...prev,
      serviceIds: prev.serviceIds.includes(serviceId)
        ? prev.serviceIds.filter((id) => id !== serviceId)
        : [...prev.serviceIds, serviceId],
    }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const data = {
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email || undefined,
      phone: form.phone || undefined,
      bio: form.bio || undefined,
      color: form.color,
      isActive: form.isActive,
      serviceIds: form.serviceIds,
    };

    startTransition(async () => {
      if (editingId) {
        await updateEmployee(editingId, data);
        window.location.reload();
      } else {
        await createEmployee(data);
        window.location.reload();
      }
      closeModal();
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Czy na pewno chcesz usunąć tego pracownika?")) return;
    setDeletingId(id);
    startTransition(async () => {
      await deleteEmployee(id);
      setEmployees((prev) => prev.filter((e) => e.id !== id));
      setDeletingId(null);
    });
  }

  function handleToggleActive(emp: EmployeeWithServices) {
    startTransition(async () => {
      await updateEmployee(emp.id, { isActive: !emp.isActive });
      setEmployees((prev) =>
        prev.map((e) => (e.id === emp.id ? { ...e, isActive: !e.isActive } : e))
      );
    });
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <PageHeader
        title="Pracownicy"
        subtitle="Zarządzaj zespołem swojego salonu"
        actions={
          <InkButton onClick={openAdd}>
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Dodaj pracownika
          </InkButton>
        }
      />

      {/* Plan info */}
      {employees.length >= 1 && (
        <div className="fade-rise fade-rise-d1 rounded-2xl px-5 py-4 flex items-start gap-3" style={CHIP}>
          <svg className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4M12 8h.01" />
          </svg>
          <p className="text-xs text-slate-600 leading-relaxed">
            {employees.length <= 1 ? (
              <>Masz <strong className="tabular-nums">{employees.length}</strong> specjalistę — mieścisz się w planie <strong>Solo (39 zł/mies.)</strong>. Dodanie kolejnych osób będzie wymagało planu Zespół (89 zł/mies., do 5 osób).</>
            ) : employees.length <= 5 ? (
              <>Masz <strong className="tabular-nums">{employees.length}</strong> specjalistów — to plan <strong>Zespół (89 zł/mies., do 5 osób)</strong>. Powyżej 5 osób obowiązuje plan Salon Pro (149 zł/mies., bez limitu).</>
            ) : (
              <>Masz <strong className="tabular-nums">{employees.length}</strong> specjalistów — to plan <strong>Salon Pro (149 zł/mies., bez limitu osób)</strong>.</>
            )}{" "}
            W okresie oferty startowej nie pobieramy żadnych opłat.
          </p>
        </div>
      )}

      {/* Empty state / cards */}
      {employees.length === 0 ? (
        <GlassCard className="fade-rise fade-rise-d2">
          <EmptyState
            icon={
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            }
            title="Brak pracowników"
            body="Dodaj specjalistów, żeby klienci mogli wybrać konkretną osobę przy rezerwacji."
            action={<InkButton size="sm" onClick={openAdd}>Dodaj pierwszego pracownika</InkButton>}
          />
        </GlassCard>
      ) : (
        <div className="fade-rise fade-rise-d2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {employees.map((emp) => (
            <div key={emp.id} className="card-hover-lift rounded-[20px] p-5" style={{
              background: "rgba(255,255,255,0.80)",
              border: "1px solid rgba(203,213,225,0.45)",
              boxShadow: "0 0 0 0.5px rgba(203,213,225,0.22), 0 1px 2px rgba(0,0,0,0.02), 0 4px 14px rgba(100,116,139,0.06), inset 0 1px 0 rgba(255,255,255,0.92)",
            }}>
              <div className="flex items-start gap-4">
                {/* Avatar — employee identity color */}
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-semibold text-sm flex-shrink-0 overflow-hidden"
                  style={{ backgroundColor: emp.color, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25)" }}
                >
                  {emp.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={emp.avatarUrl}
                      alt={`${emp.firstName} ${emp.lastName}`}
                      className="w-12 h-12 object-cover"
                    />
                  ) : (
                    getInitials(emp.firstName, emp.lastName)
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-900 truncate">
                      {emp.firstName} {emp.lastName}
                    </p>
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0"
                      style={emp.isActive
                        ? { background: "rgba(16,185,129,0.10)", border: "1px solid rgba(16,185,129,0.25)", color: "#047857" }
                        : { background: "rgba(203,213,225,0.18)", border: "1px solid rgba(203,213,225,0.45)", color: "#64748B" }}
                    >
                      {emp.isActive ? "Aktywny" : "Nieaktywny"}
                    </span>
                  </div>
                  {emp.email && (
                    <p className="text-xs text-slate-500 mt-0.5 truncate">{emp.email}</p>
                  )}
                  {emp.phone && (
                    <p className="text-xs text-slate-500 tabular-nums">{emp.phone}</p>
                  )}
                </div>
              </div>

              {/* Services */}
              {emp.services.length > 0 && (
                <div className="mt-4">
                  <div className="flex flex-wrap gap-1.5">
                    {emp.services.slice(0, 3).map((es) => (
                      <span
                        key={es.serviceId}
                        className="text-[10px] font-medium px-2 py-0.5 rounded-full text-slate-600"
                        style={CHIP}
                      >
                        {es.service.name}
                      </span>
                    ))}
                    {emp.services.length > 3 && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full text-slate-500 tabular-nums" style={CHIP}>
                        +{emp.services.length - 3}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 mt-4 pt-4" style={{ borderTop: HAIRLINE }}>
                <GlassButton
                  size="sm"
                  className="flex-1"
                  onClick={() => handleToggleActive(emp)}
                  disabled={isPending}
                >
                  {emp.isActive ? "Dezaktywuj" : "Aktywuj"}
                </GlassButton>
                <button
                  onClick={() => openEdit(emp)}
                  aria-label="Edytuj pracownika"
                  className="icon-btn p-2 rounded-lg"
                  style={{ color: "#94A3B8" }}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
                    <path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleDelete(emp.id)}
                  disabled={deletingId === emp.id}
                  aria-label="Usuń pracownika"
                  className="p-2 rounded-lg transition-colors"
                  style={{ color: "#94A3B8" }}
                  onMouseOver={(e) => (e.currentTarget.style.color = "#BE123C")}
                  onMouseOut={(e) => (e.currentTarget.style.color = "#94A3B8")}
                  onFocus={(e) => (e.currentTarget.style.color = "#BE123C")}
                  onBlur={(e) => (e.currentTarget.style.color = "#94A3B8")}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
                    <path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / edit modal */}
      <GlassModal
        open={showModal}
        onOpenChange={(o) => { if (!o) closeModal(); }}
        title={editingId ? "Edytuj pracownika" : "Nowy pracownik"}
        className="max-w-lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4 mt-2 max-h-[65vh] overflow-y-auto pr-1 -mr-1">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="emp-first" className={LABEL_CLS}>Imię *</label>
              <input
                id="emp-first"
                type="text"
                required
                value={form.firstName}
                onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))}
                className={INPUT_CLS}
              />
            </div>
            <div>
              <label htmlFor="emp-last" className={LABEL_CLS}>Nazwisko *</label>
              <input
                id="emp-last"
                type="text"
                required
                value={form.lastName}
                onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))}
                className={INPUT_CLS}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="emp-email" className={LABEL_CLS}>E-mail</label>
              <input
                id="emp-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                className={INPUT_CLS}
              />
            </div>
            <div>
              <label htmlFor="emp-phone" className={LABEL_CLS}>Telefon</label>
              <input
                id="emp-phone"
                type="tel"
                value={form.phone}
                onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                className={`${INPUT_CLS} tabular-nums`}
              />
            </div>
          </div>

          <div>
            <label htmlFor="emp-bio" className={LABEL_CLS}>Bio (opcjonalnie)</label>
            <textarea
              id="emp-bio"
              rows={2}
              value={form.bio}
              onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))}
              placeholder="Kilka słów o pracowniku…"
              className={`${INPUT_CLS} resize-none`}
            />
          </div>

          {/* Color picker */}
          <div>
            <span className={LABEL_CLS}>Kolor w kalendarzu</span>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Kolor pracownika">
              {COLOR_PALETTE.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, color }))}
                  aria-label={`Kolor ${color}`}
                  aria-pressed={form.color === color}
                  className="w-8 h-8 rounded-full transition-transform hover:scale-110"
                  style={{
                    backgroundColor: color,
                    boxShadow: form.color === color
                      ? "0 0 0 2px rgba(255,255,255,0.95), 0 0 0 4px #0F172A"
                      : "inset 0 1px 0 rgba(255,255,255,0.25)",
                  }}
                />
              ))}
            </div>
          </div>

          {/* Services */}
          {availableServices.length > 0 && (
            <div>
              <span className={LABEL_CLS}>Przypisane usługi</span>
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {availableServices.map((service) => (
                  <label
                    key={service.id}
                    className="row-hover flex items-center gap-2.5 p-2.5 rounded-xl cursor-pointer"
                    style={{ border: "1px solid rgba(203,213,225,0.35)" }}
                  >
                    <input
                      type="checkbox"
                      checked={form.serviceIds.includes(service.id)}
                      onChange={() => toggleService(service.id)}
                      className="w-4 h-4 accent-slate-900"
                    />
                    <span className="text-sm text-slate-800">{service.name}</span>
                    <span className="text-xs text-slate-500 ml-auto tabular-nums">
                      {service.duration} min
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Active toggle */}
          <div className="flex items-center justify-between p-3.5 rounded-xl" style={CHIP}>
            <span className="text-sm font-medium text-slate-800">Pracownik aktywny</span>
            <button
              type="button"
              onClick={() => setForm((p) => ({ ...p, isActive: !p.isActive }))}
              role="switch"
              aria-checked={form.isActive}
              className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
              style={{ background: form.isActive ? "#0F172A" : "rgba(148,163,184,0.45)" }}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form.isActive ? "translate-x-6" : "translate-x-1"}`}
              />
            </button>
          </div>

          <div className="flex gap-3 pt-1">
            <GlassButton onClick={closeModal} className="flex-1">
              Anuluj
            </GlassButton>
            <InkButton type="submit" disabled={isPending} className="flex-1">
              {isPending ? "Zapisywanie…" : editingId ? "Zapisz zmiany" : "Dodaj pracownika"}
            </InkButton>
          </div>
        </form>
      </GlassModal>
    </div>
  );
}
