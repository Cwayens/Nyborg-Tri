import { prisma } from "./db";
import { NOT_CHILD, isChild } from "./child-safety";
import { adultFilter, needsGuardian } from "./guardian";
import { sendMail } from "./mail";
import { baseUrl } from "./url";
import { CLUB } from "./club";

// Mentorordningen: tildel den mentor, der har færrest nye medlemmer, og giv begge besked på mail.
// Børn kan hverken få eller være mentor (se også databasens child_guard_mentor).

export type AssignResult = { ok: true; mentorName: string | null } | { ok: false; reason: "har" | "barn" | "ingen" };

export async function assignMentor(userId: string, note = ""): Promise<AssignResult> {
  const me = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true, email: true, phone: true, role: true, athleteGroup: true, birthDate: true } });
  if (isChild(me) || needsGuardian(me.birthDate)) return { ok: false, reason: "barn" };
  if (await prisma.mentorship.findUnique({ where: { menteeId: userId } })) return { ok: false, reason: "har" };
  const mentors = await prisma.user.findMany({
    where: { mentor: true, deletedAt: null, id: { not: userId }, ...NOT_CHILD, ...adultFilter() },
    select: { id: true, name: true, email: true, _count: { select: { mentorFor: true } } },
  });
  if (!mentors.length) return { ok: false, reason: "ingen" };
  const mentor = mentors.sort((a, b) => a._count.mentorFor - b._count.mentorFor)[0];
  try {
    await prisma.mentorship.create({ data: { menteeId: userId, mentorId: mentor.id } });
  } catch {
    return { ok: false, reason: "har" }; // to samtidige forespørgsler: den anden rammer den unikke nøgle
  }
  await prisma.user.update({ where: { id: userId }, data: { wantsMentor: false } });
  const url = `${await baseUrl()}/mentor`;
  const msg = note.trim().slice(0, 300);
  await sendMail(
    mentor.email,
    "Du er blevet mentor for et nyt medlem",
    `Hej ${mentor.name ?? ""}\n\n${me.name ?? "Et nyt medlem"} er ny i ${CLUB.shortName} og vil gerne have en mentor. Det er dig!\n\n` +
      `Skriv eller ring og aftal en tur sammen, og vis rundt til en klubtræning.\nMail: ${me.email}${me.phone ? `\nTelefon: ${me.phone}` : ""}` +
      `${msg ? `\n\nBesked: ${msg}` : ""}\n\nSe mere: ${url}\n\nTak fordi du hjælper!\n${CLUB.name}`,
  );
  await sendMail(me.email, `Din mentor i ${CLUB.shortName}`, `Hej ${me.name ?? ""}\n\n${mentor.name} er din mentor og kontakter dig snart. Du kan også selv skrive til ${mentor.email}.\n\nSe mere: ${url}\n\n${CLUB.name}`);
  return { ok: true, mentorName: mentor.name };
}

/** Giv klubben besked om et nyt medlem, der gerne vil have en mentor (til klubbens mail). */
export async function notifyClubWantsMentor(name: string, reason: "ny" | "ingen"): Promise<void> {
  const url = `${await baseUrl()}/mentor`;
  await sendMail(
    CLUB.email,
    reason === "ingen" ? "Et nyt medlem venter på en mentor" : "Nyt medlem vil gerne have en mentor",
    reason === "ingen"
      ? `${name} har fået adgang og vil gerne have en mentor, men ingen har meldt sig som mentor endnu.\n\nFind en, der vil hjælpe, og bed dem melde sig under Mentorordning: ${url}`
      : `${name} har meldt sig ind og vil gerne have en mentor. Medlemmet får automatisk en mentor, når indmeldelsen er godkendt eller betalt.\n\nSe mentorordningen: ${url}`,
  );
}
