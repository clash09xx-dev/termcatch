import "server-only";

/**
 * Multi-tenant adapter for the official Fakturownia API.
 * Docs: https://app.fakturownia.pl/api
 *
 * Every call is parameterized by the CALLING BUSINESS'S own credentials
 * ({ accountName, token }) — there is no global token. Requests are server-side
 * only; the token travels in the request body/query per Fakturownia's API and is
 * NEVER returned to callers, surfaced in errors, or logged. Errors are mapped to
 * friendly, tenant-safe messages (no token, no full URL).
 */

export type FakturowniaCredentials = {
  /** the "<name>" in <name>.fakturownia.pl */
  accountName: string;
  /** raw API token (already decrypted) — never logged */
  token: string;
};

// VAT default is a NON-secret global (safe to keep in env); credentials are not.
export function defaultTaxRate(): number {
  const n = Number(process.env.FAKTUROWNIA_DEFAULT_TAX);
  return Number.isFinite(n) ? n : 23;
}

// Subdomain: lowercase letters/digits/hyphens, 2–63 chars, not starting with '-'.
const ACCOUNT_RE = /^[a-z0-9][a-z0-9-]{1,62}$/;

export function isValidAccountName(name: string): boolean {
  return ACCOUNT_RE.test(name.trim().toLowerCase());
}

export function normalizeAccountName(raw: string): string {
  // Accept a pasted "mysalon.fakturownia.pl" or full URL and reduce to the name.
  return raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\.fakturownia\.pl.*$/, "")
    .replace(/\/.*$/, "");
}

function baseUrl(accountName: string): string {
  return `https://${accountName}.fakturownia.pl`;
}

export type FakturowniaError = { ok: false; error: string; status?: number };
export type FakturowniaOk<T> = { ok: true; data: T };
export type FakturowniaResult<T> = FakturowniaOk<T> | FakturowniaError;

const TIMEOUT_MS = 12_000;

/** Map transport/HTTP failures to friendly, token-safe messages. */
function httpError(status: number): FakturowniaError {
  switch (status) {
    case 401:
      return { ok: false, error: "Nieprawidłowy token API Fakturownia.", status };
    case 403:
      return { ok: false, error: "Token nie ma wystarczających uprawnień w Fakturownia.", status };
    case 404:
      return { ok: false, error: "Nie znaleziono konta Fakturownia lub zasobu.", status };
    case 429:
      return { ok: false, error: "Zbyt wiele zapytań do Fakturownia — spróbuj ponownie za chwilę.", status };
    default:
      return status >= 500
        ? { ok: false, error: "Fakturownia jest chwilowo niedostępna.", status }
        : { ok: false, error: `Fakturownia zwróciła błąd (HTTP ${status}).`, status };
  }
}

async function request<T>(
  creds: FakturowniaCredentials,
  method: "GET" | "POST",
  path: string,
  body?: unknown
): Promise<FakturowniaResult<T>> {
  const account = creds.accountName.trim().toLowerCase();
  if (!isValidAccountName(account)) return { ok: false, error: "Nieprawidłowa nazwa konta Fakturownia." };
  if (!creds.token || creds.token.trim().length === 0) return { ok: false, error: "Brak tokenu API Fakturownia." };

  // Token in query for GET, in JSON body for POST — never in a logged surface.
  const sep = path.includes("?") ? "&" : "?";
  const url =
    method === "GET" ? `${baseUrl(account)}${path}${sep}api_token=${encodeURIComponent(creds.token)}` : `${baseUrl(account)}${path}`;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: method === "POST" ? JSON.stringify({ api_token: creds.token, ...(body as object) }) : undefined,
      cache: "no-store",
      signal: ctrl.signal,
    });
    if (!res.ok) return httpError(res.status);
    // Some endpoints (send_by_email) return empty bodies — tolerate that.
    const text = await res.text();
    const data = (text ? JSON.parse(text) : {}) as T;
    return { ok: true, data };
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      return { ok: false, error: "Przekroczono czas oczekiwania na odpowiedź Fakturownia." };
    }
    return { ok: false, error: "Nie udało się połączyć z Fakturownia." };
  } finally {
    clearTimeout(timer);
  }
}

// ── Connection test ──────────────────────────────────────────────────────────
// A cheap read that proves: token valid (else 401), account exists (else network
// error / 404), and read permission present (else 403).
export type AccountInfo = { id?: number; name?: string; prefix?: string };

export async function testConnection(creds: FakturowniaCredentials): Promise<FakturowniaResult<AccountInfo>> {
  const res = await request<AccountInfo[]>(creds, "GET", "/invoices.json?page=1&per_page=1");
  if (!res.ok) return res;
  // Reaching here with a 200 means the token + account + read scope are valid.
  return { ok: true, data: { name: creds.accountName } };
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

export async function createInvoice(
  creds: FakturowniaCredentials,
  input: CreateInvoiceInput
): Promise<FakturowniaResult<FakturowniaInvoiceDTO>> {
  return request<FakturowniaInvoiceDTO>(creds, "POST", "/invoices.json", {
    invoice: { kind: input.kind ?? "vat", ...input },
  });
}

export async function getInvoice(creds: FakturowniaCredentials, id: number): Promise<FakturowniaResult<FakturowniaInvoiceDTO>> {
  return request<FakturowniaInvoiceDTO>(creds, "GET", `/invoices/${id}.json`);
}

export async function listInvoices(
  creds: FakturowniaCredentials,
  params?: { page?: number; perPage?: number }
): Promise<FakturowniaResult<FakturowniaInvoiceDTO[]>> {
  const qs = new URLSearchParams();
  if (params?.page) qs.set("page", String(params.page));
  if (params?.perPage) qs.set("per_page", String(params.perPage));
  const path = qs.toString() ? `/invoices.json?${qs.toString()}` : "/invoices.json";
  return request<FakturowniaInvoiceDTO[]>(creds, "GET", path);
}

/** Direct PDF URL (server-side use ONLY — carries the token; never send to a browser). */
export function invoicePdfUrl(creds: FakturowniaCredentials, id: number): string {
  return `${baseUrl(creds.accountName)}/invoices/${id}.pdf?api_token=${encodeURIComponent(creds.token)}`;
}

export async function sendInvoiceByEmail(creds: FakturowniaCredentials, id: number): Promise<FakturowniaResult<unknown>> {
  return request<unknown>(creds, "POST", `/invoices/${id}/send_by_email.json`, {});
}
