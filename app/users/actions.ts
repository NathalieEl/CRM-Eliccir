"use server";

import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { generateSecret } from "otplib";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { findUserByUsername, isTwoFactorActive, requireAdmin, usernamesMatch } from "@/lib/auth";
import type { UserRole } from "@/lib/permissions";
import { recordAudit } from "@/lib/audit";
import { createPasswordSetupToken, getPasswordSetupUrl } from "@/lib/password-setup";
import { sendPasswordSetupEmail } from "@/lib/support-email";

const editableRoles: UserRole[] = ["admin", "management", "sales", "member"];

function readRole(value: FormDataEntryValue | null): UserRole {
  const role = String(value ?? "");
  return editableRoles.includes(role as UserRole) ? role as UserRole : "member";
}

async function issuePasswordSetupLink(userId: string, actor: { id: string; username: string }) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (usernamesMatch(user?.username, process.env.ADMIN_USERNAME)) return "admin-managed" as const;
  if (!user?.email) return "email-missing" as const;

  const { token, tokenHash, expiresAt } = createPasswordSetupToken();
  const setupUrl = getPasswordSetupUrl(token);
  if (!setupUrl) return "email-not-configured" as const;

  await prisma.user.update({
    where: { id: userId },
    data: {
      mustChangePassword: true,
      passwordSetupTokenHash: tokenHash,
      passwordSetupExpiresAt: expiresAt,
      sessionVersion: { increment: 1 },
    },
  });

  try {
    const delivery = await sendPasswordSetupEmail({
      email: user.email,
      displayName: [user.prenom, user.nom].filter(Boolean).join(" ") || user.username,
      username: user.username,
      setupUrl,
    });
    if (delivery === "not-configured") throw new Error("Mail relay not configured");
  } catch {
    await prisma.user.update({
      where: { id: userId },
      data: {
        mustChangePassword: user.mustChangePassword,
        passwordSetupTokenHash: user.passwordSetupTokenHash,
        passwordSetupExpiresAt: user.passwordSetupExpiresAt,
        sessionVersion: user.sessionVersion,
      },
    });
    return "email-failed" as const;
  }

  await recordAudit({ actorId: actor.id, actorUsername: actor.username, action: "password_setup_sent", entity: "user", entityId: user.id, details: `username=${user.username}` });
  return "sent" as const;
}

export async function createUser(formData: FormData) {
  const currentUser = await requireAdmin();
  const username = String(formData.get("username") ?? "").trim();
  const prenom = String(formData.get("prenom") ?? "").trim();
  const nom = String(formData.get("nom") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = readRole(formData.get("role"));

  if (!/^[a-zA-Z0-9._-]{3,40}$/.test(username) || prenom.length < 1 || prenom.length > 80 || nom.length < 1 || nom.length > 120 || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    redirect("/users?error=invalid");
  }

  const existing = await findUserByUsername(username);
  if (existing) redirect("/users?error=exists");

  const twoFactorSecret = generateSecret();
  const user = await prisma.user.create({
    data: {
      username,
      prenom,
      nom,
      email,
      passwordHash: await bcrypt.hash(randomBytes(48).toString("base64url"), 12),
      mustChangePassword: true,
      twoFactorSecret,
      role,
    },
  });

  await recordAudit({
    actorId: currentUser.id,
    actorUsername: currentUser.username,
    action: "created",
    entity: "user",
    entityId: user.id,
    details: `username=${user.username};role=${user.role}`,
  });

  const setupDelivery = await issuePasswordSetupLink(user.id, currentUser);
  if (setupDelivery !== "sent") redirect(`/users?notice=setup-pending&username=${encodeURIComponent(username)}`);

  if (isTwoFactorActive()) {
    redirect(`/users?created=${encodeURIComponent(twoFactorSecret)}&username=${encodeURIComponent(username)}&notice=setup-sent`);
  }
  redirect(`/users?notice=setup-sent&username=${encodeURIComponent(username)}`);
}

export async function sendUserPasswordSetupLink(formData: FormData) {
  const currentUser = await requireAdmin();
  const userId = String(formData.get("id") ?? "");
  if (!userId) redirect("/users?error=invalid");
  const result = await issuePasswordSetupLink(userId, currentUser);
  if (result === "admin-managed") redirect("/users?error=admin-password-managed");
  if (result === "email-missing") redirect("/users?error=email-required");
  if (result !== "sent") redirect("/users?error=setup-email-failed");
  redirect("/users?notice=setup-sent");
}

export async function deleteUser(formData: FormData) {
  const currentUser = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (formData.get("confirmed") !== "yes") redirect("/users?error=confirm-delete");
  if (id && id !== currentUser.id) {
    const user = await prisma.user.findUnique({ where: { id } });
    await prisma.user.delete({ where: { id } });
    if (user) {
      await recordAudit({
        actorId: currentUser.id,
        actorUsername: currentUser.username,
        action: "deleted",
        entity: "user",
        entityId: user.id,
        details: `username=${user.username}`,
      });
    }
  }
  redirect("/users");
}

export async function updateUser(formData: FormData) {
  const currentUser = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const prenom = String(formData.get("prenom") ?? "").trim();
  const nom = String(formData.get("nom") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = readRole(formData.get("role"));
  const active = formData.get("active") === "on";

  if (!id || prenom.length > 80 || nom.length > 120 || email.length > 254 || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) redirect("/users?error=invalid");
  if (id === currentUser.id && (!active || role !== "admin")) redirect("/users?error=self");

  await prisma.user.update({
    where: { id },
    data: {
      prenom: prenom || null,
      nom: nom || null,
      email: email || null,
      role,
      active,
    },
  });

  await recordAudit({
    actorId: currentUser.id,
    actorUsername: currentUser.username,
    action: "updated",
    entity: "user",
    entityId: id,
    details: `prenom=${prenom};role=${role};active=${active}`,
  });

  redirect("/users?notice=updated");
}

export async function resetTwoFactor(formData: FormData) {
  const currentUser = await requireAdmin();
  if (!isTwoFactorActive()) redirect("/users?error=2fa-inactive");
  const id = String(formData.get("id") ?? "");
  if (!id || formData.get("confirmed") !== "yes") redirect("/users?error=confirm-2fa");

  const twoFactorSecret = generateSecret();
  const user = await prisma.user.update({ where: { id }, data: { twoFactorSecret } });
  await recordAudit({
    actorId: currentUser.id,
    actorUsername: currentUser.username,
    action: "reset_2fa",
    entity: "user",
    entityId: user.id,
    details: `username=${user.username}`,
  });
  redirect(`/users?reset2fa=${encodeURIComponent(twoFactorSecret)}&username=${encodeURIComponent(user.username)}`);
}
