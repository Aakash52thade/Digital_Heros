import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { createDonationCheckoutAction, setAsMyCharityAction } from "./donation-actions";

interface CharityDetailPageProps {
  params: {
    slug: string;
  };
  searchParams?: {
    donated?: string;
  };
}

export default async function CharityDetailPage({
  params,
  searchParams,
}: CharityDetailPageProps) {
  const supabase = await createClient();

  // Fetch charity
  const { data: charity } = await supabase
    .from("charities")
    .select("*")
    .eq("slug", decodeURIComponent(params.slug))
    .eq("is_active", true)
    .maybeSingle();

  if (!charity) {
    notFound();
  }

  // Fetch current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch upcoming events
  const todayISO = new Date().toISOString();
  const { data: events } = await supabase
    .from("charity_events")
    .select("id, title, description, event_date, location")
    .eq("charity_id", charity.id)
    .gte("event_date", todayISO)
    .order("event_date", { ascending: true });

  const galleryList: string[] = charity.gallery || [];

  return (
    <main className="min-h-screen bg-background py-12 px-6 sm:px-8">
      <div className="max-w-4xl mx-auto space-y-10">
        <div className="flex items-center justify-between">
          <Link
            href="/charities"
            className="text-sm font-medium text-primary hover:underline"
          >
            ← Back to All Charities
          </Link>
          {user && (
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard">Dashboard</Link>
            </Button>
          )}
        </div>

        {searchParams?.donated === "1" && (
          <div className="rounded-lg bg-success/15 border border-success/30 p-4 text-success font-medium text-center">
            🎉 Thank you for your generous contribution to {charity.name}!
          </div>
        )}

        {/* Hero Banner */}
        <div className="space-y-4">
          {charity.image_url && (
            <div className="w-full h-72 sm:h-96 rounded-xl overflow-hidden bg-muted relative">
              <img
                src={charity.image_url}
                alt={charity.name}
                className="w-full h-full object-cover"
              />
              {charity.is_featured && (
                <span className="absolute top-4 right-4 bg-accent text-accent-foreground text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                  Featured Partner
                </span>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
            <div>
              {charity.category && (
                <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                  {charity.category}
                </span>
              )}
              <h1 className="text-4xl font-extrabold font-heading text-foreground">
                {charity.name}
              </h1>
            </div>

            {/* Support this charity button */}
            {user ? (
              <form action={setAsMyCharityAction}>
                <input type="hidden" name="charityId" value={charity.id} />
                <Button type="submit" variant="accent" size="lg">
                  Set as My Supported Charity
                </Button>
              </form>
            ) : (
              <Button asChild variant="accent" size="lg">
                <Link href={`/signup?charity=${charity.slug}`}>
                  Support this Charity
                </Link>
              </Button>
            )}
          </div>

          <p className="text-lg text-muted-foreground leading-relaxed whitespace-pre-line pt-2">
            {charity.description}
          </p>
        </div>

        {/* Gallery */}
        {galleryList.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold font-heading text-foreground">Gallery</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {galleryList.map((imgUrl, idx) => (
                <div key={idx} className="h-44 rounded-lg overflow-hidden bg-muted">
                  <img
                    src={imgUrl}
                    alt={`${charity.name} gallery photo ${idx + 1}`}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upcoming Events */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold font-heading text-foreground">
            Upcoming Events
          </h2>
          {!events || events.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">
              No upcoming events scheduled right now.
            </p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {events.map((evt) => (
                <Card key={evt.id} className="border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{evt.title}</CardTitle>
                    {evt.event_date && (
                      <CardDescription>
                        {new Date(evt.event_date).toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {evt.location && (
                      <p className="text-xs font-semibold text-primary">
                        📍 {evt.location}
                      </p>
                    )}
                    <p className="text-muted-foreground">{evt.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Independent One-Off Donation Section (SPEC A14) */}
        <Card className="border-primary/30 shadow-sm bg-card">
          <CardHeader>
            <CardTitle className="text-2xl">Make a One-Off Donation</CardTitle>
            <CardDescription>
              Direct independent contribution supporting {charity.name}. Anyone can donate (guests welcome);
              donations go directly to the charity and are not part of the monthly prize pool.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={createDonationCheckoutAction} className="space-y-4">
              <input type="hidden" name="charityId" value={charity.id} />
              <input type="hidden" name="charitySlug" value={charity.slug} />
              <div className="space-y-2 max-w-xs">
                <Label htmlFor="amountRupees">Donation Amount (INR ₹)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-muted-foreground font-semibold">
                    ₹
                  </span>
                  <Input
                    id="amountRupees"
                    name="amountRupees"
                    type="number"
                    min={100}
                    max={100000}
                    defaultValue={500}
                    required
                    className="pl-8"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Min ₹100 (10,000 paise) to Max ₹1,00,000 (10,000,000 paise).
                </p>
              </div>
              <Button type="submit" variant="accent">
                Proceed to Stripe Donation
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
