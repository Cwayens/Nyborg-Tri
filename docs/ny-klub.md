# Sæt systemet op for en ny klub

Hver klub får sin egen installation: sin egen kopi på Vercel og sin egen database. Koden er den samme for alle.
Klubbens navn, logo, farver og kontaktoplysninger sættes som miljøvariabler, så ingen kode skal rettes.

## 1. Opret installationen

1. Opret et nyt projekt på Vercel ud fra samme GitHub-repo.
2. Opret en ny Neon-database til klubben og sæt `DATABASE_URL` (og `DIRECT_URL`).
3. Sæt de faste variabler som for NyborgTri: `AUTH_SECRET` (ny, unik), `AUTH_URL`, mail (`RESEND_API_KEY`, `EMAIL_FROM`),
   og klubbens egen Stripe-konto (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`). Se `.env.example`.
4. Kør migreringerne. Det sker automatisk ved første deploy.

## 2. Klubbens identitet

| Variabel | Eksempel | Bruges til |
|---|---|---|
| `CLUB_NAME` | Svendborg Triathlon | Sidetitler, sidefod, mails, betalinger |
| `CLUB_SHORT_NAME` | SvendborgTri | Mailemner, hjemmeskærm, filnavne |
| `CLUB_LOGO_TOP` / `CLUB_LOGO_SUB` | Svendborg / Triathlon | Teksten i logoet (standard: første ord og resten af navnet) |
| `CLUB_LOGO_IMAGE` | /klub/logo.webp | Logobilledet. Læg filen i `public/` |
| `CLUB_TAGLINE` | Triathlon i Svendborg for alle | Beskrivelse til Google |
| `CLUB_EMAIL`, `CLUB_CVR`, `CLUB_BANK`, `CLUB_FACEBOOK` | | Sidefod, kontakt, betalingsmails |
| `CLUB_DOMAIN` | svendborgtri.dk | Afsender på mails, kalender-id'er |
| `CLUB_CITY`, `CLUB_ZIP` | Svendborg, 5700 | Kortlinks, standardby ved indmeldelse |
| `CLUB_COLOR_*` | #1d4ed8 | Klubbens farver (se `.env.example`) |

Når `CLUB_NAME` er en anden end Nyborg, bruges ingen af Nyborgs kontaktoplysninger som standard.

## 3. Det, der stadig er Nyborg-indhold

Disse ting er indhold, ikke indstillinger, og skal skrives om for hver klub, indtil admin selv kan rette dem:

- Forsiden og Om klubben (historie, stævner, samarbejdspartnere): `src/app/page.tsx`, `src/app/om/page.tsx`
- Træningssteder og ruter: `PLACES` i `src/lib/club.ts` og `src/data/ruter.json`
- Begynderforløbet: `src/data/begynder.ts`
- Privatlivspolitikken: `src/app/privatlivspolitik/page.tsx`
- Menupunktet NyborgTri Cup: `src/lib/navigation.ts`
- Ikoner til telefonen: `public/icon-*.png` og `public/apple-icon.png`

## 4. Funktioner

Admin kan slå 18 funktioner til og fra under Admin → Funktioner. En ny klub kan starte med få og tænde flere senere.

## 5. Aftaler

Før klubben går i luften: kundeaftale og databehandleraftale, og klubben skal selv have en Stripe-konto.
Strava-forbindelsen bruger én Strava-app for alle klubber, så tjek kvoten hos Strava, når der kommer flere klubber til.
