import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { FROM_WEARABLE } from "./benchmarks";
import { parseWorkoutUpload } from "./fit-read";
import { parseText, referencesFrom, type References, type Workout } from "./workout";

/** Medlemmets egne referencer (FTP, tærskelfart, 100 m) ud fra tests fra uret. */
export async function referencesFor(userId: string): Promise<References> {
  return referencesFrom(await prisma.benchmarkResult.findMany({ where: { userId, ...FROM_WEARABLE }, select: { test: true, seconds: true, watts: true } }));
}

/**
 * Program fra fil (har forrang) eller tekstfelt. undefined = intet program.
 * Filer i watt eller fart (fx .fit fra TrainingPeaks) omregnes til procent ud fra uploaderens egne tests.
 */
export async function readProgram(formData: FormData, userId: string): Promise<Workout | undefined> {
  const file = formData.get("programFile");
  if (file instanceof File && file.size > 0) {
    if (file.size > 512 * 1024) throw new Error("Filen er for stor (maks 0,5 MB)");
    return parseWorkoutUpload(file.name, new Uint8Array(await file.arrayBuffer()), await referencesFor(userId));
  }
  const text = String(formData.get("program") ?? "").trim();
  return text ? parseText(text) : undefined;
}

export const workoutValue = (w: Workout | undefined | null) => (w ? (w as unknown as Prisma.InputJsonValue) : Prisma.DbNull);
