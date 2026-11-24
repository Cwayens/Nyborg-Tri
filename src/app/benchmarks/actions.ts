"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/auth";
import { prisma } from "@/lib/db";
import { TEST_BY_KEY, isTest, matchTest, parseDuration } from "@/lib/benchmarks";
import { parseLocal } from "@/lib/time";

const back = (q: string) => redirect("/benchmarks?" + q);

export async function addBenchmark(formData: FormData) {
  const user = await requireUser("/benchmarks");
  const test = formData.get("test");
  const date = String(formData.get("date") ?? "");
  const value = String(formData.get("value") ?? "");
  const note = String(formData.get("note") ?? "").trim().slice(0, 200) || null;
  if (!isTest(test)) back("fejl=" + encodeURIComponent("Vælg en test"));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) back("fejl=" + encodeURIComponent("Vælg dato"));
  const def = TEST_BY_KEY[test as keyof typeof TEST_BY_KEY];

  let seconds: number | null = null;
  let watts: number | null = null;
  if (def.kind === "watts") {
    watts = Math.round(Number(value.replace(",", ".")));
    if (!(watts >= 30 && watts <= 700)) back("fejl=" + encodeURIComponent("Skriv dine gennemsnitlige watt for 20 minutter, fx 250"));
  } else {
    seconds = parseDuration(value);
    if (!seconds) back("fejl=" + encodeURIComponent("Skriv tiden som mm:ss, fx 22:15"));
  }

  await prisma.benchmarkResult.create({
    data: { userId: user.id, test: def.test, date: parseLocal(`${date}T12:00`), seconds, watts, note },
  });
  revalidatePath("/benchmarks");
  back("gemt=" + def.test);
}

// Gem en aktivitet (fx fra Strava) som testresultat
export async function addFromActivity(formData: FormData) {
  const user = await requireUser("/benchmarks");
  const a = await prisma.activity.findFirst({ where: { id: String(formData.get("id")), userId: user.id } });
  const test = a && matchTest(a);
  if (!a || !test) back("fejl=" + encodeURIComponent("Aktiviteten passer ikke til en test"));
  await prisma.benchmarkResult.create({
    data: { userId: user.id, test: test!, date: a!.startAt, seconds: a!.movingSec, source: a!.provider, note: a!.name },
  });
  revalidatePath("/benchmarks");
  back("gemt=" + test);
}

export async function deleteBenchmark(formData: FormData) {
  const user = await requireUser("/benchmarks");
  await prisma.benchmarkResult.deleteMany({ where: { id: String(formData.get("id")), userId: user.id } });
  revalidatePath("/benchmarks");
  back("");
}
