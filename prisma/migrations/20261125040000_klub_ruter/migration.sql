-- CreateTable
CREATE TABLE "ClubRoute" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sport" "Discipline" NOT NULL,
    "tag" TEXT NOT NULL,
    "desc" TEXT NOT NULL,
    "km" DOUBLE PRECISION NOT NULL,
    "pts" JSONB NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClubRoute_pkey" PRIMARY KEY ("id")
);

