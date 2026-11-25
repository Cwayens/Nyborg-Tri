"use server";

import { NOT_CHILD } from "@/lib/child-safety";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireMember, requireUser } from "@/auth";
import { adultFilter, isChild } from "@/lib/guardian";
import { prisma } from "@/lib/db";
import { requireFeature } from "@/lib/features";
import { sendMail } from "@/lib/mail";
import { baseUrl } from "@/lib/url";
import { CLUB } from "@/lib/club";

const CHILD_MSG = "Mentorordningen er for voksne medlemmer. Spørg din træner, hvis du gerne vil have en at træne med.";

async function childAccount(userId: string) {
  return isChild(await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { birthDate: true, athleteGroup: true } }));
}

export async function setMentor(formData: FormData) {
  const user = await requireMember("/mentor");
  await requireFeature("mentor");
  if (await childAccount(user.id)) redirect("/mentor?fejl=" + encodeURIComponent(CHILD_MSG));
  await prisma.user.update({ where: { id: user.id }, data: { mentor: formData.get("mentor") === "1" } });
  revalidatePath("/mentor");
}

/** Tildel den mentor, der har færrest nye medlemmer i forvejen, og giv begge besked på mail. */
export async function requestMentor(formData: FormData) {
  const user = await requireMember("/mentor");
  await requireFeature("mentor");
  // Børn kobles ikke 1:1 med en voksen, de ikke kender, og deres kontaktoplysninger sendes ikke ud
  if (await childAccount(user.id)) redirect("/mentor?fejl=" + encodeURIComponent(CHILD_MSG));
  if (await prisma.mentorship.findUnique({ where: { menteeId: user.id } })) redirect("/mentor");
  const mentors = await prisma.user.findMany({
    where: { mentor: true, deletedAt: null, id: { not: user.id }, ...NOT_CHILD, ...adultFilter() },
    select: { id: true, name: true, email: true, _count: { select: { mentorFor: true } } },
  });
  if (!mentors.length) redirect("/mentor?fejl=" + encodeURIComponent("Der er ingen ledige mentorer lige nu. Prøv igen senere, eller skriv i chatten."));
  const mentor = mentors.sort((a, b) => a._count.mentorFor - b._count.mentorFor)[0];
  const note = String(formData.get("note") ?? "").trim().slice(0, 300);
  await prisma.mentorship.create({ data: { menteeId: user.id, mentorId: mentor.id } });
  const me = await prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { name: true, email: true, phone: true } });
  const url = `${await baseUrl()}/mentor`;
  await sendMail(
    mentor.email,
    "Du er blevet mentor for et nyt medlem",
    `Hej ${mentor.name ?? ""}\n\n${me.name ?? "Et nyt medlem"} er ny i ${CLUB.shortName} og vil gerne have en mentor. Det er dig!\n\n` +
      `Skriv eller ring og aftal en tur sammen, og vis rundt til en klubtræning.\nMail: ${me.email}${me.phone ? `\nTelefon: ${me.phone}` : ""}` +
      `${note ? `\n\nBesked: ${note}` : ""}\n\nSe mere: ${url}\n\nTak fordi du hjælper!\n${CLUB.name}`,
  );
  await sendMail(me.email, `Din mentor i ${CLUB.shortName}`, `Hej ${me.name ?? ""}\n\n${mentor.name} er din mentor og kontakter dig snart. Du kan også selv skrive til ${mentor.email}.\n\nSe mere: ${url}\n\nNyborg Triathlon Klub`);
  revalidatePath("/mentor");
  redirect("/mentor?ny=1");
}

export async function endMentorship(formData: FormData) {
  const user = await requireUser("/mentor");
  await prisma.mentorship.deleteMany({ where: { id: String(formData.get("id")), OR: [{ menteeId: user.id }, { mentorId: user.id }] } });
  revalidatePath("/mentor");
}
