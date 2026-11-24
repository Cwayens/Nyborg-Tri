-- CreateEnum
CREATE TYPE "AthleteGroup" AS ENUM ('ELITE', 'BREDDE', 'BOERN');

-- CreateEnum
CREATE TYPE "Discipline" AS ENUM ('SWIM', 'BIKE', 'RUN', 'STRENGTH', 'OTHER');

-- AlterEnum: MEMBER omdøbes til ATHLETE (bevarer eksisterende brugere), TRAINER tilføjes
ALTER TYPE "Role" RENAME VALUE 'MEMBER' TO 'ATHLETE';
ALTER TYPE "Role" ADD VALUE 'TRAINER' BEFORE 'ADMIN';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "athleteGroup" "AthleteGroup",
ALTER COLUMN "role" SET DEFAULT 'ATHLETE';

-- CreateTable
CREATE TABLE "TrainingSession" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "discipline" "Discipline" NOT NULL,
    "location" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "groups" "AthleteGroup"[],
    "seriesId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TrainingSession_startsAt_idx" ON "TrainingSession"("startsAt");

-- CreateIndex
CREATE INDEX "TrainingSession_seriesId_idx" ON "TrainingSession"("seriesId");

-- AddForeignKey
ALTER TABLE "TrainingSession" ADD CONSTRAINT "TrainingSession_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

