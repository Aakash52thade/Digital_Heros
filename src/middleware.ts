import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Middleware handling session token refresh and initial route interception.
 * Explicitly excludes Stripe webhook endpoint from Supabase cookie session processing.
 */
export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api/stripe/webhook")) {
    return NextResponse.next();
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Only run auth middleware on routes requiring session validation or redirect checks:
     * - /dashboard and all child routes
     * - /admin and all child routes
     * - /login and /signup (redirect if logged in)
     */
    "/dashboard/:path*",
    "/admin/:path*",
    "/login",
    "/signup",
  ],
};
