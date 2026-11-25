# Sæt systemet op for en ny klub

Alle klubber kører fra **én installation** (ét Vercel-projekt) og **én database**. En ny klub koster derfor ingen ekstra
hosting: den er en række i tabellen `Club` og et domæne. Hver klub ser kun sine egne data, se "Sådan holdes klubberne adskilt" nederst.

## 1. Opret klubben

Kør mod produktionsdatabasen (sæt `DATABASE_URL`):

```bash
npm run klub -- opret svendborg "Svendborg Triathlon" --admin=formand@svendborgtri.dk
```

Klubben får medlemstyper (voksen, ung, passiv), hold (Elite, Bredde, Børn), en neutral forside og den admin, du angiver.
Med `--eksempel` beholder den Nyborgs eksempeltekster (fx til en salgsdemo).

Adressen bliver `https://svendborg.<PLATFORM_DOMAIN>` med det samme. Andre kommandoer:

| Kommando | Hvad |
|---|---|
| `npm run klub -- liste` | Alle klubber, antal brugere og domæner |
| `npm run klub -- domæne svendborg svendborgtri.dk` | Klubbens eget domæne (`--fjern` fjerner det) |
| `npm run klub -- admin svendborg kasserer@svendborgtri.dk` | Gør en mail til admin i klubben |
| `npm run klub -- noegle svendborg STRIPE_SECRET_KEY sk_live_...` | Klubbens egne nøgler (se 3) |
| `npm run klub -- luk svendborg` / `aabn` | Luk en klub (siden svarer ikke; data bevares) |

## 2. Eget domæne (valgfrit)

1. `npm run klub -- domæne svendborg svendborgtri.dk` (og evt. `www.svendborgtri.dk`).
2. Tilføj domænet i Vercel: Project → Settings → Domains. Vercel laver certifikatet.
3. Klubben peger domænet på Vercel (CNAME `cname.vercel-dns.com`, eller A-post for roddomænet).

Uden eget domæne bruger klubben `<slug>.<PLATFORM_DOMAIN>`; det kræver et wildcard-domæne (`*.<PLATFORM_DOMAIN>`) på Vercel,
hvilket kræver, at domænets navneservere ligger hos Vercel.

## 3. Klubbens egne nøgler

Pengene skal gå direkte til klubben, så hver klub har sin egen Stripe-konto. Nøglerne gemmes krypteret i databasen
(`CLUB_SECRETS_KEY`) og sættes af platformen:

```bash
npm run klub -- noegle svendborg STRIPE_SECRET_KEY sk_live_...
npm run klub -- noegle svendborg STRIPE_WEBHOOK_SECRET whsec_...
```

Stripe-webhooken oprettes i klubbens Stripe-konto til `https://<klubbens domæne>/api/stripe/webhook`.
Andre nøgler pr. klub: `ACCOUNTING_PROVIDER`, `ACCOUNTING_API_TOKEN`, `ECONOMIC_*`, `CONTACT_EMAIL` og `CLUB_LANG` (fx `en`).
Standardklubben (`DEFAULT_CLUB`, Nyborg) bruger stadig miljøvariablerne.

## 4. Opstartsguiden

Klubbens admin logger ind og går til **Admin → Kom i gang**. Den viser, hvad der mangler: navn, logo og farver, forside,
træningssteder og ruter, medlemstyper og priser, import af medlemmer fra Excel (CSV), trænere og bestyrelse, funktioner, Stripe og mail.

## 5. Klubbens indhold

Admin retter selv det meste under **Admin → Klubben**, uden at koden skal ændres:

- Navn, logo, farver og kontaktoplysninger
- Forsiden: overskrift, tekster, billeder, holdkort, spørgsmål og svar
- Om klubben: indledning, fakta, historie, arkiv, samarbejdspartnere og billeder
- Træningssteder (vises på Kontakt og på kortet)
- Ruter: tilføj fra GPX-filer, ret og slet
- Ekstra tekst i privatlivspolitikken

Det, der stadig kræver en udvikler: begynderforløbet (`src/data/begynder.ts`), menupunktet NyborgTri Cup (`src/lib/navigation.ts`)
og telefonikonerne (`public/icon-*.png`), som er fælles for alle klubber.

