import { test } from "node:test";
import assert from "node:assert/strict";
import { groupValue, splitPaceGroups, suggestGroup } from "./pace";

test("tempogrupper læses og foreslås", () => {
  assert.deepEqual(splitPaceGroups("5:00 /km, 5:30 /km;5:30 /km\n6:15 /km"), ["5:00 /km", "5:30 /km", "6:15 /km"]);
  assert.equal(groupValue("5:30 /km"), 330);
  assert.equal(groupValue("28 km/t"), 28);
  // Tærskel 4:35/km → rolig ca. 5:30/km
  assert.equal(suggestGroup(["5:00 /km", "5:30 /km", "6:15 /km"], { thresholdPace: 275 }, "RUN"), "5:30 /km");
  assert.equal(suggestGroup(["5:00 /km"], {}, "RUN"), null);
});
