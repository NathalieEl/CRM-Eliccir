import { jwtVerify, SignJWT } from "jose";

export const sessionCookie = "eliccir_session";
export const sessionDuration = 60 * 60 * 8;

function getAuthSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error("AUTH_SECRET must contain at least 32 characters");
  return new TextEncoder().encode(secret);
}

export async function signSession(userId: string) {
  return new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${sessionDuration}s`)
    .sign(getAuthSecret());
}

export async function verifySession(token: string) {
  return jwtVerify(token, getAuthSecret());
}
