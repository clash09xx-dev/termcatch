"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { getInitials, cn } from "@/lib/utils";
import { updateEmployee, deleteEmployee, updateEmployeeWorkingHours, type EmployeeDayInput } from "@/lib/actions/staff";
import { uploadBusinessImage } from "@/lib/actions/upload";
import type { DayOfWeek, Employee, EmployeeService, Service } from "@prisma/client";
import { PageHeader, GlassCard, EmptyState, InkButton, GlassButton, FormField, HAIRLINE, CHIP } from "@/components/ui/glass";
import { GlassModal } from "@/components/ui/glass-modal";
import { PlanLimitDialog } from "@/components/business/plan-limit-dialog";
import { EmployeeAccountControls } from "@/components/business/employee-account-controls";
import type { PlanLimitInfo } from "@/lib/entitlements";
import { useT } from "@/components/i18n/i18n-provider";
import { notify, errorText } from "@/lib/notify";
import { ConfirmDialog } from "@/components/ui/glass-modal";
import { JoinCodeCard } from "@/components/business/join-code-card";
import { JoinRequestsCard, type PendingJoinRequest } from "@/components/business/join-requests-card";

type EmpHours = { dayOfWeek: DayOfWeek; isWorking: boolean; startTime: string; endTime: string };
type EmpWithServices = Employee & {
  services: (EmployeeService & { service: Service })[];
  workingHours: EmpHours[];
};
type Props = {
  employees: EmpWithServices[];
  availableServices: Service[];
  weekLoad: Record<string, number>;
  inviteStatus?: Record<string, string>;
  /** Used for the salon-specific invite wording and the join-code panel. */
  salonName: string;
  joinCode: string | null;
  /** People who typed the code and are waiting on this owner's decision. */
  pendingRequests: PendingJoinRequest[];
};
type Form = { firstName: string; lastName: string; email: string; phone: string; title: string; bio: string; avatarUrl: string; color: string; isActive: boolean; isAccepting: boolean; serviceIds: string[] };

const COLORS = ["#334155", "#2563eb", "#0891b2", "#16a34a", "#65a30d", "#d97706", "#dc2626", "#db2777", "#7c3aed", "#0f766e", "#b45309", "#64748B"];
const EMPTY: Form = { firstName: "", lastName: "", email: "", phone: "", title: "", bio: "", avatarUrl: "", color: COLORS[0], isActive: true, isAccepting: true, serviceIds: [] };
const toForm = (e: EmpWithServices): Form => ({ firstName: e.firstName, lastName: e.lastName, email: e.email ?? "", phone: e.phone ?? "", title: e.title ?? "", bio: e.bio ?? "", avatarUrl: e.avatarUrl ?? "", color: e.color, isActive: e.isActive, isAccepting: e.isAccepting, serviceIds: e.services.map((s) => s.serviceId) });
const INPUT = "input-glass w-full px-3.5 py-2.5 text-sm rounded-xl outline-none text-slate-800 placeholder:text-slate-400";

const DAY_ORDER: DayOfWeek[] = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];
// Same fixed "HH:MM" half-hour grid the salon hours page uses, so both screens
// read identically regardless of the browser's 12/24-hour preference.
const TIMES: string[] = [];
for (let h = 0; h < 24; h++) for (let m = 0; m < 60; m += 30) TIMES.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
const toMin = (t: string): number => { const [h, m] = t.split(":").map(Number); return h * 60 + (m || 0); };

/**
 * The specialist's own schedule, as the owner edits it.
 *
 * "Custom hours" off means NO rows are written, which the availability engine
 * reads as "follow the salon's opening hours" — the opposite of writing seven
 * closed days. The toggle exists so that difference is expressible at all.
 */
type ScheduleState = { custom: boolean; days: EmpHours[] };
const defaultDays = (): EmpHours[] =>
  DAY_ORDER.map((d) => ({
    dayOfWeek: d,
    isWorking: d !== "SUNDAY",
    startTime: "09:00",
    endTime: "17:00",
  }));
const toSchedule = (e: EmpWithServices): ScheduleState =>
  e.workingHours.length > 0
    ? {
        custom: true,
        days: DAY_ORDER.map(
          (d) =>
            e.workingHours.find((h) => h.dayOfWeek === d) ?? {
              dayOfWeek: d,
              isWorking: false,
              startTime: "09:00",
              endTime: "17:00",
            }
        ),
      }
    : { custom: false, days: defaultDays() };

