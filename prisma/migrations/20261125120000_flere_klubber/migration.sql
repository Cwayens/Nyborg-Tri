-- Flere klubber i samme database (multi-tenant).
-- Alle tabeller (undtagen Account) får clubId. Alt, der findes i dag, hører til Nyborg Triathlon Klub (id 'nyborg').
-- Isolationen håndhæves to steder: src/lib/db.ts filtrerer hver forespørgsel på den aktuelle klub, og triggerne
-- nederst i denne fil afviser rækker, der peger på en række i en anden klub, og forhindrer at en række skifter klub.

-- CreateTable
CREATE TABLE "Club" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "domains" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "secrets" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Club_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Club_slug_key" ON "Club"("slug");

INSERT INTO "Club" ("id", "slug", "name", "domains") VALUES
  ('nyborg', 'nyborg', 'Nyborg Triathlon Klub', ARRAY['nyborgtri.dk', 'www.nyborgtri.dk']);

-- DropIndex
DROP INDEX "AccessCode_code_key";

-- DropIndex
DROP INDEX "Activity_provider_externalId_key";

-- DropIndex
DROP INDEX "AthleteProfile_slug_key";

-- DropIndex
DROP INDEX "BudgetLine_year_category_key";

-- DropIndex
DROP INDEX "LedgerEntry_voucherNo_key";

-- DropIndex
DROP INDEX "MembershipType_code_key";

-- DropIndex
DROP INDEX "Page_path_key";

-- DropIndex
DROP INDEX "Page_wpId_key";

-- DropIndex
DROP INDEX "Post_slug_key";

-- DropIndex
DROP INDEX "Post_wpId_key";

-- DropIndex
DROP INDEX "User_email_key";

-- DropIndex
DROP INDEX "WearableConnection_provider_externalAthleteId_key";

-- AlterTable
ALTER TABLE "AccessCode" ADD COLUMN     "clubId" TEXT NOT NULL DEFAULT 'nyborg';

-- AlterTable
ALTER TABLE "Activity" ADD COLUMN     "clubId" TEXT NOT NULL DEFAULT 'nyborg';

-- AlterTable
ALTER TABLE "AthleteProfile" ADD COLUMN     "clubId" TEXT NOT NULL DEFAULT 'nyborg';

-- AlterTable
ALTER TABLE "BeginnerPlan" ADD COLUMN     "clubId" TEXT NOT NULL DEFAULT 'nyborg';

-- AlterTable
ALTER TABLE "BenchmarkResult" ADD COLUMN     "clubId" TEXT NOT NULL DEFAULT 'nyborg';

-- AlterTable
ALTER TABLE "Branch" ADD COLUMN     "clubId" TEXT NOT NULL DEFAULT 'nyborg';

-- AlterTable
ALTER TABLE "BuddyProfile" ADD COLUMN     "clubId" TEXT NOT NULL DEFAULT 'nyborg';

-- AlterTable
ALTER TABLE "BudgetLine" ADD COLUMN     "clubId" TEXT NOT NULL DEFAULT 'nyborg';

-- AlterTable
ALTER TABLE "Challenge" ADD COLUMN     "clubId" TEXT NOT NULL DEFAULT 'nyborg';

-- AlterTable
ALTER TABLE "ChallengeParticipant" ADD COLUMN     "clubId" TEXT NOT NULL DEFAULT 'nyborg';

-- AlterTable
ALTER TABLE "ChatMessage" ADD COLUMN     "clubId" TEXT NOT NULL DEFAULT 'nyborg';

-- AlterTable
ALTER TABLE "ClubRoute" DROP CONSTRAINT "ClubRoute_pkey",
ADD COLUMN     "clubId" TEXT NOT NULL DEFAULT 'nyborg',
ADD CONSTRAINT "ClubRoute_pkey" PRIMARY KEY ("clubId", "id");

-- AlterTable
ALTER TABLE "ContactMessage" ADD COLUMN     "clubId" TEXT NOT NULL DEFAULT 'nyborg';

