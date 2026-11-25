-- CreateTable
CREATE TABLE "PlannedWorkout" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "time" TEXT,
    "title" TEXT NOT NULL,
    "discipline" "Discipline" NOT NULL,
    "durationMin" INTEGER,
    "description" TEXT,
    "workout" JSONB,
    "source" TEXT NOT NULL,
    "uid" TEXT,
    "sharedId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlannedWorkout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlannedWorkout_userId_day_idx" ON "PlannedWorkout"("userId", "day");

-- CreateIndex
CREATE UNIQUE INDEX "PlannedWorkout_userId_uid_key" ON "PlannedWorkout"("userId", "uid");

-- AddForeignKey
ALTER TABLE "PlannedWorkout" ADD CONSTRAINT "PlannedWorkout_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlannedWorkout" ADD CONSTRAINT "PlannedWorkout_sharedId_fkey" FOREIGN KEY ("sharedId") REFERENCES "GroupWorkout"("id") ON DELETE SET NULL ON UPDATE CASCADE;

