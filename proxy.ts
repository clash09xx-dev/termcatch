import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Routes that require authentication
const PROTECTED_ROUTES = ["/customer", "/business", "/admin", "/employee"];

// Routes that should redirect to dashboard if already logged in
const AUTH_ROUTES = ["/login", "/register", "/reset-password"];

export async function proxy(request: NextRequest) {
  // ── Canonical hostname (ONE host: termcatch.com) ──────────────────────────
  // Redirect www.<domain> → the apex on https, preserving path + query. This is
  // the code half of the "www broken" fix; the other half (a TLS certificate
  // actually being issued for www) is Railway/DNS config and cannot be done in
  // code — see the report. Dev/localhost never uses a www host, so this is inert
  // locally and carries no redirect-loop risk (apex never starts with "www.").
  const host = request.headers.get("host") ?? "";
  if (host.startsWith("www.")) {
    const url = request.nextUrl.clone();
    url.protocol = "https:";
    url.host = host.slice(4); // strip "www."
    url.port = "";
    return NextResponse.redirect(url, 308);
  }

  // Forward the pathname to Server Components (they can't read it otherwise) so
  // the business layout can exempt the billing route from the subscription gate.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-tc-pathname", request.nextUrl.pathname);
  let supabaseResponse = NextResponse.next({ request: { headers: requestHeaders } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request: { headers: requestHeaders } });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options as Parameters<typeof supabaseResponse.cookies.set>[2])
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Redirect logged-in users away from auth pages (role-aware)
  if (user && AUTH_ROUTES.some((r) => pathname.startsWith(r))) {
    const role = (user.user_metadata?.role as string | undefined) ?? "CUSTOMER";
    const target =
      role === "BUSINESS_OWNER"
        ? "/business/dashboard"
        : role === "EMPLOYEE"
          ? "/employee/dashboard"
          : role === "ADMIN" || role === "SUPERADMIN"
            ? "/admin/dashboard"
            : "/customer/dashboard";
    return NextResponse.redirect(new URL(target, request.url));
  }

  // Protect routes that require authentication
  if (PROTECTED_ROUTES.some((r) => pathname.startsWith(r))) {
    if (!user) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
