import { test } from "node:test";
import assert from "node:assert/strict";
import { change, formatDetail, formatDuration, formatResult, matchTest, parseDuration } from "./benchmarks";

test("parseDuration forstår mm:ss, h:mm:ss og sekunder", () => {
  assert.equal(parseDuration("22:15"), 1335);
  assert.equal(parseDuration("1:02:03"), 3723);
  assert.equal(parseDuration("1.32"), 92);
  assert.equal(parseDuration("95"), 95);
  assert.equal(parseDuration("22:75"), null);
  assert.equal(parseDuration("abc"), null);
});

test("formatering af tid, tempo og FTP", () => {
  assert.equal(formatDuration(1335), "22:15");
  assert.equal(formatDuration(3723), "1:02:03");
  assert.equal(formatDetail({ test: "RUN_5K", seconds: 1500, watts: null }), "5:00 /km");
  assert.equal(formatDetail({ test: "SWIM_1500", seconds: 1650, watts: null }), "1:50 /100 m");
  assert.equal(formatResult({ test: "BIKE_FTP20", seconds: null, watts: 300 }), "285 W");
});

test("udvikling: kortere tid og flere watt er bedre", () => {
  assert.deepEqual(change({ test: "RUN_5K", seconds: 1400, watts: null }, { test: "RUN_5K", seconds: 1370, watts: null }), { text: "–0:30", better: true });
  assert.deepEqual(change({ test: "BIKE_FTP20", seconds: null, watts: 250 }, { test: "BIKE_FTP20", seconds: null, watts: 240 }), { text: "–10 W", better: false });
});

test("aktiviteter genkendes som test", () => {
  assert.equal(matchTest({ sport: "RUN", distanceM: 5040 }), "RUN_5K");
  assert.equal(matchTest({ sport: "RUN", distanceM: 6000 }), null);
  assert.equal(matchTest({ sport: "SWIM", distanceM: 1500 }), "SWIM_1500");
});
