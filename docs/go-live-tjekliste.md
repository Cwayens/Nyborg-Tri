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
- [ ] **Backup af databasen**: slå point-in-time restore til hos Neon, og test en gendannelse.
- [ ] **Egen natlig backup** (bygget, kører kl. 2.15 via cron): sæt `BACKUP_KEY` (lang tilfældig tekst, gem den også uden for Vercel, fx i bestyrelsens kodeordsmanager) og `BLOB_READ_WRITE_TOKEN`. Backupper ligger krypteret i Vercel Blob i 30 dage. Læs en backup med `npx tsx scripts/read-backup.ts <fil>`.
- [ ] **Overvågning**: sæt `ALERT_EMAIL` (fx formand og kasserer), så fejl på siden sendes på mail. Opret en gratis uptime-monitor (fx UptimeRobot eller Better Stack) på `https://<domæne>/api/health`. Status ses under Administration → Drift.

## Indhold

- [ ] Kør WordPress-import én sidste gang, og fjern derefter `IMPORT_WP_ON_BUILD` (ellers overskrives rettelser ved hver udrulning).
- [ ] **Billedlagring**: opret en Vercel Blob-store og sæt `BLOB_READ_WRITE_TOKEN`. Nye uploads gemmes så som WebP i Blob (uden den gemmes de i databasen).
- [ ] Efter sidste WordPress-import: kør `DRY_RUN=1 npm run images:move` og derefter `npm run images:move`, så billeder og PDF'er flyttes fra WordPress til egen lagring, før WordPress lukkes.
- [ ] Gennemgå alle importerede sider (fx Kalender, Bliv medlem og gamle Cup-sider) og ret/slet forældet indhold.
- [ ] Opdater "Bliv medlem"-teksten, så den ikke længere henviser til Klubmodul.
- [ ] Tjek at gamle links (fx fra Facebook og Google) stadig virker.
- [ ] **Om klubben** (`/om`) og **Kontakt** (`/om/kontakt`) er nu faste sider og erstatter de importerede WordPress-sider. Læs historien og tidslinjen igennem, og ret træningsstederne i `src/lib/club.ts`, hvis de ikke passer.
- [ ] Ret kontaktpersonerne under Administration → Kontakt (formand og næstformand er hentet fra den gamle side). Tilføj gerne billeder.
- [ ] Sæt `CONTACT_EMAIL`, hvis kontaktformularen skal sendes til en anden mail end nyborgtri@gmail.com. Henvendelser kan også læses under Administration → Kontakt.

## Domæne

- [x] Sikkerhedsheadere er sat (ingen visning i fremmede iframes, nosniff, HSTS, referrer- og permissions-politik). `robots.txt` holder admin, login, betalingslinks og medlemssider ude af Google.
- [ ] Overvej en Content-Security-Policy, når billeder er flyttet til egen lagring.

- [ ] Peg **nyborgtri.dk** og www.nyborgtri.dk på Vercel (DNS hos den nuværende udbyder).
- [ ] Opdater `AUTH_URL` til `https://www.nyborgtri.dk` og Stripe-webhook til det nye domæne.
- [ ] Behold WordPress på et underdomæne i en overgangsperiode, til alt er flyttet.

## GDPR og privatliv

- [ ] **Privatlivspolitikken** (`/privatlivspolitik`) er skrevet på ny og dækker ur-/Strava-data, vægt, værge, kontaktformular, chat, atletprofiler, leaderboard, kort og opbevaringstider. Bestyrelsen skal læse den igennem og godkende den.
- [x] Medlemmer kan selv hente deres data og slette deres profil under Min profil → Dine data. Betalinger og medlemskaber gemmes i 5 år (bogføringsloven), men uden navn og mail. Slettede medlemmer vises som "Slettet medlem" i admin.

- [ ] **Kontaktformularen** gemmer navn, mail, telefon og besked. Nævn det i privatlivspolitikken, og slet gamle henvendelser jævnligt (fx efter et år).

