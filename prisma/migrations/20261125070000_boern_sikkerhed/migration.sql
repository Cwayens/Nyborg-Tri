-- Børnesikkerhed: børn (atleter på et børnehold) må kun møde trænere, admin og andre børn.
-- Kommer et barn på et børnehold, fjernes dets spor i fællesskabsfunktionerne, hvor det kan møde voksne medlemmer.
CREATE OR REPLACE FUNCTION "child_cleanup"() RETURNS trigger AS $$
BEGIN
  DELETE FROM "GroupWorkoutParticipant" WHERE "userId" = NEW."id";
  DELETE FROM "GroupWorkout" WHERE "hostId" = NEW."id";
  DELETE FROM "BuddyProfile" WHERE "userId" = NEW."id";
  DELETE FROM "Mentorship" WHERE "menteeId" = NEW."id" OR "mentorId" = NEW."id";
  DELETE FROM "ChallengeParticipant" WHERE "userId" = NEW."id";
  DELETE FROM "RaceEntry" WHERE "userId" = NEW."id";
  IF NEW."leaderboard" OR NEW."mentor" THEN
    UPDATE "User" SET "leaderboard" = false, "mentor" = false WHERE "id" = NEW."id";
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "child_cleanup" AFTER INSERT OR UPDATE ON "User" FOR EACH ROW
  WHEN (NEW."role" = 'ATHLETE' AND NEW."athleteGroup" = 'BOERN')
  EXECUTE FUNCTION "child_cleanup"();

-- Ryd op for de børn, der findes nu
UPDATE "User" SET "leaderboard" = false, "mentor" = false WHERE "role" = 'ATHLETE' AND "athleteGroup" = 'BOERN';

-- Og omvendt: et barn kan ikke komme med i fællesskabsfunktionerne, uanset hvor i koden der skrives.
CREATE OR REPLACE FUNCTION "child_guard"() RETURNS trigger AS $$
DECLARE uid TEXT;
BEGIN
  uid := to_jsonb(NEW) ->> CASE TG_TABLE_NAME WHEN 'GroupWorkout' THEN 'hostId' ELSE 'userId' END;
  IF EXISTS (SELECT 1 FROM "User" WHERE "id" = uid AND "role" = 'ATHLETE' AND "athleteGroup" = 'BOERN') THEN
    RAISE EXCEPTION 'Børn kan ikke bruge denne funktion';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION "child_guard_mentor"() RETURNS trigger AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM "User" WHERE "id" IN (NEW."menteeId", NEW."mentorId") AND "role" = 'ATHLETE' AND "athleteGroup" = 'BOERN') THEN
    RAISE EXCEPTION 'Børn kan ikke bruge denne funktion';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "child_guard" BEFORE INSERT OR UPDATE ON "GroupWorkout" FOR EACH ROW EXECUTE FUNCTION "child_guard"();
CREATE TRIGGER "child_guard" BEFORE INSERT OR UPDATE ON "GroupWorkoutParticipant" FOR EACH ROW EXECUTE FUNCTION "child_guard"();
CREATE TRIGGER "child_guard" BEFORE INSERT OR UPDATE ON "BuddyProfile" FOR EACH ROW EXECUTE FUNCTION "child_guard"();
CREATE TRIGGER "child_guard" BEFORE INSERT OR UPDATE ON "ChallengeParticipant" FOR EACH ROW EXECUTE FUNCTION "child_guard"();
CREATE TRIGGER "child_guard" BEFORE INSERT OR UPDATE ON "RaceEntry" FOR EACH ROW EXECUTE FUNCTION "child_guard"();
CREATE TRIGGER "child_guard_mentor" BEFORE INSERT OR UPDATE ON "Mentorship" FOR EACH ROW EXECUTE FUNCTION "child_guard_mentor"();
