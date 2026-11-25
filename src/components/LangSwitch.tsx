"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { LOCALE_NAME, type Locale } from "@/lib/i18n-core";

/** Link til det andet sprog. Bliver på samme side. */
export function LangSwitch({ current }: { current: Locale }) {
  const path = usePathname();
  const q = useSearchParams().toString();
  const other: Locale = current === "da" ? "en" : "da";
  const to = `${path}${q ? `?${q}` : ""}`;
  return (
    <a href={`/sprog?l=${other}&til=${encodeURIComponent(to)}`} hrefLang={other} lang={other} className="lang-switch">
      {other === "en" ? "🇬🇧 " : "🇩🇰 "}{LOCALE_NAME[other]}
    </a>
  );
}
