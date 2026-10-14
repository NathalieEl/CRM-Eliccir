"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { hashPasswordSetupToken } from "@/lib/password-setup";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";

export async function completePasswordSetup(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("confirmation") ?? "");
  const tokenHash = hashPasswordSetupToken(token);

  if (!tokenHash) redirect("/set-password?error=invalid");
  if (password.length < 8 || password.length > 200 || password !== confirmation) {
    redirect(`/set-password?token=${encodeURIComponent(token)}&error=password`);
  }

  const now = new Date();
  const user = await prisma.user.findFirst({
    where: { passwordSetupTokenHash: tokenHash, passwordSetupExpiresAt: { gt: now }, mustChangePassword: true },
    select: { id: true, username: true },
  });
  if (!user) redirect("/set-password?error=expired");

  const result = await prisma.user.updateMany({
    where: { id: user.id, passwordSetupTokenHash: tokenHash, passwordSetupExpiresAt: { gt: now }, mustChangePassword: true },
    data: {
      passwordHash: await bcrypt.hash(password, 12),
      mustChangePassword: false,
      passwordSetupTokenHash: null,
      passwordSetupExpiresAt: null,
    },
  });
  if (result.count !== 1) redirect("/set-password?error=expired");

  await recordAudit({ actorId: user.id, actorUsername: user.username, action: "password_setup_completed", entity: "user", entityId: user.id, details: "password_changed_via_single_use_link" });
  redirect("/login?notice=password-set");
}