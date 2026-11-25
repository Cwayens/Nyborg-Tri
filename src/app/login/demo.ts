"use server";

import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { demoEmail, demoEnabled, DEMO_USERS } from "@/lib/demo";
import { isHttps } from "@/lib/url";

/**
 * Log ind som testbruger uden mail. Kun når DEMO_MODE=1, og kun for testbrugere (@demo.nyborgtri.dk),
 * så rigtige konti aldrig kan overtages på denne måde.
 */
export async function loginAsDemo(formData: FormData) {
  if (!(await demoEnabled())) redirect("/login");
  const key = String(formData.get("key"));
  if (!DEMO_USERS.some((u) => u.key === key)) redirect("/login");
  const user = await prisma.user.findFirst({ where: { email: demoEmail(key) } });
  if (!user) redirect("/login?fejl=" + encodeURIComponent("Testbrugerne er ikke oprettet endnu – lav en redeploy"));

  const sessionToken = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 24 * 3600 * 1000);
  await prisma.session.create({ data: { sessionToken, userId: user.id, expires } });
  const secure = await isHttps();
  (await cookies()).set(secure ? "__Secure-authjs.session-token" : "authjs.session-token", sessionToken, {
    httpOnly: true, sameSite: "lax", secure, path: "/", expires,
  });
  redirect("/min-side");
}
