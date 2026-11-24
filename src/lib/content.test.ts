import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanWpHtml } from "./content";

test("gammel WordPress-HTML ryddes op", () => {
  const html = '<p>&nbsp;</p><p><img class="aligncenter size-full wp-image-12" src="/a.png" width="403" height="149" style="margin:0"></p><p> </p><p>Tekst</p>';
  assert.equal(cleanWpHtml(html), '<p><img src="/a.png"></p><p>Tekst</p>');
});
