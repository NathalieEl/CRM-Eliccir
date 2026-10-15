import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { googleCalendarAuthorizationUrl, googleCalendarIsConfigured, googleCalendarRedirectUri } from "@/lib/google-calendar";

const stateCookieName = "google_calendar_oauth_state";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/login?error=session-expired", request.url));
  if (!googleCalendarIsConfigured()) return NextResponse.redirect(new URL("/activities?error=calendar-not-configured", request.url));

  const state = randomBytes(32).toString("base64url");
  const redirectUri = googleCalendarRedirectUri(request.nextUrl.origin);
  const response = NextResponse.redirect(googleCalendarAuthorizationUrl(redirectUri, state));
  const cookieStore = await cookies();
  cookieStore.set(stateCookieName, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/api/google-calendar/callback",
    maxAge: 600,
  });
  return response;
}