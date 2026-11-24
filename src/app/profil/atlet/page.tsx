import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/auth";
import { prisma } from "@/lib/db";
import { dato } from "@/lib/format";
import { readImage } from "@/lib/upload";
import { AthletePhoto } from "@/components/AthleteCard";

export const metadata = { title: "Min atletprofil" };

const text = (v: FormDataEntryValue | null, max: number) => String(v ?? "").trim().slice(0, max) || null;

function refresh() {
  revalidatePath("/atleter", "layout");
  revalidatePath("/");
  revalidatePath("/profil/atlet");
}

async function save(formData: FormData) {
  "use server";
  const user = await requireUser("/profil/atlet");
  const photo = await readImage(formData.get("photo"), 400);
  if (!photo.ok) redirect("/profil/atlet?fejl=" + encodeURIComponent(photo.error));
  await prisma.athleteProfile.update({
    where: { userId: user.id },
    data: {
      headline: text(formData.get("headline"), 120),
      bio: text(formData.get("bio"), 3000),
      goals: text(formData.get("goals"), 1000),
      results: text(formData.get("results"), 2000),
      instagram: text(formData.get("instagram"), 100),
      ...(photo.ok && photo.dataUrl ? { photo: photo.dataUrl } : {}),
    },
  });
  refresh();
  redirect("/profil/atlet?gemt=1");
}

async function setConsent(formData: FormData) {
  "use server";
  const user = await requireUser("/profil/atlet");
  await prisma.athleteProfile.update({ where: { userId: user.id }, data: { consentAt: formData.get("give") === "1" ? new Date() : null } });
  refresh();
  redirect("/profil/atlet?gemt=1");
}

export default async function MyAthleteProfile({ searchParams }: { searchParams: Promise<{ fejl?: string; gemt?: string }> }) {
  const user = await requireUser("/profil/atlet");
  const sp = await searchParams;
  const p = await prisma.athleteProfile.findUnique({ where: { userId: user.id }, include: { user: { select: { name: true } } } });
  if (!p) notFound();
  const visible = !!p.consentAt && p.published;

  return (
    <>
      <h1>Min atletprofil</h1>
      {sp.fejl && <p className="status-warn">{sp.fejl}</p>}
      {sp.gemt && <p className="notice">Gemt.</p>}

      <section className={`card ${p.consentAt ? "" : "lb-join"}`}>
        {p.consentAt ? (
          <>
            <p style={{ marginTop: 0 }}>
              Du gav samtykke {dato(p.consentAt)}. {visible ? <>Din profil er synlig på <Link href={`/atleter/${p.slug}`}>Atleter-siden</Link>.</> : "Klubben har ikke slået profilen til endnu."}
            </p>
            <form action={setConsent}><button className="linklike" type="submit">Træk samtykket tilbage og skjul min profil</button></form>
          </>
        ) : (
          <>
            <h2 className="h3" style={{ marginTop: 0 }}>Klubben vil gerne vise dig på Atleter-siden</h2>
            <p className="muted">
              Siden er offentlig og bruges til at finde sponsorer til dig og klubben. Den viser dit navn, billede og det, der står herunder.
              Ingen træningsdata fra dit ur. Du kan altid trække samtykket tilbage.
            </p>
            <form action={setConsent}><input type="hidden" name="give" value="1" /><button className="button" type="submit">Ja, vis min profil</button></form>
          </>
        )}
      </section>

      <form action={save} className="card stack" style={{ marginTop: 18 }}>
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <AthletePhoto a={p} className="ath-admin-img big" />
          <label style={{ flex: 1 }}>Profilbillede (højst 400 KB)<input type="file" name="photo" accept="image/png,image/jpeg,image/webp" /></label>
        </div>
        <label>Overskrift<input name="headline" defaultValue={p.headline ?? ""} maxLength={120} placeholder="fx Ironman-atlet, AG 25-29" /></label>
        <label>Om mig<textarea name="bio" rows={5} defaultValue={p.bio ?? ""} maxLength={3000} placeholder="Hvem er du, hvordan startede du, hvad driver dig?" /></label>
        <label>Mål for sæsonen (én pr. linje)<textarea name="goals" rows={3} defaultValue={p.goals ?? ""} /></label>
        <label>Resultater (én pr. linje)<textarea name="results" rows={4} defaultValue={p.results ?? ""} placeholder="Ironman Kalmar 2026: 9:52, 3. plads AG" /></label>
        <label>Instagram<input name="instagram" defaultValue={p.instagram ?? ""} placeholder="@brugernavn" /></label>
        <button className="button" type="submit" style={{ justifySelf: "start" }}>Gem</button>
      </form>
    </>
  );
}
