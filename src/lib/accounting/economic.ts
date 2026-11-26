import type { AccountingPayment, AccountingProvider } from "./types";
import { clubEnv } from "@/lib/club-secrets";

/**
 * e-conomic: opretter et kassekladde-bilag (finance voucher) pr. betaling.
 * Kontonumre er klubbens egne (src/lib/club-secrets.ts) og SKAL aftales med kassereren.
 * Docs: https://restdocs.e-conomic.com/#journals
 */
export async function economicProvider(): Promise<AccountingProvider> {
  const appSecret = await clubEnv("ECONOMIC_APP_SECRET_TOKEN");
  const grant = await clubEnv("ECONOMIC_AGREEMENT_GRANT_TOKEN");
  const journal = Number((await clubEnv("ECONOMIC_JOURNAL_NUMBER")) ?? 1);
  const revenue = Number(await clubEnv("ECONOMIC_REVENUE_ACCOUNT"));
  const clearing = Number(await clubEnv("ECONOMIC_CLEARING_ACCOUNT"));
  if (!appSecret || !grant || !revenue || !clearing) throw new Error("e-conomic er ikke konfigureret");

  return {
    name: "e-conomic",
    async pushPayment(p: AccountingPayment) {
      const body = {
        accountingYear: { year: p.date.slice(0, 4) },
        journal: { journalNumber: journal },
        entries: {
          financeVouchers: [
            {
              account: { accountNumber: clearing }, // Stripe-mellemregning (debet)
              contraAccount: { accountNumber: revenue }, // Kontingentindtægt (kredit)
              amount: p.amountOre / 100,
              currency: { code: p.currency },
              date: p.date,
              text: p.text.slice(0, 250),
            },
          ],
        },
      };
      const res = await fetch(`https://restapi.e-conomic.com/journals/${journal}/vouchers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-AppSecretToken": appSecret,
          "X-AgreementGrantToken": grant,
        },
        body: JSON.stringify([body]),
      });
      if (!res.ok) throw new Error(`e-conomic svarede ${res.status}: ${await res.text()}`);
      const json = (await res.json()) as Array<{ voucherNumber?: number }>;
      return { ref: String(json[0]?.voucherNumber ?? "ukendt") };
    },
  };
}
