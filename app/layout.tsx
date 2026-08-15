import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { CookieConsentBanner } from "@/components/cookie-consent";
import { AnalyticsTracker } from "@/components/analytics-tracker";
import { Toaster } from "sonner";
import { getServerI18n } from "@/lib/i18n/server";
import { I18nProvider } from "@/components/i18n/i18n-provider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    template: "%s | TermCatch",
    default: "TermCatch — Rezerwacje online dla salonów beauty | Fryzjer, barber, masaż",
  },
  description:
    "Rezerwacja wizyt online w salonach beauty: fryzjer, barber, paznokcie, masaż. Umów wizytę 24/7 w Krakowie i całej Polsce. System, który zarabia sam na siebie.",
  keywords: [
    "rezerwacja wizyt online",
    "umów wizytę online",
    "rezerwacja fryzjer",
    "rezerwacja barber",
    "rezerwacja masaż",
    "salon beauty Kraków",
    "fryzjer Kraków",
    "barber Kraków",
    "manicure Kraków",
    "system rezerwacji dla salonu",
    "system rezerwacji online dla salonów",
    "polska aplikacja do rezerwacji",
    "online booking",
    "appointment booking",
    "beauty salon booking",
  ],
  alternates: { canonical: "/" },
  authors: [{ name: "TermCatch" }],
  creator: "TermCatch",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "https://termcatch.com"
  ),
  openGraph: {
    type: "website",
    locale: "pl_PL",
    url: "https://termcatch.com",
    siteName: "TermCatch",
    title: "TermCatch — Rezerwacje online dla salonów i usług",
    description:
      "Zarezerwuj wizytę w najlepszych salonach i u specjalistów w Polsce.",
  },
  twitter: {
    card: "summary_large_image",
    title: "TermCatch",
    description: "Rezerwacje online dla salonów i usług w Polsce.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
  width: "device-width",
  initialScale: 1,
  // No maximumScale: pinning it to 1 blocks pinch-zoom on iOS, which is a
  // WCAG 1.4.4 failure and the exact thing a low-vision user needs most on a
  // dense calendar. Preventing the focus-zoom jump is a font-size job (all our
  // inputs are >= 16px), not a viewport-lock job.
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { locale, dict } = await getServerI18n();
  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <QueryProvider>
            <I18nProvider locale={locale} dict={dict}>
              {children}
              <CookieConsentBanner />
              <AnalyticsTracker />
            {/* One Toaster, mounted once at the root. Everything in the app
                goes through lib/notify — nothing imports sonner directly.
                It is chrome floating over content, so it is the one place a
                translucent surface is correct. On a phone it is lifted clear of
                the bottom tab bar and the home indicator. */}
            <Toaster
              position="bottom-right"
              style={{ zIndex: "var(--z-toast)" as unknown as number }}
              offset={20}
              mobileOffset={{ bottom: "calc(5.25rem + env(safe-area-inset-bottom))", left: 12, right: 12 }}
              gap={10}
              toastOptions={{
                duration: 4000,
                style: {
                  background: "var(--chrome-strong)",
                  backdropFilter: "var(--chrome-blur-lg)",
                  WebkitBackdropFilter: "var(--chrome-blur-lg)",
                  border: "1px solid var(--hairline)",
                  borderRadius: "14px",
                  boxShadow: "var(--e3)",
                  color: "var(--text-primary)",
                },
                classNames: { toast: "font-sans text-[13.5px]" },
              }}
            />
            </I18nProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
