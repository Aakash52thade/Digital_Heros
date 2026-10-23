import Link from "next/link";
import { logoutAction } from "@/app/auth/actions";
import { requireAdmin } from "@/lib/admin";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "Admin - Digital Heroes",
};

export default async function AdminPage() {
  await requireAdmin();

  return (
    <main className="min-h-screen bg-background p-6 md:p-12">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="flex items-center justify-between border-b border-border pb-4">
          <h1 className="text-3xl font-bold font-heading text-foreground">
            Admin Dashboard
          </h1>
          <form action={logoutAction}>
            <Button variant="outline" type="submit">
              Log Out
            </Button>
          </form>
        </header>

        <div className="grid sm:grid-cols-2 gap-6">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-xl">Monthly Draws</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Simulate monthly prize draws, preview tier payouts, and publish final draw results.
              </p>
              <Button asChild className="w-full">
                <Link href="/admin/draws">Manage Draws</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-xl">Winners & Payouts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Inspect uploaded scorecard proofs, approve or reject submissions, and mark prizes paid.
              </p>
              <Button asChild variant="outline" className="w-full">
                <Link href="/admin/winners">Verify Winners</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
