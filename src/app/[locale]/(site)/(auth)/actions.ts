"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/env";
import { safeNext } from "@/lib/safe-next";

export type AuthState = { error?: string; message?: string } | undefined;

const localeOf = (fd: FormData) => (fd.get("locale") === "en" ? "en" : "ar");
const email = z.string().trim().toLowerCase().email();
const password = z.string().min(8).max(72);

export async function signInAction(_: AuthState, fd: FormData): Promise<AuthState> {
  const locale = localeOf(fd);
  const parsed = z.object({ email, password: z.string().min(1) }).safeParse({
    email: fd.get("email"),
    password: fd.get("password"),
  });
  if (!parsed.success) return { error: "invalidCredentials" };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: "invalidCredentials" };
  redirect(safeNext(fd.get("next"), `/${locale}/dashboard`));
}

export async function signUpAction(_: AuthState, fd: FormData): Promise<AuthState> {
  const locale = localeOf(fd);
  const e = email.safeParse(fd.get("email"));
  if (!e.success) return { error: "invalidEmail" };
  const p = password.safeParse(fd.get("password"));
  if (!p.success) return { error: "weakPassword" };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: e.data,
    password: p.data,
    options: { emailRedirectTo: `${SITE_URL}/auth/callback?next=/${locale}/dashboard/onboarding` },
  });
  if (error) {
    if (error.code === "user_already_exists") return { error: "alreadyRegistered" };
    if (error.code === "weak_password") return { error: "weakPassword" };
    return { error: "generic" };
  }
  // Email confirmation disabled → session exists → go straight to onboarding.
  if (data.session) redirect(`/${locale}/dashboard/onboarding`);
  return { message: "checkEmail" };
}

export async function forgotPasswordAction(_: AuthState, fd: FormData): Promise<AuthState> {
  const locale = localeOf(fd);
  const e = email.safeParse(fd.get("email"));
  if (!e.success) return { error: "invalidEmail" };
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(e.data, {
    redirectTo: `${SITE_URL}/auth/callback?next=/${locale}/reset-password`,
  });
  // Same answer whether or not the email exists (no account enumeration).
  return { message: "forgotSent" };
}

export async function resetPasswordAction(_: AuthState, fd: FormData): Promise<AuthState> {
  const locale = localeOf(fd);
  const p = password.safeParse(fd.get("password"));
  if (!p.success) return { error: "weakPassword" };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: p.data });
  if (error) return { error: "generic" };
  redirect(`/${locale}/dashboard`);
}

export async function signOutAction(fd: FormData) {
  const locale = localeOf(fd);
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(`/${locale}/login`);
}
