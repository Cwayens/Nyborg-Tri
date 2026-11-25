import Link from "next/link";
import { ChevronIcon } from "./Icons";

export type QuickLink = { href: string; icon: React.ReactNode; title: string; text?: string };

/** Genveje som små kort med ikon, titel og en kort forklaring. Bruges i stedet for rækker af links med prikker imellem. */
export function QuickLinks({ links, label }: { links: QuickLink[]; label?: string }) {
  return (
    <nav className="quicklinks" aria-label={label}>
      {links.map((l) => (
        <Link key={l.href} href={l.href} className="quicklink">
          <span className="ql-icon">{l.icon}</span>
          <span className="ql-body"><strong>{l.title}</strong>{l.text && <small>{l.text}</small>}</span>
          <span className="ql-arrow"><ChevronIcon /></span>
        </Link>
      ))}
    </nav>
  );
}
