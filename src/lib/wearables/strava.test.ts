import { test } from "node:test";
import assert from "node:assert/strict";
import { mapSport, toActivityData } from "./strava";

test("Strava-sportstyper oversættes til klubbens discipliner", () => {
  assert.equal(mapSport({ sport_type: "VirtualRide" }), "BIKE");
  assert.equal(mapSport({ sport_type: "TrailRun" }), "RUN");
  assert.equal(mapSport({ sport_type: "Swim" }), "SWIM");
  assert.equal(mapSport({ sport_type: "Yoga" }), "OTHER");
  assert.equal(mapSport({ type: "Run" }), "RUN");
});

test("Strava-aktivitet omdannes til klubbens format", () => {
  const d = toActivityData("u1", {
    id: 123, name: "Morgensvøm", sport_type: "Swim", start_date: "2026-11-20T05:30:00Z",
    moving_time: 1820.4, distance: 1650.7, total_elevation_gain: 0, average_heartrate: 131.6,
  });
  assert.equal(d.externalId, "123");
  assert.equal(d.sport, "SWIM");
  assert.equal(d.distanceM, 1651);
  assert.equal(d.avgHr, 132);
  assert.equal(d.startAt.toISOString(), "2026-11-20T05:30:00.000Z");
});
