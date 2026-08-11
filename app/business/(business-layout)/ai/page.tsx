export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { resolveAiActor } from "@/lib/ai/permissions";
import { aiEnabled, aiConfigured } from "@/lib/ai/config";
import { getInsights } from "@/lib/ai/insights";
import { PageHeader, GlassCard, Overline, HAIRLINE } from "@/components/ui/glass";
import { InsightCards } from "@/components/business/ai/insight-cards";
import { AssistantClient } from "./assistant-client";

export default async function AiPage({ searchParams }: { searchParams: Promise<{ prompt?: string }> }) {
  const resolved = await resolveAiActor();
  if (!resolved.ok) {
    redirect(resolved.reason === "unauthenticated" ? "/login" : "/business/onboarding");
  }
  const actor = resolved.actor;

  let available = true;
  let reason: string | undefined;
  if (!aiEnabled()) { available = false; reason = "disabled"; }
  else if (!aiConfigured()) { available = false; reason = "not_configured"; }
  else if (actor.tier === "none") { available = false; reason = "plan_excluded"; }

  const insights = await getInsights(actor.businessId);
  const { prompt } = await searchParams;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="Asystent AI"
        subtitle="Twój menedżer operacyjny — analizuje dane salonu i proponuje działania do zatwierdzenia."
      />

      {/* Proactive, data-backed insights (deterministic — no model call). */}
      {insights.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-3">
            <Overline>Sugestie na dziś</Overline>
            <span className="flex-1" style={{ borderTop: HAIRLINE }} />
          </div>
          <InsightCards insights={insights} />
        </section>
      )}

      {/* Conversational assistant + action approval */}
      <section className="space-y-3">
        <div className="flex items-center gap-3">
          <Overline>Rozmowa</Overline>
          <span className="flex-1" style={{ borderTop: HAIRLINE }} />
        </div>
        <AssistantClient available={available} reason={reason} initialPrompt={prompt} />
      </section>

      {insights.length === 0 && available && (
        <GlassCard className="p-4">
          <p className="text-xs leading-relaxed text-slate-500">
            Sugestie pojawią się, gdy w danych znajdzie się coś wartego uwagi (wolne terminy, uśpieni klienci,
            spadek przychodu, opinie bez odpowiedzi). Zawsze możesz o to zapytać powyżej.
          </p>
        </GlassCard>
      )}
    </div>
  );
}
