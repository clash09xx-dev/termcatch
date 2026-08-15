"use client";

import { useState } from "react";
import { previewInvoiceAction, issueInvoiceAction, type InvoicePreview } from "@/lib/actions/invoices";
import { ChromeAvatar, GlassButton } from "@/components/ui/glass";
import { HAIRLINE } from "@/components/ui/glass/tokens";
import { GlassModal, ModalInkButton, ModalGlassButton } from "@/components/ui/glass-modal";
import { useT } from "@/components/i18n/i18n-provider";
import { notify, errorText } from "@/lib/notify";

export type InvoiceRow = {
  id: string;
  dateLabel: string;
  clientName: string;
  initials: string;
  serviceName: string;
  priceLabel: string;
  invoiceNumber: string | null;
  viewUrl: string | null;
};

export function InvoicesClient({ rows: initial, configured }: { rows: InvoiceRow[]; configured: boolean }) {
  const t = useT();
  const T = t.pages.invoices;
  const [rows, setRows] = useState(initial);
  const [openId, setOpenId] = useState<string | null>(null);
  const [preview, setPreview] = useState<InvoicePreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openIssue(id: string) {
    setOpenId(id);
    setPreview(null);
    setError(null);
    setPreview(await previewInvoiceAction(id));
  }

  async function confirm(id: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await issueInvoiceAction(id);
      if (res.ok) {
        setRows((prev) => prev.map((r) => (r.id === id ? { ...r, invoiceNumber: res.number ?? "—" } : r)));
        setOpenId(null);
        notify.saved(`${T.invoiceLabel} ${res.number ?? ""}`.trim());
      } else {
        setError(res.message);
        notify.error(res.message);
      }
    } catch (e) {
      setError(errorText(e, T.issueFailed));
      notify.error(errorText(e, T.issueFailed));
    } finally {
      setBusy(false);
    }
  }

  const active = rows.find((r) => r.id === openId) ?? null;

  return (
    <div>
      {rows.map((r, i) => (
        <div
          key={r.id}
          className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 sm:px-5 py-3.5"
          style={i > 0 ? { borderTop: HAIRLINE } : undefined}
        >
          <span className="w-[72px] flex-shrink-0 text-xs font-medium text-slate-500 tabular-nums">{r.dateLabel}</span>
          <ChromeAvatar size="sm" initials={r.initials} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900">{r.clientName}</p>
            <p className="truncate text-xs text-slate-500">{r.serviceName}</p>
          </div>
          <p className="w-24 flex-shrink-0 text-right text-sm font-bold text-slate-900 tabular-nums">{r.priceLabel}</p>
          {r.invoiceNumber ? (
            r.viewUrl ? (
              <a href={r.viewUrl} target="_blank" rel="noopener noreferrer" className="flex-shrink-0 text-xs font-semibold text-emerald-700 hover:underline">
                ✓ {T.invoiceLabel} {r.invoiceNumber}
              </a>
            ) : (
              <span className="flex-shrink-0 text-xs font-semibold text-emerald-700">✓ {T.invoiceLabel} {r.invoiceNumber}</span>
            )
          ) : (
            <GlassButton
              size="sm"
              disabled={!configured}
              onClick={configured ? () => openIssue(r.id) : undefined}
              title={configured ? T.issueTooltip : T.notConfiguredTooltip}
              className="flex-shrink-0"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              {T.modalTitle}
            </GlassButton>
          )}
        </div>
      ))}

      <GlassModal open={openId !== null} onOpenChange={(o) => !o && setOpenId(null)} title={T.modalTitle} description={T.modalDesc}>
        {active && (
          <div className="space-y-3">
            {!preview ? (
              <p className="text-sm text-slate-500">{T.preparingPreview}</p>
            ) : preview.ok ? (
              <dl className="space-y-1.5 text-sm">
                <Row label={T.buyer} value={preview.buyerName} />
                {preview.buyerEmail && <Row label={T.email} value={preview.buyerEmail} />}
                <Row label={T.item} value={preview.serviceName} />
                <Row label={T.grossAmount} value={`${preview.total.toFixed(2)} ${preview.currency}`} />
                <Row label={T.vat} value={`${preview.taxRate}%`} />
              </dl>
            ) : (
              <p className="text-sm" style={{ color: "#BE123C" }}>{preview.error}</p>
            )}
            {error && <p className="text-xs" style={{ color: "#BE123C" }}>{error}</p>}
            <div className="flex items-center gap-2 pt-1">
              <ModalInkButton onClick={() => confirm(active.id)} disabled={busy || !preview?.ok}>
                {busy ? T.issuing : T.modalTitle}
              </ModalInkButton>
              <ModalGlassButton onClick={() => setOpenId(null)}>{T.cancel}</ModalGlassButton>
            </div>
          </div>
        )}
      </GlassModal>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <dt className="min-w-24 shrink-0 font-medium text-slate-500">{label}</dt>
      <dd className="text-slate-800">{value}</dd>
    </div>
  );
}
