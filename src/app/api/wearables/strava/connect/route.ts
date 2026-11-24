import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { authorizeUrl } from "@/lib/wearables/strava";

const base = () => process.env.AUTH_URL ?? "http://localhost:3000";

export async function GET() {
  const session = await auth();
  if (!session?.user) return Response.redirect(`${base()}/login?callbackUrl=/forbindelser`);
  const state = randomBytes(16).toString("hex");
  (await cookies()).set("strava_state", state, { httpOnly: true, secure: base().startsWith("https"), sameSite: "lax", maxAge: 600, path: "/" });
  try {
    return Response.redirect(authorizeUrl(`${base()}/api/wearables/strava/callback`, state));
  } catch {
    return Response.redirect(`${base()}/forbindelser?fejl=${encodeURIComponent("Strava er ikke sat op endnu")}`);
  }
}
