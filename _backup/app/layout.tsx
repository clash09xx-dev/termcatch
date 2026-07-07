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
    template: "%s | Termcatch",
    default: "Termcatch — Rezerwacje online dla salonów beauty | Fryzjer, barber, masaż",
  },
  description:
    "Rezerwacja wizyt online w salonach beauty: fryzjer, barber, paznokcie, masaż. Umów wizytę 24/7 w Krakowie i całej Polsce. Polska alternatywa dla Booksy — dla salonów o połowę taniej.",
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
    "alternatywa dla Booksy",
    "polska aplikacja do rezerwacji",
    "online booking",
    "appointment booking",
    "beauty salon booking",
  ],
  alternates: { canonical: "/" },
  authors: [{ name: "Termcatch" }],
  creator: "Termcatch",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "https://termcatch.com"
  ),
  openGraph: {
    type: "website",
    locale: "pl_PL",
    url: "https://termcatch.com",
    siteName: "Termcatch",
    title: "Termcatch — Rezerwacje online dla salonów i usług",
    description:
      "Zarezerwuj wizytę w najlepszych salonach i u specjalistów w Polsce.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Termcatch",
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
                classNames: {
                  toast: "font-sans text-sm bg-white border border-gray-200 shadow-lg rounded-xl",
                  success: "border-green-200",
                  error: "border-red-200",
                },
              }}
            />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
