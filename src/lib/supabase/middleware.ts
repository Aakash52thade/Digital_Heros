import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes auth session cookies on incoming requests and guards protected routes.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(
        cookiesToSet: Array<{
          name: string;
          value: string;
          options?: CookieOptions;
        }>
      ) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // getUser safely validates auth token against Supabase Auth server
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  // Logged-in users visiting /login or /signup are redirected.
  // Preserve checkout query params so the dashboard can show the success banner.
  if (user && (path === "/login" || path === "/signup")) {
    const url = request.nextUrl.clone();
    const checkout = request.nextUrl.searchParams.get("checkout");
    const sessionId = request.nextUrl.searchParams.get("session_id");
    url.pathname = "/dashboard";
    url.search = ""; // clear first
    if (checkout && sessionId) {
      url.searchParams.set("checkout", checkout);
      url.searchParams.set("session_id", sessionId);
    }
    return NextResponse.redirect(url);
  }

  // /dashboard/* and /admin/* require authentication
  if (!user && (path.startsWith("/dashboard") || path.startsWith("/admin"))) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
