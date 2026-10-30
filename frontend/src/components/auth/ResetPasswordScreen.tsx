"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, KeyRound } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Logo } from "@/components/ui/Logo";
import { ApiError } from "@/lib/api";
import { authApi } from "@/lib/auth";
import { validateNewPassword } from "./validation";

export function ResetPasswordScreen() {
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [touched, setTouched] = useState({ password: false, confirm: false });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const passwordError = validateNewPassword(password);
  const confirmError = confirm !== password ? "Passwords don't match." : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ password: true, confirm: true });
    if (passwordError || confirmError) return;
    setSaving(true);
    setError(null);
    try {
      await authApi.resetPassword(token, password);
      router.replace("/auth?mode=login&reset=1");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-canvas px-4 py-8">
      <Logo />
      <div className="my-auto w-full max-w-md rounded-3xl border border-line bg-white p-7 shadow-[0_30px_60px_-40px_rgba(23,38,42,0.4)] sm:p-9">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-500">
          <KeyRound size={22} />
        </span>
        <h1 className="mt-5 font-serif text-3xl font-semibold text-ink">Choose a new password</h1>

        {!token ? (
          <>
            <p className="mt-2 text-sm text-muted">This reset link is missing its token. Request a new link from the log in page.</p>
            <Link href="/auth?mode=login" className="mt-6 inline-block text-sm font-semibold text-brand-600 hover:underline">
              Back to log in
            </Link>
          </>
        ) : (
          <form onSubmit={submit} noValidate className="mt-6 space-y-4">
            <p className="text-sm text-muted">You&apos;ll be signed out on other devices after the change.</p>
            <Field
              label="New password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, password: true }))}
              error={touched.password ? passwordError : null}
              hint="Use at least 8 characters."
              autoFocus
            />
            <Field
              label="Confirm new password"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, confirm: true }))}
              error={touched.confirm ? confirmError : null}
            />
            {error && (
              <p role="alert" className="flex items-start gap-2 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600">
                <AlertCircle size={17} className="mt-0.5 shrink-0" />
                <span>
                  {error}{" "}
                  <Link href="/auth?mode=login" className="font-semibold underline">
                    Request a new link
                  </Link>
                </span>
              </p>
            )}
            <Button type="submit" size="lg" className="w-full" loading={saving} disabled={Boolean(passwordError || confirmError)}>
              {saving ? "Saving…" : "Update password"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
