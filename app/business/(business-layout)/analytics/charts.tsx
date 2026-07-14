"use client";

import { AreaChart, BarColumns } from "@/components/ui/chart";
import { formatCurrency } from "@/lib/utils";

// Client wrappers — a server page can't pass a formatter function across the
// boundary, so the currency formatting lives here.
export function RevenueArea({ data }: { data: { label: string; value: number }[] }) {
  return <AreaChart data={data} formatValue={formatCurrency} height={210} />;
}

export function WeekdayBars({ data }: { data: { label: string; value: number }[] }) {
  return <BarColumns data={data} height={150} />;
}
