ALTER TABLE "DeploymentRelease"
ADD COLUMN "releaseEmailSentAt" TIMESTAMP(3),
ADD COLUMN "releaseEmailClaimedAt" TIMESTAMP(3),
ADD COLUMN "releaseEmailError" TEXT;

CREATE INDEX "DeploymentRelease_environment_releaseEmailSentAt_idx"
ON "DeploymentRelease"("environment", "releaseEmailSentAt");