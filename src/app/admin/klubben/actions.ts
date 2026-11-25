"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Discipline, Prisma } from "@prisma/client";
import { requireAdmin } from "@/auth";
import { prisma } from "@/lib/db";
import { readImage } from "@/lib/upload";
import { lines, parseCoords, rows, slug, str } from "@/lib/form-rows";
import { SITE_KEYS, ensureRoutesCopied, refreshClub, saveSite } from "@/lib/site";
import { lengthKm, parseGpx } from "@/lib/routes";
import type { AboutContent, HomeContent } from "@/data/site-default";
import type { ClubOverrides, Place } from "@/lib/club";

const back = (del: string, q = "gemt=1"): never => redirect(`/admin/klubben?del=${del}&${q}`);
const fail = (del: string, msg: string): never => back(del, `fejl=${encodeURIComponent(msg)}`);
const done = (del: string): never => {
  revalidatePath("/", "layout");
  return back(del);
};

/** Nyt billede, hvis der er valgt en fil, ellers det nuværende (skjult felt). Tomt, hvis "fjern" er krydset af. */
async function image(fd: FormData, name: string, del: string, maxWidth = 1600): Promise<string> {
  if (fd.get(`${name}Fjern`) === "on") return "";
  const r = await readImage(fd.get(`${name}File`), { folder: "klubben", maxWidth });
  if (!r.ok) fail(del, r.error);
  if (r.ok && r.url) return r.url;
  const cur = str(fd, name, 500);
  // Kun egne billeder: stier på siden, billedlageret eller data-URL'er fra upload uden billedlager
  return /^(\/[a-z0-9]|https:\/\/[a-z0-9.-]+\.blob\.vercel-storage\.com\/|data:image\/(webp|png|jpeg|gif|svg\+xml);base64,)/i.test(cur) ? cur : "";
}

const DISCIPLINES: Discipline[] = ["SWIM", "BIKE", "RUN", "STRENGTH", "OTHER"];

// ---------- Klubbens oplysninger og farver ----------