export function StaffClient({ employees, availableServices, weekLoad, inviteStatus = {}, salonName, joinCode, pendingRequests }: Props) {
  const t = useT();
  const T = t.pages.staff;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingLinked, setEditingLinked] = useState(false);
  const [form, setForm] = useState<Form>(EMPTY);
  const [schedule, setSchedule] = useState<ScheduleState>({ custom: false, days: defaultDays() });
  const [isPending, start] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [limitInfo, setLimitInfo] = useState<PlanLimitInfo | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState("");
  const [confirmId, setConfirmId] = useState<string | null>(null);

  async function onAvatar(file: File | null) {
    if (!file) return;
    setUploadErr("");
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await uploadBusinessImage(fd);
      if (res.error) setUploadErr(res.error);
      else if (res.url) set("avatarUrl", res.url);
    } catch {
      setUploadErr(T.uploadFail);
    } finally {
      setUploading(false);
    }
  }

  function openEdit(e: EmpWithServices) {
    setEditingId(e.id);
    setEditingLinked(e.userId !== null);
    setForm(toForm(e));
    setSchedule(toSchedule(e));
    setOpen(true);
  }
  const set = (k: keyof Form, v: Form[keyof Form]) => setForm((p) => ({ ...p, [k]: v }));
  const toggleSvc = (id: string) => setForm((p) => ({ ...p, serviceIds: p.serviceIds.includes(id) ? p.serviceIds.filter((x) => x !== id) : [...p.serviceIds, id] }));
  const setDay = (d: DayOfWeek, patch: Partial<EmpHours>) =>
    setSchedule((p) => ({ ...p, days: p.days.map((h) => (h.dayOfWeek === d ? { ...h, ...patch } : h)) }));

  const scheduleInvalid =
    schedule.custom && schedule.days.some((h) => h.isWorking && toMin(h.endTime) <= toMin(h.startTime));

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId || scheduleInvalid) return;
    const data = { firstName: form.firstName, lastName: form.lastName, email: form.email || undefined, phone: form.phone || undefined, title: form.title || undefined, bio: form.bio || undefined, avatarUrl: form.avatarUrl || "", color: form.color, isActive: form.isActive, isAccepting: form.isAccepting, serviceIds: form.serviceIds };
    // "No custom hours" is expressed as an EMPTY schedule, not as seven closed
    // days — the availability engine reads the two as opposites.
    const days: EmployeeDayInput[] = schedule.custom ? schedule.days : [];
    start(async () => {
      const res = await updateEmployee(editingId, data);
      // Close the form modal first — otherwise its Radix overlay keeps
      // pointer-events:none on the body and the upgrade dialog is unclickable.
      if (!res.ok) { setOpen(false); setLimitInfo(res.limit); return; }
      const hoursRes = await updateEmployeeWorkingHours(editingId, days);
      setOpen(false);
      if (!hoursRes.ok) { notify.error(hoursRes.error); router.refresh(); return; }
      notify.saved(t.feedback.saved);
      router.refresh();
    });
  }
  function remove(id: string) {
    setDeletingId(id);
    start(async () => {
      try {
        await deleteEmployee(id);
        notify.saved(t.feedback.deleted);
        router.refresh();
      } catch (e) {
        notify.error(errorText(e, t.feedback.deleteFailed));
      } finally {
        setDeletingId(null);
        setConfirmId(null);
      }
    });
  }
  function toggle(e: EmpWithServices) {
    start(async () => {
      const res = await updateEmployee(e.id, { isActive: !e.isActive });
      if (!res.ok) { setOpen(false); setLimitInfo(res.limit); return; }
      notify.saved(t.feedback.updated);
      router.refresh();
    });
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* No "Add person" action: a specialist is a real account now, and the
          only way onto the team is the join code below plus this owner's
          approval. See lib/actions/staff.ts for why the create path is gone. */}
      <PageHeader
        title={T.title}
        subtitle={<span className="tabular-nums">{employees.length} {employees.length === 1 ? T.one : T.many}</span>}
      />

      {/* The two halves of one mechanism, read top to bottom: the code goes
          out, the requests come back, the team is what came through. */}
      <JoinCodeCard code={joinCode} salonName={salonName} />
      <JoinRequestsCard requests={pendingRequests} />

      {employees.length === 0 ? (
        <GlassCard className="fade-rise fade-rise-d1">
          <EmptyState
            icon={<svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><circle cx="9" cy="8" r="3.2" /><path d="M3.5 20a5.5 5.5 0 0 1 11 0" /></svg>}
            title={T.emptyTitle}
            body={T.emptyBody}
          />
        </GlassCard>
      ) : (
        <div className="fade-rise fade-rise-d1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {employees.map((e) => {
            const load = weekLoad[e.id] ?? 0;
            return (
              <div key={e.id} className={cn("card-hover-lift rounded-[20px] p-5 relative", !e.isActive && "opacity-70")} style={{ background: "var(--surface)", border: "1px solid var(--hairline)", boxShadow: "var(--e1)" }}>
                {/* identity */}
                <div className="flex items-center gap-3.5">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-lg font-bold flex-shrink-0 overflow-hidden" style={{ backgroundColor: e.color, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25), 0 2px 8px rgba(15,23,42,0.12)" }}>
                    {e.avatarUrl ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={e.avatarUrl} alt="" className="w-14 h-14 object-cover" /> : getInitials(e.firstName, e.lastName)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[15px] font-semibold text-slate-900 truncate">{e.firstName} {e.lastName}</p>
                    <p className="text-xs text-slate-500 truncate">{e.title || T.roleDefault}{!e.isActive && ` · ${T.inactiveSuffix}`}</p>
                  </div>
                </div>

                {/* week load */}
                <div className="mt-4 flex items-center gap-2 text-xs">
                  <span className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={CHIP}>
                    <svg className="w-3.5 h-3.5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M3 10h18M8 2v4M16 2v4" /></svg>
                  </span>
                  <span className="text-slate-600">{load > 0 ? <><span className="font-semibold text-slate-900 tabular-nums">{load}</span> {load === 1 ? T.visitOne : T.visitMany} {T.loadWeek}</> : T.freeWeek}</span>
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
                  <GlassButton size="sm" className="flex-1" onClick={() => toggle(e)} disabled={isPending}>{e.isActive ? T.hide : T.activate}</GlassButton>
                  <button onClick={() => openEdit(e)} className="icon-btn p-2 rounded-lg" style={{ color: "#94A3B8" }} aria-label={t.common.edit}><svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg></button>
                  <button onClick={() => setConfirmId(e.id)} disabled={deletingId === e.id} className="p-2 rounded-lg transition-colors" style={{ color: "#94A3B8" }} onMouseOver={(ev) => (ev.currentTarget.style.color = "#BE123C")} onMouseOut={(ev) => (ev.currentTarget.style.color = "#94A3B8")} aria-label={t.common.delete}><svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg></button>
                </div>

                <EmployeeAccountControls employeeId={e.id} hasAccount={Boolean(e.userId)} hasEmail={Boolean(e.email)} inviteStatus={inviteStatus[e.id] ?? null} salonName={salonName} />
              </div>
            );
          })}
        </div>
      )}

      {/* Editor modal */}
      <GlassModal open={open} onOpenChange={setOpen} title={T.editTitle} className="max-w-lg">
        <form onSubmit={save} className="space-y-4 mt-2 max-h-[64vh] overflow-y-auto pr-1 -mr-1">
          {/* Avatar — reuses the secured business-media upload flow */}
          <div className="flex items-center gap-3">
            <span className="w-16 h-16 rounded-2xl overflow-hidden flex items-center justify-center flex-shrink-0 text-white font-semibold" style={{ background: form.color }}>
              {form.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                getInitials(form.firstName || "?", form.lastName || "")
              )}
            </span>
            <div>
              <label className="btn-spring inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer" style={{ background: "var(--surface)", border: "1px solid var(--hairline)", color: "#334155" }}>
                {uploading ? T.uploading : form.avatarUrl ? T.changePhoto : T.addPhoto}
                <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" disabled={uploading} onChange={(e) => onAvatar(e.target.files?.[0] ?? null)} />
              </label>
              {form.avatarUrl && (
                <button type="button" onClick={() => set("avatarUrl", "")} className="ml-2 text-xs text-slate-400 hover:text-rose-600">{t.common.delete}</button>
              )}
              {uploadErr && <p className="text-[11px] mt-1" style={{ color: "#BE123C" }}>{uploadErr}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label={T.firstName} htmlFor="e-fn"><input id="e-fn" required value={form.firstName} onChange={(ev) => set("firstName", ev.target.value)} className={INPUT} /></FormField>
            <FormField label={T.lastName} htmlFor="e-ln"><input id="e-ln" required value={form.lastName} onChange={(ev) => set("lastName", ev.target.value)} className={INPUT} /></FormField>
          </div>
          <FormField label={T.role} htmlFor="e-title"><input id="e-title" value={form.title} onChange={(ev) => set("title", ev.target.value)} placeholder={T.rolePh} className={INPUT} /></FormField>
          <FormField label={T.bio} htmlFor="e-bio"><textarea id="e-bio" rows={3} value={form.bio} onChange={(ev) => set("bio", ev.target.value)} placeholder={T.bioPh} className={cn(INPUT, "resize-none")} /></FormField>
          {/* Contact details belong to whoever owns the account. On a linked
              specialist they are shown, not edited — the server ignores changes
              to them too, so this is a visible statement of a real rule rather
              than a disabled input that hides one. */}
          <div className="grid grid-cols-2 gap-3">
            <FormField label={t.auth.email} htmlFor="e-email"><input id="e-email" type="email" value={form.email} onChange={(ev) => set("email", ev.target.value)} readOnly={editingLinked} aria-readonly={editingLinked} className={cn(INPUT, editingLinked && "opacity-70")} /></FormField>
            <FormField label={t.auth.phone} htmlFor="e-phone"><input id="e-phone" type="tel" value={form.phone} onChange={(ev) => set("phone", ev.target.value)} readOnly={editingLinked} aria-readonly={editingLinked} className={cn(INPUT, "tabular-nums", editingLinked && "opacity-70")} /></FormField>
          </div>
          {editingLinked && <p className="text-[11.5px] text-muted-glass -mt-2">{T.contactOwned}</p>}
          <div>
            <span className="block text-sm font-medium text-slate-700 mb-2">{T.colorLabel}</span>
            <div className="flex flex-wrap gap-2" role="group" aria-label={T.colorAria}>
              {COLORS.map((c) => (
                <button key={c} type="button" onClick={() => set("color", c)} aria-label={c} aria-pressed={form.color === c} className="w-8 h-8 rounded-full transition-transform hover:scale-110" style={{ backgroundColor: c, boxShadow: form.color === c ? "0 0 0 2px #fff, 0 0 0 4px #0F172A" : "inset 0 1px 0 rgba(255,255,255,0.25)" }} />
              ))}
            </div>
          </div>
          {availableServices.length > 0 && (
            <div>
              <span className="block text-sm font-medium text-slate-700 mb-2">{T.servicesLabel}</span>
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {availableServices.map((s) => (
                  <label key={s.id} className="row-hover flex items-center gap-2.5 p-2.5 rounded-xl cursor-pointer" style={{ border: "1px solid var(--hairline-soft)" }}>
                    <input type="checkbox" checked={form.serviceIds.includes(s.id)} onChange={() => toggleSvc(s.id)} className="w-4 h-4 accent-slate-900" />
                    <span className="text-sm text-slate-800">{s.name}</span>
                    <span className="text-xs text-slate-500 ml-auto tabular-nums">{s.duration} min</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          {/* Per-specialist schedule. The availability engine has always read
              EmployeeWorkingHours to narrow this person's bookable window
              inside salon hours — nothing ever wrote them until now. */}
          <div className="p-3.5 rounded-xl" style={CHIP}>
            <div className="flex items-center justify-between gap-3">
              <span>
                <span className="text-sm font-medium text-slate-800">{T.scheduleTitle}</span>
                <span className="block text-xs text-slate-500 mt-0.5">{T.scheduleHint}</span>
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={schedule.custom}
                aria-label={T.scheduleUse}
                onClick={() => setSchedule((p) => ({ ...p, custom: !p.custom }))}
                className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0"
                style={{ background: schedule.custom ? "#0F172A" : "rgba(148,163,184,0.45)" }}
              >
                <span className={cn("inline-block h-4 w-4 rounded-full bg-white shadow transition-transform", schedule.custom ? "translate-x-6" : "translate-x-1")} />
              </button>
            </div>

            {schedule.custom && (
              <div className="mt-3 space-y-1.5">
                {schedule.days.map((h) => {
                  const invalid = h.isWorking && toMin(h.endTime) <= toMin(h.startTime);
                  return (
                    <div key={h.dayOfWeek} className="flex items-center gap-2 py-1">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={h.isWorking}
                        aria-label={`${t.weekdays.full[h.dayOfWeek]} — ${h.isWorking ? T.scheduleTitle : T.scheduleDayOff}`}
                        onClick={() => setDay(h.dayOfWeek, { isWorking: !h.isWorking })}
                        className="relative inline-flex h-4 w-8 items-center rounded-full transition-colors flex-shrink-0"
                        style={{ background: h.isWorking ? "#0F172A" : "rgba(148,163,184,0.45)" }}
                      >
                        <span className={cn("inline-block h-3 w-3 rounded-full bg-white shadow transition-transform", h.isWorking ? "translate-x-4" : "translate-x-1")} />
                      </button>
                      <span className="text-[13px] text-slate-700 w-24 flex-shrink-0">{t.weekdays.full[h.dayOfWeek]}</span>
                      {h.isWorking ? (
                        <span className="flex items-center gap-1.5 ml-auto">
                          <select
                            value={h.startTime}
                            onChange={(ev) => setDay(h.dayOfWeek, { startTime: ev.target.value })}
                            aria-label={`${t.weekdays.full[h.dayOfWeek]} — ${T.scheduleFrom}`}
                            className="input-glass rounded-lg px-2 py-1 text-[13px] outline-none text-slate-800 tabular-nums"
                          >
                            {TIMES.map((tm) => <option key={tm} value={tm}>{tm}</option>)}
                          </select>
                          <span className="text-slate-400 text-xs">–</span>
                          <select
                            value={h.endTime}
                            onChange={(ev) => setDay(h.dayOfWeek, { endTime: ev.target.value })}
                            aria-label={`${t.weekdays.full[h.dayOfWeek]} — ${T.scheduleTo}`}
                            aria-invalid={invalid}
                            className="input-glass rounded-lg px-2 py-1 text-[13px] outline-none text-slate-800 tabular-nums"
                            style={invalid ? { border: "1px solid rgba(190,18,60,0.5)" } : undefined}
                          >
                            {TIMES.map((tm) => <option key={tm} value={tm}>{tm}</option>)}
                          </select>
                        </span>
                      ) : (
                        <span className="ml-auto text-[13px] text-slate-400">{T.scheduleDayOff}</span>
                      )}
                    </div>
                  );
                })}
                {scheduleInvalid && (
                  <p role="alert" className="text-[12px] font-medium pt-1" style={{ color: "#BE123C" }}>
                    {T.scheduleInvalid}
                  </p>
                )}
              </div>
            )}
          </div>

          <label className="flex items-center justify-between p-3.5 rounded-xl" style={CHIP}>
            <span className="text-sm font-medium text-slate-800">{T.activeLabel}</span>
            <button type="button" role="switch" aria-checked={form.isActive} onClick={() => set("isActive", !form.isActive)} className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0" style={{ background: form.isActive ? "#0F172A" : "rgba(148,163,184,0.45)" }}>
              <span className={cn("inline-block h-4 w-4 rounded-full bg-white shadow transition-transform", form.isActive ? "translate-x-6" : "translate-x-1")} />
            </button>
          </label>
          <label className="flex items-center justify-between p-3.5 rounded-xl gap-3" style={CHIP}>
            <span>
              <span className="text-sm font-medium text-slate-800">{T.bookableLabel}</span>
              <span className="block text-xs text-slate-500 mt-0.5">{T.bookableHint}</span>
            </span>
            <button type="button" role="switch" aria-checked={form.isAccepting} onClick={() => set("isAccepting", !form.isAccepting)} className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0" style={{ background: form.isAccepting ? "#0F172A" : "rgba(148,163,184,0.45)" }}>
              <span className={cn("inline-block h-4 w-4 rounded-full bg-white shadow transition-transform", form.isAccepting ? "translate-x-6" : "translate-x-1")} />
            </button>
          </label>
          <div className="flex gap-3 pt-1">
            <GlassButton onClick={() => setOpen(false)} className="flex-1">{t.common.cancel}</GlassButton>
            <InkButton type="submit" disabled={isPending || scheduleInvalid} className="flex-1">{isPending ? t.pages.hours.saving : t.common.save}</InkButton>
          </div>
        </form>
      </GlassModal>

      {limitInfo && <PlanLimitDialog info={limitInfo} onClose={() => setLimitInfo(null)} />}

      <ConfirmDialog
        open={confirmId !== null}
        onOpenChange={(o) => { if (!o) setConfirmId(null); }}
        title={t.feedback.confirmDeleteTitle}
        body={T.deleteConfirm}
        confirmLabel={t.common.delete}
        cancelLabel={t.common.cancel}
        busy={deletingId !== null}
        onConfirm={() => confirmId && remove(confirmId)}
      />
    </div>
  );
}
