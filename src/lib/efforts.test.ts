import { test } from "node:test";
import assert from "node:assert/strict";
import { ageGroup, formatWkg, leaderboardProviders, bestForDistance, bestPower, extractEfforts, improvementPct, rankBest, rankImprovement, worthChecking } from "./efforts";

// 8 km løb: 3 km i 5:00/km, så 5 km i 4:00/km
function run8k() {
  const time: number[] = [];
  const distance: number[] = [];
  let t = 0;
  for (let d = 0; d <= 8000; d += 10) {
    time.push(Math.round(t));
    distance.push(d);
    t += d < 3000 ? 3 : 2.4;
  }
  return { time, distance };
}

test("bedste 5 km findes inde i et længere løb", () => {
  const s = run8k();
  assert.equal(bestForDistance(s.time, s.distance, 5000), 1200);
  assert.equal(bestForDistance(s.time, s.distance, 10000), null);
});

test("bedste 20 min watt med opvarmning og pause", () => {
  const time: number[] = [];
  const watts: number[] = [];
  for (let i = 0; i < 3600; i++) {
    time.push(i < 1800 ? i : i + 300); // 5 min pause midt i
    watts.push(i < 600 ? 150 : i < 1800 ? 280 : 200);
  }
  assert.equal(bestPower(time, watts), 280);
  assert.equal(bestPower(time.slice(0, 500), watts.slice(0, 500)), null);
});

test("præstationer fra en aktivitet, med fornuftsgrænser", () => {
  const s = run8k();
  const e = extractEfforts({ sport: "RUN", distanceM: 8000, movingSec: 2100 }, s);
  assert.deepEqual(e, [{ test: "RUN_5K", seconds: 1200, watts: null }]);
  // GPS-fejl: 5 km på 5 minutter tælles ikke
  assert.deepEqual(extractEfforts({ sport: "RUN", distanceM: 5000, movingSec: 300 }, null), []);
  // Svøm i bassin uden distance-stream
  assert.deepEqual(extractEfforts({ sport: "SWIM", distanceM: 1500, movingSec: 1650 }, null), [{ test: "SWIM_1500", seconds: 1650, watts: null }]);
  assert.equal(worthChecking({ sport: "BIKE", distanceM: 20000, movingSec: 3000, hasPower: false }), false);
  assert.equal(worthChecking({ sport: "BIKE", distanceM: 20000, movingSec: 3000, hasPower: true }), true);
});

test("Ironman-aldersgrupper efter alder 31. december", () => {
  assert.equal(ageGroup(new Date("2000-12-31"), 2026), "25-29");
  assert.equal(ageGroup(new Date("2002-01-01"), 2026), "18-24");
  assert.equal(ageGroup(new Date("1981-06-01"), 2026), "45-49");
  assert.equal(ageGroup(new Date("1940-06-01"), 2026), "80+");
  assert.equal(ageGroup(new Date("2010-06-01"), 2026), null);
});

test("ranglister for årets bedste og mest fremgang", () => {
  const a = { id: "a", name: "A", gender: "MALE" as const, birthDate: new Date("1990-01-01") };
  const b = { id: "b", name: "B", gender: "MALE" as const, birthDate: new Date("1988-01-01") };
  const row = (userId: string, y: number, seconds: number) => ({ userId, test: "RUN_5K" as const, seconds, watts: null, date: new Date(`${y}-05-01`) });
  const rows = [row("a", 2026, 1200), row("a", 2026, 1150), row("b", 2026, 1100), row("a", 2025, 1300), row("b", 2025, 1120)];
  const best = rankBest([a, b], rows, 2026);
  assert.deepEqual(best.map((r) => [r.athlete.id, r.best.seconds, r.ag]), [["b", 1100, "35-39"], ["a", 1150, "35-39"]]);
  const imp = rankImprovement([a, b], rows, 2026);
  assert.equal(imp[0].athlete.id, "a");
  assert.equal(Math.round(imp[0].improvement! * 10) / 10, 11.5);
  assert.equal(Math.round(improvementPct({ test: "BIKE_FTP20", seconds: null, watts: 200 }, { test: "BIKE_FTP20", seconds: null, watts: 220 })), 10);
});

test("Strava vises kun på leaderboardet med tilladelse", () => {
  assert.equal(leaderboardProviders({}).includes("STRAVA"), false);
  assert.equal(leaderboardProviders({ STRAVA_LEADERBOARD: "1" }).includes("STRAVA"), true);
  assert.equal(leaderboardProviders({}).includes("MANUAL" as never), false);
});

test("FTP rangeres i W/kg, og kun atleter med vægt er med", () => {
  const heavy = { id: "h", name: "H", gender: "MALE" as const, birthDate: new Date("1990-01-01"), weightKg: 90 };
  const light = { id: "l", name: "L", gender: "MALE" as const, birthDate: new Date("1990-01-01"), weightKg: 65 };
  const none = { id: "n", name: "N", gender: "MALE" as const, birthDate: new Date("1990-01-01"), weightKg: null };
  const row = (userId: string, watts: number) => ({ userId, test: "BIKE_FTP20" as const, seconds: null, watts, date: new Date("2026-05-01") });
  const r = rankBest([heavy, light, none], [row("h", 330), row("l", 280), row("n", 400)], 2026);
  assert.deepEqual(r.map((x) => x.athlete.id), ["l", "h"]); // 4,09 W/kg slår 3,48 W/kg
  assert.equal(formatWkg(4.0923), "4,09 W/kg");
});
