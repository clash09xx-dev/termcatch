"use client";

import { useState, useTransition } from "react";
import { formatCurrency, formatDuration } from "@/lib/utils";
import { createService, updateService, deleteService } from "@/lib/actions/services";
import type { Service } from "@prisma/client";
import {
  PageHeader,
  GlassCard,
  CardHeader,
  StatCard,
  EmptyState,
  InkButton,
  GlassButton,
  HAIRLINE,
  CHIP,
} from "@/components/ui/glass";
import { GlassModal } from "@/components/ui/glass-modal";

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

const INPUT_CLS =
  "input-glass w-full px-3.5 py-2.5 text-sm rounded-xl outline-none text-slate-800 placeholder:text-slate-400";
const LABEL_CLS = "block text-sm font-medium text-slate-700 mb-1.5";

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
    <div className="max-w-5xl mx-auto space-y-5">
      <PageHeader
        title="Usługi"
        subtitle="Zarządzaj ofertą swojego salonu"
        actions={
          <InkButton onClick={openAdd}>
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Dodaj usługę
          </InkButton>
        }
      />

      {/* Stats */}
      {services.length > 0 && (
        <div className="fade-rise fade-rise-d1 grid grid-cols-3 gap-3">
          <StatCard label="Wszystkie" value={services.length} />
          <StatCard label="Aktywne" value={services.filter((s) => s.isActive).length} />
          <StatCard label="Nieaktywne" value={services.filter((s) => !s.isActive).length} />
        </div>
      )}

      {/* List */}
      {services.length === 0 ? (
        <GlassCard className="fade-rise fade-rise-d2">
          <EmptyState
            icon={
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" />
              </svg>
            }
            title="Brak usług"
            body="Dodaj pierwszą usługę, żeby klienci mogli rezerwować wizyty online."
            action={<InkButton size="sm" onClick={openAdd}>Dodaj pierwszą usługę</InkButton>}
          />
        </GlassCard>
      ) : (
        <GlassCard className="fade-rise fade-rise-d2 overflow-hidden">
          <CardHeader title={<span>Lista usług <span className="text-slate-400 font-medium tabular-nums">({services.length})</span></span>} />
          <div>
            {services.map((service, i) => (
              <div
                key={service.id}
                className="row-hover flex items-center gap-4 px-5 py-3.5"
                style={i > 0 ? { borderTop: HAIRLINE } : undefined}
              >
                {/* Activity rail */}
                <div
                  className="w-[3px] h-10 rounded-full flex-shrink-0"
                  style={{
                    background: service.isActive
                      ? "linear-gradient(180deg, #1E293B 0%, #0F172A 100%)"
                      : "rgba(203,213,225,0.60)",
                  }}
                />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-900 truncate">{service.name}</p>
                    <span
                      className="inline-flex text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0"
                      style={service.isActive
                        ? { background: "rgba(16,185,129,0.10)", border: "1px solid rgba(16,185,129,0.25)", color: "#047857" }
                        : { background: "rgba(203,213,225,0.18)", border: "1px solid rgba(203,213,225,0.45)", color: "#64748B" }}
                    >
                      {service.isActive ? "Aktywna" : "Nieaktywna"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">
                    {formatDuration(service.duration)}
                    {service.description && ` · ${service.description.slice(0, 60)}${service.description.length > 60 ? "…" : ""}`}
                  </p>
                </div>

                {/* Price */}
                <div className="text-right flex-shrink-0 min-w-[80px]">
                  <p className="text-sm font-bold text-slate-900 tabular-nums">
                    {formatCurrency(service.discountedPrice ?? service.price)}
                  </p>
                  {service.discountedPrice && (
                    <p className="text-xs text-slate-400 line-through tabular-nums">
                      {formatCurrency(service.price)}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-0.5 flex-shrink-0">
                  <button
                    onClick={() => handleToggleActive(service)}
                    disabled={isPending}
                    title={service.isActive ? "Dezaktywuj" : "Aktywuj"}
                    aria-label={service.isActive ? "Dezaktywuj usługę" : "Aktywuj usługę"}
                    className="icon-btn p-2 rounded-lg"
                    style={{ color: "#94A3B8" }}
                  >
                    {service.isActive ? (
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
                        <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" /><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" /><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" /><line x1="2" x2="22" y1="2" y2="22" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
                        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                  <button
                    onClick={() => openEdit(service)}
                    aria-label="Edytuj usługę"
                    className="icon-btn p-2 rounded-lg"
                    style={{ color: "#94A3B8" }}
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
                      <path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(service.id)}
                    disabled={deletingId === service.id}
                    aria-label="Usuń usługę"
                    className="p-2 rounded-lg transition-colors"
                    style={{ color: "#94A3B8" }}
                    onFocus={(e) => (e.currentTarget.style.color = "#BE123C")}
                    onBlur={(e) => (e.currentTarget.style.color = "#94A3B8")}
                    onMouseOver={(e) => (e.currentTarget.style.color = "#BE123C")}
                    onMouseOut={(e) => (e.currentTarget.style.color = "#94A3B8")}
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
                      <path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* Add / edit modal */}
      <GlassModal
        open={showModal}
        onOpenChange={(o) => { if (!o) closeModal(); }}
        title={editingId ? "Edytuj usługę" : "Nowa usługa"}
        className="max-w-lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4 mt-2 max-h-[65vh] overflow-y-auto pr-1 -mr-1">
          <div>
            <label htmlFor="svc-name" className={LABEL_CLS}>Nazwa usługi *</label>
            <input
              id="svc-name"
              type="text"
              required
              value={form.name}
              onChange={(e) => handleFormChange("name", e.target.value)}
              placeholder="np. Strzyżenie damskie"
              className={INPUT_CLS}
            />
          </div>

          <div>
            <label htmlFor="svc-desc" className={LABEL_CLS}>Opis (opcjonalnie)</label>
            <textarea
              id="svc-desc"
              rows={2}
              value={form.description}
              onChange={(e) => handleFormChange("description", e.target.value)}
              placeholder="Krótki opis usługi…"
              className={`${INPUT_CLS} resize-none`}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="svc-duration" className={LABEL_CLS}>Czas trwania (min) *</label>
              <input
                id="svc-duration"
                type="number"
                required
                min="5"
                step="5"
                value={form.duration}
                onChange={(e) => handleFormChange("duration", e.target.value)}
                className={`${INPUT_CLS} tabular-nums`}
              />
            </div>
            <div>
              <label htmlFor="svc-price" className={LABEL_CLS}>Cena (PLN) *</label>
              <input
                id="svc-price"
                type="number"
                required
                min="0"
                step="0.01"
                value={form.price}
                onChange={(e) => handleFormChange("price", e.target.value)}
                placeholder="120"
                className={`${INPUT_CLS} tabular-nums`}
              />
            </div>
          </div>

          <div>
            <label htmlFor="svc-promo" className={LABEL_CLS}>Cena promocyjna (opcjonalnie)</label>
            <input
              id="svc-promo"
              type="number"
              min="0"
              step="0.01"
              value={form.discountedPrice}
              onChange={(e) => handleFormChange("discountedPrice", e.target.value)}
              placeholder="99"
              className={`${INPUT_CLS} tabular-nums`}
            />
          </div>

          {/* Deposit */}
          <div className="flex items-start gap-3 p-3.5 rounded-xl" style={CHIP}>
            <input
              type="checkbox"
              id="requiresDeposit"
              checked={form.requiresDeposit}
              onChange={(e) => handleFormChange("requiresDeposit", e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-slate-900"
            />
            <div className="flex-1">
              <label htmlFor="requiresDeposit" className="text-sm font-medium text-slate-800">
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
                  aria-label="Kwota zaliczki"
                  className={`${INPUT_CLS} tabular-nums mt-2`}
                />
              )}
            </div>
          </div>

          {/* Active toggle */}
          <div className="flex items-center justify-between p-3.5 rounded-xl" style={CHIP}>
            <span className="text-sm font-medium text-slate-800">Usługa aktywna</span>
            <button
              type="button"
              onClick={() => handleFormChange("isActive", !form.isActive)}
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
              {isPending ? "Zapisywanie…" : editingId ? "Zapisz zmiany" : "Dodaj usługę"}
            </InkButton>
          </div>
        </form>
      </GlassModal>
    </div>
  );
}
