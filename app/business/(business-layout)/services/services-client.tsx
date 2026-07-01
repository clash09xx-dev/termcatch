"use client";

import { useState, useTransition } from "react";
import { formatCurrency, formatDuration } from "@/lib/utils";
import { createService, updateService, deleteService } from "@/lib/actions/services";
import type { Service } from "@prisma/client";

type Props = {
  services: Service[];
  businessId: string;
};

type ServiceForm = {
  name: string;
  description: string;
  duration: string;
  price: string;
  discountedPrice: string;
  requiresDeposit: boolean;
  depositAmount: string;
  isActive: boolean;
};

const EMPTY_FORM: ServiceForm = {
  name: "",
  description: "",
  duration: "60",
  price: "",
  discountedPrice: "",
  requiresDeposit: false,
  depositAmount: "",
  isActive: true,
};

function serviceToForm(s: Service): ServiceForm {
  return {
    name: s.name,
    description: s.description ?? "",
    duration: String(s.duration),
    price: String(s.price),
    discountedPrice: s.discountedPrice ? String(s.discountedPrice) : "",
    requiresDeposit: s.requiresDeposit,
    depositAmount: s.depositAmount ? String(s.depositAmount) : "",
    isActive: s.isActive,
  };
}

export function ServicesClient({ services: initialServices, businessId }: Props) {
  const [services, setServices] = useState<Service[]>(initialServices);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ServiceForm>(EMPTY_FORM);
  const [isPending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function openAdd() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  }

  function openEdit(service: Service) {
    setEditingId(service.id);
    setForm(serviceToForm(service));
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  function handleFormChange(field: keyof ServiceForm, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const data = {
      name: form.name,
      description: form.description || undefined,
      duration: parseInt(form.duration, 10),
      price: parseFloat(form.price),
      discountedPrice: form.discountedPrice ? parseFloat(form.discountedPrice) : undefined,
      requiresDeposit: form.requiresDeposit,
      depositAmount: form.depositAmount ? parseFloat(form.depositAmount) : undefined,
      isActive: form.isActive,
    };

    startTransition(async () => {
      if (editingId) {
        await updateService(editingId, data);
        setServices((prev) =>
          prev.map((s) =>
            s.id === editingId
              ? {
                  ...s,
                  name: data.name ?? s.name,
                  description: data.description ?? null,
                  duration: data.duration ?? s.duration,
                  price: data.price ?? s.price,
                  discountedPrice: data.discountedPrice ?? null,
                  requiresDeposit: data.requiresDeposit ?? s.requiresDeposit,
                  depositAmount: data.depositAmount ?? null,
                  isActive: data.isActive ?? s.isActive,
                }
              : s
          )
        );
      } else {
        await createService(data);
        // Refresh by navigation — server component will re-render
        window.location.reload();
      }
      closeModal();
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Czy na pewno chcesz usunąć tę usługę?")) return;
    setDeletingId(id);
    startTransition(async () => {
      await deleteService(id);
      setServices((prev) => prev.filter((s) => s.id !== id));
      setDeletingId(null);
    });
  }

  function handleToggleActive(service: Service) {
    startTransition(async () => {
      await updateService(service.id, { isActive: !service.isActive });
      setServices((prev) =>
        prev.map((s) => (s.id === service.id ? { ...s, isActive: !s.isActive } : s))
      );
    });
  }

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Usługi</h1>
          <p className="text-sm text-gray-700 mt-0.5">
            Zarządzaj ofertą swojego salonu
          </p>
        </div>
        <button
          onClick={openAdd}
          className="bg-gray-900 hover:bg-gray-800 text-white rounded-xl px-4 py-2 text-sm font-semibold transition-colors flex items-center gap-2"
        >
          <PlusIcon className="w-4 h-4" />
          Dodaj usługę
        </button>
      </div>

      {/* Stats row */}
      {services.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Wszystkie", value: services.length },
            { label: "Aktywne", value: services.filter((s) => s.isActive).length },
            { label: "Nieaktywne", value: services.filter((s) => !s.isActive).length },
          ].map((stat) => (
            <div key={stat.label} className="bg-white border border-gray-100 rounded-2xl p-4">
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-sm text-gray-700 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Services list */}
      {services.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-2xl flex flex-col items-center justify-center py-20 text-center px-6">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <ServicesIcon className="w-6 h-6 text-gray-700" />
          </div>
          <p className="text-sm font-medium text-gray-900">Brak usług</p>
          <p className="text-sm text-gray-700 mt-1 max-w-sm">
            Dodaj pierwszą usługę aby klienci mogli rezerwować.
          </p>
          <button
            onClick={openAdd}
            className="mt-5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl px-4 py-2 text-sm font-semibold transition-colors"
          >
            Dodaj pierwszą usługę
          </button>
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">
              Lista usług ({services.length})
            </h3>
          </div>
          <div className="divide-y divide-gray-100">
            {services.map((service) => (
              <div
                key={service.id}
                className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors"
              >
                {/* Color indicator */}
                <div
                  className={`w-1.5 h-10 rounded-full flex-shrink-0 ${
                    service.isActive ? "bg-gray-900" : "bg-gray-300"
                  }`}
                />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900 truncate">{service.name}</p>
                    <span
                      className={`inline-flex text-2xs px-2 py-0.5 rounded-full font-medium ${
                        service.isActive
                          ? "bg-success-50 text-success-600"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {service.isActive ? "Aktywna" : "Nieaktywna"}
                    </span>
                  </div>
                  <p className="text-xs text-gray-700 mt-0.5">
                    {formatDuration(service.duration)}
                    {service.description && ` · ${service.description.slice(0, 60)}${service.description.length > 60 ? "..." : ""}`}
                  </p>
                </div>

                {/* Price */}
                <div className="text-right flex-shrink-0 min-w-[80px]">
                  <p className="text-sm font-semibold text-gray-900">
                    {formatCurrency(service.discountedPrice ?? service.price)}
                  </p>
                  {service.discountedPrice && (
                    <p className="text-xs text-gray-700 line-through">
                      {formatCurrency(service.price)}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => handleToggleActive(service)}
                    disabled={isPending}
                    title={service.isActive ? "Dezaktywuj" : "Aktywuj"}
                    className="p-2 rounded-lg hover:bg-gray-100 text-gray-700 transition-colors"
                  >
                    {service.isActive ? (
                      <EyeOffIcon className="w-4 h-4" />
                    ) : (
                      <EyeIcon className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => openEdit(service)}
                    className="p-2 rounded-lg hover:bg-gray-100 text-gray-700 transition-colors"
                  >
                    <EditIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(service.id)}
                    disabled={deletingId === service.id}
                    className="p-2 rounded-lg hover:bg-danger-50 text-gray-700 hover:text-danger-600 transition-colors"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
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
                {editingId ? "Edytuj usługę" : "Nowa usługa"}
              </h2>
              <button
                onClick={closeModal}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-700 transition-colors"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1.5">
                  Nazwa usługi *
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => handleFormChange("name", e.target.value)}
                  placeholder="np. Strzyżenie damskie"
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-gray-400"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1.5">
                  Opis (opcjonalnie)
                </label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => handleFormChange("description", e.target.value)}
                  placeholder="Krótki opis usługi..."
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-gray-400 resize-none"
                />
              </div>

              {/* Duration + Price */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1.5">
                    Czas trwania (min) *
                  </label>
                  <input
                    type="number"
                    required
                    min="5"
                    step="5"
                    value={form.duration}
                    onChange={(e) => handleFormChange("duration", e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1.5">
                    Cena (PLN) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={form.price}
                    onChange={(e) => handleFormChange("price", e.target.value)}
                    placeholder="0.00"
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-gray-400"
                  />
                </div>
              </div>

              {/* Discounted price */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1.5">
                  Cena promocyjna (opcjonalnie)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.discountedPrice}
                  onChange={(e) => handleFormChange("discountedPrice", e.target.value)}
                  placeholder="0.00"
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-gray-400"
                />
              </div>

              {/* Deposit */}
              <div className="flex items-start gap-3 p-3.5 bg-gray-50 rounded-xl">
                <input
                  type="checkbox"
                  id="requiresDeposit"
                  checked={form.requiresDeposit}
                  onChange={(e) => handleFormChange("requiresDeposit", e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-gray-900"
                />
                <div className="flex-1">
                  <label htmlFor="requiresDeposit" className="text-sm font-medium text-gray-900">
                    Wymagana zaliczka
                  </label>
                  {form.requiresDeposit && (
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.depositAmount}
                      onChange={(e) => handleFormChange("depositAmount", e.target.value)}
                      placeholder="Kwota zaliczki (PLN)"
                      className="mt-2 w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-gray-400"
                    />
                  )}
                </div>
              </div>

              {/* Active toggle */}
              <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-xl">
                <span className="text-sm font-medium text-gray-900">Usługa aktywna</span>
                <button
                  type="button"
                  onClick={() => handleFormChange("isActive", !form.isActive)}
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
                  {isPending ? "Zapisywanie..." : editingId ? "Zapisz zmiany" : "Dodaj usługę"}
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

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
      <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 0 1 0-1.186A10.004 10.004 0 0 1 10 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0 1 10 17c-4.257 0-7.893-2.66-9.336-6.41ZM14 10a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" clipRule="evenodd" />
    </svg>
  );
}

function EyeOffIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M3.28 2.22a.75.75 0 0 0-1.06 1.06l14.5 14.5a.75.75 0 1 0 1.06-1.06l-1.745-1.745a10.029 10.029 0 0 0 3.3-4.38 1.651 1.651 0 0 0 0-1.185A10.004 10.004 0 0 0 9.999 3a9.956 9.956 0 0 0-4.744 1.194L3.28 2.22ZM7.752 6.69l1.092 1.092a2.5 2.5 0 0 1 3.374 3.373l1.091 1.092a4 4 0 0 0-5.557-5.557Z" clipRule="evenodd" />
      <path d="m10.748 13.93 2.523 2.523a10.065 10.065 0 0 1-3.27.547c-4.258 0-7.894-2.66-9.337-6.41a1.651 1.651 0 0 1 0-1.186A10.007 10.007 0 0 1 2.839 6.02L6.07 9.252a4 4 0 0 0 4.678 4.678Z" />
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

function ServicesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M6 4.75A.75.75 0 0 1 6.75 4h10.5a.75.75 0 0 1 0 1.5H6.75A.75.75 0 0 1 6 4.75ZM6 10a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H6.75A.75.75 0 0 1 6 10Zm0 5.25a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H6.75a.75.75 0 0 1-.75-.75ZM1.99 4.75a1 1 0 0 1 1-1H3a1 1 0 0 1 1 1v.01a1 1 0 0 1-1 1h-.01a1 1 0 0 1-1-1v-.01ZM1.99 15.25a1 1 0 0 1 1-1H3a1 1 0 0 1 1 1v.01a1 1 0 0 1-1 1h-.01a1 1 0 0 1-1-1v-.01ZM1.99 10a1 1 0 0 1 1-1H3a1 1 0 0 1 1 1v.01a1 1 0 0 1-1 1h-.01a1 1 0 0 1-1-1V10Z" clipRule="evenodd" />
    </svg>
  );
}
