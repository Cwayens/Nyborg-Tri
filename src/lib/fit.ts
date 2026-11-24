import type { Discipline } from "@prisma/client";
import type { References, Step, Workout } from "./workout";

// Træningsprogram som FIT-workout-fil (Garmin, Wahoo, Coros, Hammerhead m.fl.) med atletens egne watt og tempi,
// og som .zwo til Zwift, TrainerRoad og Wahoo SYSTM. FIT-formatet: https://developer.garmin.com/fit/protocol/

const CRC_TABLE = [0x0000, 0xcc01, 0xd801, 0x1400, 0xf001, 0x3c00, 0x2800, 0xe401, 0xa001, 0x6c00, 0x7800, 0xb401, 0x5000, 0x9c01, 0x8801, 0x4400];

export function fitCrc(bytes: Uint8Array, start = 0, end = bytes.length): number {
  let crc = 0;
  for (let i = start; i < end; i++) {
    const b = bytes[i];
    let tmp = CRC_TABLE[crc & 0xf];
    crc = ((crc >> 4) & 0x0fff) ^ tmp ^ CRC_TABLE[b & 0xf];
    tmp = CRC_TABLE[crc & 0xf];
    crc = ((crc >> 4) & 0x0fff) ^ tmp ^ CRC_TABLE[(b >> 4) & 0xf];
  }
  return crc;
}

type BaseType = "enum" | "uint8" | "uint16" | "uint32" | "uint32z" | "string";
const BASE: Record<BaseType, [number, number]> = { enum: [0x00, 1], uint8: [0x02, 1], uint16: [0x84, 2], uint32: [0x86, 4], uint32z: [0x8c, 4], string: [0x07, 0] };
type Field = { num: number; type: BaseType; size?: number };

class FitWriter {
  private out: number[] = [];
  private local = 0;
  private defs = new Map<string, number>();

  private bytes(v: number, n: number) {
    for (let i = 0; i < n; i++) this.out.push((v >>> (8 * i)) & 0xff);
  }

  message(global: number, fields: Field[], values: (number | string)[]) {
    const key = `${global}:${fields.map((f) => `${f.num}/${f.size ?? 0}`).join(",")}`;
    let local = this.defs.get(key);
    if (local === undefined) {
      local = this.local++ % 16;
      this.defs.set(key, local);
      this.out.push(0x40 | local, 0, 0);
      this.bytes(global, 2);
      this.out.push(fields.length);
      for (const f of fields) this.out.push(f.num, f.size ?? BASE[f.type][1], BASE[f.type][0]);
    }
    this.out.push(local);
    fields.forEach((f, i) => {
      const v = values[i];
      if (f.type === "string") {
        const enc = new TextEncoder().encode(String(v)).slice(0, f.size! - 1);
        for (let k = 0; k < f.size!; k++) this.out.push(enc[k] ?? 0);
      } else this.bytes(Number(v), BASE[f.type][1]);
    });
  }

  finish(): Uint8Array {
    const data = this.out;
    const header = new Uint8Array(14);
    const dv = new DataView(header.buffer);
    header[0] = 14;
    header[1] = 0x20; // protokol 2.0
    dv.setUint16(2, 2140, true);
    dv.setUint32(4, data.length, true);
    header.set([0x2e, 0x46, 0x49, 0x54], 8); // ".FIT"
    dv.setUint16(12, fitCrc(header, 0, 12), true);
    const file = new Uint8Array(14 + data.length + 2);
    file.set(header);
    file.set(data, 14);
    const crc = fitCrc(file, 0, 14 + data.length);
    file[file.length - 2] = crc & 0xff;
    file[file.length - 1] = crc >> 8;
    return file;
  }
}

const SPORT: Partial<Record<Discipline, number>> = { RUN: 1, BIKE: 2, SWIM: 5 };
const INTENSITY: Record<Step["kind"], number> = { active: 0, rest: 1, warmup: 2, cooldown: 3, recovery: 4 };
const FIT_EPOCH = Date.UTC(1989, 11, 31) / 1000;

/** Mål for ét trin i FIT-enheder: watt + 1000 for power, m/s × 1000 for fart. */
export function fitTarget(d: Discipline, s: Step, ref: References): { type: number; low: number; high: number } | null {
  if (s.kind === "rest" || s.high === 0) return null;
  // Et enkelt mål bliver til et smalt interval, så uret ikke bipper ved mindste udsving
  const lo = s.low && s.low !== s.high ? s.low : s.high * 0.975;
  const hi = s.low && s.low !== s.high ? s.high : s.high * 1.025;
  if (d === "BIKE" && ref.ftp) return { type: 4, low: Math.round(lo * ref.ftp) + 1000, high: Math.round(hi * ref.ftp) + 1000 };
  if (d === "RUN" && ref.thresholdPace) {
    const speed = (p: number) => Math.round(((1000 * p) / ref.thresholdPace!) * 1000);
    return { type: 0, low: speed(lo), high: speed(hi) };
  }
  return null; // Svøm: ure understøtter ikke tempo-mål i bassin; tempoet står i trinnets navn
}

