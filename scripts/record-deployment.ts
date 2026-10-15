import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { getDeploymentInfo } from "../lib/deployment-info";
import { sendReleaseAnnouncement } from "../lib/release-announcement-email";
import { prisma } from "../lib/prisma";

type ReleaseChange = { title: string; text: string };

async function getReleaseChanges(version: string): Promise<ReleaseChange[]> {
  const url = new URL("../docs/release-notes.json", import.meta.url);
  const catalog = JSON.parse(await readFile(url, "utf8")) as Record<string, ReleaseChange[]>;
  const changes = catalog[version];
  if (!Array.isArray(changes)) return [];
  return changes.filter((change) =>
    typeof change?.title === "string" && change.title.trim() &&
    typeof change?.text === "string" && change.text.trim(),
  );
}

async function main() {
  const deploymentInfo = getDeploymentInfo();

  if (!deploymentInfo.deploymentId) {
    console.log("Enregistrement de version ignoré hors d’un déploiement Railway.");
    return;
  }

  const release = await prisma.deploymentRelease.upsert({
    where: {
      environment_deploymentId: {
        environment: deploymentInfo.environment,
        deploymentId: deploymentInfo.deploymentId,
      },
    },
    create: {
        id: randomUUID(),
        environment: deploymentInfo.environment,
        version: deploymentInfo.version,
        buildId: deploymentInfo.buildId,
        deploymentId: deploymentInfo.deploymentId,
        commitSha: deploymentInfo.commitSha || null,
        commitMessage: deploymentInfo.commitMessage || null,
    },
    update: {},
  });

  console.log(`Version ${deploymentInfo.version} (${deploymentInfo.environment}, build ${deploymentInfo.buildId}) enregistrée.`);

  if (deploymentInfo.environment.toLowerCase() !== "production" || release.releaseEmailSentAt) return;

  const changes = await getReleaseChanges(deploymentInfo.version);
  if (changes.length === 0) {
    await prisma.deploymentRelease.update({
      where: { id: release.id },
      data: { releaseEmailError: `Aucune nouveauté documentée pour ${deploymentInfo.version}.` },
    });
    console.error(`Annonce PROD non envoyée : ajoute des nouveautés pour ${deploymentInfo.version} dans docs/release-notes.json.`);
    return;
  }

  const users = await prisma.user.findMany({
    where: { active: true, email: { not: null } },
    select: { email: true },
  });
  const recipients = [...new Set(users.map((user) => user.email?.trim()).filter((email): email is string => Boolean(email)))];
  if (recipients.length === 0) {
    await prisma.deploymentRelease.update({
      where: { id: release.id },
      data: { releaseEmailError: "Aucun utilisateur actif ne possède d’adresse e-mail." },
    });
    console.error("Annonce PROD non envoyée : aucun utilisateur actif avec une adresse e-mail.");
    return;
  }

  const retryAfter = new Date(Date.now() - 15 * 60 * 1000);
  const claim = await prisma.deploymentRelease.updateMany({
    where: {
      id: release.id,
      releaseEmailSentAt: null,
      OR: [{ releaseEmailClaimedAt: null }, { releaseEmailClaimedAt: { lt: retryAfter } }],
    },
    data: { releaseEmailClaimedAt: new Date(), releaseEmailError: null },
  });
  if (claim.count !== 1) return;

  try {
    const result = await sendReleaseAnnouncement({ recipients, version: deploymentInfo.version, changes });
    if (result !== "sent") throw new Error("Relais e-mail non configuré.");
    await prisma.deploymentRelease.update({
      where: { id: release.id },
      data: { releaseEmailSentAt: new Date(), releaseEmailClaimedAt: null, releaseEmailError: null },
    });
    console.log(`Annonce PROD ${deploymentInfo.version} envoyée à ${recipients.length} utilisateur(s).`);
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 500) : "Échec inconnu de l’envoi.";
    await prisma.deploymentRelease.update({
      where: { id: release.id },
      data: { releaseEmailClaimedAt: null, releaseEmailError: message },
    });
    console.error(`Annonce PROD ${deploymentInfo.version} non envoyée : ${message}`);
  }
}

main()
  .catch((error) => {
    console.error("Erreur pendant l’enregistrement de la version", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });