"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createGoogleCalendarTestEvent, googleCalendarIsConfigured, revokeGoogleCalendarConnection } from "@/lib/google-calendar";

export async function createGoogleCalendarTestEventAction() {
  const user = await getCurrentUser();
  if (!user || !user.active || user.mustChangePassword) redirect("/login?error=session-expired");
  if (!googleCalendarIsConfigured()) redirect("/activities?error=calendar-not-configured");

  let event: { url: string | null };
  try {
    event = await createGoogleCalendarTestEvent(user.id);
  } catch (error) {
    console.error("Google Calendar test event failed", error);
    redirect("/activities?error=calendar-test");
  }

  const query = new URLSearchParams({ notice: "calendar-test-created" });
  if (event.url) query.set("calendarTestEventUrl", event.url);
  redirect(`/activities?${query}`);
}

export async function disconnectGoogleCalendar() {
  const user = await getCurrentUser();
  if (!user || !user.active || user.mustChangePassword) redirect("/login?error=session-expired");
  if (!googleCalendarIsConfigured()) redirect("/activities?error=calendar-not-configured");

  try {
    await revokeGoogleCalendarConnection(user.id);
  } catch (error) {
    console.error("Google Calendar disconnection failed", error);
  }

  revalidatePath("/activities");
  redirect("/activities?notice=calendar-disconnected");
}