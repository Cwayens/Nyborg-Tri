import Link from "next/link";
import { QuickLinks } from "@/components/QuickLinks";
import { CardIcon, LinkIcon, TrophyIcon } from "@/components/Icons";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/auth";
import { prisma } from "@/lib/db";
import { userTypeLabel } from "@/lib/roles";
import { isEmail, needsGuardian } from "@/lib/guardian";
import { deleteMyAccount } from "./actions";
import { featuresOff } from "@/lib/features";
import { getClub } from "@/lib/site";
import { getLocale, translator } from "@/lib/i18n";

export async function generateMetadata() {
  return { title: translator(await getLocale())("Min profil", "My profile") };
}

const schema = z.object({
  name: z.string().trim().min(2, "Skriv dit fulde navn").max(80),
  phone: z.string().trim().max(20).optional(),
  birthDate: z.string().optional(),
  gender: z.enum(["MALE", "FEMALE", ""]).optional(),
  weightKg: z.string().trim().optional(),
  guardianName: z.string().trim().max(100).optional(),
  guardianEmail: z.string().trim().toLowerCase().max(200).optional(),
});

async function saveProfile(formData: FormData) {
  "use server";
  const user = await requireUser("/profil");
  const r = schema.safeParse(Object.fromEntries(formData));
  if (!r.success) redirect("/profil?fejl=" + encodeURIComponent(r.error.issues[0].message));
  const { name, phone, birthDate, gender, guardianName, guardianEmail, weightKg } = r.data;
  const kg = weightKg ? Number(weightKg.replace(",", ".")) : null;
  if (kg !== null && !(kg >= 25 && kg <= 200)) redirect("/profil?fejl=" + encodeURIComponent("Skriv din vægt i kg, fx 72,5"));
  if (guardianEmail && !isEmail(guardianEmail)) redirect("/profil?fejl=" + encodeURIComponent("Forælderens e-mail ser forkert ud"));
  const welcome = !!formData.get("next");
  await prisma.user.update({
    where: { id: user.id },
    data: {
      name, phone: phone || null, birthDate: birthDate ? new Date(birthDate) : null, gender: gender || null,
      ...(formData.has("weightKg") ? { weightKg: kg === null ? null : Math.round(kg * 10) / 10 } : {}),
      ...(formData.has("guardianEmail") ? { guardianName: guardianName || null, guardianEmail: guardianEmail || null } : {}),
      // Leaderboard kræver køn og fødselsdato; samtykket vises ikke i velkomstformularen
      ...(welcome ? {} : { newsMail: formData.get("newsMail") === "on" }),
      ...(formData.has("lbShown") ? { leaderboard: formData.get("leaderboard") === "on" && !!gender && !!birthDate } : {}),
    },
  });
  revalidatePath("/", "layout");
  redirect(String(formData.get("next") || "/profil?gemt=1"));
}

