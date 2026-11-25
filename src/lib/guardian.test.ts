import { test } from "node:test";
import assert from "node:assert/strict";
import { adultFilter, ageOn, billingEmail, isChild, isEmail, needsGuardian } from "./guardian";

test("værge kræves under 18 år", () => {
  const on = new Date("2026-11-24");
  assert.equal(ageOn(new Date("2008-11-25"), on), 17);
  assert.equal(needsGuardian(new Date("2008-11-25"), on), true);
  assert.equal(needsGuardian(new Date("2008-11-24"), on), false);
  assert.equal(needsGuardian(null, on), false);
});

test("betalinger og kvitteringer går til værgen for børn", () => {
  const on = new Date("2026-11-24");
  assert.equal(billingEmail({ email: "barn@x.dk", birthDate: new Date("2014-05-10"), guardianEmail: "mor@x.dk" }, on), "mor@x.dk");
  assert.equal(billingEmail({ email: "voksen@x.dk", birthDate: new Date("1990-05-10"), guardianEmail: "mor@x.dk" }, on), "voksen@x.dk");
  assert.equal(isEmail("mor@x.dk"), true);
  assert.equal(isEmail("mor@x"), false);
});

test("børn holdes ude af makker- og mentorordningen", () => {
  const on = new Date(2026, 10, 24);
  assert.equal(isChild({ birthDate: new Date(2014, 4, 10), athleteGroup: "BREDDE" }, on), true);
  assert.equal(isChild({ birthDate: null, athleteGroup: "BOERN" }, on), true);
  assert.equal(isChild({ birthDate: new Date(1990, 4, 10), athleteGroup: "ELITE" }, on), false);
  assert.equal(isChild({ birthDate: null, athleteGroup: null }, on), false);
  // Grænsen er 18-årsdagen
  const f = adultFilter(on);
  assert.deepEqual(f.AND[1].OR[1], { birthDate: { lte: new Date(2008, 10, 24) } });
  assert.deepEqual(f.AND[0].OR[1], { athleteGroup: { in: ["ELITE", "BREDDE"] } });
});
