export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/supabase/server";
import {
  PageHeader,
  GlassCard,
  EmptyState,
  InkLink,
  GlassLink,
} from "@/components/ui/glass";

export default async function PaymentsPage() {
  const user = await getServerUser();
  if (!user) redirect("/login");

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <PageHeader
        title="Płatności"
        subtitle="Historia transakcji i wypłaty"
        actions={<GlassLink href="/business/settings">Ustawienia płatności</GlassLink>}
      />

      {/* Honest empty state — no fake "— zł" cards */}
      <GlassCard className="fade-rise fade-rise-d1">
        <EmptyState
          icon={
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
              <rect width="20" height="14" x="2" y="5" rx="2" />
              <line x1="2" x2="22" y1="10" y2="10" />
            </svg>
          }
          title="Brak transakcji"
          body="Podłącz Stripe, żeby przyjmować płatności online i zaliczki przy rezerwacji. Statystyki przychodów pojawią się tutaj po pierwszej transakcji."
          action={<InkLink href="/business/settings" size="md">Podłącz Stripe</InkLink>}
        />
      </GlassCard>
    </div>
  );
}
