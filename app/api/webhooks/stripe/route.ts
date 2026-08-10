import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { mapStripeStatus, planKeyFromPriceId, planKeyToEnum } from "@/lib/subscription";
import { rememberStripeCustomer } from "@/lib/billing/customer";
import { redeemWelcome, releaseWelcomeBySession } from "@/lib/billing/promo";
import { sendBillingPaymentFailedEmail, sendTrialEndingEmail, sendSubscriptionCancelledEmail } from "@/lib/email";

/** Email the salon a billing alert. Non-blocking (helpers never throw). */
async function billingAlert(
  businessId: string | null | undefined,
  kind: "payment_failed" | "trial_ending" | "cancelled"
) {
  if (!businessId) return;
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { name: true, email: true },
  });
  if (!business?.email) return;
  if (kind === "payment_failed") {
    await sendBillingPaymentFailedEmail({ to: business.email, businessName: business.name });
  } else if (kind === "cancelled") {
    await sendSubscriptionCancelledEmail({ to: business.email, businessName: business.name });
  } else {
    await sendTrialEndingEmail({ to: business.email, businessName: business.name });
  }
}

// Stripe subscription webhook — the SOURCE OF TRUTH for subscription state.
// Signature-verified and idempotent: each event id is recorded once
// (ProcessedWebhookEvent) and every write is an upsert/no-op transition, so
// replays and retries never duplicate state or promo redemptions.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HANDLED = new Set<string>([
  "checkout.session.completed",
  "checkout.session.expired",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "customer.subscription.trial_will_end",
  "invoice.paid",
  "invoice.payment_failed",
]);

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const sig = req.headers.get("stripe-signature");
  if (!secret || secret.includes("...") || !sig) {
    return NextResponse.json({ error: "not configured" }, { status: 503 });
  }

  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, secret);
  } catch {
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  // Fast idempotency path: an event already fully processed is acknowledged
  // without reprocessing. (Handlers below are idempotent anyway, so an
  // in-flight duplicate is still safe.)
  const already = await prisma.processedWebhookEvent.findUnique({ where: { eventId: event.id } });
  if (already) return NextResponse.json({ received: true, duplicate: true });

  try {
    if (HANDLED.has(event.type)) {
      await handleEvent(event);
    }
  } catch {
    // 500 → Stripe retries. No marker is written on failure, so the retry
    // reprocesses (idempotently).
    console.error("[stripe-webhook] handler error for", event.type);
    return NextResponse.json({ error: "handler error" }, { status: 500 });
  }

  // Mark processed only after success. Ignore a race where a concurrent
  // duplicate already inserted it.
  try {
    await prisma.processedWebhookEvent.create({ data: { eventId: event.id, type: event.type } });
  } catch {
    /* concurrent duplicate already recorded it — fine */
  }

  return NextResponse.json({ received: true });
}

async function handleEvent(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed": {
      const s = event.data.object as Stripe.Checkout.Session;
      if (s.mode === "subscription" && s.subscription) {
        const sub = await stripe.subscriptions.retrieve(String(s.subscription));
        await syncFromSubscription(sub, s.metadata?.businessId ?? sub.metadata?.businessId);
      }
      break;
    }
    case "checkout.session.expired": {
      const s = event.data.object as Stripe.Checkout.Session;
      // Free the WELCOME slot held for an abandoned checkout.
      await releaseWelcomeBySession(s.id);
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      await syncFromSubscription(sub, sub.metadata?.businessId);
      if (event.type === "customer.subscription.deleted") {
        await billingAlert(sub.metadata?.businessId, "cancelled");
      }
      break;
    }
    case "customer.subscription.trial_will_end": {
      // Stripe fires ~3 days before trial_end — warn the owner before the charge.
      const sub = event.data.object as Stripe.Subscription;
      await billingAlert(sub.metadata?.businessId, "trial_ending");
      break;
    }
    case "invoice.paid":
    case "invoice.payment_failed": {
      const inv = event.data.object as Stripe.Invoice & {
        subscription?: string | Stripe.Subscription | null;
      };
      if (inv.subscription) {
        const sub = await stripe.subscriptions.retrieve(String(inv.subscription));
        await syncFromSubscription(sub, sub.metadata?.businessId);
        // Alert the salon on a failed charge (dunning) — previously silent.
        if (event.type === "invoice.payment_failed") {
          await billingAlert(sub.metadata?.businessId, "payment_failed");
        }
      }
      break;
    }
    default:
      break;
  }
}

/**
 * Reconcile a Stripe Subscription into our DB. Idempotent:
 * - BusinessSubscription upserted by unique stripeSubscriptionId.
 * - Business.subscriptionPlan/Status synced from the subscription's Price ID.
 * - The Stripe customer↔business mapping is remembered.
 * - WELCOME (metadata.welcome === "1") is redeemed once (PENDING→REDEEMED).
 * Never deletes salon data — cancellation only flips status.
 */
async function syncFromSubscription(sub: Stripe.Subscription, businessId?: string | null) {
  if (!businessId) return; // no linkage — nothing to sync

  const priceId = sub.items.data[0]?.price?.id ?? null;
  const planKey = planKeyFromPriceId(priceId);
  const status = mapStripeStatus(sub.status);

  const subData = {
    status,
    stripePriceId: priceId,
    currentPeriodStart: new Date(sub.current_period_start * 1000),
    currentPeriodEnd: new Date(sub.current_period_end * 1000),
    cancelAtPeriodEnd: sub.cancel_at_period_end,
    trialEndsAt: sub.trial_end ? new Date(sub.trial_end * 1000) : null,
    cancelledAt: sub.canceled_at ? new Date(sub.canceled_at * 1000) : null,
  };

  await prisma.businessSubscription.upsert({
    where: { stripeSubscriptionId: sub.id },
    update: { ...subData, ...(planKey ? { plan: planKeyToEnum(planKey) } : {}) },
    create: {
      businessId,
      stripeSubscriptionId: sub.id,
      plan: planKey ? planKeyToEnum(planKey) : "STARTER",
      ...subData,
    },
  });

  // Mirror onto Business (dashboards + entitlements). Never deletes data.
  await prisma.business.update({
    where: { id: businessId },
    data: {
      subscriptionStatus: status,
      ...(planKey ? { subscriptionPlan: planKeyToEnum(planKey) } : {}),
    },
  });

  // Remember the customer mapping (idempotent).
  if (sub.customer) {
    await rememberStripeCustomer(businessId, String(sub.customer));
  }

  // Redeem WELCOME exactly once, only when the subscription actually exists.
  if (sub.metadata?.welcome === "1" && sub.status !== "incomplete_expired" && sub.status !== "canceled") {
    await redeemWelcome(businessId, sub.id);
  }
}
