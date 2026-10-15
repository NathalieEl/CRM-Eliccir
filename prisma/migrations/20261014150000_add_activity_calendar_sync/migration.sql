ALTER TABLE "Activity"
ADD COLUMN "prochaineActionDate" TIMESTAMP(3),
ADD COLUMN "prochaineActionDureeMinutes" INTEGER,
ADD COLUMN "pushActivityToGoogle" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "pushNextActionToGoogle" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "googleActivityEventId" TEXT,
ADD COLUMN "googleActivityCalendarUserId" TEXT,
ADD COLUMN "googleNextActionEventId" TEXT,
ADD COLUMN "googleNextActionCalendarUserId" TEXT;

CREATE TABLE "GoogleCalendarConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "googleEmail" TEXT,
    "encryptedRefreshToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "GoogleCalendarConnection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GoogleCalendarConnection_userId_key" ON "GoogleCalendarConnection"("userId");
CREATE INDEX "Activity_googleActivityCalendarUserId_idx" ON "Activity"("googleActivityCalendarUserId");
CREATE INDEX "Activity_googleNextActionCalendarUserId_idx" ON "Activity"("googleNextActionCalendarUserId");

ALTER TABLE "GoogleCalendarConnection"
ADD CONSTRAINT "GoogleCalendarConnection_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Activity"
ADD CONSTRAINT "Activity_googleActivityCalendarUserId_fkey"
FOREIGN KEY ("googleActivityCalendarUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
ADD CONSTRAINT "Activity_googleNextActionCalendarUserId_fkey"
FOREIGN KEY ("googleNextActionCalendarUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;