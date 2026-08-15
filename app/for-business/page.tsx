import type { Metadata } from "next";
import { ForBusinessClient } from "./for-business-client";
import { getServerI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getServerI18n();
  const T = dict.publicPages.forBusiness;
  return { title: T.seoTitle, description: T.seoDescription, alternates: { canonical: "/for-business" } };
}

export default function ForBusinessPage() {
  return <ForBusinessClient />;
}
