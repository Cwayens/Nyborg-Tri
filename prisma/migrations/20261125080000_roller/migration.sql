-- CreateEnum
CREATE TYPE "Duty" AS ENUM ('TREASURER', 'VOLUNTEER');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "duties" "Duty"[] DEFAULT ARRAY[]::"Duty"[];

-- CreateTable
CREATE TABLE "_TeamLeaders" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_TeamLeaders_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_TeamLeaders_B_index" ON "_TeamLeaders"("B");

-- AddForeignKey
ALTER TABLE "_TeamLeaders" ADD CONSTRAINT "_TeamLeaders_A_fkey" FOREIGN KEY ("A") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TeamLeaders" ADD CONSTRAINT "_TeamLeaders_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Børnesikkerhed
CREATE OR REPLACE FUNCTION "team_leader_guard"() RETURNS trigger AS $$
BEGIN
  -- Et børnehold ledes kun af trænere og admin, og et barn kan ikke være holdleder
  IF EXISTS (SELECT 1 FROM "Team" t, "User" u WHERE t."id" = NEW."A" AND u."id" = NEW."B" AND u."role" = 'ATHLETE' AND (t."kind" = 'BOERN' OR u."athleteGroup" = 'BOERN')) THEN
    RAISE EXCEPTION 'Kun trænere og admin kan være holdleder for et børnehold, og børn kan ikke være holdledere';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "team_leader_guard" BEFORE INSERT OR UPDATE ON "_TeamLeaders" FOR EACH ROW EXECUTE FUNCTION "team_leader_guard"();

-- Bliver et hold et børnehold, mister atleter holdlederrollen
CREATE OR REPLACE FUNCTION "team_leader_kind"() RETURNS trigger AS $$
BEGIN
  IF NEW."kind" = 'BOERN' THEN
    DELETE FROM "_TeamLeaders" l USING "User" u WHERE l."A" = NEW."id" AND u."id" = l."B" AND u."role" = 'ATHLETE';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "team_leader_kind" AFTER UPDATE OF "kind" ON "Team" FOR EACH ROW EXECUTE FUNCTION "team_leader_kind"();

-- Bliver en holdleder atlet igen, mister vedkommende børneholdene; kommer vedkommende selv på et børnehold, alle hold
CREATE OR REPLACE FUNCTION "child_leader_cleanup"() RETURNS trigger AS $$
BEGIN
  DELETE FROM "_TeamLeaders" l USING "Team" t
    WHERE l."B" = NEW."id" AND t."id" = l."A" AND (t."kind" = 'BOERN' OR NEW."athleteGroup" = 'BOERN');
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "child_leader_cleanup" AFTER INSERT OR UPDATE ON "User" FOR EACH ROW
  WHEN (NEW."role" = 'ATHLETE')
  EXECUTE FUNCTION "child_leader_cleanup"();