export function workoutToFit(w: Workout, d: Discipline, ref: References, name: string, now = new Date(), stepName?: (s: Step) => string): Uint8Array {
  const fit = new FitWriter();
  fit.message(0, [{ num: 0, type: "enum" }, { num: 1, type: "uint16" }, { num: 2, type: "uint16" }, { num: 3, type: "uint32z" }, { num: 4, type: "uint32" }],
    [5, 255, 0, (now.getTime() / 1000) >>> 0, Math.round(now.getTime() / 1000 - FIT_EPOCH)]);

  type Row = { name: string; dur: number; durVal: number; tType: number; tVal: number; lo: number; hi: number; intensity: number };
  const rows: Row[] = [];
  for (const b of w.blocks) {
    const first = rows.length;
    for (const s of b.steps) {
      const t = fitTarget(d, s, ref);
      rows.push({
        name: stepName?.(s) ?? "",
        dur: s.durationSec ? 0 : s.distanceM ? 1 : 5, // tid, distance eller "tryk på lap"
        durVal: s.durationSec ? s.durationSec * 1000 : s.distanceM ? s.distanceM * 100 : 0,
        tType: t ? t.type : 2,
        tVal: 0,
        lo: t?.low ?? 0,
        hi: t?.high ?? 0,
        intensity: INTENSITY[s.kind],
      });
    }
    if (b.repeat > 1) rows.push({ name: "", dur: 6, durVal: first, tType: 2, tVal: b.repeat, lo: 0, hi: 0, intensity: 0 });
  }

  fit.message(26, [{ num: 4, type: "enum" }, { num: 6, type: "uint16" }, { num: 8, type: "string", size: 32 }], [SPORT[d] ?? 0, rows.length, name]);
  const stepFields: Field[] = [
    { num: 254, type: "uint16" }, { num: 0, type: "string", size: 24 }, { num: 1, type: "enum" }, { num: 2, type: "uint32" },
    { num: 3, type: "enum" }, { num: 4, type: "uint32" }, { num: 5, type: "uint32" }, { num: 6, type: "uint32" }, { num: 7, type: "enum" },
  ];
  rows.forEach((r, i) => fit.message(27, stepFields, [i, r.name, r.dur, r.durVal, r.tType, r.tVal, r.lo, r.hi, r.intensity]));
  return fit.finish();
}

/** .zwo med procent af FTP; Zwift og andre apps regner selv atletens watt ud. Kun tidsbaserede trin. */
export function workoutToZwo(w: Workout, name: string, d: Discipline): string {
  const esc = (s: string) => s.replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" })[c]!);
  const lines: string[] = [];
  const pw = (v: number) => v.toFixed(2);
  for (const b of w.blocks) {
    const [on, off] = b.steps;
    if (b.repeat > 1 && b.steps.length === 2 && on.durationSec && off.durationSec) {
      lines.push(`    <IntervalsT Repeat="${b.repeat}" OnDuration="${on.durationSec}" OffDuration="${off.durationSec}" OnPower="${pw(on.high)}" OffPower="${pw(off.high)}"/>`);
      continue;
    }
    for (let r = 0; r < b.repeat; r++) {
      for (const s of b.steps) {
        const dur = s.durationSec ?? 60;
        if (s.kind === "warmup" || s.kind === "cooldown") {
          const tag = s.kind === "warmup" ? "Warmup" : "Cooldown";
          lines.push(`    <${tag} Duration="${dur}" PowerLow="${pw(s.low)}" PowerHigh="${pw(s.high)}"/>`);
        } else if (s.high === 0) {
          lines.push(`    <FreeRide Duration="${dur}"/>`);
        } else {
          lines.push(`    <SteadyState Duration="${dur}" Power="${pw((s.low + s.high) / 2)}"/>`);
        }
      }
    }
  }
  return [
    "<workout_file>",
    `  <author>Nyborg Triathlon Klub</author>`,
    `  <name>${esc(name)}</name>`,
    `  <sportType>${d === "RUN" ? "run" : "bike"}</sportType>`,
    "  <workout>",
    ...lines,
    "  </workout>",
    "</workout_file>",
    "",
  ].join("\n");
}
