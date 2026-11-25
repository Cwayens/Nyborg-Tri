import { cache } from "react";
import { defaultLocale, isLocale, translator, type Locale, type T } from "./i18n-core";

export * from "./i18n-core";

// Sprog: dansk (standard) og engelsk. Den besøgende vælger i sidefoden (cookie "lang").
// Klubben kan gøre engelsk til standard med CLUB_LANG=en (fx et internationalt netværk).
// Tekster skrives som par direkte i koden: t("Træning", "Training"), så de to sprog står side om side.

/** Sproget for den aktuelle forespørgsel. Uden for en forespørgsel: klubbens standard. */
export const getLocale = cache(async (): Promise<Locale> => {
  try {
    const { cookies } = await import("next/headers");
    const v = (await cookies()).get("lang")?.value;
    return isLocale(v) ? v : defaultLocale();
  } catch {
    return defaultLocale();
  }
});

/** Oversætter for den aktuelle forespørgsel: const t = await tr(); t("Kalender", "Calendar") */
export async function tr(): Promise<T> {
  return translator(await getLocale());
}
