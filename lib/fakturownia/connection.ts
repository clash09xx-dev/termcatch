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

const DISCONNECTED: ConnectionStatus = {
  connected: false, accountName: null, lastSyncAt: null, connectedAt: null, needsReconnect: false,
};

/**
 * Token-safe structured log for a DB read failure. A missing table/column in
 * production (Prisma P2021/P2022 — schema not yet migrated) must NEVER crash the
 * whole Settings page; it degrades to "not connected". We log the Prisma code +
 * error name (never the token or connection contents) so the real cause is
 * visible in the server logs.
 */
function logReadFailure(fn: string, businessId: string, e: unknown): void {
  const name = e instanceof Error ? e.name : "Unknown";
  const code = (e as { code?: string } | null)?.code;
  console.error(`[fakturownia:${fn}] read failed — businessId=${businessId} error=${name}${code ? ` code=${code}` : ""}`);
}

/** Public, token-FREE status for the Settings UI. Never includes the token. Never throws. */
export async function getConnectionStatus(businessId: string): Promise<ConnectionStatus> {
  try {
    const row = await prisma.fakturowniaConnection.findUnique({
      where: { businessId },
      select: { accountName: true, encryptedToken: true, lastSyncAt: true, connectedAt: true },
    });
    if (!row) return DISCONNECTED;
    const decryptable = decryptSecret(row.encryptedToken) !== null;
    return {
      connected: decryptable,
      accountName: row.accountName,
      lastSyncAt: row.lastSyncAt,
      connectedAt: row.connectedAt,
      needsReconnect: !decryptable,
    };
  } catch (e) {
    // e.g. table not migrated yet — show the normal "not connected" UI, don't crash Settings.
    logReadFailure("getConnectionStatus", businessId, e);
    return DISCONNECTED;
  }
}

/** Fast boolean used by the invoice flow + AI guard. Never throws (treats errors as "not connected"). */
export async function hasConnection(businessId: string): Promise<boolean> {
  try {
    const row = await prisma.fakturowniaConnection.findUnique({
      where: { businessId },
      select: { encryptedToken: true },
    });
    return !!row && decryptSecret(row.encryptedToken) !== null;
  } catch (e) {
    logReadFailure("hasConnection", businessId, e);
    return false;
  }
}

/**
 * Resolve usable credentials for THIS business, or null if not connected /
 * undecryptable. The plaintext token is returned only to the server caller that
 * immediately hands it to the Fakturownia client. Never throws.
 */
export async function resolveCredentials(businessId: string): Promise<FakturowniaCredentials | null> {
  try {
    const row = await prisma.fakturowniaConnection.findUnique({
      where: { businessId },
      select: { accountName: true, encryptedToken: true },
    });
    if (!row) return null;
    const token = decryptSecret(row.encryptedToken);
    if (!token) return null;
    return { accountName: row.accountName, token };
  } catch (e) {
    logReadFailure("resolveCredentials", businessId, e);
    return null;
  }
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
