import { test } from "node:test";
import assert from "node:assert/strict";
import { formatDistance, formatDuration, formatPace, sumBySport, visibleToClub } from "./activities";

test("formatering af tid, distance og tempo", () => {
  assert.equal(formatDuration(5400), "1 t 30 min");
  assert.equal(formatDuration(1500), "25 min");
  assert.equal(formatDistance(1500, "SWIM"), "1.500 m");
  assert.equal(formatDistance(42195, "RUN"), "42,2 km");
  assert.equal(formatPace(1500, 5000, "RUN"), "5:00 /km");
  assert.equal(formatPace(3600, 30000, "BIKE"), "30 km/t");
  assert.equal(formatPace(1200, 1000, "SWIM"), "2:00 /100 m");
});

test("summering pr. sport", () => {
  const t = sumBySport([
    { sport: "RUN", movingSec: 1800, distanceM: 6000 },
    { sport: "RUN", movingSec: 1200, distanceM: 4000 },
    { sport: "SWIM", movingSec: 1500, distanceM: 1500 },
  ]);
  assert.equal(t.RUN.m, 10000);
  assert.equal(t.RUN.count, 2);
  assert.equal(t.SWIM.sec, 1500);
  assert.equal(t.BIKE.count, 0);
});

test("Strava-data deles ikke med klubben, og intet deles uden samtykke", () => {
  assert.equal(visibleToClub({ provider: "STRAVA" }, true), false);
  assert.equal(visibleToClub({ provider: "MANUAL" }, true), true);
  assert.equal(visibleToClub({ provider: "GARMIN" }, false), false);
});
