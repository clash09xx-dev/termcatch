"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { CHANNEL_LABEL, type Channel } from "@/lib/marketing";
import type { SegmentView } from "./marketing-client";
import { saveAutomation, toggleAutomation, deleteAutomation, saveTemplate, deleteTemplate } from "@/lib/actions/marketing-manage";
import { GlassCard, CardHeader, EmptyState, InkButton, GlassButton, FormField } from "@/components/ui/glass";
import { CHIP, HAIRLINE, INK_GRADIENT } from "@/components/ui/glass/tokens";
import { GlassModal } from "@/components/ui/glass-modal";

const INPUT = "input-glass w-full px-3.5 py-2.5 text-sm rounded-xl outline-none text-slate-800 placeholder:text-slate-400";

export type AutomationRow = {
  id: string; type: string; name: string; channel: string; subject: string | null; body: string;
  enabled: boolean; config: { days?: number; delayHours?: number } | null; lastRunAt: string | null;
};
export type TemplateRow = { id: string; name: string; channel: string | null; subject: string | null; body: string };
export type CampaignRow = {
  id: string; channel: string; segment: string; subject: string | null; body: string;
  sent: number; failed: number; reachable: number; total: number; createdAt: string;
};
export type DeliveryStats = { sent: number; failed: number; skipped: number };

const AUTO_TYPES: { value: string; label: string; desc: string }[] = [
  { value: "birthday", label: "Urodziny", desc: "Wysyła życzenia w dniu urodzin klienta." },
  { value: "after_visit", label: "Po wizycie", desc: "Podziękowanie X godzin po zakończonej wizycie." },
  { value: "winback", label: "Odzyskanie klienta", desc: "Zachęta dla klientów bez wizyty od X dni." },
];
const DEFAULT_BODY: Record<string, string> = {
  birthday: "Cześć {imię}! 🎉 Z okazji urodzin {salon} ma dla Ciebie miłą niespodziankę. Zarezerwuj wizytę: {link}",
  after_visit: "Dziękujemy za wizytę, {imię}! Mamy nadzieję, że wszystko się podobało. Do zobaczenia wkrótce — {salon}: {link}",
  winback: "Cześć {imię}, dawno Cię u nas nie było! Wróć do {salon} — zarezerwuj termin: {link}",
};
const typeLabel = (t: string) => AUTO_TYPES.find((x) => x.value === t)?.label ?? t;

