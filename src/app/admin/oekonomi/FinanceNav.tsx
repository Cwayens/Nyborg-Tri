import Link from "next/link";

const TABS = [
  ["", "Overblik"],
  ["/posteringer", "Posteringer"],
  ["/budget", "Budget"],
  ["/restancer", "Restancer"],
] as const;

/** Faner i økonomimodulet. Året følger med fra fane til fane. */
export function FinanceNav({ active, year }: { active: (typeof TABS)[number][0]; year: number }) {
  return (
    <nav className="tabs" aria-label="Økonomi">
      {TABS.map(([path, label]) => (
        <Link key={path} href={`/admin/oekonomi${path}${path === "/restancer" ? "" : `?aar=${year}`}`} className={path === active ? "active" : undefined} aria-current={path === active ? "page" : undefined}>{label}</Link>
      ))}
      <a href={`/admin/oekonomi/eksport.csv?aar=${year}`}>Eksport til bogføring (CSV)</a>
    </nav>
  );
}

/** Året fra ?aar=, ellers indeværende år. */
export const yearParam = (v: string | undefined) => {
  const y = Number(v);
  return y >= 2000 && y <= 2100 ? y : new Date().getFullYear();
};

export function YearPicker({ year, path }: { year: number; path: string }) {
  return (
    <p className="filters">
      <Link href={`/admin/oekonomi${path}?aar=${year - 1}`}>← {year - 1}</Link>
      <span className="active" aria-current="true">{year}</span>
      {year < new Date().getFullYear() + 1 && <Link href={`/admin/oekonomi${path}?aar=${year + 1}`}>{year + 1} →</Link>}
    </p>
  );
}
