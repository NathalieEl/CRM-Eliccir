"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const categories = {
  problem: "Problèmes/Bugs",
  improvement: "Modifications/Améliorations",
} as const;

export async function submitSupportRequest(formData: FormData) {
  const user = await requirePermission("crm.read");
  const categoryKey = String(formData.get("category") ?? "");
  const details = String(formData.get("details") ?? "").trim();

  if (!Object.hasOwn(categories, categoryKey) || details.length < 1 || details.length > 10000) {
    redirect("/support?error=invalid");
  }

  const createdAt = new Date();
  const category = categories[categoryKey as keyof typeof categories];
  const displayName = user.prenom?.trim() || user.username;
  const formattedDate = new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Europe/Paris",
  }).format(createdAt);

  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      actorUsername: user.username,
      action: "support_request",
      entity: "support_request",
      details: `Utilisateur : ${displayName} (${user.username})\nDate/heure : ${formattedDate} (Europe/Paris)\nCatégorie : ${category}\n\n${details}`,
      createdAt,
    },
  });

  revalidatePath("/audit");
  redirect("/support?notice=sent");
}