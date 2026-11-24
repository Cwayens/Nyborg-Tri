import { test } from "node:test";
import assert from "node:assert/strict";
import { hasRole, trainingVisibleFor, userTypeLabel } from "./roles";

test("rettigheder: admin > træner > atlet", () => {
  assert.equal(hasRole("ADMIN", "TRAINER"), true);
  assert.equal(hasRole("TRAINER", "TRAINER"), true);
  assert.equal(hasRole("ATHLETE", "TRAINER"), false);
  assert.equal(hasRole(undefined, "ATHLETE"), false);
});

test("atleter ser træninger for egen gruppe og fælles træninger", () => {
  assert.equal(trainingVisibleFor([], "BOERN"), true);
  assert.equal(trainingVisibleFor(["ELITE"], "BOERN"), false);
  assert.equal(trainingVisibleFor(["ELITE", "BOERN"], "BOERN"), true);
});

test("brugertype-navne", () => {
  assert.equal(userTypeLabel("ATHLETE", "ELITE"), "Atlet – Elite");
  assert.equal(userTypeLabel("TRAINER", null), "Træner");
});
