import { NOT_CHILD } from "@/lib/child-safety";
import Link from "next/link";
import { requireUser } from "@/auth";
import { canSignUp } from "@/lib/access";
import { prisma } from "@/lib/db";
import { disciplineLabel } from "@/lib/roles";
import { getLocale, translator } from "@/lib/i18n";
import { WorkoutCard } from "@/components/WorkoutCard";
import { createWorkout } from "./actions";
import { referencesFor } from "@/lib/program-upload";
import { isOn, requireFeature } from "@/lib/features";

export async function generateMetadata() {
  return { title: translator(await getLocale())("Træn sammen", "Train together") };
}

type Props = { searchParams: Promise<{ ny?: string; fejl?: string; oprettet?: string; sport?: string; fra?: string }> };

export default async function TrainTogether({ searchParams }: Props) {
  await requireFeature("traensammen");
  const user = await requireUser("/traen-sammen");
  const { ny, fejl, oprettet, sport, fra } = await searchParams;
  // Del en træning fra eget program: felterne udfyldes, så man kun mangler tid og sted
  const from = fra && (await isOn("egetprogram")) ? await prisma.plannedWorkout.findFirst({ where: { id: fra, userId: user.id, sharedId: null } }) : null;
  const eligible = await canSignUp(user.id);
  const workouts = await prisma.groupWorkout.findMany({
    where: { startsAt: { gte: new Date(Date.now() - 2 * 3600 * 1000) }, host: NOT_CHILD, ...(sport ? { discipline: sport as never } : {}) },
    include: { host: { select: { name: true } }, participants: { where: { user: NOT_CHILD }, include: { user: { select: { id: true, name: true } } }, orderBy: { createdAt: "asc" } } },
    orderBy: { startsAt: "asc" },
    take: 50,
  });
  const refs = await referencesFor(user.id);
  const today = new Date().toISOString().slice(0, 10);
  const loc = await getLocale();
  const t = translator(loc);

  return (
    <>
      <div className="section-head" style={{ marginTop: 0 }}>
        <div>
          <h1 style={{ marginBottom: 4 }}>{t("Træn sammen", "Train together")}</h1>
          <p className="muted" style={{ margin: 0 }}>
            {t("Skal du ud at løbe, cykle eller svømme? Slå det op, så andre kan hoppe med.", "Going for a run, ride or swim? Post it so others can join.")}
            {(await isOn("makker")) && <> {t("Eller", "Or")} <Link href="/makker">{t("find en makker i dit tempo", "find a buddy at your pace")}</Link>.</>}
          </p>
        </div>
        {!ny && eligible && <Link href="/traen-sammen?ny=1" className="button">{t("+ Slå en tur op", "+ Post a session")}</Link>}
      </div>

      {oprettet && <p className="notice">{t("Din tur er slået op. Andre medlemmer kan nu se den og hoppe med.", "Your session is posted. Other members can now see it and join.")}</p>}
      {fejl && <p className="status-warn">{fejl}</p>}
      {!eligible && <p className="card">{t("Du kan slå ture op og hoppe med, når du er medlem.", "You can post and join sessions once you are a member.")} <Link href="/bliv-medlem">{t("Se mulighederne", "See the options")}</Link></p>}

      {ny && eligible && (
        <section className="card" style={{ marginBottom: 24 }}>
          <h2 style={{ marginTop: 0 }}>{from ? t("Del din træning", "Share your workout") : t("Ny tur", "New session")}</h2>
          <form action={createWorkout} className="stack" encType="multipart/form-data" style={{ maxWidth: "100%" }}>
            {from && (
              <>
                <input type="hidden" name="plannedId" value={from.id} />
                <p className="share-from"><span>{t("Fra dit eget program:", "From your own plan:")} <b>{from.title}</b>{from.workout ? t(" med program", " with workout") : ""}. {t("Tilføj tid og mødested, så kan andre hoppe med.", "Add a time and meeting point so others can join.")}</span></p>
              </>
            )}
            <div className="row">
              <label>Sport
                <select name="discipline" defaultValue={from?.discipline ?? "RUN"}>
                  {(["RUN", "BIKE", "SWIM", "STRENGTH", "OTHER"] as const).map((d) => <option key={d} value={d}>{disciplineLabel(d, loc)}</option>)}
                </select>
              </label>
              <label>{t("Dato", "Date")}<input type="date" name="date" min={today} defaultValue={from && from.day >= today ? from.day : today} required /></label>
              <label>{t("Tid", "Time")}<input type="time" name="time" defaultValue={from?.time ?? "17:30"} required /></label>
            </div>
            <label>{t("Hvad skal I?", "What are you doing?")}<input name="title" defaultValue={from?.title} placeholder={t("fx Rolig langtur 15 km (eller tag navnet fra programmet)", "e.g. Easy long run 15 km (or use the workout name)")} /></label>
            <div className="row">
              <label>{t("Mødested", "Meeting point")}<input name="location" placeholder={t("fx P-pladsen ved hallen", "e.g. the car park by the sports hall")} required /></label>
              <label>{t("Varighed (min)", "Duration (min)")}<input type="number" name="durationMin" defaultValue={from?.durationMin && from.durationMin >= 10 ? from.durationMin : 60} min={10} max={600} required /></label>
              <label>{t("Max deltagere", "Max participants")}<input type="number" name="maxPeople" min={2} max={100} placeholder={t("Ingen grænse", "No limit")} /></label>
            </div>
            <label>{t("Tempo/niveau (valgfrit)", "Pace/level (optional)")}<input name="level" placeholder={t("fx 5:30-6:00 /km eller 28-30 km/t", "e.g. 5:30-6:00 /km or 28-30 km/h")} /></label>
            {!from?.workout && <fieldset className="program-field">
              <legend>{t("Program fra TrainingPeaks (valgfrit)", "Workout from TrainingPeaks (optional)")}</legend>
              <p className="muted">
                {t("Åbn træningen i TrainingPeaks, vælg", "Open the workout in TrainingPeaks, choose")} <b>Export</b> {t("og gem som", "and save as")} <b>.fit</b>, <b>.zwo</b> {t("eller", "or")} <b>.mrc</b>. {t("Programmet vises i procent af FTP eller tærskelfart, så alle der hopper med, ser deres egne watt og tempoer og kan hente det til uret.", "The workout is shown as a percentage of FTP or threshold pace, so everyone who joins sees their own watts and paces and can send it to their watch.")}
              </p>
              <label>{t("Importér fil", "Import file")}<input type="file" name="programFile" accept=".fit,.zwo,.mrc,.erg,.json,.txt" /></label>
              <label>{t("…eller skriv det", "…or type it")}<textarea name="program" placeholder={"10min 60%\n5x(4min 105%, 3min 55%)\n10min 50%"} style={{ minHeight: 80, fontFamily: "ui-monospace, monospace" }} /></label>
              <label className="check"><input type="checkbox" name="durationAuto" value="1" defaultChecked /><span>{t("Brug programmets længde som varighed", "Use the workout length as the duration")}</span></label>
            </fieldset>}
            <label>{t("Besked (valgfri)", "Message (optional)")}<textarea name="description" defaultValue={from?.description ?? undefined} maxLength={1000} style={{ minHeight: 80, fontFamily: "inherit" }} placeholder={t("fx Vi tager en kaffe bagefter", "e.g. Coffee afterwards")} /></label>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="button" type="submit">{t("Slå op", "Post")}</button>
              <Link href="/traen-sammen" className="button ghost">{t("Annullér", "Cancel")}</Link>
            </div>
          </form>
        </section>
      )}

      <p className="filters">
        <Link href="/traen-sammen" className={!sport ? "active" : undefined}>{t("Alle", "All")}</Link>
        {(["RUN", "BIKE", "SWIM"] as const).map((d) => (
          <Link key={d} href={`/traen-sammen?sport=${d}`} className={sport === d ? "active" : undefined}>{disciplineLabel(d, loc)}</Link>
        ))}
      </p>
      {workouts.length === 0 ? (
        <div className="card empty">{t("Ingen ture slået op endnu. Vær den første!", "No sessions posted yet. Be the first!")}</div>
      ) : (
        workouts.map((w) => <WorkoutCard key={w.id} w={w} userId={user.id} canJoin={eligible} refs={refs} loc={loc} />)
      )}
    </>
  );
}
