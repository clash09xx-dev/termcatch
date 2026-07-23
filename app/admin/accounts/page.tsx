export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdminPage } from "@/lib/admin-access";
import { formatDate, formatRelativeTime } from "@/lib/utils";
import { Wordmark } from "@/components/brand/wordmark";
import { AdminViewSwitcher } from "@/components/admin-view-switcher";
import { STATUS_LABELS } from "@/lib/publication";
import { planKeyFromEnum, PLAN_ENTITLEMENTS } from "@/lib/entitlements";
import { multiLocationEnabled } from "@/lib/multi-location";
import {
  BusinessStatus,
  SubscriptionPlan,
  SubscriptionStatus,
  UserRole,
  type Prisma,
} from "@prisma/client";

const PAGE_SIZE = 20;

const SUB_STATUS_LABELS: Record<SubscriptionStatus, string> = {
  ACTIVE: "Aktywna",
  TRIALING: "Okres próbny",
  PAST_DUE: "Zaległa płatność",
  CANCELLED: "Anulowana",
  PAUSED: "Wstrzymana",
};

const SUB_STATUS_STYLE: Record<SubscriptionStatus, string> = {
  ACTIVE: "bg-green-50 text-green-700",
  TRIALING: "bg-blue-50 text-blue-700",
  PAST_DUE: "bg-amber-50 text-amber-700",
  CANCELLED: "bg-gray-100 text-gray-500",
  PAUSED: "bg-gray-100 text-gray-500",
};

type SP = {
  tab?: string;
  q?: string;
  status?: string;
  plan?: string;
  page?: string;
};

function isBusinessStatus(v: string | undefined): v is BusinessStatus {
  return !!v && v in BusinessStatus;
}
function isPlan(v: string | undefined): v is SubscriptionPlan {
  return !!v && v in SubscriptionPlan;
}

/** Build a query string, dropping empties and resetting page unless overridden. */
function qs(base: Record<string, string | undefined>, override: Record<string, string | undefined> = {}) {
  const merged = { ...base, ...override };
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(merged)) {
    if (v) p.set(k, v);
  }
  const s = p.toString();
  return s ? `?${s}` : "";
}

