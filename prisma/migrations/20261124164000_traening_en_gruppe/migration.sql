-- Hver træning er nu for præcis én atletgruppe.
ALTER TABLE "TrainingSession" ADD COLUMN "group" "AthleteGroup";
UPDATE "TrainingSession" SET "group" = COALESCE("groups"[1], 'BREDDE');
ALTER TABLE "TrainingSession" ALTER COLUMN "group" SET NOT NULL;
ALTER TABLE "TrainingSession" DROP COLUMN "groups";
CREATE INDEX "TrainingSession_group_startsAt_idx" ON "TrainingSession"("group", "startsAt");
