import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { baseUrl } from "@/lib/url";
import { authorizeUrl } from "@/lib/wearables/strava";


export async function GET() {
  const session = await auth();
  if (!session?.user) return Response.redirect(`${await baseUrl()}/login?callbackUrl=/forbindelser`);
  const state = randomBytes(16).toString("hex");
  (await cookies()).set("strava_state", state, { httpOnly: true, secure: (await baseUrl()).startsWith("https"), sameSite: "lax", maxAge: 600, path: "/" });
  try {
    return Response.redirect(authorizeUrl(`${await baseUrl()}/api/wearables/strava/callback`, state));
  } catch {
    return Response.redirect(`${await baseUrl()}/forbindelser?fejl=${encodeURIComponent("Strava er ikke sat op endnu")}`);
  }
}
