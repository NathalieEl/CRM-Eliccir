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

const firstNames = [
  "Alicia","Amélie","Arthur","Bastien","Camille","Caroline","Clara","Coralie","David","Élodie","Emma","Fabien","Florian","Gabriel","Hugo","Inès","Jérôme","Julie","Laura","Léo","Léa","Lucas","Manon","Margot","Mathieu","Nicolas","Paul","Perrine","Raphaël","Samuel","Sofia","Sophie","Théo","Valentin","Victor","Yasmine","Zoé",
  "Antoine","Alexandre","Béatrice","Cédric","Dorian","Emilie","Gaëtan","Isabelle","Jade","Kenza","Marine","Nora","Océane","Romain","Sabrina","Thomas","Ulysse","Victorine",
];

const lastNames = [
  "Martin","Bernard","Dubois","Thomas","Robert","Richard","Petit","Durand","Leroy","Moreau","Simon","Laurent","Lefebvre","Michel","Garcia","David","Bertrand","Roux","Vincent","Fournier","Morel","Girard","Andre","Lefort","Mercier","Dupont","Lambert","Bonnet","Martinez","Leclerc","Sanchez","Nguyen","Boyer","Renaud","Aubert","Guerin","Perrot","Chevalier","Faure","Perrin",
];

const cities = [
  "Paris","Lyon","Marseille","Bordeaux","Nantes","Lille","Toulouse","Nice","Montpellier","Strasbourg","Reims","Angers","Le Havre","Grenoble","Dijon","Tours","Rennes","Annecy","Saint-Étienne","Aix-en-Provence",
];

const sectors = [
  "Technologie","Immobilier","Finance","Retail","BTP","Transport","Tourisme","Santé","Éducation","Télécommunications","Industrie","Services",
];

const statuses = ["Lead qualifié","Prospect","Opportunité en cours","Client actif","Client inactif","Nouveau lead","Dossier chaud"];
const acquisitionSources = ["LinkedIn","Prospection sortante","Recommandation","Salon","Webinar","Campagne email","Site web","Appel entrant"];
const titles = ["M.","Mme","Mlle","Dr","M."];

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "contact";
}

