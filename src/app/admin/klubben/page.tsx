import Link from "next/link";
import { requireAdmin } from "@/auth";
import { AdminNav } from "@/components/AdminNav";
import { ENV_CLUB, CLUB } from "@/lib/club";
import { DISCIPLINE_LABEL } from "@/lib/roles";
import { getAbout, getClubOverrides, getHome, getPlaces, getPrivacy, getRoutes } from "@/lib/site";
import { addRoute, resetSection, saveAbout, saveClub, saveHome, savePlaces, savePrivacy, updateRoute } from "./actions";

export const metadata = { title: "Admin – klubben" };

const TABS = [
  ["klub", "Navn, logo og farver"],
  ["forside", "Forside"],
  ["om", "Om klubben"],
  ["steder", "Træningssteder"],
  ["ruter", "Ruter"],
  ["privatliv", "Privatlivspolitik"],
] as const;
type Tab = (typeof TABS)[number][0];

type Props = { searchParams: Promise<{ del?: string; gemt?: string; fejl?: string }> };

export default async function ClubAdmin({ searchParams }: Props) {
  await requireAdmin();
  const sp = await searchParams;
  const del: Tab = TABS.some(([k]) => k === sp.del) ? (sp.del as Tab) : "klub";
  return (
    <>
      <h1>Klubben</h1>
      <AdminNav />
      <p className="muted" style={{ maxWidth: 720 }}>
        Her retter du klubbens navn, logo, farver og teksterne på hjemmesiden. Ændringerne ses med det samme. Tekst kan have <b>**fed**</b> og
        links som <code>[se kalenderen](/traening)</code>.
      </p>
      <nav className="tabs" aria-label="Dele">
        {TABS.map(([k, label]) => (
          <Link key={k} href={`/admin/klubben?del=${k}`} className={k === del ? "active" : undefined} aria-current={k === del ? "page" : undefined}>{label}</Link>
        ))}
      </nav>
      {sp.gemt && <p className="notice">Gemt.</p>}
      {sp.fejl && <p className="status-warn">{sp.fejl}</p>}
      {del === "klub" && <ClubForm />}
      {del === "forside" && <HomeForm />}
      {del === "om" && <AboutForm />}
      {del === "steder" && <PlacesForm />}
      {del === "ruter" && <RoutesForm />}
      {del === "privatliv" && <PrivacyForm />}
      {del !== "ruter" && (
        <form action={resetSection} className="reset-form">
          <input type="hidden" name="del" value={del} />
          <button className="button ghost small" type="submit">Gå tilbage til standard for denne del</button>
        </form>
      )}
    </>
  );
}

// ---------- Små byggeklodser ----------

function F({ name, label, value, area, hint, max, type, placeholder }: { name: string; label: string; value?: string; area?: boolean; hint?: string; max?: number; type?: string; placeholder?: string }) {
  return (
    <label>
      {label}
      {area ? <textarea name={name} defaultValue={value} maxLength={max} placeholder={placeholder} style={{ minHeight: 90, fontFamily: "inherit" }} /> : <input name={name} type={type} defaultValue={value} maxLength={max} placeholder={placeholder} />}
      {hint && <small className="muted">{hint}</small>}
    </label>
  );
}

function Img({ name, label, value }: { name: string; label: string; value: string }) {
  return (
    <div className="img-field">
      <span className="img-label">{label}</span>
      <div className="img-row">
        {value ? <img src={value} alt="" /> : <span className="img-empty">Intet billede</span>}
        <div className="stack" style={{ gap: 6 }}>
          <input type="hidden" name={name} value={value} />
          <input type="file" name={`${name}File`} accept="image/png,image/jpeg,image/webp,image/gif" aria-label={`Nyt billede: ${label}`} />
          {value && <label className="check"><input type="checkbox" name={`${name}Fjern`} /> <span>Fjern billedet</span></label>}
        </div>
      </div>
    </div>
  );
}

const Del = ({ name }: { name: string }) => <label className="check row-del"><input type="checkbox" name={name} /> <span>Slet</span></label>;
const Save = () => <button className="button" type="submit">Gem</button>;
/** Eksisterende rækker plus et par tomme til nye. */
const withBlanks = <T,>(items: T[], blank: T, n = 2) => [...items, ...Array.from({ length: n }, () => blank)];

// ---------- Navn, logo og farver ----------

