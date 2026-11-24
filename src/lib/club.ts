// Faste oplysninger om klubben, brugt i sidefoden, på Om klubben og på Kontakt.
export const CLUB = {
  name: "Nyborg Triathlon Klub",
  email: "nyborgtri@gmail.com",
  cvr: "34371571",
  bank: "Spar Nord, reg. 9227 konto 4585724934",
  facebook: "https://www.facebook.com/NyborgTri",
};

export const TOPICS = ["Prøvetræning", "Medlemskab", "Sponsorat", "Stævner", "Andet"] as const;

/** Hvor kontaktformularen sendes hen. */
export const contactInbox = () => process.env.CONTACT_EMAIL || CLUB.email;

// Træningssteder på kortet. Ret her, hvis klubben flytter træning. Koordinater fra OpenStreetMap og den gamle side.
export type Place = { id: string; name: string; what: string; query: string; lat: number; lng: number; home?: boolean };
export const PLACES: Place[] = [
  { id: "idraetscenter", name: "Nyborg Idræts- og Fritidscenter", what: "Klubbens base: svømning, indoor bike og start på cykel- og løbeture fra P-pladsen", query: "Nyborg Idræts- og Fritidscenter", lat: 55.31176, lng: 10.81017, home: true },
  { id: "idraetsparken", name: "Idrætsparken", what: "Intervalløb på banen", query: "Idrætsparken Nyborg", lat: 55.30993, lng: 10.81308 },
  { id: "volden", name: "Nyborg Vold og Eksercerpladsen", what: "Løb rundt om volden og Ladegårdssøen", query: "Eksercerpladsen Lindealleen Nyborg", lat: 55.31489, lng: 10.79033 },
  { id: "storebaeltsbadet", name: "Storebæltsbadet", what: "Svømning i åbent vand om sommeren", query: "Storebæltsbadet Nyborg", lat: 55.31419, lng: 10.81486 },
  { id: "strand", name: "Nyborg Strand", what: "Start og mål for stævnet NyborgTri 4-18-4", query: "Hotel Nyborg Strand", lat: 55.31758, lng: 10.81305 },
];
export const HOME = PLACES.find((p) => p.home)!;

export const mapsUrl = (q: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q + ", 5800 Nyborg")}`;

/** "22446633" bliver til "22 44 66 33", og tel:-linket får +45. */
export function formatPhone(p: string): string {
  const d = p.replace(/\D/g, "");
  return d.length === 8 ? d.replace(/(\d{2})(?=\d)/g, "$1 ") : p;
}
export function telHref(p: string): string {
  const d = p.replace(/[^\d+]/g, "");
  return `tel:${/^\d{8}$/.test(d) ? "+45" + d : d}`;
}
