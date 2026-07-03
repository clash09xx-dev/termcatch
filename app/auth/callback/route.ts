import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// Nigdy nie prerenderuj i zawsze wykonuj na Node (Prisma nie działa na edge)
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function getBaseUrl(request: Request): string {
  // Na produkcji ufamy NEXT_PUBLIC_APP_URL; lokalnie originowi requestu
  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (process.env.NODE_ENV === "production" && envUrl) {
    return envUrl.replace(/\/+$/, "");
  }
  const { origin } = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host");
  if (forwardedHost && process.env.NODE_ENV === "production") {
    return `https://${forwardedHost}`;
  }
  return origin;
}

/** Dozwolone są wyłącznie wewnętrzne ścieżki (ochrona przed open redirect). */
function safeInternalPath(path: string | null): string | null {
  if (!path) return null;
  if (path.startsWith("/") && !path.startsWith("//")) return path;
  return null;
}

export async function GET(request: Request) {
  const base = getBaseUrl(request);

  const fail = () =>
    NextResponse.redirect(`${base}/login?error=oauth_callback_failed`);

  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const nextParam = safeInternalPath(searchParams.get("next"));

    // Supabase może wrócić z błędem zamiast kodu (np. użytkownik anulował)
    if (searchParams.get("error") || !code) {
      return fail();
    }

    // Wymiana kodu na sesję — ustawia cookies auth przez klienta SSR
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error || !data.user) {
      console.error("[auth/callback] exchangeCodeForSession:", error?.message);
      return fail();
    }

    const user = data.user;
    const metadata = user.user_metadata ?? {};

    // Synchronizacja użytkownika z naszą bazą.
    // Błąd DB nie może zerwać logowania — sesja już istnieje.
    let role: string = (metadata.role as string) ?? "CUSTOMER";
    let hasBusiness = false;

    try {
      const dbUser = await prisma.user.upsert({
        where: { supabaseId: user.id },
        create: {
          supabaseId: user.id,
          email: user.email!,
          firstName:
            metadata.full_name?.split(" ")[0] ??
            metadata.given_name ??
            metadata.firstName ??
            "User",
          lastName:
            metadata.full_name?.split(" ").slice(1).join(" ") ||
            (metadata.family_name ?? metadata.lastName ?? ""),
          avatarUrl: metadata.avatar_url ?? metadata.picture,
          role: (metadata.role as "CUSTOMER" | "BUSINESS_OWNER") ?? "CUSTOMER",
          isVerified: true,
          lastLoginAt: new Date(),
        },
        update: {
          lastLoginAt: new Date(),
          avatarUrl: metadata.avatar_url ?? metadata.picture,
        },
        select: {
          role: true,
          ownedBusinesses: { select: { id: true }, take: 1 },
        },
      });
      role = dbUser.role;
      hasBusiness = (dbUser.ownedBusinesses?.length ?? 0) > 0;
    } catch (dbErr) {
      console.error("[auth/callback] DB sync error:", dbErr);
      // Kontynuujemy — użytkownik jest zalogowany, sync nadrobi się przy następnym żądaniu
    }

    // Cel przekierowania: ?next=... albo dashboard wg roli
    let destination = nextParam;
    if (!destination) {
      if (role === "BUSINESS_OWNER") {
        destination = hasBusiness ? "/business/dashboard" : "/business/onboarding";
      } else if (role === "ADMIN" || role === "SUPERADMIN") {
        destination = "/admin/dashboard";
      } else {
        destination = "/customer/dashboard";
      }
    }

    return NextResponse.redirect(`${base}${destination}`);
  } catch (err) {
    // Absolutny bezpiecznik — route NIGDY nie zwraca nic poza redirectem
    console.error("[auth/callback] unexpected error:", err);
    return fail();
  }
}
