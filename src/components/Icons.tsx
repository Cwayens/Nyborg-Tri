import type { Discipline } from "@prisma/client";
import { CLUB } from "@/lib/club";

type P = { size?: number; className?: string };
const base = (size: number) => ({ width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true });

export const SwimIcon = ({ size = 20 }: P) => (
  <svg {...base(size)}><path d="M2 18c1.5 1 3 1 4.5 0s3-1 4.5 0 3 1 4.5 0 3-1 4.5 0" /><path d="M2 14c1.5 1 3 1 4.5 0s3-1 4.5 0 3 1 4.5 0 3-1 4.5 0" /><circle cx="17" cy="6" r="2" /><path d="m7 11 4-4 3 2.5" /></svg>
);
export const BikeIcon = ({ size = 20 }: P) => (
  <svg {...base(size)}><circle cx="5.5" cy="17" r="3.5" /><circle cx="18.5" cy="17" r="3.5" /><circle cx="15" cy="5" r="1.5" /><path d="M12 17.5V14l-3-3 4-3 2 3h3" /></svg>
);
export const RunIcon = ({ size = 20 }: P) => (
  <svg {...base(size)}><circle cx="14" cy="4" r="2" /><path d="m7 22 3-7 3 2v5" /><path d="M5 11l3-3 5 1 3 4 3 1" /><path d="m10 15-1-5" /></svg>
);
export const StrengthIcon = ({ size = 20 }: P) => (
  <svg {...base(size)}><path d="M6 7v10M3 9v6M18 7v10M21 9v6M6 12h12" /></svg>
);
export const ActivityIcon = ({ size = 20 }: P) => (
  <svg {...base(size)}><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
);
export const CalendarIcon = ({ size = 20 }: P) => (
  <svg {...base(size)}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
);
export const UsersIcon = ({ size = 20 }: P) => (
  <svg {...base(size)}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>
);
export const HomeIcon = ({ size = 20 }: P) => (
  <svg {...base(size)}><path d="m3 10 9-7 9 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><path d="M9 22V12h6v10" /></svg>
);
export const ChartIcon = ({ size = 20 }: P) => (
  <svg {...base(size)}><path d="M3 3v18h18" /><path d="M7 16v-5M12 16V8M17 16v-8" /></svg>
);
export const LinkIcon = ({ size = 20 }: P) => (
  <svg {...base(size)}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
);
export const ChatIcon = ({ size = 20 }: P) => (
  <svg {...base(size)}><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1.1-4.6A8 8 0 1 1 21 12z" /></svg>
);
export const TrophyIcon = ({ size = 20 }: P) => (
  <svg {...base(size)}><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z" /><path d="M7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3" /></svg>
);
export const MenuIcon = ({ size = 24 }: P) => (
  <svg {...base(size)}><path d="M3 6h18M3 12h18M3 18h18" /></svg>
);
export const MailIcon = ({ size = 20 }: P) => (
  <svg {...base(size)}><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 6-10 7L2 6" /></svg>
);
export const PhoneIcon = ({ size = 20 }: P) => (
  <svg {...base(size)}><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" /></svg>
);
export const PinIcon = ({ size = 16 }: P) => (
  <svg {...base(size)}><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
);

export function DisciplineIcon({ discipline, size = 20 }: { discipline: Discipline; size?: number }) {
  const I = { SWIM: SwimIcon, BIKE: BikeIcon, RUN: RunIcon, STRENGTH: StrengthIcon, OTHER: ActivityIcon }[discipline];
  return (
    <span className={`disc disc-${discipline} disc-icon`}>
      <I size={size} />
    </span>
  );
}

// Klubbens logo: de tre trekanter (svøm, cykel, løb) og navnet
export function Logo() {
  return (
    <>
      <img src={CLUB.logoImage} alt="" width={120} height={34} />
      <span className="logo-text"><b>{CLUB.logoTop}</b><small>{CLUB.logoSub}</small></span>
    </>
  );
}

export function initials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}
