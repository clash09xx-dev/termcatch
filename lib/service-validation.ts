// ─── Service pricing validation (shared client + server) ────────────────────
// TermCatch sells PAID bookings — free services are not a supported product
// feature (the booking/checkout/commission flows all assume a positive price),
// so a service price must be greater than zero. Add-ons use their own rule in
// lib/actions/addons.ts (non-negative), because an add-on is an increment that
// may legitimately add only time or only cost.
//
// Pure + unit-tested. Only fields that are PRESENT are checked, so it is safe
// for partial updates (e.g. an active/inactive toggle that sends no price).

export type ServicePricingInput = {
  price?: number;
  discountedPrice?: number | null;
  duration?: number;
  requiresDeposit?: boolean;
  depositAmount?: number | null;
};

/** Returns a Polish validation message, or null when the pricing is valid. */
export function validateServicePricing(input: ServicePricingInput): string | null {
  if (input.price !== undefined) {
    if (!Number.isFinite(input.price) || input.price <= 0) {
      return "Cena usługi musi być większa niż 0 zł.";
    }
  }
  if (input.duration !== undefined) {
    if (!Number.isFinite(input.duration) || input.duration <= 0) {
      return "Czas trwania musi być większy niż 0 minut.";
    }
  }
  if (input.discountedPrice !== undefined && input.discountedPrice !== null) {
    if (!Number.isFinite(input.discountedPrice) || input.discountedPrice <= 0) {
      return "Cena promocyjna musi być większa niż 0 zł.";
    }
    if (input.price !== undefined && input.discountedPrice > input.price) {
      return "Cena promocyjna nie może być wyższa niż cena regularna.";
    }
  }
  if (input.requiresDeposit && input.depositAmount !== undefined && input.depositAmount !== null) {
    if (!Number.isFinite(input.depositAmount) || input.depositAmount <= 0) {
      return "Zaliczka musi być większa niż 0 zł.";
    }
    if (input.price !== undefined && input.depositAmount > input.price) {
      return "Zaliczka nie może być wyższa niż cena usługi.";
    }
  }
  return null;
}

/** Non-negative, finite increment rule for add-ons (0 is allowed). */
export function validateAddonPricing(input: { priceIncrease?: number; durationIncrease?: number }): string | null {
  if (input.priceIncrease !== undefined && (!Number.isFinite(input.priceIncrease) || input.priceIncrease < 0)) {
    return "Dopłata nie może być ujemna.";
  }
  if (input.durationIncrease !== undefined && (!Number.isFinite(input.durationIncrease) || input.durationIncrease < 0)) {
    return "Czas dodatku nie może być ujemny.";
  }
  return null;
}
