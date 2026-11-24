-- Chat: fælles kanaler for Elite og Bredde, egne for Børn, og en Social-kanal
CREATE TYPE "ChatRoom" AS ENUM ('VOKSNE', 'BOERN');
CREATE TYPE "ChatChannel" AS ENUM ('RUN', 'BIKE', 'SWIM', 'SOCIAL');

ALTER TABLE "ChatMessage" ADD COLUMN "room" "ChatRoom";
UPDATE "ChatMessage" SET "room" = CASE WHEN "group" = 'BOERN' THEN 'BOERN'::"ChatRoom" ELSE 'VOKSNE'::"ChatRoom" END;
ALTER TABLE "ChatMessage" ALTER COLUMN "room" SET NOT NULL;

ALTER TABLE "ChatMessage" ALTER COLUMN "channel" TYPE "ChatChannel" USING ("channel"::text::"ChatChannel");

DROP INDEX "ChatMessage_group_channel_createdAt_idx";
ALTER TABLE "ChatMessage" DROP COLUMN "group";
CREATE INDEX "ChatMessage_room_channel_createdAt_idx" ON "ChatMessage"("room", "channel", "createdAt");
