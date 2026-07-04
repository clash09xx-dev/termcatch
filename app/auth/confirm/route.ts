import { createClient } from "@/lib/supabase/server";
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
    const { error } = await supabase.auth.verifyOtp({
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

    return NextResponse.redirect(`${base}${safeNext ?? "/customer/dashboard"}`);
  } catch (err) {
    console.error("[auth/confirm] unexpected error:", err);
    return fail();
  }
}
