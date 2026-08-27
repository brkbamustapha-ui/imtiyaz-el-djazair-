import Link from "next/link";
import { LogoMark } from "@/components/public/Logo";

export default function NotFound() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 px-6 text-center">
      <LogoMark className="h-20 w-auto opacity-80" simple />
      <p className="font-display text-6xl font-black text-[var(--c-accent)]">404</p>
      <h1 className="h2 max-w-md text-balance">This page could not be found</h1>
      <p className="lead max-w-md">
        The link may be out of date, or the page may have been unpublished from the admin.
      </p>
      <div className="mt-2 flex flex-wrap justify-center gap-3">
        <Link href="/" className="btn btn-primary">
          Back to home
        </Link>
        <Link href="/contact" className="btn btn-secondary">
          Contact us
        </Link>
      </div>
    </main>
  );
}
