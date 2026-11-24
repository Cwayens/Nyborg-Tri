"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/auth";
import { prisma } from "@/lib/db";
import { isTest } from "@/lib/benchmarks";

// Resultater kan kun komme fra ure: atleten markerer en præstation, som er udtrukket fra en tur, som test.
const back = (q: string) => redirect("/benchmarks?" + q);

export async function saveEffort(formData: FormData) {
  const user = await requireUser("/benchmarks");
  const e = await prisma.effort.findFirst({
    where: { id: String(formData.get("id")), userId: user.id },
    include: { activity: { select: { name: true, provider: true } } },
  });
  if (!e || !isTest(e.test) || e.activity.provider === "MANUAL") back("fejl=" + encodeURIComponent("Præstationen kunne ikke findes"));
  await prisma.benchmarkResult.upsert({
    where: { effortId: e!.id },
    update: {},
    create: {
      userId: user.id, test: e!.test, date: e!.date, seconds: e!.seconds, watts: e!.watts,
      source: e!.activity.provider, note: e!.activity.name.slice(0, 200), effortId: e!.id,
    },
  });
  revalidatePath("/benchmarks");
  back("gemt=" + e!.test);
}

export async function deleteBenchmark(formData: FormData) {
  const user = await requireUser("/benchmarks");
  await prisma.benchmarkResult.deleteMany({ where: { id: String(formData.get("id")), userId: user.id } });
  revalidatePath("/benchmarks");
  back("");
}
