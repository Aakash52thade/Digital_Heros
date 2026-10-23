import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

/**
 * Server component highlighting one active featured charity.
 */
export async function FeaturedCharity() {
  const supabase = await createClient();

  const { data: charity } = await supabase
    .from("charities")
    .select("name, slug, description, image_url, category")
    .eq("is_active", true)
    .eq("is_featured", true)
    .limit(1)
    .maybeSingle();

  if (!charity) {
    return null;
  }

  return (
    <Card className="max-w-xl mx-auto border-primary/20 bg-card overflow-hidden text-left shadow-sm">
      {charity.image_url && (
        <div className="h-48 w-full bg-muted overflow-hidden relative">
          <img
            src={charity.image_url}
            alt={charity.name}
            className="w-full h-full object-cover"
          />
          <span className="absolute top-3 right-3 bg-accent text-accent-foreground text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
            Featured Partner
          </span>
        </div>
      )}
      <CardHeader className="pb-2">
        {charity.category && (
          <span className="text-[11px] font-semibold text-primary uppercase tracking-wider">
            {charity.category}
          </span>
        )}
        <CardTitle className="text-2xl">{charity.name}</CardTitle>
        <CardDescription className="line-clamp-2">
          {charity.description}
        </CardDescription>
      </CardHeader>
      <CardFooter className="pt-2 flex justify-between items-center">
        <Button asChild variant="outline" size="sm">
          <Link href={`/charities/${charity.slug}`}>View Cause & Donate</Link>
        </Button>
        <Link
          href="/charities"
          className="text-xs text-primary font-medium hover:underline"
        >
          Browse all causes →
        </Link>
      </CardFooter>
    </Card>
  );
}
