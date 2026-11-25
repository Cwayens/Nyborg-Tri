import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";
import { DEMO_USERS, demoEnabled } from "@/lib/demo";
import { loginAsDemo } from "./demo";
import { loginLinkAllowed } from "@/lib/login-limit";

export const metadata = { title: "Log ind" };

function safeCallback(url: string | undefined) {
  // "/\evil.dk" læses af browsere som "//evil.dk", så omvendte skråstreger afvises også
  return url && url.startsWith("/") && !url.startsWith("//") && !url.includes("\\") ? url : "/min-side";
}

export default async function Login({ searchParams }: { searchParams: Promise<{ callbackUrl?: string; fejl?: string }> }) {
  const sp = await searchParams;
  const callbackUrl = safeCallback(sp.callbackUrl);
  if ((await auth())?.user && !demoEnabled()) redirect(callbackUrl);

  async function login(formData: FormData) {
    "use server";
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    if (!(await loginLinkAllowed(email))) {
      redirect("/login?fejl=" + encodeURIComponent("Der er sendt mange login-links til den mail den seneste time. Tjek din indbakke (og spam), eller prøv igen senere."));
    }
    await signIn("nodemailer", { email, redirectTo: callbackUrl });
  }

  return (
    <>
      <h1>Log ind</h1>
      <p>Skriv din e-mail, så sender vi dig et login-link. Er du ny, oprettes din profil automatisk.</p>
      <form action={login} className="stack">
        <label>
          E-mail
          <input type="email" name="email" required autoComplete="email" />
        </label>
        <button className="button" type="submit">Send login-link</button>
      </form>
    
      {sp.fejl && <p className="status-warn">{sp.fejl}</p>}
      {demoEnabled() && (
        <section style={{ marginTop: 40 }}>
          <h2>Log ind som testbruger</h2>
          <p className="muted">Kun i testversionen. Prøv siden fra forskellige roller uden at bruge mail.</p>
          <div className="grid">
            {DEMO_USERS.map((u) => (
              <form key={u.key} action={loginAsDemo} className="card" style={{ display: "grid", gap: 8 }}>
                <input type="hidden" name="key" value={u.key} />
                <strong>{u.name}</strong>
                <span className="muted" style={{ fontSize: "0.9rem" }}>{u.describe}</span>
                <button className="button small secondary" type="submit" style={{ justifySelf: "start" }}>Log ind som {u.name.split(" ")[0]}</button>
              </form>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
