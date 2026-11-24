-- CreateEnum
CREATE TYPE "BenchmarkTest" AS ENUM ('RUN_5K', 'RUN_10K', 'BIKE_FTP20', 'SWIM_100', 'SWIM_1500');

-- CreateTable
CREATE TABLE "BenchmarkResult" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "test" "BenchmarkTest" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "seconds" INTEGER,
    "watts" INTEGER,
    "note" TEXT,
    "source" "Provider" NOT NULL DEFAULT 'MANUAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BenchmarkResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BenchmarkResult_userId_test_date_idx" ON "BenchmarkResult"("userId", "test", "date");

-- AddForeignKey
ALTER TABLE "BenchmarkResult" ADD CONSTRAINT "BenchmarkResult_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

