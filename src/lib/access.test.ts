import { test } from "node:test";
import assert from "node:assert/strict";
import { generateCode, normalizeCode } from "./access";

test("koder har formatet NT-XXXX-XXXX uden forvekslelige tegn", () => {
  for (let i = 0; i < 200; i++) assert.match(generateCode(), /^NT-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
});

test("koder normaliseres, så små bogstaver og mellemrum virker", () => {
  assert.equal(normalizeCode("  nt-ab12-cd34 "), "NT-AB12-CD34");
});
