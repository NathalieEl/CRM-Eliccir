import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { verifySync } from "otplib";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { sessionCookie, sessionDuration, signSession, verifySession } from "@/lib/session-token";

export async function createSession(userId: string) {
  const token = await signSession(userId);

  const cookieStore = await cookies();
  cookieStore.set(sessionCookie, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: sessionDuration,
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(sessionCookie);
}

export async function getCurrentUser() {
  const token = (await cookies()).get(sessionCookie)?.value;
  if (!token) return null;

  try {
    const { payload } = await verifySession(token);
    if (typeof payload.userId !== "string") return null;
    return prisma.user.findUnique({ where: { id: payload.userId } });
  } catch {
    return null;
  }
}

export async function authenticate(username: string, password: string, code: string) {
  let user = await prisma.user.findUnique({ where: { username } });
  if (!user) {
    user = await provisionAdmin();
  }

  if (!user || !user.active || user.username !== username || !(await bcrypt.compare(password, user.passwordHash))) return false;
  try {
    return verifySync({ token: code.replace(/\s/g, ""), secret: user.twoFactorSecret }).valid;
  } catch {
    return false;
  }
}

async function provisionAdmin() {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;
  const twoFactorSecret = process.env.ADMIN_TOTP_SECRET;
  if (!username || !password || !twoFactorSecret) return null;

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    if (existing.role !== "admin" || !existing.active) {
      return prisma.user.update({ where: { id: existing.id }, data: { role: "admin", active: true } });
    }
    return existing;
  }

  return prisma.user.create({
    data: {
      username,
      passwordHash: await bcrypt.hash(password, 12),
      twoFactorSecret,
      role: "admin",
    },
  });
}

export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin" || !user.active) redirect("/");
  return user;
}

export { sessionCookie };
