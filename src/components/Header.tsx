import Link from "next/link";
import { auth, signOut } from "@/auth";
import { navigation } from "@/lib/navigation";
import { hasRole } from "@/lib/roles";
import { membershipEndingSoon, membershipExpired } from "@/lib/access";
import { dato } from "@/lib/format";
import { AppNav } from "./AppNav";
import { hiddenHrefs } from "@/lib/features";
import { Logo, MenuIcon, initials } from "./Icons";
import { getClub } from "@/lib/site";
import { staffOf } from "@/lib/staff";
import { getLocale, translator } from "@/lib/i18n";

export async function Header() {
  const CLUB = await getClub();
  const session = await auth();
  const user = session?.user;
  const staff = user ? await staffOf(user.id) : null;
  const expired = user ? await membershipExpired(user.id) : null;
  const endingSoon = user && !expired ? await membershipEndingSoon(user.id) : null;
  const hidden = await hiddenHrefs();
  const loc = await getLocale();
  const t = translator(loc);
  const nav = navigation.filter((i) => !hidden.includes(i.href));

  async function logout() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  return (
    <>
      <header className="site-header">
        <div className="wrap header-row">
          <Link href="/" className="logo" aria-label={`${CLUB.name} – ${t("til forsiden", "home")}`}>
            <Logo club={CLUB} />
          </Link>

          {user ? (
            <>
              <AppNav variant="top" hidden={hidden} loc={loc} />
              <details className="usermenu">
                <summary aria-label={t("Min profil og menu", "My profile and menu")}>
                  <span className="avatar big">{initials(user.name ?? user.email)}</span>
                </summary>
                <div className="dropdown">
                  <div className="dropdown-head">
                    <strong>{user.name ?? t("Min profil", "My profile")}</strong>
                    <span className="muted">{user.email}</span>
                  </div>
                  <Link href="/profil">{t("Min profil", "My profile")}</Link>
                  {!hidden.includes("/benchmarks") && <Link href="/benchmarks">{t("Mine tests", "My tests")}</Link>}
                  <Link href="/aktiviteter">{t("Mine aktiviteter", "My activities")}</Link>
                  <Link href="/forbindelser">{t("Ure, apps og kalender", "Watches, apps and calendar")}</Link>
                  <Link href="/bliv-medlem">{t("Medlemskab og betaling", "Membership and payment")}</Link>
                  {hasRole(user.role, "TRAINER") ? <Link href="/traener">{t("Trænerværktøj", "Coach tools")}</Link> : staff && staff.leads.length > 0 && <Link href="/traener">{t("Holdleder", "Team leader")}</Link>}
                  {user.role === "ADMIN" ? <Link href="/admin">{t("Administration", "Admin")}</Link> : staff?.duties.includes("TREASURER") && <Link href="/admin/oekonomi">{t("Økonomi", "Finance")}</Link>}
                  <div className="dropdown-sep" />
                  <Link href="/klubben">{t("Klubinfo og nyheder", "Club info and news")}</Link>
                  <form action={logout}>
                    <button type="submit" className="linklike">{t("Log ud", "Log out")}</button>
                  </form>
                </div>
              </details>
            </>
          ) : (
            <>
              <nav aria-label={t("Hovedmenu", "Main menu")} className="publicnav">
                <ul className="menu">
                  {nav.map((item) => (
                    <li key={item.href}><Link href={item.href}>{loc === "en" && item.en ? item.en : item.label}</Link></li>
                  ))}
                </ul>
              </nav>
              <div className="account">
                <Link href="/login" className="hide-sm">{t("Log ind", "Log in")}</Link>
                <Link href="/bliv-medlem" className="button small">{t("Bliv medlem", "Join")}</Link>
              </div>
              <details className="burger">
                <summary aria-label={t("Åbn menu", "Open menu")}><MenuIcon /></summary>
                <div className="burger-panel">
                  {nav.map((item) => <Link key={item.href} href={item.href}>{loc === "en" && item.en ? item.en : item.label}</Link>)}
                  <Link href="/bliv-medlem">{t("Bliv medlem", "Join")}</Link>
                  <Link href="/login">{t("Log ind", "Log in")}</Link>
                </div>
              </details>
            </>
          )}
        </div>
      </header>
      {expired && (
        <div className="unpaid-bar" role="status">
          <div className="wrap">
            <strong>{t("Mangler betaling.", "Payment due.")}</strong> {t(`Dit medlemskab udløb ${dato(expired.endDate)}, så du kan ikke tilmelde dig træninger.`, `Your membership expired on ${dato(expired.endDate, loc)}, so you can't sign up for trainings.`)}{" "}
            <Link href="/bliv-medlem">{t("Forny medlemskab", "Renew membership")}</Link>
          </div>
        </div>
      )}
      {endingSoon && (
        <div className="unpaid-bar soon" role="status">
          <div className="wrap">
            {endingSoon.trial ? (
              <><strong>{t("Din prøveperiode slutter snart.", "Your trial ends soon.")}</strong> {t(`Den slutter ${dato(endingSoon.endDate)}. Meld dig ind, så du kan blive ved med at træne med.`, `It ends on ${dato(endingSoon.endDate, loc)}. Join the club to keep training with us.`)}{" "}
              <Link href="/bliv-medlem">{t("Meld dig ind", "Join now")}</Link></>
            ) : (
              <><strong>{t("Tid til at forny.", "Time to renew.")}</strong> {t(`Dit medlemskab udløber ${dato(endingSoon.endDate)}. Forny i god tid, så du kan blive ved med at tilmelde dig træninger.`, `Your membership expires on ${dato(endingSoon.endDate, loc)}. Renew in good time so you can keep signing up for trainings.`)}{" "}
              <Link href="/bliv-medlem">{t("Forny medlemskab", "Renew membership")}</Link></>
            )}
          </div>
        </div>
      )}
      {user && <AppNav variant="bottom" hidden={hidden} loc={loc} />}
    </>
  );
}
