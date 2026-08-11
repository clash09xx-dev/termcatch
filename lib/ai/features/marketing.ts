import "server-only";

import { respond } from "../client";
import { buildWriterPrompt } from "../system-prompt";
import { modelTierForFeature } from "../config";

export type CampaignChannel = "sms" | "whatsapp" | "email";

/**
 * Generate campaign copy for a segment + channel. Returns a message that still
 * contains the personalization tokens {imię}, {salon}, {link} — they are filled
 * per-recipient at send time by lib/marketing.renderMessage, never here.
 */
export async function generateCampaignCopy(params: {
  businessId: string;
  userId?: string | null;
  businessName: string;
  segmentLabel: string;
  channel: CampaignChannel;
  goal?: string;
}): Promise<{ subject: string | null; message: string }> {
  const isEmail = params.channel === "email";
  const lengthHint = isEmail
    ? "E-mail: 3–5 krótkich zdań + jasne wezwanie do działania. Zwróć też krótki temat wiadomości."
    : "SMS: bardzo krótko, maks. ~2 zdania (do ~300 znaków). Bez tematu.";

  const task = `Napisz treść kampanii marketingowej salonu do segmentu „${params.segmentLabel}”. ${lengthHint} Użyj naturalnie tokenów personalizacji: {imię} (imię klienta), {salon} (nazwa salonu), {link} (link do rezerwacji). ${
    params.goal ? `Cel kampanii: ${params.goal}.` : "Cel: zachęcić do rezerwacji wizyty."
  } Nie obiecuj konkretnych zniżek, jeśli nie podano. Bez emoji-spamu.`;

  const instructions =
    buildWriterPrompt({ businessName: params.businessName, task }) +
    `\nZwróć wynik jako CZYSTY JSON: {"subject": string|null, "message": string}. Bez bloków kodu.`;

  const r = await respond({
    tier: modelTierForFeature("campaign_copy"),
    instructions,
    input: "Wygeneruj treść kampanii teraz.",
    feature: "campaign_copy",
    businessId: params.businessId,
    userId: params.userId,
    maxOutputTokens: 500,
    temperature: 0.8,
  });

  const parsed = safeParse(r.text);
  const message = (parsed?.message || r.text || "").trim();
  const subject = isEmail ? (parsed?.subject || null) : null;
  return { subject, message };
}

function safeParse(text: string): { subject?: string | null; message?: string } | null {
  try {
    const cleaned = text.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end === -1) return null;
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return null;
  }
}
