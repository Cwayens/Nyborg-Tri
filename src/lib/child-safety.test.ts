import { test } from "node:test";
import assert from "node:assert/strict";
import { CHILD_BLOCKED, isChild } from "./child-safety";

test("kun atleter på et børnehold er børn", () => {
  assert.equal(isChild({ role: "ATHLETE", athleteGroup: "BOERN" }), true);
  assert.equal(isChild({ role: "TRAINER", athleteGroup: "BOERN" }), false);
  assert.equal(isChild({ role: "ATHLETE", athleteGroup: null }), false);
  assert.equal(isChild(null), false);
});

test("fællesskabsfunktioner med voksne er lukket for børn", () => {
  for (const f of ["traensammen", "makker", "mentor", "leaderboard", "statistik", "udfordringer", "staevner"]) assert.ok((CHILD_BLOCKED as readonly string[]).includes(f));
  assert.ok(!(CHILD_BLOCKED as readonly string[]).includes("chat")); // børnene har deres eget chatrum
});
