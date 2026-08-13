"use server";

import { prisma } from "@/lib/prisma";
import {
  LocalRecommendationProvider,
  MAJOR_CITIES,
  nextQuestion,
  rankSalons,
  specialtyLabel,
  timeLabelFromMinutes,
  type AssistantReply,
  type CustomerAssistantProvider,
  type RankableSalon,
} from "@/lib/discovery";
import { earliestFreeSlot, type BusySpan } from "@/lib/slots";
import { warsawTodayYmd } from "@/lib/calendar-utils";
import { warsawDayStartUtc, warsawDayEndUtc } from "@/lib/timezone";
import { publicDiscoveryWhere } from "@/lib/publication";
import { routeSearch } from "@/lib/ai/guard";
import { resolveLocale } from "@/lib/i18n/server";
import { getDictionary, interpolate } from "@/lib/i18n/dictionaries";
import { AppointmentStatus, DayOfWeek } from "@prisma/client";

const DOW: DayOfWeek[] = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];

/**
 * Provider boundary — today: LocalRecommendationProvider (deterministic
 * keyword interpretation over real DB vocabularies; nothing leaves the
 * server). A future LLM provider implements CustomerAssistantProvider and is
 * returned here; the chat UI, search and scoring pipeline stay unchanged.
 * No external AI service is called and no API key is required.
 */
async function getProvider(): Promise<CustomerAssistantProvider> {
  const cities = await prisma.business.findMany({
    where: publicDiscoveryWhere(),
    select: { city: true },
    distinct: ["city"],
    take: 200,
  });
  // DB cities first (they win stem matches), then the static majors so a city
  // without salons yet is still UNDERSTOOD (and answered honestly with the
  // no-results message rather than a redundant "which city?" question).
  const known = [...new Set([...cities.map((c) => c.city), ...MAJOR_CITIES])];
  return new LocalRecommendationProvider(known);
}

/** Warsaw "YYYY-MM-DD" for today + offset days. */
function warsawYmdPlus(offset: number): string {
  const base = new Date(warsawTodayYmd() + "T00:00:00Z");
  base.setUTCDate(base.getUTCDate() + offset);
  return base.toISOString().slice(0, 10);
}

/** Customer assistant — deterministic, real marketplace data only, max 5 results. */
export async function discoverSalons(userMessages: string[]): Promise<AssistantReply> {
  // Untrusted input: hard length/turn caps; content only ever reaches Prisma
  // as parametrized values derived from controlled vocabularies.
  // The search assistant answers in the selected TermCatch language (deterministic
  // copy from the dictionary — no LLM). Category terms still map to canonical
  // internal categories regardless of the query language.
  const locale = await resolveLocale();
  const s = getDictionary(locale).search;

  const clean = userMessages.map((m) => String(m).slice(0, 500)).slice(-8);
  if (clean.length === 0 || clean.every((m) => !m.trim())) {
    return { kind: "question", text: s.greeting };
  }

  // Domain guard: the search assistant only helps discover + book services in
  // TermCatch. Obviously off-domain requests (homework, trivia, general chat)
  // are refused and redirected — it never becomes a general-purpose assistant.
  const lastMsg = [...clean].reverse().find((m) => m.trim()) ?? "";
  const searchRoute = routeSearch(lastMsg, locale);
  if (searchRoute.action === "refuse") {
    return { kind: "question", text: searchRoute.reply };
  }

  const provider = await getProvider();
  const filters = provider.interpret(clean);

  const question = nextQuestion(filters, s);
  if (question) return { kind: "question", text: question };

  const businesses = await prisma.business.findMany({
    where: publicDiscoveryWhere({
      city: { equals: filters.cityQuery, mode: "insensitive" },
    }),
    select: {
      id: true,
      slug: true,
      name: true,
      city: true,
      logoUrl: true,
      description: true,
      averageRating: true,
      totalReviews: true,
      specialties: true,
      services: {
        where: { isActive: true },
        select: { id: true, name: true, description: true, price: true, discountedPrice: true, duration: true },
      },
      workingHours: { select: { dayOfWeek: true, isOpen: true, openTime: true, closeTime: true } },
    },
    take: 60,
  });

  // Real availability for the requested day — computed with the same slot
  // semantics as the booking availability API. Never guessed.
  const salons: RankableSalon[] = businesses.map((b) => ({ ...b, earliestSlotMin: undefined }));
  if (filters.dayOffset !== undefined && businesses.length > 0) {
    const dateYmd = warsawYmdPlus(filters.dayOffset);
    const dow = DOW[new Date(dateYmd + "T12:00:00Z").getUTCDay()];
    const dayStart = warsawDayStartUtc(dateYmd);
    const dayEnd = warsawDayEndUtc(dateYmd);

    const appts = await prisma.appointment.findMany({
      where: {
        businessId: { in: businesses.map((b) => b.id) },
        status: { notIn: [AppointmentStatus.CANCELLED_CUSTOMER, AppointmentStatus.CANCELLED_BUSINESS] },
        startTime: { gte: dayStart, lte: dayEnd },
      },
      select: { businessId: true, startTime: true, endTime: true },
    });
    const busyByBiz = new Map<string, BusySpan[]>();
    for (const a of appts) {
      const list = busyByBiz.get(a.businessId) ?? [];
      list.push({ startMs: a.startTime.getTime(), endMs: a.endTime.getTime() });
      busyByBiz.set(a.businessId, list);
    }

    const nowMs = Date.now();
    for (const s of salons) {
      const biz = businesses.find((b) => b.slug === s.slug)!;
      const wh = biz.workingHours.find((w) => w.dayOfWeek === dow);
      if (!wh || !wh.isOpen || biz.services.length === 0) {
        s.earliestSlotMin = null;
        continue;
      }
      // Probe duration: the shortest active service (booking granularity).
      const probe = Math.min(...biz.services.map((sv) => sv.duration));
      const slot = earliestFreeSlot({
        dateYmd,
        openTime: wh.openTime,
        closeTime: wh.closeTime,
        durationMin: probe,
        busy: busyByBiz.get(biz.id) ?? [],
        nowMs,
        afterMinutes: filters.afterMinutes,
      });
      s.earliestSlotMin = slot ? Number(slot.slice(0, 2)) * 60 + Number(slot.slice(3, 5)) : null;
    }
  }

  const results = rankSalons(salons, filters, 5);

  if (results.length === 0) {
    return { kind: "empty", text: s.noResults };
  }

  const whatLabel = filters.specialty ? specialtyLabel(filters.specialty) : filters.serviceQuery;
  const whatPart = whatLabel ? ` (${whatLabel})` : "";
  const timePart = filters.afterMinutes != null ? interpolate(s.afterTime, { time: timeLabelFromMinutes(filters.afterMinutes) }) : "";
  const vars = { city: filters.cityQuery ?? "", what: whatPart, time: timePart, n: results.length };
  const intro =
    results.length === 1 ? interpolate(s.foundOne, vars)
    : results.length === 2 ? interpolate(s.foundFew, vars)
    : interpolate(s.bestMatch, vars);

  return { kind: "results", intro, results };
}
