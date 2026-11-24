import { test } from "node:test";
import assert from "node:assert/strict";
import { instagramUrl, lines, slugify } from "./athletes";

test("atletprofiler: slug, lister og Instagram", () => {
  assert.equal(slugify("Søren Ærø Åberg"), "soeren-aeroe-aaberg");
  assert.deepEqual(lines("- Ironman Kalmar 2026: 9:52\n\n• DM sprint: 4. plads "), ["Ironman Kalmar 2026: 9:52", "DM sprint: 4. plads"]);
  assert.equal(instagramUrl("@emil.tri"), "https://www.instagram.com/emil.tri/");
  assert.equal(instagramUrl("https://instagram.com/emil.tri/"), "https://www.instagram.com/emil.tri/");
  assert.equal(instagramUrl("javascript:alert(1)"), null);
});
