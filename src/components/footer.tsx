import Link from "next/link";

/** Public footer — static server component. */
export function Footer() {
  return (
    <footer className="border-t border-border bg-background mt-auto">
      <div className="max-w-6xl mx-auto px-6 py-10 grid sm:grid-cols-3 gap-8 text-sm text-muted-foreground">
        <div className="space-y-2">
          <p className="font-heading font-bold text-foreground text-base">Digital Heroes</p>
          <p className="leading-relaxed">
            Play golf. Win prizes. Give back. A charity-first subscription platform for golfers who care.
          </p>
        </div>

        <div className="space-y-2">
          <p className="font-semibold text-foreground uppercase tracking-wider text-xs">Explore</p>
          <ul className="space-y-1.5">
            <li><Link href="/charities" className="hover:text-foreground transition-colors">Our Charities</Link></li>
            <li><Link href="/#how-it-works" className="hover:text-foreground transition-colors">How It Works</Link></li>
            <li><Link href="/subscribe" className="hover:text-foreground transition-colors">Membership Plans</Link></li>
          </ul>
        </div>

        <div className="space-y-2">
          <p className="font-semibold text-foreground uppercase tracking-wider text-xs">Account</p>
          <ul className="space-y-1.5">
            <li><Link href="/signup" className="hover:text-foreground transition-colors">Sign Up</Link></li>
            <li><Link href="/login" className="hover:text-foreground transition-colors">Log In</Link></li>
            <li><Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} Digital Heroes. All rights reserved.</span>
          <span>Built with purpose. Every subscription makes a difference.</span>
        </div>
      </div>
    </footer>
  );
}
