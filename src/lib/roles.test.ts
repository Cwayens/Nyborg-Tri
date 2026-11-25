import { test } from "node:test";
import assert from "node:assert/strict";
import { canJoinGroup, hasRole, trainingVisibleFor, userTypeLabel, visibleGroups } from "./roles";

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

test("kalenderens synlighed", () => {
  const a = (athleteGroup: "ELITE" | "BREDDE" | "BOERN" | null, role: "ATHLETE" | "TRAINER" | "ADMIN" = "ATHLETE") => ({ role, athleteGroup });
  assert.deepEqual(visibleGroups(a(null, "ADMIN")), ["ELITE", "BREDDE", "BOERN"]);
  assert.deepEqual(visibleGroups(a("BREDDE", "TRAINER")), ["ELITE", "BREDDE", "BOERN"]);
  assert.deepEqual(visibleGroups(a("ELITE")), ["ELITE", "BREDDE"]);
  assert.deepEqual(visibleGroups(a("BREDDE")), ["BREDDE"]);
  assert.deepEqual(visibleGroups(a("BOERN")), ["BOERN"]);
  assert.deepEqual(visibleGroups(a("ELITE"), true), ["BREDDE"]); // prøve
  assert.deepEqual(visibleGroups(a(null)), ["BREDDE"]);
  assert.deepEqual(visibleGroups(null), ["BREDDE"]);
  assert.equal(canJoinGroup(a("ELITE"), "ELITE", true), false);
  assert.equal(canJoinGroup(a("ELITE"), "BREDDE"), false);
});
