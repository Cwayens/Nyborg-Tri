// Strukturerede træningsprogrammer (fx fra TrainingPeaks).
// Intensitet gemmes relativt, som brøk af atletens reference:
//   cykel: FTP (watt), løb: tærskelfart, svøm: 100 m-fart.
// 1.05 betyder 105 %. Hver atlet ser så sine egne watt og tempoer.

import type { Discipline } from "@prisma/client";
import { formatDuration } from "./benchmarks";

export type StepKind = "warmup" | "active" | "recovery" | "rest" | "cooldown";
export type Step = { kind: StepKind; durationSec?: number; distanceM?: number; low: number; high: number; label?: string };
export type Block = { repeat: number; steps: Step[] };
export type Workout = { blocks: Block[]; source: "zwo" | "mrc" | "erg" | "tp" | "text" | "fit"; name?: string; description?: string; sport?: Discipline };

export type References = { ftp?: number | null; thresholdPace?: number | null; swim100?: number | null };

// ---------- Import ----------

/** Vælger parser ud fra filnavn eller indhold. Kaster en dansk fejltekst ved ukendt format. */
export function parseWorkoutFile(name: string, content: string): Workout {
  const ext = name.toLowerCase().split(".").pop();
  const text = content.replace(/^﻿/, "").trim();
  if (ext === "zwo" || text.startsWith("<")) return parseZwo(text);
  if (ext === "json" || text.startsWith("{") || text.startsWith("[")) return parseTpStructure(JSON.parse(text));
  if (ext === "mrc" || ext === "erg" || /\[COURSE DATA\]/i.test(text)) return parseMrc(text);
  return parseText(text);
}

const attr = (tag: string, name: string): number | undefined => {
  const m = new RegExp(`\\b${name}\\s*=\\s*"([^"]*)"`, "i").exec(tag);
  return m ? Number(m[1]) : undefined;
};
const textOf = (xml: string, tag: string) => new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, "i").exec(xml)?.[1].trim();

/** Zwift/TrainingPeaks .zwo. Power-værdier er brøk af FTP (løb: af tærskelfart). */
export function parseZwo(xml: string): Workout {
  const body = /<workout>([\s\S]*?)<\/workout>/i.exec(xml)?.[1];
  if (!body) throw new Error("Filen indeholder ikke et <workout>-afsnit");
  const blocks: Block[] = [];
  const sportType = textOf(xml, "sportType")?.toLowerCase();
  for (const m of body.matchAll(/<(Warmup|Cooldown|Ramp|SteadyState|IntervalsT|FreeRide|MaxEffort)\b([^>]*)\/?>/gi)) {
    const kind = m[1].toLowerCase();
    const a = m[2];
    const dur = attr(a, "Duration");
    const isDist = /durationtype\s*=\s*"distance"/i.test(a);
    const len = (v?: number) => (isDist ? { distanceM: v } : { durationSec: v });
    if (kind === "intervalst") {
      const on = attr(a, "OnPower") ?? attr(a, "PowerOnHigh") ?? 1;
      const off = attr(a, "OffPower") ?? attr(a, "PowerOffHigh") ?? 0.5;
      blocks.push({
        repeat: attr(a, "Repeat") ?? 1,
        steps: [
          { kind: "active", ...len(attr(a, "OnDuration")), low: attr(a, "PowerOnLow") ?? on, high: on },
          { kind: "recovery", ...len(attr(a, "OffDuration")), low: attr(a, "PowerOffLow") ?? off, high: off },
        ],
      });
      continue;
    }
    let low = attr(a, "PowerLow") ?? attr(a, "Power") ?? 0;
    let high = attr(a, "PowerHigh") ?? attr(a, "Power") ?? low;
    if (low > high) [low, high] = [high, low];
    const k: StepKind = kind === "warmup" ? "warmup" : kind === "cooldown" ? "cooldown" : kind === "freeride" ? "rest" : low < 0.7 ? "recovery" : "active";
    blocks.push({ repeat: 1, steps: [{ kind: k, ...len(dur), low, high, ...(kind === "freeride" ? { label: "Fri" } : {}) }] });
  }
  if (!blocks.length) throw new Error("Fandt ingen trin i filen");
  return {
    blocks: mergeRepeats(blocks), source: "zwo", name: textOf(xml, "name"), description: textOf(xml, "description"),
    sport: sportType === "run" ? "RUN" : sportType === "bike" ? "BIKE" : undefined,
  };
}

