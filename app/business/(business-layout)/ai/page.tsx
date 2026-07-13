export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/supabase/server";
import { ComingSoon } from "@/components/ui/glass";

export default async function AiPage() {
  const user = await getServerUser();
  if (!user) redirect("/login");

  return (
    <ComingSoon
      title="AI Asystent"
      body="Prognozy przychodów, kampanie do uśpionych klientów, optymalizacja grafiku i analiza opinii — AI zbuduje je z Twoich danych. Wejdzie w planie Salon Pro."
      icon={
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636-.707.707M21 12h-1M4 12H3m3.343-5.657-.707-.707m2.828 9.9a5 5 0 1 1 7.072 0l-.548.547A3.374 3.374 0 0 0 14 18.469V19a2 2 0 1 1-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      }
    />
  );
}
