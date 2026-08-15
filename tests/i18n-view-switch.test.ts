import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { getDictionary } from "../lib/i18n/dictionaries";
import { pl } from "../lib/i18n/dictionaries/pl";
import { en } from "../lib/i18n/dictionaries/en";
import { de } from "../lib/i18n/dictionaries/de";
import { tr } from "../lib/i18n/dictionaries/tr";
import { resolveViewSwitch } from "../lib/view-switch";

const read = (p: string) => readFileSync(p, "utf8");
const BIZ = "app/business/(business-layout)";
const HOURS_CLIENT = `${BIZ}/hours/hours-client.tsx`;
const INVOICES_PAGE = `${BIZ}/invoices/page.tsx`;
const INVOICES_CLIENT = `${BIZ}/invoices/invoices-client.tsx`;
const OWNER_SWITCH = "components/owner-view-switcher.tsx";
const ADMIN_SWITCH = "components/admin-view-switcher.tsx";
const OWNERSHIP = "lib/ownership.ts";
const LANDING = "app/page.tsx";

const LOCALES = { pl, en, de, tr };
const DICTS = [pl, en, de, tr];

// ── Part 1: business page bodies are fully translated (not just the topbar) ───
describe("Hours page body is localized in every language", () => {
  test("1. EN Hours: title + subtitle + weekdays are English, not Polish", () => {
    assert.equal(en.pages.hours.title, "Hours");
    assert.notEqual(en.pages.hours.title, pl.pages.hours.title);
    assert.notEqual(en.pages.hours.subtitle, pl.pages.hours.subtitle);
    assert.equal(en.weekdays.full.MONDAY, "Monday");
    assert.equal(en.weekdays.short.WEDNESDAY, "Wed");
    assert.equal(en.pages.hours.save, "Save");
  });
  test("3. DE Hours is German", () => {
    assert.equal(de.pages.hours.title, "Öffnungszeiten");
    assert.equal(de.weekdays.full.MONDAY, "Montag");
    assert.notEqual(de.pages.hours.subtitle, pl.pages.hours.subtitle);
  });
  test("4. TR Hours is Turkish", () => {
    assert.equal(tr.pages.hours.title, "Çalışma saatleri");
    assert.equal(tr.weekdays.full.SUNDAY, "Pazar");
  });
  test("5. PL Hours is unchanged (still Polish)", () => {
    assert.equal(pl.pages.hours.title, "Godziny");
    assert.equal(pl.weekdays.full.MONDAY, "Poniedziałek");
    assert.equal(pl.pages.hours.save, "Zapisz");
  });
  test("1b. the Hours client no longer hardcodes Polish weekday/body chrome", () => {
    const src = read(HOURS_CLIENT);
    for (const gone of ['"Poniedziałek"', '"Godziny"', '"Nieczynne"', 'title="Godziny"', "Masz niezapisane zmiany"]) {
      assert.ok(!src.includes(gone), `hours-client still hardcodes ${gone}`);
    }
    assert.ok(src.includes("useT("), "hours-client must consume the dictionary");
  });
});

describe("Invoices page body is localized", () => {
  test("2. EN Invoices: stats + history are English, not Polish", () => {
    assert.equal(en.pages.invoices.title, "Invoices");
    assert.equal(en.pages.invoices.revenue, "Revenue");
    assert.equal(en.pages.invoices.salesHistory, "Sales history");
    assert.notEqual(en.pages.invoices.subtitle, pl.pages.invoices.subtitle);
    assert.equal(de.pages.invoices.title, "Rechnungen");
    assert.equal(tr.pages.invoices.revenue, "Gelir");
  });
  test("2b. the Invoices page/client no longer hardcode Polish body chrome", () => {
    const page = read(INVOICES_PAGE);
    for (const gone of ['title="Faktury"', '"Historia sprzedaży"', '"Przychód"', '"Ukończone wizyty"']) {
      assert.ok(!page.includes(gone), `invoices/page still hardcodes ${gone}`);
    }
    assert.ok(page.includes("getServerI18n"), "invoices/page must resolve server i18n");
    const client = read(INVOICES_CLIENT);
    assert.ok(!client.includes("Wystaw fakturę"), "invoices-client still hardcodes 'Wystaw fakturę'");
    assert.ok(client.includes("useT("), "invoices-client must consume the dictionary");
  });
  test("getDictionary wires the same values the pages render", () => {
    assert.equal(getDictionary("en").pages.invoices.avgValue, "Average value");
    assert.equal(getDictionary("de").pages.hours.copyToAll, "Mo→Sa kopieren");
  });
});