/** .mrc (minutter + procent) og .erg (minutter + watt, kræver FTP i headeren). */
export function parseMrc(text: string): Workout {
  const watts = /MINUTES\s+WATTS/i.test(text);
  const ftp = Number(/FTP\s*=\s*(\d+)/i.exec(text)?.[1]);
  if (watts && !ftp) throw new Error("ERG-filen mangler FTP i headeren. Eksportér som .mrc (procent) i stedet.");
  const data = /\[COURSE DATA\]([\s\S]*?)\[END COURSE DATA\]/i.exec(text)?.[1] ?? "";
  const pts = data.split(/\r?\n/).map((l) => l.trim().split(/\s+/).map(Number)).filter((p) => p.length >= 2 && p.every(Number.isFinite));
  const steps: Step[] = [];
  for (let i = 0; i + 1 < pts.length; i++) {
    const [t0, v0] = pts[i];
    const [t1, v1] = pts[i + 1];
    const sec = Math.round((t1 - t0) * 60);
    if (sec <= 0) continue;
    const f = (v: number) => (watts ? v / ftp : v / 100);
    const low = Math.min(f(v0), f(v1));
    const high = Math.max(f(v0), f(v1));
    steps.push({ kind: high < 0.7 ? "recovery" : "active", durationSec: sec, low, high });
  }
  if (!steps.length) throw new Error("Fandt ingen trin i [COURSE DATA]");
  if (steps[0].high < 0.8) steps[0].kind = "warmup";
  if (steps.length > 1 && steps[steps.length - 1].high < 0.8) steps[steps.length - 1].kind = "cooldown";
  return { blocks: mergeRepeats(steps.map((s) => ({ repeat: 1, steps: [s] }))), source: watts ? "erg" : "mrc", name: /DESCRIPTION\s*=\s*(.+)/i.exec(text)?.[1].trim() };
}

type TpLength = { value?: number; unit?: string };
type TpTarget = { minValue?: number; maxValue?: number };
type TpStep = { name?: string; length?: TpLength; targets?: TpTarget[]; intensityClass?: string };
type TpItem = { type?: string; length?: TpLength; steps?: TpStep[] };

/** TrainingPeaks' strukturerede workout-format (bruges af deres API og eksport). Targets er i procent. */
export function parseTpStructure(json: unknown): Workout {
  const j = json as Record<string, unknown>;
  const root = (j.structure ?? j.Structure ?? (j.workout as Record<string, unknown>)?.structure ?? j) as unknown;
  const items: TpItem[] = Array.isArray(root) ? root : ((root as Record<string, unknown>)?.structure as TpItem[]) ?? [];
  if (!Array.isArray(items) || !items.length) throw new Error("Fandt ingen trin i TrainingPeaks-filen");
  const toStep = (s: TpStep): Step => {
    const t = s.targets?.[0] ?? {};
    const low = (t.minValue ?? t.maxValue ?? 0) / 100;
    const high = (t.maxValue ?? t.minValue ?? 0) / 100;
    const unit = (s.length?.unit ?? "second").toLowerCase();
    const v = s.length?.value ?? 0;
    const len = unit.startsWith("meter") ? { distanceM: v } : unit.startsWith("kilometer") ? { distanceM: v * 1000 } : unit.startsWith("minute") ? { durationSec: v * 60 } : { durationSec: v };
    const c = (s.intensityClass ?? "").toLowerCase();
    const kind: StepKind = c === "warmup" ? "warmup" : c === "cooldown" ? "cooldown" : c === "rest" || c === "recovery" ? "recovery" : "active";
    return { kind, ...len, low: Math.min(low, high), high: Math.max(low, high), ...(s.name ? { label: s.name } : {}) };
  };
  const blocks = items.map((it) => ({
    repeat: it.type === "repetition" ? Math.max(1, it.length?.value ?? 1) : 1,
    steps: (it.steps ?? []).map(toStep),
  })).filter((b) => b.steps.length);
  return { blocks, source: "tp", name: typeof j.title === "string" ? j.title : undefined };
}

/**
 * Kort tekstformat, som trænere kan skrive eller rette i:
 *   10min 60%
 *   5x(4min 105%, 3min 55%)
 *   8x100m 110% 20s pause
 *   10min 50-60% nedkøling
 */
