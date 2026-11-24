import { cookies } from "next/headers";
import { auth } from "@/auth";
import { baseUrl } from "@/lib/url";
import { connectWithCode, syncRecent } from "@/lib/wearables/strava";

const back = async (q: string) => Response.redirect(`${await baseUrl()}/forbindelser?${q}`);

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return Response.redirect(`${await baseUrl()}/login?callbackUrl=/forbindelser`);
  const url = new URL(req.url);
  const jar = await cookies();
  const expected = jar.get("strava_state")?.value;
  jar.delete("strava_state");
  if (url.searchParams.get("error")) return back("fejl=" + encodeURIComponent("Du afviste adgangen på Strava"));
  const code = url.searchParams.get("code");
  if (!code || !expected || url.searchParams.get("state") !== expected) return back("fejl=" + encodeURIComponent("Ugyldigt svar fra Strava – prøv igen"));
  const scope = url.searchParams.get("scope");
  if (!scope?.includes("activity:read")) return back("fejl=" + encodeURIComponent("Giv adgang til at læse aktiviteter, ellers kan vi ikke hente dine træninger"));
  try {
    await connectWithCode(session.user.id, code, scope);
    const n = await syncRecent(session.user.id);
    return back(`forbundet=strava&hentet=${n}`);
  } catch (e) {
    console.error(e);
    return back("fejl=" + encodeURIComponent("Forbindelsen til Strava mislykkedes"));
  }
}
