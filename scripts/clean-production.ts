import { prisma } from "@/lib/prisma";

async function confirmSanity() {
  const env = process.env.NODE_ENV;
  const allowClean = process.env.ALLOW_CLEAN_PRODUCTION === "true";

  if (env !== "production") {
    throw new Error("Ce script ne doit être exécuté qu’en environnement de production.");
  }

  if (!allowClean) {
    throw new Error("Définis ALLOW_CLEAN_PRODUCTION=true pour autoriser la purge de Production.");
  }

  const userCount = await prisma.user.count();
  if (userCount === 0) {
    throw new Error("Aucun utilisateur trouvé. La purge ne doit pas supprimer la base sans comptes existants.");
  }

  console.log(`Préservation de ${userCount} utilisateur(s) avant purge des données métier.`);
}

async function cleanProductionData() {
  console.log("Purge des données métier de Production…");

  await prisma.auditLog.deleteMany();
  await prisma.contactNote.deleteMany();
  await prisma.propertyDocument.deleteMany();
  await prisma.transactionCost.deleteMany();
  await prisma.offer.deleteMany();
  await prisma.deal.deleteMany();
  await prisma.viewing.deleteMany();
  await prisma.mandate.deleteMany();
  await prisma.landTitle.deleteMany();
  await prisma.property.deleteMany();
  await prisma.project.deleteMany();
  await prisma.contactProject.deleteMany();
  await prisma.entrepriseContact.deleteMany();
  await prisma.entreprise.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.actionItem.deleteMany();
  await prisma.contactRelation.deleteMany();
  await prisma.contactUserDefined.deleteMany();
  await prisma.contactInterest.deleteMany();
  await prisma.contactSkill.deleteMany();
  await prisma.contactGroupMembership.deleteMany();
  await prisma.contactGroup.deleteMany();
  await prisma.contactImClient.deleteMany();
  await prisma.contactUrl.deleteMany();
  await prisma.contactEmail.deleteMany();
  await prisma.contactPhone.deleteMany();
  await prisma.contactAddress.deleteMany();
  await prisma.contactEvent.deleteMany();
  await prisma.contactNickname.deleteMany();
  await prisma.contact.deleteMany();

  console.log("Purge Production achevée. Les utilisateurs et les options de configuration sont conservés.");
}

async function main() {
  try {
    await confirmSanity();
    await cleanProductionData();
  } catch (error) {
    console.error("Erreur pendant le nettoyage de Production", error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