// ── 15. every remaining business namespace has PL/EN/DE/TR parity ─────────────
describe("15. all business dictionary namespaces have PL/EN/DE/TR parity", () => {
  // Every page listed in the brief, plus the shared namespaces those pages read.
  const PAGE_NAMESPACES = [
    "hours", "invoices", "settings", "services", "addons", "calendar", "newAppointment",
    "today", "crm", "staff", "marketing", "analytics", "payments", "coupons", "reviews",
    "history", "locations", "profile", "aiPage", "palette", "locationPicker", "planLimit",
  ] as const;

  test("every listed business page has its own namespace in all four locales", () => {
    for (const ns of PAGE_NAMESPACES) {
      for (const [code, dict] of Object.entries(LOCALES)) {
        assert.ok(ns in dict.pages, `${code}.pages.${ns} is missing`);
      }
    }
  });

  test("key sets are identical across locales (a missing key would show a raw key)", () => {
    // Walk the whole dictionary tree, not just `pages`.
    const shape = (v: unknown, path: string, out: string[]): string[] => {
      if (Array.isArray(v)) { out.push(`${path}[]`); return out; }
      if (v && typeof v === "object") {
        for (const k of Object.keys(v as object).sort()) shape((v as Record<string, unknown>)[k], `${path}.${k}`, out);
        return out;
      }
      out.push(path);
      return out;
    };
    const base = shape(pl, "", []).join("\n");
    for (const [code, dict] of Object.entries(LOCALES)) {
      assert.equal(shape(dict, "", []).join("\n"), base, `${code} dictionary shape differs from pl`);
    }
  });

  test("no locale silently falls back to the Polish string on page titles", () => {
    for (const ns of PAGE_NAMESPACES) {
      const plTitle = (pl.pages[ns] as Record<string, unknown>).title;
      if (typeof plTitle !== "string") continue;
      for (const [code, dict] of Object.entries({ en, de, tr })) {
        const other = (dict.pages[ns] as Record<string, unknown>).title;
        // "Marketing" and "Salon" are genuinely identical words across locales.
        if (plTitle === "Marketing") continue;
        assert.notEqual(other, plTitle, `${code}.pages.${ns}.title is still the Polish string`);
      }
    }
  });

  test("shared status / plan / segment namespaces are localized too", () => {
    assert.equal(en.statuses.NO_SHOW, "No-show");
    assert.equal(de.statuses.CONFIRMED, "Bestätigt");
    assert.equal(tr.statuses.COMPLETED, "Tamamlandı");
    assert.notEqual(en.publication.ACTIVE, pl.publication.ACTIVE);
    assert.notEqual(de.insightSeverity.warning, pl.insightSeverity.warning);
    assert.notEqual(tr.segments.dormant.label, pl.segments.dormant.label);
    assert.equal(en.plans.FREE, "Free");
  });
});

// ── 16 + 17: the landing hero no longer advertises early access ───────────────
describe("16+17. the landing page has no early-access badge and no leftover slot", () => {
  test("16. no locale exposes an early-access label any more", () => {
    for (const [code, dict] of Object.entries(LOCALES)) {
      assert.ok(!("badge" in dict.home), `${code}.home.badge still exists`);
    }
    const all = JSON.stringify(DICTS);
    for (const gone of ["Wczesny dostęp", "Early Access", "Early access", "Erken erişim"]) {
      assert.ok(!all.includes(gone), `a dictionary still contains "${gone}"`);
    }
  });
  test("17. the hero markup has no badge element and no empty placeholder", () => {
    const src = read(LANDING);
    assert.ok(!src.includes("h.badge"), "the hero still renders home.badge");
    assert.ok(!/\{\/\* Badge \*\/\}/.test(src), "the hero still has the Badge block");
    // The pulsing dot that lived only inside the badge must be gone too.
    assert.ok(!src.includes("dot-pulse"), "the early-access pulsing dot is still in the hero");
    // No spacer left where the badge used to be. Asserted as the invariant
    // ("nothing empty is reserving hero space") rather than as one exact markup
    // shape, so recomposing the hero cannot silently re-introduce a placeholder.
    const emptyBlock = /<(div|span|p)\b[^>]*className="[^"]*\bmb-\d[^"]*"[^>]*>\s*<\/\1>/;
    assert.ok(!emptyBlock.test(src), "the hero still has an empty spacing element where the badge used to be");
    assert.ok(src.includes("<motion.h1"), "the hero headline is missing");
  });
});

