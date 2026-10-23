import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = {
  title: "User Management - Digital Heroes Admin",
};

interface UsersPageProps {
  searchParams?: {
    q?: string;
  };
}

export default async function AdminUsersPage({ searchParams }: UsersPageProps) {
  await requireAdmin();
  const adminClient = createAdminClient();

  const searchQuery = (searchParams?.q || "").toLowerCase().trim();

  // 1. Fetch all auth users
  const { data: authData } = await adminClient.auth.admin.listUsers({
    page: 1,
    perPage: 100,
  });

  const authUsers = authData?.users || [];

  // 2. Fetch profiles
  const { data: profiles } = await adminClient
    .from("profiles")
    .select("id, full_name, role, charity_id, charities(name)");

  const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

  // 3. Fetch latest subscriptions
  const { data: subs } = await adminClient
    .from("subscriptions")
    .select("user_id, status")
    .order("created_at", { ascending: false });

  const subMap = new Map<string, string>();
  for (const s of subs || []) {
    if (!subMap.has(s.user_id)) {
      subMap.set(s.user_id, s.status);
    }
  }

  // 4. Fetch scores count per user
  const { data: allScores } = await adminClient
    .from("scores")
    .select("user_id");

  const scoreCountMap = new Map<string, number>();
  for (const row of allScores || []) {
    scoreCountMap.set(row.user_id, (scoreCountMap.get(row.user_id) || 0) + 1);
  }

  // Merge and filter by ?q=
  const userRows = authUsers
    .map((u) => {
      const p = profileMap.get(u.id);
      const ch = p?.charities as unknown as { name: string } | null;
      return {
        id: u.id,
        email: u.email || "",
        name: p?.full_name || u.user_metadata?.full_name || "—",
        role: p?.role || "subscriber",
        charityName: ch?.name || "None",
        subStatus: subMap.get(u.id) || "inactive",
        scoresCount: scoreCountMap.get(u.id) || 0,
      };
    })
    .filter((u) => {
      if (!searchQuery) return true;
      return (
        u.name.toLowerCase().includes(searchQuery) ||
        u.email.toLowerCase().includes(searchQuery)
      );
    });

  return (
    <main className="p-6 md:p-12">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
          <div>
            <h1 className="text-3xl font-bold font-heading text-foreground">
              User Management
            </h1>
            <p className="text-sm text-muted-foreground">
              View subscribers, manage scores, and administer accounts
            </p>
          </div>
        </header>

        {/* Search Bar */}
        <form className="flex items-center gap-2 max-w-sm">
          <Input
            name="q"
            defaultValue={searchParams?.q || ""}
            placeholder="Search by name or email..."
            className="h-9"
          />
          <Button type="submit" size="sm" variant="outline">
            Search
          </Button>
          {searchQuery && (
            <Button asChild size="sm" variant="ghost">
              <Link href="/admin/users">Clear</Link>
            </Button>
          )}
        </form>

        {/* Users Table */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-xl">Users ({userRows.length})</CardTitle>
            <CardDescription>
              Click any user to view details, update charity, edit scores, or manage subscriptions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {userRows.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                No users found matching &quot;{searchQuery}&quot;.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border text-xs uppercase text-muted-foreground font-semibold">
                      <th className="py-2.5 px-3">Name</th>
                      <th className="py-2.5 px-3">Email</th>
                      <th className="py-2.5 px-3">Role</th>
                      <th className="py-2.5 px-3">Charity</th>
                      <th className="py-2.5 px-3">Subscription</th>
                      <th className="py-2.5 px-3">Scores</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {userRows.map((u) => (
                      <tr key={u.id} className="hover:bg-muted/30">
                        <td className="py-3 px-3 font-medium text-foreground">
                          {u.name}
                        </td>
                        <td className="py-3 px-3 text-muted-foreground">
                          {u.email}
                        </td>
                        <td className="py-3 px-3 capitalize">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                              u.role === "admin"
                                ? "bg-primary/10 text-primary"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-foreground">
                          {u.charityName}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-semibold capitalize ${
                              u.subStatus === "active"
                                ? "bg-success/15 text-success"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {u.subStatus}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-semibold text-foreground">
                          {u.scoresCount}/5
                        </td>
                        <td className="py-3 px-3 text-right">
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/admin/users/${u.id}`}>Edit</Link>
                          </Button>
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
