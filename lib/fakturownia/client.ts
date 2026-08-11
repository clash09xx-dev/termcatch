import "server-only";

/**
 * Minimal adapter for the official Fakturownia API.
 * Docs: https://app.fakturownia.pl/api  (endpoints below are the documented ones).
 *
 * All requests are server-side only. The API token is read from env and is
 * NEVER exposed to the browser or returned to callers. Configure with:
 *   FAKTUROWNIA_API_TOKEN
 *   FAKTUROWNIA_ACCOUNT_DOMAIN   (the "<domain>" in <domain>.fakturownia.pl)
 *   FAKTUROWNIA_DEFAULT_TAX      (optional VAT %, default "23")
 */

function present(v: string | undefined | null): boolean {
  return typeof v === "string" && v.trim().length > 0 && !v.includes("...");
}

export function fakturowniaConfigured(): boolean {
  return present(process.env.FAKTUROWNIA_API_TOKEN) && present(process.env.FAKTUROWNIA_ACCOUNT_DOMAIN);
}

export function defaultTaxRate(): number {
  const n = Number(process.env.FAKTUROWNIA_DEFAULT_TAX);
  return Number.isFinite(n) ? n : 23;
}

function baseUrl(): string {
  const domain = (process.env.FAKTUROWNIA_ACCOUNT_DOMAIN || "").trim();
  return `https://${domain}.fakturownia.pl`;
}

function token(): string {
  return (process.env.FAKTUROWNIA_API_TOKEN || "").trim();
}

export type FakturowniaError = { ok: false; error: string; status?: number };
export type FakturowniaOk<T> = { ok: true; data: T };
export type FakturowniaResult<T> = FakturowniaOk<T> | FakturowniaError;

async function request<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<FakturowniaResult<T>> {
  if (!fakturowniaConfigured()) return { ok: false, error: "Fakturownia nie jest skonfigurowana." };
  const url = `${baseUrl()}${path}`;
  try {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      // The token travels in the JSON body (POST) or query string (GET) per Fakturownia's API.
      body: body !== undefined ? JSON.stringify({ api_token: token(), ...(body as object) }) : undefined,
      cache: "no-store",
    });
    if (!res.ok) {
      // Never surface the token or full URL (which carries the token on GET).
      return { ok: false, error: `Fakturownia zwróciła błąd (HTTP ${res.status}).`, status: res.status };
    }
    const data = (await res.json()) as T;
    return { ok: true, data };
  } catch {
    return { ok: false, error: "Nie udało się połączyć z Fakturownia." };
  }
}

function withToken(path: string): string {
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}api_token=${encodeURIComponent(token())}`;
}

// ── Types (subset of Fakturownia's invoice payload we use) ───────────────────
export type InvoicePosition = {
  name: string;
  tax: number | string; // VAT %
  total_price_gross: number; // gross amount for the whole position (quantity included)
  quantity: number;
};

export type CreateInvoiceInput = {
  buyer_name: string;
  buyer_email?: string;
  buyer_tax_no?: string; // NIP
  positions: InvoicePosition[];
  kind?: string; // default "vat"
  sell_date?: string; // YYYY-MM-DD
  issue_date?: string;
  payment_to?: string;
};

export type FakturowniaInvoiceDTO = {
  id: number;
  number: string | null;
  view_url?: string;
  price_gross?: string | number;
  currency?: string;
  buyer_name?: string;
};

export async function createInvoice(input: CreateInvoiceInput): Promise<FakturowniaResult<FakturowniaInvoiceDTO>> {
  return request<FakturowniaInvoiceDTO>("POST", "/invoices.json", {
    invoice: { kind: input.kind ?? "vat", ...input },
  });
}

export async function getInvoice(id: number): Promise<FakturowniaResult<FakturowniaInvoiceDTO>> {
  return request<FakturowniaInvoiceDTO>("GET", withToken(`/invoices/${id}.json`));
}

export async function listInvoices(params?: { page?: number; perPage?: number }): Promise<FakturowniaResult<FakturowniaInvoiceDTO[]>> {
  const qs = new URLSearchParams();
  if (params?.page) qs.set("page", String(params.page));
  if (params?.perPage) qs.set("per_page", String(params.perPage));
  const path = qs.toString() ? `/invoices.json?${qs.toString()}` : "/invoices.json";
  return request<FakturowniaInvoiceDTO[]>("GET", withToken(path));
}

/** Direct PDF URL (server-side use only — carries the token). */
export function invoicePdfUrl(id: number): string {
  return `${baseUrl()}${withToken(`/invoices/${id}.pdf`)}`;
}

export async function sendInvoiceByEmail(id: number): Promise<FakturowniaResult<unknown>> {
  return request<unknown>("POST", `/invoices/${id}/send_by_email.json`, {});
}
