"use client";

import { useState, useEffect, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { getInitials, cn } from "@/lib/utils";
import { createEmployee, updateEmployee, deleteEmployee } from "@/lib/actions/staff";
import type { Employee, EmployeeService, Service } from "@prisma/client";
import { PageHeader, GlassCard, EmptyState, InkButton, GlassButton, FormField, HAIRLINE, CHIP } from "@/components/ui/glass";
import { GlassModal } from "@/components/ui/glass-modal";
import { PlanLimitDialog } from "@/components/business/plan-limit-dialog";
import type { PlanLimitInfo } from "@/lib/entitlements";

type EmpWithServices = Employee & { services: (EmployeeService & { service: Service })[] };
type Props = { employees: EmpWithServices[]; availableServices: Service[]; weekLoad: Record<string, number> };
type Form = { firstName: string; lastName: string; email: string; phone: string; title: string; bio: string; color: string; isActive: boolean; serviceIds: string[] };

const COLORS = ["#334155", "#2563eb", "#0891b2", "#16a34a", "#65a30d", "#d97706", "#dc2626", "#db2777", "#7c3aed", "#0f766e", "#b45309", "#64748B"];
const EMPTY: Form = { firstName: "", lastName: "", email: "", phone: "", title: "", bio: "", color: COLORS[0], isActive: true, serviceIds: [] };
const toForm = (e: EmpWithServices): Form => ({ firstName: e.firstName, lastName: e.lastName, email: e.email ?? "", phone: e.phone ?? "", title: e.title ?? "", bio: e.bio ?? "", color: e.color, isActive: e.isActive, serviceIds: e.services.map((s) => s.serviceId) });
const INPUT = "input-glass w-full px-3.5 py-2.5 text-sm rounded-xl outline-none text-slate-800 placeholder:text-slate-400";

export function StaffClient({ employees, availableServices, weekLoad }: Props) {
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [isPending, start] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [limitInfo, setLimitInfo] = useState<PlanLimitInfo | null>(null);

  useEffect(() => { if (searchParams.get("action") === "new") openAdd(); /* eslint-disable-next-line */ }, [searchParams]);

  function openAdd() { setEditingId(null); setForm(EMPTY); setOpen(true); }
  function openEdit(e: EmpWithServices) { setEditingId(e.id); setForm(toForm(e)); setOpen(true); }
  const set = (k: keyof Form, v: Form[keyof Form]) => setForm((p) => ({ ...p, [k]: v }));
  const toggleSvc = (id: string) => setForm((p) => ({ ...p, serviceIds: p.serviceIds.includes(id) ? p.serviceIds.filter((x) => x !== id) : [...p.serviceIds, id] }));

  function save(e: React.FormEvent) {
    e.preventDefault();
    const data = { firstName: form.firstName, lastName: form.lastName, email: form.email || undefined, phone: form.phone || undefined, title: form.title || undefined, bio: form.bio || undefined, color: form.color, isActive: form.isActive, serviceIds: form.serviceIds };
    start(async () => {
      const res = editingId ? await updateEmployee(editingId, data) : await createEmployee(data);
      if (!res.ok) { setLimitInfo(res.limit); return; } // blocked by plan limit — show upgrade dialog
      window.location.href = "/business/staff";
    });
  }
  function remove(id: string) { if (!confirm("Usunąć tego pracownika?")) return; setDeletingId(id); start(async () => { await deleteEmployee(id); window.location.href = "/business/staff"; }); }
  function toggle(e: EmpWithServices) {
    start(async () => {
      const res = await updateEmployee(e.id, { isActive: !e.isActive });
      if (!res.ok) { setLimitInfo(res.limit); return; }
      window.location.href = "/business/staff";
    });
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <PageHeader
        title="Zespół"
        subtitle={<span className="tabular-nums">{employees.length} {employees.length === 1 ? "osoba" : "w zespole"}</span>}
        actions={<InkButton onClick={openAdd}><svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M12 5v14M5 12h14" /></svg>Dodaj osobę</InkButton>}
      />

      {employees.length === 0 ? (
        <GlassCard className="fade-rise fade-rise-d1">
          <EmptyState
            icon={<svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><circle cx="9" cy="8" r="3.2" /><path d="M3.5 20a5.5 5.5 0 0 1 11 0" /></svg>}
            title="Brak zespołu"
            body="Dodaj specjalistów, żeby klienci mogli wybrać konkretną osobę przy rezerwacji."
            action={<InkButton size="sm" onClick={openAdd}>Dodaj pierwszą osobę</InkButton>}
          />
        </GlassCard>
      ) : (
        <div className="fade-rise fade-rise-d1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {employees.map((e) => {
            const load = weekLoad[e.id] ?? 0;
            return (
              <div key={e.id} className={cn("card-hover-lift rounded-[20px] p-5 relative", !e.isActive && "opacity-70")} style={{ background: "rgba(255,255,255,0.8)", border: "1px solid rgba(203,213,225,0.45)", boxShadow: "0 0 0 0.5px rgba(203,213,225,0.2), 0 4px 14px rgba(100,116,139,0.06), inset 0 1px 0 rgba(255,255,255,0.92)" }}>
                {/* identity */}
                <div className="flex items-center gap-3.5">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-lg font-bold flex-shrink-0 overflow-hidden" style={{ backgroundColor: e.color, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25), 0 2px 8px rgba(15,23,42,0.12)" }}>
                    {e.avatarUrl ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={e.avatarUrl} alt="" className="w-14 h-14 object-cover" /> : getInitials(e.firstName, e.lastName)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[15px] font-semibold text-slate-900 truncate">{e.firstName} {e.lastName}</p>
                    <p className="text-xs text-slate-500 truncate">{e.title || "Specjalista"}{!e.isActive && " · nieaktywny"}</p>
                  </div>
                </div>

                {/* week load */}
                <div className="mt-4 flex items-center gap-2 text-xs">
                  <span className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={CHIP}>
                    <svg className="w-3.5 h-3.5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M3 10h18M8 2v4M16 2v4" /></svg>
                  </span>
                  <span className="text-slate-600">{load > 0 ? <><span className="font-semibold text-slate-900 tabular-nums">{load}</span> {load === 1 ? "wizyta" : "wizyty"} w tym tygodniu</> : "Wolny grafik w tym tygodniu"}</span>
                </div>

                {/* services */}
                {e.services.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {e.services.slice(0, 3).map((es) => <span key={es.serviceId} className="text-[10px] font-medium px-2 py-0.5 rounded-full text-slate-600" style={CHIP}>{es.service.name}</span>)}
                    {e.services.length > 3 && <span className="text-[10px] font-medium px-2 py-0.5 rounded-full text-slate-500 tabular-nums" style={CHIP}>+{e.services.length - 3}</span>}
                  </div>
                )}

                {/* actions */}
                <div className="mt-4 pt-3 flex items-center gap-2" style={{ borderTop: HAIRLINE }}>
                  <GlassButton size="sm" className="flex-1" onClick={() => toggle(e)} disabled={isPending}>{e.isActive ? "Ukryj" : "Aktywuj"}</GlassButton>
                  <button onClick={() => openEdit(e)} className="icon-btn p-2 rounded-lg" style={{ color: "#94A3B8" }} aria-label="Edytuj"><svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg></button>
                  <button onClick={() => remove(e.id)} disabled={deletingId === e.id} className="p-2 rounded-lg transition-colors" style={{ color: "#94A3B8" }} onMouseOver={(ev) => (ev.currentTarget.style.color = "#BE123C")} onMouseOut={(ev) => (ev.currentTarget.style.color = "#94A3B8")} aria-label="Usuń"><svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg></button>
                </div>
              </div>
            );
          })}

          {/* add-person ghost card */}
          <button onClick={openAdd} className="rounded-[20px] p-5 flex flex-col items-center justify-center gap-2 min-h-[180px] transition-colors hover:bg-white/40" style={{ border: "1.5px dashed rgba(148,163,184,0.5)", color: "#64748B" }}>
            <span className="w-11 h-11 rounded-2xl flex items-center justify-center" style={CHIP}><svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 5v14M5 12h14" /></svg></span>
            <span className="text-sm font-medium">Dodaj osobę</span>
          </button>
        </div>
      )}

      {/* Editor modal */}
      <GlassModal open={open} onOpenChange={setOpen} title={editingId ? "Edytuj osobę" : "Nowa osoba"} className="max-w-lg">
        <form onSubmit={save} className="space-y-4 mt-2 max-h-[64vh] overflow-y-auto pr-1 -mr-1">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Imię" htmlFor="e-fn"><input id="e-fn" required value={form.firstName} onChange={(ev) => set("firstName", ev.target.value)} className={INPUT} /></FormField>
            <FormField label="Nazwisko" htmlFor="e-ln"><input id="e-ln" required value={form.lastName} onChange={(ev) => set("lastName", ev.target.value)} className={INPUT} /></FormField>
          </div>
          <FormField label="Stanowisko" htmlFor="e-title"><input id="e-title" value={form.title} onChange={(ev) => set("title", ev.target.value)} placeholder="np. Barber, Stylistka" className={INPUT} /></FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="E-mail" htmlFor="e-email"><input id="e-email" type="email" value={form.email} onChange={(ev) => set("email", ev.target.value)} className={INPUT} /></FormField>
            <FormField label="Telefon" htmlFor="e-phone"><input id="e-phone" type="tel" value={form.phone} onChange={(ev) => set("phone", ev.target.value)} className={cn(INPUT, "tabular-nums")} /></FormField>
          </div>
          <div>
            <span className="block text-sm font-medium text-slate-700 mb-2">Kolor w kalendarzu</span>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Kolor">
              {COLORS.map((c) => (
                <button key={c} type="button" onClick={() => set("color", c)} aria-label={c} aria-pressed={form.color === c} className="w-8 h-8 rounded-full transition-transform hover:scale-110" style={{ backgroundColor: c, boxShadow: form.color === c ? "0 0 0 2px #fff, 0 0 0 4px #0F172A" : "inset 0 1px 0 rgba(255,255,255,0.25)" }} />
              ))}
            </div>
          </div>
          {availableServices.length > 0 && (
            <div>
              <span className="block text-sm font-medium text-slate-700 mb-2">Usługi</span>
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {availableServices.map((s) => (
                  <label key={s.id} className="row-hover flex items-center gap-2.5 p-2.5 rounded-xl cursor-pointer" style={{ border: "1px solid rgba(203,213,225,0.35)" }}>
                    <input type="checkbox" checked={form.serviceIds.includes(s.id)} onChange={() => toggleSvc(s.id)} className="w-4 h-4 accent-slate-900" />
                    <span className="text-sm text-slate-800">{s.name}</span>
                    <span className="text-xs text-slate-500 ml-auto tabular-nums">{s.duration} min</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          <label className="flex items-center justify-between p-3.5 rounded-xl" style={CHIP}>
            <span className="text-sm font-medium text-slate-800">Aktywny</span>
            <button type="button" role="switch" aria-checked={form.isActive} onClick={() => set("isActive", !form.isActive)} className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors" style={{ background: form.isActive ? "#0F172A" : "rgba(148,163,184,0.45)" }}>
              <span className={cn("inline-block h-4 w-4 rounded-full bg-white shadow transition-transform", form.isActive ? "translate-x-6" : "translate-x-1")} />
            </button>
          </label>
          <div className="flex gap-3 pt-1">
            <GlassButton onClick={() => setOpen(false)} className="flex-1">Anuluj</GlassButton>
            <InkButton type="submit" disabled={isPending} className="flex-1">{isPending ? "Zapisywanie…" : editingId ? "Zapisz" : "Dodaj osobę"}</InkButton>
          </div>
        </form>
      </GlassModal>

      {limitInfo && <PlanLimitDialog info={limitInfo} onClose={() => setLimitInfo(null)} />}
    </div>
  );
}
