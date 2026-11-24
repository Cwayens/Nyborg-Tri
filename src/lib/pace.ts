// Tempogrupper på klubtræning og forslag til, hvilken gruppe der passer.

/** "5:00 /km, 5:30 /km" → ["5:00 /km", "5:30 /km"]. Højst 6 grupper. */
export function splitPaceGroups(v?: string | null): string[] {
  return [...new Set((v ?? "").split(/[,;\n]/).map((x) => x.trim().slice(0, 30)).filter(Boolean))].slice(0, 6);
}

/** Første tid i teksten i sekunder ("5:30 /km" → 330), eller et tal ("28 km/t" → 28). */
export function groupValue(g: string): number | null {
  const t = /(\d{1,2}):(\d{2})/.exec(g);
  if (t) return Number(t[1]) * 60 + Number(t[2]);
  const n = /(\d+(?:[.,]\d+)?)/.exec(g);
  return n ? Number(n[1].replace(",", ".")) : null;
}

/**
 * Gruppen tættest på atletens rolige tempo. Løb og svøm: tid (lavere er hurtigere). Cykel: km/t.
 * Rolig løbefart sættes til tærskelfart + 20 %.
 */
export function suggestGroup(groups: string[], ref: { thresholdPace?: number | null; swim100?: number | null }, discipline: string): string | null {
  const mine = discipline === "RUN" && ref.thresholdPace ? ref.thresholdPace * 1.2 : discipline === "SWIM" && ref.swim100 ? ref.swim100 * 1.15 : null;
  if (!mine) return null;
  let best: string | null = null;
  let diff = Infinity;
  for (const g of groups) {
    const v = groupValue(g);
    if (v == null || v < 30) continue; // kun tider
    if (Math.abs(v - mine) < diff) [best, diff] = [g, Math.abs(v - mine)];
  }
  return best;
}