### Hold

Under **Admin → Hold** opretter klubben sine egne hold (fx U13, U17, Motion, Elite). Hvert hold har en type
(konkurrence, motion/bredde eller børn og unge), som styrer reglerne: børnehold får mails via forældre og eget chatrum,
konkurrencehold kan få atletprofiler. Et medlem ser sit eget holds træninger og de hold, holdet er sat til at se.
Trænere og admins ser alt. Besøgende og prøvemedlemmer ser de åbne hold.

Børnesikkerhed: børnehold og voksenhold kan aldrig se hinanden, og børnehold kan ikke være åbne for besøgende.
Reglerne gælder inden for hver klub; børn i én klub kan aldrig se eller skrive med nogen fra en anden klub.

**Afdelinger (netværk):** Er I flere byer i ét netværk, opretter I afdelinger nederst på Admin → Hold.
Med kun én afdeling vises afdelinger ingen steder.

### Roller

Ud over atlet, træner og admin:

- **Holdleder** (sættes på holdet under Admin → Hold): opretter og retter træninger og skriver mail, men kun for sine egne hold.
- **Kasserer** (sættes på medlemmet under Admin → Medlemmer): betalinger, medlemstyper og medlemslisten (CSV).
- **Frivillig** (sættes på medlemmet): står på listen over frivillige.

Alle roller gælder kun i den klub, de er givet i. Admin i én klub giver ingen rettigheder i en anden.

### Sprog

Siden findes på dansk og engelsk. Den besøgende skifter sprog nederst på siden.
Er klubben international, kan engelsk være standard: `npm run klub -- noegle <slug> CLUB_LANG en`.

### Funktioner

Admin kan slå funktioner til og fra under Admin → Funktioner, pr. klub.

## 6. Aftaler

Før klubben går i luften: kundeaftale og databehandleraftale, og klubben skal selv have en Stripe-konto.

## Sådan holdes klubberne adskilt

- **Klubben findes ud fra domænet** (`src/lib/tenant.ts`): klubbens egne domæner, `<slug>.<PLATFORM_DOMAIN>`,
  eller `<slug>.localhost` under udvikling. Ukendte domæner (fx preview-adresser) giver standardklubben.
- **Hver tabel har `clubId`** (undtagen `Club` og `Account`). `prisma` i `src/lib/db.ts` tilføjer automatisk klubben til
  alle forespørgsler og nye rækker, også rækker der oprettes inde i andre. Uden klub fejler forespørgslen i stedet for at vise noget.
  Kode, der kører uden for en forespørgsel (cron, scripts, webhooks), skal bruge `runAsClub()` eller `forEachClub()`.
- **Databasen afviser selv** rækker, der peger på en række i en anden klub, og rækker, der forsøges flyttet til en anden klub
  (triggerne i migrationen `flere_klubber`). En række uden klub afvises også.
- **Login gælder én klub**: brugere, login-sessioner og login-links hører til klubben. Samme mail kan være medlem af to klubber
  som to adskilte brugere, og en login-cookie fra én klub virker ikke på en anden klubs domæne.
- **Filer** (billeder, backup) ligger i en mappe pr. klub i billedlageret. Backup laves pr. klub hver nat.
- **Test**: `npm test` tjekker, at alle tabeller har en klub. `DATABASE_URL=... npm run test:db` beviser mod en rigtig
  database, at klubber ikke kan se, ændre, slette eller forbinde sig til hinandens data.

Kun platformskode må bruge `prismaUnscoped` (fx opslag af klub ud fra domæne og Strava-webhooks, der kan høre til flere klubber).

### Kendte begrænsninger

- Strava tillader kun ét callback-domæne pr. app. Forbindelse til Strava virker derfor på `<slug>.<PLATFORM_DOMAIN>`,
  men ikke på en klubs eget domæne, før login-flowet sendes via platformsdomænet.
- Ukendte `<slug>.<PLATFORM_DOMAIN>`-adresser giver en fejlside (500) i stedet for en pæn 404-side.
