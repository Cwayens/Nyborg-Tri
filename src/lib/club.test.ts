import { test } from "node:test";
import assert from "node:assert/strict";
import { formatPhone, telHref } from "./club";

test("telefonnumre vises med mellemrum og ringes op med +45", () => {
  assert.equal(formatPhone("22446633"), "22 44 66 33");
  assert.equal(telHref("22 44 66 33"), "tel:+4522446633");
  assert.equal(telHref("+46 70 123"), "tel:+4670123");
});
