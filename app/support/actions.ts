"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { sendSupportRequestEmail } from "@/lib/support-email";

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
  const requestDetails = `Utilisateur : ${displayName} (${user.username})\nDate/heure : ${formattedDate} (Europe/Paris)\nCatégorie : ${category}\n\n${details}`;

  const request = await prisma.auditLog.create({
    data: {
      actorId: user.id,
      actorUsername: user.username,
      action: "support_request",
      entity: "support_request",
      details: `${requestDetails}\n\nÉtat e-mail : en attente`,
      createdAt,
    },
  });

  let emailStatus: "sent" | "not-configured" | "failed" = "not-configured";
  try {
    emailStatus = await sendSupportRequestEmail({
      displayName,
      username: user.username,
      formattedDate,
      category,
      details,
    });
  } catch (error) {
    emailStatus = "failed";
    console.error("Unable to send support request email", error);
  }

  const emailStatusLabel = {
    sent: "envoyé",
    "not-configured": "en attente : SMTP non configuré",
    failed: "échec de l’envoi",
  }[emailStatus];

  await prisma.auditLog.update({
    where: { id: request.id },
    data: { details: `${requestDetails}\n\nÉtat e-mail : ${emailStatusLabel}` },
  });

  revalidatePath("/audit");
  redirect(emailStatus === "sent" ? "/support?notice=sent" : "/support?notice=email-pending");
}