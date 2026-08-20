export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { resolveEmployeeContext } from "@/lib/employee/context";
import { aiCapability } from "@/lib/ai/permissions";
import { PageHeader } from "@/components/ui/glass";
import { AssistantClient } from "@/app/business/(business-layout)/ai/assistant-client";
import { getServerI18n } from "@/lib/i18n/server";

export default async function EmployeeAiPage() {
  const { dict } = await getServerI18n();
  const T = dict.employee;
  const ctx = await resolveEmployeeContext();
  if (!ctx) redirect("/");

  const cap = await aiCapability();

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PageHeader title={T.aiAssistant} subtitle={T.aiSubtitle} />
      <AssistantClient available={cap.available} reason={cap.reason} tier={cap.tier} suggestions={[...T.aiSuggestions]} />
    </div>
  );
}
