"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center space-y-6">
      <div className="space-y-2 max-w-md">
        <h1 className="text-3xl font-extrabold font-heading text-foreground">
          Something went wrong
        </h1>
        <p className="text-sm text-muted-foreground">
          We encountered an unexpected error. Please try again or head back to safety.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-4">
        <Button onClick={() => reset()} variant="default">
          Try again
        </Button>
        <Button asChild variant="outline">
          <Link href="/">Go home</Link>
        </Button>
      </div>
    </div>
  );
}
