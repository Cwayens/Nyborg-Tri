-- CreateEnum
CREATE TYPE "ChallengeMetric" AS ENUM ('KM', 'HOURS', 'SESSIONS');

-- CreateEnum
CREATE TYPE "RideRole" AS ENUM ('NONE', 'DRIVER', 'PASSENGER');

-- AlterTable
ALTER TABLE "TrainingSession" ADD COLUMN     "paceGroups" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "testDay" "BenchmarkTest";

-- AlterTable
ALTER TABLE "TrainingSignup" ADD COLUMN     "paceGroup" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "mentor" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "BuddyProfile" (
    "userId" TEXT NOT NULL,
    "disciplines" "Discipline"[],
    "runPace" INTEGER,
    "bikeSpeed" INTEGER,
    "swimPace" INTEGER,
    "times" TEXT[],
    "note" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BuddyProfile_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "Mentorship" (
    "id" TEXT NOT NULL,
    "menteeId" TEXT NOT NULL,
    "mentorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "Mentorship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BeginnerPlan" (
    "userId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "done" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "checklist" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "BeginnerPlan_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "Tip" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "discipline" "Discipline",
    "videoUrl" TEXT,
    "authorId" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Challenge" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "discipline" "Discipline",
    "metric" "ChallengeMetric" NOT NULL,
    "goal" INTEGER NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Challenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChallengeParticipant" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChallengeParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Race" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "location" TEXT NOT NULL,
    "url" TEXT,
    "distances" TEXT,
    "clubTent" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Race_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RaceEntry" (
    "id" TEXT NOT NULL,
    "raceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "distance" TEXT,
    "ride" "RideRole" NOT NULL DEFAULT 'NONE',
    "seats" INTEGER,
    "rideFrom" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RaceEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Mentorship_menteeId_key" ON "Mentorship"("menteeId");

-- CreateIndex
CREATE INDEX "Mentorship_mentorId_idx" ON "Mentorship"("mentorId");

-- CreateIndex
CREATE INDEX "Tip_publishedAt_idx" ON "Tip"("publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ChallengeParticipant_challengeId_userId_key" ON "ChallengeParticipant"("challengeId", "userId");

-- CreateIndex
CREATE INDEX "Race_date_idx" ON "Race"("date");

-- CreateIndex
CREATE UNIQUE INDEX "RaceEntry_raceId_userId_key" ON "RaceEntry"("raceId", "userId");

-- AddForeignKey
ALTER TABLE "BuddyProfile" ADD CONSTRAINT "BuddyProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mentorship" ADD CONSTRAINT "Mentorship_menteeId_fkey" FOREIGN KEY ("menteeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mentorship" ADD CONSTRAINT "Mentorship_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BeginnerPlan" ADD CONSTRAINT "BeginnerPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tip" ADD CONSTRAINT "Tip_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Challenge" ADD CONSTRAINT "Challenge_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeParticipant" ADD CONSTRAINT "ChallengeParticipant_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeParticipant" ADD CONSTRAINT "ChallengeParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Race" ADD CONSTRAINT "Race_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaceEntry" ADD CONSTRAINT "RaceEntry_raceId_fkey" FOREIGN KEY ("raceId") REFERENCES "Race"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaceEntry" ADD CONSTRAINT "RaceEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

