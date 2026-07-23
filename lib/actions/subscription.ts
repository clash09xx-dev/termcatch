"use server";

import { prisma } from "@/lib/prisma";
import { getServerUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getAppUrl } from "@/lib/app-url";
import {
  normalizePlanKey,
  priceIdForPlan,
  billingConfigured,
  welcomeConfigured,
  welcomeCouponId,
  isWelcomeCode,
  trialDaysFor,
  type PlanKey,
} from "@/lib/subscription";
import { getOrCreateStripeCustomer } from "@/lib/billing/customer";
import {
  checkWelcomeEligibility,
  reserveWelcomeSlot,
  attachCheckoutSession,
  welcomeSlotsRemaining,
} from "@/lib/billing/promo";

async function requireOwnedBusiness() {
  const user = await getServerUser();
  if (!user) redirect("/login");
  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    select: { id: true, email: true, ownedBusinesses: { take: 1, select: { id: true, email: true } } },
  });
  const business = dbUser?.ownedBusinesses[0];
  if (!dbUser || !business) redirect("/business/onboarding");
  return { ownerId: dbUser.id, ownerEmail: business.email ?? dbUser.email ?? user.email ?? "", businessId: business.id };
}

/**
 * Preliminary WELCOME validation for the UI. NON-consuming: it only reads the
 * ledger, never reserves. Returns a Polish message + remaining slots so the
 * plan page can reflect the offer before checkout.
 */
export type WelcomePreview = {
  status: "ok" | "invalid" | "unconfigured" | "sold_out" | "already" ;
  message: string;
  slotsRemaining: number | null;
};

export async function validateWelcomeCode(codeRaw: string): Promise<WelcomePreview> {
  const { ownerId, businessId } = await requireOwnedBusiness();
  if (!isWelcomeCode(codeRaw)) {
    return { status: "invalid", message: "Nieprawidłowy kod promocyjny.", slotsRemaining: null };
  }
  const configured = welcomeConfigured();
  const elig = await checkWelcomeEligibility({ code: codeRaw, businessId, ownerId, configured });
  if (elig.eligible) {
    const remaining = await welcomeSlotsRemaining();
    return {
      status: "ok",
      message: "Kod WELCOME zastosowany — pierwsze 3 miesiące gratis.",
      slotsRemaining: remaining,
    };
  }
  switch (elig.reason) {
    case "not_configured":
      return { status: "unconfigured", message: "Promocja jest chwilowo niedostępna. Otrzymasz standardowy 7-dniowy okres próbny.", slotsRemaining: null };
    case "sold_out":
      return { status: "sold_out", message: "Pula promocji WELCOME została wyczerpana. Otrzymasz standardowy 7-dniowy okres próbny.", slotsRemaining: 0 };
    case "already_redeemed":
      return { status: "already", message: "Ten kod został już wykorzystany na tym koncie.", slotsRemaining: null };
    default:
      return { status: "invalid", message: "Nieprawidłowy kod promocyjny.", slotsRemaining: null };
  }
}

export type SubscriptionCheckoutState = {
  error?: string;
  /** Set when the business already has a live subscription — UI links to portal. */
  alreadySubscribed?: boolean;
};

/**
 * Start Stripe Checkout for a paid subscription.
 *
 * Security/robustness:
 * - Plan comes from the server-validated key → its Price ID from env only
 *   (arbitrary client Price IDs are impossible).
 * - Exactly one Stripe Customer per business (getOrCreateStripeCustomer).
 * - Blocks a second live subscription (no overlapping/concurrent subscriptions).
 * - WELCOME is reserved server-side (concurrency-safe) and applied as a coupon;
 *   the plan is NOT assigned here — only the webhook assigns it.
 * - A stable idempotency key means repeated clicks reuse one Checkout session.
 *
 * On success this redirects to Stripe (throws the Next redirect); only failures
 * return a state object.
 */
