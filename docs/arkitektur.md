# Arkitektur

## Nuværende side (nyborgtri.dk, gennemgået 24. nov. 2026)

- WordPress 6.9 med Hueman-tema: 48 sider, 156 nyheder i 14 kategorier, 275 billeder/filer.
- Menu: Forside · Bliv medlem · Træning (Indoor bike, Kalender, Træningstider, Lånecykler, Klubtøj) · Begivenheder (NyborgTri Cup, Arkiv, resultater som PDF) · Om (Bestyrelse, Vedtægter, Ordensregler, Privatlivspolitik, Generalforsamlinger, Historien, Sponsorer, Kontakt).
- Indmeldelse og kontingent sker i dag via **Klubmodul** (nyborgtri.klub-modul.dk). Kontingent: voksen 1.000 kr, under 18 år 500 kr, passiv 200 kr, gælder 1 år fra indmeldelse.
- Kalenderen er et WordPress-plugin med svømme- og indoor bike-tider – erstattes af træningskalenderen i fase 2.
- Nyhedsbrev-tilmelding og intern kommunikation sker via Facebook-gruppen.

## Teknologi

| Del | Valg | Hvorfor |
|---|---|---|
| Web | Next.js 15 (React, TypeScript) | Én kodebase til sider, login, admin og API. Stort økosystem, let at finde frivillige der kender det. |
| Database | PostgreSQL via Prisma | Relationelle data (medlemmer, betalinger, tilmeldinger). Typesikre forespørgsler og migreringer i git. |
| Login | Auth.js med mail-link | Ingen adgangskoder. Klar til at tilføje fx Google- eller TrainingPeaks-login senere. |
| Betaling | Stripe Checkout | Kort + MobilePay, PCI håndteres af Stripe, ingen månedlig fast pris (kun gebyr pr. betaling). |
| Hosting | Vercel + Postgres i EU | Gratis/billigt ved klubbens størrelse, skalerer automatisk, data i EU (GDPR). |

Skalerbarhed: siden er stateless, så den skalerer vandret uden ændringer. 100 eller 2.000 medlemmer gør ingen forskel for denne arkitektur.

## Moduler

```
src/app/            sider og API-ruter
  [...path]         indholdssider på samme adresser som den gamle side (gamle links virker)
  nyheder/          nyhedsliste og -artikler (gamle /slug/-links videresendes)
  bliv-medlem/      indmeldelse → Stripe Checkout
  min-side/         medlemskab og kvitteringer
  admin/            medlemmer, betalinger, indhold, CSV
  api/stripe/webhook  Stripe bekræfter betaling → medlemskab oprettes
  api/v1/payments   læse-API til økonomisystem
src/lib/accounting/ adapter pr. økonomisystem (e-conomic implementeret; andre tilføjes som ny fil)
scripts/import-wordpress.ts  engangsimport af indhold
```

## Betalingsflow

1. Medlem logger ind, udfylder profil og vælger medlemstype.
2. Der oprettes en `Payment` (PENDING) og en Stripe Checkout-session.
3. Stripe kalder webhook → betaling markeres PAID, `Membership` oprettes (1 år), idempotent.
4. Betalingen sendes til økonomisystemet. Fejl her stopper ikke medlemskabet; de kan sendes igen fra admin.

## Brugertyper (tilføjet 24. nov. 2026)

`User.role` (ATHLETE < TRAINER < ADMIN) styrer rettigheder, og `User.athleteGroup` (ELITE, BREDDE, BOERN) styrer hvilke træninger man ser.
`TrainingSession` med `groups` (tom = alle) og `seriesId` for ugentlige serier. Kalenderen findes på `/kalender` (samme adresse som den gamle).

## Fase 2 – træningstilmelding (plan)

`TrainingSession` findes allerede. Mangler: `TrainingSignup` (medlem, session, status) og evt. max deltagere.
Ugekalender hvor medlemmer melder til/fra og ser hvem der kommer. Erstatter WordPress-kalenderen.

## Fase 3 – TrainingPeaks (plan)

- TrainingPeaks API kræver godkendelse som partner (ansøgning hos TrainingPeaks). Bør søges tidligt, da det kan tage tid.
- Medlem forbinder sin konto (OAuth) → planlagte træninger hentes dagligt til `PlannedWorkout` (dato, sport, varighed, type).
- Matching: samme dag + samme sport + lignende varighed/intensitet → forslag "3 andre skal også løbe intervaller i dag".
- `TrainingInvite` (afsender, modtagere, tid, sted, svar). Kun medlemmer der selv har slået deling til, indgår (samtykke, GDPR).
- Alternativ hvis partneradgang trækker ud: medlemmer indsætter deres TrainingPeaks iCal-kalenderlink.

## Åbne spørgsmål

- Hvilket økonomisystem bruger kassereren (e-conomic, Dinero, Billy, andet)?
- Skal Klubmodul lukkes helt? Så skal nuværende medlemmer importeres (CSV-eksport fra Klubmodul).
- Domæne og DNS: hvem administrerer nyborgtri.dk i dag?
- Billeder ligger på den gamle server – de skal flyttes til egen lagring (fx Vercel Blob) før WordPress lukkes.
