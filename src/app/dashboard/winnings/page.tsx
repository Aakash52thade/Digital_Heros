import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { uploadProofAction } from "./actions";

export const metadata = {
  title: "My Winnings - Digital Heroes",
};

export default async function WinningsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // A10: only require auth (not active subscription) — winners who cancelled can still submit proof
  if (!user) {
    redirect("/login");
  }

  const { data: winnings } = await supabase
    .from("winners")
    .select(`
      id,
      tier,
      prize_minor,
      proof_path,
      verification_status,
      admin_note,
      payment_status,
      draws (month)
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen bg-background p-6 md:p-12">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
          <div>
            <h1 className="text-3xl font-bold font-heading text-foreground">
              My Prize Winnings
            </h1>
            <p className="text-sm text-muted-foreground">
              Track draw prizes, submit verification scorecards, and monitor payout status
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/dashboard">Dashboard</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard/scores">My Scores</Link>
            </Button>
          </div>
        </header>

        {(!winnings || winnings.length === 0) ? (
          <Card className="border-border">
            <CardContent className="py-16 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto text-xl font-bold">
                🏆
              </div>
              <div className="space-y-1">
                <p className="text-lg font-bold font-heading text-foreground">
                  No prize winnings yet
                </p>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  Keep submitting your 5 monthly Stableford scores. When you match 3 or more numbers in a published draw, your prize will appear right here!
                </p>
              </div>
              <Button asChild variant="accent">
                <Link href="/dashboard/scores">Enter Golf Scores</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {winnings.map((w) => {
              const drawInfo = w.draws as unknown as { month: string } | null;
              const canUpload =
                w.verification_status === "awaiting_proof" ||
                w.verification_status === "rejected";

              return (
                <Card key={w.id} className="border-border">
                  <CardHeader className="flex flex-row items-center justify-between pb-3">
                    <div>
                      <CardTitle className="text-xl">
                        {drawInfo?.month || "Draw"} — Tier {w.tier} Winner
                      </CardTitle>
                      <CardDescription>
                        Prize Amount: <span className="font-bold text-foreground">₹{Math.floor(w.prize_minor / 100)}</span>
                      </CardDescription>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-semibold capitalize ${
                          w.verification_status === "approved"
                            ? "bg-success/15 text-success border border-success/30"
                            : w.verification_status === "rejected"
                            ? "bg-destructive/15 text-destructive border border-destructive/30"
                            : w.verification_status === "submitted"
                            ? "bg-amber-100 text-amber-900 border border-amber-200"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        Verification: {w.verification_status.replace("_", " ")}
                      </span>
                      <span className="text-xs text-muted-foreground capitalize">
                        Payout: {w.payment_status}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {w.admin_note && (
                      <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-sm text-destructive">
                        <span className="font-semibold">Admin feedback: </span>
                        {w.admin_note}
                      </div>
                    )}

                    {canUpload ? (
                      <div className="p-4 rounded-md border border-dashed border-border space-y-3 bg-muted/20">
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            Upload Verification Scorecard (JPG, PNG, WebP &le; 5 MB)
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Please upload a photo or screenshot verifying your 5 submitted golf scores.
                          </p>
                        </div>
                        <form action={uploadProofAction} className="flex flex-wrap items-center gap-3">
                          <input type="hidden" name="winnerId" value={w.id} />
                          <input
                            type="file"
                            name="proof"
                            accept="image/jpeg,image/png,image/webp"
                            required
                            className="text-xs text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:opacity-90"
                          />
                          <Button type="submit" size="sm">
                            Submit Scorecard
                          </Button>
                        </form>
                      </div>
                    ) : w.verification_status === "submitted" ? (
                      <p className="text-xs text-muted-foreground">
                        Your scorecard proof is currently under review by platform administrators.
                      </p>
                    ) : (
                      <p className="text-xs text-success font-medium">
                        Scorecard verified and approved! Payout will be processed soon.
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
