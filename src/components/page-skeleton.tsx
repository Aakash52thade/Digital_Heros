import React from "react";

export function PageSkeleton() {
  return (
    <div className="w-full max-w-6xl mx-auto p-6 md:p-12 space-y-8 animate-pulse" aria-busy="true">
      <div className="space-y-3">
        <div className="h-8 w-48 bg-muted rounded" />
        <div className="h-4 w-72 bg-muted/70 rounded" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="h-48 rounded-lg bg-muted border border-border" />
        <div className="h-48 rounded-lg bg-muted border border-border" />
        <div className="h-48 rounded-lg bg-muted border border-border" />
      </div>

      <div className="space-y-4 pt-4">
        <div className="h-6 w-36 bg-muted rounded" />
        <div className="h-32 rounded-lg bg-muted border border-border" />
      </div>
    </div>
  );
}

export default PageSkeleton;
