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
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api/stripe/webhook (Stripe webhook raw payload endpoint)
     * - public asset files (svg, png, jpg, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|api/stripe/webhook|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
