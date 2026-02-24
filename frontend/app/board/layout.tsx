"use client";

import { Suspense } from "react";

// Wrapper to handle search params properly with Suspense
export default function BoardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-screen items-center justify-center bg-bg">
          <div className="flex flex-col items-center justify-center gap-4 text-center">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-accent border-t-transparent"></div>
            <p className="text-base font-medium text-text">Loading board...</p>
          </div>
        </div>
      }
    >
      {children}
    </Suspense>
  );
}