export async function saveClub(fd: FormData) {
  await requireAdmin();
  const color = (k: string) => (/^#[0-9a-f]{6}$/i.test(str(fd, k)) ? str(fd, k) : "");
  const o: ClubOverrides = {
    name: str(fd, "name", 80), shortName: str(fd, "shortName", 30), logoTop: str(fd, "logoTop", 30), logoSub: str(fd, "logoSub", 40),
    tagline: str(fd, "tagline", 200), email: str(fd, "email", 120), cvr: str(fd, "cvr", 20), bank: str(fd, "bank", 120),
    facebook: str(fd, "facebook", 200), domain: str(fd, "domain", 100), city: str(fd, "city", 60), zip: str(fd, "zip", 10),
    logoImage: await image(fd, "logoImage", "klub", 480),
    colors: { accent: color("accent"), accentDark: color("accentDark"), dark: color("dark"), light: color("light"), green: color("green"), theme: color("theme") },
  };
  if (o.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(o.email)) fail("klub", "Mailadressen ser forkert ud");
  if (o.facebook && !/^https:\/\//.test(o.facebook)) fail("klub", "Facebook-linket skal starte med https://");
  await saveSite("club", o);
  done("klub");
}

// ---------- Forside ----------

export async function saveHome(fd: FormData) {
  await requireAdmin();
  // Billeder til holdkort hentes separat, da rækkerne kan være sorteret fra
  const teamRows = [...fd.keys()].filter((k) => /^teams\.\d+\.title$/.test(k)).map((k) => +k.split(".")[1]).sort((a, b) => a - b);
  const teamOut: HomeContent["teams"] = [];
  for (const n of teamRows) {
    if (fd.get(`teams.${n}.slet`) === "on") continue;
    const title = str(fd, `teams.${n}.title`, 80);
    if (!title) continue;
    teamOut.push({ label: str(fd, `teams.${n}.label`, 30), title, text: str(fd, `teams.${n}.text`, 400), alt: str(fd, `teams.${n}.alt`, 120), img: await image(fd, `teams.${n}.img`, "forside") });
  }
  const c: HomeContent = {
    heroTitle: str(fd, "heroTitle", 120), heroLead: str(fd, "heroLead", 300), heroImage: await image(fd, "heroImage", "forside"), heroAlt: str(fd, "heroAlt", 120),
    proof: rows(fd, "proof", ["value", "label"] as const, 60),
    teamsTitle: str(fd, "teamsTitle", 80), teamsLead: str(fd, "teamsLead", 300), teams: teamOut,
    moreTitle: str(fd, "moreTitle", 80), moreImage: await image(fd, "moreImage", "forside"), more: lines(str(fd, "more", 2000)),
    athletesLead: str(fd, "athletesLead", 300),
    faq: rows(fd, "faq", ["q", "a"] as const, 600).filter((f) => f.q),
    ctaTitle: str(fd, "ctaTitle", 80), ctaImage: await image(fd, "ctaImage", "forside"),
  };
  if (!c.heroTitle) fail("forside", "Skriv en overskrift");
  await saveSite("home", c);
  done("forside");
}

// ---------- Om klubben ----------

export async function saveAbout(fd: FormData) {
  await requireAdmin();
  const tl = [...fd.keys()].filter((k) => /^timeline\.\d+\.title$/.test(k)).map((k) => +k.split(".")[1]).sort((a, b) => a - b);
  const timeline: AboutContent["timeline"] = [];
  for (const n of tl) {
    if (fd.get(`timeline.${n}.slet`) === "on") continue;
    const title = str(fd, `timeline.${n}.title`, 120);
    if (!title) continue;
    timeline.push({ year: str(fd, `timeline.${n}.year`, 30), title, text: str(fd, `timeline.${n}.text`, 1000), img: await image(fd, `timeline.${n}.img`, "om", 900) });
  }
  const gal = [...fd.keys()].filter((k) => /^gallery\.\d+\.alt$/.test(k)).map((k) => +k.split(".")[1]).sort((a, b) => a - b);
  const gallery: AboutContent["gallery"] = [];
  for (const n of gal) {
    if (fd.get(`gallery.${n}.slet`) === "on") continue;
    const src = await image(fd, `gallery.${n}.src`, "om");
    if (src) gallery.push({ src, alt: str(fd, `gallery.${n}.alt`, 120) });
  }
  const a: AboutContent = {
    title: str(fd, "title", 120), lead: str(fd, "lead", 600), image: await image(fd, "image", "om"),
    facts: rows(fd, "facts", ["value", "label"] as const, 60),
    timeline,
    archive: { show: fd.get("archiveShow") === "on", image: await image(fd, "archiveImage", "om"), title: str(fd, "archiveTitle", 120), text: str(fd, "archiveText", 600) },
    partners: rows(fd, "partners", ["name", "what", "url"] as const, 400).filter((p) => p.name).map((p) => ({ ...p, url: /^https:\/\//.test(p.url) ? p.url : "" })),
    gallery,
    ctaTitle: str(fd, "ctaTitle", 80), ctaText: str(fd, "ctaText", 300),
  };
  if (!a.title) fail("om", "Skriv en overskrift");
  await saveSite("about", a);
  done("om");
}

// ---------- Træningssteder ----------

export async function savePlaces(fd: FormData) {
  await requireAdmin();
  const home = str(fd, "home");
  const out: Place[] = [];
  for (const r of rows(fd, "places", ["id", "name", "what", "query", "coords"] as const, 300)) {
    if (!r.name) continue;
    const c = parseCoords(r.coords);
    if (!c) fail("steder", `Skriv koordinater for ${r.name}, fx 55.31176, 10.81017`);
    const id = r.id || slug(r.name);
    out.push({ id, name: r.name, what: r.what, query: r.query || r.name, lat: c!.lat, lng: c!.lng, ...(home === id || (home === "" && out.length === 0) ? { home: true } : {}) });
  }
  if (out.length && !out.some((p) => p.home)) out[0].home = true;
  await saveSite("places", out);
  done("steder");
}

// ---------- Ruter ----------

export async function addRoute(fd: FormData) {
  await requireAdmin();
  const f = fd.get("gpx");
  if (!(f instanceof File) || f.size === 0) fail("ruter", "Vælg en GPX-fil");
  if ((f as File).size > 5 * 1024 * 1024) fail("ruter", "GPX-filen er for stor (maks 5 MB)");
  let parsed: ReturnType<typeof parseGpx>;
  try { parsed = parseGpx(await (f as File).text()); } catch (e) { fail("ruter", e instanceof Error ? e.message : "GPX-filen kunne ikke læses"); }
  const name = str(fd, "name", 80) || parsed!.name || (f as File).name.replace(/\.gpx$/i, "");
  const sport = DISCIPLINES.includes(fd.get("sport") as Discipline) ? (fd.get("sport") as Discipline) : "RUN";
  await ensureRoutesCopied();
  let id = slug(name);
  if (await prisma.clubRoute.findUnique({ where: { id } })) id = `${id}-${Date.now().toString(36).slice(-4)}`;
  const max = await prisma.clubRoute.aggregate({ _max: { sortOrder: true } });
  await prisma.clubRoute.create({
    data: { id, name, sport, tag: str(fd, "tag", 40), desc: str(fd, "desc", 600), km: lengthKm(parsed!.pts), pts: parsed!.pts as unknown as Prisma.InputJsonValue, sortOrder: (max._max.sortOrder ?? 0) + 1 },
  });
  done("ruter");
}

export async function updateRoute(fd: FormData) {
  await requireAdmin();
  await ensureRoutesCopied();
  const id = str(fd, "id", 60);
  const sport = DISCIPLINES.includes(fd.get("sport") as Discipline) ? (fd.get("sport") as Discipline) : undefined;
  if (fd.get("slet") === "on") await prisma.clubRoute.deleteMany({ where: { id } });
  else await prisma.clubRoute.updateMany({ where: { id }, data: { name: str(fd, "name", 80) || undefined, tag: str(fd, "tag", 40), desc: str(fd, "desc", 600), sport } });
  done("ruter");
}

// ---------- Privatlivspolitik ----------

export async function savePrivacy(fd: FormData) {
  await requireAdmin();
  await saveSite("privacy", { extra: str(fd, "extra", 5000) });
  done("privatliv");
}

/** Gå tilbage til standardindholdet for en del. */
export async function resetSection(fd: FormData) {
  await requireAdmin();
  const del = str(fd, "del");
  const key = ({ klub: "club", forside: "home", om: "about", steder: "places", privatliv: "privacy" } as const)[del as "klub"];
  if (key) await prisma.setting.deleteMany({ where: { key: SITE_KEYS[key] } });
  if (key === "club") await refreshClub(true);
  done(del);
}
