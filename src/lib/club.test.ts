import { test } from "node:test";
import assert from "node:assert/strict";
import { clubCss, clubFrom } from "./club";

test("uden variabler er det Nyborg", () => {
  const c = clubFrom({});
  assert.equal(c.name, "Nyborg Triathlon Klub");
  assert.equal(c.shortName, "NyborgTri");
  assert.equal(c.email, "nyborgtri@gmail.com");
  assert.equal(clubCss(c), "");
});

test("en anden klub arver ikke Nyborgs oplysninger", () => {
  const c = clubFrom({ CLUB_NAME: "Svendborg Triathlon", CLUB_EMAIL: "info@svendborgtri.dk", CLUB_DOMAIN: "https://svendborgtri.dk/" });
  assert.equal(c.shortName, "Svendborg Triathlon");
  assert.equal(c.logoTop, "Svendborg");
  assert.equal(c.logoSub, "Triathlon");
  assert.equal(c.email, "info@svendborgtri.dk");
  assert.equal(c.domain, "svendborgtri.dk");
  assert.equal(c.cvr, "");
  assert.equal(c.facebook, "");
  assert.equal(c.city, "");
});

test("farver: kun gyldige hex-værdier bruges, og kun ændrede kommer i CSS", () => {
  const c = clubFrom({ CLUB_COLOR_ACCENT: "#1D4ED8", CLUB_COLOR_DARK: "rød" });
  assert.equal(c.colors.accent, "#1D4ED8");
  assert.equal(c.colors.dark, "#2b323c");
  assert.equal(clubCss(c), ":root{--accent:#1D4ED8;--link:#1D4ED8;--club-dark:#1D4ED8}");
});
