/**
 * Deterministic, rerunnable multi-location backfill (Wave 4).
 *
 * Seeds ONE primary Location per business from that business's own address and
 * links every active employee + active service to it, so existing single-
 * location salons become valid multi-location tenants with zero behaviour
 * change. Running it twice is a no-op (idempotent): the primary location is
 * matched by `isPrimary`, and join rows use skipDuplicates.
 *
 * SAFETY:
 *   - DRY-RUN by default. Nothing is written unless you pass `--commit`.
 *   - Requires the multi-location tables to already exist (`prisma db push`).
 *   - This script is NOT run automatically. Rollout is a manual, deliberate
 *     step: db push → this script (--commit) → set MULTI_LOCATION_ENABLED=true.
 *
 * Usage:
 *   npx tsx scripts/backfill-locations.ts            # dry run (default)
 *   npx tsx scripts/backfill-locations.ts --commit   # actually write
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const COMMIT = process.argv.includes("--commit");

async function main() {
  const businesses = await prisma.business.findMany({
    select: {
      id: true,
      name: true,
      address: true,
      city: true,
      postalCode: true,
      phone: true,
      latitude: true,
      longitude: true,
    },
    orderBy: { createdAt: "asc" },
  });

  console.log(`${COMMIT ? "COMMIT" : "DRY-RUN"} — ${businesses.length} business(es)\n`);

  let created = 0;
  let empLinks = 0;
  let svcLinks = 0;

  for (const b of businesses) {
    // Idempotent: one primary location per business, matched by isPrimary.
    let primary = await prisma.location.findFirst({
      where: { businessId: b.id, isPrimary: true },
      select: { id: true },
    });

    if (!primary) {
      created++;
      if (COMMIT) {
        primary = await prisma.location.create({
          data: {
            businessId: b.id,
            name: b.name,
            addressLine: b.address,
            city: b.city,
            postalCode: b.postalCode,
            phone: b.phone,
            latitude: b.latitude,
            longitude: b.longitude,
            isPrimary: true,
            isActive: true,
            displayOrder: 0,
          },
          select: { id: true },
        });
      }
    }

    // In dry-run with no primary yet, we cannot create join rows — just report.
    if (!primary) {
      console.log(`  • ${b.name}: would create primary location + link staff/services`);
      continue;
    }

    const [employees, services] = await Promise.all([
      prisma.employee.findMany({ where: { businessId: b.id, isActive: true }, select: { id: true } }),
      prisma.service.findMany({ where: { businessId: b.id, isActive: true }, select: { id: true } }),
    ]);

    if (COMMIT) {
      const e = await prisma.employeeLocation.createMany({
        data: employees.map((emp) => ({ employeeId: emp.id, locationId: primary!.id })),
        skipDuplicates: true,
      });
      const s = await prisma.locationService.createMany({
        data: services.map((svc) => ({ locationId: primary!.id, serviceId: svc.id })),
        skipDuplicates: true,
      });
      empLinks += e.count;
      svcLinks += s.count;
    } else {
      empLinks += employees.length;
      svcLinks += services.length;
    }
  }

  console.log(
    `\n${COMMIT ? "Wrote" : "Would write"}: ${created} primary location(s), ` +
      `${empLinks} staff link(s), ${svcLinks} service link(s).`
  );
  if (!COMMIT) console.log("\nDry run — no changes made. Re-run with --commit to apply.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
