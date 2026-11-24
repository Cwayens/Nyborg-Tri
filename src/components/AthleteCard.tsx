import Link from "next/link";
import { initials } from "./Icons";

type P = { slug: string; headline: string | null; photo: string | null; user: { name: string | null } };

export function AthletePhoto({ a, className }: { a: P; className?: string }) {
  const name = a.user.name ?? "Atlet";
  return a.photo
    ? <img src={a.photo} alt={name} className={className} />
    : <span className={`athlete-noimg ${className ?? ""}`} aria-hidden="true">{initials(name)}</span>;
}

export function AthleteCard({ a }: { a: P }) {
  return (
    <Link href={`/atleter/${a.slug}`} className="athlete-card">
      <AthletePhoto a={a} className="athlete-card-img" />
      <span className="athlete-card-body">
        <b>{a.user.name}</b>
        {a.headline && <small>{a.headline}</small>}
      </span>
    </Link>
  );
}
