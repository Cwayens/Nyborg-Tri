import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/auth";
import { prisma } from "@/lib/db";
import { userTypeLabel } from "@/lib/roles";
import { isEmail, needsGuardian } from "@/lib/guardian";
import { deleteMyAccount } from "./actions";
import { featuresOff } from "@/lib/features";

export const metadata = { title: "Min profil" };

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
  const sessionUser = await requireUser("/profil");
  const { fejl, gemt, velkommen } = await searchParams;
  const user = await prisma.user.findUniqueOrThrow({ where: { id: sessionUser.id }, include: { athleteProfile: { select: { id: true } } } });
  const off = await featuresOff();
  return (
    <>
      <h1>{velkommen ? "Velkommen til NyborgTri!" : "Min profil"}</h1>
      {velkommen && <p>Skriv dit navn, så de andre kan se, hvem der kommer til træning.</p>}
      {fejl && <p className="status-warn">{fejl}</p>}
      {gemt && <p className="notice">Din profil er gemt.</p>}
      <form action={saveProfile} className="stack card">
        <input type="hidden" name="next" value={velkommen ? "/min-side" : ""} />
        <label>Fulde navn<input name="name" defaultValue={user.name ?? ""} required autoComplete="name" autoFocus={!!velkommen} /></label>
        <label>Telefon<input name="phone" defaultValue={user.phone ?? ""} autoComplete="tel" inputMode="tel" /></label>
        <div className="row">
          <label>Fødselsdato<input type="date" name="birthDate" defaultValue={user.birthDate?.toISOString().slice(0, 10) ?? ""} /></label>
          {!velkommen && <label>Vægt i kg (til FTP i W/kg)<input name="weightKg" inputMode="decimal" defaultValue={user.weightKg?.toLocaleString("da-DK") ?? ""} placeholder="fx 72,5" /></label>}
          <label>Klasse (til leaderboard)
            <select name="gender" defaultValue={user.gender ?? ""}>
              <option value="">Ikke angivet</option>
              <option value="FEMALE">Kvinder</option>
              <option value="MALE">Mænd</option>
            </select>
          </label>
        </div>
        {needsGuardian(user.birthDate) && (
          <fieldset className="guardian" data-minor>
            <legend>Forælder eller værge</legend>
            <p className="muted" style={{ margin: 0 }}>Får betalingslink, kvitteringer og påmindelser om fornyelse.</p>
            <label>Navn<input name="guardianName" defaultValue={user.guardianName ?? ""} /></label>
            <label>E-mail<input type="email" name="guardianEmail" defaultValue={user.guardianEmail ?? ""} /></label>
          </fieldset>
        )}
        {!velkommen && !off.has("leaderboard") && (
          <label className="check">
            <input type="hidden" name="lbShown" value="1" />
            <input type="checkbox" name="leaderboard" defaultChecked={user.leaderboard} />
            <span>Vis mine bedste præstationer fra uret på klubbens <Link href="/leaderboard">leaderboard</Link> (kræver fødselsdato og klasse)</span>
          </label>
        )}
        {!velkommen && (
          <label className="check">
            <input type="checkbox" name="newsMail" defaultChecked={user.newsMail} />
            <span>Send mig nyheder fra klubben på mail (vigtige beskeder som aflysninger får du altid)</span>
          </label>
        )}
        <p className="muted" style={{ margin: 0 }}>
          E-mail: {user.email} · Brugertype: {userTypeLabel(user.role, user.athleteGroup)}
          {!user.athleteGroup && " (en admin tildeler din gruppe)"}
        </p>
        <button className="button" type="submit" style={{ justifySelf: "start" }}>{velkommen ? "Kom i gang" : "Gem"}</button>
      </form>
      {!velkommen && (
        <p style={{ marginTop: 20 }}>
          {user.athleteProfile && !off.has("atleter") && <><Link href="/profil/atlet">Min atletprofil</Link> · </>}
          <Link href="/forbindelser">Ure, deling og kalender</Link> · <Link href="/bliv-medlem">Medlemskab og kvitteringer</Link>
        </p>
      )}
      {!velkommen && (
        <section id="slet" className="card stack data-rights">
          <h2 style={{ margin: 0 }}>Dine data</h2>
          <p style={{ margin: 0 }}>
            Du kan hente alt, hvad vi har gemt om dig, som en fil. Læs mere i vores <Link href="/privatlivspolitik">privatlivspolitik</Link>.
          </p>
          <p style={{ margin: 0 }}><a className="button secondary small" href="/api/mine-data" download>Hent mine data</a></p>
          <details>
            <summary>Slet min profil</summary>
            <form action={deleteMyAccount} className="stack" style={{ marginTop: 10 }}>
              <p style={{ margin: 0 }}>
                Dine oplysninger, træninger fra uret, testresultater, tilmeldinger, chatbeskeder og atletprofil slettes, og forbindelsen til Strava
                afbrydes. Betalinger gemmes i 5 år, fordi bogføringsloven kræver det, men uden dit navn og din mail. Det kan ikke fortrydes.
              </p>
              <label>Skriv SLET for at bekræfte<input name="confirm" autoComplete="off" required style={{ maxWidth: 200 }} /></label>
              <button className="button danger" type="submit" style={{ justifySelf: "start" }}>Slet min profil</button>
            </form>
          </details>
        </section>
      )}
    </>
  );
}
