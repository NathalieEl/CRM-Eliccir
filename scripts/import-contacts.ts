import { readFile } from "node:fs/promises";
import { parse } from "csv-parse/sync";
import { prisma } from "@/lib/prisma";

type ContactRow = {
  prenom?: string;
  nom?: string;
  email?: string;
  telephone_fixe?: string;
  telephone_mobile?: string;
  entreprise?: string;
  poste?: string;
  secteur?: string;
  ville?: string;
  departement?: string;
  pays?: string;
  source_acquisition?: string;
  statut?: string;
  date_creation?: string;
  linkedin?: string;
};

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const filePath = args.find((argument) => argument !== "--apply") ?? "contacts_fictifs.csv";

function optional(value?: string) {
  const normalized = value?.trim();
  return normalized || null;
}

function createdAt(value?: string) {
  if (!value) return undefined;
  const date = new Date(`${value}T12:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

async function main() {
  const csv = await readFile(filePath, "utf8");
  const rows = parse(csv, { columns: true, skip_empty_lines: true, bom: true, trim: true }) as ContactRow[];
  const contacts = rows
    .map((row) => ({
      email: optional(row.email),
      nom: [row.prenom, row.nom].filter(Boolean).join(" ").trim(),
      telephone: optional(row.telephone_mobile) ?? optional(row.telephone_fixe),
      entreprise: optional(row.entreprise),
      poste: optional(row.poste),
      secteur: optional(row.secteur),
      ville: optional(row.ville),
      departement: optional(row.departement),
      pays: optional(row.pays),
      sourceAcquisition: optional(row.source_acquisition),
      statut: optional(row.statut),
      linkedin: optional(row.linkedin),
      createdAt: createdAt(row.date_creation),
    }))
    .filter((contact) => contact.nom && contact.email);

  console.log(`${contacts.length} contacts valides détectés dans ${filePath}.`);
  if (!apply) {
    console.log("Simulation uniquement. Ajoute --apply pour écrire dans la base configurée par DATABASE_URL.");
    return;
  }

  for (const contact of contacts) {
    const { email, createdAt: contactCreatedAt, ...data } = contact;
    await prisma.contact.upsert({
      where: { email: email as string },
      update: data,
      create: {
        ...data,
        email: email as string,
        ...(contactCreatedAt ? { createdAt: contactCreatedAt, updatedAt: contactCreatedAt } : {}),
      },
    });
  }

  console.log(`${contacts.length} contacts importés ou mis à jour.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
