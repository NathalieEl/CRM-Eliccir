"use server";

import { redirect } from "next/navigation";
import { authenticate, clearSession, createSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function login(formData: FormData) {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const code = String(formData.get("code") ?? "");

  if (!username || !password || !/^\d{6}$/.test(code.replace(/\s/g, ""))) {
    redirect("/login?error=invalid");
  }

  let valid = false;
  try {
    valid = await authenticate(username, password, code);
  } catch {
    redirect("/login?error=unavailable");
  }

  if (!valid) redirect("/login?error=invalid");
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) redirect("/login?error=invalid");
  await createSession(user.id);

  redirect("/");
}

export async function logout() {
  await clearSession();
  redirect("/login");
}
