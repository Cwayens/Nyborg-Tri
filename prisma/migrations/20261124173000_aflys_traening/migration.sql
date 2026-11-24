-- AlterTable
ALTER TABLE "TrainingSession" ADD COLUMN     "cancelReason" TEXT,
ADD COLUMN     "cancelledAt" TIMESTAMP(3);

