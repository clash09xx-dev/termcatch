"use client";

import Link from "next/link";
import { useTransition, useState } from "react";
import { resolveReport } from "@/lib/actions/admin-reports";

/**
 * One row in the moderation queue.
 *
 * Client-side only so the two resolve buttons can show pending state; the
 * decision itself is a server action that re-checks admin rights.
 */
export function ReportRow({
  id, status, reason, details, targetLabel, targetHref, targetStatus, reporterLabel, filed,
}: {
  id: string;
  status: string;
  reason: string;
  details: string | null;
  targetLabel: string;
  targetHref: string | null;
  targetStatus: string | null;
  reporterLabel: string;
  filed: string;
}) {
  const [current, setCurrent] = useState(status);
  const [isPending, start] = useTransition();

  function decide(next: "resolved" | "dismissed") {
    start(async () => {
      const res = await resolveReport(id, next);
      if (res.ok) setCurrent(next);
    });
  }

  const isOpen = current === "open";

  return (
    <tr className="border-t border-gray-100 align-top">
      <td className="px-4 py-3">
        {targetHref ? (
          <Link href={targetHref} className="font-medium text-gray-900 underline underline-offset-2">
            {targetLabel}
          </Link>
        ) : (
          <span className="font-medium text-gray-900">{targetLabel}</span>
        )}
        {targetStatus && <span className="block text-xs text-gray-400 mt-0.5">{targetStatus}</span>}
      </td>
      <td className="px-4 py-3">
        <span className="text-gray-800">{reason}</span>
        {details && <p className="text-xs text-gray-500 mt-1 max-w-[42ch] whitespace-pre-wrap">{details}</p>}
      </td>
      <td className="px-4 py-3 text-gray-600">{reporterLabel}</td>
      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{filed}</td>
      <td className="px-4 py-3">
        <span
          className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium"
          style={
            isOpen
              ? { background: "rgba(251,191,36,0.14)", color: "#B45309" }
              : { background: "rgba(148,163,184,0.16)", color: "#475569" }
          }
        >
          {current}
        </span>
      </td>
      <td className="px-4 py-3 text-right whitespace-nowrap">
        {isOpen ? (
          <span className="inline-flex gap-2">
            <button
              onClick={() => decide("resolved")}
              disabled={isPending}
              className="text-xs font-semibold text-gray-900 underline underline-offset-2 disabled:opacity-50"
            >
              Resolve
            </button>
            <button
              onClick={() => decide("dismissed")}
              disabled={isPending}
              className="text-xs font-medium text-gray-500 underline underline-offset-2 disabled:opacity-50"
            >
              Dismiss
            </button>
          </span>
        ) : (
          <span className="text-xs text-gray-400">—</span>
        )}
      </td>
    </tr>
  );
}
