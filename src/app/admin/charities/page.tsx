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
  title: "Charity Management - Digital Heroes Admin",
};

export default async function AdminCharitiesPage() {
  await requireAdmin();
  const adminClient = createAdminClient();

  const { data: charities } = await adminClient
    .from("charities")
    .select("id, name, slug, category, is_featured, is_active, created_at")
    .order("name", { ascending: true });

  const charityList = charities || [];

  return (
    <main className="p-6 md:p-12">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
          <div>
            <h1 className="text-3xl font-bold font-heading text-foreground">
              Partner Charities
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage charity partners, impact categories, gallery media, and charity events
            </p>
          </div>
          <Button asChild>
            <Link href="/admin/charities/new">Add New Charity</Link>
          </Button>
        </header>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-xl">All Charities ({charityList.length})</CardTitle>
            <CardDescription>
              Charities available for subscriber donations and featured spotlights
            </CardDescription>
          </CardHeader>
          <CardContent>
            {charityList.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                No charities registered yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border text-xs uppercase text-muted-foreground font-semibold">
                      <th className="py-2.5 px-3">Name</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3">Featured</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {charityList.map((c) => (
                      <tr key={c.id}>
                        <td className="py-3 px-3 font-medium text-foreground">
                          {c.name}
                        </td>
                        <td className="py-3 px-3 text-muted-foreground">
                          {c.category || "General"}
                        </td>
                        <td className="py-3 px-3">
                          {c.is_featured ? (
                            <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-primary/15 text-primary">
                              Featured
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-semibold capitalize ${
                              c.is_active
                                ? "bg-success/15 text-success"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {c.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right space-x-2">
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/admin/charities/${c.id}`}>Edit</Link>
                          </Button>
                          <Button asChild variant="ghost" size="sm">
                            <Link href={`/charities/${c.slug}`} target="_blank">
                              View
                            </Link>
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
