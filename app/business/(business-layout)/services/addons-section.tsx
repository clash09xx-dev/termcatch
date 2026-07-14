"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  GlassCard,
  CardHeader,
  EmptyState,
  InkButton,
  GlassButton,
  FormField,
  Overline,
  HAIRLINE,
  CHIP,
} from "@/components/ui/glass";
import { GlassModal } from "@/components/ui/glass-modal";
import { createAddon, updateAddon, deleteAddon, toggleAddon, reorderAddons, type AddonInput } from "@/lib/actions/addons";

export type AddonRow = {
  id: string;
  name: string;
  description: string | null;
  priceIncrease: number;
  durationIncrease: number;
  isActive: boolean;
  hasQuantity: boolean;
  minQuantity: number;
  maxQuantity: number;
  defaultQuantity: number;
  serviceIds: string[];
};

type ServiceOption = { id: string; name: string };

const INPUT = "input-glass w-full px-3.5 py-2.5 text-sm rounded-xl outline-none text-slate-800 placeholder:text-slate-400";

type FormState = {
  name: string;
  description: string;
  priceIncrease: string;
  durationIncrease: string;
  isActive: boolean;
  hasQuantity: boolean;
  minQuantity: string;
  maxQuantity: string;
  defaultQuantity: string;
  serviceIds: string[];
};

const EMPTY: FormState = {
  name: "",
  description: "",
  priceIncrease: "0",
  durationIncrease: "0",
  isActive: true,
  hasQuantity: false,
  minQuantity: "1",
  maxQuantity: "1",
  defaultQuantity: "1",
  serviceIds: [],
};

function toForm(a: AddonRow): FormState {
  return {
    name: a.name,
    description: a.description ?? "",
    priceIncrease: String(a.priceIncrease),
    durationIncrease: String(a.durationIncrease),
    isActive: a.isActive,
    hasQuantity: a.hasQuantity,
    minQuantity: String(a.minQuantity),
    maxQuantity: String(a.maxQuantity),
    defaultQuantity: String(a.defaultQuantity),
    serviceIds: a.serviceIds,
  };
}

function Check({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-2.5 text-sm text-slate-700"
    >
      <span
        className="relative w-9 h-5 rounded-full transition-colors flex-shrink-0"
        style={{ background: checked ? "#0F172A" : "rgba(203,213,225,0.6)" }}
      >
        <span
          className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform"
          style={{ left: 2, transform: checked ? "translateX(16px)" : "translateX(0)", boxShadow: "0 1px 2px rgba(0,0,0,0.2)" }}
        />
      </span>
      {label}
    </button>
  );
}

