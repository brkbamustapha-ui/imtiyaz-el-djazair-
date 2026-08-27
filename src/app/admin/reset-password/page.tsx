import type { Metadata } from "next";
import Link from "next/link";
import { ResetPasswordForm } from "@/components/admin/PasswordForms";

export const metadata: Metadata = { title: "Set a new password" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <div className="flex min-h-svh items-center justify-center px-4 py-12">
      <div className="w-full max-w-[400px]">
        <div className="mb-8 flex flex-col items-center text-center">
          <h1 className="mt-5 text-lg font-bold">Choose a new password</h1>
        </div>
        <div className="a-card a-card-pad">
          <ResetPasswordForm token={token ?? ""} />
        </div>
        <p className="mt-6 text-center text-xs text-[var(--a-muted)]">
          <Link href="/admin/login" className="hover:text-[var(--a-text)]">
            ← Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
