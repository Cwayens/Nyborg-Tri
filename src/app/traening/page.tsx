import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { MonthCalendar, type CalendarParams } from "@/components/MonthCalendar";
import { CLUB } from "@/lib/club";

import { tr } from "@/lib/i18n";

export async function generateMetadata() {
  const t = await tr();
  return { title: t("Træning", "Training"), description: t(`Se ${CLUB.name}s træninger i svøm, cykel og løb, og prøv gratis i 14 dage.`, `See ${CLUB.name}'s swim, bike and run trainings, and try free for 14 days.`) };
}

// Offentlig træningskalender. Medlemmer sendes til deres egen kalender med tilmelding.
export default async function Training({ searchParams }: { searchParams: Promise<CalendarParams> }) {
  const sp = await searchParams;
  if ((await auth())?.user) redirect(`/kalender?${new URLSearchParams(sp as Record<string, string>)}`);
  return <MonthCalendar sp={{ gruppe: "alle", ...sp }} publicView />;
}
