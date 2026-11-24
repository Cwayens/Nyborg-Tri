// Forberedt kobling til TrainingPeaks' API. Den kræver, at klubben er godkendt som TrainingPeaks-partner
// (se docs/go-live-tjekliste.md). Indtil da importerer trænere programmer som filer (.zwo/.mrc).
//
// Flow, når adgangen er på plads:
//  1. Træneren forbinder sin TrainingPeaks-konto (OAuth, scope "workouts:read").
//  2. Vi henter træningerne i en periode for træneren eller en atlet.
//  3. Hver workouts "structure" læses med parseTpStructure og lægges på en klubtræning.

import { parseTpStructure, type Workout } from "./workout";

const API = process.env.TRAININGPEAKS_API_URL ?? "https://api.trainingpeaks.com";
const OAUTH = process.env.TRAININGPEAKS_OAUTH_URL ?? "https://oauth.trainingpeaks.com";

export function trainingPeaksEnabled(): boolean {
  return !!(process.env.TRAININGPEAKS_CLIENT_ID && process.env.TRAININGPEAKS_CLIENT_SECRET);
}

export function authorizeUrl(redirectUri: string, state: string): string {
  const q = new URLSearchParams({
    response_type: "code",
    client_id: process.env.TRAININGPEAKS_CLIENT_ID ?? "",
    scope: "workouts:read athlete:profile",
    redirect_uri: redirectUri,
    state,
  });
  return `${OAUTH}/OAuth/Authorize?${q}`;
}

export async function exchangeCode(code: string, redirectUri: string) {
  const res = await fetch(`${OAUTH}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: process.env.TRAININGPEAKS_CLIENT_ID ?? "",
      client_secret: process.env.TRAININGPEAKS_CLIENT_SECRET ?? "",
    }),
  });
  if (!res.ok) throw new Error(`TrainingPeaks login fejlede (${res.status})`);
  return (await res.json()) as { access_token: string; refresh_token: string; expires_in: number };
}

type TpWorkout = { Id?: number; Title?: string; WorkoutDay?: string; WorkoutType?: string; Description?: string; Structure?: unknown };

/** Henter planlagte træninger og omsætter dem til klubbens programformat. */
export async function fetchWorkouts(accessToken: string, athleteId: string, from: string, to: string) {
  const res = await fetch(`${API}/v2/workouts/${athleteId}/${from}/${to}`, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error(`Kunne ikke hente træninger fra TrainingPeaks (${res.status})`);
  const list = (await res.json()) as TpWorkout[];
  return list
    .filter((w) => w.Structure)
    .map((w) => {
      let workout: Workout | null = null;
      try {
        workout = { ...parseTpStructure(w.Structure), name: w.Title, description: w.Description };
      } catch {
        workout = null;
      }
      return { id: String(w.Id), title: w.Title ?? "Træning", day: w.WorkoutDay?.slice(0, 10), type: w.WorkoutType, workout };
    });
}