function randomFrom<T>(items: T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

function randomDate(daysAgoMin: number, daysAgoMax: number) {
  const now = Date.now();
  const min = now - daysAgoMin * 24 * 60 * 60 * 1000;
  const max = now - daysAgoMax * 24 * 60 * 60 * 1000;
  return new Date(min + Math.random() * (max - min));
}

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

async function seedContacts() {
  const contacts = await Promise.all(
    Array.from({ length: 120 }, (_, index) => {
      const firstName = firstNames[index % firstNames.length];
      const lastName = lastNames[(index * 3 + 7) % lastNames.length];
      const city = cities[index % cities.length];
      const sector = sectors[index % sectors.length];
      const status = statuses[index % statuses.length];
      const source = acquisitionSources[index % acquisitionSources.length];
      const title = titles[index % titles.length];
      const email = `${slugify(firstName)}.${slugify(lastName)}.${index + 1}@demo.local`;

      return prisma.contact.create({
        data: {
          titre: title,
          prenom: firstName,
          nom: lastName,
          email,
          telephone: `+33 ${((index % 9) + 1)}${String(Math.floor(Math.random() * 100000000)).padStart(8, "0")}`,
          ville: city,
          pays: "France",
          secteur: sector,
          sourceAcquisition: source,
          statut: status,
          languePreferee: "Français",
          profilContact: index % 3 === 0 ? "Investisseur" : index % 3 === 1 ? "Client" : "Prospect",
          niveauInvestissement: index % 4 === 0 ? "Élevé" : index % 4 === 1 ? "Moyen" : "Débutant",
          typeInvestisseur: index % 3 === 0 ? "Institutionnel" : index % 3 === 1 ? "Professionnel" : "Particulier",
          dateNaissance: randomDate(18000, 6000),
          biographie: `Contact de démonstration ${firstName} ${lastName}, actif dans ${sector.toLowerCase()} et suivi dans le CRM de développement.`,
          linkedin: `https://linkedin.com/in/${slugify(firstName)}-${slugify(lastName)}-${index + 1}`,
          createdAt: randomDate(300, 2),
          updatedAt: randomDate(120, 1),
        },
      });
    }),
  );

  return contacts;
}

async function seedCompanies() {
  const companies = await Promise.all(
    Array.from({ length: 28 }, (_, index) =>
      prisma.entreprise.create({
        data: {
          nom: `${randomFrom(["Alpha","Beta","Gamma","Delta","Epsilon","Zeta","Nova","Aster","Crest","Blue","North","South","Urban","Helio","Quanta","Apex","Peak","Luma","Vertex","Orbit","Harbor","Summit","Meridian","Aurelia","Boreal","Cobalt","Sierra","Vita"]) } ${randomFrom(["Group","Industries","Capital","Development","Consulting","Holding","Partners","Logistics","Works","Trading","Mobility","Services"])}`,
          secteur: sectors[index % sectors.length],
          ville: cities[index % cities.length],
          pays: "France",
          email: `contact${index + 1}@demo.local`,
          siteWeb: `https://demo-${index + 1}.local`,
        },
      }),
    ),
  );

  return companies;
}

async function seedRelationships(contacts: Awaited<ReturnType<typeof seedContacts>>, companies: Awaited<ReturnType<typeof seedCompanies>>) {
  await Promise.all(
    contacts.map((contact, index) => {
      const company = companies[index % companies.length];
      if (index % 2 === 0) {
        return prisma.entrepriseContact.create({
          data: {
            contactId: contact.id,
            entrepriseId: company.id,
            poste: index % 4 === 0 ? "Directeur" : index % 4 === 1 ? "Responsable" : index % 4 === 2 ? "Chef de projet" : "Collaborateur",
            type: "work",
          },
        });
      }
      return null;
    }),
  );
}

async function seedProjects(contacts: Awaited<ReturnType<typeof seedContacts>>, companies: Awaited<ReturnType<typeof seedCompanies>>) {
  const projects = await Promise.all(
    Array.from({ length: 24 }, (_, index) =>
      prisma.project.create({
        data: {
          nom: `Projet ${randomFrom(["Riviera","Aster","Central","Horizon","Maison","Lumière","Nova","Atlas","Velora","Ciel","Prime","Mistral","Boreal","Soleil","Estuaire","Orchid","Eden","Cobalt","Atlantic","Nexus","Fjord","Terra","Velvet","Nouveau"]) } ${index + 1}`,
          pays: "France",
          ville: cities[index % cities.length],
          statut: index % 4 === 0 ? "En cours" : index % 4 === 1 ? "Planifié" : index % 4 === 2 ? "À surveiller" : "Terminé",
          budget: `${(1500000 + index * 350000).toLocaleString("fr-FR")} €`,
          progression: 10 + (index * 7) % 90,
          entrepriseId: companies[index % companies.length].id,
        },
      }),
    ),
  );

  await Promise.all(
    contacts.map((contact, index) => {
      const projectCount = index % 3 === 0 ? 2 : 1;
      return Promise.all(
        Array.from({ length: projectCount }, (_, offset) => {
          const project = projects[(index + offset) % projects.length];
          return prisma.contactProject.create({
            data: {
              contactId: contact.id,
              projectId: project.id,
              interesse: offset % 2 === 0,
            },
          });
        }),
      );
    }),
  );

  return projects;
}

async function seedProperties(contacts: Awaited<ReturnType<typeof seedContacts>>) {
  const propertyTypes = ["VILLA","APARTMENT","HOUSE","LAND","COMMERCIAL","BUILDING"] as const;
  const propertyStatuses = ["AVAILABLE","UNDER_OFFER","SOLD","RENTED","WITHDRAWN"] as const;

  const properties = await Promise.all(
    Array.from({ length: 18 }, (_, index) =>
      prisma.property.create({
        data: {
          reference: `DEV-${String(index + 1).padStart(4, "0")}`,
          title: `${randomFrom(["Villa","Maison","Appartement","Lot","Bureau","Warehouse","Residence"]).trim()} ${index + 1}`,
          type: propertyTypes[index % propertyTypes.length],
          status: propertyStatuses[index % propertyStatuses.length],
          country: "Indonesia",
          province: randomFrom(["Bali","Jakarta","Bandung","Surabaya","Yogyakarta","Medan"]),
          kabupaten: randomFrom(["Ubud","Kuta","Seminyak","South Jakarta","Bandung Barat","Bogor","Denpasar"]),
          address: `${index + 17} ${randomFrom(["Jl.","Jalan","Street"]).trim()} ${randomFrom(["Raya","Sudirman","Setiabudi","Gatot Subroto","Bali","Merdeka"])}`,
          bedrooms: 1 + (index % 5),
          bathrooms: 1 + (index % 4),
          landAreaSqm: 50 + index * 15,
          buildingAreaSqm: 45 + index * 10,
          latitude: 8.5 + index * 0.15,
          longitude: 115.2 + index * 0.12,
          description: `Bien de démonstration ${index + 1} pour tester les vues de propriétés et les filtres du CRM.`,
          projectStatus: "ACTIVE",
          projectBudgetAmount: (1000000000 + index * 250000000).toFixed(0),
          projectBudgetCurrency: "IDR",
          ownerId: contacts[index % contacts.length].id,
        },
      }),
    ),
  );

  for (const [index, property] of properties.entries()) {
    await prisma.landTitle.create({
      data: {
        propertyId: property.id,
        rightType: index % 3 === 0 ? "HAK_MILIK" : index % 3 === 1 ? "HAK_PAKAI" : "GIRIK",
        certificateNumber: `CERT-${index + 1}`,
        holderName: contacts[index % contacts.length].nom,
        verifiedWithBpn: index % 2 === 0,
        verifiedAt: randomDate(120, 10),
        expiryDate: randomDate(450, 120),
        notes: "Titre de démonstration pour environnement de développement.",
      },
    });
  }

  return properties;
}

async function seedActivities(contacts: Awaited<ReturnType<typeof seedContacts>>, companies: Awaited<ReturnType<typeof seedCompanies>>, users: Awaited<ReturnType<typeof seedUsers>>) {
  const types = ["call","meeting","visit","email","followup"];
  const canaux = ["Téléphone","Email","Visite","Réseau","WhatsApp"];
  const statuses = ["Terminé","Planifié","À faire","En retard"];

  await Promise.all(
    Array.from({ length: 80 }, (_, index) => {
      const contact = contacts[index % contacts.length];
      const user = users[index % users.length];
      const company = companies[index % companies.length];
      const date = randomDate(120, 2);

      return prisma.activity.create({
        data: {
          titre: `${randomFrom(["Appel","Suivi","Visite","Réunion","Relance","Prospection"]).trim()} ${index + 1}`,
          type: types[index % types.length],
          canal: canaux[index % canaux.length],
          dureeMinutes: 20 + (index % 6) * 15,
          resultat: `Résultat de démonstration ${index + 1}.`,
          prochaineAction: `Action de suivi ${index + 1} prévue lors du prochain rendez-vous.`,
          statut: statuses[index % statuses.length],
          dateRealisation: date,
          contactId: contact.id,
          entrepriseId: company.id,
          responsableId: user.id,
          createdAt: date,
          updatedAt: date,
        },
      });
    }),
  );
}

async function seedActions(contacts: Awaited<ReturnType<typeof seedContacts>>, companies: Awaited<ReturnType<typeof seedCompanies>>, users: Awaited<ReturnType<typeof seedUsers>>) {
  const priorities = ["Haute","Normale","Basse"];
  const statuses = ["À faire","En cours","Terminé"];

  await Promise.all(
    Array.from({ length: 110 }, (_, index) => {
      const contact = contacts[index % contacts.length];
      const user = users[index % users.length];
      const company = companies[index % companies.length];
      const date = randomDate(150, 3);

      return prisma.actionItem.create({
        data: {
          titre: `${randomFrom(["Relance client","Préparer dossier","Vérifier documents","Confirmer visite","Réseau","Suivi commercial"]).trim()} ${index + 1}`,
          priorite: priorities[index % priorities.length],
          statut: statuses[index % statuses.length],
          canal: randomFrom(["Téléphone","Email","Visite","Réunion"]),
          dateRealisation: date,
          dateEcheance: new Date(date.getTime() + 1000 * 60 * 60 * 24 * (10 + (index % 20))),
          contactId: contact.id,
          entrepriseId: company.id,
          responsableId: user.id,
          details: `Action de démonstration ${index + 1} pour tester le workflow CRM.`,
          createdAt: date,
          updatedAt: date,
        },
      });
    }),
  );
}

async function seedMandatesAndDeals(properties: Awaited<ReturnType<typeof seedProperties>>, contacts: Awaited<ReturnType<typeof seedContacts>>) {
  for (let index = 0; index < 12; index += 1) {
    const property = properties[index % properties.length];
    const client = contacts[(index * 3) % contacts.length];
    const mandate = await prisma.mandate.create({
      data: {
        propertyId: property.id,
        transactionType: index % 3 === 0 ? "SALE" : index % 3 === 1 ? "SHORT_TERM_RENTAL" : "LONG_TERM_RENTAL",
        mandateType: index % 2 === 0 ? "EXCLUSIVE" : "SIMPLE",
        startDate: randomDate(180, 20),
        endDate: randomDate(100, 20),
        isActive: index % 2 === 0,
        askingPrice: 100000000 + index * 2500000,
        currency: "IDR",
        priceUnit: index % 2 === 0 ? "TOTAL" : "PER_SQM",
        notes: `Mandat de démonstration ${index + 1}.`,
      },
    });

    await prisma.deal.create({
      data: {
        propertyId: property.id,
        mandateId: mandate.id,
        clientId: client.id,
        transactionType: mandate.transactionType,
        stage: index % 4 === 0 ? "PROSPECT" : index % 4 === 1 ? "MANDATE_SIGNED" : index % 4 === 2 ? "OFFER_RECEIVED" : "CLOSED",
        negotiatedPrice: 90000000 + index * 4000000,
        currency: "IDR",
        expectedClosingDate: randomDate(40, 5),
        notes: `Deal de démonstration ${index + 1}.`,
      },
    });
  }

  for (let index = 0; index < 10; index += 1) {
    const property = properties[index % properties.length];
    const contact = contacts[(index * 5) % contacts.length];
    await prisma.viewing.create({
      data: {
        propertyId: property.id,
        contactId: contact.id,
        scheduledAt: randomDate(25, 2),
        feedback: `Feedback de visite de démonstration ${index + 1}.`,
        interestLevel: 1 + (index % 5),
      },
    });
  }
}

async function seedAuditLogs(users: Awaited<ReturnType<typeof seedUsers>>) {
  const admin = users[0];

  await prisma.auditLog.createMany({
    data: Array.from({ length: 30 }, (_, index) => ({
      actorId: admin.id,
      actorUsername: admin.username,
      action: index % 3 === 0 ? "create" : index % 3 === 1 ? "update" : "delete",
      entity: index % 2 === 0 ? "Contact" : "Project",
      entityId: `demo-${index + 1}`,
      details: `Événement de démonstration ${index + 1}.`,
      createdAt: randomDate(200, 1),
    })),
  });
}

async function seedDemoData() {
  const users = await seedUsers();
  const contacts = await seedContacts();
  const companies = await seedCompanies();
  await seedRelationships(contacts, companies);
  const projects = await seedProjects(contacts, companies);
  const properties = await seedProperties(contacts);
  await seedActivities(contacts, companies, users);
  await seedActions(contacts, companies, users);
  await seedMandatesAndDeals(properties, contacts);
  await seedAuditLogs(users);

  const admin = users[0];
  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      actorUsername: admin.username,
      action: "seed",
      entity: "Development",
      entityId: "seed-development",
      details: `Données de démonstration complètes chargées pour ${projects.length} projets, ${contacts.length} contacts, ${properties.length} biens et plus de 150 activités/actions.`,
      createdAt: new Date(),
    },
  });

  console.log(`Seed Development terminé : ${contacts.length} contacts, ${companies.length} entreprises, ${projects.length} projets, ${properties.length} biens, activés.`);
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
