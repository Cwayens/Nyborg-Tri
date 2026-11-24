import { test } from "node:test";
import assert from "node:assert/strict";
import { amount, badges } from "./challenges";

test("udfordringer: mængde og mærker for at være med", () => {
  const start = new Date("2026-11-01T00:00:00Z"), end = new Date("2026-12-01T00:00:00Z");
  const a = (day: number, km = 10) => ({ userId: "u", startAt: new Date(Date.UTC(2026, 10, day)), distanceM: km * 1000, movingSec: 3600 });
  assert.equal(amount("KM", [a(1), a(2, 5)]), 15);
  assert.equal(amount("HOURS", [a(1), a(2)]), 2);
  assert.equal(amount("SESSIONS", [a(1), a(2)]), 2);
  assert.deepEqual(badges({ startsAt: start, endsAt: end }, [], false), []);
  const now = new Date("2026-11-20T00:00:00Z"); // 3 uger inde
  const keys = (xs: { key: string }[]) => xs.map((x) => x.key);
  assert.deepEqual(keys(badges({ startsAt: start, endsAt: end }, [a(2), a(9), a(16)], false, now)), ["med", "trofast"]);
  assert.deepEqual(keys(badges({ startsAt: start, endsAt: end }, [a(2), a(16)], true, now)), ["med", "maal"]);
});
