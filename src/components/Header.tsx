import Link from "next/link";
import { auth } from "@/auth";
import { navigation } from "@/lib/navigation";
import { hasRole } from "@/lib/roles";

export async function Header() {
  const session = await auth();
  return (
    <header className="site-header">
      <div className="wrap header-row">
        <Link href="/" className="logo">
          Nyborg<span>Tri</span>
        </Link>
        <nav aria-label="Hovedmenu">
          <ul className="menu">
            {navigation.map((item) => (
              <li key={item.label}>
                {item.href ? (
                  <Link href={item.href}>{item.label}</Link>
                ) : (
                  <details>
                    <summary>{item.label}</summary>
                    <ul>
                      {item.children?.map((c) => (
                        <li key={c.href}>
                          <Link href={c.href!}>{c.label}</Link>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </li>
            ))}
          </ul>
        </nav>
        <div className="account">
          {session?.user ? (
            <>
              {hasRole(session.user.role, "TRAINER") && <Link href="/traener">Træner</Link>}
              {session.user.role === "ADMIN" && <Link href="/admin">Admin</Link>}
              <Link href="/min-side" className="button small">Min side</Link>
            </>
          ) : (
            <Link href="/login" className="button small">Log ind</Link>
          )}
        </div>
      </div>
    </header>
  );
}
