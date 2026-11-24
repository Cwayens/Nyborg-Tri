import { prisma } from "@/lib/db";

// Bjælke med sponsorlogoer, der glider på tværs. Listen vises to gange efter hinanden, så den kører uden hul.
export async function SponsorBar() {
  const sponsors = await prisma.sponsor.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
  if (sponsors.length === 0) return null;
  // Få sponsorer: gentag, så båndet altid er bredere end skærmen
  const reps = Math.max(1, Math.ceil(8 / sponsors.length));
  const row = Array.from({ length: reps }, () => sponsors).flat();
  const item = (s: (typeof sponsors)[number], i: number, hidden: boolean) => {
    const img = <img src={s.logo} alt={hidden ? "" : s.name} loading="lazy" />;
    return (
      <li key={`${s.id}-${i}`} aria-hidden={hidden || undefined}>
        {s.url ? <a href={s.url} target="_blank" rel="noopener" tabIndex={hidden ? -1 : undefined}>{img}</a> : img}
      </li>
    );
  };
  return (
    <section className="sponsorbar" aria-label="Vores sponsorer">
      <p className="sponsorbar-title">Tak til vores sponsorer</p>
      <div className="sponsorbar-track" style={{ ["--dur" as string]: `${row.length * 4}s` }}>
        <ul>{row.map((s, i) => item(s, i, i >= sponsors.length))}</ul>
        <ul aria-hidden="true">{row.map((s, i) => item(s, i, true))}</ul>
      </div>
    </section>
  );
}
