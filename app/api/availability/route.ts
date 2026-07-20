import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getBusinessDaySlots } from "@/lib/availability";

// Public booking-wizard availability. Delegates to the shared availability
// engine (lib/availability) so the wizard and the search "available today"
// filter compute slots with identical rules and can never disagree.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const businessId = searchParams.get("businessId");
  const serviceId = searchParams.get("serviceId");
  const date = searchParams.get("date"); // YYYY-MM-DD
  const employeeId = searchParams.get("employeeId") ?? undefined;

  if (!businessId || !serviceId || !date) {
    return NextResponse.json(
      { error: "businessId, serviceId, and date are required" },
      { status: 400 }
    );
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
  }

  const service = await prisma.service.findUnique({
    where: { id: serviceId },
    select: { duration: true, businessId: true },
  });
  if (!service || service.businessId !== businessId) {
    return NextResponse.json({ error: "Service not found" }, { status: 404 });
  }

  // Add-on duration must be reserved so a slot fits base service + selected
  // add-ons. Format: ?addons=addonId:qty,addonId:qty. Durations come from the DB
  // (never the client); only add-ons actually assigned to this service + active
  // count. The booking action does the authoritative throw-on-invalid check.
  let addonsDuration = 0;
  const addonsParam = searchParams.get("addons");
  if (addonsParam) {
    const sels = addonsParam
      .split(",")
      .map((p) => {
        const [id, q] = p.split(":");
        return { id: id?.trim(), qty: Math.max(1, parseInt(q ?? "1", 10) || 1) };
      })
      .filter((s) => s.id);
    if (sels.length > 0) {
      const ids = [...new Set(sels.map((s) => s.id))];
      const addons = await prisma.serviceAddon.findMany({
        where: { businessId, id: { in: ids }, isActive: true, services: { some: { id: serviceId } } },
        select: { id: true, durationIncrease: true, hasQuantity: true, minQuantity: true, maxQuantity: true },
      });
      const byId = new Map(addons.map((a) => [a.id, a]));
      for (const s of sels) {
        const a = byId.get(s.id);
        if (!a) continue;
        const qty = a.hasQuantity ? Math.min(a.maxQuantity, Math.max(a.minQuantity, s.qty)) : 1;
        addonsDuration += a.durationIncrease * qty;
      }
    }
  }

  const { slots } = await getBusinessDaySlots({
    businessId,
    serviceDurationMin: service.duration + addonsDuration,
    dateYmd: date,
    employeeId,
  });

  return NextResponse.json({ slots });
}
