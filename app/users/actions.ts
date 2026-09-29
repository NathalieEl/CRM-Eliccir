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
