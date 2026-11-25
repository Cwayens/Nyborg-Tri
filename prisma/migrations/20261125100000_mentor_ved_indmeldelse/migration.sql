-- Ønske om mentor ved indmeldelse
ALTER TABLE "User" ADD COLUMN "wantsMentor" BOOLEAN NOT NULL DEFAULT false;

-- Børn kan ikke ønske en mentor: oprydningen for børn nulstiller også ønsket
CREATE OR REPLACE FUNCTION "child_cleanup"() RETURNS trigger AS $$
BEGIN
  DELETE FROM "GroupWorkoutParticipant" WHERE "userId" = NEW."id";
  DELETE FROM "GroupWorkout" WHERE "hostId" = NEW."id";
  DELETE FROM "BuddyProfile" WHERE "userId" = NEW."id";
  DELETE FROM "Mentorship" WHERE "menteeId" = NEW."id" OR "mentorId" = NEW."id";
  DELETE FROM "ChallengeParticipant" WHERE "userId" = NEW."id";
  DELETE FROM "RaceEntry" WHERE "userId" = NEW."id";
  IF NEW."leaderboard" OR NEW."mentor" OR NEW."wantsMentor" THEN
    UPDATE "User" SET "leaderboard" = false, "mentor" = false, "wantsMentor" = false WHERE "id" = NEW."id";
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