- [ ] **Billeder på forsiden** (`public/billeder/`) er hentet fra den gamle side. Bekræft, at de viste personer er ok med at være på forsiden, eller udskift dem med nye billeder.
- [ ] **Gruppechat**: aftal regler for god tone, og hvem blandt trænerne der holder øje med børnegruppens kanaler. Overvej om forældre skal kunne læse med i børnenes chat.
- [ ] **Testresultater** kan ses af trænere (bedste resultat pr. atlet). Nævn det i privatlivspolitikken.
- [ ] **Leaderboard** er frivilligt (samtykke på profilen eller på /leaderboard). Nævn i privatlivspolitikken, at navn, aldersgruppe, køn og bedste præstationer vises for andre medlemmer. Børn under 18 er ikke med (Ironman-grupperne starter ved 18). FTP vises i W/kg; vægten gemmes på profilen og vises aldrig for andre (nævn vægt som personoplysning i privatlivspolitikken). Vægt kan ikke hentes fra Strava med nuværende adgang.

- [ ] Opdater **privatlivspolitikken**: hvilke data der gemmes (navn, adresse, fødselsdato, telefon, betalinger, træningsdata), hvorfor, hvor længe, og hvem der behandler dem.
- [ ] **Databehandleraftaler** med Vercel, databaseudbyder, Stripe og mailudbyder.
- [ ] Samtykke til deling af træningsdata med klubben (wearables) skal være frivilligt og kunne trækkes tilbage.
- [ ] Forældresamtykke for børn under 15 år, hvis de selv opretter bruger.
- [x] Medlemmer under 18 skal angive forælder/værge ved indmeldelse. Betalingslinket sendes til værgen (`/betal/<hemmeligt link>`), og Stripe sender kvitteringen til værgens e-mail.
- [ ] Når der kommer påmindelser om fornyelse, skal de sendes til `billingEmail()` i `src/lib/guardian.ts` (værgen for børn).
- [ ] Nævn i privatlivspolitikken, at vi gemmer navn og e-mail på forælder/værge for medlemmer under 18.
- [ ] **Atleter-siden** viser kun atleter, der selv har givet samtykke under Min profil → Min atletprofil. Billeder og tekster er offentlige. Vis aldrig data fra Strava eller ure på profilen.
- [ ] Opret de rigtige atletprofiler under Administration → Atleter, og få atleterne til at give samtykke og uploade et billede.
- [ ] Rutine for sletning af data, når et medlem melder sig ud (medlemmet kan selv slette, ellers gør admin det på anmodning). Henvendelser fra kontaktformularen slettes automatisk efter et år.

## Mail og kort

- [ ] **Mail til hold og medlemmer** (Administration → Mail): trænere kan maile deres hold, admin alle medlemmer. Mails til børn går til forælderen. Medlemmer kan fravælge nyheder på profilen. Aftal i bestyrelsen, hvem der må sende til alle.
- [ ] **Kort og ruter** (`/ruter`): ruterne er hentet fra den gamle side. Tjek at de stadig passer, og ret træningssteder i `src/lib/club.ts` og ruter i `src/data/ruter.json`. Kortet bruger OpenStreetMap, som er gratis ved lav trafik; ved meget trafik skal der skiftes til en betalt kortudbyder.
- [x] **Indmeldelse uden login**: nye kan melde sig ind eller bede om prøvetræning direkte på /bliv-medlem. Der sendes et loginlink, og der er en bremse mod spam (30 nye pr. time).

## Bredden (nye funktioner)

Alle otte, og 10 af de øvrige funktioner (Træn sammen, programmer til uret, Mine tests, statistik, leaderboard, chat, atleter, sponsorer, ruter og mail), kan slås fra og til under **Administration → Funktioner**. Data gemmes, når en funktion er slået fra.

- [ ] Gennemgå de otte funktioner med trænerne, og slå dem fra, I ikke vil bruge fra start: tempogrupper, find en makker, begynderforløb, mentorordning, ugens tip, testdage, klubudfordringer, stævner og samkørsel.
- [ ] **Begynderforløbet** (`src/data/begynder.ts`) er et udkast. Lad en træner læse de 10 uger og stævnetjeklisten igennem.
- [ ] Find 3-5 erfarne medlemmer, der vil være **mentor** (de melder sig selv under /mentor).
- [ ] Læg de første **tips** og den første **udfordring** ud før lancering, så siderne ikke er tomme.
- [ ] Læg sæsonens **stævner** ind under /staevner (alle medlemmer kan tilføje), og marker hvor klubteltet kommer med.
- [ ] Planlæg **testdage** hver 8. uge i kalenderen (vælg "Testdag" når træningen oprettes).
- [ ] Klubudfordringer tæller kun Strava-ture i klubbens fælles tal, når `STRAVA_LEADERBOARD=1` (skriftlig tilladelse fra Strava). Dit eget bidrag tæller altid.

