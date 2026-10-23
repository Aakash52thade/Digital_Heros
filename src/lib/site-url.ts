import { headers } from "next/headers";

/**
 * Resolves the public base URL of the site for building Stripe redirect URLs.
 *
 * Priority:
 * 1. The host the user is actually on (from the incoming request), so the
 *    return URL always matches the deployment they paid from.
 * 2. NEXT_PUBLIC_SITE_URL (ignored if it points to localhost in production).
 * 3. Vercel-provided production / deployment URL.
 * 4. http://localhost:3000 (local development only).
 */
export async function getSiteUrl(): Promise<string> {
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    if (host) {
      const isLocal = host.startsWith("localhost") || host.startsWith("127.0.0.1");
      const proto = h.get("x-forwarded-proto") ?? (isLocal ? "http" : "https");
      return `${proto}://${host}`;
    }
  } catch {
    // headers() unavailable outside a request context; fall through to env.
  }

  const isProd = process.env.NODE_ENV === "production";
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (envUrl && !(isProd && /localhost|127\.0\.0\.1/.test(envUrl))) {
    return envUrl;
  }

  const vercelUrl =
    process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  if (vercelUrl) {
    return `https://${vercelUrl}`;
  }

  return "http://localhost:3000";
}
