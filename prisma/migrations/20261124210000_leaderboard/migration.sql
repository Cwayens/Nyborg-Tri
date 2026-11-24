-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "BenchmarkTest" ADD VALUE 'RUN_HALF';
ALTER TYPE "BenchmarkTest" ADD VALUE 'BIKE_40K';

-- AlterTable
ALTER TABLE "Activity" ADD COLUMN     "effortsAt" TIMESTAMP(3),
ADD COLUMN     "hasPower" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "BenchmarkResult" ADD COLUMN     "effortId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "gender" "Gender",
ADD COLUMN     "leaderboard" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Effort" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "test" "BenchmarkTest" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "seconds" INTEGER,
    "watts" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Effort_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Effort_test_date_idx" ON "Effort"("test", "date");

-- CreateIndex
CREATE INDEX "Effort_userId_test_idx" ON "Effort"("userId", "test");

-- CreateIndex
CREATE UNIQUE INDEX "Effort_activityId_test_key" ON "Effort"("activityId", "test");

-- CreateIndex
CREATE INDEX "Activity_effortsAt_idx" ON "Activity"("effortsAt");

-- CreateIndex
CREATE UNIQUE INDEX "BenchmarkResult_effortId_key" ON "BenchmarkResult"("effortId");

-- AddForeignKey
ALTER TABLE "Effort" ADD CONSTRAINT "Effort_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Effort" ADD CONSTRAINT "Effort_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BenchmarkResult" ADD CONSTRAINT "BenchmarkResult_effortId_fkey" FOREIGN KEY ("effortId") REFERENCES "Effort"("id") ON DELETE SET NULL ON UPDATE CASCADE;

