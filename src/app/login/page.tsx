import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";

export const metadata = { title: "Log ind" };

function safeCallback(url: string | undefined) {
  return url && url.startsWith("/") && !url.startsWith("//") ? url : "/min-side";
}

export default async function Login({ searchParams }: { searchParams: Promise<{ callbackUrl?: string }> }) {
  const callbackUrl = safeCallback((await searchParams).callbackUrl);
  if ((await auth())?.user) redirect(callbackUrl);

  async function login(formData: FormData) {
    "use server";
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
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
    </>
  );
}
