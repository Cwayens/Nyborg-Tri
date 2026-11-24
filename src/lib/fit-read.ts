import type { Discipline } from "@prisma/client";
import { formatDuration } from "./benchmarks";
import { parseWorkoutFile, type Block, type References, type Step, type StepKind, type Workout } from "./workout";

// Læser en FIT-workoutfil (fx eksporteret fra TrainingPeaks, Garmin Connect eller Wahoo) til vores programformat.
// Mål i watt eller fart omregnes til procent ud fra uploaderens egne tests, så alle andre ser deres egne tal.

type Msg = { global: number; fields: Record<number, number | string | undefined> };

const INVALID: Record<number, number> = { 1: 0xff, 2: 0xff, 0: 0xff, 0x83: 0x7fff, 0x84: 0xffff, 0x85: 0x7fffffff, 0x86: 0xffffffff, 0x8b: 0, 0x8c: 0 };

/** Alle beskeder i en FIT-fil. Kaster en dansk fejl, hvis filen ikke er FIT. */
export function readFitMessages(bytes: Uint8Array): Msg[] {
  if (bytes.length < 14 || String.fromCharCode(...bytes.slice(8, 12)) !== ".FIT") throw new Error("Filen er ikke en gyldig FIT-fil");
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const headerSize = bytes[0];
  const end = Math.min(bytes.length, headerSize + dv.getUint32(4, true));
  type Def = { global: number; little: boolean; fields: { num: number; size: number; base: number }[]; devSize: number };
  const defs = new Map<number, Def>();
  const out: Msg[] = [];
  let p = headerSize;
  while (p < end) {
    const h = bytes[p++];
    if (h & 0x80) {
      // Komprimeret tidsstempel: kun data
      const def = defs.get((h >> 5) & 0x3);
      if (!def) throw new Error("Ugyldig FIT-fil");
      p += def.fields.reduce((a, f) => a + f.size, 0) + def.devSize;
      continue;
    }
    const local = h & 0x0f;
    if (h & 0x40) {
      const little = bytes[p + 1] === 0;
      const global = little ? dv.getUint16(p + 2, true) : dv.getUint16(p + 2, false);
      const n = bytes[p + 4];
      p += 5;
      const fields = [];
      for (let i = 0; i < n; i++, p += 3) fields.push({ num: bytes[p], size: bytes[p + 1], base: bytes[p + 2] });
      let devSize = 0;
      if (h & 0x20) {
        const nd = bytes[p++];
        for (let i = 0; i < nd; i++, p += 3) devSize += bytes[p + 1];
      }
      defs.set(local, { global, little, fields, devSize });
      continue;
    }
    const def = defs.get(local);
    if (!def) throw new Error("Ugyldig FIT-fil");
    const msg: Msg = { global: def.global, fields: {} };
    for (const f of def.fields) {
      let v: number | string | undefined;
      if (f.base === 0x07) {
        const raw = bytes.slice(p, p + f.size);
        const z = raw.indexOf(0);
        v = new TextDecoder().decode(z >= 0 ? raw.slice(0, z) : raw) || undefined;
      } else if (f.size === 1) v = bytes[p];
      else if (f.size === 2) v = dv.getUint16(p, def.little);
      else if (f.size === 4) v = dv.getUint32(p, def.little);
      if (typeof v === "number" && INVALID[f.base] === v) v = undefined;
      msg.fields[f.num] = v;
      p += f.size;
    }
    p += def.devSize;
    out.push(msg);
  }
  return out;
}

const SPORT: Record<number, Discipline> = { 1: "RUN", 2: "BIKE", 5: "SWIM" };
const KIND: Record<number, StepKind> = { 0: "active", 1: "rest", 2: "warmup", 3: "cooldown", 4: "recovery", 5: "active" };
// Zone 1-7 som procent af FTP (Coggan), bruges når filen kun angiver en zone
const POWER_ZONE = [0, 0.5, 0.65, 0.83, 0.98, 1.13, 1.35, 1.5];

