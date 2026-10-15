import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";

const googleTokenUrl = "https://oauth2.googleapis.com/token";
const googleCalendarApi = "https://www.googleapis.com/calendar/v3/calendars/primary/events";

type GoogleTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
};

type GoogleCalendarEvent = {
  id: string;
  htmlLink?: string;
};

type CalendarEventInput = {
  title: string;
  description: string;
  start: Date;
  durationMinutes: number;
};

export function googleCalendarIsConfigured() {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_TOKEN_ENCRYPTION_KEY,
  );
}

export function googleCalendarRedirectUri(origin: string) {
  return process.env.GOOGLE_CALENDAR_REDIRECT_URI?.trim() || new URL("/api/google-calendar/callback", origin).toString();
}

export function googleCalendarAuthorizationUrl(redirectUri: string, state: string) {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: requiredEnvironment("GOOGLE_CLIENT_ID"),
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email https://www.googleapis.com/auth/calendar.events",
    access_type: "offline",
    prompt: "consent",
    state,
  }).toString();
  return url;
}

function requiredEnvironment(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

function encryptionKey() {
  const value = requiredEnvironment("GOOGLE_TOKEN_ENCRYPTION_KEY");
  const key = Buffer.from(value, "base64");
  if (key.length !== 32) throw new Error("GOOGLE_TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key");
  return key;
}

function encryptRefreshToken(token: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString("base64url")).join(".");
}

function decryptRefreshToken(value: string) {
  const [iv, authTag, encrypted] = value.split(".").map((part) => Buffer.from(part, "base64url"));
  if (!iv || !authTag || !encrypted) throw new Error("Stored Google refresh token is invalid");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

async function tokenRequest(parameters: URLSearchParams) {
  const response = await fetch(googleTokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: parameters,
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Google authorization failed");
  return response.json() as Promise<GoogleTokenResponse>;
}

export async function saveGoogleCalendarConnection(userId: string, code: string, redirectUri: string) {
  const tokens = await tokenRequest(new URLSearchParams({
    code,
    client_id: requiredEnvironment("GOOGLE_CLIENT_ID"),
    client_secret: requiredEnvironment("GOOGLE_CLIENT_SECRET"),
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  }));

  const previous = await prisma.googleCalendarConnection.findUnique({ where: { userId } });
  const refreshToken = tokens.refresh_token ?? (previous ? decryptRefreshToken(previous.encryptedRefreshToken) : null);
  if (!refreshToken) throw new Error("Google did not return a refresh token");

  const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
    cache: "no-store",
  });
  const profile = profileResponse.ok ? await profileResponse.json() as { email?: string } : {};

  await prisma.googleCalendarConnection.upsert({
    where: { userId },
    create: { userId, googleEmail: profile.email ?? null, encryptedRefreshToken: encryptRefreshToken(refreshToken) },
    update: { googleEmail: profile.email ?? null, encryptedRefreshToken: encryptRefreshToken(refreshToken) },
  });
}

async function getGoogleAccessToken(userId: string) {
  const connection = await prisma.googleCalendarConnection.findUnique({ where: { userId } });
  if (!connection) throw new Error("Google Calendar is not connected for the assigned user");

  const refreshToken = decryptRefreshToken(connection.encryptedRefreshToken);
  const tokens = await tokenRequest(new URLSearchParams({
    client_id: requiredEnvironment("GOOGLE_CLIENT_ID"),
    client_secret: requiredEnvironment("GOOGLE_CLIENT_SECRET"),
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  }));
  if (!tokens.access_token) throw new Error("Google did not return an access token");

  if (tokens.refresh_token) {
    await prisma.googleCalendarConnection.update({
      where: { userId },
      data: { encryptedRefreshToken: encryptRefreshToken(tokens.refresh_token) },
    });
  }
  return tokens.access_token;
}

async function calendarRequest<T>(userId: string, method: string, eventId?: string, body?: object) {
  const accessToken = await getGoogleAccessToken(userId);
  const url = eventId ? `${googleCalendarApi}/${encodeURIComponent(eventId)}` : googleCalendarApi;
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    cache: "no-store",
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Google Calendar could not apply the event change");
  if (method === "DELETE") return null;
  return response.json() as Promise<T>;
}

async function upsertCalendarEvent(userId: string, eventId: string | null, input: CalendarEventInput) {
  const body = {
    summary: input.title,
    description: input.description,
    start: { dateTime: input.start.toISOString() },
    end: { dateTime: new Date(input.start.getTime() + input.durationMinutes * 60_000).toISOString() },
  };

  if (eventId) {
    const updated = await calendarRequest<GoogleCalendarEvent>(userId, "PATCH", eventId, body);
    if (updated) return updated.id;
  }
  const created = await calendarRequest<GoogleCalendarEvent>(userId, "POST", undefined, body);
  if (!created?.id) throw new Error("Google Calendar did not return an event ID");
  return created.id;
}

async function deleteCalendarEvent(userId: string, eventId: string) {
  await calendarRequest(userId, "DELETE", eventId);
}

export async function createGoogleCalendarTestEvent(userId: string) {
  const start = new Date(Date.now() + 15 * 60_000);
  const event = await calendarRequest<GoogleCalendarEvent>(userId, "POST", undefined, {
    summary: "MANTA CRM - Test de connexion",
    description: "Événement temporaire créé pour vérifier la connexion Google Agenda. Tu peux le supprimer après le test.",
    start: { dateTime: start.toISOString() },
    end: { dateTime: new Date(start.getTime() + 10 * 60_000).toISOString() },
  });
  if (!event?.id) throw new Error("Google Calendar n’a pas retourné l’événement de test.");
  return { url: event.htmlLink ?? null };
}

