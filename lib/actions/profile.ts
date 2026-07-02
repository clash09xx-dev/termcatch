"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getServerUser } from "@/lib/supabase/server";
import { z } from "zod";

const ProfileSchema = z.object({
  firstName: z.string().min(2, "Imię musi mieć min. 2 znaki").max(50),
  lastName: z.string().min(2, "Nazwisko musi mieć min. 2 znaki").max(50),
  phone: z
    .string()
    .max(20)
    .optional()
    .or(z.literal("")),
});

export type ProfileState = {
  error?: string;
  success?: string;
};

export async function updateProfileAction(
  prevState: ProfileState,
  formData: FormData
): Promise<ProfileState> {
  const user = await getServerUser();
  if (!user) redirect("/login");

  const parsed = ProfileSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    phone: formData.get("phone") ?? "",
  });

  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Nieprawidłowe dane." };
  }

  const { firstName, lastName, phone } = parsed.data;

  await prisma.user.update({
    where: { supabaseId: user.id },
    data: {
      firstName,
      lastName,
      phone: phone || null,
    },
  });

  revalidatePath("/customer/profile");
  revalidatePath("/customer", "layout");

  return { success: "Zapisano zmiany." };
}
