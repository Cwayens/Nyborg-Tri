# Nyborg Triathlon Klub – hjemmeside og medlemssystem

Ny hjemmeside for [Nyborg Triathlon Klub](https://www.nyborgtri.dk), der erstatter den nuværende WordPress-side og indmeldelsen i Klubmodul.

**Fase 1 (denne kode):** offentlige sider og nyheder, login med mail-link, indmeldelse og betaling med kort/MobilePay (Stripe), medlemsoversigt for bestyrelsen, CSV-eksport og API til økonomisystem.
**Fase 2:** tilmelding til træninger, så man kan se hvem der kommer.
**Fase 3:** TrainingPeaks – find medlemmer med samme træning samme dag og send invitationer.

Se [docs/arkitektur.md](docs/arkitektur.md) for teknologivalg og plan.

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

## Administration

Log ind med en mail der har rollen ADMIN (sættes af seed via `ADMIN_EMAIL`, eller direkte i databasen):

- `/admin` – medlemmer, aktive/udløber/udløbet, antal pr. type
- `/admin/betalinger` – betalinger og status i økonomisystemet
- `/admin/indhold` – skriv nyheder og ret sider (Markdown)
- `/admin/medlemmer.csv` – medlemsliste til Excel

## Drift

Anbefalet: [Vercel](https://vercel.com) (hosting, gratis/hobby er nok til start) + PostgreSQL i EU (fx Neon Frankfurt eller Supabase EU) + SMTP fra fx Brevo/Resend til login-mails.
Byg-kommando `npm run build`, og kør `npm run db:deploy` ved hver udrulning med databaseændringer.