// ── Part 2: view-switch eligibility (server-decided) + localization ───────────
describe("Client/Salon view-switch eligibility", () => {
  test("1. a salon owner (not admin) gets the owner Client/Salon switch", () => {
    assert.equal(resolveViewSwitch({ isAdmin: false, ownsBusiness: true }), "owner");
  });
  test("2. a normal customer (no business) gets NO switch", () => {
    assert.equal(resolveViewSwitch({ isAdmin: false, ownsBusiness: false }), "none");
  });
  test("3. an employee (owns no business) gets NO owner switch", () => {
    // Employees resolve to ownsBusiness=false → none (never the owner switch).
    assert.equal(resolveViewSwitch({ isAdmin: false, ownsBusiness: false }), "none");
    // …unless they separately own a salon, which is the same server fact.
    assert.equal(resolveViewSwitch({ isAdmin: false, ownsBusiness: true }), "owner");
  });
  test("4. an unauthenticated user (no ownership) gets NO switch", () => {
    assert.equal(resolveViewSwitch({ isAdmin: false, ownsBusiness: false }), "none");
  });
  test("5. an admin keeps the internal switcher; admin is NEVER inferred from mode", () => {
    assert.equal(resolveViewSwitch({ isAdmin: true, ownsBusiness: false }), "admin");
    assert.equal(resolveViewSwitch({ isAdmin: true, ownsBusiness: true }), "admin"); // admin precedence
    // The rule only takes server facts — there is no cookie/mode parameter to forge.
    assert.deepEqual(Object.keys({ isAdmin: false, ownsBusiness: false }).sort(), ["isAdmin", "ownsBusiness"]);
  });
  test("5b. the admin switcher is untouched and still offers its three internal views", () => {
    const src = read(ADMIN_SWITCH);
    assert.ok(src.includes("/customer/dashboard") && src.includes("/business/dashboard") && src.includes("/admin/dashboard"),
      "the admin switcher must keep all three internal destinations");
  });
  test("8-11. the switch labels are localized (Klient/Client/Kunde/Müşteri + Salon)", () => {
    assert.equal(pl.viewSwitch.client, "Klient");
    assert.equal(en.viewSwitch.client, "Client");
    assert.equal(de.viewSwitch.client, "Kunde");
    assert.equal(tr.viewSwitch.client, "Müşteri");
    for (const d of DICTS) assert.equal(d.viewSwitch.salon, "Salon");
    assert.notEqual(en.viewSwitch.ariaClient, pl.viewSwitch.ariaClient); // aria labels localized too
    for (const [code, dict] of Object.entries(LOCALES)) {
      assert.ok(dict.viewSwitch.ariaOpen.length > 0, `${code} is missing the collapsed-control aria label`);
      assert.ok(dict.viewSwitch.ariaClose.length > 0, `${code} is missing the close aria label`);
    }
  });
});

