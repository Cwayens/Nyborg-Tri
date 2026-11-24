import { test } from "node:test";
import assert from "node:assert/strict";
import { canDeleteMessage, canPost, canUseChat, roomsFor } from "./chat";

test("Elite og Bredde deler chat, Børn har deres egen", () => {
  assert.equal(canUseChat({ role: "ATHLETE", athleteGroup: "ELITE" }, "VOKSNE"), true);
  assert.equal(canUseChat({ role: "ATHLETE", athleteGroup: "BREDDE" }, "VOKSNE"), true);
  assert.equal(canUseChat({ role: "ATHLETE", athleteGroup: "BREDDE" }, "BOERN"), false);
  assert.equal(canUseChat({ role: "ATHLETE", athleteGroup: "BOERN" }, "VOKSNE"), false);
  assert.equal(canUseChat({ role: "ATHLETE", athleteGroup: "BOERN" }, "BOERN"), true);
  assert.deepEqual(roomsFor({ role: "ATHLETE", athleteGroup: null }), []);
  assert.deepEqual(roomsFor({ role: "TRAINER", athleteGroup: null }), ["VOKSNE", "BOERN"]);
});

test("kun afsender og trænere kan slette", () => {
  const msg = { userId: "a" };
  assert.equal(canDeleteMessage({ id: "a", role: "ATHLETE", athleteGroup: "ELITE" }, msg), true);
  assert.equal(canDeleteMessage({ id: "b", role: "ATHLETE", athleteGroup: "ELITE" }, msg), false);
  assert.equal(canDeleteMessage({ id: "c", role: "TRAINER", athleteGroup: null }, msg), true);
});

test("børn skriver kun med børn; trænere og admin læser med", () => {
  assert.equal(canPost({ role: "ATHLETE", athleteGroup: "BOERN" }, "BOERN"), true);
  assert.equal(canPost({ role: "TRAINER", athleteGroup: "BREDDE" }, "BOERN"), false);
  assert.equal(canPost({ role: "ADMIN", athleteGroup: null }, "BOERN"), false);
  assert.equal(canUseChat({ role: "ADMIN", athleteGroup: null }, "BOERN"), true);
  assert.equal(canPost({ role: "TRAINER", athleteGroup: "BREDDE" }, "VOKSNE"), true);
  assert.equal(canPost({ role: "ATHLETE", athleteGroup: "BOERN" }, "VOKSNE"), false);
});
