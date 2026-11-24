import type { Activity } from "@prisma/client";
import { DisciplineIcon } from "./Icons";
import { formatDistance, formatDuration, formatPace } from "@/lib/activities";
import { formatDay, formatTime } from "@/lib/time";

export function ActivityRow({ a, action }: { a: Activity; action?: React.ReactNode }) {
  return (
    <div className="item">
      <DisciplineIcon discipline={a.sport} />
      <div className="body">
        <div className="title">{a.name}</div>
        <div className="meta">
          {formatDay(a.startAt)} {formatTime(a.startAt)} · {formatDuration(a.movingSec)}
          {a.distanceM ? ` · ${formatDistance(a.distanceM, a.sport)}` : ""}
          {formatPace(a.movingSec, a.distanceM, a.sport) ? ` · ${formatPace(a.movingSec, a.distanceM, a.sport)}` : ""}
          {a.avgHr ? ` · ♥ ${a.avgHr}` : ""}
        </div>
      </div>
      <span className="pill">{a.provider === "MANUAL" ? "Manuel" : a.provider === "STRAVA" ? "Strava" : a.provider}</span>
      {action}
    </div>
  );
}
