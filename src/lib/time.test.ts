import { test } from "node:test";
import assert from "node:assert/strict";
import { addWeeksLocal, parseLocal, toLocalInput } from "./time";

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
