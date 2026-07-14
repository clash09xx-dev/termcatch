"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { formatCurrency, cn } from "@/lib/utils";
import { createCoupon, updateCoupon, toggleCoupon, deleteCoupon, type CouponInput } from "@/lib/actions/coupons";
import { PageHeader, GlassCard, EmptyState, InkButton, GlassButton, FormField, HAIRLINE, CHIP } from "@/components/ui/glass";
import { GlassModal } from "@/components/ui/glass-modal";
import type { CouponType } from "@prisma/client";

export type CouponRow = {
  id: string; code: string; name: string; type: CouponType; value: number;
  minOrderValue: number | null; maxUses: number | null; usesCount: number;
  validFrom: string; validUntil: string; isActive: boolean;
};
type Form = { code: string; name: string; type: "PERCENTAGE" | "FIXED_AMOUNT"; value: string; minOrderValue: string; maxUses: string; validFrom: string; validUntil: string; isActive: boolean };

const INPUT = "input-glass w-full px-3.5 py-2.5 text-sm rounded-xl outline-none text-slate-800 placeholder:text-slate-400";
const today = () => new Date().toISOString().slice(0, 10);
const plus90 = () => new Date(Date.now() + 90 * 86400_000).toISOString().slice(0, 10);
const EMPTY: Form = { code: "", name: "", type: "PERCENTAGE", value: "", minOrderValue: "", maxUses: "", validFrom: today(), validUntil: plus90(), isActive: true };

