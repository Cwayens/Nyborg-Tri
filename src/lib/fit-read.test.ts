import { test } from "node:test";
import assert from "node:assert/strict";
import { workoutToFit } from "./fit";
import { parseFitWorkout, parseWorkoutUpload } from "./fit-read";
import { parseText } from "./workout";

test("FIT-workout læses tilbage med gentagelser og procent af FTP", () => {
  const w = parseText("10min 60% opvarmning\n5x(4min 105%, 3min 55%)\n10min 50% nedkøling");
  const bytes = workoutToFit(w, "BIKE", { ftp: 250 }, "VO2 intervaller");
  const back = parseFitWorkout(bytes, { ftp: 250 });
  assert.equal(back.name, "VO2 intervaller");
  assert.equal(back.sport, "BIKE");
  assert.equal(back.blocks.length, 3);
  assert.equal(back.blocks[1].repeat, 5);
  assert.equal(back.blocks[1].steps[0].durationSec, 240);
  assert.ok(Math.abs(back.blocks[1].steps[0].high - 1.075) < 0.01); // 105 % ± 2,5 % bånd
  assert.equal(back.blocks[0].steps[0].kind, "warmup");
  assert.equal(back.blocks[2].steps[0].kind, "cooldown");
});

test("watt uden egen FTP vises som tekst, løbefart omregnes til procent", () => {
  const bike = parseFitWorkout(workoutToFit(parseText("20min 90%"), "BIKE", { ftp: 200 }, "x"), {});
  assert.equal(bike.blocks[0].steps[0].high, 0);
  assert.match(bike.blocks[0].steps[0].label!, /W$/);
  const run = parseFitWorkout(workoutToFit(parseText("3x(1km 100%, 2min 70%)"), "RUN", { thresholdPace: 240 }, "x"), { thresholdPace: 240 });
  assert.equal(run.sport, "RUN");
  assert.equal(run.blocks[0].repeat, 3);
  assert.equal(run.blocks[0].steps[0].distanceM, 1000);
  assert.ok(Math.abs(run.blocks[0].steps[0].low - 0.975) < 0.01);
});

test("upload vælger format ud fra fil", () => {
  const zwo = '<workout_file><name>Z</name><sportType>bike</sportType><workout><SteadyState Duration="600" Power="0.8"/></workout></workout_file>';
  assert.equal(parseWorkoutUpload("a.zwo", new TextEncoder().encode(zwo)).source, "zwo");
  assert.throws(() => parseWorkoutUpload("a.fit", new Uint8Array(20)), /FIT/);
});
