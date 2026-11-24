-- CreateEnum
CREATE TYPE "Provider" AS ENUM ('STRAVA', 'GARMIN', 'POLAR', 'SUUNTO', 'COROS', 'WAHOO', 'TRAININGPEAKS', 'MANUAL');

-- CreateTable
CREATE TABLE "WearableConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "Provider" NOT NULL,
    "externalAthleteId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "expiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSyncAt" TIMESTAMP(3),

    CONSTRAINT "WearableConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "Provider" NOT NULL,
    "externalId" TEXT,
    "sport" "Discipline" NOT NULL,
    "name" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "movingSec" INTEGER NOT NULL,
    "distanceM" INTEGER NOT NULL DEFAULT 0,
    "elevationM" INTEGER NOT NULL DEFAULT 0,
    "avgHr" INTEGER,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupWorkout" (
    "id" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "discipline" "Discipline" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "durationMin" INTEGER NOT NULL DEFAULT 60,
    "level" TEXT,
    "maxPeople" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupWorkout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupWorkoutParticipant" (
    "id" TEXT NOT NULL,
    "workoutId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupWorkoutParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WearableConnection_userId_provider_key" ON "WearableConnection"("userId", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "WearableConnection_provider_externalAthleteId_key" ON "WearableConnection"("provider", "externalAthleteId");

-- CreateIndex
CREATE INDEX "Activity_userId_startAt_idx" ON "Activity"("userId", "startAt");

-- CreateIndex
CREATE INDEX "Activity_startAt_idx" ON "Activity"("startAt");

-- CreateIndex
CREATE UNIQUE INDEX "Activity_provider_externalId_key" ON "Activity"("provider", "externalId");

-- CreateIndex
CREATE INDEX "GroupWorkout_startsAt_idx" ON "GroupWorkout"("startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "GroupWorkoutParticipant_workoutId_userId_key" ON "GroupWorkoutParticipant"("workoutId", "userId");

-- AddForeignKey
ALTER TABLE "WearableConnection" ADD CONSTRAINT "WearableConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupWorkout" ADD CONSTRAINT "GroupWorkout_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupWorkoutParticipant" ADD CONSTRAINT "GroupWorkoutParticipant_workoutId_fkey" FOREIGN KEY ("workoutId") REFERENCES "GroupWorkout"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupWorkoutParticipant" ADD CONSTRAINT "GroupWorkoutParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