-- AlterTable
ALTER TABLE "ContactPerson" ADD COLUMN     "clubId" TEXT NOT NULL DEFAULT 'nyborg';

-- AlterTable
ALTER TABLE "Effort" ADD COLUMN     "clubId" TEXT NOT NULL DEFAULT 'nyborg';

-- AlterTable
ALTER TABLE "GroupWorkout" ADD COLUMN     "clubId" TEXT NOT NULL DEFAULT 'nyborg';

-- AlterTable
ALTER TABLE "GroupWorkoutParticipant" ADD COLUMN     "clubId" TEXT NOT NULL DEFAULT 'nyborg';

-- AlterTable
ALTER TABLE "LedgerEntry" ADD COLUMN     "clubId" TEXT NOT NULL DEFAULT 'nyborg',
ALTER COLUMN "voucherNo" DROP DEFAULT;
DROP SEQUENCE "LedgerEntry_voucherNo_seq";

-- AlterTable
ALTER TABLE "MailLog" ADD COLUMN     "clubId" TEXT NOT NULL DEFAULT 'nyborg';

-- AlterTable
ALTER TABLE "Membership" ADD COLUMN     "clubId" TEXT NOT NULL DEFAULT 'nyborg';

-- AlterTable
ALTER TABLE "MembershipType" ADD COLUMN     "clubId" TEXT NOT NULL DEFAULT 'nyborg';

-- AlterTable
ALTER TABLE "Mentorship" ADD COLUMN     "clubId" TEXT NOT NULL DEFAULT 'nyborg';

-- AlterTable
ALTER TABLE "Page" ADD COLUMN     "clubId" TEXT NOT NULL DEFAULT 'nyborg';

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "clubId" TEXT NOT NULL DEFAULT 'nyborg';

-- AlterTable
ALTER TABLE "PlannedWorkout" ADD COLUMN     "clubId" TEXT NOT NULL DEFAULT 'nyborg';

-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "clubId" TEXT NOT NULL DEFAULT 'nyborg';

-- AlterTable
ALTER TABLE "PostReaction" ADD COLUMN     "clubId" TEXT NOT NULL DEFAULT 'nyborg';

-- AlterTable
ALTER TABLE "Race" ADD COLUMN     "clubId" TEXT NOT NULL DEFAULT 'nyborg';

-- AlterTable
ALTER TABLE "RaceEntry" ADD COLUMN     "clubId" TEXT NOT NULL DEFAULT 'nyborg';

-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "clubId" TEXT NOT NULL DEFAULT 'nyborg';

-- AlterTable
ALTER TABLE "Setting" DROP CONSTRAINT "Setting_pkey",
ADD COLUMN     "clubId" TEXT NOT NULL DEFAULT 'nyborg',
ADD CONSTRAINT "Setting_pkey" PRIMARY KEY ("clubId", "key");

-- AlterTable
ALTER TABLE "Sponsor" ADD COLUMN     "clubId" TEXT NOT NULL DEFAULT 'nyborg';

-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "clubId" TEXT NOT NULL DEFAULT 'nyborg';

-- AlterTable
ALTER TABLE "Tip" ADD COLUMN     "clubId" TEXT NOT NULL DEFAULT 'nyborg';

-- AlterTable
ALTER TABLE "TrainingSession" ADD COLUMN     "clubId" TEXT NOT NULL DEFAULT 'nyborg';

-- AlterTable
ALTER TABLE "TrainingSignup" ADD COLUMN     "clubId" TEXT NOT NULL DEFAULT 'nyborg';

-- AlterTable
ALTER TABLE "TrialRequest" ADD COLUMN     "clubId" TEXT NOT NULL DEFAULT 'nyborg';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "clubId" TEXT NOT NULL DEFAULT 'nyborg';

-- AlterTable
ALTER TABLE "VerificationToken" ADD COLUMN     "clubId" TEXT NOT NULL DEFAULT 'nyborg';

-- AlterTable
ALTER TABLE "WearableConnection" ADD COLUMN     "clubId" TEXT NOT NULL DEFAULT 'nyborg';



