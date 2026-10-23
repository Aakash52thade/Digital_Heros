import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logoutAction } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SettingsForm } from "./settings-form";

export const metadata = {
  title: "Settings - Digital Heroes",
};

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  const fullName = profile?.full_name || user.user_metadata?.full_name || "";

  return (
    <main className="min-h-screen bg-background p-6 md:p-12">
      <div className="max-w-2xl mx-auto space-y-8">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
          <div>
            <h1 className="text-3xl font-bold font-heading text-foreground">
              Account Settings
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage your personal information and profile settings
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/dashboard">← Back to Dashboard</Link>
          </Button>
        </header>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-xl">Profile Details</CardTitle>
            <CardDescription>
              Your name as it appears on certificates and prize announcements
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SettingsForm initialName={fullName} />
          </CardContent>
        </Card>

        <Card className="border-border border-destructive/20">
          <CardHeader>
            <CardTitle className="text-xl">Sign Out</CardTitle>
            <CardDescription>
              End your active session on this device
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={logoutAction}>
              <Button variant="outline" type="submit" className="text-destructive hover:bg-destructive/10">
                Log Out of Digital Heroes
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
