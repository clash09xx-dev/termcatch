export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { markAllNotificationsRead } from "@/lib/actions/notifications";
import { formatRelativeTime, cn } from "@/lib/utils";
import { NotificationType } from "@prisma/client";

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
        <svg className={cn(base, "text-red-500")} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
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
        <svg className={cn(base, "text-gray-500")} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
          <rect width="18" height="18" x="3" y="4" rx="2" />
          <line x1="16" x2="16" y1="2" y2="6" />
          <line x1="8" x2="8" y1="2" y2="6" />
          <line x1="3" x2="21" y1="10" y2="10" />
        </svg>
      );
  }
}

export default async function NotificationsPage() {
  const user = await getServerUser();
  if (!user) redirect("/login");

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    select: { id: true },
  });
  if (!dbUser) redirect("/login");

  const notifications = await prisma.notification.findMany({
    where: { userId: dbUser.id, channel: "IN_APP" },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Powiadomienia</h2>
          <p className="text-sm text-gray-500 mt-1">
            {unreadCount > 0
              ? `Masz ${unreadCount} ${unreadCount === 1 ? "nieprzeczytane powiadomienie" : "nieprzeczytanych powiadomień"}`
              : "Potwierdzenia rezerwacji i przypomnienia"}
          </p>
        </div>
        {unreadCount > 0 && (
          <form action={markAllNotificationsRead}>
            <button
              type="submit"
              className="text-xs font-medium text-gray-600 hover:text-gray-900 border border-gray-200 hover:border-gray-300 px-3 py-2 rounded-xl transition-colors whitespace-nowrap"
            >
              Oznacz jako przeczytane
            </button>
          </form>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex flex-col items-center justify-center py-20 text-center px-6">
            <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-700 mb-1">Brak powiadomień</p>
            <p className="text-xs text-gray-400 max-w-xs">
              Potwierdzenia rezerwacji, przypomnienia przed wizytami i zmiany terminów pojawią się tutaj.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-100">
          {notifications.map((n) => {
            const data = (n.data ?? {}) as { businessSlug?: string; appointmentId?: string };
            const href =
              n.type === "REVIEW_REQUEST" && data.businessSlug && data.appointmentId
                ? `/b/${data.businessSlug}?review=${data.appointmentId}`
                : "/customer/dashboard";
            return (
              <Link
                key={n.id}
                href={href}
                className={cn(
                  "flex gap-3.5 px-5 py-4 hover:bg-gray-50 transition-colors",
                  !n.isRead && "bg-gray-50/70"
                )}
              >
                <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <TypeIcon type={n.type} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={cn("text-sm text-gray-900", !n.isRead ? "font-semibold" : "font-medium")}>
                      {n.title}
                    </p>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {!n.isRead && <span className="w-2 h-2 rounded-full bg-gray-900" />}
                      <span className="text-xs text-gray-400">{formatRelativeTime(n.createdAt)}</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{n.body}</p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
