"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarIcon, ChartIcon, ChatIcon, HomeIcon, TrophyIcon, UsersIcon } from "./Icons";

// Hovedfunktionerne for medlemmer. Vises i toppen på computer og som fanebjælke i bunden på mobil.
export const APP_ITEMS = [
  { href: "/min-side", label: "Overblik", Icon: HomeIcon },
  { href: "/kalender", label: "Kalender", Icon: CalendarIcon },
  { href: "/traen-sammen", label: "Træn sammen", Icon: UsersIcon },
  { href: "/chat", label: "Chat", Icon: ChatIcon },
  { href: "/leaderboard", label: "Leaderboard", Icon: TrophyIcon },
  { href: "/statistik", label: "Statistik", Icon: ChartIcon },
];

export function AppNav({ variant }: { variant: "top" | "bottom" }) {
  const path = usePathname();
  return (
    <nav className={variant === "top" ? "appnav-top" : "tabbar"} aria-label={variant === "top" ? "Medlemsmenu" : "Medlemsmenu (mobil)"}>
      {APP_ITEMS.map(({ href, label, Icon }) => (
        <Link key={href} href={href} aria-current={path.startsWith(href) ? "page" : undefined}>
          <Icon size={variant === "top" ? 18 : 22} />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}
