-- CreateEnum
CREATE TYPE "MembershipSource" AS ENUM ('PAYMENT', 'TRIAL', 'CODE', 'MANUAL');

-- CreateEnum
CREATE TYPE "TrialStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "Membership" ADD COLUMN     "source" "MembershipSource" NOT NULL DEFAULT 'PAYMENT';

-- CreateTable
CREATE TABLE "TrainingSignup" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrainingSignup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrialRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "message" TEXT,
    "status" "TrialStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),
    "decidedById" TEXT,

    CONSTRAINT "TrialRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccessCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "typeId" TEXT NOT NULL,
    "days" INTEGER NOT NULL,
    "note" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usedById" TEXT,
    "usedAt" TIMESTAMP(3),

    CONSTRAINT "AccessCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TrainingSignup_userId_idx" ON "TrainingSignup"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TrainingSignup_sessionId_userId_key" ON "TrainingSignup"("sessionId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "TrialRequest_userId_key" ON "TrialRequest"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AccessCode_code_key" ON "AccessCode"("code");

-- CreateIndex
CREATE UNIQUE INDEX "AccessCode_usedById_key" ON "AccessCode"("usedById");

-- AddForeignKey
ALTER TABLE "TrainingSignup" ADD CONSTRAINT "TrainingSignup_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "TrainingSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingSignup" ADD CONSTRAINT "TrainingSignup_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrialRequest" ADD CONSTRAINT "TrialRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrialRequest" ADD CONSTRAINT "TrialRequest_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessCode" ADD CONSTRAINT "AccessCode_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "MembershipType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessCode" ADD CONSTRAINT "AccessCode_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessCode" ADD CONSTRAINT "AccessCode_usedById_fkey" FOREIGN KEY ("usedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

