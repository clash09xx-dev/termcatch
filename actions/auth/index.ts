"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

/** Server-built app origin (never trusts the client). */
function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").trim().replace(/\/+$/, "");
}

/** Only internal paths are allowed as a post-verification destination (no open
 * redirects, never an absolute URL). */
function safeNext(raw: unknown): string | undefined {
  const s = typeof raw === "string" ? raw.trim() : "";
  return s.startsWith("/") && !s.startsWith("//") ? s : undefined;
}

// ── E-mail OTP resend cooldown (app-level backstop over Supabase's own limits) ──
const OTP_COOLDOWN_MS = 60_000;
const OTP_COOKIE = "tc_otp_sent_at";

async function markOtpSent(): Promise<void> {
  try {
    const jar = await cookies();
    jar.set(OTP_COOKIE, String(Date.now()), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 120, path: "/" });
  } catch {
    // best-effort — the client countdown + Supabase rate limit are the real gates
  }
}

async function otpCooldownRemainingMs(): Promise<number> {
  try {
    const jar = await cookies();
    const raw = jar.get(OTP_COOKIE)?.value;
    const last = raw ? Number(raw) : 0;
    if (!Number.isFinite(last) || last <= 0) return 0;
    return Math.max(0, OTP_COOLDOWN_MS - (Date.now() - last));
  } catch {
    return 0;
  }
}

/** Upsert the local DB user for a confirmed Supabase account. Never throws. */
async function syncDbUser(
  supabaseId: string,
  u: { email: string; firstName: string; lastName: string; role: "CUSTOMER" | "BUSINESS_OWNER" }
): Promise<void> {
  try {
    await prisma.user.upsert({
      where: { supabaseId },
      create: {
        supabaseId,
        email: u.email,
        firstName: u.firstName || "Użytkownik",
        lastName: u.lastName || "",
        role: u.role,
        isVerified: true,
        lastLoginAt: new Date(),
      },
      update: { lastLoginAt: new Date(), isVerified: true },
    });
  } catch (err) {
    // Non-fatal — the account exists in Supabase Auth; a later request re-syncs.
    console.error("[auth] DB sync error:", err);
  }
}

const RegisterSchema = z.object({
  firstName: z.string().min(2, "Imię musi mieć min. 2 znaki"),
  lastName: z.string().min(2, "Nazwisko musi mieć min. 2 znaki"),
  email: z.string().email("Nieprawidłowy adres e-mail"),
  password: z.string().min(8, "Hasło musi mieć min. 8 znaków"),
  role: z.enum(["CUSTOMER", "BUSINESS_OWNER"]).default("CUSTOMER"),
  acceptTerms: z.literal(true, {
    errorMap: () => ({
      message: "Aby założyć konto, zaakceptuj Regulamin i Politykę prywatności.",
    }),
  }),
});

const LoginSchema = z.object({
  email: z.string().email("Nieprawidłowy adres e-mail"),
  password: z.string().min(1, "Hasło jest wymagane"),
});

export type AuthState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string[]>;
  /** When set to "verify", the UI switches to the 6-digit code step. */
  step?: "verify";
  /** The address the code was sent to (echoed back to the verify step). */
  email?: string;
  /** Safe internal path to continue to after verification (customer flow). */
  next?: string;
};

