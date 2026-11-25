import { test } from "node:test";
import assert from "node:assert/strict";
import { longestStreak, rank, trophies, type Done } from "./trophies";

test("titel efter antal træninger", () => {
  assert.equal(rank(0).level, null);
  assert.equal(rank(0).next?.at, 1);
  assert.equal(rank(1).level?.title, "Våddragts-jomfru");
  const r = rank(7);
  assert.equal(r.level?.at, 5);
  assert.equal(r.toNext, 3);
  assert.equal(r.pct, 40);
  assert.equal(rank(500).next, null);
  assert.equal(rank(500).pct, 100);
});

const d = (iso: string, discipline: Done["discipline"], host = false): Done => ({ at: new Date(iso), discipline, host });

test("uger i træk starter mandag", () => {
  // søndag og mandag er to forskellige uger, men i træk
  assert.equal(longestStreak([d("2026-11-22T09:00:00Z", "RUN"), d("2026-11-23T09:00:00Z", "RUN")]), 2);
  assert.equal(longestStreak([d("2026-11-23T09:00:00Z", "RUN"), d("2026-11-29T09:00:00Z", "RUN")]), 1);
  assert.equal(longestStreak([d("2026-11-02T09:00:00Z", "RUN"), d("2026-11-16T09:00:00Z", "RUN")]), 1);
});

test("mærker", () => {
  const done = [d("2026-11-23T05:30:00Z", "SWIM"), d("2026-11-24T16:00:00Z", "BIKE"), d("2026-11-26T16:00:00Z", "RUN", true)];
  const t = Object.fromEntries(trophies(done).map((x) => [x.key, x]));
  assert.equal(t.tri.earned, true);
  assert.equal(t.klor.progress, "1 af 10 svøm");
  assert.equal(t.morgen.progress, "1 af 5 morgener"); // 06:30 dansk tid
  assert.equal(t.vaert.progress, "1 af 3 ture");
  assert.equal(t.vinter.earned, false);
});
