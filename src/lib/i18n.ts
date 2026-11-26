import { cache } from "react";
import { isLocale, translator, type Locale, type T } from "./i18n-core";
import { clubEnv } from "./club-secrets";

export * from "./i18n-core";

// Sprog: dansk (standard) og engelsk. Den besøgende vælger i sidefoden (cookie "lang").
// Klubben kan gøre engelsk til standard med sin indstilling CLUB_LANG=en (fx et internationalt netværk).
// Tekster skrives som par direkte i koden: t("Træning", "Training"), så de to sprog står side om side.

/** Klubbens standardsprog (CLUB_LANG, fx "en" for et internationalt netværk). */
async function clubLocale(): Promise<Locale> {
  const v = await clubEnv("CLUB_LANG").catch(() => undefined);
  return isLocale(v) ? v : "da";
}

/** Sproget for den aktuelle forespørgsel. Uden for en forespørgsel: klubbens standard. */
export const getLocale = cache(async (): Promise<Locale> => {
  try {
    const { cookies } = await import("next/headers");
    const v = (await cookies()).get("lang")?.value;
    return isLocale(v) ? v : await clubLocale();
  } catch {
    return clubLocale();
  }
});

/** Oversætter for den aktuelle forespørgsel: const t = await tr(); t("Kalender", "Calendar") */
export async function tr(): Promise<T> {
  return translator(await getLocale());
}
