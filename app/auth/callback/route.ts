import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next");

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      const user = data.user;
      const metadata = user.user_metadata ?? {};

      // Upsert user in our DB
      const dbUser = await prisma.user.upsert({
        where: { supabaseId: user.id },
        create: {
          supabaseId: user.id,
          email: user.email!,
          firstName: metadata.full_name?.split(" ")[0] ?? metadata.given_name ?? metadata.firstName ?? "User",
          lastName: metadata.full_name?.split(" ").slice(1).join(" ") ?? metadata.family_name ?? metadata.lastName ?? "",
          avatarUrl: metadata.avatar_url ?? metadata.picture,
          role: (metadata.role as "CUSTOMER" | "BUSINESS_OWNER") ?? "CUSTOMER",
          isVerified: true,
          lastLoginAt: new Date(),
        },
        update: {
          lastLoginAt: new Date(),
          avatarUrl: metadata.avatar_url ?? metadata.picture,
        },
        select: {
          role: true,
          ownedBusinesses: { select: { id: true }, take: 1 },
        },
      });

      // Determine redirect destination based on role
      let destination = nextParam;
      if (!destination) {
        if (dbUser.role === "BUSINESS_OWNER") {
          const hasBusiness = (dbUser.ownedBusinesses?.length ?? 0) > 0;
          destination = hasBusiness ? "/business/dashboard" : "/business/onboarding";
        } else {
          destination = "/customer/dashboard";
        }
      }

      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocalEnv = process.env.NODE_ENV === "development";
      const base = isLocalEnv
        ? origin
        : forwardedHost
        ? `https://${forwardedHost}`
        : origin;

      return NextResponse.redirect(`${base}${destination}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
