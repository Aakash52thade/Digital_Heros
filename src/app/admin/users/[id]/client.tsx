"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import {
  updateUserProfileAction,
  addAdminScoreAction,
  editAdminScoreAction,
  deleteAdminScoreAction,
  cancelSubscriptionAction,
  resumeSubscriptionAction,
} from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function SubmitBtn({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} size="sm">
      {pending ? "Saving..." : label}
    </Button>
  );
}

export function EditProfileForm({
  userId,
  initialName,
  initialCharityId,
  initialPercent,
  charities,
  minPercent,
  maxPercent,
}: {
  userId: string;
  initialName: string;
  initialCharityId: string;
  initialPercent: number;
  charities: { id: string; name: string }[];
  minPercent: number;
  maxPercent: number;
}) {
  const [percent, setPercent] = useState(initialPercent);
  const [state, formAction] = useFormState(updateUserProfileAction, undefined);

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && (
        <div className="p-3 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-md font-medium">
          {state.error}
        </div>
      )}
      {state?.success && (
        <div className="p-3 text-xs text-success bg-success/10 border border-success/20 rounded-md font-medium">
          {state.success}
        </div>
      )}

      <input type="hidden" name="userId" value={userId} />

      <div className="space-y-1.5">
        <Label htmlFor="fullName">Full Name</Label>
        <Input id="fullName" name="fullName" defaultValue={initialName} required />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="charityId">Charity</Label>
        <select
          id="charityId"
          name="charityId"
          defaultValue={initialCharityId}
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

      <div className="space-y-1.5">
        <div className="flex justify-between items-center text-xs">
          <Label htmlFor="charityPercent">Charity Percentage</Label>
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

      <SubmitBtn label="Save Profile" />
    </form>
  );
}

export function AdminScoreManager({
  userId,
  scores,
  todayIST,
}: {
  userId: string;
  scores: { id: string; score: number; played_on: string }[];
  todayIST: string;
}) {
  const [addState, addAction] = useFormState(addAdminScoreAction, undefined);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      {/* Add score form */}
      <form action={addAction} className="p-4 rounded-md bg-muted/30 border border-border space-y-3">
        <p className="text-xs font-semibold uppercase text-muted-foreground">Add New Score</p>
        {addState?.error && (
          <div className="p-2 text-xs text-destructive bg-destructive/10 rounded-md">
            {addState.error}
          </div>
        )}
        {addState?.success && (
          <div className="p-2 text-xs text-success bg-success/10 rounded-md">
            {addState.success}
          </div>
        )}
        <input type="hidden" name="userId" value={userId} />
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label htmlFor="score" className="text-xs">Score (1-45)</Label>
            <Input id="score" name="score" type="number" min={1} max={45} required className="w-24" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="playedOn" className="text-xs">Played On</Label>
            <Input id="playedOn" name="playedOn" type="date" max={todayIST} required className="w-40" />
          </div>
          <SubmitBtn label="Add Score" />
        </div>
      </form>

      {/* Scores list */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left border-collapse">
          <thead>
            <tr className="border-b border-border text-xs uppercase text-muted-foreground font-semibold">
              <th className="py-2 px-3">Score</th>
              <th className="py-2 px-3">Date</th>
              <th className="py-2 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {scores.length === 0 ? (
              <tr>
                <td colSpan={3} className="py-3 text-center text-muted-foreground text-xs">
                  No scores recorded
                </td>
              </tr>
            ) : (
              scores.map((s) => (
                <tr key={s.id}>
                  <td className="py-2.5 px-3 font-bold text-foreground">{s.score}</td>
                  <td className="py-2.5 px-3 text-muted-foreground">{s.played_on}</td>
                  <td className="py-2.5 px-3 text-right space-x-2">
                    <form action={deleteAdminScoreAction} className="inline-block">
                      <input type="hidden" name="id" value={s.id} />
                      <input type="hidden" name="userId" value={userId} />
                      <Button type="submit" variant="ghost" size="sm" className="text-destructive h-7 px-2">
                        Delete
                      </Button>
                    </form>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function SubscriptionControls({
  userId,
  stripeSubId,
  cancelsAtEnd,
  status,
}: {
  userId: string;
  stripeSubId: string;
  cancelsAtEnd: boolean;
  status: string;
}) {
  return (
    <div className="flex flex-wrap gap-2 pt-2">
      {status === "active" && !cancelsAtEnd && (
        <>
          <form action={cancelSubscriptionAction}>
            <input type="hidden" name="userId" value={userId} />
            <input type="hidden" name="stripeSubscriptionId" value={stripeSubId} />
            <input type="hidden" name="immediate" value="false" />
            <Button type="submit" variant="outline" size="sm">
              Cancel at Period End
            </Button>
          </form>
          <form action={cancelSubscriptionAction}>
            <input type="hidden" name="userId" value={userId} />
            <input type="hidden" name="stripeSubscriptionId" value={stripeSubId} />
            <input type="hidden" name="immediate" value="true" />
            <Button type="submit" variant="destructive" size="sm">
              Cancel Now
            </Button>
          </form>
        </>
      )}

      {status === "active" && cancelsAtEnd && (
        <form action={resumeSubscriptionAction}>
          <input type="hidden" name="userId" value={userId} />
          <input type="hidden" name="stripeSubscriptionId" value={stripeSubId} />
          <Button type="submit" variant="default" size="sm">
            Resume Subscription
          </Button>
        </form>
      )}
    </div>
  );
}
