"use server";

import { redirect } from "next/navigation";
import { requireTrainer } from "@/auth";
import { prisma } from "@/lib/db";
import { AUDIENCES, isAudience, mailFooter, recipients, sendBulk, type MailKind } from "@/lib/bulkmail";
import { sendMail } from "@/lib/mail";
import { CLUB } from "@/lib/club";

export async function sendGroupMail(formData: FormData) {
  const user = await requireTrainer();
  const back = (q: string) => redirect(`/admin/mail?${q}`);
  const audience = String(formData.get("audience") ?? "");
  const kind: MailKind = formData.get("kind") === "IMPORTANT" ? "IMPORTANT" : "NEWS";
  const subject = String(formData.get("subject") ?? "").trim().slice(0, 150);
  const body = String(formData.get("body") ?? "").trim().slice(0, 10000);
  if (!isAudience(audience)) back("fejl=" + encodeURIComponent("Vælg modtagere"));
  const a = AUDIENCES.find((x) => x.value === audience)!;
  if (user.role === "TRAINER" && !a.trainerAllowed) back("fejl=" + encodeURIComponent("Trænere kan kun skrive til et hold eller til trænerne"));
  if (subject.length < 3 || body.length < 10) back("fejl=" + encodeURIComponent("Skriv både emne og besked"));

  const text = `${body}\n\nVenlig hilsen\n${user.name ?? CLUB.name}${mailFooter(kind)}`;
  if (formData.get("intent") === "test") {
    const ok = await sendMail(user.email!, `[Test] ${subject}`, text);
    back(ok ? "test=1" : "fejl=" + encodeURIComponent("Testmailen kunne ikke sendes. Tjek mailserveren under Drift."));
  }
  if (formData.get("confirm") !== "on") back("fejl=" + encodeURIComponent("Sæt flueben for at bekræfte, at mailen skal sendes"));

  const to = await recipients(audience as typeof a.value, kind);
  if (to.length === 0) back("fejl=" + encodeURIComponent("Der er ingen modtagere i den gruppe"));
  const r = await sendBulk(to, subject, text);
  await prisma.mailLog.create({
    data: { audience, kind, subject, body, recipients: r.sent, failed: r.failed, sentById: user.id, sentByName: user.name ?? null },
  });
  back(`sendt=${r.sent}&fejlede=${r.failed}`);
}
