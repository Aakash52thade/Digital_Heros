import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { createCharityAction } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = {
  title: "New Charity - Digital Heroes Admin",
};

export default async function NewCharityPage() {
  await requireAdmin();

  return (
    <main className="p-6 md:p-12">
      <div className="max-w-2xl mx-auto space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
          <div>
            <h1 className="text-3xl font-bold font-heading text-foreground">
              New Charity Partner
            </h1>
            <p className="text-sm text-muted-foreground">
              Register a charitable organization for subscriber impact and donations
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/admin/charities">&larr; Back</Link>
          </Button>
        </header>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-xl">Charity Details</CardTitle>
            <CardDescription>
              Basic information, image branding, and visibility settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={createCharityAction} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Name *</Label>
                <Input id="name" name="name" required placeholder="e.g. Magic Bus Foundation" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="slug">Slug (auto-generated if left blank)</Label>
                <Input id="slug" name="slug" placeholder="e.g. magic-bus" />
                <p className="text-[11px] text-muted-foreground">
                  URL slug for the public charity page (e.g., /charities/magic-bus)
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="category">Category</Label>
                <Input id="category" name="category" placeholder="e.g. Education, Healthcare, Environment" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description">Description</Label>
                <textarea
                  id="description"
                  name="description"
                  rows={4}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="Summary of their mission and programs..."
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="imageFile">Cover Image (Upload or URL)</Label>
                <input
                  id="imageFile"
                  name="imageFile"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="text-xs text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:opacity-90 block mb-2"
                />
                <Input id="imageUrl" name="imageUrl" placeholder="Or enter direct image URL" />
              </div>

              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" name="isFeatured" value="true" className="rounded border-input" />
                  Featured Charity
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" name="isActive" value="true" defaultChecked className="rounded border-input" />
                  Active
                </label>
              </div>

              <Button type="submit" className="w-full">
                Create Charity
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
