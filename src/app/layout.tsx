import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";
import { MenuCloser } from "@/components/MenuCloser";
import { demoEnabled } from "@/lib/demo";
import "./globals.css";
import { hiddenHrefs } from "@/lib/features";
import { CLUB, clubCss } from "@/lib/club";
import { refreshClub } from "@/lib/site";

export async function generateMetadata(): Promise<Metadata> {
  await refreshClub();
  return {
    title: { default: CLUB.name, template: `%s · ${CLUB.name}` },
    description: CLUB.tagline,
  icons: { icon: "/icon-192.png", apple: "/apple-icon.png" },
    appleWebApp: { capable: true, title: CLUB.shortName, statusBarStyle: "black-translucent" },
  };
}

export async function generateViewport(): Promise<Viewport> {
  await refreshClub();
  return { themeColor: CLUB.colors.theme, width: "device-width", initialScale: 1 };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  await refreshClub();
  const hidden = await hiddenHrefs();
  const css = clubCss();
  return (
    <html lang="da">
      {css && <head><style dangerouslySetInnerHTML={{ __html: css }} /></head>}
      <body>
        <a href="#indhold" className="skip">Spring til indhold</a>
        {demoEnabled() && (
          <div className="demo-banner">Testversion med testbrugere · <Link href="/login">Skift bruger</Link></div>
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
            <div>
              <Link href="/om">Om klubben</Link> · {!hidden.includes("/ruter") && <><Link href="/ruter">Ruter</Link> · </>}{!hidden.includes("/sponsorer") && <><Link href="/sponsorer">Sponsorer</Link> · </>}
              {CLUB.facebook && <><a href={CLUB.facebook}>Facebook</a> · </>}<Link href="/om/kontakt">Kontakt</Link> ·{" "}
              <Link href="/privatlivspolitik">Privatlivspolitik</Link>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
