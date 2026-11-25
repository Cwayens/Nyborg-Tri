import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/auth";
import { AdminNav } from "@/components/AdminNav";
import { FEATURES, FEATURE_GROUPS, FEATURE_KEYS, clubFeaturesOff, setFeaturesOff } from "@/lib/features";

export const metadata = { title: "Admin – funktioner" };

async function save(formData: FormData) {
  "use server";
  await requireAdmin();
  await setFeaturesOff(FEATURE_KEYS.filter((k) => formData.get(k) !== "on"));
  revalidatePath("/", "layout");
  redirect("/admin/funktioner?gemt=1");
}

export default async function Features({ searchParams }: { searchParams: Promise<{ gemt?: string }> }) {
  await requireAdmin();
  const { gemt } = await searchParams;
  const off = await clubFeaturesOff();
  return (
    <>
      <h1>Funktioner</h1>
      <AdminNav />
      {gemt && <p className="notice">Gemt. Ændringen ses med det samme på siden.</p>}
      <p className="muted">
        Slå funktioner fra, hvis de bliver for meget. Links og bokse forsvinder, men data gemmes, så de kan slås til igen.
      </p>
      <form action={save} className="stack features-form">
        {FEATURE_GROUPS.map((g) => (
          <fieldset key={g} className="card stack">
            <legend className="h3">{g}</legend>
            {FEATURE_KEYS.filter((k) => FEATURES[k].group === g).map((k) => (
              <label key={k} className="check">
                <input type="checkbox" name={k} defaultChecked={!off.has(k)} />
                <span><b>{FEATURES[k].label}</b><br /><span className="muted">{FEATURES[k].text}</span></span>
              </label>
            ))}
          </fieldset>
        ))}
        <button className="button" type="submit" style={{ justifySelf: "start" }}>Gem</button>
      </form>
    </>
  );
}
