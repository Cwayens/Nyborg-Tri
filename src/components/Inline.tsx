import Link from "next/link";
import { Fragment } from "react";

// Tekst fra Admin → Klubben: **fed** og [link](/sti eller https://…). Alt andet vises som almindelig tekst.
export function Inline({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)\s]+\))/g);
  return (
    <>
      {parts.map((p, i) => {
        const b = /^\*\*([^*]+)\*\*$/.exec(p);
        if (b) return <b key={i}>{b[1]}</b>;
        const l = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(p);
        if (l) {
          const href = l[2];
          if (href.startsWith("/") && !href.startsWith("//")) return <Link key={i} href={href}>{l[1]}</Link>;
          if (/^https?:\/\//i.test(href)) return <a key={i} href={href} target="_blank" rel="noopener noreferrer">{l[1]}</a>;
          return <Fragment key={i}>{l[1]}</Fragment>;
        }
        return <Fragment key={i}>{p}</Fragment>;
      })}
    </>
  );
}
