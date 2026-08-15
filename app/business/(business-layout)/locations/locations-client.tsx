"use client";

import { useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import {
  createLocation,
  updateLocation,
  setPrimaryLocation,
  toggleLocationActive,
  type LocationMutationResult,
} from "@/lib/actions/locations";
import { PageHeader, GlassCard, EmptyState, InkButton, GlassButton, FormField, CHIP } from "@/components/ui/glass";
import { GlassModal } from "@/components/ui/glass-modal";
import { PlanLimitDialog } from "@/components/business/plan-limit-dialog";
import type { PlanLimitInfo } from "@/lib/entitlements";
import { useT } from "@/components/i18n/i18n-provider";
import { interpolate } from "@/lib/i18n/dictionaries";
import { useRouter } from "next/navigation";
import { notify, errorText } from "@/lib/notify";

type LocationRow = {
  id: string;
  name: string;
  addressLine: string | null;
  city: string | null;
  postalCode: string | null;
  phone: string | null;
  isPrimary: boolean;
  isActive: boolean;
  _count: { employees: number; services: number };
};

type Form = { name: string; addressLine: string; city: string; postalCode: string; phone: string; isActive: boolean };
const EMPTY: Form = { name: "", addressLine: "", city: "", postalCode: "", phone: "", isActive: true };
const toForm = (l: LocationRow): Form => ({
  name: l.name,
  addressLine: l.addressLine ?? "",
  city: l.city ?? "",
  postalCode: l.postalCode ?? "",
  phone: l.phone ?? "",
  isActive: l.isActive,
});
const INPUT = "input-glass w-full px-3.5 py-2.5 text-sm rounded-xl outline-none text-slate-800 placeholder:text-slate-400";

export function LocationsClient({ locations }: { locations: LocationRow[] }) {
  const t = useT();
  const T = t.pages.locations;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [isPending, start] = useTransition();
  const [limitInfo, setLimitInfo] = useState<PlanLimitInfo | null>(null);
  const [error, setError] = useState("");

  const set = (k: keyof Form, v: Form[keyof Form]) => setForm((p) => ({ ...p, [k]: v }));
  function openAdd() { setEditingId(null); setForm(EMPTY); setError(""); setOpen(true); }
  function openEdit(l: LocationRow) { setEditingId(l.id); setForm(toForm(l)); setError(""); setOpen(true); }

  function handleResult(res: LocationMutationResult) {
    if (res.ok) { notify.saved(t.feedback.saved); setOpen(false); router.refresh(); return; }
    // Close the form modal first so the upgrade dialog is clickable (Radix
    // overlay otherwise blocks pointer events on the body).
    if ("limit" in res) { setOpen(false); setLimitInfo(res.limit); return; }
    if ("error" in res) { setError(res.error); return; }
    setError(T.disabled); // disabled — shouldn't happen (page is gated)
  }

  function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const data = { name: form.name, addressLine: form.addressLine || undefined, city: form.city || undefined, postalCode: form.postalCode || undefined, phone: form.phone || undefined, isActive: form.isActive };
    start(async () => {
      const res = editingId ? await updateLocation(editingId, data) : await createLocation(data);
      handleResult(res);
    });
  }
  function makePrimary(id: string) { start(async () => handleResult(await setPrimaryLocation(id))); }
  function toggleActive(id: string) { start(async () => handleResult(await toggleLocationActive(id))); }

  return (
    <div className="space-y-5">
      <PageHeader
        title={T.title}
        subtitle={T.subtitle}
        actions={<InkButton onClick={openAdd}>{T.add}</InkButton>}
      />

      {locations.length === 0 ? (
        <GlassCard>
          <EmptyState
            icon={<svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path d="M12 21s-6-5.686-6-10a6 6 0 0 1 12 0c0 4.314-6 10-6 10Z" /><circle cx="12" cy="11" r="2" /></svg>}
            title={T.emptyTitle}
            body={T.emptyBody}
            action={<InkButton size="sm" onClick={openAdd}>{T.add}</InkButton>}
          />
        </GlassCard>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {locations.map((l) => (
            <GlassCard key={l.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-900 truncate">{l.name}</h3>
                    {l.isPrimary && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-900 text-white">{T.primary}</span>}
                    {!l.isActive && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">{T.inactive}</span>}
                  </div>
                  <p className="text-xs text-slate-500 mt-1 truncate">
                    {[l.addressLine, l.postalCode, l.city].filter(Boolean).join(", ") || T.noAddress}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">{interpolate(T.counts, { employees: l._count.employees, services: l._count.services })}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <GlassButton onClick={() => openEdit(l)}>{t.common.edit}</GlassButton>
                {!l.isPrimary && (
                  <button type="button" onClick={() => makePrimary(l.id)} disabled={isPending} className="text-xs font-medium text-slate-500 hover:text-slate-900 px-2.5 py-1.5">
                    {T.makePrimary}
                  </button>
                )}
                {!l.isPrimary && (
                  <button type="button" onClick={() => toggleActive(l.id)} disabled={isPending} className="text-xs font-medium text-slate-400 hover:text-slate-700 px-2.5 py-1.5 ml-auto">
                    {l.isActive ? T.deactivate : T.activate}
                  </button>
                )}
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      <GlassModal open={open} onOpenChange={setOpen} title={editingId ? T.editTitle : T.newTitle}>
        <form onSubmit={save} className="space-y-4 mt-2">
            <FormField label={T.fieldName} htmlFor="l-name">
              <input id="l-name" required value={form.name} onChange={(e) => set("name", e.target.value)} placeholder={T.namePh} className={INPUT} />
            </FormField>
            <FormField label={T.fieldAddress} htmlFor="l-addr">
              <input id="l-addr" value={form.addressLine} onChange={(e) => set("addressLine", e.target.value)} placeholder={T.addressPh} className={INPUT} />
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label={T.fieldPostal} htmlFor="l-zip"><input id="l-zip" value={form.postalCode} onChange={(e) => set("postalCode", e.target.value)} className={INPUT} /></FormField>
              <FormField label={T.fieldCity} htmlFor="l-city"><input id="l-city" value={form.city} onChange={(e) => set("city", e.target.value)} className={INPUT} /></FormField>
            </div>
            <FormField label={T.fieldPhone} htmlFor="l-phone"><input id="l-phone" value={form.phone} onChange={(e) => set("phone", e.target.value)} className={INPUT} /></FormField>
            <label className="flex items-center justify-between p-3.5 rounded-xl" style={CHIP}>
              <span className="text-sm font-medium text-slate-800">{T.activeLabel}</span>
              <button type="button" role="switch" aria-checked={form.isActive} onClick={() => set("isActive", !form.isActive)} className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0" style={{ background: form.isActive ? "#0F172A" : "rgba(148,163,184,0.45)" }}>
                <span className={cn("inline-block h-4 w-4 rounded-full bg-white shadow transition-transform", form.isActive ? "translate-x-6" : "translate-x-1")} />
              </button>
            </label>
            {error && <p className="text-xs" style={{ color: "#BE123C" }}>{error}</p>}
            <div className="flex items-center gap-2 pt-1">
              <InkButton type="submit" disabled={isPending}>{isPending ? t.pages.hours.saving : t.common.save}</InkButton>
              <GlassButton type="button" onClick={() => setOpen(false)}>{t.common.cancel}</GlassButton>
            </div>
        </form>
      </GlassModal>

      {limitInfo && <PlanLimitDialog info={limitInfo} onClose={() => setLimitInfo(null)} />}
    </div>
  );
}
