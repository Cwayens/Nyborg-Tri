import { test } from "node:test";
import assert from "node:assert/strict";
import { nextPeriod } from "./membership";

test("nyt medlem starter i dag og løber et år", () => {
  const now = new Date("2026-11-24T12:00:00Z");
  const p = nextPeriod(now, null);
  assert.equal(p.startDate.toISOString(), now.toISOString());
  assert.equal(p.endDate.toISOString(), "2027-11-24T12:00:00.000Z");
});

test("fornyelse før udløb forlænger fra udløbsdatoen", () => {
  const now = new Date("2026-11-24T12:00:00Z");
  const end = new Date("2027-01-10T00:00:00Z");
  const p = nextPeriod(now, end);
  assert.equal(p.startDate.toISOString(), end.toISOString());
  assert.equal(p.endDate.toISOString(), "2028-01-10T00:00:00.000Z");
});

test("udløbet medlemskab starter forfra i dag", () => {
  const now = new Date("2026-11-24T12:00:00Z");
  const p = nextPeriod(now, new Date("2026-01-01T00:00:00Z"));
  assert.equal(p.startDate.toISOString(), now.toISOString());
});
