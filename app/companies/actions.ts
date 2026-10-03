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

function parseEntreprise(formData: FormData) {
  const nom = field(formData, "nom");
  const email = field(formData, "email").toLowerCase();
  const telephone = field(formData, "telephone");
  const siteWebInput = field(formData, "siteWeb");
  const siteWeb = siteWebInput && !/^https?:\/\//i.test(siteWebInput) ? `https://${siteWebInput}` : siteWebInput;
  const secteur = field(formData, "secteur");
  const adresse = field(formData, "adresse");
  const ville = field(formData, "ville");
  const departement = field(formData, "departement");
  const pays = field(formData, "pays");

  if (
    nom.length < 2 ||
    nom.length > 160 ||
    email.length > 254 ||
    (email !== "" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) ||
    telephone.length > 40 ||
    siteWeb.length > 254 ||
    (siteWeb !== "" && !/^https?:\/\/[^\s]+$/i.test(siteWeb)) ||
    secteur.length > 80 ||
    adresse.length > 160 ||
    ville.length > 80 ||
    departement.length > 20 ||
    pays.length > 80
  ) {
    return null;
  }

  return {
    nom,
    email: email || null,
    telephone: telephone || null,
    siteWeb: siteWeb || null,
    secteur: secteur || null,
    adresse: adresse || null,
    ville: ville || null,
    departement: departement || null,
    pays: pays || null,
  };
}

function isPrismaCode(error: unknown, code: string) {
  return typeof error === "object" && error !== null && "code" in error && error.code === code;
}

function refreshCompanyPages() {
  for (const path of ["/companies", "/contacts", "/activities", "/actions", "/projects", "/search", "/"]) {
    revalidatePath(path);
  }
}

export async function createEntreprise(formData: FormData) {
  const currentUser = await requirePermission("crm.write");
  const entreprise = parseEntreprise(formData);
  if (!entreprise) redirect("/companies?error=invalid");
  const duplicate = await prisma.entreprise.findFirst({
    where: { nom: { equals: entreprise.nom, mode: "insensitive" } },
    select: { id: true },
  });
  if (duplicate) redirect("/companies?error=exists");

  try {
    const created = await prisma.entreprise.create({ data: entreprise });
    await recordAudit({ actorId: currentUser.id, actorUsername: currentUser.username, action: "created", entity: "entreprise", entityId: created.id, details: `name=${created.nom}` });
  } catch (error) {
    if (isPrismaCode(error, "P2002")) redirect("/companies?error=exists");
    throw error;
  }

  refreshCompanyPages();
  redirect("/companies?notice=created");
}

export async function updateEntreprise(formData: FormData) {
  const currentUser = await requirePermission("crm.write");
  const id = field(formData, "id");
  const entreprise = parseEntreprise(formData);
  if (!id) redirect("/companies?error=not-found");
  if (!entreprise) redirect("/companies?error=invalid");
  const duplicate = await prisma.entreprise.findFirst({
    where: { id: { not: id }, nom: { equals: entreprise.nom, mode: "insensitive" } },
    select: { id: true },
  });
  if (duplicate) redirect("/companies?error=exists");

  try {
    const updated = await prisma.entreprise.update({ where: { id }, data: entreprise });
    await recordAudit({ actorId: currentUser.id, actorUsername: currentUser.username, action: "updated", entity: "entreprise", entityId: updated.id, details: `name=${updated.nom}` });
  } catch (error) {
    if (isPrismaCode(error, "P2002")) redirect("/companies?error=exists");
    if (isPrismaCode(error, "P2025")) redirect("/companies?error=not-found");
    throw error;
  }

  refreshCompanyPages();
  redirect("/companies?notice=updated");
}

export async function deleteEntreprise(formData: FormData) {
  const currentUser = await requirePermission("crm.write");
  const id = field(formData, "id");
  if (!id) redirect("/companies?error=not-found");
  if (field(formData, "confirmed") !== "yes") redirect("/companies?error=confirm-delete");

  try {
    const deleted = await prisma.entreprise.delete({ where: { id } });
    await recordAudit({ actorId: currentUser.id, actorUsername: currentUser.username, action: "deleted", entity: "entreprise", entityId: deleted.id, details: `name=${deleted.nom}` });
  } catch (error) {
    if (isPrismaCode(error, "P2025")) redirect("/companies?error=not-found");
    throw error;
  }

  refreshCompanyPages();
  redirect("/companies?notice=deleted");
}

export async function linkContactToEntreprise(formData: FormData) {
  const currentUser = await requirePermission("crm.write");
  const entrepriseId = field(formData, "entrepriseId");
  const contactId = field(formData, "contactId");
  const poste = field(formData, "poste");
  if (!entrepriseId || !contactId || poste.length > 120) redirect("/companies?error=invalid-link");
  const [entrepriseExists, contactExists] = await Promise.all([
    prisma.entreprise.findUnique({ where: { id: entrepriseId }, select: { id: true } }),
    prisma.contact.findUnique({ where: { id: contactId }, select: { id: true } }),
  ]);
  if (!entrepriseExists || !contactExists) redirect("/companies?error=invalid-link");

  const link = await prisma.entrepriseContact.upsert({
    where: { entrepriseId_contactId: { entrepriseId, contactId } },
    update: { poste: poste || null },
    create: { entrepriseId, contactId, poste: poste || null },
    include: { entreprise: true, contact: true },
  });
  await recordAudit({ actorId: currentUser.id, actorUsername: currentUser.username, action: "linked", entity: "entreprise_contact", entityId: contactId, details: `entreprise=${link.entreprise.nom};contact=${[link.contact.prenom, link.contact.nom].filter(Boolean).join(" ")}` });

  refreshCompanyPages();
  redirect("/companies?notice=linked");
}

export async function unlinkContactFromEntreprise(formData: FormData) {
  const currentUser = await requirePermission("crm.write");
  const entrepriseId = field(formData, "entrepriseId");
  const contactId = field(formData, "contactId");
  if (!entrepriseId || !contactId || field(formData, "confirmed") !== "yes") redirect("/companies?error=confirm-unlink");

  const link = await prisma.entrepriseContact.findUnique({
    where: { entrepriseId_contactId: { entrepriseId, contactId } },
    include: { entreprise: true, contact: true },
  });
  if (link) {
    await prisma.entrepriseContact.delete({ where: { entrepriseId_contactId: { entrepriseId, contactId } } });
    await recordAudit({ actorId: currentUser.id, actorUsername: currentUser.username, action: "unlinked", entity: "entreprise_contact", entityId: contactId, details: `entreprise=${link.entreprise.nom};contact=${[link.contact.prenom, link.contact.nom].filter(Boolean).join(" ")}` });
  }

  refreshCompanyPages();
  redirect("/companies?notice=unlinked");
}
