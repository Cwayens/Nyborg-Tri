import { test } from "node:test";
import assert from "node:assert/strict";
import { canJoinTeam, matchTeam, visibleTeams, type TeamLite } from "./teams";

const T = (id: string, kind: TeamLite["kind"], sees: string[] = [], pub = false, active = true): TeamLite => ({ id, name: id, kind, sees, public: pub, active });
const teams = [T("Elite", "ELITE", ["Bredde"]), T("Bredde", "BREDDE", [], true), T("Børn", "BOERN"), T("U17", "BOERN", ["Børn"])];
const ath = (teamId: string | null) => ({ role: "ATHLETE" as const, teamId });

test("trænere og admin ser alle hold", () => {
  assert.equal(visibleTeams({ role: "TRAINER", teamId: null }, teams).length, 4);
  assert.equal(visibleTeams({ role: "ADMIN", teamId: "Børn" }, teams).length, 4);
});

test("medlem ser eget hold og de hold, holdet ser", () => {
  assert.deepEqual(visibleTeams(ath("Elite"), teams), ["Elite", "Bredde"]);
  assert.deepEqual(visibleTeams(ath("Bredde"), teams), ["Bredde"]);
  assert.deepEqual(visibleTeams(ath("Børn"), teams), ["Børn"]);
  assert.deepEqual(visibleTeams(ath("U17"), teams), ["Børn", "U17"]);
});

test("besøgende, prøvemedlemmer og medlemmer uden hold ser åbne hold", () => {
  assert.deepEqual(visibleTeams(null, teams), ["Bredde"]);
  assert.deepEqual(visibleTeams(ath(null), teams), ["Bredde"]);
  assert.deepEqual(visibleTeams(ath("Elite"), teams, true), ["Bredde"]);
});

test("tilmelding kun til eget hold", () => {
  assert.equal(canJoinTeam(ath("Elite"), "Elite", teams), true);
  assert.equal(canJoinTeam(ath("Elite"), "Bredde", teams), false);
  assert.equal(canJoinTeam(ath("Elite"), "Elite", teams, true), false);
  assert.equal(canJoinTeam({ role: "TRAINER", teamId: null }, "Børn", teams), true);
});

test("hold findes ud fra tekst", () => {
  assert.equal(matchTeam("born", teams)?.id, "Børn");
  assert.equal(matchTeam("u-17", teams)?.id, "U17");
  assert.equal(matchTeam("ELITE", teams)?.id, "Elite");
  assert.equal(matchTeam("bredde ", teams)?.id, "Bredde");
  assert.equal(matchTeam("x", teams), null);
});
