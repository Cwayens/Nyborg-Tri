import { auth } from "@/auth";
import { exportUserData } from "@/lib/account";

// Download af alle egne data som JSON (GDPR art. 15 og 20)
export async function GET() {
  const session = await auth();
  if (!session?.user) return new Response("Log ind først", { status: 401 });
  const data = await exportUserData(session.user.id);
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="nyborgtri-mine-data-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
