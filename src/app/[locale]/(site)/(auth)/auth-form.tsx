"use client";

import { useFormSubmit } from "@/lib/use-form-submit";
import { useActionState, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { Alert, Button, Card, Field, Input } from "@/components/ui";
import {
  forgotPasswordAction,
  resetPasswordAction,
  signInAction,
  signUpAction,
  type AuthState,
} from "./actions";

type Mode = "login" | "signup" | "forgot" | "reset";

const actions = {
  login: signInAction,
  signup: signUpAction,
  forgot: forgotPasswordAction,
  reset: resetPasswordAction,
} satisfies Record<Mode, (s: AuthState, fd: FormData) => Promise<AuthState>>;

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.4 14.6 2.4 12 2.4 6.9 2.4 2.8 6.6 2.8 11.9S6.9 21.4 12 21.4c6.9 0 9.2-4.9 9.2-7.4 0-.5 0-.9-.1-1.3H12z" />
    </svg>
  );
}

export function AuthForm({ mode, next, initialError }: { mode: Mode; next?: string; initialError?: string }) {
  const t = useTranslations("auth");
  const tc = useTranslations("common");
  const locale = useLocale();
  const [state, formAction, pending] = useActionState(actions[mode], initialError ? { error: initialError } : undefined);
  const onSubmit = useFormSubmit(formAction);
  const [googlePending, setGooglePending] = useState(false);

  const titles: Record<Mode, string> = {
    login: t("loginTitle"),
    signup: t("signupTitle"),
    forgot: t("forgotTitle"),
    reset: t("resetTitle"),
  };
  const submitLabels: Record<Mode, string> = {
    login: t("loginBtn"),
    signup: t("signupBtn"),
    forgot: t("forgotBtn"),
    reset: t("resetBtn"),
  };

  async function signInWithGoogle() {
    setGooglePending(true);
    const target = next ?? `/${locale}/dashboard`;
    await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(target)}` },
    });
  }

  const errorText = (key?: string) => {
    if (!key) return undefined;
    return t.has(key as never) ? t(key as never) : tc("error");
  };

  return (
    <Card className="mx-auto w-full max-w-md p-6 sm:p-8">
      <h1 className="mb-6 text-2xl font-bold text-navy">{titles[mode]}</h1>

      {state?.message ? (
        <Alert tone="success">{t(state.message as never)}</Alert>
      ) : (
        <>
          {(mode === "login" || mode === "signup") && (
            <>
              <Button type="button" variant="secondary" className="w-full" onClick={signInWithGoogle} disabled={googlePending}>
                <GoogleIcon />
                {t("google")}
              </Button>
              <div className="my-5 flex items-center gap-3 text-xs text-slate-400">
                <span className="h-px flex-1 bg-slate-200" />
                {t("or")}
                <span className="h-px flex-1 bg-slate-200" />
              </div>
            </>
          )}

          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <input type="hidden" name="locale" value={locale} />
            {next && <input type="hidden" name="next" value={next} />}

            {state?.error && <Alert>{errorText(state.error)}</Alert>}

            {mode !== "reset" && (
              <Field label={t("email")} htmlFor="email">
                <Input id="email" name="email" type="email" autoComplete="email" required className="ltr-field" />
              </Field>
            )}
            {mode !== "forgot" && (
              <Field
                label={mode === "reset" ? t("newPassword") : t("password")}
                htmlFor="password"
                hint={mode === "login" ? undefined : t("passwordHint")}
              >
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  minLength={mode === "login" ? undefined : 8}
                  required
                  className="ltr-field"
                />
              </Field>
            )}

            {mode === "login" && (
              <div className="text-end">
                <Link href="/forgot-password" className="text-sm text-brand hover:underline">
                  {t("forgot")}
                </Link>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? tc("loading") : submitLabels[mode]}
            </Button>
          </form>
        </>
      )}

      {mode === "login" && (
        <p className="mt-6 text-center text-sm text-slate-600">
          {t("noAccount")}{" "}
          <Link href="/signup" className="font-medium text-brand hover:underline">
            {t("signupBtn")}
          </Link>
        </p>
      )}
      {mode === "signup" && (
        <p className="mt-6 text-center text-sm text-slate-600">
          {t("haveAccount")}{" "}
          <Link href="/login" className="font-medium text-brand hover:underline">
            {t("loginBtn")}
          </Link>
        </p>
      )}
    </Card>
  );
}
