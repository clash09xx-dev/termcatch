import "server-only";

import type { AiTool } from "./registry";
import { calendarTools } from "./calendar";
import { clientTools } from "./clients";
import { analyticsTools } from "./analytics";
import { employeeTools } from "./employees";
import { serviceTools } from "./services";
import { reviewTools } from "./reviews";
import { marketingTools } from "./marketing";
import { invoiceTools } from "./invoices";

/** The complete registered tool set the assistant may use. */
export const ALL_TOOLS: AiTool[] = [
  ...calendarTools,
  ...clientTools,
  ...analyticsTools,
  ...employeeTools,
  ...serviceTools,
  ...reviewTools,
  ...marketingTools,
  ...invoiceTools,
];

export function getToolByName(name: string): AiTool | undefined {
  return ALL_TOOLS.find((t) => t.name === name);
}

export * from "./registry";
