import Link from "next/link";
import { logoutAction } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const navItems = [
    { label: "Overview", href: "/admin" },
    { label: "Users", href: "/admin/users" },
    { label: "Draws", href: "/admin/draws" },
    { label: "Charities", href: "/admin/charities" },
    { label: "Winners", href: "/admin/winners" },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-card/60 backdrop-blur sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/admin" className="font-heading font-bold text-lg text-primary">
              Admin Portal
            </Link>
            <nav className="flex items-center gap-1 text-sm font-medium">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard">Subscriber View</Link>
            </Button>
            <form action={logoutAction}>
              <Button variant="outline" size="sm" type="submit">
                Log Out
              </Button>
            </form>
          </div>
        </div>
      </header>
      <div className="flex-1">{children}</div>
    </div>
  );
}
