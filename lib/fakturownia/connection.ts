import "server-only";

import { prisma } from "@/lib/prisma";
import { encryptSecret, decryptSecret } from "./crypto";
import type { FakturowniaCredentials } from "./client";

/**
 * Per-business Fakturownia credential store. Everything here is keyed by
 * businessId (the caller has already verified ownership) so Business A can never
 * read Business B's token. The plaintext token exists only transiently inside
 * resolveCredentials(); it is never returned to the browser or logged.
 */

export type ConnectionStatus = {
  connected: boolean;
  accountName: string | null;
  lastSyncAt: Date | null;
  connectedAt: Date | null;
  /** true when a row exists but its ciphertext can't be decrypted (key rotated). */
  needsReconnect: boolean;
};

/** Public, token-FREE status for the Settings UI. Never includes the token. */
export async function getConnectionStatus(businessId: string): Promise<ConnectionStatus> {
  const row = await prisma.fakturowniaConnection.findUnique({
    where: { businessId },
    select: { accountName: true, encryptedToken: true, lastSyncAt: true, connectedAt: true },
  });
  if (!row) {
    return { connected: false, accountName: null, lastSyncAt: null, connectedAt: null, needsReconnect: false };
  }
  const decryptable = decryptSecret(row.encryptedToken) !== null;
  return {
    connected: decryptable,
    accountName: row.accountName,
    lastSyncAt: row.lastSyncAt,
    connectedAt: row.connectedAt,
    needsReconnect: !decryptable,
  };
}

/** Fast boolean used by the invoice flow + AI guard. */
export async function hasConnection(businessId: string): Promise<boolean> {
  const row = await prisma.fakturowniaConnection.findUnique({
    where: { businessId },
    select: { encryptedToken: true },
  });
  return !!row && decryptSecret(row.encryptedToken) !== null;
}

/**
 * Resolve usable credentials for THIS business, or null if not connected /
 * undecryptable. The plaintext token is returned only to the server caller that
 * immediately hands it to the Fakturownia client.
 */
export async function resolveCredentials(businessId: string): Promise<FakturowniaCredentials | null> {
  const row = await prisma.fakturowniaConnection.findUnique({
    where: { businessId },
    select: { accountName: true, encryptedToken: true },
  });
  if (!row) return null;
  const token = decryptSecret(row.encryptedToken);
  if (!token) return null;
  return { accountName: row.accountName, token };
}

/** Store (create or replace) the encrypted credentials for a business. */
export async function saveConnection(businessId: string, accountName: string, token: string): Promise<void> {
  const encryptedToken = encryptSecret(token);
  await prisma.fakturowniaConnection.upsert({
    where: { businessId },
    // Replacing the token also resets lastSyncAt (a new account/token is unproven).
    update: { accountName, encryptedToken, lastSyncAt: null },
    create: { businessId, accountName, encryptedToken },
  });
}

/** Remove the credentials entirely (disconnect). Idempotent. */
export async function deleteConnection(businessId: string): Promise<void> {
  await prisma.fakturowniaConnection.deleteMany({ where: { businessId } });
}

/** Record a successful API call (last successful sync). Best-effort. */
export async function touchLastSync(businessId: string): Promise<void> {
  await prisma.fakturowniaConnection
    .updateMany({ where: { businessId }, data: { lastSyncAt: new Date() } })
    .catch(() => {});
}
