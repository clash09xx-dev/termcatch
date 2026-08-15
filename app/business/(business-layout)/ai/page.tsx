export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { resolveAiActor } from "@/lib/ai/permissions";
import { aiEnabled, aiConfigured } from "@/lib/ai/config";
import { getInsights } from "@/lib/ai/insights";
import { getServerI18n } from "@/lib/i18n/server";
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

  const { dict } = await getServerI18n();
  const T = dict.pages.aiPage;
  const insights = await getInsights(actor.businessId, dict);
  const { prompt } = await searchParams;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title={T.title}
        subtitle={T.subtitle}
      />

      {/* Proactive, data-backed insights (deterministic — no model call). */}
      {insights.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-3">
            <Overline>{T.suggestionsToday}</Overline>
            <span className="flex-1" style={{ borderTop: HAIRLINE }} />
          </div>
          <InsightCards insights={insights} severityLabels={dict.insightSeverity} />
        </section>
      )}

      {/* Conversational assistant + action approval */}
      <section className="space-y-3">
        <div className="flex items-center gap-3">
          <Overline>Rozmowa</Overline>
          <span className="flex-1" style={{ borderTop: HAIRLINE }} />
        </div>
        <AssistantClient available={available} reason={reason} tier={actor.tier} initialPrompt={prompt} suggestions={[...T.suggestions]} />
      </section>

      {insights.length === 0 && available && (
        <GlassCard className="p-4">
          <p className="text-xs leading-relaxed text-slate-500">{T.noInsights}</p>
        </GlassCard>
      )}
    </div>
  );
}
