import { test } from "node:test";
import assert from "node:assert/strict";
import { canDeleteMessage, canUseChat } from "./chat";

test("atleter har kun adgang til egen gruppes chat", () => {
  assert.equal(canUseChat({ role: "ATHLETE", athleteGroup: "BREDDE" }, "BREDDE"), true);
  assert.equal(canUseChat({ role: "ATHLETE", athleteGroup: "BREDDE" }, "ELITE"), false);
  assert.equal(canUseChat({ role: "ATHLETE", athleteGroup: null }, "BOERN"), false);
  assert.equal(canUseChat({ role: "TRAINER", athleteGroup: null }, "BOERN"), true);
});

test("kun afsender og trænere kan slette", () => {
  const msg = { userId: "a" };
  assert.equal(canDeleteMessage({ id: "a", role: "ATHLETE", athleteGroup: "ELITE" }, msg), true);
  assert.equal(canDeleteMessage({ id: "b", role: "ATHLETE", athleteGroup: "ELITE" }, msg), false);
  assert.equal(canDeleteMessage({ id: "c", role: "TRAINER", athleteGroup: null }, msg), true);
});