async function ClubForm() {
  const o = await getClubOverrides();
  const c = CLUB;
  const colors = [
    ["accent", "Knapper og links", c.colors.accent],
    ["accentDark", "Knapper, mørk", c.colors.accentDark],
    ["dark", "Mørke flader (top og bund)", c.colors.dark],
    ["light", "Lys klubfarve", c.colors.light],
    ["green", "Sekundær klubfarve", c.colors.green],
    ["theme", "Telefonens topbjælke", c.colors.theme],
  ] as const;
  return (
    <form action={saveClub} className="stack card admin-form" encType="multipart/form-data">
      <h2 className="h3" style={{ margin: 0 }}>Navn og kontakt</h2>
      <div className="row">
        <F name="name" label="Klubbens navn" value={o.name ?? ""} placeholder={ENV_CLUB.name} max={80} />
        <F name="shortName" label="Kort navn" value={o.shortName ?? ""} placeholder={ENV_CLUB.shortName} max={30} hint="Bruges i mails og på telefonens hjemmeskærm" />
      </div>
      <F name="tagline" label="Kort beskrivelse til Google" value={o.tagline ?? ""} placeholder={ENV_CLUB.tagline} max={200} />
      <div className="row">
        <F name="email" label="Mail" value={o.email ?? ""} placeholder={ENV_CLUB.email} type="email" />
        <F name="cvr" label="CVR" value={o.cvr ?? ""} placeholder={ENV_CLUB.cvr} />
        <F name="facebook" label="Facebook" value={o.facebook ?? ""} placeholder={ENV_CLUB.facebook || "https://www.facebook.com/…"} />
      </div>
      <div className="row">
        <F name="bank" label="Bank (til indbetaling)" value={o.bank ?? ""} placeholder={ENV_CLUB.bank} />
        <F name="city" label="By" value={o.city ?? ""} placeholder={ENV_CLUB.city} />
        <F name="zip" label="Postnr." value={o.zip ?? ""} placeholder={ENV_CLUB.zip} />
        <F name="domain" label="Domæne" value={o.domain ?? ""} placeholder={ENV_CLUB.domain || "minklub.dk"} />
      </div>
      <p className="muted small">Tomme felter bruger standarden, som står i feltet.</p>

      <h2 className="h3" style={{ margin: "12px 0 0" }}>Logo</h2>
      <div className="row">
        <F name="logoTop" label="Logotekst, linje 1" value={o.logoTop ?? ""} placeholder={ENV_CLUB.logoTop} max={30} />
        <F name="logoSub" label="Logotekst, linje 2" value={o.logoSub ?? ""} placeholder={ENV_CLUB.logoSub} max={40} />
      </div>
      <Img name="logoImage" label="Logobillede (vises ved siden af teksten)" value={o.logoImage ?? ""} />

      <h2 className="h3" style={{ margin: "12px 0 0" }}>Farver</h2>
      <div className="color-grid">
        {colors.map(([k, label, v]) => (
          <label key={k} className="color-field">
            <input type="color" name={k} defaultValue={v} />
            <span>{label}</span>
          </label>
        ))}
      </div>
      <p className="muted small">Vælg mørke farver til knapper og links, så teksten på dem er let at læse.</p>
      <div><Save /></div>
    </form>
  );
}

// ---------- Forside ----------

async function HomeForm() {
  const c = await getHome();
  return (
    <form action={saveHome} className="stack card admin-form" encType="multipart/form-data">
      <h2 className="h3" style={{ margin: 0 }}>Toppen</h2>
      <F name="heroTitle" label="Overskrift" value={c.heroTitle} max={120} />
      <F name="heroLead" label="Tekst under overskriften" value={c.heroLead} area max={300} />
      <div className="row">
        <Img name="heroImage" label="Stort billede" value={c.heroImage} />
        <F name="heroAlt" label="Beskrivelse af billedet (til skærmlæsere)" value={c.heroAlt} max={120} />
      </div>
      <fieldset className="rows">
        <legend>Tal om klubben</legend>
        {withBlanks(c.proof, { value: "", label: "" }, 1).map((f, i) => (
          <div key={i} className="row">
            <F name={`proof.${i}.value`} label="Tal" value={f.value} placeholder="fx ca. 100" max={30} />
            <F name={`proof.${i}.label`} label="Tekst" value={f.label} placeholder="fx medlemmer" max={60} />
            <Del name={`proof.${i}.slet`} />
          </div>
        ))}
      </fieldset>

      <h2 className="h3" style={{ margin: "12px 0 0" }}>Hold</h2>
      <div className="row">
        <F name="teamsTitle" label="Overskrift" value={c.teamsTitle} max={80} />
        <F name="teamsLead" label="Tekst" value={c.teamsLead} max={300} />
      </div>
      <fieldset className="rows">
        <legend>Kort (ét pr. hold)</legend>
        {withBlanks(c.teams, { label: "", title: "", text: "", img: "", alt: "" }, 1).map((t, i) => (
          <div key={i} className="row-card">
            <div className="row">
              <F name={`teams.${i}.label`} label="Mærke" value={t.label} placeholder="fx Bredde" max={30} />
              <F name={`teams.${i}.title`} label="Titel" value={t.title} max={80} />
              <Del name={`teams.${i}.slet`} />
            </div>
            <F name={`teams.${i}.text`} label="Tekst" value={t.text} area max={400} />
            <div className="row">
              <Img name={`teams.${i}.img`} label="Billede" value={t.img} />
              <F name={`teams.${i}.alt`} label="Beskrivelse af billedet" value={t.alt} max={120} />
            </div>
          </div>
        ))}
      </fieldset>

      <h2 className="h3" style={{ margin: "12px 0 0" }}>Mere end træning</h2>
      <F name="moreTitle" label="Overskrift" value={c.moreTitle} max={80} />
      <F name="more" label="Punkter (ét pr. linje)" value={c.more.join("\n")} area />
      <Img name="moreImage" label="Billede" value={c.moreImage} />
      <F name="athletesLead" label="Tekst over klubbens atleter" value={c.athletesLead} max={300} />

      <fieldset className="rows">
        <legend>Spørgsmål og svar</legend>
        {withBlanks(c.faq, { q: "", a: "" }, 1).map((f, i) => (
          <div key={i} className="row-card">
            <div className="row"><F name={`faq.${i}.q`} label="Spørgsmål" value={f.q} max={200} /><Del name={`faq.${i}.slet`} /></div>
            <F name={`faq.${i}.a`} label="Svar" value={f.a} area max={600} />
          </div>
        ))}
      </fieldset>

      <h2 className="h3" style={{ margin: "12px 0 0" }}>Bunden</h2>
      <F name="ctaTitle" label="Overskrift" value={c.ctaTitle} max={80} />
      <Img name="ctaImage" label="Billede" value={c.ctaImage} />
      <div><Save /></div>
    </form>
  );
}

