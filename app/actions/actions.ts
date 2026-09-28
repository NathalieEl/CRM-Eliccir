"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

function field(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function parseAction(formData: FormData) {
  const titre = field(formData, "titre");
  const priorite = field(formData, "priorite") || "Normale";
  const statut = field(formData, "statut") || "À faire";
  const contact = field(formData, "contact");
  const dateEcheance = field(formData, "dateEcheance");
  const details = field(formData, "details");

  if (
    titre.length < 2 ||
    titre.length > 160 ||
    priorite.length > 40 ||
    statut.length > 40 ||
    contact.length > 120 ||
    details.length > 500 ||
    (dateEcheance && !/^\d{4}-\d{2}-\d{2}$/.test(dateEcheance))
  ) {
    return null;
  }

  return {
    titre,
    priorite,
    statut,
    contact: contact || null,
    dateEcheance: dateEcheance ? new Date(dateEcheance) : null,
    details: details || null,
  };
}

export async function createAction(formData: FormData) {
  const action = parseAction(formData);
  if (!action) redirect("/actions?error=invalid");

  try {
    await prisma.actionItem.create({ data: action });
  } catch (error) {
    console.error(error);
    throw error;
  }

  revalidatePath("/actions");
  redirect("/actions?notice=created");
}

export async function updateAction(formData: FormData) {
  const id = field(formData, "id");
  const action = parseAction(formData);

  if (!id) redirect("/actions?error=not-found");
  if (!action) redirect("/actions?error=invalid");

  try {
    await prisma.actionItem.update({ where: { id }, data: action });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "P2025"
    ) {
      redirect("/actions?error=not-found");
    }
    throw error;
  }

  revalidatePath("/actions");
  redirect("/actions?notice=updated");
}

export async function deleteAction(formData: FormData) {
  const id = field(formData, "id");
  if (!id) redirect("/actions?error=not-found");
  if (field(formData, "confirmed") !== "yes") redirect("/actions?error=confirm-delete");

  try {
    await prisma.actionItem.delete({ where: { id } });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "P2025"
    ) {
      redirect("/actions?error=not-found");
    }
    throw error;
  }

  revalidatePath("/actions");
  redirect("/actions?notice=deleted");
}
