import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { generateSecret, verifySync } from "otplib";
import { prisma } from "@/lib/prisma";
import { sessionCookie, sessionDuration, signSession, verifySession } from "@/lib/session-token";
import { requirePermission } from "@/lib/permissions";

export function isTwoFactorActive() {
  return process.env.TWO_FACTOR_STATUS?.trim().toLowerCase() === "active";
}

export function usernamesMatch(first: string | null | undefined, second: string | null | undefined) {
  const normalizedFirst = first?.trim().toLowerCase();
  return Boolean(normalizedFirst && normalizedFirst === second?.trim().toLowerCase());
}

export async function findUserByUsername(username: string) {
  return prisma.user.findFirst({
    where: { username: { equals: username.trim(), mode: "insensitive" } },
  });
}

export async function createSession(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { sessionVersion: true } });
  if (!user) throw new Error("Unable to create a session for a missing user");
  const token = await signSession(userId, user.sessionVersion);

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
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) return null;
    const tokenVersion = typeof payload.sessionVersion === "number" ? payload.sessionVersion : 0;
    return tokenVersion === user.sessionVersion ? user : null;
  } catch {
    return null;
  }
}

export async function authenticate(username: string, password: string, code: string) {
  const configuredUsername = process.env.ADMIN_USERNAME?.trim();
  const user = usernamesMatch(username, configuredUsername)
    ? await provisionAdmin()
    : await findUserByUsername(username);

  if (!user || !user.active || user.mustChangePassword || !usernamesMatch(user.username, username) || !(await bcrypt.compare(password, user.passwordHash))) return false;
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
  const configuredFirstName = process.env.ADMIN_FIRST_NAME?.trim();
  if (!username || !password || (isTwoFactorActive() && !configuredTwoFactorSecret)) return null;

  const existing = await findUserByUsername(username);
  const twoFactorSecret = configuredTwoFactorSecret ?? existing?.twoFactorSecret ?? generateSecret();
  if (existing) {
    return prisma.user.update({
      where: { id: existing.id },
      data: {
        passwordHash: await bcrypt.hash(password, 12),
        prenom: configuredFirstName || existing.prenom,
        mustChangePassword: false,
        passwordSetupTokenHash: null,
        passwordSetupExpiresAt: null,
        twoFactorSecret,
        role: "admin",
        active: true,
      },
    });
  }

  return prisma.user.create({
    data: {
      username,
      prenom: configuredFirstName || null,
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
