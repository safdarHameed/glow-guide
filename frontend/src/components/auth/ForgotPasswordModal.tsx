"use client";

import { MailCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Overlay";
import { ApiError } from "@/lib/api";
import { authApi } from "@/lib/auth";
import { validateEmail } from "./validation";

export function ForgotPasswordModal({ open, onClose, initialEmail }: { open: boolean; onClose: () => void; initialEmail: string }) {
  const [email, setEmail] = useState(initialEmail);
  const [touched, setTouched] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setEmail(initialEmail);
      setSent(false);
      setError(null);
      setTouched(false);
    }
  }, [open, initialEmail]);

  const emailError = validateEmail(email);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (emailError) return;
    setSending(true);
    setError(null);
    try {
      await authApi.forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={sent ? "Check your inbox" : "Reset your password"} size="sm">
      {sent ? (
        <div className="text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-500">
            <MailCheck size={26} />
          </span>
          <p className="mt-4 text-sm text-ink-soft">
            If an account exists for <span className="font-medium text-ink">{email}</span>, we&apos;ve sent a link to reset your
            password. It expires in 30 minutes.
          </p>
          <Button className="mt-6 w-full" onClick={onClose}>
            Back to log in
          </Button>
        </div>
      ) : (
        <form onSubmit={submit} noValidate>
          <p className="mb-4 text-sm text-ink-soft">Enter the email you signed up with and we&apos;ll send you a reset link.</p>
          <Field
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => setTouched(true)}
            error={touched ? emailError : null}
            autoFocus
          />
          {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
          <Button type="submit" className="mt-5 w-full" loading={sending} disabled={Boolean(emailError)}>
            {sending ? "Sending…" : "Send reset link"}
          </Button>
        </form>
      )}
    </Modal>
  );
}
