import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseBlocks, parseInline } from "../lib/ai/markdown-parse";
import { prisma } from "../lib/prisma";
import { getConnectionStatus, hasConnection, resolveCredentials } from "../lib/fakturownia/connection";

// ── #7 AI markdown rendering ─────────────────────────────────────────────────
describe("AI assistant markdown parsing", () => {
  test("1. **bold**, *italic*, `code` become typed inline tokens (not raw text)", () => {
    const t = parseInline("Revenue is **up 12%** and _steady_ with `avg=80`.");
    assert.ok(t.some((x) => x.type === "bold" && x.value === "up 12%"));
    assert.ok(t.some((x) => x.type === "italic" && x.value === "steady"));
    assert.ok(t.some((x) => x.type === "code" && x.value === "avg=80"));
    // the literal asterisks must NOT survive as text
    assert.ok(!t.some((x) => x.type === "text" && x.value.includes("**")));
  });
  test("2. __bold__ also supported", () => {
    assert.deepEqual(parseInline("__hi__"), [{ type: "bold", value: "hi" }]);
  });
  test("3. bullet + numbered lists parse into list blocks", () => {
    const b = parseBlocks("Podsumowanie:\n- pierwszy\n- drugi\n\n1. krok\n2. krok");
    assert.equal(b[0].type, "p");
    assert.equal(b[1].type, "ul");
    assert.equal(b[2].type, "ol");
    if (b[1].type === "ul") assert.equal(b[1].items.length, 2);
    if (b[2].type === "ol") assert.equal(b[2].items.length, 2);
  });
  test("4. multi-line paragraph keeps line structure; blank lines split blocks", () => {
    const b = parseBlocks("line one\nline two\n\nnext para");
    assert.equal(b.length, 2);
    if (b[0].type === "p") assert.equal(b[0].lines.length, 2);
  });
  test("5. plain text passes through unchanged", () => {
    assert.deepEqual(parseInline("just text"), [{ type: "text", value: "just text" }]);
  });
});

// ── #9 WELCOME20 is not a prefilled/demo coupon ──────────────────────────────
describe("WELCOME20 demo coupon removed", () => {
  const files = [
    "app/business/(business-layout)/coupons/coupons-client.tsx",
    "app/b/[slug]/book/booking-wizard.tsx",
  ];
  test("6. WELCOME20 no longer appears in the coupon UI (placeholder or value)", () => {
    for (const f of files) {
      const src = readFileSync(f, "utf8");
      assert.ok(!src.includes("WELCOME20"), `${f} still references WELCOME20`);
    }
  });
});

// ── P0/#2 Fakturownia reads never crash Settings on a DB error ───────────────
// Simulates the production root cause: the fakturownia_connections table isn't
// migrated yet, so the query throws. The reads must degrade to "not connected"
// instead of bubbling up and rendering the global "Coś poszło nie tak" page.
describe("Fakturownia connection reads fail safe", () => {
  const original = (prisma as unknown as { fakturowniaConnection: unknown }).fakturowniaConnection;
  const throwing = {
    findUnique: async () => { throw Object.assign(new Error("relation does not exist"), { code: "P2021" }); },
  };
  const patch = () => { (prisma as unknown as { fakturowniaConnection: unknown }).fakturowniaConnection = throwing; };
  const restore = () => { (prisma as unknown as { fakturowniaConnection: unknown }).fakturowniaConnection = original; };

  test("7. getConnectionStatus returns 'not connected' (never throws) on a DB error", async () => {
    patch();
    try {
      const s = await getConnectionStatus("biz-1");
      assert.equal(s.connected, false);
      assert.equal(s.needsReconnect, false);
      assert.equal(s.accountName, null);
    } finally { restore(); }
  });
  test("8. hasConnection → false, resolveCredentials → null on a DB error", async () => {
    patch();
    try {
      assert.equal(await hasConnection("biz-1"), false);
      assert.equal(await resolveCredentials("biz-1"), null);
    } finally { restore(); }
  });
});