// ---------- Om klubben ----------

async function AboutForm() {
  const a = await getAbout();
  return (
    <form action={saveAbout} className="stack card admin-form" encType="multipart/form-data">
      <F name="title" label="Overskrift" value={a.title} max={120} />
      <F name="lead" label="Indledning" value={a.lead} area max={600} />
      <Img name="image" label="Billede" value={a.image} />
      <fieldset className="rows">
        <legend>Fakta</legend>
        {withBlanks(a.facts, { value: "", label: "" }, 1).map((f, i) => (
          <div key={i} className="row">
            <F name={`facts.${i}.value`} label="Tal eller ord" value={f.value} placeholder="fx 2010" max={30} />
            <F name={`facts.${i}.label`} label="Tekst" value={f.label} placeholder="fx stiftet" max={60} />
            <Del name={`facts.${i}.slet`} />
          </div>
        ))}
      </fieldset>
      <fieldset className="rows">
        <legend>Historien</legend>
        {withBlanks(a.timeline, { year: "", title: "", text: "", img: "" }, 1).map((t, i) => (
          <div key={i} className="row-card">
            <div className="row">
              <F name={`timeline.${i}.year`} label="Hvornår" value={t.year} placeholder="fx 2010" max={30} />
              <F name={`timeline.${i}.title`} label="Titel" value={t.title} max={120} />
              <Del name={`timeline.${i}.slet`} />
            </div>
            <F name={`timeline.${i}.text`} label="Tekst" value={t.text} area max={1000} />
            <Img name={`timeline.${i}.img`} label="Billede" value={t.img} />
          </div>
        ))}
      </fieldset>
      <fieldset className="rows">
        <legend>Fra arkivet (fx et avisudklip)</legend>
        <label className="check"><input type="checkbox" name="archiveShow" defaultChecked={a.archive.show} /> <span>Vis på siden</span></label>
        <F name="archiveTitle" label="Overskrift" value={a.archive.title} max={120} />
        <F name="archiveText" label="Tekst" value={a.archive.text} area max={600} />
        <Img name="archiveImage" label="Billede" value={a.archive.image} />
      </fieldset>
      <fieldset className="rows">
        <legend>Samarbejde</legend>
        {withBlanks(a.partners, { name: "", what: "", url: "" }, 1).map((p, i) => (
          <div key={i} className="row">
            <F name={`partners.${i}.name`} label="Navn" value={p.name} max={80} />
            <F name={`partners.${i}.what`} label="Hvad" value={p.what} max={300} />
            <F name={`partners.${i}.url`} label="Link (https://…)" value={p.url} max={200} />
            <Del name={`partners.${i}.slet`} />
          </div>
        ))}
      </fieldset>
      <fieldset className="rows">
        <legend>Billeder</legend>
        {withBlanks(a.gallery, { src: "", alt: "" }, 2).map((g, i) => (
          <div key={i} className="row">
            <Img name={`gallery.${i}.src`} label={`Billede ${i + 1}`} value={g.src} />
            <F name={`gallery.${i}.alt`} label="Beskrivelse" value={g.alt} max={120} />
            {g.src && <Del name={`gallery.${i}.slet`} />}
          </div>
        ))}
      </fieldset>
      <div className="row">
        <F name="ctaTitle" label="Afslutning, overskrift" value={a.ctaTitle} max={80} />
        <F name="ctaText" label="Afslutning, tekst" value={a.ctaText} max={300} />
      </div>
      <div><Save /></div>
    </form>
  );
}