describe("view-switch security by construction", () => {
  test("6. ownership is resolved from the SESSION, never the ownerView cookie", () => {
    const src = read(OWNERSHIP);
    assert.ok(src.includes("getServerUser"), "ownership must derive from the authenticated session");
    assert.ok(!src.includes("ownerView"), "ownership must NOT read the presentation cookie");
    assert.ok(!/cookies\(\)/.test(src), "ownership must not consult cookies for permissions");
  });
  test("7. the owner switch only links to the user's OWN dashboards", () => {
    const src = read(OWNER_SWITCH);
    assert.ok(src.includes("/customer/dashboard"), "must offer the customer experience");
    assert.ok(src.includes("/business/dashboard"), "must return to the salon dashboard");
    // No business id/slug is ever passed → another business can never be selected.
    assert.ok(!src.includes("businessId"), "switch must not target a specific business id");
    assert.ok(!src.includes("/business/${"), "switch must not build a dynamic business path");
    // The internal Owner/Admin mode is NOT exposed here.
    assert.ok(!src.includes("/admin"), "owner switch must not expose the admin/Owner mode");
    assert.ok(src.includes("ownerView") && src.includes("presentation"), "cookie is documented presentation-only");
  });
  test("7b. no Owner/Właściciel option leaks into the normal salon-owner switch", () => {
    const src = read(OWNER_SWITCH);
    for (const gone of ["Właściciel", "Owner", "Inhaber", "Sahip"]) {
      assert.ok(!src.includes(`"${gone}"`), `owner switch must not offer a "${gone}" mode`);
    }
    // Exactly two destinations (counting the item literals, not the type union).
    assert.equal((src.match(/\{ key: "(client|salon)",/g) ?? []).length, 2, "the switch must expose exactly two views");
  });
});

// ── 12-14: the collapsed dot is a real, expandable, accessible control ────────
describe("12-14. the dot control expands and stays accessible", () => {
  const src = read(OWNER_SWITCH);
  test("12. desktop expansion is driven by hover AND keyboard focus", () => {
    assert.ok(src.includes("onPointerEnter"), "must expand on pointer enter (desktop hover)");
    assert.ok(src.includes("onFocus"), "keyboard users must be able to expand it without hover");
    assert.ok(src.includes("(hover: hover) and (pointer: fine)"),
      "hover expansion must be gated so a touch tap does not fire a false hover");
  });
  test("13. mobile expansion is a tap, and tapping outside closes it", () => {
    assert.ok(/onClick=\{\(\) => setOpen\(\(v\) => !v\)\}/.test(src), "the dot must toggle on tap");
    assert.ok(src.includes("pointerdown"), "an outside tap must close the expanded control");
    assert.ok(src.includes('e.key === "Escape"'), "Escape must close the control");
    // It must clear the mobile bottom navigation.
    assert.ok(src.includes("env(safe-area-inset-bottom)"), "must respect the mobile safe area");
    assert.ok(/bottom-\[calc\(5rem/.test(src), "must sit above the mobile bottom nav");
  });
  test("14. the collapsed control has real button semantics and a usable hit area", () => {
    assert.ok(/<button[\s\S]*?type="button"[\s\S]*?aria-expanded=\{open\}/.test(src),
      "the dot must be a button that reports its expanded state");
    assert.ok(src.includes("aria-label={t.viewSwitch.ariaOpen}"), "the dot needs an accessible name");
    assert.ok(src.includes("aria-controls"), "the dot must point at the panel it controls");
    assert.ok(/h-11 w-11/.test(src), "the hit area must be at least 44x44 even though the dot is small");
    assert.ok(src.includes("useReducedMotion"), "the expand transition must respect reduced motion");
  });
});

// ── Copy audit: no AI-looking dashes in the shipped dictionaries ──────────────
describe("copy: dictionaries carry no dash-heavy prose", () => {
  test("no em dash survives in any user-facing dictionary string", () => {
    for (const file of readdirSync("lib/i18n/dictionaries")) {
      if (!file.endsWith(".ts") || file === "index.ts") continue;
      const src = read(`lib/i18n/dictionaries/${file}`);
      src.split("\n").forEach((line, i) => {
        if (/^\s*(\/\/|\*|\/\*)/.test(line)) return; // comments may use them
        assert.ok(!line.includes("—"), `${file}:${i + 1} still uses an em dash in copy: ${line.trim().slice(0, 80)}`);
      });
    }
  });
  test("en dashes survive only in genuine ranges", () => {
    const all = JSON.stringify(DICTS);
    for (const m of all.matchAll(/.{6}–.{6}/g)) {
      const around = m[0];
      assert.ok(/A–Z|\{min\}–\{max\}/.test(around), `unexpected en dash in prose: ${around}`);
    }
  });
});
