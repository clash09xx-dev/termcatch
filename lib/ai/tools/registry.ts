import "server-only";

import type { FunctionTool } from "../client";
import type { AiActor } from "../permissions";

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

export type ToolContext = { actor: AiActor };

export type JsonSchema = Record<string, unknown>;

// The proposal shape lives in a client-safe module so UI can import the type.
export type { ActionProposal } from "../proposal-types";
export { isProposal } from "../proposal-types";

export type AiTool = {
  name: string;
  description: string;
  parameters: JsonSchema;
  kind: "read" | "write";
  run: (args: Record<string, unknown>, ctx: ToolContext) => Promise<unknown>;
};

/** Build the OpenAI Responses function-tool specs from a tool list. */
export function toolSpecsForModel(tools: AiTool[]): FunctionTool[] {
  return tools.map((t) => ({
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
