// Klubbens identitet: navn, logo, farver og kontaktoplysninger. Alt andet i koden læser herfra, så samme kode
// kan køre for en anden klub ved kun at sætte miljøvariabler (CLUB_*) i dens egen installation. Uden variabler er
// det Nyborg Triathlon Klub. Se docs/ny-klub.md.

export type ClubConfig = {
  name: string; // fulde navn, fx "Nyborg Triathlon Klub"
  shortName: string; // kort navn i mails og på hjemmeskærmen, fx "NyborgTri"
  logoTop: string; // logo-tekstens første linje
  logoSub: string; // logo-tekstens anden linje
  logoImage: string; // billede ved siden af teksten (i /public)
  tagline: string; // kort beskrivelse til søgemaskiner
  email: string;
  cvr: string;
  bank: string;
  facebook: string;
  domain: string; // uden https://, fx "nyborgtri.dk"
  city: string;
  zip: string;
  colors: { accent: string; accentDark: string; dark: string; light: string; green: string; theme: string };
};

const NYBORG: ClubConfig = {
  name: "Nyborg Triathlon Klub",
  shortName: "NyborgTri",
  logoTop: "Nyborg",
  logoSub: "Triathlon Klub",
  logoImage: "/logo-mark.webp",
  tagline: "Din triatlonklub på Østfyn. Svømning, cykling og løb for alle niveauer.",
  email: "nyborgtri@gmail.com",
  cvr: "34371571",
  bank: "Spar Nord, reg. 9227 konto 4585724934",
  facebook: "https://www.facebook.com/NyborgTri",
  domain: "nyborgtri.dk",
  city: "Nyborg",
  zip: "5800",
  colors: { accent: "#00803f", accentDark: "#006b35", dark: "#2b323c", light: "#b5d77e", green: "#8fbb3f", theme: "#454e5c" },
};

const HEX = /^#[0-9a-f]{6}$/i;