export function parseText(input: string): Workout {
  const blocks: Block[] = [];
  const lines = input.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
  for (const raw of lines) {
    let line = raw.replace(/[×*]/g, "x");
    let repeat = 1;
    const rep = /^(\d+)\s*x\s*/i.exec(line);
    if (rep) {
      repeat = Number(rep[1]);
      line = line.slice(rep[0].length);
    }
    line = line.replace(/^\(|\)$/g, "");
    const parts = line.split(/\s*[,/;]\s*/).filter(Boolean);
    const steps: Step[] = [];
    for (const p of parts) steps.push(...parseTextStep(p, raw));
    if (!steps.length) throw new Error(`Kan ikke læse linjen "${raw}". Skriv fx "10min 60%" eller "5x(4min 105%, 3min 55%)".`);
    if (repeat > 1 && steps.length > 1 && steps[1].kind === "active" && steps[1].high < steps[0].high) steps[1].kind = "recovery";
    blocks.push({ repeat, steps });
  }
  if (!blocks.length) throw new Error("Programmet er tomt");
  if (blocks.length > 1) {
    const first = blocks[0], last = blocks[blocks.length - 1];
    if (first.repeat === 1 && first.steps.length === 1 && first.steps[0].kind === "active" && first.steps[0].high <= 0.75) first.steps[0].kind = "warmup";
    if (last.repeat === 1 && last.steps.length === 1 && last.steps[0].kind === "active" && last.steps[0].high <= 0.75) last.steps[0].kind = "cooldown";
  }
  return { blocks, source: "text" };
}

const AMOUNT = /(\d+(?:[.,]\d+)?)\s*(t|h|timer?|min|minutter|m|meter|km|s|sek|sekunder)\b/i;

function amount(text: string): { durationSec?: number; distanceM?: number } | null {
  const m = AMOUNT.exec(text);
  if (!m) return null;
  const v = Number(m[1].replace(",", "."));
  const u = m[2].toLowerCase();
  if (u === "t" || u.startsWith("h") || u.startsWith("time")) return { durationSec: Math.round(v * 3600) };
  if (u.startsWith("min")) return { durationSec: Math.round(v * 60) };
  if (u === "km") return { distanceM: Math.round(v * 1000) };
  if (u === "m" || u === "meter") return { distanceM: Math.round(v) };
  return { durationSec: Math.round(v) };
}

function parseTextStep(part: string, line: string): Step[] {
  // "100m 110% 20s pause": arbejde efterfulgt af pause
  const pause = /(\d+\s*(?:s|sek|min))\s*(?:pause|hvil)/i.exec(part);
  const main = pause ? part.replace(pause[0], "") : part;
  const out: Step[] = [];
  const len = amount(main);
  const pct = /(\d+(?:[.,]\d+)?)\s*(?:-\s*(\d+(?:[.,]\d+)?))?\s*%/.exec(main);
  const isRest = /pause|hvil/i.test(main) && !pct;
  if (len && (pct || isRest)) {
    const low = pct ? Number(pct[1].replace(",", ".")) / 100 : 0;
    const high = pct?.[2] ? Number(pct[2].replace(",", ".")) / 100 : low;
    const kind: StepKind = isRest ? "rest" : /opvarm|warm/i.test(line) ? "warmup" : /nedkøl|cool/i.test(line) ? "cooldown" : "active";
    out.push({ kind, ...len, low, high });
  } else if (len || pct) {
    throw new Error(`"${part.trim()}" mangler ${len ? "en intensitet i %" : "en varighed eller distance"}`);
  }
  if (pause) out.push({ kind: "rest", ...amount(pause[1])!, low: 0, high: 0 });
  return out;
}

/** Slår ens blokke efter hinanden sammen til gentagelser (fx 5 ens intervaller fra en .mrc-fil). */
function mergeRepeats(blocks: Block[]): Block[] {
  const key = (b: Block) => JSON.stringify(b.steps);
  const out: Block[] = [];
  for (const b of blocks) {
    const prev = out[out.length - 1];
    if (prev && key(prev) === key(b) && b.steps.length > 0) prev.repeat += b.repeat;
    else out.push({ ...b, steps: [...b.steps] });
  }
  // Mønster A,B,A,B,A,B → 3 x (A,B)
  const res: Block[] = [];
  for (let i = 0; i < out.length; ) {
    const a = out[i], b = out[i + 1];
    if (a && b && a.repeat === 1 && b.repeat === 1 && a.steps.length === 1 && b.steps.length === 1) {
      let n = 1;
      while (out[i + 2 * n] && out[i + 2 * n + 1] && key(out[i + 2 * n]) === key(a) && key(out[i + 2 * n + 1]) === key(b)) n++;
      if (n > 1) {
        res.push({ repeat: n, steps: [a.steps[0], b.steps[0]] });
        i += 2 * n;
        continue;
      }
    }
    res.push(a);
    i++;
  }
  return res;
}

// ---------- Visning ----------

