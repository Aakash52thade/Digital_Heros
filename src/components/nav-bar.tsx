import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";

/**
 * Public navigation bar — server component.
 * Shows auth-aware CTA (Dashboard vs Sign Up / Log In).
 */
export async function NavBar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-6xl mx-auto flex h-16 items-center justify-between px-6">
        {/* Brand */}
        <Link
          href="/"
          className="flex items-center gap-2 font-heading font-extrabold text-xl text-foreground tracking-tight"
        >
          Digital Heroes
          <span className="ml-1 text-[10px] font-semibold uppercase tracking-widest text-accent px-2 py-0.5 rounded-full border border-accent/30 hidden sm:inline">
            Charity-First
          </span>
        </Link>

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
          <Link href="/charities" className="hover:text-foreground transition-colors">
            Charities
          </Link>
          <Link href="/how-it-works" className="hover:text-foreground transition-colors">
            How It Works
          </Link>
        </nav>

        {/* CTA */}
        <div className="flex items-center gap-2">
          {user ? (
            <Button asChild size="sm" variant="accent">
              <Link href="/dashboard">Dashboard</Link>
            </Button>
          ) : (
            <>
              <Button asChild size="sm" variant="ghost">
                <Link href="/login">Log In</Link>
              </Button>
              <Button asChild size="sm" variant="accent">
                <Link href="/signup">Get Started</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
