export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdminPage } from "@/lib/admin-access";
import { Wordmark } from "@/components/brand/wordmark";
import { formatRelativeTime } from "@/lib/utils";
import { ReportRow } from "./report-row";

/**
 * The moderation queue.
 *
 * Reports filed from a salon profile land here rather than in an inbox, so a
 * report is a row someone can actually act on. Gated by the same
 * requireAdminPage helper as the rest of /admin — no separate auth path.
 *
 * Reports are resolved in place: open → resolved | dismissed. There is no
 * separate "reviewing" UI yet because with one moderator it would be a status
 * nobody sets; the column exists in the schema for when that changes.
 */
export default async function AdminReportsPage() {
  await requireAdminPage("/admin/reports");

  const reports = await prisma.report.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 200,
    select: {
      id: true,
      targetType: true,
      targetId: true,
      reason: true,
      details: true,
      status: true,
      createdAt: true,
      handledAt: true,
      reporter: { select: { email: true, firstName: true, lastName: true } },
    },
  });

  // Resolve the reported businesses in one query rather than per row.
  const businessIds = reports.filter((r) => r.targetType === "business").map((r) => r.targetId);
  const businesses = businessIds.length
    ? await prisma.business.findMany({
        where: { id: { in: businessIds } },
        select: { id: true, name: true, slug: true, status: true },
      })
    : [];
  const byId = new Map(businesses.map((b) => [b.id, b]));

  const open = reports.filter((r) => r.status === "open");

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">
          <Link href="/admin/dashboard"><Wordmark className="text-base" variant="light" /></Link>
          <span className="text-sm font-semibold text-gray-900">Reports</span>
          <span className="ml-auto text-xs text-gray-500 tabular-nums">
            {open.length} open / {reports.length} total
          </span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {reports.length === 0 ? (
          <p className="text-sm text-gray-500">No reports.</p>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Target</th>
                  <th className="px-4 py-3 font-medium">Reason</th>
                  <th className="px-4 py-3 font-medium">Reporter</th>
                  <th className="px-4 py-3 font-medium">Filed</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => {
                  const b = byId.get(r.targetId);
                  return (
                    <ReportRow
                      key={r.id}
                      id={r.id}
                      status={r.status}
                      reason={r.reason}
                      details={r.details}
                      targetLabel={b ? b.name : `${r.targetType}:${r.targetId}`}
                      targetHref={b ? `/b/${b.slug}` : null}
                      targetStatus={b?.status ?? null}
                      reporterLabel={`${r.reporter.firstName} ${r.reporter.lastName}`.trim() || r.reporter.email}
                      filed={formatRelativeTime(r.createdAt)}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
