"use server";

import bcrypt from "bcryptjs";
import { generateSecret } from "otplib";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isTwoFactorActive, requireAdmin } from "@/lib/auth";
import type { UserRole } from "@/lib/permissions";

const editableRoles: UserRole[] = ["admin", "management", "sales", "member"];

function readRole(value: FormDataEntryValue | null): UserRole {
  const role = String(value ?? "");
  return editableRoles.includes(role as UserRole) ? role as UserRole : "member";
}

export async function createUser(formData: FormData) {
  await requireAdmin();
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const role = readRole(formData.get("role"));

  if (!/^[a-zA-Z0-9._-]{3,40}$/.test(username) || password.length < 8) {
    redirect("/users?error=invalid");
  }

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) redirect("/users?error=exists");

  const twoFactorSecret = generateSecret();
  await prisma.user.create({
    data: {
      username,
      passwordHash: await bcrypt.hash(password, 12),
      twoFactorSecret,
      role,
    },
  });

  if (isTwoFactorActive()) {
    redirect(`/users?created=${encodeURIComponent(twoFactorSecret)}&username=${encodeURIComponent(username)}`);
  }
  redirect("/users?notice=created");
}

export async function deleteUser(formData: FormData) {
  const currentUser = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (formData.get("confirmed") !== "yes") redirect("/users?error=confirm-delete");
  if (id && id !== currentUser.id) await prisma.user.delete({ where: { id } });
  redirect("/users");
}

export async function updateUser(formData: FormData) {
  const currentUser = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const password = String(formData.get("password") ?? "");
  const role = readRole(formData.get("role"));
  const active = formData.get("active") === "on";

  if (!id || (password && password.length < 8)) redirect("/users?error=invalid");
  if (id === currentUser.id && (!active || role !== "admin")) redirect("/users?error=self");

  await prisma.user.update({
    where: { id },
    data: {
      role,
      active,
      ...(password ? { passwordHash: await bcrypt.hash(password, 12) } : {}),
    },
  });

  redirect("/users?notice=updated");
}

export async function resetTwoFactor(formData: FormData) {
  await requireAdmin();
  if (!isTwoFactorActive()) redirect("/users?error=2fa-inactive");
  const id = String(formData.get("id") ?? "");
  if (!id || formData.get("confirmed") !== "yes") redirect("/users?error=confirm-2fa");

  const twoFactorSecret = generateSecret();
  const user = await prisma.user.update({ where: { id }, data: { twoFactorSecret } });
  redirect(`/users?reset2fa=${encodeURIComponent(twoFactorSecret)}&username=${encodeURIComponent(user.username)}`);
}
