-- CreateEnum
CREATE TYPE "LedgerKind" AS ENUM ('INCOME', 'EXPENSE');

-- CreateTable
CREATE TABLE "LedgerEntry" (
    "id" TEXT NOT NULL,
    "voucherNo" SERIAL NOT NULL,
    "date" DATE NOT NULL,
    "kind" "LedgerKind" NOT NULL,
    "category" TEXT NOT NULL,
    "amountOre" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "counterparty" TEXT,
    "sponsorId" TEXT,
    "receipt" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetLine" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "amountOre" INTEGER NOT NULL,

    CONSTRAINT "BudgetLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LedgerEntry_voucherNo_key" ON "LedgerEntry"("voucherNo");

-- CreateIndex
CREATE INDEX "LedgerEntry_date_idx" ON "LedgerEntry"("date");

-- CreateIndex
CREATE UNIQUE INDEX "BudgetLine_year_category_key" ON "BudgetLine"("year", "category");

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_sponsorId_fkey" FOREIGN KEY ("sponsorId") REFERENCES "Sponsor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Beløb er altid positive; kind afgør, om det er en indtægt eller en udgift
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_amount_check" CHECK ("amountOre" > 0);
ALTER TABLE "BudgetLine" ADD CONSTRAINT "BudgetLine_amount_check" CHECK ("amountOre" >= 0);
