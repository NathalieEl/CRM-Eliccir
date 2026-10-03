import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { generateSecret, verifySync } from "otplib";
import { prisma } from "@/lib/prisma";
import { sessionCookie, sessionDuration, signSession, verifySession } from "@/lib/session-token";
import { requirePermission } from "@/lib/permissions";

export function isTwoFactorActive() {
  return process.env.TWO_FACTOR_STATUS?.trim().toLowerCase() === "active";
}

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
  const configuredUsername = process.env.ADMIN_USERNAME?.trim();
  const user = username === configuredUsername
    ? await provisionAdmin()
    : await prisma.user.findUnique({ where: { username } });

  if (!user || !user.active || user.username !== username || !(await bcrypt.compare(password, user.passwordHash))) return false;
  if (!isTwoFactorActive()) return true;

  try {
    return verifySync({ token: code.replace(/\s/g, ""), secret: user.twoFactorSecret }).valid;
  } catch {
    return false;
  }
}

async function provisionAdmin() {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;
  const configuredTwoFactorSecret = process.env.ADMIN_TOTP_SECRET;
  if (!username || !password || (isTwoFactorActive() && !configuredTwoFactorSecret)) return null;

  const existing = await prisma.user.findUnique({ where: { username } });
  const twoFactorSecret = configuredTwoFactorSecret ?? existing?.twoFactorSecret ?? generateSecret();
  if (existing) {
    return prisma.user.update({
      where: { id: existing.id },
      data: {
        passwordHash: await bcrypt.hash(password, 12),
        twoFactorSecret,
        role: "admin",
        active: true,
      },
    });
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
  return requirePermission("users.manage");
}

export { sessionCookie };
