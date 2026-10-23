"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { addScoreAction, editScoreAction, deleteScoreAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface ScoreRecord {
  id: string;
  score: number;
  played_on: string;
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="accent" disabled={pending} size="sm">
      {pending ? "Saving..." : label}
    </Button>
  );
}

export function ScoreRow({ score, maxDate }: { score: ScoreRecord; maxDate: string }) {
  const [isEditing, setIsEditing] = useState(false);
  const [state, formAction] = useFormState(async (prev: any, formData: FormData) => {
    const res = await editScoreAction(prev, formData);
    if (res?.success) setIsEditing(false);
    return res;
  }, undefined);

  if (isEditing) {
    return (
      <tr className="border-b border-border">
        <td colSpan={3} className="py-3 px-4">
          <form action={formAction} className="flex flex-wrap items-center gap-3">
            <input type="hidden" name="id" value={score.id} />
            <div>
              <Input
                name="score"
                type="number"
                min={1}
                max={45}
                defaultValue={score.score}
                required
                className="w-24 h-9"
              />
            </div>
            <div>
              <Input
                name="playedOn"
                type="date"
                max={maxDate}
                defaultValue={score.played_on}
                required
                className="h-9"
              />
            </div>
            <SubmitButton label="Update" />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(false)}
            >
              Cancel
            </Button>
            {state?.error && (
              <p className="text-xs text-destructive font-medium w-full">{state.error}</p>
            )}
          </form>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-border hover:bg-muted/40 transition-colors">
      <td className="py-3 px-4 font-semibold text-lg text-foreground">{score.score}</td>
      <td className="py-3 px-4 text-sm text-muted-foreground">
        {new Date(score.played_on).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}
      </td>
      <td className="py-3 px-4 text-right">
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
            Edit
          </Button>
          <form action={deleteScoreAction}>
            <input type="hidden" name="id" value={score.id} />
            <Button variant="outline" size="sm" type="submit">
              Delete
            </Button>
          </form>
        </div>
      </td>
    </tr>
  );
}

export function AddScoreForm({ maxDate }: { maxDate: string }) {
  const [state, formAction] = useFormState(addScoreAction, undefined);

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="text-xl">Record New Score</CardTitle>
        <CardDescription>
          Enter your Stableford score (1–45) and the date played.
        </CardDescription>
      </CardHeader>
      <CardContent>
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
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="score">Score (1–45)</Label>
              <Input
                id="score"
                name="score"
                type="number"
                min={1}
                max={45}
                placeholder="e.g. 36"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="playedOn">Date Played</Label>
              <Input
                id="playedOn"
                name="playedOn"
                type="date"
                max={maxDate}
                defaultValue={maxDate}
                required
              />
            </div>
          </div>
          <div className="pt-2">
            <SubmitButton label="Add Score" />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
