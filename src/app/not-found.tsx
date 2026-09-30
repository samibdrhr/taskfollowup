import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-4xl font-bold">Not found</h1>
      <p className="text-muted-foreground">That page doesn&apos;t exist or you don&apos;t have access to it.</p>
      <Link href="/" className="btn-primary">
        Go home
      </Link>
    </main>
  );
}
