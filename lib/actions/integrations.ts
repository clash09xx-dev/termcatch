"use server";

import { revalidatePath } from "next/cache";
import { getServerUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import {
  isValidAccountName,
  normalizeAccountName,
  testConnection,
  type FakturowniaCredentials,
} from "@/lib/fakturownia/client";
import { encryptionAvailable } from "@/lib/fakturownia/crypto";
import {
  getConnectionStatus,
  saveConnection,
  deleteConnection,
  resolveCredentials,
  touchLastSync,
  type ConnectionStatus,
} from "@/lib/fakturownia/connection";

/**
 * Fakturownia integration management — OWNER ONLY. The businessId is always the
 * authenticated user's OWN business (never accepted from the client), so an
 * owner can only ever touch their own credentials and an employee (no owned
 * business) is rejected. Tokens never leave the server or reach any response.
 */
async function ownerBusiness(): Promise<{ businessId: string } | null> {
  const user = await getServerUser();
  if (!user) return null;
  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    select: { ownedBusinesses: { take: 1, select: { id: true } } },
  });
  const business = dbUser?.ownedBusinesses[0];
  return business ? { businessId: business.id } : null;
}

// `code` is stable + language-free; the client maps it to a localized string.
// `message` is a Polish fallback (server logs / non-localized callers).
export type IntegrationActionResult = { ok: boolean; code: string; message: string; status?: ConnectionStatus };

const MIN_TOKEN_LEN = 10;

/** Current (token-free) status for the Settings panel. */
export async function getFakturowniaStatus(): Promise<ConnectionStatus | null> {
  const owner = await ownerBusiness();
  if (!owner) return null;
  return getConnectionStatus(owner.businessId);
}

/**
 * Connect (or replace) the business's own Fakturownia account. Validates input,
 * verifies the credentials against Fakturownia BEFORE storing (so an invalid
 * token/account is never persisted), then stores the token encrypted.
 */
export async function connectFakturownia(
  accountNameRaw: string,
  tokenRaw: string
): Promise<IntegrationActionResult> {
  const owner = await ownerBusiness();
  if (!owner) return { ok: false, code: "NO_ACCESS", message: "Brak dostępu." };

  if (!encryptionAvailable()) {
    return { ok: false, code: "ENCRYPTION_UNAVAILABLE", message: "Szyfrowanie sekretów nie jest skonfigurowane na serwerze." };
  }

  const accountName = normalizeAccountName(String(accountNameRaw ?? ""));
  const token = String(tokenRaw ?? "").trim();

  if (!accountName) return { ok: false, code: "ACCOUNT_REQUIRED", message: "Podaj nazwę konta Fakturownia." };
  if (!isValidAccountName(accountName)) return { ok: false, code: "ACCOUNT_INVALID", message: "Nieprawidłowa nazwa konta (dozwolone: litery, cyfry, myślnik)." };
  if (!token) return { ok: false, code: "TOKEN_REQUIRED", message: "Podaj token API Fakturownia." };
  if (token.length < MIN_TOKEN_LEN) return { ok: false, code: "TOKEN_TOO_SHORT", message: "Token API wygląda na niepełny." };

  // Verify BEFORE persisting — never store credentials we couldn't authenticate.
  const creds: FakturowniaCredentials = { accountName, token };
  const test = await testConnection(creds);
  if (!test.ok) return { ok: false, code: test.code, message: test.error };

  await saveConnection(owner.businessId, accountName, token);
  await touchLastSync(owner.businessId);

  revalidatePath("/business/settings");
  revalidatePath("/business/invoices");
  const status = await getConnectionStatus(owner.businessId);
  return { ok: true, code: "CONNECTED", message: `Połączono z kontem „${accountName}".`, status };
}

/** Disconnect: delete the stored credentials entirely. */
export async function disconnectFakturownia(): Promise<IntegrationActionResult> {
  const owner = await ownerBusiness();
  if (!owner) return { ok: false, code: "NO_ACCESS", message: "Brak dostępu." };
  await deleteConnection(owner.businessId);
  revalidatePath("/business/settings");
  revalidatePath("/business/invoices");
  const status = await getConnectionStatus(owner.businessId);
  return { ok: true, code: "DISCONNECTED", message: "Rozłączono konto Fakturownia.", status };
}

/** Re-test the STORED credentials (button in Settings). Updates last sync. */
export async function testFakturowniaConnection(): Promise<IntegrationActionResult> {
  const owner = await ownerBusiness();
  if (!owner) return { ok: false, code: "NO_ACCESS", message: "Brak dostępu." };

  const creds = await resolveCredentials(owner.businessId);
  if (!creds) {
    const status = await getConnectionStatus(owner.businessId);
    return { ok: false, code: "NOT_CONNECTED", message: "Brak połączonego konta Fakturownia.", status };
  }
  const test = await testConnection(creds);
  if (test.ok) await touchLastSync(owner.businessId);
  const status = await getConnectionStatus(owner.businessId);
  return test.ok
    ? { ok: true, code: "TEST_OK", message: "Połączenie działa poprawnie.", status }
    : { ok: false, code: test.code, message: test.error, status };
}
