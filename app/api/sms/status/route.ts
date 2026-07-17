import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyTwilioSignature } from "@/lib/sms";

// Twilio delivery-status webhook. Requests are authenticated with the
// X-Twilio-Signature HMAC — anything unsigned/mis-signed gets 403.

const STATUS_MAP: Record<string, string> = {
  queued: "SENT",
  sent: "SENT",
  delivered: "DELIVERED",
  undelivered: "UNDELIVERED",
  failed: "FAILED",
};

export async function POST(request: NextRequest) {
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!token || token.includes("...")) {
    return NextResponse.json({ error: "not configured" }, { status: 503 });
  }

  const form = await request.formData();
  const params: Record<string, string> = {};
  for (const [k, v] of form.entries()) params[k] = String(v);

  const signature = request.headers.get("x-twilio-signature") ?? "";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const url = `${appUrl}/api/sms/status`;
  if (!signature || !verifyTwilioSignature(token, url, params, signature)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 403 });
  }

  const sid = params.MessageSid;
  const status = STATUS_MAP[params.MessageStatus ?? ""];
  if (sid && status) {
    await prisma.smsMessage.updateMany({
      where: { providerSid: sid },
      data: { status, ...(params.ErrorCode ? { error: `twilio_${params.ErrorCode}` } : {}) },
    });
  }
  return new NextResponse(null, { status: 204 });
}
