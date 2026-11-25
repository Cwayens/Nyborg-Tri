"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Discipline } from "@prisma/client";
import { requireUser } from "@/auth";
import { prisma } from "@/lib/db";
import { isOn } from "@/lib/features";
import { parseIcs } from "@/lib/ics-import";
import { parseWorkoutUpload } from "@/lib/fit-read";
import { referencesFor, workoutValue } from "@/lib/program-upload";
import { dayKey } from "@/lib/time";
import { parseText, totalDuration, type Workout } from "@/lib/workout";

const PAGE = "/kalender/mit-program";
const fail = (msg: string): never => redirect(`${PAGE}?fejl=${encodeURIComponent(msg)}`);
const DISCIPLINES: Discipline[] = ["SWIM", "BIKE", "RUN", "STRENGTH", "OTHER"];
const MAX_FILES = 20;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

async function owner() {
  if (!(await isOn("egetprogram"))) redirect("/kalender");
  return requireUser(PAGE);
}

const minutes = (w: Workout) => {
  const s = totalDuration(w);
  return s ? Math.min(600, Math.round(s / 60)) : null;
};

/** Kalenderfil (.ics) og/eller programfiler (.fit/.zwo/.mrc/.erg). Programfiler lægges på den valgte dag. */
export async function importFiles(formData: FormData) {
  const user = await owner();
  const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (!files.length) fail("Vælg en eller flere filer");
  if (files.length > MAX_FILES) fail(`Højst ${MAX_FILES} filer ad gangen`);
  const day = String(formData.get("day") ?? "");
  const fallback = DISCIPLINES.includes(formData.get("discipline") as Discipline) ? (formData.get("discipline") as Discipline) : "OTHER";
  const refs = await referencesFor(user.id);
  // Kalenderfiler: fra 30 dage tilbage og et år frem
  const from = dayKey(new Date(Date.now() - 30 * 864e5)), to = dayKey(new Date(Date.now() + 365 * 864e5));
  let added = 0, updated = 0;
  for (const f of files) {
    const name = f.name.toLowerCase();
    if (name.endsWith(".ics")) {
      if (f.size > 2 * 1024 * 1024) fail(`${f.name} er for stor (maks 2 MB)`);
      let events;
      try { events = parseIcs(await f.text()); } catch (e) { fail(`${f.name}: ${e instanceof Error ? e.message : "kunne ikke læses"}`); }
      for (const ev of events!.filter((e) => e.day >= from && e.day <= to)) {
        const data = { day: ev.day, time: ev.time, title: ev.title, discipline: ev.discipline, durationMin: ev.durationMin, description: ev.description };
        const before = await prisma.plannedWorkout.findUnique({ where: { userId_uid: { userId: user.id, uid: ev.uid } }, select: { id: true } });
        await prisma.plannedWorkout.upsert({
          where: { userId_uid: { userId: user.id, uid: ev.uid } },
          update: data,
          create: { ...data, userId: user.id, uid: ev.uid, source: "kalender" },
        });
        if (before) updated++; else added++;
      }
      continue;
    }
    if (!DAY.test(day)) fail("Vælg hvilken dag programmet skal ligge på");
    if (f.size > 512 * 1024) fail(`${f.name} er for stor (maks 0,5 MB)`);
    let w: Workout;
    try { w = parseWorkoutUpload(f.name, new Uint8Array(await f.arrayBuffer()), refs); } catch (e) { fail(`${f.name}: ${e instanceof Error ? e.message : "kunne ikke læses"}`); }
    await prisma.plannedWorkout.create({
      data: {
        userId: user.id, day, title: (w!.name?.trim() || f.name.replace(/\.[^.]+$/, "")).slice(0, 80), discipline: w!.sport ?? fallback,
        durationMin: minutes(w!), description: w!.description?.slice(0, 2000) || null, workout: workoutValue(w!), source: "fil",
      },
    });
    added++;
  }
  revalidatePath("/kalender");
  redirect(`${PAGE}?importeret=${added}&opdateret=${updated}`);
}

/** Skriv en træning selv, evt. med program i tekst (fx "10min 60%, 5x(4min 105%, 3min 55%)"). */
export async function addManual(formData: FormData) {
  const user = await owner();
  const day = String(formData.get("day") ?? "");
  const title = String(formData.get("title") ?? "").trim().slice(0, 80);
  const discipline = formData.get("discipline") as Discipline;
  if (!DAY.test(day)) fail("Vælg dag");
  if (title.length < 2) fail("Skriv hvad du skal");
  if (!DISCIPLINES.includes(discipline)) fail("Vælg sport");
  const text = String(formData.get("program") ?? "").trim();
  let w: Workout | undefined;
  try { w = text ? parseText(text) : undefined; } catch (e) { fail(e instanceof Error ? e.message : "Programmet kunne ikke læses"); }
  const dur = Number(formData.get("durationMin"));
  await prisma.plannedWorkout.create({
    data: {
      userId: user.id, day, title, discipline, source: "manuel", workout: workoutValue(w),
      durationMin: (w && minutes(w)) || (dur >= 5 && dur <= 600 ? Math.round(dur) : null),
    },
  });
  revalidatePath("/kalender");
  redirect(`/kalender?maaned=${day.slice(0, 7)}&dag=${day}#dag`);
}

export async function deletePlanned(formData: FormData) {
  const user = await owner();
  await prisma.plannedWorkout.deleteMany({ where: { id: String(formData.get("id")), userId: user.id } });
  revalidatePath("/kalender");
  const back = String(formData.get("back") ?? "");
  redirect(back.startsWith("/kalender") ? back : PAGE);
}

/** Fjern alt, der kom fra kalenderfiler (fx før en ny import fra TrainingPeaks). */
export async function deleteImported() {
  const user = await owner();
  await prisma.plannedWorkout.deleteMany({ where: { userId: user.id, source: "kalender", sharedId: null } });
  revalidatePath("/kalender");
  redirect(`${PAGE}?ryddet=1`);
}
