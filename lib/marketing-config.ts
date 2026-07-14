// Server-only: reads delivery-provider env. Kept separate from lib/marketing
// (which is client-safe) so the Resend/Twilio modules never enter a client
// bundle. Only imported by server components / server actions.
import { smsConfigured, whatsappConfigured } from "@/lib/messaging";
import { emailConfigured } from "@/lib/email";
import type { ChannelAvailability } from "@/lib/marketing";

/** Real delivery availability from the environment. */
export function channelAvailability(): ChannelAvailability {
  return {
    sms: smsConfigured(),
    whatsapp: whatsappConfigured(),
    email: emailConfigured(),
  };
}
