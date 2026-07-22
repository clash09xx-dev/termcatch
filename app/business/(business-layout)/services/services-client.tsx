"use client";

import { useState, useEffect, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { formatCurrency, formatDuration, cn } from "@/lib/utils";
import { createService, updateService, deleteService } from "@/lib/actions/services";
import type { Service } from "@prisma/client";
import { PageHeader, GlassCard, EmptyState, InkButton, GlassButton, FormField, Overline, HAIRLINE, CHIP } from "@/components/ui/glass";

type Props = { services: Service[]; businessId: string };
type Form = { name: string; description: string; duration: string; price: string; discountedPrice: string; isActive: boolean };
const EMPTY: Form = { name: "", description: "", duration: "60", price: "", discountedPrice: "", isActive: true };
const toForm = (s: Service): Form => ({ name: s.name, description: s.description ?? "", duration: String(s.duration), price: String(s.price), discountedPrice: s.discountedPrice ? String(s.discountedPrice) : "", isActive: s.isActive });
const INPUT = "input-glass w-full px-3.5 py-2.5 text-sm rounded-xl outline-none text-slate-800 placeholder:text-slate-400";

// Restrained, consistent service-FAMILY icons (not one per service). Picks a
// glyph from the service name's family with a safe generic fallback.
function serviceGlyphPath(name: string): React.ReactNode {
  const n = name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ł/g, "l");
  const has = (...ks: string[]) => ks.some((k) => n.includes(k));
  if (has("fryzj", "strzy", "wlos", "koloryz", "farbowan", "barber", "broda", "zarost", "golen"))
    return (<><circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><path d="M20 4 8.12 15.88" /><path d="M14.47 14.48 20 20" /><path d="M8.12 8.12 12 12" /></>);
  if (has("paznok", "manicure", "pedicure", "hybryd", "zel", "tips"))
    return (<><path d="M6 3h12l4 6-10 12L2 9l4-6z" /><path d="M2 9h20" /></>);
  if (has("masaz", "relaks", "joga", "yoga", "pilates", "fizjo", "rehab", "trener", "trening"))
    return (<><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" /><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" /></>);
  if (has("brwi", "rzes", "lash", "brow", "henna", "laminac"))
    return (<><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></>);
  if (has("makijaz", "makeup", "wizaz", "twarz", "peeling", "oczyszcz", "kosmetolog", "mezoterapi", "depilac", "wosk", "spa"))
    return (<path d="M12 3l1.9 5.6a2 2 0 0 0 1.3 1.3L21 12l-5.8 2.1a2 2 0 0 0-1.3 1.3L12 21l-1.9-5.6a2 2 0 0 0-1.3-1.3L3 12l5.8-2.1a2 2 0 0 0 1.3-1.3L12 3z" />);
  if (has("tatuaz", "tattoo", "piercing", "kolczyk", "dziar"))
    return (<><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></>);
  // Generic fallback — a tag.
  return (<><path d="M20.59 13.41 13.42 20.6a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82Z" /><circle cx="7" cy="7" r="1.5" /></>);
}

function ServiceGlyph({ name, active }: { name: string; active: boolean }) {
  return (
    <span
      className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
      style={{ background: active ? "rgba(148,163,184,0.16)" : "rgba(203,213,225,0.14)", border: "1px solid rgba(203,213,225,0.45)" }}
      aria-hidden="true"
    >
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke={active ? "#334155" : "#94A3B8"} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
        {serviceGlyphPath(name)}
      </svg>
    </span>
  );
}

