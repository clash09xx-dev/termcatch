import "server-only";

import OpenAI from "openai";
import { modelFor, MAX_OUTPUT_TOKENS, type AiModelTier } from "./config";
import { logAiUsage } from "./usage";

/**
 * Low-level OpenAI wrapper built on the modern Responses API. Every call goes
 * through here so usage is always logged and cost bounded. Prompts are sent with
 * `store: false` so OpenAI does not retain them (privacy).
 *
 * The permission/rate gate (lib/ai/permissions.gateAiRequest) must be checked by
 * the caller BEFORE invoking these — this module assumes the request is allowed.
 */

let client: OpenAI | null = null;
export function getOpenAI(): OpenAI {
  if (!client) client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return client;
}

export type FunctionTool = OpenAI.Responses.Tool;
export type ResponsesInput = OpenAI.Responses.ResponseInput;

export type RespondParams = {
  tier: AiModelTier;
  instructions: string;
  input: string | ResponsesInput;
  tools?: FunctionTool[];
  maxOutputTokens?: number;
  temperature?: number;
  feature: string;
  businessId: string;
  userId?: string | null;
};

export type RespondResult = {
  response: OpenAI.Responses.Response;
  text: string;
  model: string;
  usage: { input: number; output: number };
};

export async function respond(p: RespondParams): Promise<RespondResult> {
  const model = modelFor(p.tier);
  let ok = false;
  let usage = { input: 0, output: 0 };
  try {
    const response = await getOpenAI().responses.create({
      model,
      instructions: p.instructions,
      input: p.input,
      ...(p.tools && p.tools.length ? { tools: p.tools } : {}),
      max_output_tokens: p.maxOutputTokens ?? MAX_OUTPUT_TOKENS,
      ...(p.temperature != null ? { temperature: p.temperature } : {}),
      store: false,
    });
    usage = {
      input: response.usage?.input_tokens ?? 0,
      output: response.usage?.output_tokens ?? 0,
    };
    ok = true;
    return { response, text: response.output_text ?? "", model, usage };
  } finally {
    await logAiUsage({
      businessId: p.businessId,
      userId: p.userId,
      feature: p.feature,
      model,
      inputTokens: usage.input,
      outputTokens: usage.output,
      ok,
    });
  }
}

/** Convenience for single-shot text generation (no tools). */
export async function generateText(p: Omit<RespondParams, "tools">): Promise<string> {
  const r = await respond(p);
  return r.text.trim();
}
