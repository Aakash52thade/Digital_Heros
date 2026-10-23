"use client";

import { useState } from "react";
import { deleteCharityAction } from "./actions";
import { Button } from "@/components/ui/button";

export function DeleteCharityButton({
  charityId,
  charityName,
}: {
  charityId: string;
  charityName: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setIsPending(true);
    setError(null);
    const fd = new FormData();
    fd.append("id", charityId);
    const res = await deleteCharityAction(fd);
    if (!res.success) {
      setError(res.error);
      setIsPending(false);
      setConfirming(false);
    }
  }

  return (
    <div className="space-y-2">
      {error && (
        <div className="p-3 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-md font-medium">
          {error}
        </div>
      )}

      {confirming ? (
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={isPending}
            onClick={handleDelete}
          >
            {isPending ? "Deleting..." : "Confirm Delete"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isPending}
            onClick={() => setConfirming(false)}
          >
            Cancel
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="text-destructive hover:bg-destructive/10"
          onClick={() => setConfirming(true)}
        >
          Delete Charity
        </Button>
      )}
    </div>
  );
}
