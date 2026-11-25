// Sprog uden serverafhængigheder, så det også kan bruges i klientkomponenter. Se i18n.ts.

export type Locale = "da" | "en";
export const LOCALES: Locale[] = ["da", "en"];
export const LOCALE_NAME: Record<Locale, string> = { da: "Dansk", en: "English" };
/** BCP 47-kode til datoer og tal */
export const INTL: Record<Locale, string> = { da: "da-DK", en: "en-GB" };

export const isLocale = (v: unknown): v is Locale => v === "da" || v === "en";
export const defaultLocale = (): Locale => (isLocale(process.env.CLUB_LANG) ? process.env.CLUB_LANG : "da");

export type T = (da: string, en: string) => string;
export const translator = (loc: Locale): T => (da, en) => (loc === "en" ? en : da);

