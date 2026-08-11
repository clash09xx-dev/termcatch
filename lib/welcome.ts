import "server-only";

import { prisma } from "@/lib/prisma";
import { sendWelcomeEmail } from "@/lib/email";

/**
 * Send the welcome email exactly ONCE per account, for either signup path
 * (email-verified or Google). The `welcomeEmailSentAt` claim is atomic
 * (updateMany guarded on null) so concurrent logins can't double-send, and a
 * repeat Google login never re-triggers it. Never throws — auth must not break.
 */
export async function maybeSendWelcomeEmail(supabaseId: string): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { supabaseId },
      select: { id: true, email: true, firstName: true, welcomeEmailSentAt: true },
    });
    if (!user || user.welcomeEmailSentAt) return;

    const claimed = await prisma.user.updateMany({
      where: { id: user.id, welcomeEmailSentAt: null },
      data: { welcomeEmailSentAt: new Date() },
    });
    if (claimed.count === 0) return; // another request already claimed + sent it

    await sendWelcomeEmail({ to: user.email, firstName: user.firstName });
  } catch {
    /* welcome email is best-effort */
  }
}
