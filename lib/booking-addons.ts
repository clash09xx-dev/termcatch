import { prisma } from "@/lib/prisma";
import { resolveAddonLine, type AddonLine, type AddonDef } from "@/lib/booking-pricing";

export type AddonSelection = { addonId: string; quantity: number };

/**
 * Server-authoritative resolution of a customer's add-on selections. Rejects
 * anything that isn't a real, active add-on of THIS business ASSIGNED to THIS
 * service, and validates quantity against the trusted definition. Client prices
 * and durations are never read — only the addonId and quantity are honored.
 * Shared by createAppointment and the availability API so durations agree.
 */
export async function resolveBookingAddons(
  businessId: string,
  serviceId: string,
  selections: AddonSelection[] | undefined | null
): Promise<AddonLine[]> {
  if (!selections || selections.length === 0) return [];

  const seen = new Set<string>();
  for (const s of selections) {
    if (seen.has(s.addonId)) throw new Error("Ten sam dodatek został wybrany dwukrotnie.");
    seen.add(s.addonId);
  }

  const ids = [...seen];
  const addons = await prisma.serviceAddon.findMany({
    where: {
      businessId,
      id: { in: ids },
      services: { some: { id: serviceId } }, // must be assigned to the booked service
    },
  });
  const byId = new Map(addons.map((a) => [a.id, a]));

  const lines: AddonLine[] = [];
  for (const sel of selections) {
    const a = byId.get(sel.addonId);
    if (!a) throw new Error("Wybrany dodatek nie jest dostępny dla tej usługi.");
    const def: AddonDef = {
      id: a.id,
      name: a.name,
      priceIncrease: a.priceIncrease,
      durationIncrease: a.durationIncrease,
      isActive: a.isActive, // resolveAddonLine rejects inactive add-ons
      hasQuantity: a.hasQuantity,
      minQuantity: a.minQuantity,
      maxQuantity: a.maxQuantity,
      defaultQuantity: a.defaultQuantity,
    };
    lines.push(resolveAddonLine(def, sel.quantity));
  }
  return lines;
}
