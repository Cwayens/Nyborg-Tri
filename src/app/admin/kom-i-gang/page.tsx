import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/auth";
import { AdminNav } from "@/components/AdminNav";
import { prisma } from "@/lib/db";
import { CLUB, ENV_CLUB } from "@/lib/club";
import { SITE_KEYS, saveSite } from "@/lib/site";
import { blankAbout, blankHome } from "@/data/site-default";
import { featuresOff, FEATURE_KEYS } from "@/lib/features";

export const metadata = { title: "Admin – kom i gang" };

// Opstartsguide til en ny klub: tjekliste med status, så bestyrelsen kan sætte systemet op på en aften.

async function startBlank() {
  "use server";
  await requireAdmin();
  // Erstat Nyborgs eksempelindhold med neutralt indhold. Kan altid rettes eller sættes tilbage under Admin → Klubben.
  await saveSite("home", blankHome(CLUB.name));
  await saveSite("about", blankAbout(CLUB.name));
  await saveSite("places", []);
  await saveSite("routes", { useDefault: false });
  await prisma.clubRoute.deleteMany({});
  revalidatePath("/", "layout");
  redirect("/admin/kom-i-gang?ryddet=1");
}

type Step = { title: string; text: string; href?: string; link?: string; done: boolean; note?: string };

export default async function Onboarding({ searchParams }: { searchParams: Promise<{ ryddet?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const keys = await prisma.setting.findMany({ where: { key: { in: Object.values(SITE_KEYS) } }, select: { key: true } });
  const has = (k: keyof typeof SITE_KEYS) => keys.some((x) => x.key === SITE_KEYS[k]);
  const [members, staff, types, off, teams] = await Promise.all([
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.user.count({ where: { deletedAt: null, role: { in: ["TRAINER", "ADMIN"] } } }),
    prisma.membershipType.count({ where: { active: true } }),
    featuresOff(),
    prisma.team.findMany({ where: { active: true }, select: { name: true } }),
  ]);
  const stripeKey = process.env.STRIPE_SECRET_KEY ?? "";
  const stripeMode = stripeKey.startsWith("sk_live_") ? "live" : stripeKey ? "test" : null;
  const mailOk = !!(process.env.RESEND_API_KEY || process.env.EMAIL_SERVER || process.env.SMTP_HOST);
  const ownName = has("club") || ENV_CLUB.name !== "Nyborg Triathlon Klub";
  const nyborgContent = CLUB.name !== "Nyborg Triathlon Klub" && !has("home");

  const steps: Step[] = [
    { title: "Navn, logo og farver", text: "Klubbens navn, logo, farver, mail, CVR og Facebook.", href: "/admin/klubben?del=klub", link: "Ret klubbens oplysninger", done: ownName, note: ownName ? CLUB.name : undefined },
    { title: "Forside og Om klubben", text: "Tekster og billeder, så siden fortæller jeres historie.", href: "/admin/klubben?del=forside", link: "Ret forsiden", done: has("home") && has("about") },
    { title: "Træningssteder og ruter", text: "Hvor I træner, og ruter fra GPX-filer.", href: "/admin/klubben?del=steder", link: "Ret træningssteder", done: has("places") },
    { title: "Hold", text: "Klubbens hold, fx U13, Motion og Elite, og hvem der ser hvilke træninger.", href: "/admin/hold", link: "Ret hold", done: teams.map((t) => t.name).join() !== "Elite,Bredde,Børn", note: teams.map((t) => t.name).join(", ") },
    { title: "Medlemstyper og priser", text: "Fx voksen, ungdom, familie og støttemedlem med pris pr. år.", href: "/admin/medlemstyper", link: "Ret medlemstyper", done: has("club") && types > 0, note: `${types} kan vælges` },
    { title: "Importér medlemmer", text: "Fra Excel eller jeres gamle system. Medlemmerne logger ind med deres mail.", href: "/admin/import", link: "Importér fra Excel", done: members > 1, note: `${members} medlemmer` },
    { title: "Trænere og bestyrelse", text: "Giv trænere og bestyrelse den rigtige adgang under Medlemmer.", href: "/admin", link: "Se medlemmer", done: staff > 1, note: `${staff} trænere og admins` },
    { title: "Funktioner", text: "Start enkelt. Slå det til, I har brug for, og tænd mere senere.", href: "/admin/funktioner", link: "Vælg funktioner", done: off.size > 0, note: `${FEATURE_KEYS.length - off.size} af ${FEATURE_KEYS.length} slået til` },
    {
      title: "Betaling med Stripe",
      text: "Klubben opretter sin egen Stripe-konto, så kontingentet går direkte til klubbens bank. Nøglerne sættes i installationens indstillinger (se docs/ny-klub.md).",
      done: stripeMode === "live",
      note: stripeMode === "live" ? "Rigtige betalinger er slået til" : stripeMode === "test" ? "Stripe kører i testtilstand" : "Stripe er ikke sat op endnu",
    },
    { title: "Mail", text: "Login-links og kvitteringer sendes fra klubbens domæne.", done: mailOk, note: mailOk ? "Mail er sat op" : "Mail er ikke sat op endnu" },
  ];
  const doneCount = steps.filter((s) => s.done).length;

  return (
    <>
      <h1>Kom i gang</h1>
      <AdminNav />
      {sp.ryddet && <p className="notice">Eksempelindholdet er ryddet. Skriv nu jeres egne tekster under <Link href="/admin/klubben?del=forside">Klubben</Link>.</p>}
      <p className="muted" style={{ maxWidth: 680 }}>Her er alt, der skal på plads, før klubben tager systemet i brug. I kan tage det i den rækkefølge, I vil.</p>
      <div className="meter big" role="progressbar" aria-valuenow={doneCount} aria-valuemin={0} aria-valuemax={steps.length} aria-label="Fremgang" style={{ maxWidth: 680 }}>
        <i style={{ width: `${(doneCount / steps.length) * 100}%` }} />
      </div>
      <p className="muted small">{doneCount} af {steps.length} klar</p>

      {nyborgContent && (
        <section className="card" style={{ borderLeft: "4px solid var(--accent)", maxWidth: 820, marginBottom: 16 }}>
          <strong>Siden viser stadig eksempelindhold fra Nyborg Triathlon Klub</strong>
          <p style={{ margin: "6px 0 12px" }}>Forsiden, Om klubben, træningssteder og ruter er fra Nyborg. Ryd dem, så I kan skrive jeres egne.</p>
          <form action={startBlank}><button className="button small" type="submit">Ryd eksempelindholdet</button></form>
        </section>
      )}

      <ol className="onboard">
        {steps.map((s, i) => (
          <li key={s.title} className={`card${s.done ? " done" : ""}`}>
            <span className="onboard-num" aria-hidden="true">{s.done ? "✓" : i + 1}</span>
            <div>
              <h2 className="h3" style={{ margin: 0 }}>{s.title}</h2>
              <p className="muted" style={{ margin: "4px 0" }}>{s.text}</p>
              {s.note && <p className="small" style={{ margin: 0 }}>{s.note}</p>}
            </div>
            {s.href && <Link href={s.href} className={`button small${s.done ? " ghost" : ""}`}>{s.link}</Link>}
          </li>
        ))}
      </ol>
    </>
  );
}
