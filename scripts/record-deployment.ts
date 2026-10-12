import { randomUUID } from "node:crypto";
import { getDeploymentInfo } from "../lib/deployment-info";
import { prisma } from "../lib/prisma";

async function main() {
  const deploymentInfo = getDeploymentInfo();

  if (!deploymentInfo.deploymentId) {
    console.log("Enregistrement de version ignoré hors d’un déploiement Railway.");
    return;
  }

  const result = await prisma.deploymentRelease.createMany({
    data: [
      {
        id: randomUUID(),
        environment: deploymentInfo.environment,
        version: deploymentInfo.version,
        buildId: deploymentInfo.buildId,
        deploymentId: deploymentInfo.deploymentId,
        commitSha: deploymentInfo.commitSha || null,
        commitMessage: deploymentInfo.commitMessage || null,
      },
    ],
    skipDuplicates: true,
  });

  console.log(
    result.count === 1
      ? `Version ${deploymentInfo.version} (${deploymentInfo.environment}, build ${deploymentInfo.buildId}) enregistrée.`
      : `Déploiement ${deploymentInfo.deploymentId} déjà enregistré.`,
  );
}

main()
  .catch((error) => {
    console.error("Erreur pendant l’enregistrement de la version", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });