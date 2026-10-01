"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";

function field(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function parseActivity(formData: FormData) {
  const titre = field(formData, "titre");
  const type = field(formData, "type");
  const contact = field(formData, "contact");
  const date = field(formData, "date");
  const details = field(formData, "details");

  if (
    titre.length < 2 ||
    titre.length > 120 ||
    type.length < 2 ||
    type.length > 40 ||
    contact.length > 120 ||
    details.length > 500 ||
    (date && !/^\d{4}-\d{2}-\d{2}$/.test(date))
  ) {
    return null;
  }

  return {
    titre,
    type,
    contact: contact || null,
    date: date ? new Date(date) : null,
    details: details || null,
  };
}

export async function createActivity(formData: FormData) {
  await requirePermission("crm.write");
  const activity = parseActivity(formData);
  if (!activity) redirect("/activities?error=invalid");

  try {
    await prisma.activity.create({ data: activity });
  } catch (error) {
    console.error(error);
    throw error;
  }

  revalidatePath("/activities");
  redirect("/activities?notice=created");
}

export async function updateActivity(formData: FormData) {
  await requirePermission("crm.write");
  const id = field(formData, "id");
  const activity = parseActivity(formData);

  if (!id) redirect("/activities?error=not-found");
  if (!activity) redirect("/activities?error=invalid");

  try {
    await prisma.activity.update({ where: { id }, data: activity });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "P2025"
    ) {
      redirect("/activities?error=not-found");
    }
    throw error;
  }

  revalidatePath("/activities");
  redirect("/activities?notice=updated");
}

export async function deleteActivity(formData: FormData) {
  await requirePermission("crm.write");
  const id = field(formData, "id");
  if (!id) redirect("/activities?error=not-found");
  if (field(formData, "confirmed") !== "yes") redirect("/activities?error=confirm-delete");

  try {
    await prisma.activity.delete({ where: { id } });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "P2025"
    ) {
      redirect("/activities?error=not-found");
    }
    throw error;
  }

  revalidatePath("/activities");
  redirect("/activities?notice=deleted");
}
