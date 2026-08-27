"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Server details are deliberately not shown to the visitor.
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-5 px-6 text-center">
      <h1 className="h2">Something went wrong</h1>
      <p className="lead max-w-md">
        The page could not be displayed. Please try again — if the problem continues, contact the
        site administrator.
      </p>
      <button type="button" onClick={reset} className="btn btn-primary mt-2">
        Try again
      </button>
    </main>
  );
}