// ── Automations ──────────────────────────────────────────────────────────────
export function AutomationsPanel({ automations, channels }: { automations: AutomationRow[]; channels: Record<Channel, boolean> }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState<AutomationRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  function toggle(a: AutomationRow) {
    start(async () => {
      const res = await toggleAutomation(a.id, !a.enabled);
      if (!res.ok) setError(res.error ?? "Błąd.");
      router.refresh();
    });
  }
  function remove(id: string) {
    start(async () => { await deleteAutomation(id); router.refresh(); });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">Reguły działają automatycznie i są deterministyczne — wysyłają się tylko po włączeniu.</p>
        <InkButton onClick={() => { setCreating(true); setError(""); }}>Dodaj automatyzację</InkButton>
      </div>
      {error && <p className="text-xs" style={{ color: "#BE123C" }}>{error}</p>}

      {automations.length === 0 ? (
        <GlassCard><EmptyState icon={<BoltIcon />} title="Brak automatyzacji" body="Dodaj regułę, np. życzenia urodzinowe albo odzyskiwanie uśpionych klientów." action={<InkButton size="sm" onClick={() => setCreating(true)}>Dodaj automatyzację</InkButton>} /></GlassCard>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {automations.map((a) => (
            <GlassCard key={a.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate text-sm font-semibold text-slate-900">{a.name}</h3>
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-slate-500" style={CHIP}>{typeLabel(a.type)}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {CHANNEL_LABEL[a.channel as Channel]}
                    {a.type === "winback" && a.config?.days ? ` · po ${a.config.days} dniach` : ""}
                    {a.type === "after_visit" && a.config?.delayHours ? ` · ${a.config.delayHours}h po wizycie` : ""}
                    {!channels[a.channel as Channel] && <span style={{ color: "#B45309" }}> · kanał nieskonfigurowany</span>}
                  </p>
                </div>
                <button type="button" role="switch" aria-checked={a.enabled} disabled={pending} onClick={() => toggle(a)}
                  className="relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors"
                  style={{ background: a.enabled ? "#0F172A" : "rgba(148,163,184,0.45)" }}>
                  <span className={cn("inline-block h-4 w-4 rounded-full bg-white shadow transition-transform", a.enabled ? "translate-x-6" : "translate-x-1")} />
                </button>
              </div>
              <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-500">{a.body}</p>
              <div className="mt-3 flex items-center gap-2">
                <GlassButton onClick={() => { setEditing(a); setError(""); }}>Edytuj</GlassButton>
                <button type="button" onClick={() => remove(a.id)} disabled={pending} className="ml-auto text-xs font-medium text-slate-400 hover:text-rose-600">Usuń</button>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {(creating || editing) && (
        <AutomationModal
          initial={editing}
          channels={channels}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={() => { setCreating(false); setEditing(null); router.refresh(); }}
        />
      )}
    </div>
  );
}

function AutomationModal({ initial, channels, onClose, onSaved }: { initial: AutomationRow | null; channels: Record<Channel, boolean>; onClose: () => void; onSaved: () => void }) {
  const [type, setType] = useState(initial?.type ?? "winback");
  const [name, setName] = useState(initial?.name ?? "");
  const [channel, setChannel] = useState<Channel>((initial?.channel as Channel) ?? (channels.email ? "email" : "sms"));
  const [subject, setSubject] = useState(initial?.subject ?? "");
  const [body, setBody] = useState(initial?.body ?? DEFAULT_BODY.winback);
  const [days, setDays] = useState(initial?.config?.days ?? 60);
  const [delayHours, setDelayHours] = useState(initial?.config?.delayHours ?? 24);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  function pickType(t: string) { setType(t); if (!initial) setBody(DEFAULT_BODY[t]); }

  function save() {
    setError("");
    start(async () => {
      const res = await saveAutomation({ id: initial?.id, type, name, channel, subject: channel === "email" ? subject : null, body, days, delayHours });
      if (res.ok) onSaved(); else setError(res.error ?? "Błąd zapisu.");
    });
  }

  return (
    <GlassModal open onOpenChange={(o) => !o && onClose()} title={initial ? "Edytuj automatyzację" : "Nowa automatyzacja"}>
      <div className="space-y-3.5 mt-1">
        <div className="grid grid-cols-3 gap-2">
          {AUTO_TYPES.map((t) => (
            <button key={t.value} type="button" onClick={() => pickType(t.value)}
              className={cn("rounded-xl px-2 py-2 text-xs font-semibold transition-colors", type === t.value ? "text-white" : "text-slate-600")}
              style={type === t.value ? { background: INK_GRADIENT } : { border: "1px solid rgba(203,213,225,0.6)" }}>
              {t.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-500">{AUTO_TYPES.find((t) => t.value === type)?.desc}</p>
        <FormField label="Nazwa" htmlFor="a-name"><input id="a-name" value={name} onChange={(e) => setName(e.target.value)} placeholder={typeLabel(type)} className={INPUT} /></FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Kanał" htmlFor="a-ch">
            <select id="a-ch" value={channel} onChange={(e) => setChannel(e.target.value as Channel)} className={INPUT}>
              <option value="email">E-mail</option>
              <option value="sms">SMS</option>
            </select>
          </FormField>
          {type === "winback" && <FormField label="Dni bez wizyty" htmlFor="a-days"><input id="a-days" type="number" value={days} onChange={(e) => setDays(Number(e.target.value))} className={INPUT} /></FormField>}
          {type === "after_visit" && <FormField label="Godzin po wizycie" htmlFor="a-delay"><input id="a-delay" type="number" value={delayHours} onChange={(e) => setDelayHours(Number(e.target.value))} className={INPUT} /></FormField>}
        </div>
        {channel === "email" && <FormField label="Temat e-maila" htmlFor="a-subj"><input id="a-subj" value={subject} onChange={(e) => setSubject(e.target.value)} className={INPUT} /></FormField>}
        <FormField label="Treść" htmlFor="a-body" hint="Tokeny: {imię} {salon} {link} {usługa} {pracownik}">
          <textarea id="a-body" rows={4} value={body} onChange={(e) => setBody(e.target.value)} className={cn(INPUT, "resize-y")} />
        </FormField>
        {error && <p className="text-xs" style={{ color: "#BE123C" }}>{error}</p>}
        <div className="flex items-center gap-2 pt-1">
          <InkButton onClick={save} disabled={pending}>{pending ? "Zapisywanie…" : "Zapisz"}</InkButton>
          <GlassButton onClick={onClose}>Anuluj</GlassButton>
        </div>
      </div>
    </GlassModal>
  );
}

// ── Templates ────────────────────────────────────────────────────────────────
export function TemplatesPanel({ templates, onUse }: { templates: TemplateRow[]; onUse: (t: TemplateRow) => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState<TemplateRow | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">Gotowe treści do wielokrotnego użycia w kampaniach.</p>
        <InkButton onClick={() => setCreating(true)}>Nowy szablon</InkButton>
      </div>
      {templates.length === 0 ? (
        <GlassCard><EmptyState icon={<DocIcon />} title="Brak szablonów" body="Zapisz często używane treści, aby wstawiać je jednym kliknięciem." action={<InkButton size="sm" onClick={() => setCreating(true)}>Nowy szablon</InkButton>} /></GlassCard>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {templates.map((t) => (
            <GlassCard key={t.id} className="p-4">
              <div className="flex items-center gap-2">
                <h3 className="truncate text-sm font-semibold text-slate-900">{t.name}</h3>
                {t.channel && <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-slate-500" style={CHIP}>{CHANNEL_LABEL[t.channel as Channel]}</span>}
              </div>
              <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-slate-500">{t.body}</p>
              <div className="mt-3 flex items-center gap-2">
                <InkButton size="sm" onClick={() => onUse(t)}>Użyj w kampanii</InkButton>
                <GlassButton size="sm" onClick={() => setEditing(t)}>Edytuj</GlassButton>
                <button type="button" onClick={() => start(async () => { await deleteTemplate(t.id); router.refresh(); })} disabled={pending} className="ml-auto text-xs font-medium text-slate-400 hover:text-rose-600">Usuń</button>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
      {(creating || editing) && <TemplateModal initial={editing} onClose={() => { setCreating(false); setEditing(null); }} onSaved={() => { setCreating(false); setEditing(null); router.refresh(); }} />}
    </div>
  );
}

function TemplateModal({ initial, onClose, onSaved }: { initial: TemplateRow | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [channel, setChannel] = useState<string>(initial?.channel ?? "");
  const [subject, setSubject] = useState(initial?.subject ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  function save() {
    setError("");
    start(async () => {
      const res = await saveTemplate({ id: initial?.id, name, channel: channel || null, subject: subject || null, body });
      if (res.ok) onSaved(); else setError(res.error ?? "Błąd zapisu.");
    });
  }
  return (
    <GlassModal open onOpenChange={(o) => !o && onClose()} title={initial ? "Edytuj szablon" : "Nowy szablon"}>
      <div className="space-y-3.5 mt-1">
        <FormField label="Nazwa" htmlFor="t-name"><input id="t-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="np. Promocja weekendowa" className={INPUT} /></FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Kanał (opcjonalnie)" htmlFor="t-ch">
            <select id="t-ch" value={channel} onChange={(e) => setChannel(e.target.value)} className={INPUT}>
              <option value="">Dowolny</option><option value="sms">SMS</option><option value="email">E-mail</option>
            </select>
          </FormField>
          <FormField label="Temat (e-mail)" htmlFor="t-subj"><input id="t-subj" value={subject} onChange={(e) => setSubject(e.target.value)} className={INPUT} /></FormField>
        </div>
        <FormField label="Treść" htmlFor="t-body" hint="Tokeny: {imię} {salon} {link} {usługa} {pracownik}">
          <textarea id="t-body" rows={5} value={body} onChange={(e) => setBody(e.target.value)} className={cn(INPUT, "resize-y")} />
        </FormField>
        {error && <p className="text-xs" style={{ color: "#BE123C" }}>{error}</p>}
        <div className="flex items-center gap-2 pt-1">
          <InkButton onClick={save} disabled={pending}>{pending ? "Zapisywanie…" : "Zapisz"}</InkButton>
          <GlassButton onClick={onClose}>Anuluj</GlassButton>
        </div>
      </div>
    </GlassModal>
  );
}

// ── Segments (read-only overview) ────────────────────────────────────────────
export function SegmentsPanel({ segments }: { segments: SegmentView[] }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">Segmenty wyliczane na żywo z Twoich rezerwacji i zgód marketingowych.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {segments.map((s) => (
          <GlassCard key={s.key} className="p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">{s.label}</h3>
              <span className="text-lg font-bold text-slate-900 tabular-nums">{s.total}</span>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">{s.hint}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-500">
              <span className="rounded-full px-2 py-1" style={CHIP}>E-mail: {s.reach.email}</span>
              <span className="rounded-full px-2 py-1" style={CHIP}>SMS: {s.reach.sms}</span>
            </div>
          </GlassCard>
        ))}
      </div>
      <div className="flex items-start gap-2.5 rounded-2xl px-4 py-3" style={CHIP}>
        <InfoIcon />
        <p className="text-xs leading-relaxed text-slate-500">Segmenty własne (np. „klienci konkretnej usługi”, „wydali ponad X”) pojawią się jako kolejny krok. Dziś dostępne są cztery segmenty oparte na realnych danych.</p>
      </div>
    </div>
  );
}

// ── Results ──────────────────────────────────────────────────────────────────
export function ResultsPanel({ campaigns, delivery }: { campaigns: CampaignRow[]; delivery: DeliveryStats }) {
  const totalSent = campaigns.reduce((s, c) => s + c.sent, 0);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Kampanie" value={campaigns.length} />
        <Stat label="Wysłane (kampanie)" value={totalSent} />
        <Stat label="Wysłane (automatyzacje)" value={delivery.sent} />
        <Stat label="Nieudane" value={campaigns.reduce((s, c) => s + c.failed, 0) + delivery.failed} />
      </div>

      <GlassCard className="overflow-hidden">
        <CardHeader title="Historia kampanii" />
        {campaigns.length === 0 ? (
          <div className="p-6"><EmptyState icon={<ChartIcon />} title="Brak wysłanych kampanii" body="Wyślij pierwszą kampanię w zakładce „Kampania”." /></div>
        ) : (
          <div>
            {campaigns.map((c, i) => (
              <div key={c.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 sm:px-5 py-3" style={i > 0 ? { borderTop: HAIRLINE } : undefined}>
                <span className="w-[86px] flex-shrink-0 text-xs font-medium text-slate-500 tabular-nums">{new Date(c.createdAt).toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit", year: "numeric" })}</span>
                <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-slate-500" style={CHIP}>{CHANNEL_LABEL[c.channel as Channel]}</span>
                <span className="min-w-0 flex-1 truncate text-xs text-slate-600">{c.subject || c.body}</span>
                <span className="flex-shrink-0 text-xs font-semibold text-emerald-700 tabular-nums">{c.sent} wysł.</span>
                {c.failed > 0 && <span className="flex-shrink-0 text-xs font-semibold tabular-nums" style={{ color: "#BE123C" }}>{c.failed} bł.</span>}
                <span className="flex-shrink-0 text-[11px] text-slate-400 tabular-nums">z {c.reachable} osiągalnych</span>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      <div className="flex items-start gap-2.5 rounded-2xl px-4 py-3" style={CHIP}>
        <InfoIcon />
        <p className="text-xs leading-relaxed text-slate-500">
          Pokazujemy metryki, które mierzymy rzetelnie: liczbę wysłanych i nieudanych wiadomości. Pełna atrybucja rezerwacji
          i przychodu do kampanii (ROI) wymaga śledzenia linków — świadomie tego nie zgadujemy, dodamy je jako kolejny krok.
        </p>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl p-3.5" style={CHIP}>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-bold text-slate-900 tabular-nums">{value}</p>
    </div>
  );
}

// ── icons ─────────────────────────────────────────────────────────────────────
function BoltIcon() { return <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path d="M13 2 3 14h7l-1 8 10-12h-7z" /></svg>; }
function DocIcon() { return <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>; }
function ChartIcon() { return <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path d="M3 3v18h18M7 15l4-4 3 3 5-6" /></svg>; }
function InfoIcon() { return <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></svg>; }

export function PromotionsLink() {
  return (
    <Link href="/business/coupons" className="inline-flex items-center gap-1 text-sm font-semibold text-slate-700 hover:text-slate-900">
      Przejdź do Kuponów i promocji
      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
    </Link>
  );
}
