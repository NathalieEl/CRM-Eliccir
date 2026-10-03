"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";

function field(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function parseContact(formData: FormData) {
  const prenom = field(formData, "prenom");
  const nom = field(formData, "nom");
  const titre = field(formData, "titre");
  const email = field(formData, "email").toLowerCase();
  const telephone = field(formData, "telephone");
  const entreprise = field(formData, "entreprise");
  const poste = field(formData, "poste");
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
    entreprise.length > 120 ||
    poste.length > 120 ||
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
    prenom,
    nom,
    titre: titre || null,
    email: email || null,
    telephone: telephone || null,
    entreprise: entreprise || null,
    poste: poste || null,
    secteur: secteur || null,
    ville: ville || null,
    departement: departement || null,
    pays: pays || null,
    sourceAcquisition: sourceAcquisition || null,
    statut: statut || null,
    linkedin: linkedin || null,
  };
}

function hasPrismaCode(error: unknown, code: string) {
  return typeof error === "object" && error !== null && "code" in error && error.code === code;
}

export async function createContact(formData: FormData) {
  await requirePermission("crm.write");
  const contact = parseContact(formData);
  if (!contact) redirect("/contacts?error=invalid");

  try {
    await prisma.contact.create({ data: contact });
  } catch (error) {
    if (hasPrismaCode(error, "P2002")) redirect("/contacts?error=email-exists");
    throw error;
  }

  revalidatePath("/contacts");
  redirect("/contacts?notice=created");
}

export async function updateContact(formData: FormData) {
  await requirePermission("crm.write");
  const id = field(formData, "id");
  const contact = parseContact(formData);
  if (!id) redirect("/contacts?error=not-found");
  if (!contact) redirect("/contacts?error=invalid");

  try {
    await prisma.contact.update({ where: { id }, data: contact });
  } catch (error) {
    if (hasPrismaCode(error, "P2002")) redirect("/contacts?error=email-exists");
    if (hasPrismaCode(error, "P2025")) redirect("/contacts?error=not-found");
    throw error;
  }

  revalidatePath("/contacts");
  redirect("/contacts?notice=updated");
}

export async function deleteContact(formData: FormData) {
  await requirePermission("crm.write");
  const id = field(formData, "id");
  if (!id) redirect("/contacts?error=not-found");
  if (field(formData, "confirmed") !== "yes") redirect("/contacts?error=confirm-delete");

  try {
    await prisma.contact.delete({ where: { id } });
  } catch (error) {
    if (hasPrismaCode(error, "P2025")) redirect("/contacts?error=not-found");
    throw error;
  }

  revalidatePath("/contacts");
  redirect("/contacts?notice=deleted");
}