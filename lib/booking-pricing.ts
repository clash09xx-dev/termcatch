// ─── Server-authoritative booking price & duration math ──────────────────────
// Pure, dependency-free (no DB, no env) so it is unit-testable and identical on
// client (preview) and server (source of truth). The SERVER always recomputes
// with these functions from trusted DB values — client-submitted prices and
// durations are NEVER trusted. Money is rounded to 2 decimals; durations are
// whole minutes.

// The DB enum also has FREE_SERVICE, which has no online-redemption rule yet —
// evaluateCoupon rejects it honestly rather than guessing a discount.
export type CouponType = "PERCENTAGE" | "FIXED_AMOUNT" | "FREE_SERVICE";

/** Add-on definition as loaded from the DB (trusted values). */
export type AddonDef = {
  id: string;
  name: string;
  priceIncrease: number; // per unit, PLN
  durationIncrease: number; // per unit, minutes
  isActive: boolean;
  hasQuantity: boolean;
  minQuantity: number;
  maxQuantity: number;
  defaultQuantity: number;
};

/** Coupon as loaded from the DB (trusted values). */
export type CouponDef = {
  code: string;
  type: CouponType;
  value: number;
  minOrderValue: number | null;
  maxUses: number | null;
  usesCount: number;
  validFrom: Date;
  validUntil: Date;
  isActive: boolean;
};

/** A resolved, validated add-on line ready to snapshot onto an appointment. */
export type AddonLine = {
  addonId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
  unitDuration: number;
  totalDuration: number;
};

export function money(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Validate a single add-on selection against its trusted definition.
 * Throws on any manipulation/violation (server use). The submitted quantity is
 * the ONLY client value considered, and only within the allowed range.
 */
export function resolveAddonLine(addon: AddonDef, requestedQuantity: number): AddonLine {
  if (!addon.isActive) {
    throw new Error(`Dodatek „${addon.name}" jest nieaktywny.`);
  }
  let quantity: number;
  if (!addon.hasQuantity) {
    quantity = 1;
  } else {
    if (!Number.isInteger(requestedQuantity)) {
      throw new Error(`Nieprawidłowa ilość dla „${addon.name}".`);
    }
    if (requestedQuantity < addon.minQuantity || requestedQuantity > addon.maxQuantity) {
      throw new Error(`Ilość dla „${addon.name}" musi być między ${addon.minQuantity} a ${addon.maxQuantity}.`);
    }
    quantity = requestedQuantity;
  }
  const unitPrice = money(addon.priceIncrease);
  const unitDuration = Math.max(0, Math.round(addon.durationIncrease));
  return {
    addonId: addon.id,
    name: addon.name,
    unitPrice,
    quantity,
    totalPrice: money(unitPrice * quantity),
    unitDuration,
    totalDuration: unitDuration * quantity,
  };
}

export type CouponEvaluation =
  | { valid: false; reason: string }
  | {
      valid: true;
      code: string;
      discountType: CouponType;
      discountValue: number;
      discountAmount: number;
    };

/**
 * Evaluate a coupon against a subtotal at a point in time. Does NOT touch
 * usesCount (that is incremented atomically only on successful booking).
 */
export function evaluateCoupon(coupon: CouponDef, subtotal: number, now: Date): CouponEvaluation {
  if (!coupon.isActive) return { valid: false, reason: "Kupon jest nieaktywny." };
  if (now < coupon.validFrom) return { valid: false, reason: "Kupon jeszcze nie obowiązuje." };
  if (now > coupon.validUntil) return { valid: false, reason: "Kupon wygasł." };
  if (coupon.maxUses != null && coupon.usesCount >= coupon.maxUses) {
    return { valid: false, reason: "Limit użyć tego kuponu został wyczerpany." };
  }
  if (coupon.minOrderValue != null && subtotal < coupon.minOrderValue) {
    return { valid: false, reason: `Kupon obowiązuje od kwoty ${money(coupon.minOrderValue)} zł.` };
  }
  let discountAmount: number;
  if (coupon.type === "PERCENTAGE") {
    discountAmount = money((subtotal * coupon.value) / 100);
  } else if (coupon.type === "FIXED_AMOUNT") {
    discountAmount = money(coupon.value);
  } else {
    return { valid: false, reason: "Ten typ kuponu nie jest obsługiwany przy rezerwacji online." };
  }
  // Never allow a negative final amount.
  discountAmount = Math.min(discountAmount, subtotal);
  discountAmount = money(Math.max(0, discountAmount));
  return {
    valid: true,
    code: coupon.code,
    discountType: coupon.type,
    discountValue: coupon.value,
    discountAmount,
  };
}

export type BookingTotals = {
  basePrice: number;
  addonsTotal: number;
  subtotal: number; // basePrice + addonsTotal (coupon applies to this)
  discountAmount: number;
  finalTotal: number; // max(0, subtotal - discount)
  baseDuration: number;
  addonsDuration: number;
  totalDuration: number; // baseDuration + addonsDuration (buffers added by availability, not stored here)
};

/**
 * Combine a base service (price+duration) with resolved add-on lines and an
 * optional coupon discount into the authoritative booking totals.
 */
export function computeBookingTotals(args: {
  basePrice: number;
  baseDuration: number;
  addonLines: AddonLine[];
  discountAmount?: number;
}): BookingTotals {
  const basePrice = money(args.basePrice);
  const addonsTotal = money(args.addonLines.reduce((s, l) => s + l.totalPrice, 0));
  const subtotal = money(basePrice + addonsTotal);
  const discountAmount = money(Math.min(args.discountAmount ?? 0, subtotal));
  const finalTotal = money(Math.max(0, subtotal - discountAmount));

  const baseDuration = Math.max(0, Math.round(args.baseDuration));
  const addonsDuration = args.addonLines.reduce((s, l) => s + l.totalDuration, 0);
  const totalDuration = baseDuration + addonsDuration;

  return { basePrice, addonsTotal, subtotal, discountAmount, finalTotal, baseDuration, addonsDuration, totalDuration };
}
