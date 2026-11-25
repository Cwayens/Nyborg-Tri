import type { Discipline } from "@prisma/client";
import { dayKey } from "./time";

// Læser en kalenderfil (.ics) fra TrainingPeaks, Garmin Connect, Intervals.icu, Google Kalender m.fl. til medlemmets
// egne planlagte træninger. Kun dato, titel, beskrivelse og varighed bruges.

export type IcsWorkout = { uid: string; day: string; time: string | null; title: string; description: string | null; durationMin: number | null; discipline: Discipline };

export function guessDiscipline(text: string): Discipline {
  const t = text.toLowerCase();
  if (/sw[iy]m|svøm|svom|pool|open ?water|bassin/.test(t)) return "SWIM";
  if (/bike|ride|cykel|cykl|cycling|zwift|mtb|spinning|indoor bike|trainer/.test(t)) return "BIKE";
  if (/\brun|løb|lob\b|jog|trail/.test(t)) return "RUN";
  if (/strength|styrke|gym|core|vægt/.test(t)) return "STRENGTH";
  return "OTHER";
}

const unescape = (v: string) => v.replace(/\\n/gi, "\n").replace(/\\([,;\\])/g, "$1").trim();

/** "20261126", "20261126T060000" eller "20261126T050000Z" til dansk dag og klokkeslæt. */
function readDate(value: string, params: string): { day: string; time: string | null; at: Date | null } | null {
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/.exec(value.trim());
  if (!m) return null;
  const [, y, mo, d, h, mi, , z] = m;
  if (!h || /VALUE=DATE(?!-)/i.test(params)) return { day: `${y}-${mo}-${d}`, time: null, at: null };
  if (z) {
    const at = new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi));
    const time = new Intl.DateTimeFormat("da-DK", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Europe/Copenhagen" }).format(at).replace(".", ":");
    return { day: dayKey(at), time, at };
  }
  return { day: `${y}-${mo}-${d}`, time: `${h}:${mi}`, at: new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi)) };
}

function isoDuration(v: string): number | null {
  const m = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(v.trim());
  if (!m) return null;
  const min = (+(m[1] ?? 0)) * 1440 + (+(m[2] ?? 0)) * 60 + +(m[3] ?? 0) + Math.round(+(m[4] ?? 0) / 60);
  return min || null;
}

/** Varighed skrevet i beskrivelsen, fx "Planned Time: 1:30:00" eller "Varighed: 45 min". */
function textDuration(text: string): number | null {
  const hms = /(?:time|duration|varighed|tid)\s*:?\s*(\d{1,2}):(\d{2})(?::(\d{2}))?/i.exec(text);
  if (hms) return hms[3] !== undefined ? +hms[1] * 60 + +hms[2] : +hms[1] * 60 + +hms[2];
  const min = /(?:duration|varighed)\s*:?\s*(\d{1,3})\s*min/i.exec(text);
  return min ? +min[1] : null;
}

export function parseIcs(text: string, limit = 400): IcsWorkout[] {
  if (!/BEGIN:VCALENDAR/i.test(text)) throw new Error("Filen er ikke en kalenderfil (.ics)");
  const lines = text.replace(/\r\n?/g, "\n").replace(/\n[ \t]/g, "").split("\n");
  const out: IcsWorkout[] = [];
  let ev: Record<string, { v: string; p: string }> | null = null;
  for (const line of lines) {
    if (/^BEGIN:VEVENT/i.test(line)) { ev = {}; continue; }
    if (/^END:VEVENT/i.test(line)) {
      if (ev) {
        const start = ev.DTSTART && readDate(ev.DTSTART.v, ev.DTSTART.p);
        const title = unescape(ev.SUMMARY?.v ?? "").slice(0, 80);
        if (start && title) {
          const description = ev.DESCRIPTION ? unescape(ev.DESCRIPTION.v).slice(0, 2000) : null;
          const end = ev.DTEND && readDate(ev.DTEND.v, ev.DTEND.p);
          const span = start.at && end && end.at ? Math.round((end.at.getTime() - start.at.getTime()) / 60000) : null;
          const durationMin = (ev.DURATION && isoDuration(ev.DURATION.v)) || (span && span > 0 && span < 1440 ? span : null) || (description ? textDuration(description) : null);
          out.push({
            // "Run: Rolig 10 km" fra TrainingPeaks bliver til "Rolig 10 km"; sporten ses af ikonet
            uid: (ev.UID?.v.trim() || `${start.day}-${title}`).slice(0, 200), day: start.day, time: start.time,
            title: title.replace(/^(run|bike|swim|strength|brick|other|mtb|walk|rowing|x-train|day off|custom|løb|cykel|svøm|styrke)\s*:\s*(?=\S)/i, ""), description: description || null,
            durationMin: durationMin && durationMin <= 600 ? durationMin : null, discipline: guessDiscipline(`${title} ${ev.CATEGORIES?.v ?? ""}`),
          });
          if (out.length >= limit) break;
        }
      }
      ev = null;
      continue;
    }
    if (!ev) continue;
    const m = /^([A-Z-]+)((?:;[^:]*)?):(.*)$/i.exec(line);
    if (m) ev[m[1].toUpperCase()] = { v: m[3], p: m[2] };
  }
  return out;
}
