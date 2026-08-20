import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    ppr: false,
    serverActions: {
      // Image uploads go through a server action; the Next default of 1 MB
      // hard-rejected every real phone photo (the reported upload "crash").
      // 8 MB = 5 MB file limit + multipart/encoding overhead headroom.
      bodySizeLimit: "8mb",
    },
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
    formats: ["image/avif", "image/webp"],
  },
  // Security headers
  async headers() {
    const isProd = process.env.NODE_ENV === "production";

    // CSP, scoped to what it can enforce WITHOUT breaking the app.
    //
    // These five directives govern navigation, embedding and plugins — not
    // script or style loading — so they cannot break Next.js, Supabase, Stripe
    // or Google, and they close real holes:
    //   base-uri        a base tag injected into any HTML sink can silently
    //                   repoint every relative URL on the page
    //   object-src      kills <object>/<embed> plugin execution outright
    //   frame-ancestors the CSP-era clickjacking control (X-Frame-Options is
    //                   the legacy one, kept alongside for older browsers)
    //   form-action     stops an injected form from posting credentials
    //                   off-origin; Stripe is allowlisted because Checkout and
    //                   the billing portal are reached by form/redirect
    //   upgrade-insecure-requests  no mixed content in production
    //
    // DELIBERATELY ABSENT: script-src/style-src. Next.js App Router needs inline
    // bootstrap scripts, and the codebase uses inline `style` attributes
    // throughout, so any policy shippable today would have to include
    // 'unsafe-inline' — which makes script-src decorative rather than
    // protective. Doing it properly needs per-request nonces threaded through
    // middleware, which is a change with real breakage risk and belongs in its
    // own pass, not in a hardening sweep. See the report for that follow-up.
    // NOTE: there is deliberately NO `default-src`. It is the fallback for
    // script-src, style-src, img-src, connect-src and font-src, so
    // `default-src 'self'` would have blocked Supabase auth/storage calls,
    // avatars from Supabase and Google, Unsplash imagery and every inline
    // Next.js bootstrap script — the whole app, from one plausible-looking line.
    // The four directives kept below have NO fallback relationship to those
    // fetch directives (base-uri, form-action and frame-ancestors have no
    // fallback at all; object-src is set explicitly), so they enforce real
    // protection while leaving resource loading exactly as it is today.
    const csp = [
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "form-action 'self' https://checkout.stripe.com https://billing.stripe.com",
      ...(isProd ? ["upgrade-insecure-requests"] : []),
    ].join("; ");

    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(self)",
          },
          { key: "Content-Security-Policy", value: csp },
          // HSTS in PRODUCTION ONLY. On localhost it would pin http://localhost
          // to https for six months in the developer's browser and make the dev
          // server unreachable — a self-inflicted outage that is tedious to undo.
          //
          // `includeSubDomains` is included because it is the point of HSTS, but
          // it means EVERY *.termcatch.com host must serve valid HTTPS. `preload`
          // is deliberately NOT sent: it is effectively irreversible, and the
          // list must be joined knowingly, not as a side effect of a config edit.
          ...(isProd
            ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }]
            : []),
        ],
      },
    ];
  },
  // Redirects for SEO
  async redirects() {
    return [
      {
        source: "/home",
        destination: "/",
        permanent: true,
      },
    ];
  },
  // PWA & performance
  compress: true,
  poweredByHeader: false,
};

export default nextConfig;
