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

function parseAction(formData: FormData) {
  const titre = field(formData, "titre");
  const priorite = field(formData, "priorite") || "Normale";
  const statut = field(formData, "statut") || "À faire";
  const contactId = field(formData, "contactId");
  const entrepriseId = field(formData, "entrepriseId");
  const contactLabel = field(formData, "legacyContact");
  const dateEcheance = field(formData, "dateEcheance");
  const details = field(formData, "details");

  if (
    titre.length < 2 ||
    titre.length > 160 ||
    priorite.length > 40 ||
    statut.length > 40 ||
    contactId.length > 64 ||
    entrepriseId.length > 64 ||
    contactLabel.length > 120 ||
    details.length > 500 ||
    (dateEcheance && !/^\d{4}-\d{2}-\d{2}$/.test(dateEcheance))
  ) {
    return null;
  }

  return {
    titre,
    priorite,
    statut,
    contactId: contactId || null,
    entrepriseId: entrepriseId || null,
    contactLabel: contactId ? null : contactLabel || null,
    dateEcheance: dateEcheance ? new Date(dateEcheance) : null,
    details: details || null,
  };
}

async function validAssociations(contactId: string | null, entrepriseId: string | null) {
  if (contactId && !(await prisma.contact.findUnique({ where: { id: contactId }, select: { id: true } }))) return false;
  if (entrepriseId && !(await prisma.entreprise.findUnique({ where: { id: entrepriseId }, select: { id: true } }))) return false;
  if (contactId && entrepriseId && !(await prisma.entrepriseContact.findUnique({ where: { entrepriseId_contactId: { entrepriseId, contactId } }, select: { contactId: true } }))) return false;
  return true;
}

export async function createAction(formData: FormData) {
  const currentUser = await requirePermission("crm.write");
  const action = parseAction(formData);
  if (!action) redirect("/actions?error=invalid");
  if (!(await validAssociations(action.contactId, action.entrepriseId))) redirect("/actions?error=invalid");

  try {
    const created = await prisma.actionItem.create({ data: action });
    await recordAudit({ actorId: currentUser.id, actorUsername: currentUser.username, action: "created", entity: "action", entityId: created.id, details: `title=${created.titre}` });
  } catch (error) {
    console.error(error);
    throw error;
  }

  revalidatePath("/actions");
  redirect("/actions?notice=created");
}

export async function updateAction(formData: FormData) {
  const currentUser = await requirePermission("crm.write");
  const id = field(formData, "id");
  const action = parseAction(formData);

  if (!id) redirect("/actions?error=not-found");
  if (!action) redirect("/actions?error=invalid");
  if (!(await validAssociations(action.contactId, action.entrepriseId))) redirect("/actions?error=invalid");

  try {
    const updated = await prisma.actionItem.update({ where: { id }, data: action });
    await recordAudit({ actorId: currentUser.id, actorUsername: currentUser.username, action: "updated", entity: "action", entityId: updated.id, details: `title=${updated.titre}` });
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
  const currentUser = await requirePermission("crm.write");
  const id = field(formData, "id");
  if (!id) redirect("/actions?error=not-found");
  if (field(formData, "confirmed") !== "yes") redirect("/actions?error=confirm-delete");

  try {
    const deleted = await prisma.actionItem.delete({ where: { id } });
    await recordAudit({ actorId: currentUser.id, actorUsername: currentUser.username, action: "deleted", entity: "action", entityId: deleted.id, details: `title=${deleted.titre}` });
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
