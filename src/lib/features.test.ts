import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveOff } from "./features";

test("Ugens tip er slået fra, til admin slår det til", () => {
  assert.equal(resolveOff(undefined, undefined).has("tips"), true);
  assert.equal(resolveOff(["chat"], []).has("tips"), true);
  assert.equal(resolveOff(["chat"], ["tips"]).has("tips"), false);
  assert.equal(resolveOff(["chat"], ["tips"]).has("chat"), true);
  assert.equal(resolveOff([], []).has("makker"), true);
  assert.equal(resolveOff([], ["makker"]).has("makker"), false);
  assert.equal(resolveOff([], []).has("chat"), false);
});
