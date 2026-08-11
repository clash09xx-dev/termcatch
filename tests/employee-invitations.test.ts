import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { effectiveStatus, isAcceptable, inviteExpiry, INVITE_TTL_DAYS } from "../lib/employee/invite-status";
import { can } from "../lib/permissions";

const future = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
const past = new Date(Date.now() - 1000);

describe("employee invitation status", () => {
  test("pending invitation is acceptable", () => {
    const inv = { status: "pending", expiresAt: future, acceptedAt: null };
    assert.equal(effectiveStatus(inv), "pending");
    assert.equal(isAcceptable(inv), true);
  });
  test("accepted invitation is terminal (one-time use — cannot be reused)", () => {
    const inv = { status: "accepted", expiresAt: future, acceptedAt: new Date() };
    assert.equal(effectiveStatus(inv), "accepted");
    assert.equal(isAcceptable(inv), false);
  });
  test("revoked invitation cannot be accepted", () => {
    const inv = { status: "revoked", expiresAt: future, acceptedAt: null };
    assert.equal(effectiveStatus(inv), "revoked");
    assert.equal(isAcceptable(inv), false);
  });
  test("expired invitation cannot be accepted", () => {
    const inv = { status: "pending", expiresAt: past, acceptedAt: null };
    assert.equal(effectiveStatus(inv), "expired");
    assert.equal(isAcceptable(inv), false);
  });
  test("expiry is 7 days out", () => {
    assert.equal(INVITE_TTL_DAYS, 7);
    const days = (inviteExpiry().getTime() - Date.now()) / (24 * 60 * 60 * 1000);
    assert.ok(days > 6.9 && days < 7.1);
  });
});

describe("employee cannot reach owner-only areas (permission source of truth)", () => {
  test("employee is denied invoices / Stripe / Fakturownia / marketing / analytics / subscription / CRM", () => {
    for (const c of ["invoices", "marketing", "analytics.revenue", "analytics.business", "subscription", "crm.full", "employees.performance"] as const) {
      assert.equal(can("employee", c), false, c);
    }
  });
  test("employee keeps only their own calendar + appointment client context + operational AI", () => {
    assert.equal(can("employee", "calendar.own"), true);
    assert.equal(can("employee", "clients.appointment"), true);
    assert.equal(can("employee", "ai.employee"), true);
    assert.equal(can("employee", "calendar.all"), false);
  });
});