export async function registerAction(
  prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const raw = {
    firstName: formData.get("firstName") as string,
    lastName: formData.get("lastName") as string,
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    role: (formData.get("role") as string) ?? "CUSTOMER",
    acceptTerms: formData.get("acceptTerms") === "on",
  };
  // Optional intended destination for the customer flow (validated, internal-only).
  const nextParam = safeNext(formData.get("next"));

  const parsed = RegisterSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { firstName, lastName, email, password, role } = parsed.data;

  // ── Supabase sign-up — creates a password account and e-mails a 6-digit
  //    confirmation code (the "Confirm signup" template must render {{ .Token }}).
  //    The role/name live in user_metadata so they survive the verify step. ──
  let sessionUserId: string | null = null;
  let hasSession = false;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // Fallback link target if the template also offers a link — the primary
        // action is the code, verified in-app.
        emailRedirectTo: `${appUrl()}/auth/callback`,
        data: {
          firstName,
          lastName,
          role,
          acceptedTermsAt: new Date().toISOString(),
        },
      },
    });

    if (error) {
      const msg = error.message.toLowerCase();
      const status = (error as { status?: number }).status ?? 0;
      const code = (error as { code?: string }).code;
      // Safe server-side diagnostic — status + code only (no e-mail, no secrets).
      console.error(`[auth:signup] supabase error status=${status} code=${code ?? "?"}`);

      if (status === 429 || msg.includes("rate limit") || msg.includes("too many") || msg.includes("seconds")) {
        return { error: "Zbyt wiele prób. Odczekaj chwilę i spróbuj ponownie." };
      }
      if (msg.includes("password")) {
        return { error: "Hasło nie spełnia wymagań bezpieczeństwa (min. 8 znaków)." };
      }
      if (msg.includes("already registered") || msg.includes("already exists") || msg.includes("already been registered")) {
        // NEVER reveal that the address already exists. Behave exactly like a
        // fresh sign-up and move to the code step; an existing/confirmed account
        // simply won't produce a working code (indistinguishable to an attacker).
        await markOtpSent();
        return { step: "verify", email, next: nextParam, success: `Wysłaliśmy kod weryfikacyjny na ${email}.` };
      }
      if (msg.includes("invalid") && msg.includes("email")) {
        return { error: "Nieprawidłowy adres e-mail. Sprawdź go i spróbuj ponownie." };
      }
      // SMTP / server / configuration failure while dispatching the code: NEVER
      // show the code screen or claim success — the code was not sent. Ask the
      // user to retry shortly (a delivery/config problem, not their fault).
      if (status >= 500 || msg.includes("smtp") || msg.includes("sending") || msg.includes("unexpected") || msg.includes("confirmation email")) {
        return { error: "Nie udało się teraz wysłać kodu weryfikacyjnego. Spróbuj ponownie za chwilę." };
      }
      return { error: "Nie udało się utworzyć konta. Spróbuj ponownie." };
    }

    sessionUserId = data.user?.id ?? null;
    hasSession = Boolean(data.session);
  } catch (err) {
    console.error("[register] Supabase error:", err);
    return { error: "Nie można połączyć z serwerem autoryzacji. Sprawdź połączenie internetowe." };
  }

  // Edge case: if e-mail confirmation is disabled in Supabase, sign-up returns a
  // live session immediately (no code sent). Sync + route straight in. redirect()
  // stays OUTSIDE the try above so its control-flow signal isn't swallowed.
  if (hasSession && sessionUserId) {
    await syncDbUser(sessionUserId, { email, firstName, lastName, role: role as "CUSTOMER" | "BUSINESS_OWNER" });
    revalidatePath("/", "layout");
    redirect(role === "BUSINESS_OWNER" ? "/business/onboarding" : (nextParam ?? "/customer/dashboard"));
  }

  // Normal path: a code was e-mailed — move to the in-app verification step.
  await markOtpSent();
  return { step: "verify", email, next: nextParam, success: `Wysłaliśmy kod weryfikacyjny na ${email}.` };
}

