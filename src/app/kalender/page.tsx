import { requireUser } from "@/auth";
import { MonthCalendar, type CalendarParams } from "@/components/MonthCalendar";

import { tr } from "@/lib/i18n";

export async function generateMetadata() {
  const t = await tr();
  return { title: t("Kalender", "Calendar") };
}

export default async function Calendar({ searchParams }: { searchParams: Promise<CalendarParams> }) {
  await requireUser("/kalender");
  return <MonthCalendar sp={await searchParams} publicView={false} />;
}
