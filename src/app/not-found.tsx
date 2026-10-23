import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFoundPage() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center space-y-6">
      <div className="space-y-2 max-w-md">
        <span className="text-xs font-semibold uppercase tracking-widest text-accent">
          404 Not Found
        </span>
        <h1 className="text-4xl font-extrabold font-heading text-foreground">
          We could not find that page
        </h1>
        <p className="text-sm text-muted-foreground">
          The page you requested may have moved or no longer exists.
        </p>
      </div>

      <Button asChild variant="accent">
        <Link href="/">Back to Home</Link>
      </Button>
    </div>
  );
}