## Integrationer

- [ ] **TrainingPeaks API**: søg partneradgang hos TrainingPeaks (API-ansøgning til klubber/coach-platforme). Når den er godkendt, sættes `TRAININGPEAKS_CLIENT_ID` og `TRAININGPEAKS_CLIENT_SECRET`, og koblingen i `src/lib/trainingpeaks.ts` gøres færdig. Med API'et kan medlemmer hente deres planlagte TrainingPeaks-træninger direkte og dele dem under Træn sammen med ét klik. Indtil da eksporterer trænere og medlemmer træningen som .fit, .zwo eller .mrc og uploader filen (virker nu).
- [x] Tærskelfart på løb: estimatet (10 km-fart + 3 % eller 5 km-fart + 7 %) er godkendt af Carsten for nu. Kan ændres i `referencesFrom` i `src/lib/workout.ts`.

- [x] Mine tests og leaderboard bruger kun data fra ure. Bedste 5 km, 10 km, halvmaraton, 40 km, 20 min watt, 100 m og 1500 m udtrækkes automatisk fra hver tur (også midt i længere ture).
- [ ] **Leaderboard og Strava**: Stravas API-aftale tillader kun at vise en brugers Strava-data for brugeren selv. Derfor tæller Strava-ture ikke på leaderboardet, før klubben har skriftlig tilladelse fra Strava (så sættes `STRAVA_LEADERBOARD=1`). Alternativt skal ure forbindes direkte (Garmin, Polar m.fl., se nedenfor).
- [ ] Sæt `CRON_SECRET` på Vercel. Cron-jobbet `/api/cron/efforts` kører én gang i døgnet (Hobby-planen). Med Vercel Pro kan det køre hver time, så nye medlemmers gamle ture gennemgås hurtigere.
- [ ] Strava tillader ca. 1000 kald om dagen for hele appen. Første gang et medlem forbinder, hentes ture fra 1. januar sidste år, og hver tur koster ét kald at gennemgå. Søg om højere grænse hos Strava.

- [ ] **Økonomisystem**: sat på pause. Beslut system (e-conomic, Dinero, Billy …) og aftal kontonumre med kassereren.
- [ ] **TrainingPeaks**: søg om partneradgang til API'et (kan tage tid).
- [ ] **Strava**: opret app på strava.com/settings/api (callback-domæne = sidens domæne), sæt `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET` og `STRAVA_VERIFY_TOKEN`, og opret webhook-abonnement (kommando står i `src/app/api/wearables/strava/webhook/route.ts`).
- [ ] Strava giver som udgangspunkt kun plads til 1 atlet på en ny app. Søg om højere grænse hos Strava, før alle medlemmer forbinder.
- [ ] Bekræft Stravas API-vilkår: vi viser Strava-data kun for ejeren selv (ikke i klubstatistikken). Tjek om det stadig gælder.
- [ ] **Garmin**: søg om adgang til Garmin Connect Developer Program, så Garmin-data kan indgå direkte (og i klubstatistikken).
- [ ] **Polar, Wahoo, Coros, Suunto**: søg API-adgang hos dem, der bruges mest i klubben.
- [ ] **Program direkte på uret ved tilmelding**: i dag henter atleten en personlig .fit/.zwo-fil (virker med Garmin, Wahoo, Coros, Hammerhead og Zwift). For at sende automatisk skal klubben have adgang til *Garmin Connect Developer Program → Training API* (kræver ansøgning som virksomhed/forening), *Wahoo Cloud API* (workouts og planer) og evt. Coros/Suunto partnerprogrammer. Stravas API kan ikke sende workouts.

## Andre klubber (senere)

- [ ] Beslut ejerskab af selskabet (ApS) og aftalen med NyborgTri. Se planen "Platformen til andre klubber".
- [ ] Hver ny klub sættes op som egen installation efter `docs/ny-klub.md`.
- [ ] Spørg Strava om en større kvote, før flere klubber bruger samme Strava-app.

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
