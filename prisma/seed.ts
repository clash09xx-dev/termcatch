import { PrismaClient, ServiceCategory, BusinessStatus, DayOfWeek } from "@prisma/client";

// ─── Disposable DEV / STAGING seed ───────────────────────────────────────────
// Creates one idempotent demo salon so a fresh staging DB has something to click
// through. NEVER meant for production — it publishes a fake ACTIVE salon.
//
// Hard guard: refuses to run unless ALLOW_SEED=true, so a stray `pnpm db:seed`
// (which would otherwise use whatever DATABASE_URL is configured) can't silently
// inject demo data. Run it deliberately against staging, e.g.:
//   set -a && . ./.env.staging && set +a && ALLOW_SEED=true pnpm db:seed

const prisma = new PrismaClient();

const WEEKDAYS: DayOfWeek[] = [
  DayOfWeek.MONDAY,
  DayOfWeek.TUESDAY,
  DayOfWeek.WEDNESDAY,
  DayOfWeek.THURSDAY,
  DayOfWeek.FRIDAY,
];

async function main() {
  if (process.env.ALLOW_SEED !== "true") {
    console.error(
      "Refusing to seed. This creates a public demo salon and must never run against production.\n" +
        "Re-run with ALLOW_SEED=true (dev/staging only)."
    );
    process.exit(1);
  }

  const slug = "demo-salon-krakow";
  const existing = await prisma.business.findUnique({ where: { slug }, select: { id: true } });
  if (existing) {
    console.log(`Demo salon already present (${slug}) — nothing to do.`);
    return;
  }

  const owner = await prisma.user.upsert({
    where: { email: "demo-owner@termcatch.local" },
    update: {},
    create: {
      supabaseId: "demo-owner-seed",
      email: "demo-owner@termcatch.local",
      firstName: "Demo",
      lastName: "Owner",
      role: "BUSINESS_OWNER",
    },
  });

  const biz = await prisma.business.create({
    data: {
      ownerId: owner.id,
      slug,
      name: "Demo Salon (staging)",
      category: ServiceCategory.HAIR_SALON,
      status: BusinessStatus.ACTIVE,
      isActive: true,
      address: "ul. Demonstracyjna 1",
      city: "Kraków",
      postalCode: "30-001",
      phone: "+48500100200",
      email: "demo-owner@termcatch.local",
      services: {
        create: [
          { name: "Strzyżenie damskie", duration: 45, price: 90, isActive: true, displayOrder: 0 },
          { name: "Koloryzacja", duration: 120, price: 260, isActive: true, displayOrder: 1 },
        ],
      },
      employees: {
        create: { firstName: "Demo", lastName: "Specjalista", isActive: true, isAccepting: true, displayOrder: 0 },
      },
      workingHours: {
        create: WEEKDAYS.map((dayOfWeek) => ({ dayOfWeek, isOpen: true, openTime: "09:00", closeTime: "18:00" })),
      },
    },
  });

  console.log(`Seeded demo salon "${biz.name}" (${biz.slug}) — ACTIVE/public. Owner: ${owner.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
