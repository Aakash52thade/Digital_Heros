import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  updateCharityAction,
  addGalleryImageAction,
  removeGalleryImageAction,
  addEventAction,
  deleteEventAction,
} from "../actions";
import { DeleteCharityButton } from "../delete-button";
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
  title: "Edit Charity - Digital Heroes Admin",
};

interface EditCharityPageProps {
  params: {
    id: string;
  };
}

export default async function EditCharityPage({ params }: EditCharityPageProps) {
  await requireAdmin();
  const adminClient = createAdminClient();

  const charityId = params.id;

  // 1. Fetch charity details
  const { data: charity, error } = await adminClient
    .from("charities")
    .select("*")
    .eq("id", charityId)
    .single();

  if (error || !charity) {
    notFound();
  }

  // 2. Fetch events
  const { data: events } = await adminClient
    .from("charity_events")
    .select("*")
    .eq("charity_id", charityId)
    .order("event_date", { ascending: true });

  const gallery = (charity.gallery || []) as string[];

  return (
    <main className="p-6 md:p-12">
      <div className="max-w-5xl mx-auto space-y-8">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
          <div>
            <h1 className="text-3xl font-bold font-heading text-foreground">
              {charity.name}
            </h1>
            <p className="text-sm text-muted-foreground">
              Slug: /charities/{charity.slug}
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/admin/charities">&larr; Charities</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href={`/charities/${charity.slug}`} target="_blank">
                Public Page &rarr;
              </Link>
            </Button>
          </div>
        </header>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Main Edit Form */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-xl">Charity Information</CardTitle>
              <CardDescription>Update organization details and cover image</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={updateCharityAction} className="space-y-4">
                <input type="hidden" name="id" value={charity.id} />

                <div className="space-y-1.5">
                  <Label htmlFor="name">Name *</Label>
                  <Input id="name" name="name" defaultValue={charity.name} required />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="slug">Slug *</Label>
                  <Input id="slug" name="slug" defaultValue={charity.slug} required />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="category">Category</Label>
                  <Input id="category" name="category" defaultValue={charity.category || ""} />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="description">Description</Label>
                  <textarea
                    id="description"
                    name="description"
                    defaultValue={charity.description || ""}
                    rows={4}
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="imageFile">Cover Image (Upload or URL)</Label>
                  {charity.image_url && (
                    <div className="mb-2">
                      <img
                        src={charity.image_url}
                        alt="Current cover"
                        className="h-24 w-auto object-cover rounded-md border border-border"
                      />
                    </div>
                  )}
                  <input
                    id="imageFile"
                    name="imageFile"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="text-xs text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:opacity-90 block mb-2"
                  />
                  <Input
                    id="imageUrl"
                    name="imageUrl"
                    defaultValue={charity.image_url || ""}
                    placeholder="Or enter direct image URL"
                  />
                </div>

                <div className="flex items-center gap-6 pt-2">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      name="isFeatured"
                      value="true"
                      defaultChecked={Boolean(charity.is_featured)}
                      className="rounded border-input"
                    />
                    Featured
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      name="isActive"
                      value="true"
                      defaultChecked={Boolean(charity.is_active)}
                      className="rounded border-input"
                    />
                    Active
                  </label>
                </div>

                <Button type="submit" className="w-full">
                  Save Changes
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Gallery Media */}
          <div className="space-y-6">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-xl">Gallery Images</CardTitle>
                <CardDescription>
                  Upload additional photos to public bucket `charity-media` (max 2 MB)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <form action={addGalleryImageAction} className="flex items-center gap-2">
                  <input type="hidden" name="charityId" value={charity.id} />
                  <input
                    name="galleryFile"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    required
                    className="text-xs text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:opacity-90"
                  />
                  <Button type="submit" size="sm">
                    Upload
                  </Button>
                </form>

                {gallery.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No gallery images uploaded yet.</p>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {gallery.map((url, idx) => (
                      <div key={idx} className="relative group rounded-md overflow-hidden border border-border">
                        <img src={url} alt={`Gallery ${idx}`} className="h-20 w-full object-cover" />
                        <form
                          action={removeGalleryImageAction}
                          className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <input type="hidden" name="charityId" value={charity.id} />
                          <input type="hidden" name="imageUrl" value={url} />
                          <Button type="submit" variant="destructive" size="sm" className="h-7 text-xs">
                            Remove
                          </Button>
                        </form>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Danger Zone: Delete */}
            <Card className="border-border border-destructive/20">
              <CardHeader>
                <CardTitle className="text-lg">Delete Charity</CardTitle>
                <CardDescription>
                  Permanently remove charity if not referenced by active subscriptions or payments
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DeleteCharityButton
                  charityId={charity.id}
                  charityName={charity.name}
                />
              </CardContent>
            </Card>
          </div>

          {/* Events Management */}
          <Card className="border-border md:col-span-2">
            <CardHeader>
              <CardTitle className="text-xl">Charity Events</CardTitle>
              <CardDescription>
                Schedule upcoming events and fundraising opportunities displayed on the public page
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Add event form */}
              <form action={addEventAction} className="p-4 rounded-md bg-muted/30 border border-border space-y-3">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Add New Event</p>
                <input type="hidden" name="charityId" value={charity.id} />
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="title" className="text-xs">Title *</Label>
                    <Input id="title" name="title" required placeholder="Event name" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="eventDate" className="text-xs">Event Date & Time *</Label>
                    <Input id="eventDate" name="eventDate" type="datetime-local" required />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="location" className="text-xs">Location</Label>
                    <Input id="location" name="location" placeholder="e.g. Mumbai Golf Club" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="eventDesc" className="text-xs">Description</Label>
                    <Input id="eventDesc" name="description" placeholder="Brief details" />
                  </div>
                </div>
                <Button type="submit" size="sm">
                  Add Event
                </Button>
              </form>

              {/* Event list */}
              {(!events || events.length === 0) ? (
                <p className="text-xs text-muted-foreground text-center py-4">No events scheduled.</p>
              ) : (
                <div className="divide-y divide-border">
                  {events.map((ev) => (
                    <div key={ev.id} className="py-3 flex items-center justify-between gap-4">
                      <div>
                        <p className="font-semibold text-sm text-foreground">{ev.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(ev.event_date).toLocaleString()} &bull; {ev.location || "Online"}
                        </p>
                        {ev.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">{ev.description}</p>
                        )}
                      </div>
                      <form action={deleteEventAction}>
                        <input type="hidden" name="eventId" value={ev.id} />
                        <input type="hidden" name="charityId" value={charity.id} />
                        <Button type="submit" variant="ghost" size="sm" className="text-destructive h-8 px-2">
                          Delete
                        </Button>
                      </form>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
