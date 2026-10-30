"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { LogoMark } from "@/components/ui/Logo";
import { ApiError } from "@/lib/api";
import { authApi, safeNext } from "@/lib/auth";
import { routes } from "@/lib/routes";
import { AuthBrandPanel } from "./AuthBrandPanel";
import { ForgotPasswordModal } from "./ForgotPasswordModal";
import { GoogleButton } from "./GoogleButton";
import { validateEmail, validateLoginPassword, validateName, validateNewPassword } from "./validation";

type Mode = "signup" | "login";
type FieldName = "name" | "email" | "password";

/** S02: one screen for both actions. Google first for speed, email as fallback. */
export function AuthScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const mode: Mode = params.get("mode") === "login" ? "login" : "signup";
  const intent = params.get("intent");
  const next = safeNext(params.get("next"));
  const resetDone = params.get("reset") === "1";

  const [values, setValues] = useState({ name: "", email: "", password: "" });
  const [touched, setTouched] = useState<Record<FieldName, boolean>>({ name: false, email: false, password: false });
  const [serverFieldErrors, setServerFieldErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [emailInUse, setEmailInUse] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);

  const clientErrors: Record<FieldName, string | null> = {
    name: mode === "signup" ? validateName(values.name) : null,
    email: validateEmail(values.email),
    password: mode === "signup" ? validateNewPassword(values.password) : validateLoginPassword(values.password),
  };
  const isValid = !clientErrors.name && !clientErrors.email && !clientErrors.password;
  const errorFor = (f: FieldName) => serverFieldErrors[f] ?? (touched[f] ? clientErrors[f] : null);

  function switchMode(to: Mode) {
    const qs = new URLSearchParams(params.toString());
    qs.set("mode", to);
    router.replace(`/auth?${qs.toString()}`, { scroll: false });
    setFormError(null);
    setServerFieldErrors({});
    setEmailInUse(false);
    setTouched({ name: false, email: values.email !== "", password: false });
  }

  function update(field: FieldName, value: string) {
    setValues((v) => ({ ...v, [field]: value }));
    if (serverFieldErrors[field]) setServerFieldErrors((e) => ({ ...e, [field]: undefined }));
    if (field === "email") setEmailInUse(false);
    setFormError(null);
  }

  const goAfterAuth = useCallback(
    (isNewUser: boolean) => {
      if (isNewUser) router.replace(intent === "scan" ? "/onboarding?intent=scan" : "/onboarding");
      else router.replace(next ?? (intent === "scan" ? "/scan" : "/dashboard"));
    },
    [router, intent, next],
  );

  function handleError(err: unknown) {
    if (!(err instanceof ApiError)) {
      setFormError("Something went wrong. Please try again.");
      return;
    }
    if (err.code === "EMAIL_IN_USE") {
      setEmailInUse(true);
      setServerFieldErrors({ email: "An account with this email already exists." });
    } else if (err.code === "VALIDATION_ERROR" && err.fields) {
      setServerFieldErrors(err.fields as Partial<Record<FieldName, string>>);
    } else {
      setFormError(err.message);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ name: true, email: true, password: true });
    if (!isValid) return;
    setSubmitting(true);
    setFormError(null);
    try {
      const result =
        mode === "signup"
          ? await authApi.signup({ name: values.name.trim(), email: values.email.trim(), password: values.password })
          : await authApi.login({ email: values.email.trim(), password: values.password });
      goAfterAuth(result.isNewUser);
    } catch (err) {
      handleError(err);
      setSubmitting(false);
    }
  }

  const onGoogleCode = useCallback(
    async (code: string) => {
      setFormError(null);
      try {
        const result = await authApi.google(code);
        goAfterAuth(result.isNewUser);
      } catch (err) {
        setFormError(err instanceof ApiError ? err.message : "Google sign-in didn't work. Please try again.");
      }
    },
    [goAfterAuth],
  );

  return (
    <div className="grid min-h-screen bg-white lg:grid-cols-[1fr_1.05fr]">
      <AuthBrandPanel />

      <div className="flex flex-col px-5 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <Link href={routes.home} className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft hover:text-brand-600">
            <ArrowLeft size={16} /> Back to home
          </Link>
          <LogoMark className="h-9 w-9 lg:hidden" />
        </div>

        <div className="mx-auto my-auto w-full max-w-[420px] py-10">
          <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            {mode === "signup" ? "Create your account" : "Welcome back"}
          </h1>
          <p className="mt-2 text-sm text-muted">
            {mode === "signup"
              ? intent === "scan"
                ? "Create a free account so we can save your scan results."
                : "It's free. Takes less than a minute."
              : "Log in to see your plan for today's weather."}
          </p>

          <div role="tablist" className="mt-7 grid grid-cols-2 gap-1 rounded-full bg-canvas p-1">
            {(["signup", "login"] as const).map((m) => (
              <button
                key={m}
                role="tab"
                aria-selected={mode === m}
                onClick={() => switchMode(m)}
                className="relative rounded-full py-2.5 text-sm font-medium"
              >
                {mode === m && (
                  <motion.span layoutId="auth-tab" className="absolute inset-0 rounded-full bg-white shadow-sm" transition={{ type: "spring", stiffness: 400, damping: 34 }} />
                )}
                <span className={`relative ${mode === m ? "text-ink" : "text-muted"}`}>{m === "signup" ? "Create account" : "Log in"}</span>
              </button>
            ))}
          </div>

          {resetDone && mode === "login" && (
            <p className="mt-5 rounded-2xl bg-brand-50 px-4 py-3 text-sm text-brand-700">Your password has been updated. Log in with your new password.</p>
          )}

          <div className="mt-6">
            <GoogleButton disabled={submitting} onCode={onGoogleCode} onUnavailable={setFormError} />
          </div>

          <div className="my-6 flex items-center gap-3 text-xs text-muted">
            <span className="h-px flex-1 bg-line" /> or with email <span className="h-px flex-1 bg-line" />
          </div>

          <form onSubmit={submit} noValidate className="space-y-4">
            <AnimatePresence initial={false}>
              {mode === "signup" && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <Field
                    label="Full name"
                    autoComplete="name"
                    placeholder="Ayesha Khan"
                    value={values.name}
                    onChange={(e) => update("name", e.target.value)}
                    onBlur={() => setTouched((t) => ({ ...t, name: true }))}
                    error={errorFor("name")}
                    disabled={submitting}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <Field
              label="Email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={values.email}
              onChange={(e) => update("email", e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, email: true }))}
              error={errorFor("email")}
              errorAction={
                emailInUse && (
                  <button type="button" onClick={() => switchMode("login")} className="font-semibold text-brand-600 underline underline-offset-2">
                    Log in instead
                  </button>
                )
              }
              disabled={submitting}
            />

            <div>
              <Field
                label="Password"
                type="password"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                value={values.password}
                onChange={(e) => update("password", e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                error={errorFor("password")}
                hint={mode === "signup" ? "Use at least 8 characters." : undefined}
                disabled={submitting}
              />
              {mode === "login" && (
                <div className="mt-2 text-right">
                  <button type="button" onClick={() => setForgotOpen(true)} className="text-sm font-medium text-brand-600 hover:underline">
                    Forgot password?
                  </button>
                </div>
              )}
            </div>

            {formError && (
              <p role="alert" className="flex items-start gap-2 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600">
                <AlertCircle size={17} className="mt-0.5 shrink-0" /> {formError}
              </p>
            )}

            <Button type="submit" size="lg" className="w-full" loading={submitting} disabled={!isValid}>
              {mode === "signup" ? (submitting ? "Creating account…" : "Create account") : submitting ? "Logging in…" : "Log in"}
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-muted">
            By continuing you agree to the{" "}
            <Link href={routes.terms} className="underline underline-offset-2 hover:text-ink">
              Terms
            </Link>{" "}
            and{" "}
            <Link href={routes.privacy} className="underline underline-offset-2 hover:text-ink">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>

      <ForgotPasswordModal open={forgotOpen} onClose={() => setForgotOpen(false)} initialEmail={values.email} />
    </div>
  );
}
