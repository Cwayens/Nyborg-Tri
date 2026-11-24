import { test } from "node:test";
import assert from "node:assert/strict";
import { parseMrc, parseText, parseTpStructure, parseWorkoutFile, parseZwo, personalTarget, referencesFrom, toText, totalDuration } from "./workout";

const ZWO = `<workout_file><name>FTP-intervaller</name><sportType>bike</sportType><workout>
  <Warmup Duration="600" PowerLow="0.50" PowerHigh="0.75"/>
  <IntervalsT Repeat="5" OnDuration="240" OffDuration="180" OnPower="1.05" OffPower="0.55"/>
  <SteadyState Duration="300" Power="0.88"/>
  <Cooldown Duration="600" PowerLow="0.65" PowerHigh="0.45"/>
</workout></workout_file>`;

test(".zwo fra TrainingPeaks/Zwift", () => {
  const w = parseZwo(ZWO);
  assert.equal(w.name, "FTP-intervaller");
  assert.equal(w.sport, "BIKE");
  assert.equal(w.blocks.length, 4);
  assert.deepEqual(w.blocks[1], { repeat: 5, steps: [
    { kind: "active", durationSec: 240, low: 1.05, high: 1.05 },
    { kind: "recovery", durationSec: 180, low: 0.55, high: 0.55 },
  ] });
  assert.equal(w.blocks[3].steps[0].kind, "cooldown");
  assert.equal(w.blocks[3].steps[0].low, 0.45);
  assert.equal(totalDuration(w), 600 + 5 * 420 + 300 + 600);
});

test(".mrc med procent, gentagelser slås sammen", () => {
  const mrc = `[COURSE HEADER]\nMINUTES PERCENT\n[END COURSE HEADER]\n[COURSE DATA]\n0 50\n10 50\n10 100\n14 100\n14 55\n17 55\n17 100\n21 100\n21 55\n24 55\n24 50\n34 50\n[END COURSE DATA]`;
  const w = parseMrc(mrc);
  assert.equal(w.blocks[0].steps[0].kind, "warmup");
  assert.deepEqual(w.blocks[1].repeat, 2);
  assert.equal(w.blocks[1].steps[0].high, 1);
  assert.equal(w.blocks[w.blocks.length - 1].steps[0].kind, "cooldown");
});

test("TrainingPeaks' strukturformat", () => {
  const w = parseTpStructure({
    structure: [
      { type: "step", length: { value: 1, unit: "repetition" }, steps: [{ name: "Opvarmning", length: { value: 600, unit: "second" }, targets: [{ minValue: 60, maxValue: 70 }], intensityClass: "warmUp" }] },
      { type: "repetition", length: { value: 6, unit: "repetition" }, steps: [
        { length: { value: 400, unit: "meter" }, targets: [{ minValue: 103, maxValue: 106 }], intensityClass: "active" },
        { length: { value: 90, unit: "second" }, targets: [{ minValue: 60, maxValue: 65 }], intensityClass: "rest" },
      ] },
    ],
  });
  assert.equal(w.blocks[1].repeat, 6);
  assert.deepEqual(w.blocks[1].steps[0], { kind: "active", distanceM: 400, low: 1.03, high: 1.06 });
  assert.equal(w.blocks[1].steps[1].kind, "recovery");
});

test("tekstformat og tilbage igen", () => {
  const w = parseText("10min 60%\n5x(4min 105%, 3min 55%)\n8x100m 110% 20s pause\n10min 50-60%");
  assert.equal(w.blocks[0].steps[0].kind, "warmup");
  assert.equal(w.blocks[1].steps[1].kind, "recovery");
  assert.deepEqual(w.blocks[2].steps, [
    { kind: "active", distanceM: 100, low: 1.1, high: 1.1 },
    { kind: "rest", durationSec: 20, low: 0, high: 0 },
  ]);
  assert.equal(w.blocks[3].steps[0].kind, "cooldown");
  assert.equal(toText(w), "10min 60% opvarmning\n5x(4min 105%, 3min 55%)\n8x(100m 110%, 20s pause)\n10min 50-60% nedkøling");
  assert.deepEqual(parseText(toText(w)).blocks, w.blocks);
  assert.throws(() => parseText("10min"), /intensitet/);
});

test("filtype vælges ud fra navn og indhold", () => {
  assert.equal(parseWorkoutFile("a.zwo", ZWO).source, "zwo");
  assert.equal(parseWorkoutFile("program.txt", "20min 70%").source, "text");
  assert.throws(() => parseWorkoutFile("x.fit", "binary"), /FIT/);
});

test("personlige mål ud fra Mine tests", () => {
  const ref = referencesFrom([
    { test: "BIKE_FTP20", seconds: null, watts: 263 },
    { test: "RUN_10K", seconds: 2700, watts: null },
    { test: "SWIM_100", seconds: 100, watts: null },
  ]);
  assert.deepEqual(ref, { ftp: 250, thresholdPace: 278, swim100: 100 });
  assert.equal(personalTarget("BIKE", { kind: "active", low: 1.05, high: 1.05 }, ref), "263 W");
  assert.equal(personalTarget("BIKE", { kind: "warmup", low: 0.5, high: 0.75 }, ref), "125–188 W");
  assert.equal(personalTarget("RUN", { kind: "active", low: 1, high: 1 }, ref), "4:38 /km");
  assert.equal(personalTarget("SWIM", { kind: "active", low: 1.1, high: 1.1 }, ref), "1:31 /100 m");
  assert.equal(personalTarget("RUN", { kind: "active", low: 1, high: 1 }, {}), null);
});
