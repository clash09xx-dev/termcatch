/** Client-safe types for AI action proposals + assistant results (shared by UI). */

export type AssistantMessage = { role: "user" | "assistant"; content: string };

export type ActionProposal = {
  kind: "proposal";
  actionType: string;
  title: string;
  summary: string;
  details: { label: string; value: string }[];
  params: Record<string, unknown>;
  confirmLabel: string;
  danger?: boolean;
  external?: boolean;
  recipientCount?: number;
  costHint?: string;
  draft?: string;
};

export function isProposal(v: unknown): v is ActionProposal {
  return typeof v === "object" && v !== null && (v as { kind?: string }).kind === "proposal";
}

export type AssistantTurn = {
  ok: true;
  text: string;
  proposals: ActionProposal[];
};

export type AiActionError = {
  ok: false;
  reason:
    | "unauthenticated"
    | "no_business"
    | "not_configured"
    | "disabled"
    | "plan_excluded"
    | "rate_limited"
    | "error";
  message: string;
};
