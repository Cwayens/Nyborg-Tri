import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCoords, rows, slug } from "./form-rows";

test("gentagne rækker", () => {
  const fd = new FormData();
  fd.set("faq.0.q", "Hvad?"); fd.set("faq.0.a", "Det");
  fd.set("faq.1.q", "Slet mig"); fd.set("faq.1.a", "x"); fd.set("faq.1.slet", "on");
  fd.set("faq.2.q", ""); fd.set("faq.2.a", "");
  fd.set("faq.10.q", "Sidst"); fd.set("faq.10.a", "");
  assert.deepEqual(rows(fd, "faq", ["q", "a"] as const), [{ q: "Hvad?", a: "Det" }, { q: "Sidst", a: "" }]);
});

test("koordinater og slug", () => {
  assert.deepEqual(parseCoords("55.311761, 10.810172"), { lat: 55.31176, lng: 10.81017 });
  assert.deepEqual(parseCoords("https://www.google.com/maps/place/x/@55.3117,10.8101,17z"), { lat: 55.3117, lng: 10.8101 });
  assert.equal(parseCoords("Nyborg"), null);
  assert.equal(slug("Løb på Volden – 5 km"), "loeb-paa-volden-5-km");
});
