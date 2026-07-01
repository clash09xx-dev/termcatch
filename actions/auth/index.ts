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

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      data: { firstName, lastName, role },
    },
  });

  if (error) {
    if (error.message.includes("already registered")) {
      return { error: "Ten adres e-mail jest już zarejestrowany." };
    }
    return { error: "Wystąpił błąd. Spróbuj ponownie." };
  }

  if (data.user) {
    // Create user in our DB
    await prisma.user.create({
      data: {
        supabaseId: data.user.id,
        email,
        firstName,
        lastName,
        role: role as "CUSTOMER" | "BUSINESS_OWNER",
      },
    });
  }

  return {
    success:
      "Konto zostało utworzone! Sprawdź e-mail, aby potwierdzić rejestrację.",
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

  // Update last login
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await prisma.user.update({
      where: { supabaseId: user.id },
      data: { lastLoginAt: new Date() },
    }).catch(() => {}); // Non-critical
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
