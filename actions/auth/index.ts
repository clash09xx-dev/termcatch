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
  const supabase = await createClient();

  let signUpData: Awaited<ReturnType<typeof supabase.auth.signUp>>["data"] | null = null;

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/auth/callback`,
        data: { firstName, lastName, role },
      },
    });

    if (error) {
      if (error.message.toLowerCase().includes("already registered") || error.message.toLowerCase().includes("user already exists")) {
        return { error: "Ten adres e-mail jest już zarejestrowany. Zaloguj się lub użyj innego adresu." };
      }
      if (error.message.toLowerCase().includes("invalid email")) {
        return { error: "Nieprawidłowy adres e-mail." };
      }
      if (error.message.toLowerCase().includes("password")) {
        return { error: "Hasło nie spełnia wymagań. Użyj min. 8 znaków." };
      }
      return { error: `Błąd rejestracji: ${error.message}` };
    }

    signUpData = data;
  } catch (err) {
    console.error("Supabase signUp error:", err);
    return { error: "Nie można połączyć z serwerem. Sprawdź konfigurację środowiska." };
  }

  if (signUpData?.user) {
    try {
      await prisma.user.upsert({
        where: { supabaseId: signUpData.user.id },
        create: {
          supabaseId: signUpData.user.id,
          email,
          firstName,
          lastName,
          role: role as "CUSTOMER" | "BUSINESS_OWNER",
        },
        update: {},
      });
    } catch (err) {
      console.error("DB upsert error after signUp:", err);
      // Don't block the user — they were created in Supabase, DB sync can happen later
    }

    // If Supabase auto-confirmed (email confirmation disabled in project settings),
    // redirect immediately to the appropriate next step.
    if (signUpData.session) {
      revalidatePath("/", "layout");
      redirect(
        role === "BUSINESS_OWNER" ? "/business/onboarding" : "/customer/dashboard"
      );
    }
  }

  return {
    success:
      "Konto zostało utworzone! Sprawdź skrzynkę e-mail, potwierdź rejestrację, a następnie się zaloguj.",
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

    if (dbUser?.role === "BUSINESS_OWNER") {
      const hasBusiness = (dbUser.ownedBusinesses?.length ?? 0) > 0;
      redirect(hasBusiness ? "/business/dashboard" : "/business/onboarding");
    } else if (dbUser?.role === "ADMIN" || dbUser?.role === "SUPERADMIN") {
      redirect("/admin/dashboard");
    }
  }

  revalidatePath("/", "layout");
  redirect("/customer/dashboard");
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
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      queryParams: { access_type: "offline", prompt: "consent" },
    },
  });

  if (error) throw error;
  if (data.url) redirect(data.url);
}
