import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-3xl font-bold">SiteTrack</h1>
      <p className="text-muted-foreground">Construction site expense and vendor management</p>
      <Link href="/login" className="rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground">
        Sign in
      </Link>
    </main>
  );
}
