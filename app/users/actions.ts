"use server";

import bcrypt from "bcryptjs";
import { generateSecret } from "otplib";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function createUser(formData: FormData) {
  await requireAdmin();
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const role = formData.get("role") === "admin" ? "admin" : "member";

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

  redirect(`/users?created=${encodeURIComponent(twoFactorSecret)}&username=${encodeURIComponent(username)}`);
}

export async function deleteUser(formData: FormData) {
  const currentUser = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (id && id !== currentUser.id) await prisma.user.delete({ where: { id } });
  redirect("/users");
}

export async function updateUser(formData: FormData) {
  const currentUser = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const password = String(formData.get("password") ?? "");
  const role = formData.get("role") === "admin" ? "admin" : "member";
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