// ---------- Træningssteder ----------

async function PlacesForm() {
  const places = await getPlaces();
  return (
    <form action={savePlaces} className="stack card admin-form">
      <p className="muted" style={{ margin: 0 }}>
        Stederne vises på Kontakt og på kortet under Ruter. Koordinater finder du i Google Maps: højreklik på stedet og klik på tallene
        øverst, så er de kopieret. Du kan også indsætte et Google Maps-link.
      </p>
      {withBlanks(places.map((p) => ({ ...p, coords: `${p.lat}, ${p.lng}` })), { id: "", name: "", what: "", query: "", coords: "", lat: 0, lng: 0, home: false }, 2).map((p, i) => (
        <div key={i} className="row-card">
          <input type="hidden" name={`places.${i}.id`} value={p.id} />
          <div className="row">
            <F name={`places.${i}.name`} label="Navn" value={p.name} max={80} />
            <F name={`places.${i}.coords`} label="Koordinater" value={p.coords} placeholder="55.31176, 10.81017" />
            <Del name={`places.${i}.slet`} />
          </div>
          <div className="row">
            <F name={`places.${i}.what`} label="Hvad træner I her?" value={p.what} max={200} />
            <F name={`places.${i}.query`} label="Adresse til rutevejledning" value={p.query} max={120} />
          </div>
          {p.id && <label className="check"><input type="radio" name="home" value={p.id} defaultChecked={!!p.home} /> <span>Klubbens base (kortet starter her)</span></label>}
        </div>
      ))}
      <div><Save /></div>
    </form>
  );
}

// ---------- Ruter ----------

async function RoutesForm() {
  const routes = await getRoutes();
  const sports = ["RUN", "BIKE", "SWIM", "OTHER"] as const;
  return (
    <div className="stack">
      <form action={addRoute} className="stack card admin-form" encType="multipart/form-data">
        <h2 className="h3" style={{ margin: 0 }}>Tilføj rute fra GPX-fil</h2>
        <p className="muted" style={{ margin: 0 }}>Hent ruten som GPX fra Strava, Garmin, Komoot eller dit ur. Længden regnes ud af filen.</p>
        <div className="row">
          <label>GPX-fil<input type="file" name="gpx" accept=".gpx,application/gpx+xml" required /></label>
          <label>Sport<select name="sport" defaultValue="RUN">{sports.map((s) => <option key={s} value={s}>{DISCIPLINE_LABEL[s]}</option>)}</select></label>
        </div>
        <div className="row">
          <F name="name" label="Navn (ellers fra filen)" max={80} />
          <F name="tag" label="Mærke" placeholder="fx Lørdagsløb" max={40} />
        </div>
        <F name="desc" label="Beskrivelse" area max={600} />
        <div><button className="button" type="submit">Tilføj rute</button></div>
      </form>
      <h2 className="h3">Klubbens ruter ({routes.length})</h2>
      {routes.map((r) => (
        <form key={r.id} action={updateRoute} className="card stack admin-form">
          <input type="hidden" name="id" value={r.id} />
          <div className="row">
            <F name="name" label="Navn" value={r.name} max={80} />
            <label>Sport<select name="sport" defaultValue={r.sport}>{sports.map((s) => <option key={s} value={s}>{DISCIPLINE_LABEL[s]}</option>)}</select></label>
            <F name="tag" label="Mærke" value={r.tag} max={40} />
          </div>
          <F name="desc" label={`Beskrivelse · ${r.km.toLocaleString("da-DK")} km`} value={r.desc} area max={600} />
          <div className="row" style={{ alignItems: "center" }}>
            <Del name="slet" />
            <button className="button small secondary" type="submit">Gem</button>
          </div>
        </form>
      ))}
    </div>
  );
}

// ---------- Privatlivspolitik ----------

async function PrivacyForm() {
  const p = await getPrivacy();
  return (
    <form action={savePrivacy} className="stack card admin-form">
      <p className="muted" style={{ margin: 0 }}>
        Privatlivspolitikken beskriver, hvad systemet gemmer, og bruger automatisk klubbens navn, CVR og mail. Her kan I tilføje det, der
        gælder netop jeres klub, fx billeder fra stævner eller en kontaktperson.
      </p>
      <F name="extra" label="Ekstra tekst nederst i privatlivspolitikken" value={p.extra} area max={5000} />
      <div><Save /> <Link href="/privatlivspolitik" className="button ghost">Se privatlivspolitikken</Link></div>
    </form>
  );
}
