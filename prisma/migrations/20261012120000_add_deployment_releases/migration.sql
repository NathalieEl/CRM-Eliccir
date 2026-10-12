CREATE TABLE "DeploymentRelease" (
    "id" TEXT NOT NULL,
    "environment" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "buildId" TEXT NOT NULL,
    "deploymentId" TEXT NOT NULL,
    "commitSha" TEXT,
    "commitMessage" TEXT,
    "deployedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeploymentRelease_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DeploymentRelease_environment_deploymentId_key"
ON "DeploymentRelease"("environment", "deploymentId");

CREATE INDEX "DeploymentRelease_environment_deployedAt_idx"
ON "DeploymentRelease"("environment", "deployedAt");