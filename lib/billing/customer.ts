import { prisma } from "@/lib/prisma";

/**
 * Return the business's Stripe Customer id, creating it exactly once.
 *
 * The mapping is persisted in BillingCustomer (unique on businessId AND
 * stripeCustomerId), so a business can never end up with duplicate customers —
 * even under concurrent checkout attempts. If two requests race, the DB unique
 * constraint lets exactly one win; the loser deletes the extra Stripe customer
 * it just created and reuses the stored one. The customer id is NEVER taken
 * from the client.
 */
export async function getOrCreateStripeCustomer(businessId: string, email: string): Promise<string> {
  const existing = await prisma.billingCustomer.findUnique({
    where: { businessId },
    select: { stripeCustomerId: true },
  });
  if (existing) return existing.stripeCustomerId;

  const { stripe } = await import("@/lib/stripe");
  const customer = await stripe.customers.create({ email, metadata: { businessId } });

  try {
    await prisma.billingCustomer.create({ data: { businessId, stripeCustomerId: customer.id } });
    return customer.id;
  } catch {
    // Unique-constraint race: another request already stored a customer for this
    // business. Reuse it and discard the duplicate we just created in Stripe.
    const row = await prisma.billingCustomer.findUnique({
      where: { businessId },
      select: { stripeCustomerId: true },
    });
    if (row) {
      try {
        await stripe.customers.del(customer.id);
      } catch {
        /* best-effort cleanup of the orphan customer */
      }
      return row.stripeCustomerId;
    }
    throw new Error("Nie udało się utworzyć konta rozliczeniowego.");
  }
}

/** The stored Stripe Customer id for a business, or null. Server-derived only. */
export async function getStripeCustomerId(businessId: string): Promise<string | null> {
  const row = await prisma.billingCustomer.findUnique({
    where: { businessId },
    select: { stripeCustomerId: true },
  });
  return row?.stripeCustomerId ?? null;
}

/** Persist the customer↔business mapping seen on a webhook (idempotent upsert). */
export async function rememberStripeCustomer(businessId: string, stripeCustomerId: string): Promise<void> {
  await prisma.billingCustomer.upsert({
    where: { businessId },
    update: { stripeCustomerId },
    create: { businessId, stripeCustomerId },
  });
}
