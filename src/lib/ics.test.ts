import { test } from "node:test";
import assert from "node:assert/strict";
import { buildIcs } from "./ics";

test("iCal-fil med korrekt format, escaping og UTC-tider", () => {
  const ics = buildIcs("Min træning", [
    { uid: "t1", start: new Date("2026-12-01T17:00:00Z"), end: new Date("2026-12-01T18:30:00Z"), title: "Svøm, intervaller; hårdt", location: "Sportsbassin" },
  ], { name: "Testklub", domain: "testklub.dk" });
  assert.match(ics, /UID:t1@testklub\.dk\r\n/);
  assert.match(ics, /^BEGIN:VCALENDAR\r\n/);
  assert.match(ics, /DTSTART:20261201T170000Z\r\n/);
  assert.match(ics, /SUMMARY:Svøm\\, intervaller\\; hårdt/);
  assert.match(ics, /END:VCALENDAR\r\n$/);
});
