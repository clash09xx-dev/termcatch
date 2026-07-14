"use server";

import { prisma } from "@/lib/prisma";
import { resolveBookingAddons, type AddonSelection } from "@/lib/booking-addons";
import { computeBookingTotals, evaluateCoupon, money } from "@/lib/booking-pricing";

export type CouponPreview =
  | { ok: false; message: string }
  | { ok: true; code: string; subtotal: number; discountAmount: number; finalTotal: number; message: string };

/**
 * Read-only coupon check for the booking flow's "apply" step. Recomputes the
 * subtotal (service + add-ons) server-side and evaluates the coupon. Never
 * mutates — usesCount is incremented only on the actual booking.
 */
export async function previewCoupon(input: {
  businessId: string;
  serviceId: string;
  code: string;
  addons?: AddonSelection[];
}): Promise<CouponPreview> {
  const code = input.code.trim();
  if (!code) return { ok: false, message: "Wpisz kod kuponu." };

  const service = await prisma.service.findFirst({
    where: { id: input.serviceId, businessId: input.businessId, isActive: true },
    select: { price: true, discountedPrice: true, duration: true },
  });
  if (!service) return { ok: false, message: "Usługa jest niedostępna." };

  let addonLines;
  try {
    addonLines = await resolveBookingAddons(input.businessId, input.serviceId, input.addons);
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Błąd dodatków." };
  }

  const basePrice = service.discountedPrice ?? service.price;
  const base = computeBookingTotals({ basePrice, baseDuration: service.duration, addonLines });

  const coupon = await prisma.coupon.findFirst({ where: { businessId: input.businessId, code } });
  if (!coupon) return { ok: false, message: "Nieprawidłowy kod kuponu." };

  const evalr = evaluateCoupon(
    {
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      minOrderValue: coupon.minOrderValue,
      maxUses: coupon.maxUses,
      usesCount: coupon.usesCount,
      validFrom: coupon.validFrom,
      validUntil: coupon.validUntil,
      isActive: coupon.isActive,
    },
    base.subtotal,
    new Date()
  );
  if (!evalr.valid) return { ok: false, message: evalr.reason };

  const finalTotal = money(Math.max(0, base.subtotal - evalr.discountAmount));
  return {
    ok: true,
    code: coupon.code,
    subtotal: base.subtotal,
    discountAmount: evalr.discountAmount,
    finalTotal,
    message: `Kupon „${coupon.code}" zastosowany.`,
  };
}
