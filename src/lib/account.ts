import { prisma } from "./db";
import { disconnect as disconnectStrava } from "./wearables/strava";

// Medlemmets ret til indsigt (download af egne data) og sletning (GDPR art. 15, 17 og 20).

/** Alle oplysninger vi har om et medlem, som JSON. Adgangsnøgler til ure er udeladt. */
export async function exportUserData(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      name: true, email: true, phone: true, birthDate: true, gender: true, weightKg: true, address: true, zip: true, city: true,
      guardianName: true, guardianEmail: true, role: true, athleteGroup: true, createdAt: true, shareActivities: true, leaderboard: true,
      memberships: { select: { startDate: true, endDate: true, source: true, type: { select: { name: true } } } },
      payments: { select: { amountOre: true, status: true, description: true, createdAt: true, paidAt: true } },
      signups: { select: { createdAt: true, session: { select: { title: true, startsAt: true, location: true } } } },
      wearableConnections: { select: { provider: true } },
      activities: { select: { provider: true, sport: true, name: true, startAt: true, movingSec: true, distanceM: true } },
      efforts: { select: { test: true, date: true, seconds: true, watts: true } },
      benchmarks: { select: { test: true, date: true, seconds: true, watts: true, source: true } },
      chatMessages: { select: { channel: true, body: true, createdAt: true } },
      groupWorkouts: { select: { title: true, startsAt: true, location: true } },
      groupWorkoutParticipants: { select: { workout: { select: { title: true, startsAt: true } } } },
      athleteProfile: { select: { headline: true, bio: true, goals: true, results: true, instagram: true, published: true, consentAt: true } },
      trialRequest: { select: { status: true, createdAt: true } },
    },
  });
  const contact = await prisma.contactMessage.findMany({ where: { email: user.email }, select: { topic: true, message: true, createdAt: true } });
  return { exportedAt: new Date().toISOString(), club: "Nyborg Triathlon Klub", ...user, contactMessages: contact };
}

export type DeleteResult = { ok: true } | { ok: false; error: string };

/**
 * Sletter et medlems data. Betalinger og medlemsperioder skal gemmes i 5 år efter bogføringsloven, så selve
 * brugerrækken anonymiseres i stedet for at blive slettet: navn, mail og alle personoplysninger fjernes.
 */
export async function deleteAccount(userId: string): Promise<DeleteResult> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, email: true, deletedAt: true } });
  if (!user || user.deletedAt) return { ok: false, error: "Kontoen findes ikke" };
  if (user.role === "ADMIN" && (await prisma.user.count({ where: { role: "ADMIN", deletedAt: null } })) <= 1) {
    return { ok: false, error: "Du er klubbens eneste admin. Giv en anden admin-adgang først." };
  }
  // Afbryd Strava hos Strava selv, så de ikke bliver ved med at sende data
  await disconnectStrava(userId).catch(() => {});
  await prisma.$transaction([
    prisma.activity.deleteMany({ where: { userId } }), // præstationer og testresultater fra ture slettes med
    prisma.benchmarkResult.deleteMany({ where: { userId } }),
    prisma.wearableConnection.deleteMany({ where: { userId } }),
    prisma.trainingSignup.deleteMany({ where: { userId } }),
    prisma.groupWorkoutParticipant.deleteMany({ where: { userId } }),
    prisma.groupWorkout.deleteMany({ where: { hostId: userId } }),
    prisma.chatMessage.deleteMany({ where: { userId } }),
    prisma.athleteProfile.deleteMany({ where: { userId } }),
    prisma.trialRequest.deleteMany({ where: { userId } }),
    prisma.contactMessage.deleteMany({ where: { email: user.email } }),
    prisma.account.deleteMany({ where: { userId } }),
    prisma.session.deleteMany({ where: { userId } }), // logger ud på alle enheder
    prisma.user.update({
      where: { id: userId },
      data: {
        name: "Slettet medlem", email: `slettet-${userId}@slettet.invalid`, emailVerified: null, image: null, phone: null,
        birthDate: null, gender: null, weightKg: null, guardianName: null, guardianEmail: null, address: null, zip: null, city: null,
        role: "ATHLETE", athleteGroup: null, shareActivities: false, leaderboard: false, calendarToken: null, deletedAt: new Date(),
      },
    }),
  ]);
  return { ok: true };
}
