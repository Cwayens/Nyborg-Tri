import { test } from "node:test";
import assert from "node:assert/strict";
import { addWeeksLocal, isoWeek, parseLocal, toLocalInput } from "./time";

test("ugenumre følger ISO 8601 som i danske kalendere", () => {
  assert.equal(isoWeek("2026-11-25"), 48);
  assert.equal(isoWeek("2026-01-01"), 1);
  assert.equal(isoWeek("2027-01-01"), 53); // 2026 har 53 uger
  assert.equal(isoWeek("2024-12-30"), 1); // hører til 2025
  assert.equal(isoWeek("2021-01-03"), 53);
});

test("vintertid: 18:00 dansk = 17:00 UTC", () => {
  assert.equal(parseLocal("2026-12-01T18:00").toISOString(), "2026-12-01T17:00:00.000Z");
});

test("sommertid: 18:00 dansk = 16:00 UTC", () => {
  assert.equal(parseLocal("2027-06-01T18:00").toISOString(), "2027-06-01T16:00:00.000Z");
});

test("ugentlig gentagelse holder klokkeslættet hen over sommertid", () => {
  const next = addWeeksLocal("2027-03-22T06:00", 1);
  assert.equal(next, "2027-03-29T06:00");
  assert.equal(toLocalInput(parseLocal(next)), "2027-03-29T06:00");
});
