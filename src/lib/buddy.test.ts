import { test } from "node:test";
import assert from "node:assert/strict";
import { matchBuddy, parseMinSec } from "./buddy";

test("makker-match på sport, tempo og tid", () => {
  assert.equal(parseMinSec("5:30"), 330);
  assert.equal(parseMinSec("5.75"), null);
  const me = { userId: "a", disciplines: ["RUN", "BIKE"] as const, runPace: 330, bikeSpeed: 28, swimPace: null, times: ["AFTEN", "WEEKEND"] };
  const close = { userId: "b", disciplines: ["RUN"] as const, runPace: 340, bikeSpeed: null, swimPace: null, times: ["AFTEN"] };
  const fast = { userId: "c", disciplines: ["RUN"] as const, runPace: 260, bikeSpeed: null, swimPace: null, times: ["AFTEN"] };
  const bike = { userId: "d", disciplines: ["BIKE"] as const, runPace: null, bikeSpeed: 30, swimPace: null, times: ["MORGEN"] };
  const m = matchBuddy({ ...me, disciplines: [...me.disciplines] }, { ...close, disciplines: [...close.disciplines] });
  assert.deepEqual(m.sports, ["RUN"]);
  assert.deepEqual(m.times, ["AFTEN"]);
  assert.equal(matchBuddy({ ...me, disciplines: [...me.disciplines] }, { ...fast, disciplines: [...fast.disciplines] }).score, 0);
  assert.ok(matchBuddy({ ...me, disciplines: [...me.disciplines] }, { ...bike, disciplines: [...bike.disciplines] }).score > 0);
});
