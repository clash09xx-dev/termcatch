import type { Metadata } from "next";
import { ForBusinessClient } from "./for-business-client";

export const metadata: Metadata = {
  title: "Dla salonów i specjalistów — kalendarz online i rezerwacje | Termcatch",
  description:
    "Termcatch dla właścicieli salonów — kalendarz online 24/7, automatyczne przypomnienia, CRM, płatności i analityka w jednym miejscu. Zacznij za darmo.",
  alternates: { canonical: "/for-business" },
};

export default function ForBusinessPage() {
  return <ForBusinessClient />;
}
