"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getServerUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { isPlausiblePlaceId, isValidLatLng, mapsServerKey } from "@/lib/maps";

async function getOwnedBusiness() {
  const user = await getServerUser();
  if (!user) redirect("/login");
  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    include: { ownedBusinesses: { take: 1, select: { id: true, slug: true } } },
  });
  const biz = dbUser?.ownedBusinesses[0];
  if (!biz) throw new Error("Nie masz przypisanego salonu.");
  return biz;
}

export type SaveLocationInput = {
  placeId: string;
  formattedAddress: string;
  latitude: number;
  longitude: number;
};

export type LocationResult = { ok: true } | { ok: false; error: string };

/**
 * Persist a location the owner picked from Google Places Autocomplete.
 * When a server key is configured, the Place ID is re-verified with Google
 * Place Details and GOOGLE'S coordinates/address are stored (client values
 * are only a hint). Without a server key the payload is strictly
 * shape-validated — it still originates from a real Autocomplete selection
 * made with the referrer-restricted browser key.
 */
export async function saveBusinessLocation(input: SaveLocationInput): Promise<LocationResult> {
  const biz = await getOwnedBusiness();

  const placeId = input.placeId?.trim() ?? "";
  let formattedAddress = input.formattedAddress?.trim() ?? "";
  let lat = Number(input.latitude);
  let lng = Number(input.longitude);

  if (!isPlausiblePlaceId(placeId)) return { ok: false, error: "Wybierz adres z podpowiedzi Google." };
  if (!formattedAddress) return { ok: false, error: "Brak sformatowanego adresu." };
  if (!isValidLatLng(lat, lng)) return { ok: false, error: "Nieprawidłowe współrzędne lokalizacji." };

  const serverKey = mapsServerKey();
  if (serverKey) {
    try {
      const res = await fetch(
        `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?languageCode=pl`,
        {
          headers: {
            "X-Goog-Api-Key": serverKey,
            "X-Goog-FieldMask": "location,formattedAddress",
          },
          cache: "no-store",
        }
      );
      if (!res.ok) {
        return { ok: false, error: "Nie udało się potwierdzić lokalizacji w Google. Wybierz adres ponownie." };
      }
      const place = (await res.json()) as {
        location?: { latitude: number; longitude: number };
        formattedAddress?: string;
      };
      if (!place.location || !isValidLatLng(place.location.latitude, place.location.longitude)) {
        return { ok: false, error: "Google nie zwrócił współrzędnych dla tego adresu." };
      }
      lat = place.location.latitude;
      lng = place.location.longitude;
      if (place.formattedAddress) formattedAddress = place.formattedAddress;
    } catch {
      return { ok: false, error: "Nie udało się połączyć z usługą map. Spróbuj ponownie." };
    }
  }

  await prisma.business.update({
    where: { id: biz.id },
    data: { placeId, latitude: lat, longitude: lng, address: formattedAddress },
  });

  revalidatePath("/business/profile");
  revalidatePath("/business/settings");
  revalidatePath(`/b/${biz.slug}`);
  return { ok: true };
}

/** Remove the verified location (address text stays untouched). */
export async function clearBusinessLocation(): Promise<LocationResult> {
  const biz = await getOwnedBusiness();
  await prisma.business.update({
    where: { id: biz.id },
    data: { placeId: null, latitude: null, longitude: null },
  });
  revalidatePath("/business/profile");
  revalidatePath("/business/settings");
  revalidatePath(`/b/${biz.slug}`);
  return { ok: true };
}
