import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export const metadata = {
  title: "Charities - Digital Heroes",
  description: "Explore our verified partner charities and causes",
};

interface CharitiesPageProps {
  searchParams?: {
    q?: string;
    category?: string;
    featured?: string;
  };
}

export default async function CharitiesPage({ searchParams }: CharitiesPageProps) {
  const supabase = await createClient();

  // Fetch all active charities
  let query = supabase
    .from("charities")
    .select("id, name, slug, description, image_url, category, is_featured")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (searchParams?.featured === "true") {
    query = query.eq("is_featured", true);
  }

  if (searchParams?.category && searchParams.category !== "All") {
    query = query.eq("category", searchParams.category);
  }

  const { data: rawCharities } = await query;

  let charities = rawCharities || [];

  // In-memory or ILIKE query search filter
  if (searchParams?.q) {
    const qLower = searchParams.q.toLowerCase();
    charities = charities.filter(
      (c) =>
        c.name.toLowerCase().includes(qLower) ||
        (c.description && c.description.toLowerCase().includes(qLower))
    );
  }

  // Get distinct categories
  const { data: allCategoriesData } = await supabase
    .from("charities")
    .select("category")
    .eq("is_active", true);

  const categoriesSet = new Set<string>();
  allCategoriesData?.forEach((c) => {
    if (c.category) categoriesSet.add(c.category);
  });
  const categories = ["All", ...Array.from(categoriesSet)];

  const currentCategory = searchParams?.category || "All";
  const isFeaturedOnly = searchParams?.featured === "true";

  return (
    <main className="min-h-screen bg-background py-12 px-6 sm:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 text-xs font-semibold uppercase tracking-wider rounded-full bg-muted text-primary mb-2">
              Our Causes
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight font-heading text-foreground sm:text-5xl">
              Partner Charities
            </h1>
            <p className="text-muted-foreground mt-1 max-w-2xl">
              Every month, 10% to 50% of your membership fee directly empowers these vetted community initiatives.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button asChild variant="outline">
              <Link href="/dashboard">Dashboard</Link>
            </Button>
          </div>
        </header>

        {/* Filter controls */}
        <div className="space-y-4">
          <form method="GET" className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[240px]">
              <Input
                name="q"
                type="search"
                placeholder="Search charities by name or cause..."
                defaultValue={searchParams?.q || ""}
              />
            </div>
            {searchParams?.category && (
              <input type="hidden" name="category" value={searchParams.category} />
            )}
            {searchParams?.featured && (
              <input type="hidden" name="featured" value={searchParams.featured} />
            )}
            <Button type="submit" variant="default">
              Search
            </Button>
          </form>

          {/* Category chips and Featured toggle */}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            {categories.map((cat) => {
              const isActive = currentCategory === cat;
              const params = new URLSearchParams();
              if (searchParams?.q) params.set("q", searchParams.q);
              if (cat !== "All") params.set("category", cat);
              if (isFeaturedOnly) params.set("featured", "true");

              return (
                <Link
                  key={cat}
                  href={`/charities?${params.toString()}`}
                  className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors border ${
                    isActive
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-foreground border-border hover:bg-muted"
                  }`}
                >
                  {cat}
                </Link>
              );
            })}

            {/* Featured toggle */}
            <Link
              href={
                isFeaturedOnly
                  ? `/charities?${(() => {
                      const p = new URLSearchParams();
                      if (searchParams?.q) p.set("q", searchParams.q);
                      if (searchParams?.category) p.set("category", searchParams.category);
                      return p.toString();
                    })()}`
                  : `/charities?${(() => {
                      const p = new URLSearchParams();
                      if (searchParams?.q) p.set("q", searchParams.q);
                      if (searchParams?.category) p.set("category", searchParams.category);
                      p.set("featured", "true");
                      return p.toString();
                    })()}`
              }
              className={`text-xs px-3 py-1.5 rounded-full font-semibold transition-colors border ${
                isFeaturedOnly
                  ? "bg-accent text-accent-foreground border-accent"
                  : "bg-card text-foreground border-border hover:bg-muted"
              }`}
            >
              ★ Featured Only
            </Link>
          </div>
        </div>

        {/* Charity grid */}
        {charities.length === 0 ? (
          <div className="text-center py-16 bg-card border border-border rounded-lg">
            <p className="text-lg font-medium text-foreground">No charities match your search.</p>
            <p className="text-sm text-muted-foreground mt-1">
              Try adjusting your search terms or category filters.
            </p>
            <Button asChild variant="outline" className="mt-4">
              <Link href="/charities">Clear Filters</Link>
            </Button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {charities.map((charity) => (
              <Card
                key={charity.id}
                className="flex flex-col justify-between border-border overflow-hidden hover:shadow-md transition-shadow"
              >
                <div>
                  {charity.image_url && (
                    <div className="h-44 w-full bg-muted overflow-hidden relative">
                      <img
                        src={charity.image_url}
                        alt={charity.name}
                        className="w-full h-full object-cover"
                      />
                      {charity.is_featured && (
                        <span className="absolute top-3 right-3 bg-accent text-accent-foreground text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                          Featured
                        </span>
                      )}
                    </div>
                  )}
                  <CardHeader className="pb-2">
                    {charity.category && (
                      <span className="text-[11px] font-semibold text-primary uppercase tracking-wider">
                        {charity.category}
                      </span>
                    )}
                    <CardTitle className="text-xl line-clamp-1">{charity.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {charity.description}
                    </p>
                  </CardContent>
                </div>
                <CardFooter className="pt-2 border-t border-border/50">
                  <Button asChild variant="outline" className="w-full" size="sm">
                    <Link href={`/charities/${charity.slug}`}>Learn More & Support</Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
