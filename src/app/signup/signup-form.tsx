"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { signupAction } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface CharityOption {
  id: string;
  name: string;
  slug: string;
}

interface SignupFormProps {
  charities: CharityOption[];
  minPercent: number;
  maxPercent: number;
  preselectedCharityId?: string;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      className="w-full"
      variant="accent"
      disabled={pending}
    >
      {pending ? "Creating account..." : "Create Account"}
    </Button>
  );
}

export function SignupForm({
  charities,
  minPercent,
  maxPercent,
  preselectedCharityId,
}: SignupFormProps) {
  const [state, formAction] = useFormState(signupAction, undefined);
  const [percent, setPercent] = useState<number>(minPercent);

  return (
    <Card className="w-full max-w-md shadow-md border-border">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold">Join Digital Heroes</CardTitle>
        <CardDescription>
          Sign up to track scores, support charities, and enter the monthly prize draw
        </CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="space-y-4">
          {state?.error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive font-medium border border-destructive/20">
              {state.error}
            </div>
          )}
          {state?.success && (
            <div className="rounded-md bg-success/10 p-3 text-sm text-success font-medium border border-success/20">
              {state.success}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              name="fullName"
              type="text"
              placeholder="Alex Johnson"
              required
              autoComplete="name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="name@example.com"
              required
              autoComplete="email"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="At least 6 characters"
              required
              autoComplete="new-password"
            />
          </div>

          {/* Charity Selection */}
          <div className="space-y-2">
            <Label htmlFor="charityId">Choose Your Supported Charity</Label>
            <select
              id="charityId"
              name="charityId"
              required
              defaultValue={preselectedCharityId || (charities[0]?.id ?? "")}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {charities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Charity Donation Percentage Control */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
              <Label htmlFor="charityPercent">Charity Share of Fee</Label>
              <span className="font-semibold text-primary">{percent}%</span>
            </div>
            <Input
              id="charityPercent"
              name="charityPercent"
              type="range"
              min={minPercent}
              max={maxPercent}
              value={percent}
              onChange={(e) => setPercent(Number(e.target.value))}
              className="h-6 cursor-pointer"
            />
            <p className="text-xs text-muted-foreground">
              Between {minPercent}% and {maxPercent}% of your fee goes directly to your charity.
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <SubmitButton />
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-primary font-medium hover:underline"
            >
              Log in
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
