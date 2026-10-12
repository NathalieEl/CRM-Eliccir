import packageMetadata from "../package.json";

export type DeploymentInfo = {
  environment: string;
  environmentLabel: string;
  version: string;
  buildId: string;
  deploymentId: string;
  commitSha: string;
  commitMessage: string;
};

export function getDeploymentInfo(): DeploymentInfo {
  const environment =
    process.env.RAILWAY_ENVIRONMENT_NAME ??
    (process.env.NODE_ENV === "production" ? "production" : "development");
  const deploymentId = process.env.RAILWAY_DEPLOYMENT_ID ?? "";
  const commitSha = process.env.RAILWAY_GIT_COMMIT_SHA ?? "";
  const buildId = commitSha.slice(0, 7) || deploymentId.slice(0, 7) || "local";

  return {
    environment,
    environmentLabel:
      environment.toLowerCase() === "production"
        ? "PROD"
        : environment.toLowerCase() === "development"
          ? "DEV"
          : environment.toUpperCase(),
    version: packageMetadata.version,
    buildId,
    deploymentId,
    commitSha,
    commitMessage: process.env.RAILWAY_GIT_COMMIT_MESSAGE ?? "",
  };
}