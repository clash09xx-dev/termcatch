"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const RegisterSchema = z.object({
  firstName: z.string().min(2, "Imię musi mieć min. 2 znaki"),
  lastName: z.string().min(2, "Nazwisko musi mieć min. 2 znaki"),
  email: z.string().email("Nieprawidłowy adres e-mail"),
  password: z.string().min(8, "Hasło musi mieć min. 8 znaków"),
  role: z.enum(["CUSTOMER", "BUSINESS_OWNER"]).default("CUSTOMER"),
});

const LoginSchema = z.object({
  email: z.string().email("Nieprawidłowy adres e-mail"),
  password: z.string().min(1, "Hasło jest wymagane"),
});

export type AuthState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string[]>;
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
  };

  const parsed = RegisterSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { firstName, lastName, email, password, role } = parsed.data;

  // ── Step 1: Supabase Auth ──────────────────────────────────────
  let supabaseUserId: string | null = null;
  let hasSession = false;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/auth/callback`,
        data: { firstName, lastName, role },
      },
    });

    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("already registered") || msg.includes("user already exists") || msg.includes("already been registered")) {
        return { error: "Ten adres e-mail jest już zarejestrowany. Zaloguj się lub użyj innego adresu." };
      }
      if (msg.includes("password")) {
        return { error: "Hasło nie spełnia wymagań bezpieczeństwa (min. 8 znaków)." };
      }
      if (msg.includes("rate limit") || msg.includes("too many")) {
        return { error: "Zbyt wiele prób. Poczekaj chwilę i spróbuj ponownie." };
      }
      // Show the actual error for easier debugging
      return { error: `Błąd: ${error.message}` };
    }

    supabaseUserId = data.user?.id ?? null;
    hasSession = !!data.session;
  } catch (err) {
    console.error("[register] Supabase error:", err);
    return { error: "Nie można połączyć z serwerem autoryzacji. Sprawdź połączenie internetowe." };
  }

  // ── Step 2: Sync to DB (non-blocking) ─────────────────────────
  if (supabaseUserId) {
    try {
      await prisma.user.upsert({
        where: { supabaseId: supabaseUserId },
        create: {
          supabaseId: supabaseUserId,
          email,
          firstName,
          lastName,
          role: role as "CUSTOMER" | "BUSINESS_OWNER",
        },
        update: {},
      });
    } catch (err) {
      // Non-fatal — user exists in Supabase Auth, DB sync will happen on next login
      console.error("[register] DB sync error:", err);
    }

    // ── Step 3: Redirect if auto-confirmed ────────────────────────
    if (hasSession) {
      revalidatePath("/", "layout");
      redirect(role === "BUSINESS_OWNER" ? "/business/onboarding" : "/customer/dashboard");
    }
  }

  return {
    success: "Konto utworzone! Sprawdź skrzynkę e-mail, potwierdź rejestrację, a następnie się zaloguj.",
  };
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

export async function signInWithGoogleAction(): Promise<void> {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000")
    .trim()
    .replace(/\/+$/, "");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${appUrl}/auth/callback`,
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
