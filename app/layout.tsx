import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { CookieConsentBanner } from "@/components/cookie-consent";
import { AnalyticsTracker } from "@/components/analytics-tracker";
import { Toaster } from "sonner";
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
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pl" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <QueryProvider>
            {children}
            <CookieConsentBanner />
            <AnalyticsTracker />
            <Toaster
              position="bottom-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: "rgba(255,255,255,0.92)",
                  backdropFilter: "blur(24px) saturate(200%)",
                  WebkitBackdropFilter: "blur(24px) saturate(200%)",
                  border: "1px solid rgba(203,213,225,0.50)",
                  borderRadius: "14px",
                  boxShadow:
                    "0 0 0 0.5px rgba(203,213,225,0.35), 0 4px 16px rgba(100,116,139,0.12), 0 12px 32px rgba(15,23,42,0.08), inset 0 1px 0 rgba(255,255,255,0.95)",
                  color: "#0F172A",
                },
                classNames: {
                  toast: "font-sans text-sm",
                },
              }}
            />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
