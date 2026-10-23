import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  approveWinnerAction,
  rejectWinnerAction,
  markPaidAction,
  viewProofUrlAction,
} from "./actions";

export const metadata = {
  title: "Winner Verification - Digital Heroes Admin",
};

interface AdminWinnersPageProps {
  searchParams?: {
    status?: string;
  };
}

export default async function AdminWinnersPage({ searchParams }: AdminWinnersPageProps) {
  await requireAdmin();
  const adminClient = createAdminClient();

  const filterStatus = searchParams?.status;

  // Query winners with draws and profiles
  let query = adminClient
    .from("winners")
    .select(`
      id,
      user_id,
      tier,
      prize_minor,
      proof_path,
      verification_status,
      admin_note,
      payment_status,
      paid_at,
      draws (month),
      profiles (full_name)
    `)
    .order("created_at", { ascending: false });

  if (filterStatus) {
    query = query.eq("verification_status", filterStatus);
  }

  const { data: winners, error } = await query;

  if (error) {
    console.error("Winners load error:", error);
  }

  const filterOptions = [
    { label: "All", value: "" },
    { label: "Awaiting Proof", value: "awaiting_proof" },
    { label: "Submitted", value: "submitted" },
    { label: "Approved", value: "approved" },
    { label: "Rejected", value: "rejected" },
  ];

  return (
    <main className="min-h-screen bg-background p-6 md:p-12">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
          <div>
            <h1 className="text-3xl font-bold font-heading text-foreground">
              Winners & Verifications
            </h1>
            <p className="text-sm text-muted-foreground">
              Review score cards, approve payouts, and mark prizes as paid
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/admin">Admin Hub</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/admin/draws">Draws</Link>
            </Button>
          </div>
        </header>

        {/* Filter Pills */}
        <div className="flex flex-wrap gap-2">
          {filterOptions.map((opt) => (
            <Button
              key={opt.value}
              asChild
              variant={
                (filterStatus || "") === opt.value ? "default" : "outline"
              }
              size="sm"
            >
              <Link
                href={
                  opt.value ? `/admin/winners?status=${opt.value}` : "/admin/winners"
                }
              >
                {opt.label}
              </Link>
            </Button>
          ))}
        </div>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-xl">Winners List</CardTitle>
            <CardDescription>
              Per A19: Payout can only be marked paid after verification approval.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {(!winners || winners.length === 0) ? (
              <div className="py-12 text-center space-y-2">
                <p className="text-base font-medium text-foreground">No winners found</p>
                <p className="text-sm text-muted-foreground">
                  Once monthly draws are published, winning member accounts and proof submissions appear here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border text-xs uppercase text-muted-foreground font-semibold">
                      <th className="py-2 px-3">Month</th>
                      <th className="py-2 px-3">User</th>
                      <th className="py-2 px-3">Tier</th>
                      <th className="py-2 px-3">Prize</th>
                      <th className="py-2 px-3">Verification</th>
                      <th className="py-2 px-3">Payment</th>
                      <th className="py-2 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {winners.map((w) => {
                      const drawInfo = w.draws as unknown as { month: string } | null;
                      const profileInfo = w.profiles as unknown as { full_name: string } | null;
                      const userName = profileInfo?.full_name || `Hero (${w.user_id.slice(0, 8)})`;

                      return (
                        <tr key={w.id} className="align-middle">
                          <td className="py-3 px-3 font-medium whitespace-nowrap">
                            {drawInfo?.month || "—"}
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            <div>
                              <p className="font-medium text-foreground">{userName}</p>
                              <p className="text-xs text-muted-foreground">{w.user_id.slice(0, 8)}</p>
                            </div>
                          </td>
                          <td className="py-3 px-3 font-medium whitespace-nowrap">
                            Tier {w.tier}
                          </td>
                          <td className="py-3 px-3 font-bold whitespace-nowrap">
                            ₹{Math.floor(w.prize_minor / 100)}
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full font-semibold capitalize ${
                                w.verification_status === "approved"
                                  ? "bg-success/15 text-success"
                                  : w.verification_status === "rejected"
                                  ? "bg-destructive/15 text-destructive"
                                  : w.verification_status === "submitted"
                                  ? "bg-amber-100 text-amber-900"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {w.verification_status.replace("_", " ")}
                            </span>
                            {w.admin_note && (
                              <p className="text-xs text-muted-foreground mt-0.5 max-w-xs truncate">
                                Note: {w.admin_note}
                              </p>
                            )}
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full font-semibold capitalize ${
                                w.payment_status === "paid"
                                  ? "bg-success/15 text-success"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {w.payment_status}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right whitespace-nowrap space-x-1">
                            {/* View proof */}
                            {w.proof_path && (
                              <form action={viewProofUrlAction} className="inline-block" target="_blank">
                                <input type="hidden" name="proofPath" value={w.proof_path} />
                                <Button type="submit" variant="ghost" size="sm">
                                  Proof
                                </Button>
                              </form>
                            )}

                            {/* Approve */}
                            {w.verification_status !== "approved" && (
                              <form action={approveWinnerAction} className="inline-block">
                                <input type="hidden" name="winnerId" value={w.id} />
                                <Button type="submit" variant="outline" size="sm">
                                  Approve
                                </Button>
                              </form>
                            )}

                            {/* Reject */}
                            {w.verification_status !== "rejected" && (
                              <form action={rejectWinnerAction} className="inline-block">
                                <input type="hidden" name="winnerId" value={w.id} />
                                <Button type="submit" variant="outline" size="sm" className="text-destructive hover:bg-destructive/10">
                                  Reject
                                </Button>
                              </form>
                            )}

                            {/* Mark Paid (only when approved) */}
                            {w.verification_status === "approved" && w.payment_status !== "paid" && (
                              <form action={markPaidAction} className="inline-block">
                                <input type="hidden" name="winnerId" value={w.id} />
                                <Button type="submit" variant="default" size="sm">
                                  Mark Paid
                                </Button>
                              </form>
                            )}
                          </td>
                        </tr>
                      );
                    })}
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