const pctText = (s: Step) => (s.low === s.high ? `${Math.round(s.high * 100)} %` : `${Math.round(s.low * 100)}–${Math.round(s.high * 100)} %`);

export function referenceLabel(d: Discipline): string {
  return d === "BIKE" ? "af FTP" : d === "RUN" ? "af tærskelfart" : d === "SWIM" ? "af 100 m-fart" : "";
}

export function stepAmount(s: Step): string {
  if (s.distanceM) return s.distanceM >= 1000 && s.distanceM % 100 === 0 ? `${(s.distanceM / 1000).toLocaleString("da-DK")} km` : `${s.distanceM} m`;
  if (s.durationSec) return s.durationSec % 60 === 0 ? `${s.durationSec / 60} min` : s.durationSec < 60 ? `${s.durationSec} sek` : formatDuration(s.durationSec);
  return "";
}

/** Den personlige målværdi, fx "195–210 W" eller "4:35 /km". null hvis atleten mangler en test. */
export function personalTarget(d: Discipline, s: Step, ref: References): string | null {
  if (s.kind === "rest" || s.high === 0) return null;
  if (d === "BIKE" && ref.ftp) {
    const lo = Math.round(s.low * ref.ftp), hi = Math.round(s.high * ref.ftp);
    return lo === hi ? `${hi} W` : `${lo}–${hi} W`;
  }
  const pace = (base: number, unit: string) => {
    const fast = formatDuration(Math.round(base / s.high));
    const slow = formatDuration(Math.round(base / (s.low || s.high)));
    return fast === slow ? `${fast} ${unit}` : `${slow}–${fast} ${unit}`;
  };
  if (d === "RUN" && ref.thresholdPace) return pace(ref.thresholdPace, "/km");
  if (d === "SWIM" && ref.swim100) return pace(ref.swim100, "/100 m");
  return null;
}

export function stepIntensity(s: Step): string {
  if (s.kind === "rest") return s.label ?? "Pause";
  return s.high === 0 ? s.label ?? "Fri" : pctText(s);
}

export const KIND_LABEL: Record<StepKind, string> = { warmup: "Opvarmning", active: "Arbejde", recovery: "Rolig", rest: "Pause", cooldown: "Nedkøling" };

export function totalDuration(w: Workout): number | null {
  let sum = 0;
  for (const b of w.blocks) for (const s of b.steps) {
    if (!s.durationSec) return null;
    sum += s.durationSec * b.repeat;
  }
  return sum;
}

/** Tilbage til tekstformatet, så træneren kan rette programmet. */
export function toText(w: Workout): string {
  const stepText = (s: Step) => {
    const a = stepAmount(s).replace(" min", "min").replace(" sek", "s").replace(" m", "m").replace(" km", "km");
    if (s.kind === "rest") return `${a} pause`;
    const p = s.low === s.high ? `${Math.round(s.high * 100)}%` : `${Math.round(s.low * 100)}-${Math.round(s.high * 100)}%`;
    const tag = s.kind === "warmup" ? " opvarmning" : s.kind === "cooldown" ? " nedkøling" : "";
    return `${a} ${p}${tag}`;
  };
  return w.blocks
    .map((b) => (b.repeat > 1 ? `${b.repeat}x(${b.steps.map(stepText).join(", ")})` : b.steps.map(stepText).join(", ")))
    .join("\n");
}

// ---------- Referencer ud fra Mine tests ----------

type Bench = { test: string; seconds: number | null; watts: number | null };

/**
 * Atletens referencer:
 *  FTP = 95 % af bedste 20-minutterstest
 *  Tærskelfart ≈ 10 km-fart + 3 % eller 5 km-fart + 7 % (estimat)
 *  Svøm = bedste 100 m-tid
 */
export function referencesFrom(results: Bench[]): References {
  const best = (test: string, higher = false) => {
    const vals = results.filter((r) => r.test === test).map((r) => (higher ? r.watts : r.seconds)).filter((v): v is number => !!v);
    return vals.length ? (higher ? Math.max(...vals) : Math.min(...vals)) : null;
  };
  const twenty = best("BIKE_FTP20", true);
  const t10 = best("RUN_10K"), t5 = best("RUN_5K");
  const thr = t10 ? (t10 / 10) * 1.03 : t5 ? (t5 / 5) * 1.07 : null;
  return { ftp: twenty ? Math.round(twenty * 0.95) : null, thresholdPace: thr ? Math.round(thr) : null, swim100: best("SWIM_100") };
}

export function isWorkout(v: unknown): v is Workout {
  return !!v && typeof v === "object" && Array.isArray((v as Workout).blocks);
}