export async function startSubscriptionCheckout(
  planRaw: string,
  welcomeCodeRaw?: string
): Promise<SubscriptionCheckoutState> {
  const { ownerId, ownerEmail, businessId } = await requireOwnedBusiness();

  const plan = normalizePlanKey(planRaw);
  if (!plan) return { error: "Nieznany plan." };
  if (!billingConfigured()) return { error: "unconfigured" };

  const priceId = priceIdForPlan(plan);
  if (!priceId) return { error: "unconfigured" };
  if (!ownerEmail) return { error: "Brak adresu e-mail do rozliczeń." };

  // No overlapping subscriptions — a business with a live subscription manages
  // it in the portal instead of starting another checkout.
  const live = await prisma.businessSubscription.findFirst({
    where: {
      businessId,
      NOT: { stripeSubscriptionId: null },
      status: { in: ["ACTIVE", "TRIALING", "PAST_DUE"] },
    },
    select: { id: true },
  });
  if (live) return { error: "Masz już aktywną subskrypcję.", alreadySubscribed: true };

  // Exactly one Stripe customer per business (server-derived, never from client).
  let customerId: string;
  try {
    customerId = await getOrCreateStripeCustomer(businessId, ownerEmail);
  } catch {
    return { error: "Nie udało się przygotować płatności. Spróbuj ponownie." };
  }

  // WELCOME — reserve a slot (concurrency-safe). Falls back to the normal trial
  // if unavailable; never blocks checkout on a promo problem.
  let welcomeApplied = false;
  if (isWelcomeCode(welcomeCodeRaw)) {
    const configured = welcomeConfigured();
    const elig = await checkWelcomeEligibility({ code: welcomeCodeRaw!, businessId, ownerId, configured });
    if (elig.eligible) {
      const reserved = await reserveWelcomeSlot({ businessId, ownerId, stripeCustomerId: customerId, configured });
      welcomeApplied = reserved.ok;
    }
  }

  const coupon = welcomeApplied ? welcomeCouponId() : null;
  const appUrl = getAppUrl();

  // First-time businesses get the 7-day trial; WELCOME replaces the trial with
  // the 3-month coupon (payment method still collected).
  const hasUsedTrial = Boolean(
    await prisma.businessSubscription.findFirst({
      where: { businessId, trialEndsAt: { not: null } },
      select: { id: true },
    })
  );
  const trialDays = welcomeApplied ? 0 : trialDaysFor(hasUsedTrial);

  try {
    const { stripe } = await import("@/lib/stripe");
    const session = await stripe.checkout.sessions.create(
      {
        mode: "subscription",
        customer: customerId,
        line_items: [{ price: priceId, quantity: 1 }],
        // Always collect a card, even with a trial or a 100%-off coupon, so the
        // customer is charged automatically once the free period ends.
        payment_method_collection: "always",
        ...(coupon ? { discounts: [{ coupon }] } : {}),
        subscription_data: {
          ...(trialDays > 0 ? { trial_period_days: trialDays } : {}),
          metadata: { businessId, plan, welcome: welcomeApplied ? "1" : "0" },
        },
        metadata: { businessId, plan, welcome: welcomeApplied ? "1" : "0" },
        success_url: `${appUrl}/business/onboarding/finalize?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}/business/onboarding/plan?canceled=1`,
      },
      // Stable key → repeated clicks reuse one session (no duplicate checkouts).
      { idempotencyKey: `checkout:${businessId}:${plan}:${welcomeApplied ? "w" : "t"}` }
    );

    if (welcomeApplied && session.id) {
      await attachCheckoutSession(businessId, session.id);
    }
    if (!session.url) return { error: "Nie udało się rozpocząć subskrypcji. Spróbuj ponownie." };
    redirect(session.url); // throws — must stay outside try/catch below
    return {};
  } catch (e) {
    // Re-throw Next's redirect so it isn't swallowed.
    if (e && typeof e === "object" && "digest" in e && String((e as { digest?: string }).digest).startsWith("NEXT_REDIRECT")) {
      throw e;
    }
    return { error: "Nie udało się rozpocząć subskrypcji. Spróbuj ponownie." };
  }
}

/** Open the Stripe Customer Portal for the authenticated business. */
export async function openBillingPortal(): Promise<{ error?: string }> {
  const { businessId } = await requireOwnedBusiness();
  if (!billingConfigured()) return { error: "unconfigured" };

  const row = await prisma.billingCustomer.findUnique({
    where: { businessId },
    select: { stripeCustomerId: true },
  });
  if (!row) return { error: "Brak konta rozliczeniowego. Najpierw wybierz plan." };

  try {
    const { stripe } = await import("@/lib/stripe");
    const portal = await stripe.billingPortal.sessions.create({
      customer: row.stripeCustomerId, // server-derived, never from the client
      return_url: `${getAppUrl()}/business/payments`,
    });
    redirect(portal.url);
    return {};
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e && String((e as { digest?: string }).digest).startsWith("NEXT_REDIRECT")) {
      throw e;
    }
    return { error: "Nie udało się otworzyć panelu rozliczeń. Spróbuj ponownie." };
  }
}

/** Convenience passthrough for the plan page (remaining WELCOME slots). */
export async function getWelcomeSlotsRemaining(): Promise<number> {
  return welcomeSlotsRemaining();
}

/**
 * Poll for webhook-confirmed subscription state (the "finalizujemy konfigurację"
 * page). Ready ONLY when a real Stripe subscription exists and is active/trialing
 * — the plan is never assigned from the success redirect alone.
 */
export async function pollSubscriptionReady(): Promise<{ ready: boolean }> {
  const { businessId } = await requireOwnedBusiness();
  const sub = await prisma.businessSubscription.findFirst({
    where: {
      businessId,
      NOT: { stripeSubscriptionId: null },
      status: { in: ["ACTIVE", "TRIALING"] },
    },
    select: { id: true },
    orderBy: { createdAt: "desc" },
  });
  return { ready: Boolean(sub) };
}
