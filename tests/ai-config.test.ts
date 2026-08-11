import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { estimatedCostUsd, dailyRequestLimitForTier, modelFor } from "../lib/ai/config";
import { DAILY_REQUESTS_BY_TIER } from "../lib/ai/limits-shared";

describe("AI cost estimation", () => {
  test("known models price input + output per million tokens", () => {
    // gpt-4o-mini: $0.15 in + $0.60 out per 1M tokens
    assert.equal(estimatedCostUsd("gpt-4o-mini", 1_000_000, 1_000_000), 0.75);
    // gpt-4o: $2.50 in per 1M tokens
    assert.equal(estimatedCostUsd("gpt-4o", 1_000_000, 0), 2.5);
  });

  test("zero tokens costs nothing", () => {
    assert.equal(estimatedCostUsd("gpt-4o", 0, 0), 0);
  });

  test("unknown model falls back to a non-zero price (never silently free)", () => {
    assert.ok(estimatedCostUsd("some-future-model", 1_000_000, 0) > 0);
  });
});

describe("AI per-tier daily limits", () => {
  test('"none" tier can never make a request', () => {
    assert.equal(DAILY_REQUESTS_BY_TIER.none, 0);
    assert.equal(dailyRequestLimitForTier("none"), 0);
  });

  test("basic tier has a positive, bounded budget", () => {
    const basic = dailyRequestLimitForTier("basic");
    assert.ok(basic > 0);
    assert.ok(basic <= 100000);
  });

  test("even the unlimited tier carries a finite safety ceiling", () => {
    const unlimited = dailyRequestLimitForTier("unlimited");
    assert.ok(Number.isFinite(unlimited));
    assert.ok(unlimited >= dailyRequestLimitForTier("basic"));
  });
});

describe("AI model tiers", () => {
  test("fast and smart both resolve to a model id", () => {
    assert.ok(modelFor("fast").length > 0);
    assert.ok(modelFor("smart").length > 0);
  });
});
