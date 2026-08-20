import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { pl } from "../lib/i18n/dictionaries/pl";
import { en } from "../lib/i18n/dictionaries/en";
import { de } from "../lib/i18n/dictionaries/de";
import { tr } from "../lib/i18n/dictionaries/tr";

/**
 * The bug: the specialist panel's sidebar translated, its PAGES did not. Set the
 * selector to English and you still read "Moje wizyty", "NADCHODZĄCE", "Brak
 * nadchodzących wizyt".
 *
 * ROOT CAUSE — not a locale-propagation failure, which is what it looked like.
 * `getServerI18n()` was already called on those pages and `dict.statuses[...]`
 * already worked. The page CHROME was simply never wired: literal Polish strings
 * passed straight into <PageHeader>, <CardHeader> and <EmptyState>. The locale
 * system was fine; five pages just bypassed it.
 *
 * These tests pin the wiring, so a new hardcoded title fails the suite instead
 * of shipping a half-translated panel.
 */

const DICTS = { pl, en, de, tr };
const PAGES = [
  "app/employee/(employee-layout)/dashboard/page.tsx",
  "app/employee/(employee-layout)/calendar/page.tsx",
  "app/employee/(employee-layout)/appointments/page.tsx",
  "app/employee/(employee-layout)/ai/page.tsx",
  "app/employee/(employee-layout)/profile/page.tsx",
];
const read = (p: string) => readFileSync(p, "utf8");

/** Source with comments stripped — the files DOCUMENT the strings they removed. */
const code = (p: string) =>
  read(p).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "").replace(/\s\/\/.*$/gm, "");

describe("specialist panel: no page bypasses the dictionary", () => {
  test("every page resolves the locale server-side", () => {
    for (const f of PAGES) {
      assert.ok(read(f).includes("getServerI18n()"), `${f} must resolve i18n on the server`);
    }
  });

  test("the exact strings from the bug report are gone from the source", () => {
    const reported = [
      "Moje wizyty", "Wszystkie Twoje rezerwacje", "Nadchodzące",
      "Brak nadchodzących wizyt", "Nowe rezerwacje pojawią się tutaj.",
    ];
    for (const f of PAGES) {
      const src = code(f);
      for (const s of reported) {
        assert.ok(!src.includes(`"${s}"`), `${f} still hardcodes "${s}"`);
      }
    }
  });

  test("no Polish user-facing literal survives in any specialist page", () => {
    // Polish-specific letters in a double-quoted literal are the tell. Technical
    // identifiers and enum values are ASCII, so they cannot trip this.
    for (const f of PAGES) {
      for (const m of code(f).matchAll(/"([^"\\]*[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ][^"\\]*)"/g)) {
        assert.fail(`${f} still contains Polish copy: "${m[1]}"`);
      }
    }
  });

  test("dates follow the viewer's locale, never a pinned one", () => {
    for (const f of PAGES) {
      const src = code(f);
      assert.ok(!src.includes('toLocaleDateString("pl-PL"'), `${f} pins Polish date formatting`);
      assert.ok(!src.includes('toLocaleTimeString("pl-PL"'), `${f} pins Polish time formatting`);
    }
    // The one en-US left is a KEY, not copy: it yields "MONDAY" for the Prisma
    // DayOfWeek enum. Localizing it would break the working-hours lookup, so it
    // is pinned here WITH its explanation to stop a future sweep "fixing" it.
    const dash = read(PAGES[0]);
    assert.ok(dash.includes('new Intl.DateTimeFormat("en-US"'), "the DayOfWeek key formatter must stay en-US");
    assert.ok(dash.includes("must NOT be localized"), "and must document why");
  });

  test("weekday names are reused from the shared dictionary, not duplicated", () => {
    const prof = code(PAGES[4]);
    assert.ok(prof.includes("dict.weekdays.full"), "the profile must reuse the shared weekday names");
    assert.ok(!prof.includes("DAY_PL"), "the duplicated Polish weekday map must be gone");
    // DAY_ORDER stays: it fixes Mon..Sun render order, which an object cannot.
    assert.ok(prof.includes("DAY_ORDER"), "render order must still be explicit");
  });
});

describe("every specialist key exists, and is really translated", () => {
  const KEYS = [
    "panel", "today", "calendar", "myAppointments", "aiAssistant", "myProfile",
    "nextAppointment", "todaySchedule", "tomorrow", "freeSlotsToday", "workingHoursToday",
    "viewingAs", "endPreview", "logout",
    "greeting", "noNextAppointment", "noNextAppointmentBody", "free",
    "noToday", "noTodayBody", "noTomorrow", "myAppointmentsSubtitle",
    "upcoming", "noUpcoming", "noUpcomingBody", "recent", "yourSchedule",
    "prevDay", "nextDay", "noAppointmentsDay", "noAppointmentsDayBody",
    "myWorkingHours", "profileManagedByOwner", "aiSubtitle",
  ] as const;

  test("PL / EN / DE / TR all define every key, non-empty", () => {
    for (const [loc, d] of Object.entries(DICTS)) {
      for (const k of KEYS) {
        const v = (d.employee as Record<string, unknown>)[k];
        assert.equal(typeof v, "string", `${loc}.employee.${k} is missing`);
        assert.ok((v as string).trim().length > 0, `${loc}.employee.${k} is empty`);
      }
    }
  });

  test("the AI prompts are localized as a real list in all four", () => {
    for (const [loc, d] of Object.entries(DICTS)) {
      const s = d.employee.aiSuggestions;
      assert.ok(Array.isArray(s), `${loc} aiSuggestions must be a list`);
      assert.equal(s.length, 5, `${loc} must offer 5 prompts`);
      for (const q of s) assert.ok(q.trim().length > 5, `${loc} has an empty prompt`);
    }
  });

  test("EN/DE/TR are not copies of the Polish (catches untranslated paste)", () => {
    // Every key that carries real prose must differ from Polish in each locale.
    const PROSE = [
      "greeting", "noNextAppointment", "noNextAppointmentBody", "noToday", "noTodayBody",
      "noTomorrow", "myAppointmentsSubtitle", "upcoming", "noUpcoming", "noUpcomingBody",
      "recent", "yourSchedule", "noAppointmentsDay", "noAppointmentsDayBody",
      "myWorkingHours", "profileManagedByOwner", "aiSubtitle", "myAppointments",
    ] as const;
    for (const loc of ["en", "de", "tr"] as const) {
      for (const k of PROSE) {
        assert.notEqual(
          DICTS[loc].employee[k], pl.employee[k],
          `${loc}.employee.${k} is still the Polish string`
        );
      }
      for (let i = 0; i < 5; i++) {
        assert.notEqual(
          DICTS[loc].employee.aiSuggestions[i], pl.employee.aiSuggestions[i],
          `${loc} AI prompt ${i} is still Polish`
        );
      }
    }
  });

  test("the placeholder in the greeting survives translation", () => {
    for (const [loc, d] of Object.entries(DICTS)) {
      assert.ok(d.employee.greeting.includes("{name}"), `${loc} greeting lost its {name} placeholder`);
    }
  });
});