// ─── E-mail OTP: verify the 6-digit code ──────────────────────
// On success Supabase writes the session cookies (via the SSR client), so the
// user is authenticated immediately and routed by role — never back to /login.
export async function verifyEmailOtpAction(emailRaw: string, tokenRaw: string, nextRaw?: string): Promise<AuthState> {
  const email = (emailRaw ?? "").trim().toLowerCase();
  const token = (tokenRaw ?? "").replace(/\D/g, "");
  const next = safeNext(nextRaw);

  if (!z.string().email().safeParse(email).success) return { error: "Nieprawidłowy adres e-mail." };
  // Accept the configured e-mail OTP length (6–8 digits) — the UI enforces the
  // exact count; Supabase is the final authority on the token itself.
  if (token.length < 6 || token.length > 8) return { error: "Wpisz pełny kod z wiadomości e-mail." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({ email, token, type: "signup" });

  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("expired")) return { error: "Kod wygasł. Wyślij nowy kod i spróbuj ponownie." };
    if (msg.includes("already") && msg.includes("confirm")) return { error: "Ten kod został już użyty. Zaloguj się lub wyślij nowy kod." };
    if (msg.includes("invalid") || msg.includes("incorrect") || msg.includes("token") || msg.includes("otp")) {
      return { error: "Nieprawidłowy kod. Sprawdź cyfry i spróbuj ponownie." };
    }
    return { error: "Nie udało się zweryfikować kodu. Spróbuj ponownie." };
  }

  const user = data.user;
  if (!user) return { error: "Nie udało się zweryfikować kodu. Spróbuj ponownie." };

  // Role/name come from server-set user_metadata (not from the browser).
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const role: "CUSTOMER" | "BUSINESS_OWNER" = meta.role === "BUSINESS_OWNER" ? "BUSINESS_OWNER" : "CUSTOMER";
  await syncDbUser(user.id, {
    email: user.email ?? email,
    firstName: typeof meta.firstName === "string" ? meta.firstName : "",
    lastName: typeof meta.lastName === "string" ? meta.lastName : "",
    role,
  });

  revalidatePath("/", "layout");
  // Business always continues into the onboarding/subscription flow (never bypass
  // it via `next`); customers go to their intended destination or the dashboard.
  redirect(role === "BUSINESS_OWNER" ? "/business/onboarding" : (next ?? "/customer/dashboard"));
}

