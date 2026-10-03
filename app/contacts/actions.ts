"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";
import { recordAudit } from "@/lib/audit";

function field(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function selectedEntrepriseIds(formData: FormData) {
  return [...new Set(formData.getAll("entrepriseIds").filter((value): value is string => typeof value === "string").map((value) => value.trim()).filter(Boolean))];
}

function parseContact(formData: FormData) {
  const prenom = field(formData, "prenom");
  const nom = field(formData, "nom");
  const titre = field(formData, "titre");
  const email = field(formData, "email").toLowerCase();
  const telephone = field(formData, "telephone");
  const secteur = field(formData, "secteur");
  const ville = field(formData, "ville");
  const departement = field(formData, "departement");
  const pays = field(formData, "pays");
  const sourceAcquisition = field(formData, "sourceAcquisition");
  const statut = field(formData, "statut");
  const linkedinInput = field(formData, "linkedin");
  const linkedin = linkedinInput && !/^https?:\/\//i.test(linkedinInput) ? `https://${linkedinInput}` : linkedinInput;

  if (
    prenom.length < 1 ||
    prenom.length > 80 ||
    nom.length < 1 ||
    nom.length > 120 ||
    titre.length > 30 ||
    email.length > 254 ||
    (email !== "" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) ||
    telephone.length > 40 ||
    secteur.length > 80 ||
    ville.length > 80 ||
    departement.length > 20 ||
    pays.length > 80 ||
    sourceAcquisition.length > 120 ||
    statut.length > 80 ||
    linkedin.length > 254 ||
    (linkedin !== "" && !/^https?:\/\/[^\s]+$/i.test(linkedin))
  ) {
    return null;
  }

  return {
    data: {
      prenom,
      nom,
      titre: titre || null,
      email: email || null,
      telephone: telephone || null,
      secteur: secteur || null,
      ville: ville || null,
      departement: departement || null,
      pays: pays || null,
      sourceAcquisition: sourceAcquisition || null,
      statut: statut || null,
      linkedin: linkedin || null,
    },
    entrepriseIds: selectedEntrepriseIds(formData),
  };
}

function hasPrismaCode(error: unknown, code: string) {
  return typeof error === "object" && error !== null && "code" in error && error.code === code;
}

export async function createContact(formData: FormData) {
  const currentUser = await requirePermission("crm.write");
  const contact = parseContact(formData);
  if (!contact) redirect("/contacts?error=invalid");
  const availableEntreprises = await prisma.entreprise.count({ where: { id: { in: contact.entrepriseIds } } });
  if (availableEntreprises !== contact.entrepriseIds.length) redirect("/contacts?error=invalid");

  try {
    const created = await prisma.$transaction(async (transaction) => {
      const record = await transaction.contact.create({ data: contact.data });
      if (contact.entrepriseIds.length) {
        await transaction.entrepriseContact.createMany({
          data: contact.entrepriseIds.map((entrepriseId) => ({ entrepriseId, contactId: record.id })),
        });
      }
      return record;
    });
    await recordAudit({ actorId: currentUser.id, actorUsername: currentUser.username, action: "created", entity: "contact", entityId: created.id, details: `name=${[created.prenom, created.nom].filter(Boolean).join(" ")}` });
  } catch (error) {
    if (hasPrismaCode(error, "P2002")) redirect("/contacts?error=email-exists");
    throw error;
  }

  revalidatePath("/contacts");
  redirect("/contacts?notice=created");
}

export async function updateContact(formData: FormData) {
  const currentUser = await requirePermission("crm.write");
  const id = field(formData, "id");
  const contact = parseContact(formData);
  if (!id) redirect("/contacts?error=not-found");
  if (!contact) redirect("/contacts?error=invalid");
  const availableEntreprises = await prisma.entreprise.count({ where: { id: { in: contact.entrepriseIds } } });
  if (availableEntreprises !== contact.entrepriseIds.length) redirect("/contacts?error=invalid");

  try {
    const updated = await prisma.$transaction(async (transaction) => {
      const record = await transaction.contact.update({ where: { id }, data: contact.data });
      const previousLinks = await transaction.entrepriseContact.findMany({
        where: { contactId: id, entrepriseId: { in: contact.entrepriseIds } },
        select: { entrepriseId: true, poste: true },
      });
      const previousPostes = new Map(previousLinks.map((link) => [link.entrepriseId, link.poste]));
      await transaction.entrepriseContact.deleteMany({ where: { contactId: id } });
      if (contact.entrepriseIds.length) {
        await transaction.entrepriseContact.createMany({
          data: contact.entrepriseIds.map((entrepriseId) => ({ entrepriseId, contactId: id, poste: previousPostes.get(entrepriseId) ?? null })),
        });
      }
      return record;
    });
    await recordAudit({ actorId: currentUser.id, actorUsername: currentUser.username, action: "updated", entity: "contact", entityId: updated.id, details: `name=${[updated.prenom, updated.nom].filter(Boolean).join(" ")}` });
  } catch (error) {
    if (hasPrismaCode(error, "P2002")) redirect("/contacts?error=email-exists");
    if (hasPrismaCode(error, "P2025")) redirect("/contacts?error=not-found");
    throw error;
  }

  revalidatePath("/contacts");
  redirect("/contacts?notice=updated");
}

export async function deleteContact(formData: FormData) {
  const currentUser = await requirePermission("crm.write");
  const id = field(formData, "id");
  if (!id) redirect("/contacts?error=not-found");
  if (field(formData, "confirmed") !== "yes") redirect("/contacts?error=confirm-delete");

  try {
    const deleted = await prisma.contact.delete({ where: { id } });
    await recordAudit({ actorId: currentUser.id, actorUsername: currentUser.username, action: "deleted", entity: "contact", entityId: deleted.id, details: `name=${[deleted.prenom, deleted.nom].filter(Boolean).join(" ")}` });
  } catch (error) {
    if (hasPrismaCode(error, "P2025")) redirect("/contacts?error=not-found");
    throw error;
  }

  revalidatePath("/contacts");
  redirect("/contacts?notice=deleted");
}