-- CreateIndex
CREATE UNIQUE INDEX "AccessCode_clubId_code_key" ON "AccessCode"("clubId", "code");

-- CreateIndex
CREATE INDEX "Activity_clubId_idx" ON "Activity"("clubId");

-- CreateIndex
CREATE UNIQUE INDEX "Activity_clubId_provider_externalId_key" ON "Activity"("clubId", "provider", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "AthleteProfile_clubId_slug_key" ON "AthleteProfile"("clubId", "slug");

-- CreateIndex
CREATE INDEX "BeginnerPlan_clubId_idx" ON "BeginnerPlan"("clubId");

-- CreateIndex
CREATE INDEX "BenchmarkResult_clubId_idx" ON "BenchmarkResult"("clubId");

-- CreateIndex
CREATE INDEX "Branch_clubId_idx" ON "Branch"("clubId");

-- CreateIndex
CREATE INDEX "BuddyProfile_clubId_idx" ON "BuddyProfile"("clubId");

-- CreateIndex
CREATE INDEX "BudgetLine_clubId_idx" ON "BudgetLine"("clubId");

-- CreateIndex
CREATE UNIQUE INDEX "BudgetLine_clubId_year_category_key" ON "BudgetLine"("clubId", "year", "category");

-- CreateIndex
CREATE INDEX "Challenge_clubId_idx" ON "Challenge"("clubId");

-- CreateIndex
CREATE INDEX "ChallengeParticipant_clubId_idx" ON "ChallengeParticipant"("clubId");

-- CreateIndex
CREATE INDEX "ChatMessage_clubId_idx" ON "ChatMessage"("clubId");

-- CreateIndex
CREATE INDEX "ContactMessage_clubId_idx" ON "ContactMessage"("clubId");

-- CreateIndex
CREATE INDEX "ContactPerson_clubId_idx" ON "ContactPerson"("clubId");

-- CreateIndex
CREATE INDEX "Effort_clubId_idx" ON "Effort"("clubId");

-- CreateIndex
CREATE INDEX "GroupWorkout_clubId_idx" ON "GroupWorkout"("clubId");

-- CreateIndex
CREATE INDEX "GroupWorkoutParticipant_clubId_idx" ON "GroupWorkoutParticipant"("clubId");

-- CreateIndex
CREATE UNIQUE INDEX "LedgerEntry_clubId_voucherNo_key" ON "LedgerEntry"("clubId", "voucherNo");

-- CreateIndex
CREATE INDEX "MailLog_clubId_idx" ON "MailLog"("clubId");

-- CreateIndex
CREATE INDEX "Membership_clubId_idx" ON "Membership"("clubId");

-- CreateIndex
CREATE UNIQUE INDEX "MembershipType_clubId_code_key" ON "MembershipType"("clubId", "code");

-- CreateIndex
CREATE INDEX "Mentorship_clubId_idx" ON "Mentorship"("clubId");

-- CreateIndex
CREATE UNIQUE INDEX "Page_clubId_path_key" ON "Page"("clubId", "path");

-- CreateIndex
CREATE UNIQUE INDEX "Page_clubId_wpId_key" ON "Page"("clubId", "wpId");

-- CreateIndex
CREATE INDEX "Payment_clubId_idx" ON "Payment"("clubId");

-- CreateIndex
CREATE INDEX "PlannedWorkout_clubId_idx" ON "PlannedWorkout"("clubId");

-- CreateIndex
CREATE UNIQUE INDEX "Post_clubId_slug_key" ON "Post"("clubId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "Post_clubId_wpId_key" ON "Post"("clubId", "wpId");

-- CreateIndex
CREATE INDEX "PostReaction_clubId_idx" ON "PostReaction"("clubId");

-- CreateIndex
CREATE INDEX "Race_clubId_idx" ON "Race"("clubId");

-- CreateIndex
CREATE INDEX "RaceEntry_clubId_idx" ON "RaceEntry"("clubId");

-- CreateIndex
CREATE INDEX "Session_clubId_idx" ON "Session"("clubId");

-- CreateIndex
CREATE INDEX "Sponsor_clubId_idx" ON "Sponsor"("clubId");

-- CreateIndex
CREATE INDEX "Team_clubId_idx" ON "Team"("clubId");

-- CreateIndex
CREATE INDEX "Tip_clubId_idx" ON "Tip"("clubId");

-- CreateIndex
CREATE INDEX "TrainingSession_clubId_idx" ON "TrainingSession"("clubId");

-- CreateIndex
CREATE INDEX "TrainingSignup_clubId_idx" ON "TrainingSignup"("clubId");

-- CreateIndex
CREATE INDEX "TrialRequest_clubId_idx" ON "TrialRequest"("clubId");

-- CreateIndex
CREATE UNIQUE INDEX "User_clubId_email_key" ON "User"("clubId", "email");

-- CreateIndex
CREATE INDEX "VerificationToken_clubId_idx" ON "VerificationToken"("clubId");

-- CreateIndex
CREATE INDEX "WearableConnection_clubId_idx" ON "WearableConnection"("clubId");

-- CreateIndex
CREATE UNIQUE INDEX "WearableConnection_clubId_provider_externalAthleteId_key" ON "WearableConnection"("clubId", "provider", "externalAthleteId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationToken" ADD CONSTRAINT "VerificationToken_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipType" ADD CONSTRAINT "MembershipType_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Page" ADD CONSTRAINT "Page_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostReaction" ADD CONSTRAINT "PostReaction_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingSession" ADD CONSTRAINT "TrainingSession_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingSignup" ADD CONSTRAINT "TrainingSignup_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrialRequest" ADD CONSTRAINT "TrialRequest_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessCode" ADD CONSTRAINT "AccessCode_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WearableConnection" ADD CONSTRAINT "WearableConnection_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupWorkout" ADD CONSTRAINT "GroupWorkout_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupWorkoutParticipant" ADD CONSTRAINT "GroupWorkoutParticipant_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Effort" ADD CONSTRAINT "Effort_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BenchmarkResult" ADD CONSTRAINT "BenchmarkResult_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sponsor" ADD CONSTRAINT "Sponsor_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteProfile" ADD CONSTRAINT "AthleteProfile_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactPerson" ADD CONSTRAINT "ContactPerson_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactMessage" ADD CONSTRAINT "ContactMessage_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MailLog" ADD CONSTRAINT "MailLog_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Setting" ADD CONSTRAINT "Setting_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuddyProfile" ADD CONSTRAINT "BuddyProfile_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mentorship" ADD CONSTRAINT "Mentorship_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BeginnerPlan" ADD CONSTRAINT "BeginnerPlan_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tip" ADD CONSTRAINT "Tip_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Challenge" ADD CONSTRAINT "Challenge_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeParticipant" ADD CONSTRAINT "ChallengeParticipant_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Race" ADD CONSTRAINT "Race_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaceEntry" ADD CONSTRAINT "RaceEntry_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlannedWorkout" ADD CONSTRAINT "PlannedWorkout_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubRoute" ADD CONSTRAINT "ClubRoute_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Branch" ADD CONSTRAINT "Branch_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetLine" ADD CONSTRAINT "BudgetLine_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 'nyborg' var kun til de eksisterende rækker. Nye rækker får klubben fra src/lib/db.ts; '' findes ikke som klub og afvises
ALTER TABLE "User" ALTER COLUMN "clubId" SET DEFAULT '';
ALTER TABLE "Session" ALTER COLUMN "clubId" SET DEFAULT '';
ALTER TABLE "VerificationToken" ALTER COLUMN "clubId" SET DEFAULT '';
ALTER TABLE "MembershipType" ALTER COLUMN "clubId" SET DEFAULT '';
ALTER TABLE "Membership" ALTER COLUMN "clubId" SET DEFAULT '';
ALTER TABLE "Payment" ALTER COLUMN "clubId" SET DEFAULT '';
ALTER TABLE "Page" ALTER COLUMN "clubId" SET DEFAULT '';
ALTER TABLE "Post" ALTER COLUMN "clubId" SET DEFAULT '';
ALTER TABLE "PostReaction" ALTER COLUMN "clubId" SET DEFAULT '';
ALTER TABLE "TrainingSession" ALTER COLUMN "clubId" SET DEFAULT '';
ALTER TABLE "TrainingSignup" ALTER COLUMN "clubId" SET DEFAULT '';
ALTER TABLE "TrialRequest" ALTER COLUMN "clubId" SET DEFAULT '';
ALTER TABLE "AccessCode" ALTER COLUMN "clubId" SET DEFAULT '';
ALTER TABLE "WearableConnection" ALTER COLUMN "clubId" SET DEFAULT '';
ALTER TABLE "Activity" ALTER COLUMN "clubId" SET DEFAULT '';
ALTER TABLE "GroupWorkout" ALTER COLUMN "clubId" SET DEFAULT '';
ALTER TABLE "GroupWorkoutParticipant" ALTER COLUMN "clubId" SET DEFAULT '';
ALTER TABLE "Effort" ALTER COLUMN "clubId" SET DEFAULT '';
ALTER TABLE "BenchmarkResult" ALTER COLUMN "clubId" SET DEFAULT '';
ALTER TABLE "ChatMessage" ALTER COLUMN "clubId" SET DEFAULT '';
ALTER TABLE "Sponsor" ALTER COLUMN "clubId" SET DEFAULT '';
ALTER TABLE "AthleteProfile" ALTER COLUMN "clubId" SET DEFAULT '';
ALTER TABLE "ContactPerson" ALTER COLUMN "clubId" SET DEFAULT '';
ALTER TABLE "ContactMessage" ALTER COLUMN "clubId" SET DEFAULT '';
ALTER TABLE "MailLog" ALTER COLUMN "clubId" SET DEFAULT '';
ALTER TABLE "Setting" ALTER COLUMN "clubId" SET DEFAULT '';
ALTER TABLE "BuddyProfile" ALTER COLUMN "clubId" SET DEFAULT '';
ALTER TABLE "Mentorship" ALTER COLUMN "clubId" SET DEFAULT '';
ALTER TABLE "BeginnerPlan" ALTER COLUMN "clubId" SET DEFAULT '';
ALTER TABLE "Tip" ALTER COLUMN "clubId" SET DEFAULT '';
ALTER TABLE "Challenge" ALTER COLUMN "clubId" SET DEFAULT '';
ALTER TABLE "ChallengeParticipant" ALTER COLUMN "clubId" SET DEFAULT '';
ALTER TABLE "Race" ALTER COLUMN "clubId" SET DEFAULT '';
ALTER TABLE "RaceEntry" ALTER COLUMN "clubId" SET DEFAULT '';
ALTER TABLE "PlannedWorkout" ALTER COLUMN "clubId" SET DEFAULT '';
ALTER TABLE "ClubRoute" ALTER COLUMN "clubId" SET DEFAULT '';
ALTER TABLE "Team" ALTER COLUMN "clubId" SET DEFAULT '';
ALTER TABLE "Branch" ALTER COLUMN "clubId" SET DEFAULT '';
ALTER TABLE "LedgerEntry" ALTER COLUMN "clubId" SET DEFAULT '';
ALTER TABLE "BudgetLine" ALTER COLUMN "clubId" SET DEFAULT '';

-- Bilagsnumre er nu fortløbende pr. klub (src/lib/finance-db.ts finder næste nummer)

-- Holdsynkroniseringen vælger kun hold i medlemmets/træningens egen klub
CREATE OR REPLACE FUNCTION "user_team_sync"() RETURNS trigger AS $$
BEGIN
  IF NEW."teamId" IS NOT NULL AND (TG_OP = 'INSERT' OR NEW."teamId" IS DISTINCT FROM OLD."teamId") THEN
    NEW."athleteGroup" := (SELECT "kind" FROM "Team" WHERE "id" = NEW."teamId");
  ELSIF TG_OP = 'INSERT' OR NEW."athleteGroup" IS DISTINCT FROM OLD."athleteGroup" THEN
    IF NEW."athleteGroup" IS NULL THEN
      NEW."teamId" := NULL;
    ELSIF NEW."teamId" IS NULL OR (SELECT "kind" FROM "Team" WHERE "id" = NEW."teamId") IS DISTINCT FROM NEW."athleteGroup" THEN
      NEW."teamId" := (SELECT "id" FROM "Team" WHERE "clubId" = NEW."clubId" AND "kind" = NEW."athleteGroup" AND "active" ORDER BY "sortOrder", "createdAt" LIMIT 1);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION "training_team_sync"() RETURNS trigger AS $$
BEGIN
  IF NEW."teamId" IS NOT NULL AND (TG_OP = 'INSERT' OR NEW."teamId" IS DISTINCT FROM OLD."teamId") THEN
    NEW."group" := (SELECT "kind" FROM "Team" WHERE "id" = NEW."teamId");
  ELSIF TG_OP = 'INSERT' OR NEW."group" IS DISTINCT FROM OLD."group" THEN
    IF NEW."teamId" IS NULL OR (SELECT "kind" FROM "Team" WHERE "id" = NEW."teamId") IS DISTINCT FROM NEW."group" THEN
      NEW."teamId" := (SELECT "id" FROM "Team" WHERE "clubId" = NEW."clubId" AND "kind" = NEW."group" AND "active" ORDER BY "sortOrder", "createdAt" LIMIT 1);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Klubvagt: en række må kun pege på rækker i sin egen klub, og en række kan ikke flyttes til en anden klub.
-- Argumenterne er par af (forældertabel, kolonne).
CREATE OR REPLACE FUNCTION "club_guard"() RETURNS trigger AS $$
DECLARE
  i INT := 0;
  val TEXT;
  parent_club TEXT;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW."clubId" IS DISTINCT FROM OLD."clubId" THEN
    RAISE EXCEPTION 'Klub-isolation: en række i % kan ikke flyttes til en anden klub', TG_TABLE_NAME USING ERRCODE = '23514';
  END IF;
  WHILE i < TG_NARGS LOOP
    EXECUTE format('SELECT ($1).%I::text', TG_ARGV[i + 1]) INTO val USING NEW;
    IF val IS NOT NULL THEN
      EXECUTE format('SELECT "clubId" FROM %I WHERE "id" = $1', TG_ARGV[i]) INTO parent_club USING val;
      IF parent_club IS DISTINCT FROM NEW."clubId" THEN
        RAISE EXCEPTION 'Klub-isolation: %.% peger på en række i en anden klub', TG_TABLE_NAME, TG_ARGV[i + 1] USING ERRCODE = '23514';
      END IF;
    END IF;
    i := i + 2;
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "zz_club_guard" BEFORE INSERT OR UPDATE ON "User" FOR EACH ROW EXECUTE FUNCTION "club_guard"('Team', 'teamId');
CREATE TRIGGER "zz_club_guard" BEFORE INSERT OR UPDATE ON "Session" FOR EACH ROW EXECUTE FUNCTION "club_guard"('User', 'userId');
CREATE TRIGGER "zz_club_guard" BEFORE INSERT OR UPDATE ON "VerificationToken" FOR EACH ROW EXECUTE FUNCTION "club_guard"();
CREATE TRIGGER "zz_club_guard" BEFORE INSERT OR UPDATE ON "MembershipType" FOR EACH ROW EXECUTE FUNCTION "club_guard"();
CREATE TRIGGER "zz_club_guard" BEFORE INSERT OR UPDATE ON "Membership" FOR EACH ROW EXECUTE FUNCTION "club_guard"('User', 'userId', 'MembershipType', 'typeId');
CREATE TRIGGER "zz_club_guard" BEFORE INSERT OR UPDATE ON "Payment" FOR EACH ROW EXECUTE FUNCTION "club_guard"('User', 'userId', 'Membership', 'membershipId');
CREATE TRIGGER "zz_club_guard" BEFORE INSERT OR UPDATE ON "Page" FOR EACH ROW EXECUTE FUNCTION "club_guard"();
CREATE TRIGGER "zz_club_guard" BEFORE INSERT OR UPDATE ON "Post" FOR EACH ROW EXECUTE FUNCTION "club_guard"();
CREATE TRIGGER "zz_club_guard" BEFORE INSERT OR UPDATE ON "PostReaction" FOR EACH ROW EXECUTE FUNCTION "club_guard"('Post', 'postId', 'User', 'userId');
CREATE TRIGGER "zz_club_guard" BEFORE INSERT OR UPDATE ON "TrainingSession" FOR EACH ROW EXECUTE FUNCTION "club_guard"('Team', 'teamId', 'User', 'createdById');
CREATE TRIGGER "zz_club_guard" BEFORE INSERT OR UPDATE ON "TrainingSignup" FOR EACH ROW EXECUTE FUNCTION "club_guard"('TrainingSession', 'sessionId', 'User', 'userId');
CREATE TRIGGER "zz_club_guard" BEFORE INSERT OR UPDATE ON "TrialRequest" FOR EACH ROW EXECUTE FUNCTION "club_guard"('User', 'userId', 'User', 'decidedById');
CREATE TRIGGER "zz_club_guard" BEFORE INSERT OR UPDATE ON "AccessCode" FOR EACH ROW EXECUTE FUNCTION "club_guard"('MembershipType', 'typeId', 'User', 'createdById', 'User', 'usedById');
CREATE TRIGGER "zz_club_guard" BEFORE INSERT OR UPDATE ON "WearableConnection" FOR EACH ROW EXECUTE FUNCTION "club_guard"('User', 'userId');
CREATE TRIGGER "zz_club_guard" BEFORE INSERT OR UPDATE ON "Activity" FOR EACH ROW EXECUTE FUNCTION "club_guard"('User', 'userId');
CREATE TRIGGER "zz_club_guard" BEFORE INSERT OR UPDATE ON "GroupWorkout" FOR EACH ROW EXECUTE FUNCTION "club_guard"('User', 'hostId');
CREATE TRIGGER "zz_club_guard" BEFORE INSERT OR UPDATE ON "GroupWorkoutParticipant" FOR EACH ROW EXECUTE FUNCTION "club_guard"('GroupWorkout', 'workoutId', 'User', 'userId');
CREATE TRIGGER "zz_club_guard" BEFORE INSERT OR UPDATE ON "Effort" FOR EACH ROW EXECUTE FUNCTION "club_guard"('User', 'userId', 'Activity', 'activityId');
CREATE TRIGGER "zz_club_guard" BEFORE INSERT OR UPDATE ON "BenchmarkResult" FOR EACH ROW EXECUTE FUNCTION "club_guard"('User', 'userId', 'Effort', 'effortId');
CREATE TRIGGER "zz_club_guard" BEFORE INSERT OR UPDATE ON "ChatMessage" FOR EACH ROW EXECUTE FUNCTION "club_guard"('User', 'userId');
CREATE TRIGGER "zz_club_guard" BEFORE INSERT OR UPDATE ON "Sponsor" FOR EACH ROW EXECUTE FUNCTION "club_guard"();
CREATE TRIGGER "zz_club_guard" BEFORE INSERT OR UPDATE ON "AthleteProfile" FOR EACH ROW EXECUTE FUNCTION "club_guard"('User', 'userId');
CREATE TRIGGER "zz_club_guard" BEFORE INSERT OR UPDATE ON "ContactPerson" FOR EACH ROW EXECUTE FUNCTION "club_guard"();
CREATE TRIGGER "zz_club_guard" BEFORE INSERT OR UPDATE ON "ContactMessage" FOR EACH ROW EXECUTE FUNCTION "club_guard"();
CREATE TRIGGER "zz_club_guard" BEFORE INSERT OR UPDATE ON "MailLog" FOR EACH ROW EXECUTE FUNCTION "club_guard"();
CREATE TRIGGER "zz_club_guard" BEFORE INSERT OR UPDATE ON "Setting" FOR EACH ROW EXECUTE FUNCTION "club_guard"();
CREATE TRIGGER "zz_club_guard" BEFORE INSERT OR UPDATE ON "BuddyProfile" FOR EACH ROW EXECUTE FUNCTION "club_guard"('User', 'userId');
CREATE TRIGGER "zz_club_guard" BEFORE INSERT OR UPDATE ON "Mentorship" FOR EACH ROW EXECUTE FUNCTION "club_guard"('User', 'menteeId', 'User', 'mentorId');
CREATE TRIGGER "zz_club_guard" BEFORE INSERT OR UPDATE ON "BeginnerPlan" FOR EACH ROW EXECUTE FUNCTION "club_guard"('User', 'userId');
CREATE TRIGGER "zz_club_guard" BEFORE INSERT OR UPDATE ON "Tip" FOR EACH ROW EXECUTE FUNCTION "club_guard"('User', 'authorId');
CREATE TRIGGER "zz_club_guard" BEFORE INSERT OR UPDATE ON "Challenge" FOR EACH ROW EXECUTE FUNCTION "club_guard"('User', 'createdById');
CREATE TRIGGER "zz_club_guard" BEFORE INSERT OR UPDATE ON "ChallengeParticipant" FOR EACH ROW EXECUTE FUNCTION "club_guard"('Challenge', 'challengeId', 'User', 'userId');
CREATE TRIGGER "zz_club_guard" BEFORE INSERT OR UPDATE ON "Race" FOR EACH ROW EXECUTE FUNCTION "club_guard"('User', 'createdById');
CREATE TRIGGER "zz_club_guard" BEFORE INSERT OR UPDATE ON "RaceEntry" FOR EACH ROW EXECUTE FUNCTION "club_guard"('Race', 'raceId', 'User', 'userId');
CREATE TRIGGER "zz_club_guard" BEFORE INSERT OR UPDATE ON "PlannedWorkout" FOR EACH ROW EXECUTE FUNCTION "club_guard"('User', 'userId', 'GroupWorkout', 'sharedId');
CREATE TRIGGER "zz_club_guard" BEFORE INSERT OR UPDATE ON "ClubRoute" FOR EACH ROW EXECUTE FUNCTION "club_guard"();
CREATE TRIGGER "zz_club_guard" BEFORE INSERT OR UPDATE ON "Team" FOR EACH ROW EXECUTE FUNCTION "club_guard"('Branch', 'branchId');
CREATE TRIGGER "zz_club_guard" BEFORE INSERT OR UPDATE ON "Branch" FOR EACH ROW EXECUTE FUNCTION "club_guard"();
CREATE TRIGGER "zz_club_guard" BEFORE INSERT OR UPDATE ON "LedgerEntry" FOR EACH ROW EXECUTE FUNCTION "club_guard"('Sponsor', 'sponsorId', 'User', 'createdById');
CREATE TRIGGER "zz_club_guard" BEFORE INSERT OR UPDATE ON "BudgetLine" FOR EACH ROW EXECUTE FUNCTION "club_guard"();

-- Mange-til-mange-tabellerne har ingen clubId: begge ender skal høre til samme klub
CREATE OR REPLACE FUNCTION "club_guard_link"() RETURNS trigger AS $$
DECLARE a TEXT; b TEXT;
BEGIN
  EXECUTE format('SELECT "clubId" FROM %I WHERE "id" = $1', TG_ARGV[0]) INTO a USING NEW."A";
  EXECUTE format('SELECT "clubId" FROM %I WHERE "id" = $1', TG_ARGV[1]) INTO b USING NEW."B";
  IF a IS DISTINCT FROM b THEN
    RAISE EXCEPTION 'Klub-isolation: % forbinder rækker fra to klubber', TG_TABLE_NAME USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "zz_club_guard" BEFORE INSERT OR UPDATE ON "_TeamLeaders" FOR EACH ROW EXECUTE FUNCTION "club_guard_link"('Team', 'User');
CREATE TRIGGER "zz_club_guard" BEFORE INSERT OR UPDATE ON "_AthleteProfileToSponsor" FOR EACH ROW EXECUTE FUNCTION "club_guard_link"('AthleteProfile', 'Sponsor');