// ─── E-mail OTP: resend the code ──────────────────────────────
export async function resendEmailOtpAction(emailRaw: string): Promise<AuthState> {
  const email = (emailRaw ?? "").trim().toLowerCase();
  if (!z.string().email().safeParse(email).success) return { error: "Nieprawidłowy adres e-mail." };

  const remaining = await otpCooldownRemainingMs();
  if (remaining > 0) {
    return { error: `Odczekaj ${Math.ceil(remaining / 1000)} s przed ponownym wysłaniem kodu.` };
  }

  type AuthErr = { message: string; status?: number; code?: string };
  let error: AuthErr | null = null;
  try {
    const supabase = await createClient();
    const res = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${appUrl()}/auth/callback` },
    });
    error = (res.error as AuthErr | null) ?? null;
  } catch (e) {
    console.error("[auth:resend] unexpected", (e as Error)?.name ?? "error");
    await markOtpSent();
    return { error: "Nie udało się teraz wysłać kodu. Spróbuj ponownie za chwilę." };
  }
  await markOtpSent(); // set cooldown even on failure — blocks hammering

  if (error) {
    const msg = error.message.toLowerCase();
    const status = error.status ?? 0;
    // Safe server-side diagnostic — status + code only (no e-mail, no secrets).
    console.error(`[auth:resend] supabase error status=${status} code=${error.code ?? "?"}`);

    if (status === 429 || msg.includes("rate") || msg.includes("too many") || msg.includes("seconds")) {
      return { error: "Zbyt wiele prób. Odczekaj chwilę i spróbuj ponownie." };
    }
    // SMTP / server / configuration failure → truthful retry error. Do NOT claim
    // a code was sent when the send actually failed.
    if (status >= 500 || msg.includes("smtp") || msg.includes("sending") || msg.includes("unexpected") || msg.includes("confirmation email")) {
      return { error: "Nie udało się teraz wysłać kodu. Spróbuj ponownie za chwilę." };
    }
    if (msg.includes("invalid") && msg.includes("email")) {
      return { error: "Nieprawidłowy adres e-mail." };
    }
    // ONLY the account-state case (already confirmed / nothing to resend) stays
    // enumeration-safe: a conditional message that neither confirms existence nor
    // claims a delivery that didn't happen.
    return { success: `Jeśli konto oczekuje na weryfikację, wysłaliśmy nowy kod na ${email}.` };
  }
  return { success: `Wysłaliśmy nowy kod na ${email}.` };
}

export async function loginAction(
  prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const raw = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  // Optional safe redirect target (must be an internal path)
  const redirectParam = (formData.get("redirect") as string | null) ?? "";
  const safeRedirect =
    redirectParam.startsWith("/") && !redirectParam.startsWith("//")
      ? redirectParam
      : "";

  const parsed = LoginSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { email, password } = parsed.data;
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    if (error.message.includes("Invalid login credentials")) {
      return { error: "Nieprawidłowy e-mail lub hasło." };
    }
    if (error.message.includes("Email not confirmed")) {
      return { error: "Potwierdź swój adres e-mail przed logowaniem." };
    }
    return { error: "Wystąpił błąd. Spróbuj ponownie." };
  }

  // Fetch role and redirect accordingly
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const dbUser = await prisma.user
      .findUnique({
        where: { supabaseId: user.id },
        select: {
          role: true,
          ownedBusinesses: { select: { id: true }, take: 1 },
        },
      })
      .catch(() => null);

    await prisma.user
      .update({ where: { supabaseId: user.id }, data: { lastLoginAt: new Date() } })
      .catch(() => {});

    revalidatePath("/", "layout");

    if (safeRedirect) {
      redirect(safeRedirect);
    }

    if (dbUser?.role === "BUSINESS_OWNER") {
      const hasBusiness = (dbUser.ownedBusinesses?.length ?? 0) > 0;
      redirect(hasBusiness ? "/business/dashboard" : "/business/onboarding");
    } else if (dbUser?.role === "EMPLOYEE") {
      redirect("/employee/dashboard");
    } else if (dbUser?.role === "ADMIN" || dbUser?.role === "SUPERADMIN") {
      redirect("/admin/dashboard");
    }
  }

  revalidatePath("/", "layout");
  redirect(safeRedirect || "/customer/dashboard");
}

export async function logoutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}

export async function resetPasswordAction(
  prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = formData.get("email") as string;

  if (!email || !z.string().email().safeParse(email).success) {
    return { error: "Podaj prawidłowy adres e-mail." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/update-password`,
  });

  if (error) {
    return { error: "Wystąpił błąd. Spróbuj ponownie." };
  }

  return {
    success: "Wysłaliśmy link do resetowania hasła na podany adres e-mail.",
  };
}

export async function signInWithGoogleAction(formData?: FormData): Promise<void> {
  // Carry the register page's selected role through the OAuth round-trip so a
  // business owner signing up with Google is created as BUSINESS_OWNER (and
  // routed to onboarding) instead of silently becoming a CUSTOMER. Non-sensitive,
  // and re-validated against the enum in the callback. Absent on the login page.
  const roleRaw = formData ? String(formData.get("role") ?? "") : "";
  const role = roleRaw === "BUSINESS_OWNER" || roleRaw === "CUSTOMER" ? roleRaw : "";
  const callback = role ? `${appUrl()}/auth/callback?role=${role}` : `${appUrl()}/auth/callback`;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: callback,
      queryParams: { access_type: "offline", prompt: "consent" },
    },
  });

  if (error) throw error;
  if (data.url) redirect(data.url);
}

export async function signInWithAppleAction(): Promise<void> {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000")
    .trim()
    .replace(/\/+$/, "");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "apple",
    options: {
      redirectTo: `${appUrl}/auth/callback`,
    },
  });

  if (error) throw error;
  if (data.url) redirect(data.url);
}
