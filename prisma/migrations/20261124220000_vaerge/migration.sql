-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "payLinkSentTo" TEXT,
ADD COLUMN     "payToken" TEXT,
ADD COLUMN     "typeId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "guardianEmail" TEXT,
ADD COLUMN     "guardianName" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Payment_payToken_key" ON "Payment"("payToken");

