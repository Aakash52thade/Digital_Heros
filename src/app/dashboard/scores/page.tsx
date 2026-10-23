import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireActiveSubscription } from "@/lib/subscription";
import { getTodayIST } from "@/lib/scores";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AddScoreForm, ScoreRow } from "./scores-client";

export const metadata = {
  title: "Golf Scores - Digital Heroes",
  description: "Track your Stableford scores and enter the monthly draw",
};

export default async function ScoresPage() {
  const { user } = await requireActiveSubscription();
  const supabase = await createClient();

  const { data: scores } = await supabase
    .from("scores")
    .select("id, score, played_on")
    .eq("user_id", user.id)
    .order("played_on", { ascending: false })
    .limit(5);

  const scoresList = scores || [];
  const count = scoresList.length;
  const todayIST = getTodayIST();

  return (
    <main className="min-h-screen bg-background p-6 md:p-12">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
          <div>
            <h1 className="text-3xl font-bold font-heading text-foreground">
              Golf Scores
            </h1>
            <p className="text-sm text-muted-foreground">
              Keep your latest 5 Stableford scores up-to-date for the monthly prize draw.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/dashboard">← Back to Dashboard</Link>
          </Button>
        </header>

        {/* Status banner */}
        <div className="flex items-center justify-between rounded-lg bg-card border border-border p-4 shadow-sm">
          <div>
            <p className="text-sm font-semibold text-foreground">
              Draw Eligibility: {count} of 5 scores entered
            </p>
            <p className="text-xs text-muted-foreground">
              {count === 5
                ? "You have 5 scores entered and are eligible for the monthly prize draw!"
                : `Enter ${5 - count} more score${5 - count === 1 ? "" : "s"} to qualify for draw entry.`}
            </p>
          </div>
          <div className="text-xl font-bold font-heading text-primary">
            {count}/5
          </div>
        </div>

        {/* Add score form */}
        <AddScoreForm maxDate={todayIST} />

        {/* Existing Scores List */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-xl">Your Latest 5 Scores</CardTitle>
            <CardDescription>
              Showing newest first. Adding a 6th score automatically replaces the oldest.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {scoresList.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <p className="text-base font-medium text-foreground">No scores recorded yet</p>
                <p className="text-sm text-muted-foreground">
                  Add your first Stableford score using the form above to start qualifying for the next draw.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="py-2 px-4">Score</th>
                      <th className="py-2 px-4">Date Played</th>
                      <th className="py-2 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scoresList.map((s) => (
                      <ScoreRow key={s.id} score={s} maxDate={todayIST} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