function toForm(c: CouponRow): Form {
  return { code: c.code, name: c.name, type: c.type === "FIXED_AMOUNT" ? "FIXED_AMOUNT" : "PERCENTAGE", value: String(c.value), minOrderValue: c.minOrderValue ? String(c.minOrderValue) : "", maxUses: c.maxUses ? String(c.maxUses) : "", validFrom: c.validFrom.slice(0, 10), validUntil: c.validUntil.slice(0, 10), isActive: c.isActive };
}
function valueLabel(c: { type: CouponType; value: number }) { return c.type === "PERCENTAGE" ? `${c.value}%` : formatCurrency(c.value); }
function statusOf(c: CouponRow): { label: string; style: React.CSSProperties } {
  const now = Date.now();
  if (!c.isActive) return { label: "Wyłączony", style: { background: "rgba(203,213,225,0.2)", border: "1px solid rgba(203,213,225,0.5)", color: "#64748B" } };
  if (new Date(c.validUntil).getTime() < now) return { label: "Wygasł", style: { background: "rgba(203,213,225,0.2)", border: "1px solid rgba(203,213,225,0.5)", color: "#64748B" } };
  if (new Date(c.validFrom).getTime() > now) return { label: "Zaplanowany", style: { background: "rgba(251,191,36,0.1)", border: "1px solid rgba(217,119,6,0.25)", color: "#B45309" } };
  return { label: "Aktywny", style: { background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)", color: "#047857" } };
}
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("pl-PL", { day: "numeric", month: "short" });

export function CouponsClient({ coupons }: { coupons: CouponRow[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [err, setErr] = useState("");
  const [isPending, start] = useTransition();

  useEffect(() => { if (searchParams.get("action") === "new") openCreate(); /* eslint-disable-next-line */ }, [searchParams]);

  function openCreate() { setEditingId(null); setForm(EMPTY); setErr(""); setOpen(true); }
  function openEdit(c: CouponRow) { setEditingId(c.id); setForm(toForm(c)); setErr(""); setOpen(true); }
  const set = (k: keyof Form, v: Form[keyof Form]) => setForm((p) => ({ ...p, [k]: v }));

  function save(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    const input: CouponInput = {
      code: form.code, name: form.name, type: form.type, value: parseFloat(form.value),
      minOrderValue: form.minOrderValue ? parseFloat(form.minOrderValue) : null,
      maxUses: form.maxUses ? parseInt(form.maxUses, 10) : null,
      validFrom: form.validFrom, validUntil: form.validUntil, isActive: form.isActive,
    };
    start(async () => {
      try {
        if (editingId) await updateCoupon(editingId, input); else await createCoupon(input);
        setOpen(false); router.refresh();
      } catch (e2) { setErr((e2 as { message?: string }).message ?? "Wystąpił błąd."); }
    });
  }
  function toggle(id: string) { start(async () => { await toggleCoupon(id); router.refresh(); }); }
  function remove(id: string) { if (!confirm("Usunąć ten kupon?")) return; start(async () => { await deleteCoupon(id); router.refresh(); }); }

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <PageHeader
        title="Kupony"
        subtitle={<span className="tabular-nums">{coupons.length} {coupons.length === 1 ? "kupon" : "kuponów"}</span>}
        actions={<InkButton onClick={openCreate}><svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M12 5v14M5 12h14" /></svg>Nowy kupon</InkButton>}
      />

      {coupons.length === 0 ? (
        <GlassCard className="fade-rise fade-rise-d1">
          <EmptyState
            icon={<svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 0 0 6v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-6Z" /></svg>}
            title="Brak kuponów"
            body="Twórz kody rabatowe — procentowe lub kwotowe, z limitem użyć i datą ważności."
            action={<InkButton size="sm" onClick={openCreate}>Utwórz pierwszy kupon</InkButton>}
          />
        </GlassCard>
      ) : (
        <GlassCard className="fade-rise fade-rise-d1 overflow-hidden">
          {coupons.map((c, i) => {
            const st = statusOf(c);
            return (
              <div key={c.id} className="row-hover flex items-center gap-4 px-5 py-3.5" style={i > 0 ? { borderTop: HAIRLINE } : undefined}>
                <span className="font-mono text-[13px] font-bold text-slate-900 px-2.5 py-1 rounded-lg tracking-wide flex-shrink-0" style={CHIP}>{c.code}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{c.name}</p>
                  <p className="text-xs text-slate-500 tabular-nums">
                    {valueLabel(c)} rabatu{c.minOrderValue ? ` · od ${formatCurrency(c.minOrderValue)}` : ""} · {fmtDate(c.validFrom)}–{fmtDate(c.validUntil)}
                  </p>
                </div>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0" style={st.style}>{st.label}</span>
                <div className="flex items-center gap-0.5 flex-shrink-0">
                  <button onClick={() => toggle(c.id)} disabled={isPending} className="icon-btn p-2 rounded-lg" style={{ color: "#94A3B8" }} aria-label={c.isActive ? "Wyłącz" : "Włącz"} title={c.isActive ? "Wyłącz kupon" : "Włącz kupon"}>
                    {c.isActive ? <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2M10.7 5.1A10.4 10.4 0 0 1 12 5c7 0 10 7 10 7a13 13 0 0 1-1.7 2.7M6.6 6.6A13.5 13.5 0 0 0 2 12s3 7 10 7a9.7 9.7 0 0 0 5.4-1.6M2 2l20 20" /></svg> : <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>}
                  </button>
                  <button onClick={() => openEdit(c)} className="icon-btn p-2 rounded-lg" style={{ color: "#94A3B8" }} aria-label="Edytuj"><svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg></button>
                  <button onClick={() => remove(c.id)} disabled={isPending} className="p-2 rounded-lg transition-colors" style={{ color: "#94A3B8" }} onMouseOver={(e) => (e.currentTarget.style.color = "#BE123C")} onMouseOut={(e) => (e.currentTarget.style.color = "#94A3B8")} aria-label="Usuń"><svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg></button>
                </div>
              </div>
            );
          })}
        </GlassCard>
      )}

      <GlassModal open={open} onOpenChange={setOpen} title={editingId ? "Edytuj kupon" : "Nowy kupon"} className="max-w-md">
        <form onSubmit={save} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Kod" htmlFor="c-code"><input id="c-code" value={form.code} onChange={(e) => set("code", e.target.value.toUpperCase())} placeholder="WELCOME20" className={cn(INPUT, "font-mono uppercase")} autoFocus /></FormField>
            <FormField label="Nazwa" htmlFor="c-name"><input id="c-name" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Powitalny" className={INPUT} /></FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Typ" htmlFor="c-type">
              <div className="relative">
                <select id="c-type" value={form.type} onChange={(e) => set("type", e.target.value as Form["type"])} className={cn(INPUT, "appearance-none pr-9")}>
                  <option value="PERCENTAGE">Procentowy (%)</option>
                  <option value="FIXED_AMOUNT">Kwotowy (zł)</option>
                </select>
                <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="m19 9-7 7-7-7" /></svg>
              </div>
            </FormField>
            <FormField label={form.type === "PERCENTAGE" ? "Wartość (%)" : "Wartość (zł)"} htmlFor="c-val"><input id="c-val" type="number" min={1} value={form.value} onChange={(e) => set("value", e.target.value)} placeholder={form.type === "PERCENTAGE" ? "20" : "50"} className={cn(INPUT, "tabular-nums")} /></FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Min. wartość (zł)" htmlFor="c-min" hint="opcjonalnie"><input id="c-min" type="number" min={0} value={form.minOrderValue} onChange={(e) => set("minOrderValue", e.target.value)} placeholder="—" className={cn(INPUT, "tabular-nums")} /></FormField>
            <FormField label="Limit użyć" htmlFor="c-max" hint="opcjonalnie"><input id="c-max" type="number" min={1} value={form.maxUses} onChange={(e) => set("maxUses", e.target.value)} placeholder="bez limitu" className={cn(INPUT, "tabular-nums")} /></FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Ważny od" htmlFor="c-from"><input id="c-from" type="date" value={form.validFrom} onChange={(e) => set("validFrom", e.target.value)} className={cn(INPUT, "tabular-nums")} /></FormField>
            <FormField label="Ważny do" htmlFor="c-until"><input id="c-until" type="date" value={form.validUntil} onChange={(e) => set("validUntil", e.target.value)} className={cn(INPUT, "tabular-nums")} /></FormField>
          </div>
          <label className="flex items-center justify-between p-3.5 rounded-xl" style={CHIP}>
            <span className="text-sm font-medium text-slate-800">Aktywny</span>
            <button type="button" role="switch" aria-checked={form.isActive} onClick={() => set("isActive", !form.isActive)} className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors" style={{ background: form.isActive ? "#0F172A" : "rgba(148,163,184,0.45)" }}>
              <span className={cn("inline-block h-4 w-4 rounded-full bg-white shadow transition-transform", form.isActive ? "translate-x-6" : "translate-x-1")} />
            </button>
          </label>
          {err && <p className="text-xs font-medium" style={{ color: "#BE123C" }}>{err}</p>}
          <div className="flex gap-3 pt-1">
            <GlassButton onClick={() => setOpen(false)} className="flex-1">Anuluj</GlassButton>
            <InkButton type="submit" disabled={isPending} className="flex-1">{isPending ? "Zapisywanie…" : editingId ? "Zapisz" : "Utwórz kupon"}</InkButton>
          </div>
        </form>
      </GlassModal>
    </div>
  );
}
