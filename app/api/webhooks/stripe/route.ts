import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { mapStripeStatus } from "@/lib/subscription";

// Stripe subscription webhook. Signature-verified; idempotent (all writes are
// upserts keyed by the unique stripeSubscriptionId, so replays/retries are safe).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object as Stripe.Checkout.Session;
        if (s.mode === "subscription" && s.subscription) {
          const sub = await stripe.subscriptions.retrieve(String(s.subscription));
          await upsertSubscription(sub, s.metadata?.businessId ?? sub.metadata?.businessId);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await upsertSubscription(sub, sub.metadata?.businessId);
        break;
      }
      default:
        break;
    }
  } catch (e) {
    // 500 → Stripe retries. The upsert is idempotent, so a retry is safe.
    console.error("[stripe-webhook] handler error:", (e as Error).message);
    return NextResponse.json({ error: "handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function upsertSubscription(sub: Stripe.Subscription, businessId?: string | null) {
  if (!businessId) return; // no business linkage — nothing to sync
  const data = {
    status: mapStripeStatus(sub.status),
    stripePriceId: sub.items.data[0]?.price?.id ?? null,
    currentPeriodStart: new Date(sub.current_period_start * 1000),
    currentPeriodEnd: new Date(sub.current_period_end * 1000),
    cancelAtPeriodEnd: sub.cancel_at_period_end,
    trialEndsAt: sub.trial_end ? new Date(sub.trial_end * 1000) : null,
  };
  await prisma.businessSubscription.upsert({
    where: { stripeSubscriptionId: sub.id },
    update: data,
    create: { businessId, stripeSubscriptionId: sub.id, plan: "STARTER", ...data },
  });
}
