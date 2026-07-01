import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "sk_placeholder", {
  apiVersion: "2025-02-24.acacia",
  typescript: true,
});

/** Platform fee percentage charged to businesses */
export const PLATFORM_FEE_PERCENT = 2.5;

/** Create a Stripe Connect account for a business */
export async function createStripeConnectAccount(email: string) {
  return stripe.accounts.create({
    type: "express",
    email,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    business_type: "individual",
    settings: {
      payouts: {
        schedule: {
          interval: "weekly",
          weekly_anchor: "monday",
        },
      },
    },
  });
}

/** Create onboarding link for Stripe Connect */
export async function createStripeOnboardingLink(
  accountId: string,
  businessSlug: string
) {
  return stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/business/settings/payments?refresh=true`,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/business/settings/payments?success=true`,
    type: "account_onboarding",
  });
}

/** Create a payment intent for an appointment */
export async function createPaymentIntent({
  amount,
  currency = "pln",
  customerId,
  businessStripeAccountId,
  appointmentId,
  depositOnly = false,
  depositAmount,
}: {
  amount: number;
  currency?: string;
  customerId: string;
  businessStripeAccountId: string;
  appointmentId: string;
  depositOnly?: boolean;
  depositAmount?: number;
}) {
  const chargeAmount = depositOnly && depositAmount ? depositAmount : amount;
  const platformFee = Math.round(chargeAmount * (PLATFORM_FEE_PERCENT / 100));

  return stripe.paymentIntents.create({
    amount: Math.round(chargeAmount * 100), // Stripe uses cents
    currency,
    application_fee_amount: platformFee,
    transfer_data: {
      destination: businessStripeAccountId,
    },
    metadata: {
      appointmentId,
      customerId,
      depositOnly: depositOnly.toString(),
    },
    automatic_payment_methods: { enabled: true },
  });
}
