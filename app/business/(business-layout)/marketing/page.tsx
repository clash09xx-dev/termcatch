export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/supabase/server";
import { ComingSoon } from "@/components/ui/glass";

// Kampanie SMS / e-mail nie mają jeszcze backendu. Link do rezerwacji —
// jedyna działająca rzecz z tej strony — mieszka teraz na Pulpicie.
export default async function MarketingPage() {
  const user = await getServerUser();
  if (!user) redirect("/login");

  return (
    <ComingSoon
      title="Marketing"
      body="Kampanie SMS i e-mail do Twojej bazy klientów — promocje, wolne terminy, sezonowe oferty. Twój link do rezerwacji znajdziesz na Pulpicie."
      icon={
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      }
    />
  );
}
