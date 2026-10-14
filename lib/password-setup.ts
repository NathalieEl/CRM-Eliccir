import "server-only";

import { createHash, randomBytes } from "node:crypto";

export const passwordSetupValidityMs = 24 * 60 * 60 * 1000;

export function createPasswordSetupToken() {
  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + passwordSetupValidityMs);
  return { token, tokenHash, expiresAt };
}

export function hashPasswordSetupToken(token: string) {
  if (!/^[A-Za-z0-9_-]{40,50}$/.test(token)) return null;
  return createHash("sha256").update(token).digest("hex");
}

export function getPasswordSetupUrl(token: string) {
  const configuredBaseUrl = process.env.APP_BASE_URL?.trim();
  const railwayPublicDomain = process.env.RAILWAY_PUBLIC_DOMAIN?.trim();
  const baseUrl = configuredBaseUrl || (railwayPublicDomain ? `https://${railwayPublicDomain}` : null);
  if (!baseUrl) return null;

  try {
    const url = new URL(baseUrl);
    if (url.protocol !== "https:" && process.env.NODE_ENV === "production") return null;
    url.pathname = "/set-password";
    url.search = new URLSearchParams({ token }).toString();
    return url.toString();
  } catch {
    return null;
  }
}