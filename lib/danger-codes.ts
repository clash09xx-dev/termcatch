// ─── One-time deletion-confirmation codes ─────────────────────────────────────
// Server-side challenge for destructive owner operations. Plaintext codes are
// NEVER stored or logged — only an HMAC-SHA256 keyed with a server secret, so
// even a database leak does not allow offline recovery of active codes.

import { createHmac, randomInt, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";

const CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const RESEND_COOLDOWN_MS = 60 * 1000; // one code per minute
const MAX_ATTEMPTS = 5;

function hmacSecret(): string {
  // Dedicated secret when configured; otherwise derive from the service-role
  // key (server-only, never exposed). Domain-separated by prefix.
  const secret = process.env.DANGER_CODE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("Brak konfiguracji serwera (sekret kodów).");
  return secret;
}

export function hashDangerCode(code: string): string {
  return createHmac("sha256", hmacSecret()).update(`danger-code:${code}`).digest("hex");
}

export type CreateCodeResult =
  | { ok: true; code: string } // plaintext returned ONLY to the caller for e-mail delivery
  | { ok: false; reason: "cooldown" };

/** Create a fresh code for the user; refuses within the resend cooldown. */
export async function createDangerCode(userId: string): Promise<CreateCodeResult> {
  const now = new Date();
  // Any code created within the cooldown blocks a resend (consumed or not) —
  // this endpoint sends e-mail, so rate limiting is strict.
  const recent = await prisma.dangerCode.findFirst({
    where: { userId, createdAt: { gt: new Date(now.getTime() - RESEND_COOLDOWN_MS) } },
    select: { id: true },
  });
  if (recent) return { ok: false, reason: "cooldown" };

  // Invalidate any previous outstanding codes — only the newest is valid.
  await prisma.dangerCode.updateMany({
    where: { userId, consumedAt: null },
    data: { consumedAt: now },
  });

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0"); // CSPRNG
  await prisma.dangerCode.create({
    data: {
      userId,
      codeHash: hashDangerCode(code),
      expiresAt: new Date(now.getTime() + CODE_TTL_MS),
    },
  });
  return { ok: true, code };
}

export type VerifyResult = { ok: true } | { ok: false; reason: "invalid" | "expired" | "locked" };

/**
 * Verify and atomically consume the user's active code. A consumed code can
 * never be replayed (conditional update on consumedAt: null); wrong guesses
 * increment the attempt counter and lock the code after MAX_ATTEMPTS.
 */
export async function verifyAndConsumeDangerCode(userId: string, rawCode: string): Promise<VerifyResult> {
  const code = rawCode.replace(/\s/g, "");
  if (!/^\d{6}$/.test(code)) return { ok: false, reason: "invalid" };

  const active = await prisma.dangerCode.findFirst({
    where: { userId, consumedAt: null },
    orderBy: { createdAt: "desc" },
  });
  if (!active) return { ok: false, reason: "invalid" };
  if (active.expiresAt < new Date()) return { ok: false, reason: "expired" };
  if (active.attempts >= MAX_ATTEMPTS) return { ok: false, reason: "locked" };

  const expected = Buffer.from(active.codeHash, "hex");
  const actual = Buffer.from(hashDangerCode(code), "hex");
  const match = expected.length === actual.length && timingSafeEqual(expected, actual);

  if (!match) {
    const updated = await prisma.dangerCode.update({
      where: { id: active.id },
      data: { attempts: { increment: 1 } },
      select: { attempts: true },
    });
    return { ok: false, reason: updated.attempts >= MAX_ATTEMPTS ? "locked" : "invalid" };
  }

  // Atomic consume — replay/race safe: only one caller can win this update.
  const consumed = await prisma.dangerCode.updateMany({
    where: { id: active.id, consumedAt: null },
    data: { consumedAt: new Date() },
  });
  if (consumed.count === 0) return { ok: false, reason: "invalid" };
  return { ok: true };
}
