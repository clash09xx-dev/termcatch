// ─── Pure calendar helpers (client + server + tests) ─────────────────────────

/**
 * Day-view lane computation. Appointments booked with "Dowolny specjalista"
 * (employeeId = null) must always have a lane — when the salon has employees
 * and the day contains unassigned appointments, a trailing `null` lane
 * ("Bez przypisania") is added so they can never silently disappear.
 */
export function computeLanes<T extends { id: string }>(
  employees: T[],
  empFilter: string,
  hasUnassigned: boolean
): (T | null)[] {
  if (empFilter !== "all") {
    return [employees.find((e) => e.id === empFilter) ?? null];
  }
  if (employees.length === 0) return [null];
  return hasUnassigned ? [...employees, null] : [...employees];
}

/** Monday-first start of the week containing `date` (local midnight). */
export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday-first
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Current calendar day in Europe/Warsaw as "YYYY-MM-DD" (server-safe). */
export function warsawTodayYmd(now: Date = new Date()): string {
  return now.toLocaleDateString("en-CA", { timeZone: "Europe/Warsaw" });
}
