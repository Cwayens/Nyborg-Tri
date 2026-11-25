import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCsv, parseDate, parseGroup, readMembers } from "./member-import";

test("CSV fra dansk Excel", () => {
  assert.deepEqual(parseCsv('﻿Navn;Mail\r\n"Hansen; Jens";jens@x.dk\r\n\r\n'), [["Navn", "Mail"], ["Hansen; Jens", "jens@x.dk"]]);
  assert.deepEqual(parseCsv("a,b\n1,\"2\"\"x\"\n"), [["a", "b"], ["1", '2"x']]);
});

test("datoer og grupper", () => {
  assert.equal(parseDate("24-12-1985")?.toISOString().slice(0, 10), "1985-12-24");
  assert.equal(parseDate("1985-12-24")?.toISOString().slice(0, 10), "1985-12-24");
  assert.equal(parseDate("31.02.2020"), null);
  assert.equal(parseGroup("Ungdom"), "BOERN");
  assert.equal(parseGroup("Motionist"), "BREDDE");
  assert.equal(parseGroup(""), null);
});

test("medlemsliste fra et andet system", () => {
  const csv = "Fornavn;Efternavn;E-mail;Mobil;Fødselsdato;Hold;Medlemstype;Betalt til\n" +
    "Jens;Hansen;JENS@x.dk;22334455;01-02-1980;Elite;Voksen;31-12-2026\n" +
    "Mia;;mia@x.dk;;;Børn;;\n" +
    "Uden;Mail;;;;;;\n" +
    "Igen;Jens;jens@x.dk;;dårlig;;;\n";
  const r = readMembers(csv);
  assert.deepEqual(r.missing, []);
  assert.equal(r.rows[0].name, "Jens Hansen");
  assert.equal(r.rows[0].email, "jens@x.dk");
  assert.equal(r.rows[0].group, "ELITE");
  assert.equal(r.rows[0].paidUntil, "2026-12-31");
  assert.deepEqual(r.rows[1].errors, []);
  assert.deepEqual(r.rows[2].errors, ["mail mangler eller er forkert"]);
  assert.equal(r.rows[3].errors.length, 2);
  assert.deepEqual(readMembers("Navn\nJens").missing, ["Der mangler en kolonne med mail"]);
});
