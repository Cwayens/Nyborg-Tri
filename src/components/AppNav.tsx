"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarIcon, ChartIcon, ChatIcon, HomeIcon, TrophyIcon, UsersIcon } from "./Icons";
import type { Locale } from "@/lib/i18n-core";

// Hovedfunktionerne for medlemmer. Vises i toppen på computer og som fanebjælke i bunden på mobil.
export const APP_ITEMS = [
  { href: "/min-side", label: "Overblik", en: "Overview", Icon: HomeIcon },
  { href: "/kalender", label: "Kalender", en: "Calendar", Icon: CalendarIcon },
  { href: "/traen-sammen", label: "Træn sammen", en: "Train together", Icon: UsersIcon },
  { href: "/chat", label: "Chat", en: "Chat", Icon: ChatIcon },
  { href: "/leaderboard", label: "Leaderboard", en: "Leaderboard", Icon: TrophyIcon },
  { href: "/statistik", label: "Statistik", en: "Statistics", Icon: ChartIcon },
];

export function AppNav({ variant, hidden = [], loc = "da" }: { variant: "top" | "bottom"; hidden?: string[]; loc?: Locale }) {
  const path = usePathname();
  return (
    <nav className={variant === "top" ? "appnav-top" : "tabbar"} aria-label={loc === "en" ? "Member menu" : variant === "top" ? "Medlemsmenu" : "Medlemsmenu (mobil)"}>
      {APP_ITEMS.filter((i) => !hidden.includes(i.href)).map(({ href, label, en, Icon }) => (
        <Link key={href} href={href} aria-current={path.startsWith(href) ? "page" : undefined}>
          <Icon size={variant === "top" ? 18 : 22} />
          <span>{loc === "en" ? en : label}</span>
        </Link>
      ))}
    </nav>
  );
}
