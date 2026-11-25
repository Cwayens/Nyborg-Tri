import { test } from "node:test";
import assert from "node:assert/strict";
import { guessDiscipline, parseIcs } from "./ics-import";

const ICS = [
  "BEGIN:VCALENDAR", "VERSION:2.0",
  "BEGIN:VEVENT", "UID:tp-1", "DTSTART;VALUE=DATE:20261201", "SUMMARY:Bike: Sweet spot 3x12", "DESCRIPTION:Planned Time: 1:15:00\\nHold 90% af FTP", "END:VEVENT",
  "BEGIN:VEVENT", "UID:tp-2", "DTSTART:20261202T053000Z", "DTEND:20261202T063000Z", "SUMMARY:Løb\\, rolig", "END:VEVENT",
  "BEGIN:VEVENT", "UID:tp-3", "DTSTART;TZID=Europe/Copenhagen:20261203T180000", "DURATION:PT45M", "SUMMARY:Swim technique", "DESCRIPTION:Lang beskri", " velse", "END:VEVENT",
  "BEGIN:VEVENT", "UID:x", "SUMMARY:Uden dato", "END:VEVENT",
  "END:VCALENDAR",
].join("\r\n");

test("kalenderfil fra TrainingPeaks m.fl.", () => {
  const r = parseIcs(ICS);
  assert.equal(r.length, 3);
  assert.deepEqual(r[0], { uid: "tp-1", day: "2026-12-01", time: null, title: "Sweet spot 3x12", description: "Planned Time: 1:15:00\nHold 90% af FTP", durationMin: 75, discipline: "BIKE" });
  assert.equal(r[1].time, "06:30"); // UTC til dansk tid
  assert.equal(r[1].durationMin, 60);
  assert.equal(r[1].title, "Løb, rolig");
  assert.equal(r[1].discipline, "RUN");
  assert.equal(r[2].time, "18:00");
  assert.equal(r[2].durationMin, 45);
  assert.equal(r[2].description, "Lang beskrivelse");
  assert.equal(r[2].discipline, "SWIM");
});

test("ikke en kalender", () => assert.throws(() => parseIcs("hej"), /kalenderfil/));

test("sport gættes ud fra titlen", () => {
  assert.equal(guessDiscipline("Zwift race"), "BIKE");
  assert.equal(guessDiscipline("Core og styrke"), "STRENGTH");
  assert.equal(guessDiscipline("Hvile"), "OTHER");
});
