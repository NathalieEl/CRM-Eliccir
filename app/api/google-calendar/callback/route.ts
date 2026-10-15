import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { googleCalendarPublicOrigin, googleCalendarRedirectUri, saveGoogleCalendarConnection } from "@/lib/google-calendar";

const stateCookieName = "google_calendar_oauth_state";

function redirectToActivities(request: NextRequest, query: string) {
  const origin = googleCalendarPublicOrigin(request.nextUrl.origin);
  const response = NextResponse.redirect(new URL(`/activities?${query}`, origin));
  response.cookies.delete(stateCookieName);
  return response;
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return redirectToActivities(request, "error=session-expired");

  const url = request.nextUrl;
  const state = url.searchParams.get("state") ?? "";
  const cookieState = request.cookies.get(stateCookieName)?.value ?? "";
  const stateMatches = state.length === cookieState.length && state.length > 0 && timingSafeEqual(Buffer.from(state), Buffer.from(cookieState));
  if (!stateMatches) return redirectToActivities(request, "error=calendar-oauth-state");
  if (url.searchParams.has("error") || !url.searchParams.get("code")) return redirectToActivities(request, "error=calendar-oauth");

  try {
    await saveGoogleCalendarConnection(
      user.id,
      url.searchParams.get("code")!,
      googleCalendarRedirectUri(url.origin),
    );
    return redirectToActivities(request, "notice=calendar-connected");
  } catch (error) {
    console.error("Google Calendar connection failed", error);
    return redirectToActivities(request, "error=calendar-oauth");
  }
}