export function AddonsSection({ addons, services }: { addons: AddonRow[]; services: ServiceOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [err, setErr] = useState("");
  const [isPending, start] = useTransition();

  const serviceName = (id: string) => services.find((s) => s.id === id)?.name ?? "—";

  function openNew() {
    setEditingId(null);
    setForm(EMPTY);
    setErr("");
    setOpen(true);
  }
  function openEdit(a: AddonRow) {
    setEditingId(a.id);
    setForm(toForm(a));
    setErr("");
    setOpen(true);
  }

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function toggleService(id: string) {
    setForm((f) => ({
      ...f,
      serviceIds: f.serviceIds.includes(id) ? f.serviceIds.filter((x) => x !== id) : [...f.serviceIds, id],
    }));
  }

  function save() {
    setErr("");
    if (!form.name.trim()) {
      setErr("Podaj nazwę dodatku.");
      return;
    }
    const input: AddonInput = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      priceIncrease: parseFloat(form.priceIncrease) || 0,
      durationIncrease: parseInt(form.durationIncrease, 10) || 0,
      isActive: form.isActive,
      hasQuantity: form.hasQuantity,
      minQuantity: parseInt(form.minQuantity, 10) || 1,
      maxQuantity: parseInt(form.maxQuantity, 10) || 1,
      defaultQuantity: parseInt(form.defaultQuantity, 10) || 1,
      serviceIds: form.serviceIds,
    };
    start(async () => {
      try {
        if (editingId) await updateAddon(editingId, input);
        else await createAddon(input);
        setOpen(false);
        router.refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Nie udało się zapisać dodatku.");
      }
    });
  }

  function remove(id: string) {
    if (!confirm("Usunąć ten dodatek? Nie wpłynie to na już zarezerwowane wizyty.")) return;
    start(async () => {
      await deleteAddon(id);
      router.refresh();
    });
  }

  function toggle(id: string) {
    start(async () => {
      await toggleAddon(id);
      router.refresh();
    });
  }

  function move(index: number, dir: -1 | 1) {
    const next = [...addons];
    const j = index + dir;
    if (j < 0 || j >= next.length) return;
    [next[index], next[j]] = [next[j], next[index]];
    start(async () => {
      await reorderAddons(next.map((a) => a.id));
      router.refresh();
    });
  }

  return (
    <section className="max-w-6xl">
      <GlassCard className="overflow-hidden">
        <CardHeader
          title="Dodatki do usług"
          action={
            <InkButton size="sm" onClick={openNew}>
              Nowy dodatek
            </InkButton>
          }
        />
        {addons.length === 0 ? (
          <EmptyState
            icon={
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path d="M12 5v14M5 12h14" />
              </svg>
            }
            title="Brak dodatków"
            body="Dodatki to płatne rozszerzenia usługi (np. przedłużenie +40 zł / +30 min). Klient wybiera je przy rezerwacji, zanim wskaże termin."
            action={
              <InkButton size="sm" onClick={openNew}>
                Utwórz pierwszy dodatek
              </InkButton>
            }
          />
        ) : (
          <ul className="divide-y" style={{ borderColor: "rgba(203,213,225,0.35)" }}>
            {addons.map((a, i) => (
              <li key={a.id} className="flex items-center gap-3 px-5 py-3.5">
                <div className="flex flex-col gap-0.5">
                  <button
                    type="button"
                    aria-label="W górę"
                    disabled={i === 0 || isPending}
                    onClick={() => move(i, -1)}
                    className="text-slate-400 hover:text-slate-700 disabled:opacity-30 leading-none"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="m18 15-6-6-6 6" /></svg>
                  </button>
                  <button
                    type="button"
                    aria-label="W dół"
                    disabled={i === addons.length - 1 || isPending}
                    onClick={() => move(i, 1)}
                    className="text-slate-400 hover:text-slate-700 disabled:opacity-30 leading-none"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="m6 9 6 6 6-6" /></svg>
                  </button>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={cn("text-sm font-semibold truncate", a.isActive ? "text-slate-900" : "text-slate-400")}>{a.name}</p>
                    {!a.isActive && (
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 px-1.5 py-0.5 rounded" style={CHIP}>
                        Nieaktywny
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                    +{a.priceIncrease} zł
                    {a.durationIncrease > 0 && ` · +${a.durationIncrease} min`}
                    {a.hasQuantity && ` · ilość ${a.minQuantity}–${a.maxQuantity}`}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                    {a.serviceIds.length === 0
                      ? "Nieprzypisany do żadnej usługi"
                      : `Usługi: ${a.serviceIds.map(serviceName).join(", ")}`}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => toggle(a.id)}
                    disabled={isPending}
                    className="text-xs font-medium px-2.5 py-1.5 rounded-lg text-slate-600 disabled:opacity-50"
                    style={CHIP}
                  >
                    {a.isActive ? "Wyłącz" : "Włącz"}
                  </button>
                  <button
                    type="button"
                    onClick={() => openEdit(a)}
                    aria-label="Edytuj"
                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900"
                    style={CHIP}
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(a.id)}
                    aria-label="Usuń"
                    className="p-1.5 rounded-lg text-rose-500/80 hover:text-rose-600"
                    style={{ background: "rgba(244,63,94,0.06)", border: "1px solid rgba(244,63,94,0.20)" }}
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" /></svg>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </GlassCard>

      <GlassModal open={open} onOpenChange={setOpen} title={editingId ? "Edytuj dodatek" : "Nowy dodatek"} className="max-w-lg">
        <div className="space-y-4 mt-1">
          <FormField label="Nazwa" htmlFor="ao-name">
            <input id="ao-name" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Przedłużenie paznokci" className={INPUT} />
          </FormField>
          <FormField label="Opis (opcjonalnie)" htmlFor="ao-desc">
            <input id="ao-desc" value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Krótki opis dla klienta" className={INPUT} />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Dopłata (zł)" htmlFor="ao-price">
              <input id="ao-price" type="number" min={0} step="1" value={form.priceIncrease} onChange={(e) => set("priceIncrease", e.target.value)} className={INPUT} />
            </FormField>
            <FormField label="Dodatkowy czas (min)" htmlFor="ao-dur">
              <input id="ao-dur" type="number" min={0} step="5" value={form.durationIncrease} onChange={(e) => set("durationIncrease", e.target.value)} className={INPUT} />
            </FormField>
          </div>

          <div className="rounded-xl p-3.5" style={CHIP}>
            <Check checked={form.hasQuantity} onChange={(v) => set("hasQuantity", v)} label="Klient może wybrać ilość (np. liczba paznokci)" />
            {form.hasQuantity && (
              <div className="grid grid-cols-3 gap-3 mt-3">
                <FormField label="Min" htmlFor="ao-min">
                  <input id="ao-min" type="number" min={1} value={form.minQuantity} onChange={(e) => set("minQuantity", e.target.value)} className={INPUT} />
                </FormField>
                <FormField label="Maks" htmlFor="ao-max">
                  <input id="ao-max" type="number" min={1} value={form.maxQuantity} onChange={(e) => set("maxQuantity", e.target.value)} className={INPUT} />
                </FormField>
                <FormField label="Domyślnie" htmlFor="ao-def">
                  <input id="ao-def" type="number" min={1} value={form.defaultQuantity} onChange={(e) => set("defaultQuantity", e.target.value)} className={INPUT} />
                </FormField>
              </div>
            )}
          </div>

          <div>
            <Overline className="mb-2">Przypisz do usług</Overline>
            {services.length === 0 ? (
              <p className="text-xs text-slate-400">Najpierw dodaj usługę powyżej.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {services.map((s) => {
                  const on = form.serviceIds.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggleService(s.id)}
                      className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-colors", on ? "text-white" : "text-slate-600")}
                      style={on ? { background: "#0F172A", border: "1px solid #0F172A" } : { background: "rgba(255,255,255,0.7)", border: HAIRLINE }}
                    >
                      {s.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <Check checked={form.isActive} onChange={(v) => set("isActive", v)} label="Aktywny (widoczny przy rezerwacji)" />

          {err && (
            <p role="alert" className="text-sm font-medium rounded-xl px-3 py-2.5" style={{ background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.25)", color: "#BE123C" }}>
              {err}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <GlassButton onClick={() => setOpen(false)} className="flex-1">Anuluj</GlassButton>
            <InkButton onClick={save} disabled={isPending} className="flex-1">
              {isPending ? "Zapisywanie…" : "Zapisz dodatek"}
            </InkButton>
          </div>
        </div>
      </GlassModal>
    </section>
  );
}
