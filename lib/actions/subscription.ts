"use server";

import { prisma } from "@/lib/prisma";
import { getServerUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { createSubscriptionCheckout, normalizePlanKey } from "@/lib/subscription";

export type SubscriptionCheckoutState = { error?: string };

/**
 * Start a 7-day-trial subscription Checkout for the owner's business.
 * Repeat-trial abuse is prevented: if the business already had a trial
 * (any prior subscription with trialEndsAt), the checkout omits the trial.
 * Redirects to Stripe on success; returns an honest error otherwise.
 */
export async function startSubscriptionCheckout(planRaw: string): Promise<SubscriptionCheckoutState> {
  const user = await getServerUser();
  if (!user) redirect("/login");

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    include: { ownedBusinesses: { take: 1 } },
  });
  const business = dbUser?.ownedBusinesses[0];
  if (!business) redirect("/business/onboarding");

  const plan = normalizePlanKey(planRaw);
  if (!plan) return { error: "Nieznany plan." };

  const ownerEmail = business.email ?? user.email;
  if (!ownerEmail) return { error: "Brak adresu e-mail do rozliczeń." };

  // Abuse guard: a business that already used a trial doesn't get another.
  const priorTrial = await prisma.businessSubscription.findFirst({
    where: { businessId: business.id, trialEndsAt: { not: null } },
    select: { id: true },
  });

  const res = await createSubscriptionCheckout({
    businessId: business.id,
    ownerEmail,
    plan,
    hasUsedTrial: Boolean(priorTrial),
    appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "",
  });

  if (res.url) redirect(res.url); // throws (Next redirect) — must stay outside try
  return {
    error:
      res.error === "unconfigured"
        ? "Płatności abonamentowe nie są jeszcze skonfigurowane."
        : "Nie udało się rozpocząć subskrypcji. Spróbuj ponownie.",
  };
}