type SyncActivity = {
  id: string;
  titre: string;
  type: string;
  details: string | null;
  prochaineAction: string | null;
  prochaineActionDate: Date | null;
  prochaineActionDureeMinutes: number | null;
  date: Date | null;
  dureeMinutes: number | null;
  responsableId: string | null;
  pushActivityToGoogle: boolean;
  pushNextActionToGoogle: boolean;
  googleActivityEventId: string | null;
  googleActivityCalendarUserId: string | null;
  googleNextActionEventId: string | null;
  googleNextActionCalendarUserId: string | null;
  contact: { prenom: string | null; nom: string } | null;
  entreprise: { nom: string } | null;
};

function eventDescription(activity: SyncActivity) {
  return [
    `Type : ${activity.type}`,
    activity.contact ? `Contact : ${[activity.contact.prenom, activity.contact.nom].filter(Boolean).join(" ")}` : null,
    activity.entreprise ? `Entreprise : ${activity.entreprise.nom}` : null,
    activity.details,
  ].filter(Boolean).join("\n");
}

export async function syncActivityCalendarEvents(activityId: string, actorUserId: string) {
  const activity = await prisma.activity.findUnique({
    where: { id: activityId },
    include: { contact: { select: { prenom: true, nom: true } }, entreprise: { select: { nom: true } } },
  }) as SyncActivity | null;
  if (!activity) return ["L’activité n’existe plus."];

  const activityRecord = activity;
  const errors: string[] = [];
  const targetUserId = activityRecord.responsableId ?? actorUserId;

  async function syncOne(kind: "activity" | "nextAction") {
    const isNextAction = kind === "nextAction";
    const shouldSync = isNextAction ? activityRecord.pushNextActionToGoogle : activityRecord.pushActivityToGoogle;
    const eventId = isNextAction ? activityRecord.googleNextActionEventId : activityRecord.googleActivityEventId;
    const previousOwnerId = isNextAction ? activityRecord.googleNextActionCalendarUserId : activityRecord.googleActivityCalendarUserId;
    const eventIdField = isNextAction ? "googleNextActionEventId" : "googleActivityEventId";
    const ownerField = isNextAction ? "googleNextActionCalendarUserId" : "googleActivityCalendarUserId";

    try {
      if (!shouldSync) {
        if (eventId && previousOwnerId) await deleteCalendarEvent(previousOwnerId, eventId);
        await prisma.activity.update({ where: { id: activityRecord.id }, data: { [eventIdField]: null, [ownerField]: null } });
        return;
      }

      const start = isNextAction ? activityRecord.prochaineActionDate : activityRecord.date;
      const durationMinutes = isNextAction ? activityRecord.prochaineActionDureeMinutes : activityRecord.dureeMinutes;
      if (!start || !durationMinutes || durationMinutes < 1) {
        throw new Error(isNextAction ? "Renseigne la date, l’heure et la durée de la prochaine action." : "Renseigne la date, l’heure et la durée de l’activité.");
      }
      if (isNextAction && !activityRecord.prochaineAction) throw new Error("Renseigne le titre de la prochaine action.");

      let reusableEventId = eventId;
      if (eventId && previousOwnerId && previousOwnerId !== targetUserId) {
        await deleteCalendarEvent(previousOwnerId, eventId);
        reusableEventId = null;
      }

      const newEventId = await upsertCalendarEvent(targetUserId, reusableEventId, {
        title: isNextAction ? `Prochaine action : ${activityRecord.prochaineAction}` : activityRecord.titre,
        description: eventDescription(activityRecord),
        start,
        durationMinutes,
      });
      await prisma.activity.update({
        where: { id: activityRecord.id },
        data: { [eventIdField]: newEventId, [ownerField]: targetUserId },
      });
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "La synchronisation Google a échoué.");
    }
  }

  await syncOne("activity");
  await syncOne("nextAction");
  return errors;
}

export async function deleteActivityCalendarEvents(activityId: string) {
  const activity = await prisma.activity.findUnique({
    where: { id: activityId },
    select: {
      googleActivityEventId: true,
      googleActivityCalendarUserId: true,
      googleNextActionEventId: true,
      googleNextActionCalendarUserId: true,
    },
  });
  if (!activity) return [];

  const errors: string[] = [];
  for (const [eventId, ownerId] of [
    [activity.googleActivityEventId, activity.googleActivityCalendarUserId],
    [activity.googleNextActionEventId, activity.googleNextActionCalendarUserId],
  ]) {
    if (!eventId || !ownerId) continue;
    try {
      await deleteCalendarEvent(ownerId, eventId);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "La suppression dans Google Calendar a échoué.");
    }
  }
  return errors;
}

export async function revokeGoogleCalendarConnection(userId: string) {
  const connection = await prisma.googleCalendarConnection.findUnique({ where: { userId } });
  if (!connection) return;

  try {
    const token = decryptRefreshToken(connection.encryptedRefreshToken);
    await fetch(`https://oauth2.googleapis.com/revoke?${new URLSearchParams({ token })}`, { method: "POST", cache: "no-store" });
  } finally {
    await prisma.googleCalendarConnection.deleteMany({ where: { userId } });
  }
}