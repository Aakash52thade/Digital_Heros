import { logoutAction } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "Admin - Digital Heroes",
};

export default function AdminPage() {
  return (
    <main className="min-h-screen bg-background p-6 md:p-12">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="flex items-center justify-between border-b border-border pb-4">
          <h1 className="text-3xl font-bold font-heading text-foreground">
            Admin
          </h1>
          <form action={logoutAction}>
            <Button variant="outline" type="submit">
              Log Out
            </Button>
          </form>
        </header>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-xl">Admin Control Panel</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Admin administration dashboard placeholder.
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