export function ServicesClient({ services: initial }: Props) {
  const searchParams = useSearchParams();
  const [services, setServices] = useState(initial);
  const [editingId, setEditingId] = useState<string | null>(null); // service id
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<Form>(EMPTY);
  const [err, setErr] = useState("");
  const [isPending, start] = useTransition();
  const [previewId, setPreviewId] = useState<string | null>(null);

  useEffect(() => { if (searchParams.get("action") === "new") openCreate(); /* eslint-disable-next-line */ }, [searchParams]);

  function openCreate() { setEditingId(null); setForm(EMPTY); setCreating(true); setErr(""); }
  function openEdit(s: Service) { setCreating(false); setEditingId(s.id); setForm(toForm(s)); setErr(""); }
  function close() { setEditingId(null); setCreating(false); setForm(EMPTY); setErr(""); }
  const set = (k: keyof Form, v: string | boolean) => setForm((p) => ({ ...p, [k]: v }));

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return setErr("Podaj nazwę usługi.");
    if (!(parseFloat(form.price) > 0)) return setErr("Cena musi być większa niż 0 zł.");
    const data = {
      name: form.name.trim(), description: form.description || undefined,
      duration: parseInt(form.duration, 10), price: parseFloat(form.price),
      discountedPrice: form.discountedPrice ? parseFloat(form.discountedPrice) : undefined,
      isActive: form.isActive,
    };
    start(async () => {
      if (editingId) {
        await updateService(editingId, data);
        setServices((prev) => prev.map((s) => s.id === editingId ? { ...s, ...data, description: data.description ?? null, discountedPrice: data.discountedPrice ?? null } : s));
        close();
      } else {
        await createService(data);
        window.location.href = "/business/services"; // refresh to get new id
      }
    });
  }
  function remove(id: string) {
    if (!confirm("Usunąć tę usługę?")) return;
    start(async () => { await deleteService(id); setServices((prev) => prev.filter((s) => s.id !== id)); if (editingId === id) close(); });
  }
  function toggle(s: Service) {
    start(async () => { await updateService(s.id, { isActive: !s.isActive }); setServices((prev) => prev.map((x) => x.id === s.id ? { ...x, isActive: !x.isActive } : x)); });
  }

  const active = services.filter((s) => s.isActive);
  const preview = services.find((s) => s.id === previewId);

  const editor = (isCreate: boolean) => (
    <form onSubmit={save} className="rounded-2xl p-4 space-y-3" style={{ background: "rgba(255,255,255,0.7)", border: "1px solid rgba(148,163,184,0.5)", boxShadow: "0 6px 20px rgba(100,116,139,0.1), inset 0 1px 0 rgba(255,255,255,0.9)" }}>
      <FormField label="Nazwa usługi" htmlFor="svc-name">
        <input id="svc-name" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="np. Strzyżenie damskie" className={INPUT} autoFocus />
      </FormField>
      <FormField label="Opis" htmlFor="svc-desc">
        <input id="svc-desc" value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Krótki opis — opcjonalnie" className={INPUT} />
      </FormField>
      <div className="grid grid-cols-3 gap-2.5">
        <FormField label="Czas (min)" htmlFor="svc-dur">
          <input id="svc-dur" type="number" min={5} step={5} value={form.duration} onChange={(e) => set("duration", e.target.value)} className={cn(INPUT, "tabular-nums")} />
        </FormField>
        <FormField label="Cena (zł)" htmlFor="svc-price">
          <input id="svc-price" type="number" min={1} step={1} value={form.price} onChange={(e) => set("price", e.target.value)} placeholder="120" className={cn(INPUT, "tabular-nums")} />
        </FormField>
        <FormField label="Promo (zł)" htmlFor="svc-promo">
          <input id="svc-promo" type="number" min={0} step={1} value={form.discountedPrice} onChange={(e) => set("discountedPrice", e.target.value)} placeholder="—" className={cn(INPUT, "tabular-nums")} />
        </FormField>
      </div>
      <label className="flex items-center gap-2.5 py-1 cursor-pointer">
        <button type="button" role="switch" aria-checked={form.isActive} onClick={() => set("isActive", !form.isActive)} className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0" style={{ background: form.isActive ? "#0F172A" : "rgba(148,163,184,0.45)" }}>
          <span className={cn("inline-block h-3.5 w-3.5 mx-0.5 rounded-full bg-white shadow transition-transform", form.isActive ? "translate-x-4" : "translate-x-0")} />
        </button>
        <span className="text-sm text-slate-700">Aktywna — widoczna dla klientów</span>
      </label>
      {err && <p className="text-xs font-medium" style={{ color: "#BE123C" }}>{err}</p>}
      <div className="flex gap-2 pt-1">
        <GlassButton size="sm" onClick={close}>Anuluj</GlassButton>
        <InkButton size="sm" type="submit" disabled={isPending}>{isPending ? "Zapisywanie…" : isCreate ? "Dodaj usługę" : "Zapisz"}</InkButton>
      </div>
    </form>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <PageHeader
        title="Usługi"
        subtitle={<span className="tabular-nums">{services.length} {services.length === 1 ? "usługa" : "usług"} · {active.length} aktywnych</span>}
        actions={<InkButton onClick={openCreate}><svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M12 5v14M5 12h14" /></svg>Dodaj usługę</InkButton>}
      />

      {services.length === 0 && !creating ? (
        <GlassCard className="fade-rise fade-rise-d1">
          <EmptyState
            icon={<svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path d="M4 6h16M4 12h16M4 18h10" /></svg>}
            title="Brak usług"
            body="Dodaj pierwszą usługę, żeby klienci mogli rezerwować wizyty online."
            action={<InkButton size="sm" onClick={openCreate}>Dodaj pierwszą usługę</InkButton>}
          />
        </GlassCard>
      ) : (
        <div className="fade-rise fade-rise-d1 grid lg:grid-cols-[1fr_340px] gap-5 items-start">
          {/* List with inline editing */}
          <div className="space-y-2">
            {creating && editor(true)}
            {services.map((s) => (
              editingId === s.id ? (
                <div key={s.id}>{editor(false)}</div>
              ) : (
                <div
                  key={s.id}
                  onMouseEnter={() => setPreviewId(s.id)}
                  className="card-hover-lift rounded-2xl px-4 py-3.5 flex items-center gap-4"
                  style={{ background: "rgba(255,255,255,0.8)", border: "1px solid rgba(203,213,225,0.45)", boxShadow: "0 0 0 0.5px rgba(203,213,225,0.2), inset 0 1px 0 rgba(255,255,255,0.92)" }}
                >
                  <ServiceGlyph name={s.name} active={s.isActive} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[15px] font-semibold text-slate-900 truncate">{s.name}</p>
                      {!s.isActive && <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold text-slate-500" style={CHIP}>Ukryta</span>}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 tabular-nums">{formatDuration(s.duration)}{s.description && ` · ${s.description.slice(0, 48)}${s.description.length > 48 ? "…" : ""}`}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {s.discountedPrice ? (
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-xs text-slate-400 line-through tabular-nums">{formatCurrency(s.price)}</span>
                        <span className="text-base font-bold text-slate-900 tabular-nums">{formatCurrency(s.discountedPrice)}</span>
                      </div>
                    ) : <span className="text-base font-bold text-slate-900 tabular-nums">{formatCurrency(s.price)}</span>}
                  </div>
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    <button onClick={() => toggle(s)} disabled={isPending} className="icon-btn p-2 rounded-lg" style={{ color: "#94A3B8" }} aria-label={s.isActive ? "Ukryj" : "Pokaż"} title={s.isActive ? "Ukryj przed klientami" : "Pokaż klientom"}>
                      {s.isActive
                        ? <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /><path d="M10.7 5.1A10.4 10.4 0 0 1 12 5c7 0 10 7 10 7a13 13 0 0 1-1.7 2.7M6.6 6.6A13.5 13.5 0 0 0 2 12s3 7 10 7a9.7 9.7 0 0 0 5.4-1.6" /><path d="m2 2 20 20" /></svg>
                        : <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>}
                    </button>
                    <button onClick={() => openEdit(s)} className="icon-btn p-2 rounded-lg" style={{ color: "#94A3B8" }} aria-label="Edytuj"><svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg></button>
                    <button onClick={() => remove(s.id)} disabled={isPending} className="p-2 rounded-lg transition-colors" style={{ color: "#94A3B8" }} onMouseOver={(e) => (e.currentTarget.style.color = "#BE123C")} onMouseOut={(e) => (e.currentTarget.style.color = "#94A3B8")} aria-label="Usuń"><svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg></button>
                  </div>
                </div>
              )
            ))}
          </div>

          {/* Public preview */}
          <div className="lg:sticky lg:top-20">
            <GlassCard className="overflow-hidden">
              <div className="px-4 py-3" style={{ borderBottom: HAIRLINE }}>
                <Overline>Podgląd — tak widzi to klient</Overline>
              </div>
              <div className="p-4 space-y-2">
                {active.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-6">Brak aktywnych usług do pokazania.</p>
                ) : active.map((s) => (
                  <div key={s.id} className={cn("rounded-xl p-3 flex items-center gap-3 transition-all", preview?.id === s.id && "ring-2 ring-slate-300")} style={{ background: "rgba(255,255,255,0.85)", border: "1px solid rgba(203,213,225,0.45)" }}>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-slate-900 truncate">{s.name}</p>
                      <p className="text-[11px] text-slate-500 tabular-nums">{formatDuration(s.duration)}</p>
                    </div>
                    <span className="text-[13px] font-bold text-slate-900 tabular-nums">{formatCurrency(s.discountedPrice ?? s.price)}</span>
                    <span className="text-[11px] font-semibold px-2.5 py-1 rounded-lg text-slate-500" style={CHIP}>Umów</span>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>
        </div>
      )}
    </div>
  );
}
