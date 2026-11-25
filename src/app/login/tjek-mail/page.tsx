import { tr } from "@/lib/i18n";

export async function generateMetadata() {
  const t = await tr();
  return { title: t("Tjek din mail", "Check your email") };
}

export default async function CheckEmail() {
  const t = await tr();
  return (
    <>
      <h1>{t("Tjek din mail", "Check your email")}</h1>
      <p>{t("Vi har sendt dig et link. Klik på det for at logge ind. Linket virker i 24 timer.", "We've sent you a link. Click it to log in. The link works for 24 hours.")}</p>
      <p className="muted">{t("Kan du ikke finde mailen, så kig i spam-mappen.", "Can't find the email? Check your spam folder.")}</p>
    </>
  );
}
