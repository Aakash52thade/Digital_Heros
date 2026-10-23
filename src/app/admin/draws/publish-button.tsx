"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { publishDrawAction } from "./actions";

interface PublishButtonProps {
  drawId: string;
}

export function PublishButton({ drawId }: PublishButtonProps) {
  const [confirming, setConfirming] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePublish() {
    setIsPending(true);
    setError(null);
    const fd = new FormData();
    fd.append("drawId", drawId);
    const res = await publishDrawAction(fd);
    if (!res.success) {
      setError(res.error);
      setIsPending(false);
      setConfirming(false);
    }
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        {error && <span className="text-xs text-destructive">{error}</span>}
        <Button
          type="button"
          variant="destructive"
          size="sm"
          disabled={isPending}
          onClick={handlePublish}
        >
          {isPending ? "Publishing..." : "Confirm Publish"}
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
    );
  }

  return (
    <Button
      type="button"
      variant="default"
      size="sm"
      onClick={() => setConfirming(true)}
    >
      Publish Draw
    </Button>
  );
}
