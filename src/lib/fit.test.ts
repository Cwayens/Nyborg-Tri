import { test } from "node:test";
import assert from "node:assert/strict";
import { fitCrc, fitTarget, workoutToFit, workoutToZwo } from "./fit";
import { parseText } from "./workout";

test("FIT-workout har gyldig header og CRC", () => {
  const w = parseText("10min 60%\n5x(4min 105%, 3min 55%)");
  const f = workoutToFit(w, "BIKE", { ftp: 250 }, "FTP");
  assert.equal(f[0], 14);
  assert.equal(new TextDecoder().decode(f.slice(8, 12)), ".FIT");
  assert.equal(fitCrc(f), 0); // CRC over hele filen inkl. CRC-feltet giver 0
  assert.equal(new DataView(f.buffer).getUint32(4, true), f.length - 16);
});

test("personlige mål i FIT-enheder", () => {
  assert.deepEqual(fitTarget("BIKE", { kind: "active", low: 1.0, high: 1.1 }, { ftp: 250 }), { type: 4, low: 1250, high: 1275 });
  const run = fitTarget("RUN", { kind: "active", low: 1, high: 1 }, { thresholdPace: 250 })!; // 4:10/km = 4 m/s
  assert.equal(run.type, 0);
  assert.ok(run.low < 4000 && run.high > 4000);
  assert.equal(fitTarget("SWIM", { kind: "active", low: 1, high: 1 }, { swim100: 90 }), null);
  assert.equal(fitTarget("BIKE", { kind: "active", low: 1, high: 1 }, {}), null);
});

test(".zwo med intervaller", () => {
  const z = workoutToZwo(parseText("5x(4min 105%, 3min 55%)"), "Test & co", "BIKE", "Klub <A&B>");
  assert.match(z, /<author>Klub &lt;A&amp;B&gt;<\/author>/);
  assert.match(z, /<IntervalsT Repeat="5" OnDuration="240" OffDuration="180" OnPower="1.05" OffPower="0.55"\/>/);
  assert.match(z, /<name>Test &amp; co<\/name>/);
});
