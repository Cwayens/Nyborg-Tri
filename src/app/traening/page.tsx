import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { MonthCalendar, type CalendarParams } from "@/components/MonthCalendar";
import { CLUB } from "@/lib/club";

export const metadata = { title: "Træning", description: `Se ${CLUB.name}s træninger i svøm, cykel og løb, og prøv gratis i 14 dage.` };

// Offentlig træningskalender. Medlemmer sendes til deres egen kalender med tilmelding.
export default async function Training({ searchParams }: { searchParams: Promise<CalendarParams> }) {
  const sp = await searchParams;
  if ((await auth())?.user) redirect(`/kalender?${new URLSearchParams(sp as Record<string, string>)}`);
  return <MonthCalendar sp={{ gruppe: "alle", ...sp }} publicView />;
}
