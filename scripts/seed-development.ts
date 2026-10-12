import { prisma } from "@/lib/prisma";

const DEV_USERS = [
  { username: "admin@development.local", prenom: "Admin", role: "admin" },
  { username: "direction@development.local", prenom: "Direction", role: "management" },
  { username: "sales@development.local", prenom: "Commercial", role: "sales" },
  { username: "member@development.local", prenom: "Membre", role: "member" },
] as const;

const LOOKUP_OPTIONS = [
  { category: "contact_title", label: "Madame", value: "madame", sortOrder: 1 },
  { category: "contact_title", label: "Monsieur", value: "monsieur", sortOrder: 2 },
  { category: "contact_title", label: "Autre", value: "autre", sortOrder: 3 },
  { category: "property_status", label: "Disponible", value: "AVAILABLE", sortOrder: 1 },
  { category: "property_status", label: "Sous offre", value: "UNDER_OFFER", sortOrder: 2 },
  { category: "property_status", label: "Vendu", value: "SOLD", sortOrder: 3 },
  { category: "transaction_type", label: "Vente", value: "SALE", sortOrder: 1 },
  { category: "transaction_type", label: "Location courte durée", value: "SHORT_TERM_RENTAL", sortOrder: 2 },
  { category: "transaction_type", label: "Location longue durée", value: "LONG_TERM_RENTAL", sortOrder: 3 },
  { category: "deal_stage", label: "Prospect", value: "PROSPECT", sortOrder: 1 },
  { category: "deal_stage", label: "Mandat signé", value: "MANDATE_SIGNED", sortOrder: 2 },
  { category: "deal_stage", label: "Offre reçue", value: "OFFER_RECEIVED", sortOrder: 3 },
];

async function clearDevelopmentData() {
  console.log("Nettoyage des données métiers de l’environnement Development…");

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
}

async function seedLookupOptions() {
  await Promise.all(
    LOOKUP_OPTIONS.map((option) =>
      prisma.lookupOption.upsert({
        where: { category_value: { category: option.category, value: option.value } },
        update: { label: option.label, sortOrder: option.sortOrder, active: true },
        create: { ...option, active: true },
      }),
    ),
  );
}

async function seedUsers() {
  return Promise.all(
    DEV_USERS.map(({ username, prenom, role }) =>
      prisma.user.upsert({
        where: { username },
        update: { prenom, role, active: true },
        create: {
          username,
          prenom,
          passwordHash: "$2a$10$dummy.hash.for.development.demo",
          twoFactorSecret: "",
          role,
          active: true,
        },
      }),
    ),
  );
}

