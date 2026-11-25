import { prisma } from "./db";

// Login-links udløber efter 24 timer (Auth.js' standard). Et link, der udløber om mere end 23 timer,
// er altså sendt inden for den seneste time.
const LINK_HOURS = 24;
export const PER_EMAIL_PER_HOUR = 5;
export const TOTAL_PER_HOUR = 200;

/**
 * Bremse mod misbrug af login-formularen: højst 5 login-links i timen til samme mail og 200 i alt.
 * Ellers kan en fremmed fylde et medlems indbakke med mails eller bruge klubbens mail-kvote op.
 */
export async function loginLinkAllowed(email: string, now = new Date()): Promise<boolean> {
  const since = new Date(now.getTime() + (LINK_HOURS - 1) * 3600_000);
  const [mine, all] = await Promise.all([
    prisma.verificationToken.count({ where: { identifier: email, expires: { gt: since } } }),
    prisma.verificationToken.count({ where: { expires: { gt: since } } }),
  ]);
  return mine < PER_EMAIL_PER_HOUR && all < TOTAL_PER_HOUR;
}
