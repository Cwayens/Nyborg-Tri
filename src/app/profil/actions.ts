"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/auth";
import { deleteAccount } from "@/lib/account";
import { prisma } from "@/lib/db";
import { sendMail } from "@/lib/mail";
import { getClub } from "@/lib/site";

export async function deleteMyAccount(formData: FormData) {
  const CLUB = await getClub();
  const sessionUser = await requireUser("/profil");
  if (String(formData.get("confirm") ?? "").trim().toUpperCase() !== "SLET") {
    redirect("/profil?fejl=" + encodeURIComponent('Skriv SLET i feltet for at bekræfte') + "#slet");
  }
  const { email, name } = await prisma.user.findUniqueOrThrow({ where: { id: sessionUser.id }, select: { email: true, name: true } });
  const r = await deleteAccount(sessionUser.id);
  if (!r.ok) redirect("/profil?fejl=" + encodeURIComponent(r.error) + "#slet");
  await sendMail(
    email,
    `Din profil hos ${CLUB.name} er slettet`,
    `Hej ${name ?? ""}\n\nDin profil og dine data hos ${CLUB.name} er nu slettet. Betalinger gemmes i 5 år, fordi bogføringsloven kræver det, men uden dit navn og din mail.\n\nDu er altid velkommen tilbage.\n\nVenlig hilsen\nNyborg Triathlon Klub`,
  );
  redirect("/konto-slettet");
}
