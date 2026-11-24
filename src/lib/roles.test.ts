import { test } from "node:test";
import assert from "node:assert/strict";
import { canJoinGroup, hasRole, trainingVisibleFor, userTypeLabel } from "./roles";

test("rettigheder: admin > træner > atlet", () => {
  assert.equal(hasRole("ADMIN", "TRAINER"), true);
  assert.equal(hasRole("TRAINER", "TRAINER"), true);
  assert.equal(hasRole("ATHLETE", "TRAINER"), false);
  assert.equal(hasRole(undefined, "ATHLETE"), false);
});

test("kalenderfilter viser kun den valgte gruppe", () => {
  assert.equal(trainingVisibleFor("ELITE", null), true);
  assert.equal(trainingVisibleFor("ELITE", "BOERN"), false);
  assert.equal(trainingVisibleFor("BOERN", "BOERN"), true);
});

test("atleter kan kun tilmelde sig egen gruppe, trænere alle", () => {
  assert.equal(canJoinGroup({ role: "ATHLETE", athleteGroup: "BREDDE" }, "BREDDE"), true);
  assert.equal(canJoinGroup({ role: "ATHLETE", athleteGroup: "BREDDE" }, "ELITE"), false);
  assert.equal(canJoinGroup({ role: "ATHLETE", athleteGroup: null }, "ELITE"), false);
  assert.equal(canJoinGroup({ role: "TRAINER", athleteGroup: null }, "BOERN"), true);
});

test("brugertype-navne", () => {
  assert.equal(userTypeLabel("ATHLETE", "ELITE"), "Atlet – Elite");
  assert.equal(userTypeLabel("TRAINER", null), "Træner");
});
