import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "@/components/admin/LoginForm";
import { LogoMark } from "@/components/public/Logo";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  if (await getCurrentUser()) redirect("/admin");
  const { next } = await searchParams;

  return (
    <div className="flex min-h-svh items-center justify-center px-4 py-12">
      <div className="w-full max-w-[400px]">
        <div className="mb-8 flex flex-col items-center text-center">
          <LogoMark className="h-14 w-auto" />
          <h1 className="mt-5 text-xl font-bold">Imtiyaz El Djazair</h1>
          <p className="mt-1 text-sm text-[var(--a-muted)]">Sign in to the control panel</p>
        </div>

        <div className="a-card a-card-pad">
          <LoginForm next={next} />
        </div>

        <p className="mt-6 text-center text-xs text-[var(--a-muted)]">
          <Link href="/" className="hover:text-[var(--a-text)]">
            ← Back to the website
          </Link>
        </p>
      </div>
    </div>
  );
}
