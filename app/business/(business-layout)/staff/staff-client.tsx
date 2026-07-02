"use client";

import { useState, useTransition } from "react";
import { getInitials } from "@/lib/utils";
import { createEmployee, updateEmployee, deleteEmployee } from "@/lib/actions/staff";
import type { Employee, EmployeeService, Service } from "@prisma/client";

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
  "#111827", "#2563eb", "#16a34a", "#dc2626",
  "#d97706", "#0891b2", "#db2777", "#65a30d",
  "#374151", "#0f766e", "#b45309", "#1d4ed8",
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
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Pracownicy</h1>
          <p className="text-sm text-gray-700 mt-0.5">
            Zarządzaj zespołem swojego salonu
          </p>
        </div>
        <button
          onClick={openAdd}
          className="bg-gray-900 hover:bg-gray-800 text-white rounded-xl px-4 py-2 text-sm font-semibold transition-colors flex items-center gap-2"
        >
          <PlusIcon className="w-4 h-4" />
          Dodaj pracownika
        </button>
      </div>

      {/* Empty state */}
      {employees.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-2xl flex flex-col items-center justify-center py-20 text-center px-6">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <UsersIcon className="w-6 h-6 text-gray-700" />
          </div>
          <p className="text-sm font-medium text-gray-900">Brak pracowników</p>
          <p className="text-sm text-gray-700 mt-1 max-w-sm">
            Dodaj pracowników aby przypisywać ich do wizyt.
          </p>
          <button
            onClick={openAdd}
            className="mt-5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl px-4 py-2 text-sm font-semibold transition-colors"
          >
            Dodaj pierwszego pracownika
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {employees.map((emp) => (
            <div
              key={emp.id}
              className="bg-white border border-gray-100 rounded-2xl p-5 hover:shadow-soft transition-shadow"
            >
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0"
                  style={{ backgroundColor: emp.color }}
                >
                  {emp.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={emp.avatarUrl}
                      alt={`${emp.firstName} ${emp.lastName}`}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    getInitials(emp.firstName, emp.lastName)
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {emp.firstName} {emp.lastName}
                    </p>
                    <span
                      className={`text-2xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                        emp.isActive
                          ? "bg-success-50 text-success-600"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {emp.isActive ? "Aktywny" : "Nieaktywny"}
                    </span>
                  </div>
                  {emp.email && (
                    <p className="text-xs text-gray-700 mt-0.5 truncate">{emp.email}</p>
                  )}
                  {emp.phone && (
                    <p className="text-xs text-gray-700">{emp.phone}</p>
                  )}
                </div>
              </div>

              {/* Services */}
              {emp.services.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-medium text-gray-700 mb-2">Usługi:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {emp.services.slice(0, 3).map((es) => (
                      <span
                        key={es.serviceId}
                        className="text-2xs px-2 py-0.5 bg-gray-50 text-gray-800 rounded-full"
                      >
                        {es.service.name}
                      </span>
                    ))}
                    {emp.services.length > 3 && (
                      <span className="text-2xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full">
                        +{emp.services.length - 3}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
                <button
                  onClick={() => handleToggleActive(emp)}
                  disabled={isPending}
                  className="flex-1 text-xs py-1.5 border border-gray-200 hover:bg-gray-50 text-gray-900 rounded-lg transition-colors font-medium"
                >
                  {emp.isActive ? "Dezaktywuj" : "Aktywuj"}
                </button>
                <button
                  onClick={() => openEdit(emp)}
                  className="p-2 rounded-lg hover:bg-gray-100 text-gray-700 transition-colors"
                >
                  <EditIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(emp.id)}
                  disabled={deletingId === emp.id}
                  className="p-2 rounded-lg hover:bg-danger-50 text-gray-700 hover:text-danger-600 transition-colors"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={closeModal}
          />
          <div className="relative bg-white rounded-2xl shadow-soft-xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-scale-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">
                {editingId ? "Edytuj pracownika" : "Nowy pracownik"}
              </h2>
              <button
                onClick={closeModal}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-700 transition-colors"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Name row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1.5">
                    Imię *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.firstName}
                    onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1.5">
                    Nazwisko *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.lastName}
                    onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-gray-400"
                  />
                </div>
              </div>

              {/* Email + Phone */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1.5">
                    E-mail
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1.5">
                    Telefon
                  </label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-gray-400"
                  />
                </div>
              </div>

              {/* Bio */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1.5">
                  Bio (opcjonalnie)
                </label>
                <textarea
                  rows={2}
                  value={form.bio}
                  onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))}
                  placeholder="Kilka słów o pracowniku..."
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-gray-400 resize-none"
                />
              </div>

              {/* Color picker */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Kolor w kalendarzu
                </label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_PALETTE.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, color }))}
                      className="w-8 h-8 rounded-full border-2 transition-all"
                      style={{
                        backgroundColor: color,
                        borderColor: form.color === color ? "#111827" : "transparent",
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Services */}
              {availableServices.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Przypisane usługi
                  </label>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {availableServices.map((service) => (
                      <label
                        key={service.id}
                        className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={form.serviceIds.includes(service.id)}
                          onChange={() => toggleService(service.id)}
                          className="w-4 h-4 accent-gray-900"
                        />
                        <span className="text-sm text-gray-900">{service.name}</span>
                        <span className="text-xs text-gray-700 ml-auto">
                          {service.duration} min
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Active toggle */}
              <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-xl">
                <span className="text-sm font-medium text-gray-900">Pracownik aktywny</span>
                <button
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, isActive: !p.isActive }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    form.isActive ? "bg-gray-900" : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                      form.isActive ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 border border-gray-200 text-gray-900 hover:bg-gray-50 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 bg-gray-900 hover:bg-gray-800 text-white rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-60"
                >
                  {isPending
                    ? "Zapisywanie..."
                    : editingId
                    ? "Zapisz zmiany"
                    : "Dodaj pracownika"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Icons ──────────────────────────────────────────────────────
function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
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

function EditIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path d="m5.433 13.917 1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" />
      <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5Z" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clipRule="evenodd" />
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
