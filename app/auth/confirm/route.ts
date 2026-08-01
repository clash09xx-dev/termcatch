import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Obsługa linków z e-maili Supabase (potwierdzenie rejestracji, reset hasła,
 * zmiana adresu). Szablony w Supabase powinny kierować na:
 *   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type={{ .Type }}
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const nextParam = searchParams.get("next");

  const base = (process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin)
    .trim()
    .replace(/\/+$/, "");

  const safeNext =
    nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//")
      ? nextParam
      : null;

  const fail = () =>
    NextResponse.redirect(`${base}/login?error=email_link_invalid`);

  try {
    if (!tokenHash || !type) return fail();

    const supabase = await createClient();
    const { data, error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });

    if (error) {
      console.error("[auth/confirm] verifyOtp:", error.message);
      return fail();
    }

    // Reset hasła i zaproszenie → formularz ustawienia hasła; reszta → dashboard/next
    if (type === "recovery" || type === "invite") {
      return NextResponse.redirect(`${base}/auth/update-password`);
    }

    // Signup / e-mail confirmation via the fallback link: route by role (never to
    // /login) and sync the local user, mirroring the OAuth callback. The in-app
    // 6-digit code is the primary path; this keeps the link path correct too.
    let destination = safeNext;
    const user = data.user;
    if (!destination && user) {
      const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
      const role: string = typeof meta.role === "string" ? meta.role : "CUSTOMER";
      try {
        const dbUser = await prisma.user.upsert({
          where: { supabaseId: user.id },
          create: {
            supabaseId: user.id,
            email: user.email ?? "",
            firstName: typeof meta.firstName === "string" ? meta.firstName : "Użytkownik",
            lastName: typeof meta.lastName === "string" ? meta.lastName : "",
            role: role === "BUSINESS_OWNER" ? "BUSINESS_OWNER" : "CUSTOMER",
            isVerified: true,
            lastLoginAt: new Date(),
          },
          update: { isVerified: true, lastLoginAt: new Date() },
          select: { role: true, ownedBusinesses: { select: { id: true }, take: 1 } },
        });
        if (dbUser.role === "BUSINESS_OWNER") {
          destination = dbUser.ownedBusinesses.length > 0 ? "/business/dashboard" : "/business/onboarding";
        } else if (dbUser.role === "ADMIN" || dbUser.role === "SUPERADMIN") {
          destination = "/admin/dashboard";
        } else {
          destination = "/customer/dashboard";
        }
      } catch (dbErr) {
        console.error("[auth/confirm] DB sync error:", dbErr);
        destination = role === "BUSINESS_OWNER" ? "/business/onboarding" : "/customer/dashboard";
      }
    }

    return NextResponse.redirect(`${base}${destination ?? "/customer/dashboard"}`);
  } catch (err) {
    console.error("[auth/confirm] unexpected error:", err);
    return fail();
  }
}