export default async function AdminAccountsPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  await requireAdminPage("/admin/accounts");

  const sp = await searchParams;
  const tab = sp.tab === "customers" ? "customers" : "businesses";
  const q = (sp.q ?? "").trim();
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const skip = (page - 1) * PAGE_SIZE;
  const locationsLive = multiLocationEnabled();

  // Preserved params for links (search box hidden fields + pagination).
  const baseParams: Record<string, string | undefined> = {
    tab,
    q: q || undefined,
    status: sp.status || undefined,
    plan: sp.plan || undefined,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminViewSwitcher />
      <header className="h-14 bg-white border-b border-gray-100 flex items-center px-6 gap-4">
        <Link href="/" className="flex items-center">
          <Wordmark className="text-base" />
        </Link>
        <span className="text-xs font-semibold text-white bg-gray-900 px-2 py-0.5 rounded-full">
          Konta
        </span>
        <Link href="/admin/dashboard" className="ml-auto text-xs font-medium text-gray-500 hover:text-gray-900">
          ← Pulpit
        </Link>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-5">
        {/* Tabs */}
        <div className="flex items-center gap-1 bg-white rounded-xl border border-gray-100 shadow-sm p-1 w-fit">
          <Link
            href={`/admin/accounts${qs({ tab: "businesses" })}`}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${tab === "businesses" ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-50"}`}
          >
            Salony
          </Link>
          <Link
            href={`/admin/accounts${qs({ tab: "customers" })}`}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${tab === "customers" ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-50"}`}
          >
            Klienci
          </Link>
        </div>

        {/* Filters — GET form so state lives in the URL (shareable, paginable). */}
        <form method="get" className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="tab" value={tab} />
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">Szukaj</label>
            <input
              name="q"
              defaultValue={q}
              placeholder={tab === "businesses" ? "Nazwa, miasto lub e-mail właściciela" : "Imię, nazwisko, e-mail lub telefon"}
              className="w-full h-9 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10"
            />
          </div>
          {tab === "businesses" && (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                <select name="status" defaultValue={sp.status ?? ""} className="h-9 px-3 rounded-lg border border-gray-200 text-sm bg-white">
                  <option value="">Wszystkie</option>
                  {Object.values(BusinessStatus).map((s) => (
                    <option key={s} value={s}>{STATUS_LABELS[s] ?? s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Plan</label>
                <select name="plan" defaultValue={sp.plan ?? ""} className="h-9 px-3 rounded-lg border border-gray-200 text-sm bg-white">
                  <option value="">Wszystkie</option>
                  {Object.values(SubscriptionPlan).map((p) => (
                    <option key={p} value={p}>{PLAN_ENTITLEMENTS[planKeyFromEnum(p)].label}</option>
                  ))}
                </select>
              </div>
            </>
          )}
          <button type="submit" className="h-9 px-4 rounded-lg bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800">
            Filtruj
          </button>
          {(q || sp.status || sp.plan) && (
            <Link href={`/admin/accounts?tab=${tab}`} className="h-9 px-3 inline-flex items-center rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
              Wyczyść
            </Link>
          )}
        </form>

        {tab === "businesses" ? (
          <BusinessesTable
            q={q}
            status={isBusinessStatus(sp.status) ? sp.status : undefined}
            plan={isPlan(sp.plan) ? sp.plan : undefined}
            page={page}
            skip={skip}
            baseParams={baseParams}
            locationsLive={locationsLive}
          />
        ) : (
          <CustomersTable q={q} page={page} skip={skip} baseParams={baseParams} />
        )}
      </main>
    </div>
  );
}

// ─── Salony ─────────────────────────────────────────────────────────────────
async function BusinessesTable({
  q,
  status,
  plan,
  page,
  skip,
  baseParams,
  locationsLive,
}: {
  q: string;
  status?: BusinessStatus;
  plan?: SubscriptionPlan;
  page: number;
  skip: number;
  baseParams: Record<string, string | undefined>;
  locationsLive: boolean;
}) {
  const where: Prisma.BusinessWhereInput = {
    ...(status ? { status } : {}),
    ...(plan ? { subscriptionPlan: plan } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { city: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { owner: { email: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.business.count({ where }),
    prisma.business.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE,
      select: {
        id: true,
        name: true,
        email: true,
        city: true,
        createdAt: true,
        status: true,
        subscriptionPlan: true,
        owner: { select: { email: true, firstName: true, lastName: true } },
        _count: { select: { employees: { where: { isActive: true } } } },
        subscriptions: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { status: true, trialEndsAt: true, currentPeriodEnd: true, stripeSubscriptionId: true },
        },
      },
    }),
  ]);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">Salony <span className="text-gray-400 font-normal">({total})</span></h2>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-gray-400 py-12 text-center">Brak wyników.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-gray-400 border-b border-gray-100">
                <th className="px-5 py-2.5 font-medium">Salon</th>
                <th className="px-3 py-2.5 font-medium">Właściciel</th>
                <th className="px-3 py-2.5 font-medium">Rejestracja</th>
                <th className="px-3 py-2.5 font-medium">Plan</th>
                <th className="px-3 py-2.5 font-medium">Subskrypcja</th>
                <th className="px-3 py-2.5 font-medium text-center">Specjaliści</th>
                <th className="px-3 py-2.5 font-medium text-center">Lokalizacje</th>
                <th className="px-3 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map((b) => {
                const sub = b.subscriptions[0];
                const planLabel = PLAN_ENTITLEMENTS[planKeyFromEnum(b.subscriptionPlan)].label;
                const hasStripe = !!sub?.stripeSubscriptionId;
                return (
                  <tr key={b.id} className="hover:bg-gray-50/60">
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-900">{b.name}</p>
                      <p className="text-xs text-gray-400">{b.email ?? b.city ?? "—"}</p>
                    </td>
                    <td className="px-3 py-3">
                      <p className="text-gray-700">{b.owner.firstName} {b.owner.lastName}</p>
                      <p className="text-xs text-gray-400">{b.owner.email}</p>
                    </td>
                    <td className="px-3 py-3 text-gray-600 whitespace-nowrap">{formatDate(b.createdAt, { day: "numeric", month: "short", year: "numeric" })}</td>
                    <td className="px-3 py-3">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">{planLabel}</span>
                    </td>
                    <td className="px-3 py-3">
                      {sub ? (
                        <div>
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${SUB_STATUS_STYLE[sub.status]}`}>
                            {SUB_STATUS_LABELS[sub.status]}
                          </span>
                          {sub.status === SubscriptionStatus.TRIALING && sub.trialEndsAt && (
                            <p className="text-[10px] text-gray-400 mt-0.5">do {formatDate(sub.trialEndsAt, { day: "numeric", month: "short" })}</p>
                          )}
                          {!hasStripe && <p className="text-[10px] text-gray-400 mt-0.5">bez Stripe</p>}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">Brak</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center text-gray-700">{b._count.employees}</td>
                    <td className="px-3 py-3 text-center text-gray-700">
                      {locationsLive ? "—" : "1"}
                    </td>
                    <td className="px-3 py-3">
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${b.status === "ACTIVE" ? "bg-green-50 text-green-700" : b.status === "PENDING_VERIFICATION" ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-600"}`}>
                        {STATUS_LABELS[b.status] ?? b.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <Pager page={page} total={total} baseParams={baseParams} />
    </div>
  );
}

// ─── Klienci ────────────────────────────────────────────────────────────────
async function CustomersTable({
  q,
  page,
  skip,
  baseParams,
}: {
  q: string;
  page: number;
  skip: number;
  baseParams: Record<string, string | undefined>;
}) {
  const where: Prisma.UserWhereInput = {
    role: UserRole.CUSTOMER,
    ...(q
      ? {
          OR: [
            { firstName: { contains: q, mode: "insensitive" } },
            { lastName: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { phone: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        createdAt: true,
        lastLoginAt: true,
        isActive: true,
        _count: { select: { appointments: true } },
      },
    }),
  ]);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-900">Zarejestrowani klienci <span className="text-gray-400 font-normal">({total})</span></h2>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-gray-400 py-12 text-center">Brak wyników.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-gray-400 border-b border-gray-100">
                <th className="px-5 py-2.5 font-medium">Klient</th>
                <th className="px-3 py-2.5 font-medium">Kontakt</th>
                <th className="px-3 py-2.5 font-medium">Rejestracja</th>
                <th className="px-3 py-2.5 font-medium">Ostatnie logowanie</th>
                <th className="px-3 py-2.5 font-medium text-center">Rezerwacje</th>
                <th className="px-3 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50/60">
                  <td className="px-5 py-3 font-medium text-gray-900">{u.firstName} {u.lastName}</td>
                  <td className="px-3 py-3">
                    <p className="text-gray-700">{u.email}</p>
                    {u.phone && <p className="text-xs text-gray-400">{u.phone}</p>}
                  </td>
                  <td className="px-3 py-3 text-gray-600 whitespace-nowrap">{formatDate(u.createdAt, { day: "numeric", month: "short", year: "numeric" })}</td>
                  <td className="px-3 py-3 text-gray-500 whitespace-nowrap">{u.lastLoginAt ? formatRelativeTime(u.lastLoginAt) : "—"}</td>
                  <td className="px-3 py-3 text-center text-gray-700">{u._count.appointments}</td>
                  <td className="px-3 py-3">
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${u.isActive ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {u.isActive ? "Aktywne" : "Nieaktywne"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pager page={page} total={total} baseParams={baseParams} />
    </div>
  );
}

// ─── Paginacja ──────────────────────────────────────────────────────────────
function Pager({
  page,
  total,
  baseParams,
}: {
  page: number;
  total: number;
  baseParams: Record<string, string | undefined>;
}) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (pages <= 1) return null;
  const mk = (p: number) => `/admin/accounts${qs(baseParams, { page: String(p) })}`;
  return (
    <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 text-sm">
      <span className="text-gray-400">Strona {page} z {pages}</span>
      <div className="flex items-center gap-2">
        {page > 1 ? (
          <Link href={mk(page - 1)} className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">Poprzednia</Link>
        ) : (
          <span className="px-3 py-1.5 rounded-lg border border-gray-100 text-gray-300">Poprzednia</span>
        )}
        {page < pages ? (
          <Link href={mk(page + 1)} className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">Następna</Link>
        ) : (
          <span className="px-3 py-1.5 rounded-lg border border-gray-100 text-gray-300">Następna</span>
        )}
      </div>
    </div>
  );
}
