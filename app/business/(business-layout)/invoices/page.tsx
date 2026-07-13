export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/supabase/server";
import { ComingSoon } from "@/components/ui/glass";

export default async function InvoicesPage() {
  const user = await getServerUser();
  if (!user) redirect("/login");

  return (
    <ComingSoon
      title="Faktury"
      body="Faktury i eksporty księgowe prosto z historii wizyt. Wejdzie w planie Salon Pro."
      icon={
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" x2="8" y1="13" y2="13" />
          <line x1="16" x2="8" y1="17" y2="17" />
        </svg>
      }
    />
  );
}
