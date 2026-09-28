"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

function field(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function parseContact(formData: FormData) {
  const nom = field(formData, "nom");
  const email = field(formData, "email").toLowerCase();
  const telephone = field(formData, "telephone");
  const entreprise = field(formData, "entreprise");

  if (
    nom.length < 2 ||
    nom.length > 120 ||
    email.length > 254 ||
    (email !== "" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) ||
    telephone.length > 40 ||
    entreprise.length > 120
  ) {
    return null;
  }

  return {
    nom,
    email: email || null,
    telephone: telephone || null,
    entreprise: entreprise || null,
  };
}

function hasPrismaCode(error: unknown, code: string) {
  return typeof error === "object" && error !== null && "code" in error && error.code === code;
}

export async function createContact(formData: FormData) {
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