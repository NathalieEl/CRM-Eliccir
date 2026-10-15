"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";
import { recordAudit } from "@/lib/audit";
import { deleteActivityCalendarEvents, syncActivityCalendarEvents } from "@/lib/google-calendar";
import { googleCalendarIsConfigured } from "@/lib/google-calendar";

function field(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function parseActivity(formData: FormData) {
  const titre = field(formData, "titre");
  const type = field(formData, "type");
  const canal = field(formData, "canal");
  const dureeRaw = field(formData, "dureeMinutes");
  const resultat = field(formData, "resultat");
  const prochaineAction = field(formData, "prochaineAction");
  const statut = field(formData, "statut") || "Planifiée";
  const dateRealisation = field(formData, "dateRealisation");
  const responsableId = field(formData, "responsableId");
  const contactId = field(formData, "contactId");
  const entrepriseId = field(formData, "entrepriseId");
  const contactLabel = field(formData, "legacyContact");
  const date = field(formData, "date");
  const prochaineActionDate = field(formData, "prochaineActionDate");
  const details = field(formData, "details");
  const dureeMinutes = dureeRaw ? Number(dureeRaw) : null;
  const prochaineActionDureeRaw = field(formData, "prochaineActionDureeMinutes");
  const prochaineActionDureeMinutes = prochaineActionDureeRaw ? Number(prochaineActionDureeRaw) : null;
  const calendarEnabled = googleCalendarIsConfigured();
  const pushActivityToGoogle = calendarEnabled && formData.get("pushActivityToGoogle") === "on";
  const pushNextActionToGoogle = calendarEnabled && formData.get("pushNextActionToGoogle") === "on";
  const allowedStatuses = ["Planifiée", "En cours", "Réalisée", "Annulée"];
  const validDateTime = (value: string) => !value || (!Number.isNaN(new Date(value).getTime()) && /^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(value));

  if (
    titre.length < 2 ||
    titre.length > 120 ||
    type.length < 2 ||
    type.length > 40 ||
    canal.length > 80 ||
    (dureeRaw !== "" && (!Number.isInteger(dureeMinutes) || (dureeMinutes ?? -1) < 0 || (dureeMinutes ?? 1441) > 1440)) ||
    (prochaineActionDureeRaw !== "" && (!Number.isInteger(prochaineActionDureeMinutes) || (prochaineActionDureeMinutes ?? 0) < 1 || (prochaineActionDureeMinutes ?? 1441) > 1440)) ||
    resultat.length > 10000 ||
    prochaineAction.length > 1000 ||
    !allowedStatuses.includes(statut) ||
    responsableId.length > 64 ||
    (dateRealisation && !/^\d{4}-\d{2}-\d{2}$/.test(dateRealisation)) ||
    contactId.length > 64 ||
    entrepriseId.length > 64 ||
    contactLabel.length > 120 ||
    details.length > 500 ||
    !validDateTime(date) ||
    !validDateTime(prochaineActionDate) ||
    (pushActivityToGoogle && (!date || !dureeMinutes)) ||
    (pushNextActionToGoogle && (!prochaineAction || !prochaineActionDate || !prochaineActionDureeMinutes))
  ) {
    return null;
  }

  return {
    titre,
    type,
    canal: canal || null,
    dureeMinutes,
    resultat: resultat || null,
    prochaineAction: prochaineAction || null,
    prochaineActionDate: prochaineActionDate ? new Date(prochaineActionDate) : null,
    prochaineActionDureeMinutes,
    pushActivityToGoogle,
    pushNextActionToGoogle,
    statut,
    dateRealisation: dateRealisation ? new Date(`${dateRealisation}T12:00:00.000Z`) : null,
    responsableId: responsableId || null,
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

async function validResponsible(responsableId: string | null) {
  return !responsableId || Boolean(await prisma.user.findUnique({ where: { id: responsableId }, select: { id: true } }));
}

export async function createActivity(formData: FormData) {
  const currentUser = await requirePermission("crm.write");
  const activity = parseActivity(formData);
  if (!activity) redirect("/activities?error=invalid");
  if (!(await validAssociations(activity.contactId, activity.entrepriseId))) redirect("/activities?error=invalid");
  if (!(await validResponsible(activity.responsableId))) redirect("/activities?error=invalid");

  try {
    const created = await prisma.activity.create({ data: activity });
    await recordAudit({ actorId: currentUser.id, actorUsername: currentUser.username, action: "created", entity: "activity", entityId: created.id, details: `title=${created.titre}` });
    if ((await syncActivityCalendarEvents(created.id, currentUser.id)).length > 0) redirect("/activities?notice=created&error=calendar-sync");
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
  if (!(await validResponsible(activity.responsableId))) redirect("/activities?error=invalid");

  try {
    const updated = await prisma.activity.update({ where: { id }, data: activity });
    await recordAudit({ actorId: currentUser.id, actorUsername: currentUser.username, action: "updated", entity: "activity", entityId: updated.id, details: `title=${updated.titre}` });
    if ((await syncActivityCalendarEvents(updated.id, currentUser.id)).length > 0) redirect("/activities?notice=updated&error=calendar-sync");
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

  if ((await deleteActivityCalendarEvents(id)).length > 0) redirect("/activities?error=calendar-delete");

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
