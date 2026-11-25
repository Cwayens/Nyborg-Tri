import type { AthleteGroup } from "@prisma/client";

// Import af medlemmer fra Excel (gemt som CSV) eller fra et andet foreningssystem (Conventus, Klubmodul, Holdsport m.fl.).
// Kolonnerne genkendes på overskriften, så rækkefølgen er ligegyldig.

/** Læser CSV med semikolon, komma eller tabulator, anførselstegn og dansk Excel-BOM. */
export function parseCsv(text: string): string[][] {
  const t = text.replace(/^﻿/, "");
  const first = t.split(/\r?\n/, 1)[0] ?? "";
  const sep = [";", "\t", ","].map((s) => [s, first.split(s).length] as const).sort((a, b) => b[1] - a[1])[0][0];
  const out: string[][] = [];
  let row: string[] = [], cell = "", q = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) {
      if (c === '"' && t[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === sep) { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && t[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some((x) => x.trim())) out.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x.trim())) out.push(row);
  return out.map((r) => r.map((x) => x.trim()));
}

const FIELDS = {
  name: ["navn", "name", "fulde navn", "medlem"],
  firstName: ["fornavn", "first name"],
  lastName: ["efternavn", "last name"],
  email: ["mail", "e-mail", "email", "emailadresse", "e-mailadresse"],
  phone: ["telefon", "tlf", "mobil", "phone", "mobilnummer", "telefonnummer"],
  birthDate: ["fødselsdato", "foedselsdato", "født", "birthday", "fødselsdag"],
  address: ["adresse", "address", "vej"],
  zip: ["postnr", "postnummer", "zip"],
  city: ["by", "city", "postdistrikt"],
  group: ["gruppe", "hold", "group", "team"],
  type: ["medlemstype", "kontingent", "type", "medlemskab"],
  paidUntil: ["betalt til", "medlem til", "udløber", "gyldig til", "slutdato"],
  guardianName: ["forælder", "værge", "forældernavn", "forælder navn"],
  guardianEmail: ["forældermail", "forælder mail", "værge mail", "forælder e-mail"],
} as const;
export type ImportField = keyof typeof FIELDS;

export const FIELD_LABEL: Record<ImportField, string> = {
  name: "Navn", firstName: "Fornavn", lastName: "Efternavn", email: "Mail", phone: "Telefon", birthDate: "Fødselsdato", address: "Adresse",
  zip: "Postnr.", city: "By", group: "Gruppe", type: "Medlemstype", paidUntil: "Betalt til", guardianName: "Forælder", guardianEmail: "Forælders mail",
};

const norm = (s: string) => s.toLowerCase().replace(/[^a-zæøå0-9 -]/g, "").replace(/\s+/g, " ").trim();

/** Hvilken kolonne er hvilket felt? */
export function mapHeaders(headers: string[]): Partial<Record<ImportField, number>> {
  const map: Partial<Record<ImportField, number>> = {};
  headers.forEach((h, i) => {
    const n = norm(h);
    for (const [f, names] of Object.entries(FIELDS) as [ImportField, readonly string[]][]) {
      if (map[f] === undefined && (names as readonly string[]).includes(n)) { map[f] = i; return; }
    }
  });
  return map;
}

/** "24-12-1985", "24.12.1985", "1985-12-24" og "24/12/85" til en dato (kl. 12 UTC). */
export function parseDate(v: string): Date | null {
  const s = v.trim();
  let y: number, m: number, d: number;
  let r = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);
  if (r) [y, m, d] = [+r[1], +r[2], +r[3]];
  else if ((r = /^(\d{1,2})[-./](\d{1,2})[-./](\d{2,4})$/.exec(s))) {
    [d, m, y] = [+r[1], +r[2], +r[3]];
    if (y < 100) y += y > new Date().getFullYear() % 100 ? 1900 : 2000;
  } else return null;
  const dt = new Date(Date.UTC(y, m - 1, d, 12));
  return dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d && y > 1900 && y < 2100 ? dt : null;
}

export function parseGroup(v: string): AthleteGroup | null {
  const n = norm(v);
  if (!n) return null;
  if (/elite|konkurrence|kon/.test(n)) return "ELITE";
  if (/børn|boern|barn|ungdom|junior|unge|kids/.test(n)) return "BOERN";
  if (/bredde|motion|senior|voksen|begynder/.test(n)) return "BREDDE";
  return null;
}

export type ImportRow = {
  line: number; name: string; email: string; phone: string | null; birthDate: string | null; address: string | null; zip: string | null; city: string | null;
  group: AthleteGroup | null; groupText: string | null; type: string | null; paidUntil: string | null; guardianName: string | null; guardianEmail: string | null; errors: string[];
};

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** CSV-tekst til rækker med fejl markeret. Dubletter (samme mail) i filen markeres som fejl. */
export function readMembers(text: string, maxRows = 2000): { rows: ImportRow[]; mapped: ImportField[]; missing: string[] } {
  const table = parseCsv(text);
  if (table.length < 2) return { rows: [], mapped: [], missing: ["Filen har ingen medlemmer"] };
  const map = mapHeaders(table[0]);
  const missing: string[] = [];
  if (map.email === undefined) missing.push("Der mangler en kolonne med mail");
  if (map.name === undefined && map.firstName === undefined) missing.push("Der mangler en kolonne med navn");
  const get = (r: string[], f: ImportField) => (map[f] !== undefined ? (r[map[f]!] ?? "").trim() : "");
  const seen = new Set<string>();
  const rows = table.slice(1, maxRows + 1).map((r, i): ImportRow => {
    const errors: string[] = [];
    const name = get(r, "name") || [get(r, "firstName"), get(r, "lastName")].filter(Boolean).join(" ");
    const email = get(r, "email").toLowerCase();
    if (!name) errors.push("navn mangler");
    if (!EMAIL.test(email)) errors.push("mail mangler eller er forkert");
    else if (seen.has(email)) errors.push("mailen står der to gange");
    seen.add(email);
    const bd = get(r, "birthDate"), pu = get(r, "paidUntil");
    const birth = bd ? parseDate(bd) : null, paid = pu ? parseDate(pu) : null;
    if (bd && !birth) errors.push(`fødselsdato "${bd}" kan ikke læses`);
    if (pu && !paid) errors.push(`"betalt til" "${pu}" kan ikke læses`);
    const ge = get(r, "guardianEmail").toLowerCase();
    if (ge && !EMAIL.test(ge)) errors.push("forælders mail er forkert");
    return {
      line: i + 2, name: name.slice(0, 100), email, phone: get(r, "phone").slice(0, 30) || null,
      birthDate: birth ? birth.toISOString().slice(0, 10) : null, address: get(r, "address").slice(0, 120) || null,
      zip: get(r, "zip").slice(0, 10) || null, city: get(r, "city").slice(0, 60) || null, group: parseGroup(get(r, "group")), groupText: get(r, "group").slice(0, 60) || null,
      type: get(r, "type").slice(0, 60) || null, paidUntil: paid ? paid.toISOString().slice(0, 10) : null,
      guardianName: get(r, "guardianName").slice(0, 100) || null, guardianEmail: ge || null, errors,
    };
  });
  return { rows, mapped: (Object.keys(map) as ImportField[]), missing };
}
