"use client";

import { useFormState, useFormStatus } from "react-dom";
import { updateNameAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving..." : "Save Changes"}
    </Button>
  );
}

export function SettingsForm({ initialName }: { initialName: string }) {
  const [state, formAction] = useFormState(updateNameAction, undefined);

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive font-medium">
          {state.error}
        </div>
      )}
      {state?.success && (
        <div className="rounded-md bg-success/10 border border-success/20 p-3 text-sm text-success font-medium">
          {state.success}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="fullName">Full Name</Label>
        <Input
          id="fullName"
          name="fullName"
          defaultValue={initialName}
          required
          placeholder="Enter your full name"
        />
      </div>

      <SaveButton />
    </form>
  );
}
