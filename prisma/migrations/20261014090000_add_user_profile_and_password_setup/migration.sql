ALTER TABLE "User"
ADD COLUMN "nom" TEXT,
ADD COLUMN "email" VARCHAR(254),
ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "passwordSetupTokenHash" TEXT,
ADD COLUMN "passwordSetupExpiresAt" TIMESTAMP(3),
ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX "User_passwordSetupTokenHash_key" ON "User"("passwordSetupTokenHash");