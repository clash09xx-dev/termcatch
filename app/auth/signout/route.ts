import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Awaryjne wylogowanie — przerywa pętle przekierowań przy uszkodzonej sesji. */
export async function GET(request: Request) {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin)
    .trim()
    .replace(/\/+$/, "");
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch (err) {
    console.error("[auth/signout] error:", err);
  }
  return NextResponse.redirect(`${base}/login?error=session_reset`);
}
