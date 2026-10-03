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

function parseActivity(formData: FormData) {
  const titre = field(formData, "titre");
  const type = field(formData, "type");
  const contactId = field(formData, "contactId");
  const entrepriseId = field(formData, "entrepriseId");
  const contactLabel = field(formData, "legacyContact");
  const date = field(formData, "date");
  const details = field(formData, "details");

  if (
    titre.length < 2 ||
    titre.length > 120 ||
    type.length < 2 ||
    type.length > 40 ||
    contactId.length > 64 ||
    entrepriseId.length > 64 ||
    contactLabel.length > 120 ||
    details.length > 500 ||
    (date && !/^\d{4}-\d{2}-\d{2}$/.test(date))
  ) {
    return null;
  }

  return {
    titre,
    type,
    contactId: contactId || null,
    entrepriseId: entrepriseId || null,
    contactLabel: contactId ? null : contactLabel || null,
    date: date ? new Date(date) : null,
    details: details || null,
  };
}

async function validAssociations(contactId: string | null, entrepriseId: string | null) {
  if (contactId && !(await prisma.contact.findUnique({ where: { id: contactId }, select: { id: true } }))) return false;
  if (entrepriseId && !(await prisma.entreprise.findUnique({ where: { id: entrepriseId }, select: { id: true } }))) return false;
  if (contactId && entrepriseId && !(await prisma.entrepriseContact.findUnique({ where: { entrepriseId_contactId: { entrepriseId, contactId } }, select: { contactId: true } }))) return false;
  return true;
}

export async function createActivity(formData: FormData) {
  const currentUser = await requirePermission("crm.write");
  const activity = parseActivity(formData);
  if (!activity) redirect("/activities?error=invalid");
  if (!(await validAssociations(activity.contactId, activity.entrepriseId))) redirect("/activities?error=invalid");

  try {
    const created = await prisma.activity.create({ data: activity });
    await recordAudit({ actorId: currentUser.id, actorUsername: currentUser.username, action: "created", entity: "activity", entityId: created.id, details: `title=${created.titre}` });
  } catch (error) {
    console.error(error);
    throw error;
  }

  revalidatePath("/activities");
  redirect("/activities?notice=created");
}

export async function updateActivity(formData: FormData) {
  const currentUser = await requirePermission("crm.write");
  const id = field(formData, "id");
  const activity = parseActivity(formData);

  if (!id) redirect("/activities?error=not-found");
  if (!activity) redirect("/activities?error=invalid");
  if (!(await validAssociations(activity.contactId, activity.entrepriseId))) redirect("/activities?error=invalid");

  try {
    const updated = await prisma.activity.update({ where: { id }, data: activity });
    await recordAudit({ actorId: currentUser.id, actorUsername: currentUser.username, action: "updated", entity: "activity", entityId: updated.id, details: `title=${updated.titre}` });
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
  const currentUser = await requirePermission("crm.write");
  const id = field(formData, "id");
  if (!id) redirect("/activities?error=not-found");
  if (field(formData, "confirmed") !== "yes") redirect("/activities?error=confirm-delete");

  try {
    const deleted = await prisma.activity.delete({ where: { id } });
    await recordAudit({ actorId: currentUser.id, actorUsername: currentUser.username, action: "deleted", entity: "activity", entityId: deleted.id, details: `title=${deleted.titre}` });
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
