"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export type MenuGroup = { label: string; items: [href: string, label: string][] };

/** Det mest specifikke punkt, der matcher adressen, er det aktive (fx /admin/indhold/123 → Nyheder og sider). */
function activeHref(path: string, groups: MenuGroup[]) {
  const hrefs = groups.flatMap((g) => g.items.map(([h]) => h));
  return hrefs.filter((h) => path === h || path.startsWith(`${h}/`)).sort((a, b) => b.length - a.length)[0];
}

export function AdminMenu({ groups }: { groups: MenuGroup[] }) {
  const active = activeHref(usePathname(), groups);
  return (
    <nav className="admin-menu" aria-label="Administration">
      <p className="admin-menu-title">Administration</p>
      {groups.map((g) => (
        <div key={g.label} className="admin-menu-group">
          <p className="admin-menu-head">{g.label}</p>
          <ul>
            {g.items.map(([href, label]) => (
              <li key={href}>
                <Link href={href} className={href === active ? "active" : undefined} aria-current={href === active ? "page" : undefined}>{label}</Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
      <a className="admin-menu-dl" href="/admin/medlemmer.csv">⤓ Medlemsliste (CSV)</a>
    </nav>
  );
}
