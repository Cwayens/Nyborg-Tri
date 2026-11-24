/** Det økonomisystemet får at vide om en betaling. */
export interface AccountingPayment {
  paymentId: string;
  date: string; // YYYY-MM-DD (dansk tid)
  amountOre: number;
  currency: string;
  text: string; // fx "Kontingent Voksen – Jens Hansen"
  memberName: string;
  memberEmail: string;
  membershipCode: string | null;
  stripePaymentIntentId: string | null;
}

export interface AccountingProvider {
  name: string;
  /** Bogfør betalingen. Returnerer økonomisystemets reference (bilagsnr. el.lign.). */
  pushPayment(p: AccountingPayment): Promise<{ ref: string }>;
}