export default async function Profile({ searchParams }: { searchParams: Promise<{ fejl?: string; gemt?: string; velkommen?: string }> }) {
  const CLUB = await getClub();
  const sessionUser = await requireUser("/profil");
  const { fejl, gemt, velkommen } = await searchParams;
  const user = await prisma.user.findUniqueOrThrow({ where: { id: sessionUser.id }, include: { athleteProfile: { select: { id: true } }, team: { select: { name: true, branch: { select: { name: true } } } } } });
  // Med flere afdelinger står afdelingen efter holdnavnet
  const teamName = user.team ? (user.team.branch && (await prisma.branch.count()) > 1 ? `${user.team.name} (${user.team.branch.name})` : user.team.name) : "";
  const off = await featuresOff();
  const loc = await getLocale();
  const t = translator(loc);
  return (
    <>
      <h1>{velkommen ? t(`Velkommen til ${CLUB.shortName}!`, `Welcome to ${CLUB.shortName}!`) : t("Min profil", "My profile")}</h1>
      {velkommen && <p>{t("Skriv dit navn, så de andre kan se, hvem der kommer til træning.", "Enter your name so the others can see who is coming to training.")}</p>}
      {fejl && <p className="status-warn">{fejl}</p>}
      {gemt && <p className="notice">{t("Din profil er gemt.", "Your profile has been saved.")}</p>}
      <form action={saveProfile} className="stack card">
        <input type="hidden" name="next" value={velkommen ? "/min-side" : ""} />
        <label>{t("Fulde navn", "Full name")}<input name="name" defaultValue={user.name ?? ""} required autoComplete="name" autoFocus={!!velkommen} /></label>
        <label>{t("Telefon", "Phone")}<input name="phone" defaultValue={user.phone ?? ""} autoComplete="tel" inputMode="tel" /></label>
        <div className="row">
          <label>{t("Fødselsdato", "Date of birth")}<input type="date" name="birthDate" defaultValue={user.birthDate?.toISOString().slice(0, 10) ?? ""} /></label>
          {!velkommen && <label>{t("Vægt i kg (til FTP i W/kg)", "Weight in kg (for FTP in W/kg)")}<input name="weightKg" inputMode="decimal" defaultValue={user.weightKg?.toLocaleString("da-DK") ?? ""} placeholder={t("fx 72,5", "e.g. 72,5")} /></label>}
          <label>{t("Klasse (til leaderboard)", "Category (for the leaderboard)")}
            <select name="gender" defaultValue={user.gender ?? ""}>
              <option value="">{t("Ikke angivet", "Not specified")}</option>
              <option value="FEMALE">{t("Kvinder", "Women")}</option>
              <option value="MALE">{t("Mænd", "Men")}</option>
            </select>
          </label>
        </div>
        {needsGuardian(user.birthDate) && (
          <fieldset className="guardian" data-minor>
            <legend>{t("Forælder eller værge", "Parent or guardian")}</legend>
            <p className="muted" style={{ margin: 0 }}>{t("Får betalingslink, kvitteringer og påmindelser om fornyelse.", "Receives the payment link, receipts and renewal reminders.")}</p>
            <label>{t("Navn", "Name")}<input name="guardianName" defaultValue={user.guardianName ?? ""} /></label>
            <label>{t("E-mail", "Email")}<input type="email" name="guardianEmail" defaultValue={user.guardianEmail ?? ""} /></label>
          </fieldset>
        )}
        {!velkommen && !off.has("leaderboard") && (
          <label className="check">
            <input type="hidden" name="lbShown" value="1" />
            <input type="checkbox" name="leaderboard" defaultChecked={user.leaderboard} />
            <span>{t("Vis mine bedste præstationer fra uret på klubbens", "Show my best efforts from my watch on the club")} <Link href="/leaderboard">leaderboard</Link> {t("(kræver fødselsdato og klasse)", "(needs date of birth and category)")}</span>
          </label>
        )}
        {!velkommen && (
          <label className="check">
            <input type="checkbox" name="newsMail" defaultChecked={user.newsMail} />
            <span>{t("Send mig nyheder fra klubben på mail (vigtige beskeder som aflysninger får du altid)", "Email me news from the club (you always get important messages such as cancellations)")}</span>
          </label>
        )}
        <p className="muted" style={{ margin: 0 }}>
          {t("E-mail", "Email")}: {user.email} · {t("Brugertype", "User type")}: {user.role === "ATHLETE" && user.team ? `${t("Atlet", "Athlete")} – ${teamName}` : userTypeLabel(user.role, null)}
          {!user.teamId && user.role === "ATHLETE" && t(" (en admin tildeler dit hold)", " (an admin assigns your team)")}
        </p>
        <button className="button" type="submit" style={{ justifySelf: "start" }}>{velkommen ? t("Kom i gang", "Get started") : t("Gem", "Save")}</button>
      </form>
      {!velkommen && (
        <QuickLinks label={t("Mere om dig", "More about you")} links={[
          ...(user.athleteProfile && !off.has("atleter") ? [{ href: "/profil/atlet", icon: <TrophyIcon />, title: t("Min atletprofil", "My athlete profile"), text: t("Resultater og præsentation", "Results and bio") }] : []),
          { href: "/forbindelser", icon: <LinkIcon />, title: t("Ure, deling og kalender", "Watches, sharing and calendar"), text: t("Forbind Garmin, Strava m.fl.", "Connect Garmin, Strava and more") },
          { href: "/bliv-medlem", icon: <CardIcon />, title: t("Medlemskab og kvitteringer", "Membership and receipts"), text: t("Forny og se betalinger", "Renew and see payments") },
        ]} />
      )}
      {!velkommen && (
        <section id="slet" className="card stack data-rights">
          <h2 style={{ margin: 0 }}>{t("Dine data", "Your data")}</h2>
          <p style={{ margin: 0 }}>
            {t("Du kan hente alt, hvad vi har gemt om dig, som en fil. Læs mere i vores", "You can download everything we have stored about you as a file. Read more in our")} <Link href="/privatlivspolitik">{t("privatlivspolitik", "privacy policy")}</Link>.
          </p>
          <p style={{ margin: 0 }}><a className="button secondary small" href="/api/mine-data" download>{t("Hent mine data", "Download my data")}</a></p>
          <details>
            <summary>{t("Slet min profil", "Delete my profile")}</summary>
            <form action={deleteMyAccount} className="stack" style={{ marginTop: 10 }}>
              <p style={{ margin: 0 }}>
                {t("Dine oplysninger, træninger fra uret, testresultater, tilmeldinger, chatbeskeder og atletprofil slettes, og forbindelsen til Strava afbrydes. Betalinger gemmes i 5 år, fordi bogføringsloven kræver det, men uden dit navn og din mail. Det kan ikke fortrydes.", "Your details, watch workouts, test results, sign-ups, chat messages and athlete profile are deleted, and the Strava connection is removed. Payments are kept for 5 years because Danish bookkeeping law requires it, but without your name and email. This cannot be undone.")}
              </p>
              <label>{t("Skriv SLET for at bekræfte", "Type SLET to confirm")}<input name="confirm" autoComplete="off" required style={{ maxWidth: 200 }} /></label>
              <button className="button danger" type="submit" style={{ justifySelf: "start" }}>{t("Slet min profil", "Delete my profile")}</button>
            </form>
          </details>
        </section>
      )}
    </>
  );
}