/** Læser klubbens opsætning fra miljøvariabler. Tomme eller ugyldige værdier falder tilbage til Nyborg. */
export function clubFrom(env: Record<string, string | undefined>): ClubConfig {
  const v = (k: string, d: string) => env[k]?.trim() || d;
  const c = (k: string, d: string) => (HEX.test(env[k]?.trim() ?? "") ? env[k]!.trim() : d);
  const name = v("CLUB_NAME", NYBORG.name);
  const own = name !== NYBORG.name; // en anden klub: brug ikke Nyborgs oplysninger som standard
  const d = (x: string) => (own ? "" : x);
  return {
    name,
    shortName: v("CLUB_SHORT_NAME", own ? name : NYBORG.shortName),
    logoTop: v("CLUB_LOGO_TOP", own ? name.split(" ")[0] : NYBORG.logoTop),
    logoSub: v("CLUB_LOGO_SUB", own ? name.split(" ").slice(1).join(" ") : NYBORG.logoSub),
    logoImage: v("CLUB_LOGO_IMAGE", NYBORG.logoImage),
    tagline: v("CLUB_TAGLINE", own ? `${name}. Svømning, cykling og løb for alle niveauer.` : NYBORG.tagline),
    email: v("CLUB_EMAIL", d(NYBORG.email)),
    cvr: v("CLUB_CVR", d(NYBORG.cvr)),
    bank: v("CLUB_BANK", d(NYBORG.bank)),
    facebook: v("CLUB_FACEBOOK", d(NYBORG.facebook)),
    domain: v("CLUB_DOMAIN", d(NYBORG.domain)).replace(/^https?:\/\//, "").replace(/\/$/, ""),
    city: v("CLUB_CITY", d(NYBORG.city)),
    zip: v("CLUB_ZIP", d(NYBORG.zip)),
    colors: {
      accent: c("CLUB_COLOR_ACCENT", NYBORG.colors.accent),
      accentDark: c("CLUB_COLOR_ACCENT_DARK", NYBORG.colors.accentDark),
      dark: c("CLUB_COLOR_DARK", NYBORG.colors.dark),
      light: c("CLUB_COLOR_LIGHT", NYBORG.colors.light),
      green: c("CLUB_COLOR_SECOND", NYBORG.colors.green),
      theme: c("CLUB_COLOR_THEME", NYBORG.colors.theme),
    },
  };
}

/** Klubbens oplysninger fra miljøvariabler (standard). Admin kan rette dem under Admin → Klubben, se applyClubOverrides. */
export const ENV_CLUB = clubFrom(process.env);
let current: ClubConfig = ENV_CLUB;

/** Det admin har gemt under Admin → Klubben. Tomme felter og ugyldige farver beholder standarden. */
export type ClubOverrides = Partial<Omit<ClubConfig, "colors">> & { colors?: Partial<ClubConfig["colors"]> };

export function mergeClub(base: ClubConfig, o: ClubOverrides | null | undefined): ClubConfig {
  if (!o) return base;
  const out: ClubConfig = { ...base, colors: { ...base.colors } };
  for (const [k, v] of Object.entries(o)) {
    if (k === "colors" || typeof v !== "string" || !v.trim() || !(k in base)) continue;
    (out as Record<string, unknown>)[k] = k === "domain" ? v.trim().replace(/^https?:\/\//, "").replace(/\/$/, "") : v.trim();
  }
  for (const [k, v] of Object.entries(o.colors ?? {})) if (k in out.colors && typeof v === "string" && HEX.test(v.trim())) (out.colors as Record<string, string>)[k] = v.trim();
  return out;
}

/** Bruges af src/lib/site.ts, når klubbens oplysninger er læst fra databasen. */
export function applyClubOverrides(o: ClubOverrides | null | undefined) {
  current = mergeClub(ENV_CLUB, o);
}

/** Klubbens oplysninger. Læses altid frisk, så ændringer fra Admin → Klubben slår igennem uden ny udgivelse. */
export const CLUB: ClubConfig = new Proxy({} as ClubConfig, {
  get: (_t, k) => (current as Record<string | symbol, unknown>)[k],
  ownKeys: () => Reflect.ownKeys(current),
  getOwnPropertyDescriptor: (_t, k) => ({ enumerable: true, configurable: true, value: (current as Record<string | symbol, unknown>)[k] }),
});

/** CSS, der giver siden klubbens farver. Tom, når farverne er Nyborgs (de står allerede i globals.css). */
export function clubCss(club: ClubConfig = CLUB): string {
  const k = club.colors, n = NYBORG.colors;
  const rules: string[] = [];
  if (k.accent !== n.accent) rules.push(`--accent:${k.accent}`, `--link:${k.accent}`, `--club-dark:${k.accent}`);
  if (k.accentDark !== n.accentDark) rules.push(`--accent-dark:${k.accentDark}`);
  if (k.dark !== n.dark) rules.push(`--navy:${k.dark}`);
  if (k.light !== n.light) rules.push(`--club-light:${k.light}`);
  if (k.green !== n.green) rules.push(`--club-green:${k.green}`, `--teal:${k.green}`);
  if (k.theme !== n.theme) rules.push(`--sea:${k.theme}`);
  return rules.length ? `:root{${rules.join(";")}}` : "";
}

/** Fuld adresse til siden, fx til links i mails. */
export const siteUrl = () => process.env.AUTH_URL || process.env.NEXT_PUBLIC_SITE_URL || (CLUB.domain ? `https://${CLUB.domain}` : "http://localhost:3000");

export const TOPICS = ["Prøvetræning", "Medlemskab", "Sponsorat", "Stævner", "Andet"] as const;

/** Hvor kontaktformularen sendes hen. */
export const contactInbox = () => process.env.CONTACT_EMAIL || CLUB.email;

// Træningssteder på kortet. Ret her, hvis klubben flytter træning. Koordinater fra OpenStreetMap og den gamle side.
export type Place = { id: string; name: string; what: string; query: string; lat: number; lng: number; home?: boolean };
/** Standard-træningssteder (Nyborg). Admin kan rette dem under Admin → Klubben; brug getPlaces() i src/lib/site.ts. */
export const PLACES: Place[] = [
  { id: "idraetscenter", name: "Nyborg Idræts- og Fritidscenter", what: "Klubbens base: svømning, indoor bike og start på cykel- og løbeture fra P-pladsen", query: "Nyborg Idræts- og Fritidscenter", lat: 55.31176, lng: 10.81017, home: true },
  { id: "idraetsparken", name: "Idrætsparken", what: "Intervalløb på banen", query: "Idrætsparken Nyborg", lat: 55.30993, lng: 10.81308 },
  { id: "volden", name: "Nyborg Vold og Eksercerpladsen", what: "Løb rundt om volden og Ladegårdssøen", query: "Eksercerpladsen Lindealleen Nyborg", lat: 55.31489, lng: 10.79033 },
  { id: "storebaeltsbadet", name: "Storebæltsbadet", what: "Svømning i åbent vand om sommeren", query: "Storebæltsbadet Nyborg", lat: 55.31419, lng: 10.81486 },
  { id: "strand", name: "Nyborg Strand", what: "Start og mål for stævnet NyborgTri 4-18-4", query: "Hotel Nyborg Strand", lat: 55.31758, lng: 10.81305 },
];
export const HOME = PLACES.find((p) => p.home)!;

export const mapsUrl = (q: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(CLUB.city ? `${q}, ${CLUB.zip} ${CLUB.city}`.trim() : q)}`;

/** "22446633" bliver til "22 44 66 33", og tel:-linket får +45. */
export function formatPhone(p: string): string {
  const d = p.replace(/\D/g, "");
  return d.length === 8 ? d.replace(/(\d{2})(?=\d)/g, "$1 ") : p;
}
export function telHref(p: string): string {
  const d = p.replace(/[^\d+]/g, "");
  return `tel:${/^\d{8}$/.test(d) ? "+45" + d : d}`;
}
