import { test } from "node:test";
import assert from "node:assert/strict";
import { canManageTeam, isTeamStaff, isTreasurer, type Staff } from "./staff";

const S = (role: Staff["role"], duties: Staff["duties"] = [], leads: string[] = []): Staff => ({ id: "x", name: null, email: "x@x", role, duties, leads });

test("kasserer og admin har adgang til betalinger", () => {
  assert.equal(isTreasurer(S("ADMIN")), true);
  assert.equal(isTreasurer(S("ATHLETE", ["TREASURER"])), true);
  assert.equal(isTreasurer(S("TRAINER")), false);
  assert.equal(isTreasurer(S("ATHLETE", ["VOLUNTEER"])), false);
});

test("holdleder styrer kun egne hold", () => {
  const leader = S("ATHLETE", [], ["motion"]);
  assert.equal(isTeamStaff(leader), true);
  assert.equal(canManageTeam(leader, "motion"), true);
  assert.equal(canManageTeam(leader, "elite"), false);
  assert.equal(canManageTeam(S("TRAINER"), "elite"), true);
  assert.equal(isTeamStaff(S("ATHLETE")), false);
});