/** FIT-workout (beskeder 26 og 27) til vores format. */
export function parseFitWorkout(bytes: Uint8Array, ref: References = {}): Workout {
  const msgs = readFitMessages(bytes);
  const head = msgs.find((m) => m.global === 26);
  const rows = msgs.filter((m) => m.global === 27);
  if (!rows.length) throw new Error("FIT-filen indeholder ikke et træningsprogram (kun en gennemført tur?). Eksportér selve workouten fra TrainingPeaks.");
  const sport = SPORT[Number(head?.fields[4])];
  const num = (m: Msg, f: number) => (typeof m.fields[f] === "number" ? (m.fields[f] as number) : undefined);

  const toStep = (m: Msg): Step => {
    const durType = num(m, 1) ?? 5;
    const durVal = num(m, 2);
    const len = durType === 0 && durVal ? { durationSec: Math.round(durVal / 1000) } : durType === 1 && durVal ? { distanceM: Math.round(durVal / 100) } : {};
    const kind = KIND[num(m, 7) ?? 0] ?? "active";
    const tType = num(m, 3) ?? 2;
    const lo = num(m, 5) ?? 0, hi = num(m, 6) ?? 0, zone = num(m, 4) ?? 0;
    const name = typeof m.fields[0] === "string" ? (m.fields[0] as string) : undefined;
    let low = 0, high = 0;
    let label = name;
    if (tType === 4) {
      // Watt: over 1000 = watt + 1000, ellers procent af FTP
      const pct = (v: number) => (v > 1000 ? (ref.ftp ? (v - 1000) / ref.ftp : NaN) : v / 100);
      if (lo || hi) [low, high] = [pct(lo || hi), pct(hi || lo)];
      else if (zone) low = high = POWER_ZONE[Math.min(zone, 7)];
      if (Number.isNaN(low) || Number.isNaN(high)) {
        low = high = 0;
        label = `${lo - 1000}–${hi - 1000} W`;
      }
    } else if (tType === 0 && (lo || hi)) {
      // Fart i m/s × 1000. Omregnes til procent af uploaderens tærskelfart, ellers vises tempoet som tekst
      const paceKm = (v: number) => 1000 / (v / 1000);
      if (ref.thresholdPace) [low, high] = [(lo || hi), (hi || lo)].map((v) => ref.thresholdPace! / paceKm(v));
      else label = `${formatDuration(Math.round(paceKm(lo || hi)))}–${formatDuration(Math.round(paceKm(hi || lo)))} /km`;
    } else if (tType === 1 && (lo || hi)) {
      label = lo > 100 ? `Puls ${lo - 100}–${hi - 100}` : `Puls ${lo}–${hi} % af max`;
    } else if (tType === 1 && zone) label = `Pulszone ${zone}`;
    if (low > high) [low, high] = [high, low];
    const step: Step = { kind, ...len, low: round(low), high: round(high) };
    if (label && high === 0) step.label = label;
    return step;
  };

  // Gentagelser (varighedstype 6) peger tilbage på det første trin i blokken
  const blocks: Block[] = [];
  let pending: { index: number; step: Step }[] = [];
  const flush = (upTo: number) => {
    for (const p of pending.filter((x) => x.index < upTo)) blocks.push({ repeat: 1, steps: [p.step] });
    pending = pending.filter((x) => x.index >= upTo);
  };
  rows.forEach((m, i) => {
    const index = num(m, 254) ?? i;
    if (num(m, 1) === 6) {
      const from = num(m, 2) ?? 0;
      flush(from);
      if (pending.length) blocks.push({ repeat: Math.max(1, num(m, 4) ?? 1), steps: pending.map((x) => x.step) });
      pending = [];
    } else pending.push({ index, step: toStep(m) });
  });
  flush(Infinity);
  if (!blocks.length) throw new Error("Fandt ingen trin i FIT-filen");
  const name = typeof head?.fields[8] === "string" ? (head.fields[8] as string) : undefined;
  return { blocks, source: "fit", name, sport };
}

const round = (v: number) => Math.round(v * 1000) / 1000;

/** Uploadet programfil i alle formater: .fit (binær) eller .zwo/.mrc/.erg/.json/tekst. */
export function parseWorkoutUpload(name: string, bytes: Uint8Array, ref: References = {}): Workout {
  const isFit = name.toLowerCase().endsWith(".fit") || (bytes.length > 12 && String.fromCharCode(...bytes.slice(8, 12)) === ".FIT");
  if (isFit) return parseFitWorkout(bytes, ref);
  return parseWorkoutFile(name, new TextDecoder().decode(bytes));
}
