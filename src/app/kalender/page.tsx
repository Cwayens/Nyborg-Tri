import { requireUser } from "@/auth";
import { MonthCalendar, type CalendarParams } from "@/components/MonthCalendar";

export const metadata = { title: "Kalender" };

export default async function Calendar({ searchParams }: { searchParams: Promise<CalendarParams> }) {
  await requireUser("/kalender");
  return <MonthCalendar sp={await searchParams} publicView={false} />;
}
