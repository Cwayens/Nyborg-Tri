import { test } from "node:test";
import assert from "node:assert/strict";
import { lengthKm, parseGpx, thin } from "./routes";

test("GPX-fil til rute", () => {
  const gpx = `<?xml version="1.0"?><gpx version="1.1"><trk><name>Volden rundt</name><trkseg>
    <trkpt lat="55.3100" lon="10.7900"><ele>3</ele></trkpt><trkpt lon="10.8000" lat="55.3100"/><trkpt lat="55.3200" lon="10.8000"/></trkseg></trk></gpx>`;
  const r = parseGpx(gpx);
  assert.equal(r.name, "Volden rundt");
  assert.deepEqual(r.pts[1], [55.31, 10.8]);
  assert.equal(lengthKm(r.pts), 1.7); // ca. 0,63 + 1,11 km
  assert.throws(() => parseGpx("<kml/>"), /GPX/);
});

test("mange punkter tyndes ud", () => {
  const pts = Array.from({ length: 1000 }, (_, i) => [55 + i / 1e4, 10] as [number, number]);
  const t = thin(pts, 100);
  assert.equal(t.length, 100);
  assert.deepEqual(t[0], pts[0]);
  assert.deepEqual(t[99], pts[999]);
});
