import { NextRequest, NextResponse } from "next/server";
import { sessionCookie, verifySession } from "@/lib/session-token";

export async function proxy(request: NextRequest) {
  const token = request.cookies.get(sessionCookie)?.value;
  if (!token) return NextResponse.redirect(new URL("/login", request.url));

  try {
    await verifySession(token);
    return NextResponse.next();
  } catch {
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete(sessionCookie);
    return response;
  }
}

export const config = {
  matcher: ["/((?!login|_next/static|_next/image|favicon.ico).*)"],
};