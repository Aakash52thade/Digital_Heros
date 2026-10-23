import Link from "next/link";
import { requireActiveSubscription } from "@/lib/subscription";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = {
  title: "Scores - Digital Heroes",
};

export default async function ScoresPage() {
  // Guard requires active subscription; redirects to /subscribe if inactive
  await requireActiveSubscription();

  return (
    <main className="min-h-screen bg-background p-6 md:p-12">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="flex items-center justify-between border-b border-border pb-4">
          <div>
            <h1 className="text-3xl font-bold font-heading text-foreground">
              Golf Scores
            </h1>
            <p className="text-sm text-muted-foreground">
              Stableford score tracker and draw entry validation
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/dashboard">← Back to Dashboard</Link>
          </Button>
        </header>

        <Card className="border-border">
          <CardHeader>
            <CardTitle>Scores (coming in Phase 3)</CardTitle>
            <CardDescription>
              Your active membership is verified. Score entry, handicap validation,
              and rolling-5 history will be enabled in Phase 3.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Scores (coming in Phase 3)
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
