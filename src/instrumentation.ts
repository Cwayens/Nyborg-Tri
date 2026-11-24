// Next.js kalder onRequestError ved fejl i sider, server actions og API-ruter. Vi mailer den driftsansvarlige.
export async function onRequestError(error: unknown, request: { path: string; method: string }) {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { alert } = await import("./lib/alert");
  await alert("Fejl på hjemmesiden", error, `${request.method} ${request.path}`);
}
