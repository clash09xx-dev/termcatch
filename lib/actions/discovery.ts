"use server";

import { prisma } from "@/lib/prisma";
import {
  DeterministicInterpreter,
  nextQuestion,
  rankSalons,
  specialtyLabel,
  type AssistantReply,
  type DiscoveryInterpreter,
} from "@/lib/discovery";

/**
 * Provider seam — today: deterministic keyword interpreter over real DB
 * vocabularies. A future LLM provider implements DiscoveryInterpreter and is
 * returned here (server-only; no key ever reaches the browser). The UI and
 * search pipeline stay unchanged.
 */
async function getInterpreter(): Promise<DiscoveryInterpreter> {
  const cities = await prisma.business.findMany({
    where: { status: "ACTIVE", isActive: true },
    select: { city: true },
    distinct: ["city"],
    take: 200,
  });
  return new DeterministicInterpreter(cities.map((c) => c.city));
}

/** Customer discovery assistant — deterministic, real data only, max 5 results. */
export async function discoverSalons(userMessages: string[]): Promise<AssistantReply> {
  const clean = userMessages.map((m) => String(m).slice(0, 500)).slice(-8);
  if (clean.length === 0 || clean.every((m) => !m.trim())) {
    return { kind: "question", text: "Powiedz, czego szukasz — np. „dobry salon w Krakowie od koloryzacji”." };
  }

  const interpreter = await getInterpreter();
  const filters = interpreter.interpret(clean);

  const question = nextQuestion(filters);
  if (question) return { kind: "question", text: question };

  const salons = await prisma.business.findMany({
    where: {
      status: "ACTIVE",
      isActive: true,
      city: { equals: filters.cityQuery, mode: "insensitive" },
    },
    select: {
      slug: true,
      name: true,
      city: true,
      logoUrl: true,
      averageRating: true,
      totalReviews: true,
      specialties: true,
      services: { where: { isActive: true }, select: { name: true, price: true, discountedPrice: true } },
    },
    take: 60,
  });

  const results = rankSalons(salons, filters, 5);

  if (results.length === 0) {
    const what = filters.specialty ? specialtyLabel(filters.specialty) : filters.serviceQuery ?? "tej usługi";
    return {
      kind: "empty",
      text: `Nie znaleźliśmy jeszcze w ${filters.cityQuery} salonów pasujących do „${what}”. Baza TermCatch stale rośnie — spróbuj szerszego zapytania lub przeglądaj wszystkie salony poniżej.`,
    };
  }

  const intro =
    results.length < 3
      ? `Znaleźliśmy ${results.length === 1 ? "1 pasujący salon" : `${results.length} pasujące salony`} w ${filters.cityQuery} — baza wciąż rośnie:`
      : `Najlepsze dopasowania w ${filters.cityQuery}:`;

  return { kind: "results", intro, results };
}
