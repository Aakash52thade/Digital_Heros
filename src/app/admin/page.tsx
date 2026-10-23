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

export const metadata = {
  title: "Admin Overview - Digital Heroes",
};

interface AdminReport {
  total_users: number;
  active_subscribers: number;
  prize_pool_collected_minor: number;
  prizes_awarded_minor: number;
  prizes_paid_minor: number;
  charity_subscription_minor: number;
  charity_donations_minor: number;
  draws_published: number;
  current_jackpot_rollover_minor: number;
  charities: {
    id: string;
    name: string;
    subscription_minor: number;
    donation_minor: number;
    total_minor: number;
  }[];
  draws: {
    month: string;
    mode: string;
    pool_total_minor: number;
    active_subscriber_count: number;
    entries: number;
    winners: number;
    jackpot_rollover_minor: number;
  }[];
}

export default async function AdminPage() {
  await requireAdmin();
  const adminClient = createAdminClient();

  const { data: rawReport, error } = await adminClient.rpc("admin_report");

  if (error) {
    console.error("Admin report error:", error);
  }

  const report = (rawReport as AdminReport) || {
    total_users: 0,
    active_subscribers: 0,
    prize_pool_collected_minor: 0,
    prizes_awarded_minor: 0,
    prizes_paid_minor: 0,
    charity_subscription_minor: 0,
    charity_donations_minor: 0,
    draws_published: 0,
    current_jackpot_rollover_minor: 0,
    charities: [],
    draws: [],
  };

  const statCards = [
    {
      label: "Total Users",
      value: report.total_users ?? 0,
      description: "Registered profiles",
    },
    {
      label: "Active Subscribers",
      value: report.active_subscribers ?? 0,
      description: "Eligible for next draw",
    },
    {
      label: "Prize Pool Collected",
      value: `Rs ${Math.floor((report.prize_pool_collected_minor ?? 0) / 100)}`,
      description: "From subscriber payments",
    },
    {
      label: "Prizes Awarded",
      value: `Rs ${Math.floor((report.prizes_awarded_minor ?? 0) / 100)}`,
      description: "Total won by players",
    },
    {
      label: "Prizes Paid",
      value: `Rs ${Math.floor((report.prizes_paid_minor ?? 0) / 100)}`,
      description: "Verified & disbursed",
    },
    {
      label: "Current Jackpot Rollover",
      value: `Rs ${Math.floor((report.current_jackpot_rollover_minor ?? 0) / 100)}`,
      description: "Carry-in to next draw",
    },
    {
      label: "Charity from Subscriptions",
      value: `Rs ${Math.floor((report.charity_subscription_minor ?? 0) / 100)}`,
      description: "Allocated percentage share",
    },
    {
      label: "Charity from Donations",
      value: `Rs ${Math.floor((report.charity_donations_minor ?? 0) / 100)}`,
      description: "Direct one-off payments",
    },
    {
      label: "Draws Published",
      value: report.draws_published ?? 0,
      description: "Completed monthly draws",
    },
  ];

  return (
    <main className="p-6 md:p-12">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
          <div>
            <h1 className="text-3xl font-bold font-heading text-foreground">
              Platform Overview
            </h1>
            <p className="text-sm text-muted-foreground">
              Real-time financial, charity, and draw performance metrics (A22)
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/admin/draws">Run Draw</Link>
            </Button>
            <Button asChild>
              <Link href="/admin/users">Manage Users</Link>
            </Button>
          </div>
        </header>

        {/* 9 Metrics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {statCards.map((c) => (
            <Card key={c.label} className="border-border">
              <CardHeader className="pb-2">
                <CardDescription className="text-xs uppercase font-semibold">
                  {c.label}
                </CardDescription>
                <CardTitle className="text-2xl font-bold text-foreground">
                  {c.value}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-xs text-muted-foreground">{c.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charity Distribution Table */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-xl">Charity Distributions</CardTitle>
            <CardDescription>
              Breakdown of funds raised for each active partner charity
            </CardDescription>
          </CardHeader>
          <CardContent>
            {(!report.charities || report.charities.length === 0) ? (
              <p className="text-sm text-muted-foreground">
                No charity distribution records available yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border text-xs uppercase text-muted-foreground font-semibold">
                      <th className="py-2.5 px-3">Charity Name</th>
                      <th className="py-2.5 px-3">From Subscriptions</th>
                      <th className="py-2.5 px-3">From Donations</th>
                      <th className="py-2.5 px-3 text-right">Total Impact</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {report.charities.map((ch) => (
                      <tr key={ch.id}>
                        <td className="py-2.5 px-3 font-medium text-foreground">
                          {ch.name}
                        </td>
                        <td className="py-2.5 px-3">
                          Rs {Math.floor((ch.subscription_minor ?? 0) / 100)}
                        </td>
                        <td className="py-2.5 px-3">
                          Rs {Math.floor((ch.donation_minor ?? 0) / 100)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-primary">
                          Rs {Math.floor((ch.total_minor ?? 0) / 100)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Published Draws Table */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-xl">Published Draws</CardTitle>
            <CardDescription>
              Performance history of all completed monthly draws
            </CardDescription>
          </CardHeader>
          <CardContent>
            {(!report.draws || report.draws.length === 0) ? (
              <p className="text-sm text-muted-foreground">
                No draws published yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border text-xs uppercase text-muted-foreground font-semibold">
                      <th className="py-2.5 px-3">Month</th>
                      <th className="py-2.5 px-3">Mode</th>
                      <th className="py-2.5 px-3">Pool</th>
                      <th className="py-2.5 px-3">Subscribers</th>
                      <th className="py-2.5 px-3">Entries</th>
                      <th className="py-2.5 px-3">Winners</th>
                      <th className="py-2.5 px-3 text-right">Rollover</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {report.draws.map((d) => (
                      <tr key={d.month}>
                        <td className="py-2.5 px-3 font-medium text-foreground">
                          {d.month}
                        </td>
                        <td className="py-2.5 px-3 capitalize">{d.mode}</td>
                        <td className="py-2.5 px-3">
                          Rs {Math.floor((d.pool_total_minor ?? 0) / 100)}
                        </td>
                        <td className="py-2.5 px-3">{d.active_subscriber_count}</td>
                        <td className="py-2.5 px-3">{d.entries}</td>
                        <td className="py-2.5 px-3">{d.winners}</td>
                        <td className="py-2.5 px-3 text-right font-semibold">
                          Rs {Math.floor((d.jackpot_rollover_minor ?? 0) / 100)}
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
