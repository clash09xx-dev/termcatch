import "server-only";

import type { FunctionTool } from "../client";
import type { AiActor } from "../permissions";
import type { Role } from "@/lib/permissions";
import type { Locale } from "@/lib/i18n/config";

/**
 * The explicit, registered AI tool layer. The model can ONLY act through these.
 *
 *  • kind:"read"  — runs immediately, returns JSON data (scoped to the business).
 *  • kind:"write" — NEVER executes. It returns an ActionProposal (a preview).
 *                   Execution happens only after the owner confirms, via
 *                   lib/ai/execute.ts → the existing validated server action.
 *
 * Every tool re-derives/validates the business from the session actor and never
 * trusts a client- or model-supplied businessId.
 */

export type ToolContext = { actor: AiActor; locale: Locale };

export type JsonSchema = Record<string, unknown>;

// The proposal shape lives in a client-safe module so UI can import the type.
export type { ActionProposal } from "../proposal-types";
export { isProposal } from "../proposal-types";

export type AiTool = {
  name: string;
  description: string;
  parameters: JsonSchema;
  kind: "read" | "write";
  /** Roles allowed to use this tool. Enforced server-side — a model claim never overrides it. */
  roles: Role[];
  run: (args: Record<string, unknown>, ctx: ToolContext) => Promise<unknown>;
};

/** Is this role authorized to run this tool? (server-side authorization, not the model's word) */
export function canRunTool(tool: AiTool, role: Role): boolean {
  return tool.roles.includes(role);
}

/** Build the OpenAI Responses function-tool specs, filtered to the caller's role. */
export function toolSpecsForModel(tools: AiTool[], role: Role = "owner"): FunctionTool[] {
  return tools
    .filter((t) => t.roles.includes(role))
    .map((t) => ({
      type: "function",
      name: t.name,
      description: t.description,
      parameters: {
        type: "object",
        additionalProperties: false,
        ...t.parameters,
      },
      strict: false,
    }));
}

// ── small shared helpers for tool authors ────────────────────────────────────
export function str(args: Record<string, unknown>, key: string): string | undefined {
  const v = args[key];
  return typeof v === "string" && v.trim() !== "" ? v.trim() : undefined;
}
export function int(args: Record<string, unknown>, key: string): number | undefined {
  const v = args[key];
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) ? Math.trunc(n) : undefined;
}
export const money = (n: number, cur = "PLN") => `${n.toFixed(2)} ${cur}`;
