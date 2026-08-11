export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { resolveEmployeeContext } from "@/lib/employee/context";
import { aiCapability } from "@/lib/ai/permissions";
import { PageHeader } from "@/components/ui/glass";
import { AssistantClient } from "@/app/business/(business-layout)/ai/assistant-client";

// Operational-only prompts for employees (no owner analytics / financials).
const EMPLOYEE_SUGGESTIONS = [
  "Jaką mam następną wizytę?",
  "Pokaż mój dzisiejszy grafik.",
  "Co mam jutro?",
  "Kiedy mam dziś wolną godzinę?",
  "Jaką usługę ma następny klient?",
];

export default async function EmployeeAiPage() {
  const ctx = await resolveEmployeeContext();
  if (!ctx) redirect("/");

  const cap = await aiCapability();

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PageHeader title="AI Asystent" subtitle="Zapytaj o swój grafik, wizyty i wolne terminy" />
      <AssistantClient available={cap.available} reason={cap.reason} tier={cap.tier} suggestions={EMPLOYEE_SUGGESTIONS} />
    </div>
  );
}
