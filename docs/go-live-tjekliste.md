# Go-live-tjekliste

Ting der skal være på plads, før den nye side erstatter nyborgtri.dk. Listen opdateres løbende.
Sæt `[x]`, når et punkt er klaret.

## Sikkerhed og konti

- [ ] **Ny `AUTH_SECRET`** i Vercel (den nuværende er delt i chat). Generér med `npx auth secret`, og gem den som *Sensitive* environment variable.
- [ ] **Første administrator**: sæt `ADMIN_EMAIL` til kassererens/formandens mail og redeploy, eller sæt rollen i Admin bagefter.
- [ ] Gennemgå hvem der har adgang til Vercel, GitHub, databasen og Stripe (mindst 2 fra bestyrelsen, så klubben ikke afhænger af én person).
- [ ] **Slå testbrugere fra**: fjern `DEMO_MODE` i Vercel, redeploy, og slet testdata med `npm run db:demo -- --slet` (fjerner alle brugere på @demo.nyborgtri.dk og deres træninger, aktiviteter og koder).
- [ ] **Vercel-plan**: Hobby-planen er kun til ikke-kommerciel brug. Tjek om klubben (med betalinger) skal på Pro, eller om en anden hosting passer bedre.

## Login-mails

- [ ] **Rigtig mailudbyder** (fx Brevo, Resend eller Simply.com SMTP): sæt `EMAIL_SERVER` og `EMAIL_FROM` (fx `noreply@nyborgtri.dk`).
- [ ] Opsæt SPF/DKIM for afsenderdomænet, så login-mails ikke havner i spam.
- [ ] Fjern nødløsningen hvor login-linket skrives i serverloggen, når der mangler mailserver (`src/auth.ts`). Den er kun til testversionen.
- [ ] Test login-mail på Gmail, Outlook og iCloud.

## Betaling (Stripe)

- [ ] Opret Stripe-konto i klubbens navn (CVR 34371571) med klubbens bankkonto.
- [ ] Slå **MobilePay** til under Payment methods.
- [ ] Sæt live-nøgler: `STRIPE_SECRET_KEY` (sk_live_…) og opret webhook til `https://<domæne>/api/stripe/webhook` → `STRIPE_WEBHOOK_SECRET`.
- [ ] Test en rigtig betaling (fx 1 kr. medlemstype) og en refundering, og tjek at medlemskabet oprettes/afsluttes.
- [ ] **Handelsbetingelser** på siden (pris, varighed, fortrydelsesret, refundering, kontaktoplysninger) – krav ved onlinebetaling.

## Medlemmer og data

- [ ] **Beslut om Klubmodul lukkes.** Hvis ja: eksportér medlemmer (CSV) og importér dem med deres nuværende udløbsdato (import-script skal laves).
- [ ] Sæt brugertype og gruppe (Elite/Bredde/Børn) på alle importerede medlemmer.
- [ ] Opdater kontingentsatser hvis de ændres (`prisma/seed.ts` eller direkte i databasen).
- [ ] Slet testdata (testbrugere, testtræninger, testkoder).
- [ ] **Backup af databasen**: slå automatisk backup/point-in-time restore til hos databaseudbyderen, og test en gendannelse.

## Indhold

- [ ] Kør WordPress-import én sidste gang, og fjern derefter `IMPORT_WP_ON_BUILD` (ellers overskrives rettelser ved hver udrulning).
- [ ] Flyt billeder og PDF'er fra den gamle WordPress-server til egen lagring, før WordPress lukkes.
- [ ] Gennemgå alle importerede sider (fx Kalender, Bliv medlem og gamle Cup-sider) og ret/slet forældet indhold.
- [ ] Opdater "Bliv medlem"-teksten, så den ikke længere henviser til Klubmodul.
- [ ] Tjek at gamle links (fx fra Facebook og Google) stadig virker.

## Domæne

- [ ] Peg **nyborgtri.dk** og www.nyborgtri.dk på Vercel (DNS hos den nuværende udbyder).
- [ ] Opdater `AUTH_URL` til `https://www.nyborgtri.dk` og Stripe-webhook til det nye domæne.
- [ ] Behold WordPress på et underdomæne i en overgangsperiode, til alt er flyttet.

## GDPR og privatliv

- [ ] **Billeder på forsiden** (`public/billeder/`) er hentet fra den gamle side. Bekræft, at de viste personer er ok med at være på forsiden, eller udskift dem med nye billeder.
- [ ] **Gruppechat**: aftal regler for god tone, og hvem blandt trænerne der holder øje med børnegruppens kanaler. Overvej om forældre skal kunne læse med i børnenes chat.
- [ ] **Testresultater** kan ses af trænere (bedste resultat pr. atlet). Nævn det i privatlivspolitikken.

- [ ] Opdater **privatlivspolitikken**: hvilke data der gemmes (navn, adresse, fødselsdato, telefon, betalinger, træningsdata), hvorfor, hvor længe, og hvem der behandler dem.
- [ ] **Databehandleraftaler** med Vercel, databaseudbyder, Stripe og mailudbyder.
- [ ] Samtykke til deling af træningsdata med klubben (wearables) skal være frivilligt og kunne trækkes tilbage.
- [ ] Forældresamtykke for børn under 15 år, hvis de selv opretter bruger.
- [ ] Rutine for sletning af data, når et medlem melder sig ud.

## Integrationer

- [ ] Hent 5 km- og 10 km-tider automatisk fra Stravas "best efforts" (i dag foreslås kun ture på præcis testdistancen).

- [ ] **Økonomisystem**: sat på pause. Beslut system (e-conomic, Dinero, Billy …) og aftal kontonumre med kassereren.
- [ ] **TrainingPeaks**: søg om partneradgang til API'et (kan tage tid).
- [ ] **Strava**: opret app på strava.com/settings/api (callback-domæne = sidens domæne), sæt `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET` og `STRAVA_VERIFY_TOKEN`, og opret webhook-abonnement (kommando står i `src/app/api/wearables/strava/webhook/route.ts`).
- [ ] Strava giver som udgangspunkt kun plads til 1 atlet på en ny app. Søg om højere grænse hos Strava, før alle medlemmer forbinder.
- [ ] Bekræft Stravas API-vilkår: vi viser Strava-data kun for ejeren selv (ikke i klubstatistikken). Tjek om det stadig gælder.
- [ ] **Garmin**: søg om adgang til Garmin Connect Developer Program, så Garmin-data kan indgå direkte (og i klubstatistikken).
- [ ] **Polar, Wahoo, Coros, Suunto**: søg API-adgang hos dem, der bruges mest i klubben.

## Kommunikation

- [ ] Mails ved vigtige hændelser (aflyst træning, godkendt prøveperiode, medlemskab udløber snart) – kræver mailudbyder.
- [ ] Beslut om den interne Facebook-gruppe fortsat skal bruges til beskeder, eller om det skal ske i værktøjet.

## Sidste test

- [ ] Hele forløbet på mobil: opret bruger → betal → tilmeld træning → afmeld.
- [ ] Træner: opret træning for hver gruppe, se deltagere.
- [ ] Admin: godkend prøveperiode, opret kode, ret brugertype, hent CSV.
- [ ] Træn sammen: slå en tur op, hop med, aflys.
- [ ] Kalender-abonnement i Google og Apple Kalender.
- [ ] Aflys en træning og tjek at den vises som aflyst i kalender og abonnement.
- [ ] Fejlovervågning (fx Vercel Logs eller Sentry), så fejl opdages.
