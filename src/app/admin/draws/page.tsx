import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { CompactSimulation } from "@/lib/draw-server";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PublishButton } from "./publish-button";
import { runSimulationAction } from "./actions";

export const metadata = {
  title: "Draw Management - Digital Heroes Admin",
};

export default async function AdminDrawsPage() {
  await requireAdmin();
  const adminClient = createAdminClient();

  // Current month in Asia/Kolkata (YYYY-MM)
  const currentMonth = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
  }).format(new Date());

  // Fetch all draws
  const { data: draws } = await adminClient
    .from("draws")
    .select("*")
    .order("month", { ascending: false });

  // Current draft draw for simulation view
  const currentDraw = (draws || []).find((d) => d.status === "draft");
  const simulation = (currentDraw?.simulation as CompactSimulation | null) ?? null;

  return (
    <main className="min-h-screen bg-background p-6 md:p-12">
      <div className="max-w-5xl mx-auto space-y-8">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
          <div>
            <h1 className="text-3xl font-bold font-heading text-foreground">
              Draw Administration
            </h1>
            <p className="text-sm text-muted-foreground">
              Run simulations and publish monthly prize draws
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/admin">Back to Admin</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/admin/winners">View Winners</Link>
            </Button>
          </div>
        </header>

        {/* Simulation Controls */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-xl">Simulate Draw</CardTitle>
            <CardDescription>
              Select month and algorithm. Simulation does not alter live balances or publish winners.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={runSimulationAction} className="flex flex-wrap items-end gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  Month
                </label>
                <input
                  type="month"
                  name="month"
                  defaultValue={currentMonth}
                  required
                  className="block h-10 px-3 rounded-md border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  Mode
                </label>
                <select
                  name="mode"
                  defaultValue="algorithmic"
                  className="block h-10 px-3 rounded-md border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="algorithmic">Algorithmic (Score Weighted)</option>
                  <option value="random">Random (Uniform)</option>
                </select>
              </div>

              <Button type="submit">Run Simulation</Button>
            </form>
          </CardContent>
        </Card>

        {/* Latest Simulation Results */}
        {currentDraw && simulation && (
          <Card className="border-border border-primary/40">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xl">
                  Simulation: {currentDraw.month} ({currentDraw.mode})
                </CardTitle>
                <CardDescription>
                  Draft status. Numbers: {simulation.numbers?.join(", ")}
                </CardDescription>
              </div>
              <PublishButton drawId={currentDraw.id} />
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-3 rounded-md bg-muted/40">
                  <span className="text-xs text-muted-foreground uppercase font-semibold">Active Subs</span>
                  <p className="text-lg font-bold">{simulation.activeSubscriberCount}</p>
                </div>
                <div className="p-3 rounded-md bg-muted/40">
                  <span className="text-xs text-muted-foreground uppercase font-semibold">Eligible Entries</span>
                  <p className="text-lg font-bold">{simulation.eligibleEntriesCount}</p>
                </div>
                <div className="p-3 rounded-md bg-muted/40">
                  <span className="text-xs text-muted-foreground uppercase font-semibold">Pool Total</span>
                  <p className="text-lg font-bold">₹{Math.floor(simulation.poolTotalMinor / 100)}</p>
                </div>
                <div className="p-3 rounded-md bg-muted/40">
                  <span className="text-xs text-muted-foreground uppercase font-semibold">Carry-in Jackpot</span>
                  <p className="text-lg font-bold">₹{Math.floor(simulation.jackpotCarryInMinor / 100)}</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border text-xs uppercase text-muted-foreground font-semibold">
                      <th className="py-2 px-3">Tier</th>
                      <th className="py-2 px-3">Pool</th>
                      <th className="py-2 px-3">Winners</th>
                      <th className="py-2 px-3">Prize Each</th>
                      <th className="py-2 px-3">Leftover</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    <tr>
                      <td className="py-2 px-3 font-medium">Tier 5 (5 Matches)</td>
                      <td className="py-2 px-3">₹{Math.floor(simulation.tier5.pool / 100)}</td>
                      <td className="py-2 px-3">{simulation.tier5.winnersCount}</td>
                      <td className="py-2 px-3">₹{Math.floor(simulation.tier5.prizeEach / 100)}</td>
                      <td className="py-2 px-3">₹{Math.floor(simulation.tier5.leftover / 100)}</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-medium">Tier 4 (4 Matches)</td>
                      <td className="py-2 px-3">₹{Math.floor(simulation.tier4.pool / 100)}</td>
                      <td className="py-2 px-3">{simulation.tier4.winnersCount}</td>
                      <td className="py-2 px-3">₹{Math.floor(simulation.tier4.prizeEach / 100)}</td>
                      <td className="py-2 px-3">₹{Math.floor(simulation.tier4.leftover / 100)}</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-medium">Tier 3 (3 Matches)</td>
                      <td className="py-2 px-3">₹{Math.floor(simulation.tier3.pool / 100)}</td>
                      <td className="py-2 px-3">{simulation.tier3.winnersCount}</td>
                      <td className="py-2 px-3">₹{Math.floor(simulation.tier3.prizeEach / 100)}</td>
                      <td className="py-2 px-3">₹{Math.floor(simulation.tier3.leftover / 100)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-center p-3 rounded-md bg-primary/10 border border-primary/20 text-sm">
                <span className="font-semibold text-primary">Jackpot Rollover to Next Month:</span>
                <span className="font-bold text-primary text-base">
                  ₹{Math.floor(simulation.jackpotRolloverMinor / 100)}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Past Draws History */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-xl">Draw History</CardTitle>
          </CardHeader>
          <CardContent>
            {(!draws || draws.length === 0) ? (
              <p className="text-sm text-muted-foreground">No draws recorded yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border text-xs uppercase text-muted-foreground font-semibold">
                      <th className="py-2 px-3">Month</th>
                      <th className="py-2 px-3">Mode</th>
                      <th className="py-2 px-3">Status</th>
                      <th className="py-2 px-3">Numbers</th>
                      <th className="py-2 px-3">Total Pool</th>
                      <th className="py-2 px-3">Rollover</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {draws.map((d) => (
                      <tr key={d.id}>
                        <td className="py-2 px-3 font-medium">{d.month}</td>
                        <td className="py-2 px-3 capitalize">{d.mode}</td>
                        <td className="py-2 px-3">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                              d.status === "published"
                                ? "bg-success/15 text-success"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {d.status}
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          {d.drawn_numbers ? d.drawn_numbers.join(", ") : "—"}
                        </td>
                        <td className="py-2 px-3">
                          ₹{Math.floor((d.pool_total_minor || 0) / 100)}
                        </td>
                        <td className="py-2 px-3">
                          ₹{Math.floor((d.jackpot_rollover_minor || 0) / 100)}
                        </td>
                      </tr>
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
