"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { updateCharitySettingsAction } from "./charity-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CharityOption {
  id: string;
  name: string;
}

interface CharityCardFormProps {
  charities: CharityOption[];
  currentCharityId: string;
  currentCharityPercent: number;
  minPercent: number;
  maxPercent: number;
}

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="accent" size="sm" disabled={pending}>
      {pending ? "Saving..." : "Update Charity & %"}
    </Button>
  );
}

export function CharityCardForm({
  charities,
  currentCharityId,
  currentCharityPercent,
  minPercent,
  maxPercent,
}: CharityCardFormProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [percent, setPercent] = useState<number>(currentCharityPercent);
  const [state, formAction] = useFormState(async (prev: any, formData: FormData) => {
    const res = await updateCharitySettingsAction(prev, formData);
    if (res?.success) setIsEditing(false);
    return res;
  }, undefined);

  if (!isEditing) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsEditing(true)}
      >
        Change Charity or %
      </Button>
    );
  }

  return (
    <form action={formAction} className="space-y-4 pt-2">
      {state?.error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 p-2 text-xs text-destructive font-medium">
          {state.error}
        </div>
      )}
      {state?.success && (
        <div className="rounded-md bg-success/10 border border-success/20 p-2 text-xs text-success font-medium">
          {state.success}
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="charityId" className="text-xs">
          Select Charity
        </Label>
        <select
          id="charityId"
          name="charityId"
          defaultValue={currentCharityId}
          required
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {charities.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center text-xs">
          <Label htmlFor="charityPercent">Donation Percentage</Label>
          <span className="font-bold text-primary">{percent}%</span>
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
        <p className="text-[11px] text-muted-foreground">
          Allowed range: {minPercent}% to {maxPercent}%.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <SaveButton />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setIsEditing(false)}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
