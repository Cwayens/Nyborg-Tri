-- AlterTable
ALTER TABLE "TrainingSession" ADD COLUMN     "teamId" TEXT;
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "teamId" TEXT;
-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "AthleteGroup" NOT NULL,
    "sees" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "public" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);
-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "TrainingSession" ADD CONSTRAINT "TrainingSession_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Standardhold ud fra de tre faste grupper. Elite ser også bredde; bredde er åbent for besøgende og prøvemedlemmer.
INSERT INTO "Team" ("id", "name", "kind", "sees", "public", "sortOrder") VALUES
  ('hold-elite', 'Elite', 'ELITE', ARRAY['hold-bredde'], false, 1),
  ('hold-bredde', 'Bredde', 'BREDDE', ARRAY[]::TEXT[], true, 2),
  ('hold-boern', 'Børn', 'BOERN', ARRAY[]::TEXT[], false, 3);

UPDATE "User" SET "teamId" = 'hold-' || CASE "athleteGroup" WHEN 'ELITE' THEN 'elite' WHEN 'BREDDE' THEN 'bredde' ELSE 'boern' END WHERE "athleteGroup" IS NOT NULL;
UPDATE "TrainingSession" SET "teamId" = 'hold-' || CASE "group" WHEN 'ELITE' THEN 'elite' WHEN 'BREDDE' THEN 'bredde' ELSE 'boern' END;

-- Hold og gruppe holdes i trit, uanset hvor i koden der skrives: sættes holdet, følger gruppen holdets type;
-- sættes kun gruppen (fx ved betaling), får man det første aktive hold af den type.
CREATE OR REPLACE FUNCTION "user_team_sync"() RETURNS trigger AS $$
BEGIN
  IF NEW."teamId" IS NOT NULL AND (TG_OP = 'INSERT' OR NEW."teamId" IS DISTINCT FROM OLD."teamId") THEN
    NEW."athleteGroup" := (SELECT "kind" FROM "Team" WHERE "id" = NEW."teamId");
  ELSIF TG_OP = 'INSERT' OR NEW."athleteGroup" IS DISTINCT FROM OLD."athleteGroup" THEN
    IF NEW."athleteGroup" IS NULL THEN
      NEW."teamId" := NULL;
    ELSIF NEW."teamId" IS NULL OR (SELECT "kind" FROM "Team" WHERE "id" = NEW."teamId") IS DISTINCT FROM NEW."athleteGroup" THEN
      NEW."teamId" := (SELECT "id" FROM "Team" WHERE "kind" = NEW."athleteGroup" AND "active" ORDER BY "sortOrder", "createdAt" LIMIT 1);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "user_team_sync" BEFORE INSERT OR UPDATE ON "User" FOR EACH ROW EXECUTE FUNCTION "user_team_sync"();

CREATE OR REPLACE FUNCTION "training_team_sync"() RETURNS trigger AS $$
BEGIN
  IF NEW."teamId" IS NOT NULL AND (TG_OP = 'INSERT' OR NEW."teamId" IS DISTINCT FROM OLD."teamId") THEN
    NEW."group" := (SELECT "kind" FROM "Team" WHERE "id" = NEW."teamId");
  ELSIF TG_OP = 'INSERT' OR NEW."group" IS DISTINCT FROM OLD."group" THEN
    IF NEW."teamId" IS NULL OR (SELECT "kind" FROM "Team" WHERE "id" = NEW."teamId") IS DISTINCT FROM NEW."group" THEN
      NEW."teamId" := (SELECT "id" FROM "Team" WHERE "kind" = NEW."group" AND "active" ORDER BY "sortOrder", "createdAt" LIMIT 1);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "training_team_sync" BEFORE INSERT OR UPDATE ON "TrainingSession" FOR EACH ROW EXECUTE FUNCTION "training_team_sync"();

-- Skifter et hold type, følger medlemmer og træninger med
CREATE OR REPLACE FUNCTION "team_kind_sync"() RETURNS trigger AS $$
BEGIN
  IF NEW."kind" IS DISTINCT FROM OLD."kind" THEN
    UPDATE "User" SET "athleteGroup" = NEW."kind" WHERE "teamId" = NEW."id";
    UPDATE "TrainingSession" SET "group" = NEW."kind" WHERE "teamId" = NEW."id";
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "team_kind_sync" AFTER UPDATE ON "Team" FOR EACH ROW EXECUTE FUNCTION "team_kind_sync"();
