import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";
import { MenuCloser } from "@/components/MenuCloser";
import { demoEnabled } from "@/lib/demo";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Nyborg Triathlon Klub", template: "%s · Nyborg Triathlon Klub" },
  description: "Din triatlonklub på Østfyn. Svømning, cykling og løb for alle niveauer.",
  appleWebApp: { capable: true, title: "NyborgTri", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = { themeColor: "#0b2540", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="da">
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
              <strong>Nyborg Triathlon Klub</strong>
              <br />CVR 34371571 · <a href="mailto:nyborgtri@gmail.com">nyborgtri@gmail.com</a>
            </div>
            <div>
              <Link href="/om">Om klubben</Link> · <Link href="/sponsorer">Sponsorer</Link> ·{" "}
              <a href="https://www.facebook.com/NyborgTri">Facebook</a> · <Link href="/om/kontakt">Kontakt</Link> ·{" "}
              <Link href="/privatlivspolitik">Privatlivspolitik</Link>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
