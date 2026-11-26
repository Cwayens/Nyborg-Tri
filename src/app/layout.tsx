import { Suspense } from "react";
import { getLocale, translator } from "@/lib/i18n";
import { LangSwitch } from "@/components/LangSwitch";
import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";
import { MenuCloser } from "@/components/MenuCloser";
import { demoEnabled } from "@/lib/demo";
import "./globals.css";
import { hiddenHrefs } from "@/lib/features";
import { clubCss } from "@/lib/club";
import { getClub } from "@/lib/site";

// Hver side afhænger af domænet (klubben), så intet må bygges statisk og deles mellem klubber
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const CLUB = await getClub();
  return {
    title: { default: CLUB.name, template: `%s · ${CLUB.name}` },
    description: CLUB.tagline,
  icons: { icon: "/icon-192.png", apple: "/apple-icon.png" },
    appleWebApp: { capable: true, title: CLUB.shortName, statusBarStyle: "black-translucent" },
  };
}

export async function generateViewport(): Promise<Viewport> {
  const CLUB = await getClub();
  return { themeColor: CLUB.colors.theme, width: "device-width", initialScale: 1 };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const CLUB = await getClub();
  const hidden = await hiddenHrefs();
  const css = clubCss(CLUB);
  const loc = await getLocale();
  const t = translator(loc);
  return (
    <html lang={loc}>
      {css && <head><style dangerouslySetInnerHTML={{ __html: css }} /></head>}
      <body>
        <a href="#indhold" className="skip">{t("Spring til indhold", "Skip to content")}</a>
        {(await demoEnabled()) && (
          <div className="demo-banner">{t("Testversion med testbrugere", "Test version with test users")} · <Link href="/login">{t("Skift bruger", "Switch user")}</Link></div>
        )}
        <Header />
        <MenuCloser />
        <main id="indhold" className="wrap main">{children}</main>
        <footer className="site-footer">
          <div className="wrap footer-row">
            <div>
              <strong>{CLUB.name}</strong>
              <br />{CLUB.cvr && <>CVR {CLUB.cvr} · </>}{CLUB.email && <a href={`mailto:${CLUB.email}`}>{CLUB.email}</a>}
            </div>
            <nav className="footer-links" aria-label={t("Om klubben", "About the club")}>
              <Link href="/om">{t("Om klubben", "About")}</Link>
              {!hidden.includes("/ruter") && <Link href="/ruter">{t("Ruter", "Routes")}</Link>}
              {!hidden.includes("/sponsorer") && <Link href="/sponsorer">{t("Sponsorer", "Sponsors")}</Link>}
              {CLUB.facebook && <a href={CLUB.facebook}>Facebook</a>}
              <Link href="/om/kontakt">{t("Kontakt", "Contact")}</Link>
              <Link href="/privatlivspolitik">{t("Privatlivspolitik", "Privacy policy")}</Link>
              <Suspense fallback={null}><LangSwitch current={loc} /></Suspense>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
