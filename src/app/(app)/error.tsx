"use client";

export default function AppError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="card mx-auto max-w-lg p-8 text-center">
      <h2 className="text-xl font-bold">That didn&apos;t work</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {error.message && !error.message.includes("digest") ? error.message : "Something went wrong."}
      </p>
      <button className="btn-primary mt-6" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
