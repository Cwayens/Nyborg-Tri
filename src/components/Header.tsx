import Link from "next/link";
import { auth, signOut } from "@/auth";
import { navigation } from "@/lib/navigation";
import { hasRole } from "@/lib/roles";
import { membershipExpired } from "@/lib/access";
import { dato } from "@/lib/format";
import { AppNav } from "./AppNav";
import { hiddenHrefs } from "@/lib/features";
import { Logo, MenuIcon, initials } from "./Icons";
import { CLUB } from "@/lib/club";

export async function Header() {
  const session = await auth();
  const user = session?.user;
  const expired = user ? await membershipExpired(user.id) : null;
  const hidden = await hiddenHrefs();
  const nav = navigation.filter((i) => !hidden.includes(i.href));

  async function logout() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  return (
    <>
      <header className="site-header">
        <div className="wrap header-row">
          <Link href="/" className="logo" aria-label={`${CLUB.name} – til forsiden`}>
            <Logo />
          </Link>

          {user ? (
            <>
              <AppNav variant="top" hidden={hidden} />
              <details className="usermenu">
                <summary aria-label="Min profil og menu">
                  <span className="avatar big">{initials(user.name ?? user.email)}</span>
                </summary>
                <div className="dropdown">
                  <div className="dropdown-head">
                    <strong>{user.name ?? "Min profil"}</strong>
                    <span className="muted">{user.email}</span>
                  </div>
                  <Link href="/profil">Min profil</Link>
                  {!hidden.includes("/benchmarks") && <Link href="/benchmarks">Mine tests</Link>}
                  <Link href="/aktiviteter">Mine aktiviteter</Link>
                  <Link href="/forbindelser">Ure, apps og kalender</Link>
                  <Link href="/bliv-medlem">Medlemskab og betaling</Link>
                  {hasRole(user.role, "TRAINER") && <Link href="/traener">Trænerværktøj</Link>}
                  {user.role === "ADMIN" && <Link href="/admin">Administration</Link>}
                  <div className="dropdown-sep" />
                  <Link href="/klubben">Klubinfo og nyheder</Link>
                  <form action={logout}>
                    <button type="submit" className="linklike">Log ud</button>
                  </form>
                </div>
              </details>
            </>
          ) : (
            <>
              <nav aria-label="Hovedmenu" className="publicnav">
                <ul className="menu">
                  {nav.map((item) => (
                    <li key={item.href}><Link href={item.href}>{item.label}</Link></li>
                  ))}
                </ul>
              </nav>
              <div className="account">
                <Link href="/login" className="hide-sm">Log ind</Link>
                <Link href="/bliv-medlem" className="button small">Bliv medlem</Link>
              </div>
              <details className="burger">
                <summary aria-label="Åbn menu"><MenuIcon /></summary>
                <div className="burger-panel">
                  {nav.map((item) => <Link key={item.href} href={item.href}>{item.label}</Link>)}
                  <Link href="/bliv-medlem">Bliv medlem</Link>
                  <Link href="/login">Log ind</Link>
                </div>
              </details>
            </>
          )}
        </div>
      </header>
      {expired && (
        <div className="unpaid-bar" role="status">
          <div className="wrap">
            <strong>Mangler betaling.</strong> Dit medlemskab udløb {dato(expired.endDate)}, så du kan ikke tilmelde dig træninger.{" "}
            <Link href="/bliv-medlem">Forny medlemskab</Link>
          </div>
        </div>
      )}
      {user && <AppNav variant="bottom" hidden={hidden} />}
    </>
  );
}
