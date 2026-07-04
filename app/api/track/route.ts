import { NextRequest, NextResponse } from "next/server";
import { createHash, randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { getServerUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const VISITOR_COOKIE = "tc_vid";
const SESSION_COOKIE = "tc_sid";
const SESSION_MAX_AGE = 30 * 60; // 30 min
const VISITOR_MAX_AGE = 365 * 24 * 60 * 60; // 1 rok

const BOT_REGEX =
  /bot|crawler|spider|crawling|facebookexternalhit|slurp|bingpreview|pingdom|lighthouse|headless/i;

function parseAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

function hashIp(ip: string): string {
  const salt = process.env.ANALYTICS_SALT ?? "termcatch-analytics";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 32);
}

function refDomain(referrer: string | null, ownHost: string): string {
  if (!referrer) return "direct";
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, "");
    if (!host || host === ownHost.replace(/^www\./, "")) return "internal";
    return host;
  } catch {
    return "direct";
  }
}

export async function POST(request: NextRequest) {
  const noContent = () => new NextResponse(null, { status: 204 });

  try {
    // 1. Zgoda na analitykę (cookie ustawiane przez banner)
    const consentRaw = request.cookies.get("tc_consent")?.value;
    if (!consentRaw) return noContent();
    try {
      const consent = JSON.parse(decodeURIComponent(consentRaw)) as { a?: boolean };
      if (!consent.a) return noContent();
    } catch {
      return noContent();
    }

    // 2. Boty out
    const userAgent = request.headers.get("user-agent") ?? "";
    if (!userAgent || BOT_REGEX.test(userAgent)) return noContent();

    // 3. Payload
    const body = (await request.json().catch(() => null)) as {
      path?: string;
      referrer?: string;
    } | null;
    const path = body?.path;
    if (!path || !path.startsWith("/") || path.length > 500) return noContent();

    // 4. Admini nie liczą się do statystyk
    const adminEmails = parseAdminEmails();
    const authUser = await getServerUser().catch(() => null);
    if (authUser) {
      const email = (authUser.email ?? "").toLowerCase();
      if (adminEmails.includes(email)) return noContent();
      const role = authUser.user_metadata?.role as string | undefined;
      if (role === "ADMIN" || role === "SUPERADMIN") return noContent();
    }

    // 5. Identyfikatory: odwiedzający (rok) + sesja (30 min, przedłużana)
    const vid = request.cookies.get(VISITOR_COOKIE)?.value ?? randomUUID();
    const sid = request.cookies.get(SESSION_COOKIE)?.value ?? randomUUID();

    // 6. Dedup odświeżeń: ta sama sesja + ta sama ścieżka w tej sesji = 1 odsłona
    const existing = await prisma.analyticsEvent.findFirst({
      where: {
        event: "page_view",
        sessionId: sid,
        createdAt: { gte: new Date(Date.now() - SESSION_MAX_AGE * 1000) },
        properties: { path: ["path"], equals: path },
      },
      select: { id: true },
    });

    if (!existing) {
      const ip =
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        request.headers.get("x-real-ip") ??
        "unknown";
      const host = request.headers.get("host") ?? "";

      await prisma.analyticsEvent.create({
        data: {
          event: "page_view",
          sessionId: sid,
          ipHash: hashIp(ip),
          userAgent: userAgent.slice(0, 250),
          properties: {
            vid,
            path,
            ref_domain: refDomain(body?.referrer ?? null, host),
          },
        },
      });
    }

    // 7. Odśwież cookies
    const res = noContent();
    res.cookies.set(VISITOR_COOKIE, vid, {
      maxAge: VISITOR_MAX_AGE,
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
    res.cookies.set(SESSION_COOKIE, sid, {
      maxAge: SESSION_MAX_AGE,
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
    return res;
  } catch (err) {
    console.error("[track] error:", err);
    return noContent();
  }
}
