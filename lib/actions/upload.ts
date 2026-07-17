"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getServerUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { sniffImageType } from "@/lib/image-sniff";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"];
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const BUCKET = "business-media";
/** Unreferenced leftovers kept per salon before cleanup (replace history). */
const KEEP_UNREFERENCED = 4;

export async function uploadBusinessImage(
  formData: FormData
): Promise<{ url?: string; error?: string }> {
  const user = await getServerUser();
  if (!user) return { error: "Nie jesteś zalogowany." };

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { error: "Brak pliku." };
  if (file.size > MAX_BYTES) return { error: "Plik jest za duży. Maksymalny rozmiar to 5 MB." };

  const buffer = Buffer.from(await file.arrayBuffer());

  // Content sniffing — the browser-declared MIME type is only a hint. The
  // stored extension and Content-Type come from the actual file bytes, so a
  // renamed executable or mislabelled file can never be stored as an image.
  const sniffed = sniffImageType(buffer);
  if (sniffed === "heic") {
    return { error: "Zdjęcia HEIC/HEIF z iPhone'a nie są obsługiwane. Wybierz JPG, PNG lub WebP." };
  }
  if (!sniffed || !ALLOWED_TYPES.includes(sniffed.mime)) {
    return { error: "Dozwolone formaty: JPG, PNG lub WebP." };
  }

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    include: {
      ownedBusinesses: { take: 1, select: { id: true, logoUrl: true, coverImageUrl: true } },
    },
  });

  const business = dbUser?.ownedBusinesses[0];
  if (!business) return { error: "Nie masz przypisanego salonu." };

  // Path is derived entirely server-side: {ownedBusinessId}/{timestamp}-{rand}.
  // The client cannot influence it, so cross-business writes are impossible
  // and names are collision-resistant.
  const filename = `${business.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${sniffed.ext}`;

  const admin = createAdminClient();
  let { data, error } = await admin.storage
    .from(BUCKET)
    .upload(filename, buffer, { contentType: sniffed.mime, upsert: false });

  // Self-heal: create the bucket on first use in a fresh environment
  // (idempotent — "already exists" from a concurrent request is fine).
  if (error && /bucket not found/i.test(error.message)) {
    const created = await admin.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: MAX_BYTES,
      allowedMimeTypes: ALLOWED_TYPES,
    });
    if (!created.error || /already exists/i.test(created.error.message)) {
      ({ data, error } = await admin.storage
        .from(BUCKET)
        .upload(filename, buffer, { contentType: sniffed.mime, upsert: false }));
    }
  }

  if (error || !data) {
    console.error("[upload]", error?.message ?? "no data");
    return { error: "Nie udało się przesłać pliku. Spróbuj ponownie." };
  }

  const {
    data: { publicUrl },
  } = admin.storage.from(BUCKET).getPublicUrl(data.path);

  // Bounded cleanup — best-effort, never fails the upload. Objects still
  // referenced by the saved logo/cover are always protected; beyond that we
  // keep a few newest leftovers so a not-yet-saved re-upload can't be lost.
  try {
    const referenced = new Set(
      [business.logoUrl, business.coverImageUrl, publicUrl]
        .filter((u): u is string => !!u)
        .map((u) => u.split(`/${BUCKET}/`)[1])
        .filter(Boolean)
        .map((p) => decodeURIComponent(p as string))
    );
    const { data: objects } = await admin.storage
      .from(BUCKET)
      .list(business.id, { limit: 100, sortBy: { column: "created_at", order: "desc" } });
    const removable = (objects ?? [])
      .map((o) => `${business.id}/${o.name}`)
      .filter((p) => !referenced.has(p))
      .slice(KEEP_UNREFERENCED);
    if (removable.length > 0) {
      await admin.storage.from(BUCKET).remove(removable);
    }
  } catch {
    // Orphan cleanup is optional hygiene — ignore failures.
  }

  return { url: publicUrl };
}
