import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

// Static guard: forbidden marketing/pricing/brand phrases must not reappear in
// public source. Scans app/ + components/ .ts(x) (excludes tests, backups, .next).
const ROOTS = ["app", "components", "lib"];
const FORBIDDEN: { needle: string; why: string }[] = [
  { needle: "0% prowizji", why: "commission is 20% of the first visit, not 0%" },
  { needle: "Plan Starter", why: "no 'Starter' plan (Solo/Zespół/Salon Pro/Ultimate)" },
  { needle: "bezpłatnie na zawsze", why: "paid plans are not permanently free" },
  { needle: "14 dni za darmo", why: "the standard trial is now 7 days" },
  { needle: "14-dniowy okres", why: "the standard trial is now 7 days" },
  { needle: "Zero no-show", why: "unsupported absolute claim" },
  { needle: "Termcatch", why: "brand is 'TermCatch'" },
  { needle: "Odpiszemy w ciągu godziny", why: "unsupported response-time promise" },
  { needle: "w ciągu kilku godzin", why: "unsupported response-time promise" },
  { needle: "bookują", why: "use 'rezerwują' (Polish)" },
];

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next" || entry.startsWith("_backup")) continue;
    const full = join(dir, entry);
    const s = statSync(full);
    if (s.isDirectory()) out.push(...walk(full));
    else if (/\.(ts|tsx)$/.test(entry)) out.push(full);
  }
  return out;
}

describe("public copy consistency — no fabricated/outdated phrases", () => {
  const files = ROOTS.flatMap((r) => {
    try {
      return walk(r);
    } catch {
      return [];
    }
  });

  for (const { needle, why } of FORBIDDEN) {
    test(`no "${needle}" (${why})`, () => {
      const hits = files.filter((f) => readFileSync(f, "utf8").includes(needle));
      assert.equal(hits.length, 0, `Found "${needle}" in:\n${hits.join("\n")}`);
    });
  }

  test("the 7-day trial ('7 dni') is present on the pricing page", () => {
    const pricing = files.find((f) => f.endsWith("app/pricing/page.tsx"));
    assert.ok(pricing, "pricing page not found");
    assert.ok(readFileSync(pricing!, "utf8").includes("7 dni"), "expected '7 dni' trial copy on pricing");
  });
});
