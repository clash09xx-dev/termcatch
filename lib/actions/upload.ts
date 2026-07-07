"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getServerUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"];
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export async function uploadBusinessImage(
  formData: FormData
): Promise<{ url?: string; error?: string }> {
  const user = await getServerUser();
  if (!user) return { error: "Nie jesteś zalogowany." };

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { error: "Brak pliku." };
  if (!ALLOWED_TYPES.includes(file.type)) return { error: "Dozwolone formaty: JPG, PNG, WebP." };
  if (file.size > MAX_BYTES) return { error: "Plik za duży. Maks. 5 MB." };

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    include: { ownedBusinesses: { take: 1, select: { id: true } } },
  });

  const businessId = dbUser?.ownedBusinesses[0]?.id;
  if (!businessId) return { error: "Nie masz przypisanego salonu." };

  const ext = file.type.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg";
  const filename = `${businessId}/${Date.now()}.${ext}`;

  const buffer = Buffer.from(await file.arrayBuffer());

  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from("business-media")
    .upload(filename, buffer, { contentType: file.type, upsert: true });

  if (error) {
    console.error("[upload]", error.message);
    return { error: "Nie udało się przesłać pliku. Spróbuj ponownie." };
  }

  const {
    data: { publicUrl },
  } = admin.storage.from("business-media").getPublicUrl(data.path);

  return { url: publicUrl };
}
