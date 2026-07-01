import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/customer/dashboard";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // Upsert user in our DB (handles OAuth sign-ups)
      const user = data.user;
      const metadata = user.user_metadata ?? {};

      await prisma.user.upsert({
        where: { supabaseId: user.id },
        create: {
          supabaseId: user.id,
          email: user.email!,
          firstName: metadata.full_name?.split(" ")[0] ?? metadata.given_name ?? "User",
          lastName: metadata.full_name?.split(" ").slice(1).join(" ") ?? metadata.family_name ?? "",
          avatarUrl: metadata.avatar_url ?? metadata.picture,
          isVerified: true,
          lastLoginAt: new Date(),
        },
        update: {
          lastLoginAt: new Date(),
          avatarUrl: metadata.avatar_url ?? metadata.picture,
        },
      });

      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocalEnv = process.env.NODE_ENV === "development";

      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      } else {
        return NextResponse.redirect(`${origin}${next}`);
      }
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
