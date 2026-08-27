import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "@/components/admin/PasswordForms";
import { LogoMark } from "@/components/public/Logo";

export const metadata: Metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-svh items-center justify-center px-4 py-12">
      <div className="w-full max-w-[400px]">
        <div className="mb-8 flex flex-col items-center text-center">
          <LogoMark className="h-12 w-auto" />
          <h1 className="mt-5 text-lg font-bold">Reset your password</h1>
          <p className="mt-1.5 text-sm text-[var(--a-muted)]">
            Enter the email address you use to sign in.
          </p>
        </div>
        <div className="a-card a-card-pad">
          <ForgotPasswordForm />
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
