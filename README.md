# Nyborg Triathlon Klub – hjemmeside og medlemssystem

Ny hjemmeside for [Nyborg Triathlon Klub](https://www.nyborgtri.dk), der erstatter den nuværende WordPress-side og indmeldelsen i Klubmodul.

**Fase 1 (denne kode):** offentlige sider og nyheder, login med mail-link, indmeldelse og betaling med kort/MobilePay (Stripe), medlemsoversigt for bestyrelsen, CSV-eksport og API til økonomisystem.
**Fase 2:** tilmelding til træninger, så man kan se hvem der kommer.
**Fase 3:** TrainingPeaks – find medlemmer med samme træning samme dag og send invitationer.

Se [docs/arkitektur.md](docs/arkitektur.md) for teknologivalg og plan, og [docs/go-live-tjekliste.md](docs/go-live-tjekliste.md) for det der mangler før go-live.

## Kom i gang lokalt

Kræver Node.js 22 og en PostgreSQL-database.

```bash
cp .env.example .env        # udfyld DATABASE_URL, AUTH_SECRET m.m.
npm install
npm run db:migrate          # opretter tabeller
npm run db:seed             # kontingentsatser + første administrator (ADMIN_EMAIL)
npm run import:wordpress    # henter alle sider og nyheder fra nyborgtri.dk
npm run dev                 # http://localhost:3000
```

Test: `npm test` · Typecheck: `npm run typecheck`

## Se siden online (testversion på Vercel)

1. Log ind på [vercel.com](https://vercel.com) med GitHub og vælg **Add New → Project → Import** `Cwayens/Nyborg-Tri`.
2. Under **Environment Variables** tilføjes:
   - `AUTH_SECRET` = en lang tilfældig tekst (fx 40 tilfældige tegn)
   - `IMPORT_WP_ON_BUILD` = `1` (henter sider og nyheder fra nyborgtri.dk ved hver udrulning – fjernes, når siden går i drift)
3. Klik **Deploy**. Første forsøg fejler, fordi der mangler en database. Det er forventet.
4. Gå til projektets **Storage → Create Database → Neon (Postgres)**, vælg region Frankfurt og forbind til projektet. Så sættes `DATABASE_URL` automatisk.
5. Gå til **Deployments → ⋯ → Redeploy**. Nu bygges siden med tabeller, kontingentsatser og indhold fra den gamle side, og du får et link.

**Testbrugere:** sæt `DEMO_MODE` = `1` og redeploy. Så kan man på /login vælge "Log ind som testbruger" (admin, træner, elite, bredde, børn, prøveperiode, kode, ansøger og ny bruger) uden mail. Fjernes før go-live.

Login og betaling virker først, når `EMAIL_SERVER`/`EMAIL_FROM` og Stripe-nøgler er sat (se nedenfor).

## Betaling (Stripe)

1. Opret en Stripe-konto for klubben (CVR 34371571) og slå **MobilePay** til under *Payment methods*.
2. Sæt `STRIPE_SECRET_KEY` (start med `sk_test_…`).
3. Opret et webhook-endpoint til `https://<domæne>/api/stripe/webhook` med events
   `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.expired`, `charge.refunded`,
   og sæt `STRIPE_WEBHOOK_SECRET`.
4. Lokalt: `stripe listen --forward-to localhost:3000/api/stripe/webhook`.

Medlemskabet oprettes først, når Stripe bekræfter betalingen. Fornyelse før udløb forlænger fra udløbsdatoen.

## Økonomisystem

- `ACCOUNTING_PROVIDER=economic` bogfører hver betaling som bilag i e-conomic (kontonumre aftales med kassereren).
- Uanset system kan kassereren hente betalinger som JSON: `GET /api/v1/payments?since=2026-01-01` med `Authorization: Bearer <ACCOUNTING_API_TOKEN>`.
- Fejlede bogføringer kan sendes igen fra **Admin → Betalinger**.

## Brugertyper

| Type | Kan |
|---|---|
| Admin | Alt: medlemmer, betalinger, indhold, brugertyper, træninger |
| Træner | Oprette, rette og slette træninger i klubbens kalender (`/traener`) |
| Atlet – Elite / Bredde / Børn | Se kalenderen, tilmelde sig træninger for egen gruppe, betale kontingent, se Min side |

Rolle og atletgruppe sættes af en admin under **Admin → Medlemmer**. En træner kan også have en atletgruppe.
Nye betalende medlemmer får automatisk gruppen Bredde (eller Børn ved ungdomskontingent), indtil en admin ændrer den.
Træneren vælger præcis én gruppe for hver træning (Elite, Bredde eller Børn), og træninger kan gentages ugentligt. Atleter kan kun tilmelde sig træninger for deres egen gruppe; trænere og admins (med medlemskab) kan tilmelde sig alle. Er man allerede tilmeldt, kan man altid afmelde sig.

## Testresultater og chat

- **Mine tests** (`/benchmarks`): 5 km, 10 km, FTP (20 min), 100 m og 1500 m svøm med historik og udvikling. Ture fra Strava eller manuelt på præcis testdistancen foreslås som resultat. Trænere ser gruppens bedste resultater under Trænerværktøj → Testresultater.
- **Chat** (`/chat`): én kanal pr. gruppe for løb, cykling og svøm. Atleter skriver i egen gruppe, trænere og admin i alle og kan slette beskeder.

## Træningsprogrammer (TrainingPeaks)

Træneren kan lægge et struktureret program på en træning: importér en .zwo- eller .mrc-fil eksporteret fra TrainingPeaks, en TrainingPeaks-struktur (.json) eller skriv det i kortformat, fx `5x(4min 105%, 3min 55%)`. Intensiteten er i procent af FTP (cykel), tærskelfart (løb) og 100 m-fart (svøm). Hver atlet ser sine egne watt og tempoer, beregnet ud fra Mine tests. API-koblingen er forberedt i `src/lib/trainingpeaks.ts` og kræver partneradgang.

## Tilmelding til træninger

- Alle kan oprette en atletbruger (log ind med mail – profilen oprettes automatisk).
- Man kan først tilmelde sig træninger i `/kalender`, når man har et aktivt medlemskab, som ikke er passivt. Det kan man få på tre måder:
  1. **Betaling** af kontingent (Stripe).
  2. **Prøveperiode på 14 dage**: man søger på *Bliv medlem*, og en admin godkender under **Admin → Prøveperioder og koder**. Én ansøgning pr. person.
  3. **Engangskode**: en admin opretter koder (medlemstype + antal dage). Hver kode kan kun bruges én gang, og hver bruger kan kun bruge én kode.
- Indloggede ser navnene på dem der kommer; andre ser kun antallet. Trænere ser deltagerlisten (med telefonnummer) på hver træning.

## Administration

Log ind med en mail der har rollen ADMIN (sættes af seed via `ADMIN_EMAIL`, eller direkte i databasen):

- `/admin` – medlemmer, aktive/udløber/udløbet, antal pr. type
- `/admin/betalinger` – betalinger og status i økonomisystemet
- `/admin/indhold` – skriv nyheder og ret sider (Markdown)
- `/admin/medlemmer.csv` – medlemsliste til Excel

## Drift

Anbefalet: [Vercel](https://vercel.com) (hosting, gratis/hobby er nok til start) + PostgreSQL i EU (fx Neon Frankfurt eller Supabase EU) + SMTP fra fx Brevo/Resend til login-mails.
Byg-kommando `npm run build`, og kør `npm run db:deploy` ved hver udrulning med databaseændringer.
