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

// Træningssteder på kortet. Ret her, hvis klubben flytter træning.
export const PLACES: { name: string; what: string; query: string }[] = [
  { name: "Nyborg Idræts- og Fritidscenter", what: "Svømning og indoor bike", query: "Nyborg Idræts- og Fritidscenter" },
  { name: "P-pladsen ved idrætscentret", what: "Start på cykel- og løbeture", query: "Nyborg Idræts- og Fritidscenter parkering" },
  { name: "Idrætsparken", what: "Intervalløb på banen", query: "Idrætsparken Nyborg" },
  { name: "Nyborg Vold", what: "Løb rundt om volden", query: "Nyborg Vold" },
];

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
