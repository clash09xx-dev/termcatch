export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getOrCreateDbUser } from "@/lib/auth-user";
import { markAllNotificationsRead, markNotificationRead } from "@/lib/actions/notifications";
import { formatRelativeTime, cn } from "@/lib/utils";
import { NotificationType } from "@prisma/client";
import { PageHeader, GlassCard, EmptyState, GlassButton, ChromeAvatar, HAIRLINE, CHIP } from "@/components/ui/glass";

function TypeIcon({ type }: { type: NotificationType }) {
  const base = "w-5 h-5";
  switch (type) {
    case "APPOINTMENT_CONFIRMED":
      return (
        <svg className={cn(base, "text-emerald-600")} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      );
    case "APPOINTMENT_CANCELLED":
      return (
        <svg className={cn(base, "text-rose-600")} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      );
    case "REVIEW_REQUEST":
    case "REVIEW_RECEIVED":
      return (
        <svg className={cn(base, "text-amber-500")} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
        </svg>
      );
    default:
      return (
        <svg className={cn(base, "text-slate-500")} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
          <rect width="18" height="18" x="3" y="4" rx="2" />
          <line x1="16" x2="16" y1="2" y2="6" />
          <line x1="8" x2="8" y1="2" y2="6" />
          <line x1="3" x2="21" y1="10" y2="10" />
        </svg>
      );
  }
}

export default async function NotificationsPage() {
  const dbUser = await getOrCreateDbUser();

  const notifications = await prisma.notification.findMany({
    where: { userId: dbUser.id, channel: "IN_APP" },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="space-y-5 max-w-3xl">
      <PageHeader
        title="Powiadomienia"
        subtitle={
          unreadCount > 0
            ? `Masz ${unreadCount} ${unreadCount === 1 ? "nieprzeczytane powiadomienie" : "nieprzeczytanych powiadomień"}`
            : "Potwierdzenia rezerwacji i przypomnienia"
        }
        actions={
          unreadCount > 0 ? (
            <form action={markAllNotificationsRead}>
              <GlassButton type="submit" size="sm">Oznacz jako przeczytane</GlassButton>
            </form>
          ) : undefined
        }
      />

      {notifications.length === 0 ? (
        <GlassCard className="fade-rise fade-rise-d1">
          <EmptyState
            icon={
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            }
            title="Brak powiadomień"
            body="Potwierdzenia rezerwacji, przypomnienia przed wizytami i zmiany terminów pojawią się tutaj."
          />
        </GlassCard>
      ) : (
        <GlassCard className="fade-rise fade-rise-d1 overflow-hidden">
          {notifications.map((n, i) => {
            const data = (n.data ?? {}) as { businessSlug?: string; appointmentId?: string; link?: string };
            // Prefer an explicit target link (e.g. business notifications →
            // /business/reviews), then the review-request deep link, else dashboard.
            const href =
              typeof data.link === "string" && data.link.startsWith("/")
                ? data.link
                : n.type === "REVIEW_REQUEST" && data.businessSlug && data.appointmentId
                ? `/b/${data.businessSlug}?review=${data.appointmentId}`
                : "/customer/dashboard";
            return (
              <div
                key={n.id}
                className="flex items-stretch"
                style={{
                  ...(i > 0 ? { borderTop: HAIRLINE } : {}),
                  ...(!n.isRead ? { background: "rgba(203,213,225,0.10)" } : {}),
                }}
              >
                <Link href={href} className="row-hover flex gap-3.5 px-5 py-4 flex-1 min-w-0">
                  <span className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={CHIP}>
                    <TypeIcon type={n.type} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn("text-sm text-slate-900", !n.isRead ? "font-semibold" : "font-medium")}>
                        {n.title}
                      </p>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {!n.isRead && (
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ background: "linear-gradient(180deg, #1E293B, #0F172A)" }}
                            aria-label="Nieprzeczytane"
                          />
                        )}
                        <span className="text-xs text-slate-400">{formatRelativeTime(n.createdAt)}</span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{n.body}</p>
                  </div>
                </Link>
                {!n.isRead && (
                  <form action={markNotificationRead.bind(null, n.id)} className="flex items-center pr-3">
                    <button
                      type="submit"
                      className="text-xs font-medium text-slate-400 hover:text-slate-800 px-2 py-1 rounded-lg transition-colors"
                      aria-label="Oznacz jako przeczytane"
                      title="Oznacz jako przeczytane"
                    >
                      ✓
                    </button>
                  </form>
                )}
              </div>
            );
          })}
        </GlassCard>
      )}
    </div>
  );
}
