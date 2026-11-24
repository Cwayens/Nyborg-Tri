import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Nyborg Triathlon Klub", template: "%s · Nyborg Triathlon Klub" },
  description: "Din triatlonklub på Østfyn. Svømning, cykling og løb for alle niveauer.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="da">
      <body>
        <Header />
        <main className="wrap main">{children}</main>
        <footer className="site-footer">
          <div className="wrap footer-row">
            <div>
              <strong>Nyborg Triathlon Klub</strong>
              <br />CVR 34371571 · <a href="mailto:nyborgtri@gmail.com">nyborgtri@gmail.com</a>
            </div>
            <div>
              <a href="https://www.facebook.com/NyborgTri">Facebook</a> · <Link href="/om/kontakt">Kontakt</Link> ·{" "}
              <Link href="/privatlivspolitik">Privatlivspolitik</Link>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