async function seedDemoData() {
  const users = await seedUsers();
  const admin = users[0];

  const contactSeed = [
    { prenom: "Sophie", nom: "Durand", email: "sophie.dev@demo.local", telephone: "0600000001", ville: "Bordeaux", pays: "France", secteur: "Technologie", statut: "Lead qualifié" },
    { prenom: "Léa", nom: "Guerin", email: "lea.dev@demo.local", telephone: "0600000002", ville: "Angers", pays: "France", secteur: "Retail", statut: "Opportunité en cours" },
    { prenom: "Ethan", nom: "Petit", email: "ethan.dev@demo.local", telephone: "0600000003", ville: "Reims", pays: "France", secteur: "BTP", statut: "Client actif" },
    { prenom: "Camille", nom: "Dubois", email: "camille.dev@demo.local", telephone: "0600000004", ville: "Lille", pays: "France", secteur: "Éducation", statut: "Prospect" },
    { prenom: "Arthur", nom: "Garnier", email: "arthur.dev@demo.local", telephone: "0600000005", ville: "Marseille", pays: "France", secteur: "Transport", statut: "Lead qualifié" },
  ];

  const contacts = await Promise.all(
    contactSeed.map((contact) =>
      prisma.contact.create({
        data: {
          ...contact,
          titre: "M.",
          dateNaissance: new Date("1990-05-18T00:00:00.000Z"),
          languePreferee: "Français",
          sourceAcquisition: "Démo",
          profilContact: "Client",
          niveauInvestissement: "Moyen",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      }),
    ),
  );

  const entreprises = await Promise.all([
    prisma.entreprise.create({ data: { nom: "Alpha Développement", secteur: "Immobilier", ville: "Nice", pays: "France" } }),
    prisma.entreprise.create({ data: { nom: "Beta Invest", secteur: "Finance", ville: "Paris", pays: "France" } }),
    prisma.entreprise.create({ data: { nom: "Gamma Mobility", secteur: "Transport", ville: "Lyon", pays: "France" } }),
  ]);

  await Promise.all(
    contacts.map((contact, index) =>
      prisma.entrepriseContact.create({
        data: {
          contactId: contact.id,
          entrepriseId: entreprises[index % entreprises.length].id,
          poste: index % 2 === 0 ? "Responsable" : "Collaborateur",
          type: "work",
        },
      }),
    ),
  );

  const projects = await Promise.all([
    prisma.project.create({ data: { nom: "Projet Riviera", statut: "En cours", pays: "France", ville: "Nice", budget: "2 500 000 €", progression: 40 } }),
    prisma.project.create({ data: { nom: "Projet Central", statut: "En cours", pays: "France", ville: "Paris", budget: "4 000 000 €", progression: 65 } }),
    prisma.project.create({ data: { nom: "Projet Horizon", statut: "Planifié", pays: "France", ville: "Lyon", budget: "3 000 000 €", progression: 25 } }),
  ]);

  await Promise.all(
    contacts.slice(0, 3).map((contact, index) =>
      prisma.contactProject.create({
        data: {
          contactId: contact.id,
          projectId: projects[index % projects.length].id,
          interesse: true,
        },
      }),
    ),
  );

  const properties = await Promise.all([
    prisma.property.create({
      data: {
        reference: "DEV-PR-001",
        title: "Villa Riviera",
        type: "VILLA",
        status: "AVAILABLE",
        country: "Indonesia",
        province: "Bali",
        kabupaten: "Ubud",
        address: "Jl. Raya Ubud No. 12",
        bedrooms: 4,
        bathrooms: 3,
        landAreaSqm: 250,
        buildingAreaSqm: 180,
        latitude: 8.5095,
        longitude: 115.263,
        description: "Villa de démonstration pour environnement de test.",
        projectStatus: "ACTIVE",
        projectBudgetAmount: 2500000000,
        projectBudgetCurrency: "IDR",
        ownerId: contacts[0].id,
      },
    }),
    prisma.property.create({
      data: {
        reference: "DEV-PR-002",
        title: "Appartement Skyline",
        type: "APARTMENT",
        status: "UNDER_OFFER",
        country: "Indonesia",
        province: "Jakarta",
        kabupaten: "South Jakarta",
        address: "Jl. Sudirman No. 88",
        bedrooms: 2,
        bathrooms: 2,
        landAreaSqm: 80,
        buildingAreaSqm: 75,
        latitude: -6.2088,
        longitude: 106.8456,
        description: "Appartement de démonstration pour test CRM.",
        projectStatus: "ACTIVE",
        projectBudgetAmount: 1500000000,
        projectBudgetCurrency: "IDR",
        ownerId: contacts[1].id,
      },
    }),
  ]);

  await Promise.all(
    properties.map((property, index) =>
      prisma.landTitle.create({
        data: {
          propertyId: property.id,
          rightType: index === 0 ? "HAK_MILIK" : "HAK_PAKAI",
          certificateNumber: `DEV-${index + 1}-CERT`,
          holderName: contacts[index].nom,
          verifiedWithBpn: true,
          verifiedAt: new Date(),
          notes: "Titre de démonstration généré pour le test de développement.",
        },
      }),
    ),
  );

  await Promise.all([
    prisma.activity.create({
      data: {
        titre: "Appel commercial",
        type: "call",
        canal: "Téléphone",
        dureeMinutes: 45,
        statut: "Terminé",
        dateRealisation: new Date(),
        contactId: contacts[0].id,
        responsableId: admin.id,
        resultat: "Prospect qualifié et dossier transmis au service immobilier.",
      },
    }),
    prisma.activity.create({
      data: {
        titre: "Visite du bien",
        type: "visit",
        canal: "Physique",
        dureeMinutes: 90,
        statut: "Planifié",
        dateRealisation: new Date(Date.now() + 86400000),
        contactId: contacts[1].id,
        responsableId: admin.id,
        resultat: "Visite prévue pour le prochain rendez-vous.",
      },
    }),
  ]);

  await Promise.all([
    prisma.actionItem.create({
      data: {
        titre: "Suivi du dossier",
        priorite: "Haute",
        statut: "À faire",
        responsableId: admin.id,
        contactId: contacts[2].id,
        dateEcheance: new Date(Date.now() + 172800000),
        details: "Vérifier les documents et relancer le client.",
      },
    }),
    prisma.actionItem.create({
      data: {
        titre: "Relance marketing",
        priorite: "Normale",
        statut: "En cours",
        responsableId: admin.id,
        contactId: contacts[3].id,
        dateEcheance: new Date(Date.now() + 259200000),
        details: "Envoyer le dossier et planifier la semaine prochaine.",
      },
    }),
  ]);

  await prisma.auditLog.createMany({
    data: [
      {
        actorId: admin.id,
        actorUsername: admin.username,
        action: "seed",
        entity: "Development",
        entityId: "seed-development",
        details: "Données de démonstration chargées pour l’environnement de développement.",
      },
    ],
  });

  console.log("Seed Development terminé avec comptes et données de démonstration.");
}

async function main() {
  try {
    console.log("Début du seed Development");
    await clearDevelopmentData();
    await seedLookupOptions();
    await seedDemoData();
  } catch (error) {
    console.error("Erreur pendant le seed Development", error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
