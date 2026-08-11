import "server-only";

import type OpenAI from "openai";
import type { AiActor } from "./permissions";
import { respond, type ResponsesInput } from "./client";
import { buildBusinessSnapshot, serializeSnapshot } from "./context";
import { buildSystemPrompt } from "./system-prompt";
import { ALL_TOOLS, getToolByName, toolSpecsForModel, isProposal, type ActionProposal, type ToolContext } from "./tools";
import type { AssistantMessage } from "./proposal-types";

export type { AssistantMessage } from "./proposal-types";
export type AssistantResult = {
  text: string;
  proposals: ActionProposal[];
  usedTools: string[];
};

const MAX_STEPS = 4;

function safeArgs(raw: string): Record<string, unknown> {
  try {
    const v = JSON.parse(raw);
    return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/**
 * Run one assistant turn: grounds on a compact business snapshot, exposes the
 * registered tools, and loops on tool calls (bounded). Read tools return data;
 * write tools return proposals that are collected and surfaced to the UI for
 * confirmation — this loop NEVER executes a write.
 */
export async function runAssistant(params: {
  actor: AiActor;
  messages: AssistantMessage[];
}): Promise<AssistantResult> {
  const { actor, messages } = params;
  const snapshot = await buildBusinessSnapshot(actor.businessId);
  const instructions = buildSystemPrompt({
    businessName: actor.businessName,
    contextBlock: serializeSnapshot(snapshot),
  });
  const toolSpecs = toolSpecsForModel(ALL_TOOLS);
  const ctx: ToolContext = { actor };

  // Seed with the conversation so far (bounded to the last 12 turns).
  const input: ResponsesInput = messages.slice(-12).map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const proposals: ActionProposal[] = [];
  const usedTools: string[] = [];
  let finalText = "";

  for (let step = 0; step < MAX_STEPS; step++) {
    const r = await respond({
      tier: "fast",
      instructions,
      input,
      tools: toolSpecs,
      feature: "assistant",
      businessId: actor.businessId,
      userId: actor.dbUserId,
    });

    const calls = r.response.output.filter(
      (o): o is OpenAI.Responses.ResponseFunctionToolCall => o.type === "function_call"
    );

    if (calls.length === 0) {
      finalText = r.text;
      break;
    }

    for (const call of calls) {
      usedTools.push(call.name);
      // Echo the model's function call back into the transcript...
      input.push({ type: "function_call", call_id: call.call_id, name: call.name, arguments: call.arguments });

      const tool = getToolByName(call.name);
      let result: unknown;
      if (!tool) {
        result = { error: `Nieznane narzędzie: ${call.name}` };
      } else {
        try {
          result = await tool.run(safeArgs(call.arguments), ctx);
        } catch (e) {
          result = { error: e instanceof Error ? e.message : "Błąd narzędzia." };
        }
      }
      if (isProposal(result)) proposals.push(result);

      // ...and its output.
      input.push({
        type: "function_call_output",
        call_id: call.call_id,
        output: JSON.stringify(result).slice(0, 8000),
      });
    }

    // Last step with pending calls but no room to continue → give a closing summary next loop won't run.
    if (step === MAX_STEPS - 1 && !finalText) {
      const closing = await respond({
        tier: "fast",
        instructions,
        input,
        feature: "assistant",
        businessId: actor.businessId,
        userId: actor.dbUserId,
        maxOutputTokens: 600,
      });
      finalText = closing.text;
    }
  }

  return { text: finalText.trim(), proposals, usedTools };
}
